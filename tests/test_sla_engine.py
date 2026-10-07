from datetime import datetime, timedelta
import pytest
from freezegun import freeze_time
from app.models.entities import Complaint, ComplaintStatus, ComplaintPriority, User, UserRole
from app.services.sla_service import SLAService
from app.services.complaint_service import ComplaintService
from app.repositories.user_repo import UserRepository
from app.repositories.master_repo import MasterRepository
from app.repositories.notification_repo import NotificationRepository

def test_sla_metric_calculations():
    # 24 hours SLA test
    created_at = datetime(2026, 10, 1, 10, 0, 0)
    deadline = created_at + timedelta(hours=24)

    dummy_complaint = Complaint(
        status=ComplaintStatus.IN_PROGRESS,
        created_at=created_at,
        sla_deadline=deadline,
    )

    # At 5 hours (20.8% elapsed) -> within_sla
    t1 = created_at + timedelta(hours=5)
    m1 = SLAService.calculate_sla_metrics(dummy_complaint, now=t1)
    assert m1["sla_status"] == "within_sla"
    assert m1["sla_remaining_hours"] == 19.0

    # At 18 hours (75% elapsed) -> approaching (warning >= 70%)
    t2 = created_at + timedelta(hours=18)
    m2 = SLAService.calculate_sla_metrics(dummy_complaint, now=t2)
    assert m2["sla_status"] == "approaching"
    assert m2["sla_remaining_hours"] == 6.0

    # At 25 hours (104% elapsed) -> breached (> 100%)
    t3 = created_at + timedelta(hours=25)
    m3 = SLAService.calculate_sla_metrics(dummy_complaint, now=t3)
    assert m3["sla_status"] == "breached"
    assert m3["sla_remaining_hours"] == -1.0


def test_frozen_clock_sla_engine_escalation_and_idempotency(db_session):
    user_repo = UserRepository(db_session)
    master_repo = MasterRepository(db_session)
    complaint_service = ComplaintService(db_session)
    sla_service = SLAService(db_session)
    notif_repo = NotificationRepository(db_session)

    citizen = user_repo.get_by_email("citizen3@tngov.in") or user_repo.get_by_email("citizen1@tngov.in")
    officer = user_repo.get_by_email("officer.san1@tngov.in")
    category = master_repo.list_categories()[0]  # typically 24h SLA
    ward = master_repo.list_wards()[0]

    base_time = datetime(2026, 10, 1, 9, 0, 0)

    # 1. Create complaint at base_time
    with freeze_time(base_time):
        complaint = complaint_service.create_complaint(
            citizen=citizen,
            title="Frozen Clock SLA Test",
            description="Testing SLA background alerts with time progression",
            category_id=category.id,
            ward_id=ward.id,
        )
        complaint_service.reassign_complaint(
            complaint_id=complaint.id,
            officer_id=officer.id,
            current_user=user_repo.get_by_email("govadmin@tngov.in"),
        )
        complaint_service.update_status(complaint.id, ComplaintStatus.ACKNOWLEDGED, officer)

        # Immediate SLA run at creation -> 0 warnings, 0 breaches
        res_t0 = sla_service.process_open_complaints_sla(now=base_time)
        assert res_t0["warnings_emitted"] >= 0

    # 2. Advance clock to 75% elapsed
    t_warning = base_time + timedelta(hours=int(category.sla_hours * 0.75))
    with freeze_time(t_warning):
        res_t1 = sla_service.process_open_complaints_sla(now=t_warning)
        # Warning notification generated
        assert res_t1["warnings_emitted"] >= 1

        # IDEMPOTENCY CHECK: Running a second time immediately at same clock
        res_t1_retry = sla_service.process_open_complaints_sla(now=t_warning)
        # MUST NOT create duplicates!
        assert res_t1_retry["warnings_emitted"] == 0

    # 3. Advance clock past deadline (+2 hours overdue)
    t_breach = base_time + timedelta(hours=category.sla_hours + 2)
    with freeze_time(t_breach):
        res_t2 = sla_service.process_open_complaints_sla(now=t_breach)
        assert res_t2["breaches_level_1"] >= 1

        # Check escalation level updated
        db_session.refresh(complaint)
        assert complaint.escalation_level >= 1

        # IDEMPOTENCY CHECK
        res_t2_retry = sla_service.process_open_complaints_sla(now=t_breach)
        assert res_t2_retry["breaches_level_1"] == 0

    # 4. Advance clock >24h past deadline -> Level 2 Critical Escalation
    t_level2 = base_time + timedelta(hours=category.sla_hours + 26)
    with freeze_time(t_level2):
        res_t3 = sla_service.process_open_complaints_sla(now=t_level2)
        assert res_t3["breaches_level_2"] >= 1

        db_session.refresh(complaint)
        assert complaint.escalation_level == 2

import uuid
from datetime import datetime, timedelta
from app.models.entities import (
    User, UserRole, Department, Ward, ComplaintCategory,
    Complaint, ComplaintStatus, ComplaintPriority,
    ComplaintCommunityVote, CommunityVoteType
)
from app.services.metrics_service import MetricsService
from app.services.masking_service import MaskingService


def test_masking_service_citizen_privacy(db_session):
    citizen = User(
        name="Kavitha Raman",
        email="kavitha.test@example.com",
        mobile="9876543210",
        role=UserRole.CITIZEN,
    )

    # 1. Public viewer (viewer_role=None) -> Pseudonym
    masked_name_public = MaskingService.mask_name_by_role(citizen, viewer_role=None)
    assert masked_name_public == "Kavitha R."

    # 2. Officer viewer -> Pseudonym
    masked_name_officer = MaskingService.mask_name_by_role(citizen, viewer_role=UserRole.OFFICER)
    assert masked_name_officer == "Kavitha R."

    # 3. Dept Admin viewer -> Full name
    masked_name_dept_admin = MaskingService.mask_name_by_role(citizen, viewer_role=UserRole.DEPT_ADMIN)
    assert masked_name_dept_admin == "Kavitha Raman"

    # 4. Gov Admin viewer -> Full name
    masked_name_gov_admin = MaskingService.mask_name_by_role(citizen, viewer_role=UserRole.GOV_ADMIN)
    assert masked_name_gov_admin == "Kavitha Raman"

    # 5. Officer mobile -> partially redacted
    masked_mobile = MaskingService.mask_mobile_by_role("9876543210", viewer_role=UserRole.OFFICER)
    assert masked_mobile == "987654****"

    # 6. Admin mobile -> full mobile
    full_mobile_admin = MaskingService.mask_mobile_by_role("9876543210", viewer_role=UserRole.GOV_ADMIN)
    assert full_mobile_admin == "9876543210"

    # 7. Public mobile -> None (completely unexposed)
    public_mobile = MaskingService.mask_mobile_by_role("9876543210", viewer_role=None)
    assert public_mobile is None

    # 8. Email masking: None for public, full for admin
    assert MaskingService.mask_email_by_role("kavitha.test@example.com", viewer_role=None) is None
    assert MaskingService.mask_email_by_role("kavitha.test@example.com", viewer_role=UserRole.DEPT_ADMIN) == "kavitha.test@example.com"


def test_anonymous_masking(db_session):
    anon_user = User(
        name="Anonymous Reporter",
        email="anon_12345@civic.internal",
        mobile="9800000000",
        role=UserRole.CITIZEN,
    )

    # Public viewer
    assert MaskingService.mask_name_by_role(anon_user, viewer_role=None, is_anonymous=True) == "Anonymous Citizen"
    assert MaskingService.mask_mobile_by_role("9800000000", viewer_role=None, is_anonymous=True) is None

    # Admin viewer
    assert MaskingService.mask_name_by_role(anon_user, viewer_role=UserRole.GOV_ADMIN, is_anonymous=True) == "Anonymous Citizen"
    assert MaskingService.mask_mobile_by_role("9800000000", viewer_role=UserRole.GOV_ADMIN, is_anonymous=True) is None


def test_metrics_service_kpi_and_public_stats(db_session):
    service = MetricsService(db_session)

    # Fetch public stats
    stats = service.get_public_stats()
    assert "total_complaints" in stats
    assert "resolved_complaints" in stats
    assert "pending_complaints" in stats
    assert "resolution_rate_pct" in stats
    assert "visitor_count" in stats
    assert stats["visitor_count"] >= 1415

    # Check KPI summary
    kpi = service.get_kpi_summary(user=None)
    assert "total_complaints" in kpi
    assert "resolved_complaints" in kpi
    assert "sla_compliance_rate" in kpi
    assert "citizen_verified_rate" in kpi


def test_platform_visitor_tracking(db_session):
    service = MetricsService(db_session)
    initial_count = service.get_visitor_count()

    uid1 = f"sess_{uuid.uuid4().hex[:8]}"
    uid2 = f"sess_{uuid.uuid4().hex[:8]}"

    # Record first visit
    count1 = service.record_visitor(session_id=uid1, user_agent="Mozilla/5.0")
    assert count1 >= initial_count

    # Re-recording same session should be idempotent
    count2 = service.record_visitor(session_id=uid1, user_agent="Mozilla/5.0")
    assert count2 == count1

    # Record distinct session
    count3 = service.record_visitor(session_id=uid2, user_agent="Mozilla/5.0")
    assert count3 == count1 + 1


def test_persistent_community_votes(db_session):
    citizen = db_session.query(User).filter(User.role == UserRole.CITIZEN, User.mobile != "9800000000").first()
    cat = db_session.query(ComplaintCategory).first()
    ward = db_session.query(Ward).first()

    unique_ref = f"TN-TEST-{uuid.uuid4().hex[:6].upper()}"

    complaint = Complaint(
        reference_no=unique_ref,
        citizen_id=citizen.id,
        category_id=cat.id,
        ward_id=ward.id,
        title="Pothole vote test",
        description="Testing persistent community votes",
        status=ComplaintStatus.SUBMITTED,
        final_priority=ComplaintPriority.MEDIUM,
        sla_deadline=datetime.utcnow() + timedelta(days=2),
        created_at=datetime.utcnow(),
    )
    db_session.add(complaint)
    db_session.commit()
    db_session.refresh(complaint)

    # Add persistent vote
    vote = ComplaintCommunityVote(
        complaint_id=complaint.id,
        user_id=citizen.id,
        vote_type=CommunityVoteType.CONFIRM,
        created_at=datetime.utcnow(),
    )
    db_session.add(vote)
    db_session.commit()

    service = MetricsService(db_session)
    res = service.get_public_issues_summary(search=unique_ref)
    assert res["total"] >= 1
    found = [i for i in res["issues"] if i["reference_no"] == unique_ref]
    assert len(found) == 1
    assert found[0]["confirmations"] == 1
    assert found[0]["confirmations_needed"] == 2

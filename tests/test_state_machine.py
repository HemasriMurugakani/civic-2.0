import pytest
from fastapi import HTTPException
from app.models.entities import ComplaintStatus, UserRole, Complaint
from app.services.complaint_service import ComplaintService
from app.repositories.user_repo import UserRepository
from app.repositories.master_repo import MasterRepository

def test_legal_state_machine_lifecycle(db_session):
    user_repo = UserRepository(db_session)
    master_repo = MasterRepository(db_session)
    service = ComplaintService(db_session)

    citizen = user_repo.get_by_email("citizen1@tngov.in")
    officer = user_repo.get_by_email("officer.san1@tngov.in")
    category = master_repo.list_categories()[0]
    ward = master_repo.list_wards()[0]

    # 1. Create Complaint (Submitted -> Auto-assigned)
    complaint = service.create_complaint(
        citizen=citizen,
        title="Test Water Pipeline Leak",
        description="Water pipe burst near street pole causing continuous water loss",
        category_id=category.id,
        ward_id=ward.id,
    )
    assert complaint.status in [ComplaintStatus.SUBMITTED, ComplaintStatus.ASSIGNED]

    # Ensure assigned to our officer for test transition
    complaint = service.reassign_complaint(
        complaint_id=complaint.id,
        officer_id=officer.id,
        current_user=user_repo.get_by_email("govadmin@tngov.in"),
        note="Assigned for test execution",
    )
    assert complaint.status == ComplaintStatus.ASSIGNED

    # 2. Officer Acknowledges
    c_ack = service.update_status(
        complaint_id=complaint.id,
        new_status=ComplaintStatus.ACKNOWLEDGED,
        actor=officer,
        note="Officer inspected site",
    )
    assert c_ack.status == ComplaintStatus.ACKNOWLEDGED

    # 3. Officer moves to In Progress
    c_prog = service.update_status(
        complaint_id=complaint.id,
        new_status=ComplaintStatus.IN_PROGRESS,
        actor=officer,
        note="Field crew working on repair",
    )
    assert c_prog.status == ComplaintStatus.IN_PROGRESS

    # 4. Officer Resolves (Note is required)
    c_res = service.update_status(
        complaint_id=complaint.id,
        new_status=ComplaintStatus.RESOLVED,
        actor=officer,
        note="Replacement sleeve installed. Leak fully arrested.",
    )
    assert c_res.status == ComplaintStatus.RESOLVED
    assert c_res.resolved_at is not None

    # 5. Citizen Verifies
    c_ver = service.update_status(
        complaint_id=complaint.id,
        new_status=ComplaintStatus.CITIZEN_VERIFIED,
        actor=citizen,
        note="Citizen inspected and confirmed clear.",
    )
    assert c_ver.status == ComplaintStatus.CITIZEN_VERIFIED
    assert c_ver.verified_at is not None


def test_illegal_state_transitions_rejected(db_session):
    user_repo = UserRepository(db_session)
    master_repo = MasterRepository(db_session)
    service = ComplaintService(db_session)

    citizen = user_repo.get_by_email("citizen2@tngov.in")
    officer = user_repo.get_by_email("officer.wat1@tngov.in")
    category = master_repo.list_categories()[0]
    ward = master_repo.list_wards()[0]

    complaint = service.create_complaint(
        citizen=citizen,
        title="Illegal Transition Test",
        description="Testing rejection of illegal state machine leaps",
        category_id=category.id,
        ward_id=ward.id,
    )
    service.reassign_complaint(
        complaint_id=complaint.id,
        officer_id=officer.id,
        current_user=user_repo.get_by_email("govadmin@tngov.in"),
    )

    # Illegal 1: Direct leap from ASSIGNED to RESOLVED
    with pytest.raises(HTTPException) as exc_info:
        service.update_status(
            complaint_id=complaint.id,
            new_status=ComplaintStatus.RESOLVED,
            actor=officer,
            note="Premature resolution",
        )
    assert exc_info.value.status_code == 400
    assert "Illegal transition" in exc_info.value.detail

    # Illegal 2: Citizen tries to move status directly to IN_PROGRESS
    with pytest.raises(HTTPException) as exc_info:
        service.update_status(
            complaint_id=complaint.id,
            new_status=ComplaintStatus.IN_PROGRESS,
            actor=citizen,
            note="Citizen trying staff action",
        )
    assert exc_info.value.status_code == 400

    # Illegal 3: Officer resolves without a note (after moving to acknowledged and in_progress)
    service.update_status(complaint.id, ComplaintStatus.ACKNOWLEDGED, officer)
    service.update_status(complaint.id, ComplaintStatus.IN_PROGRESS, officer)
    with pytest.raises(HTTPException) as exc_info:
        service.update_status(
            complaint_id=complaint.id,
            new_status=ComplaintStatus.RESOLVED,
            actor=officer,
            note="",  # empty note
        )
    assert exc_info.value.status_code == 400
    assert "mandatory" in exc_info.value.detail.lower()

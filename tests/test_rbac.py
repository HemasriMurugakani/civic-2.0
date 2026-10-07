import pytest
from app.models.entities import User, UserRole, Complaint, ComplaintStatus, ComplaintPriority
from app.repositories.complaint_repo import ComplaintRepository
from app.repositories.user_repo import UserRepository

def test_repository_scoping_for_citizen(db_session):
    repo = ComplaintRepository(db_session)
    user_repo = UserRepository(db_session)

    # Fetch two different citizens
    citizen_1 = user_repo.get_by_email("citizen1@tngov.in")
    citizen_2 = user_repo.get_by_email("citizen2@tngov.in")
    assert citizen_1 is not None and citizen_2 is not None

    # Get a complaint belonging to citizen_2
    complaint_2 = db_session.query(Complaint).filter(Complaint.citizen_id == citizen_2.id).first()
    assert complaint_2 is not None

    # citizen_1 attempts to access complaint_2 via scoped query builder
    result = repo.get_scoped_by_id(complaint_2.id, citizen_1)
    # MUST return None (preventing IDOR)
    assert result is None

    # citizen_2 accesses their own complaint
    valid_result = repo.get_scoped_by_id(complaint_2.id, citizen_2)
    assert valid_result is not None
    assert valid_result.id == complaint_2.id


def test_repository_scoping_cross_department_denied(db_session):
    repo = ComplaintRepository(db_session)
    user_repo = UserRepository(db_session)

    # Sanitation dept admin vs Water dept admin
    san_admin = user_repo.get_by_email("admin.sanitation@tngov.in")
    wat_admin = user_repo.get_by_email("admin.water@tngov.in")
    assert san_admin is not None and wat_admin is not None

    # Fetch a complaint belonging to Sanitation
    san_complaint = (
        db_session.query(Complaint)
        .join(Complaint.category)
        .filter(Complaint.category.has(department_id=san_admin.department_id))
        .first()
    )
    assert san_complaint is not None

    # Water admin attempts to access Sanitation complaint directly by ID
    forbidden_result = repo.get_scoped_by_id(san_complaint.id, wat_admin)
    assert forbidden_result is None, "Cross-department direct ID guessing must return None"

    # Sanitation admin accesses their own department complaint
    allowed_result = repo.get_scoped_by_id(san_complaint.id, san_admin)
    assert allowed_result is not None
    assert allowed_result.id == san_complaint.id


def test_officer_cannot_view_unassigned_complaints(db_session):
    repo = ComplaintRepository(db_session)
    user_repo = UserRepository(db_session)

    officer_1 = user_repo.get_by_email("officer.san1@tngov.in")
    officer_2 = user_repo.get_by_email("officer.wat1@tngov.in")
    assert officer_1 is not None and officer_2 is not None

    # Query complaints scoped to officer_1
    complaints_1, _ = repo.list_scoped(officer_1, limit=50)
    for c in complaints_1:
        # Check active assignment belongs to officer_1
        assigned_officer_ids = [a.officer_id for a in c.assignments if a.is_active]
        assert officer_1.id in assigned_officer_ids


def test_gov_admin_has_global_visibility(db_session):
    repo = ComplaintRepository(db_session)
    user_repo = UserRepository(db_session)

    gov_admin = user_repo.get_by_email("govadmin@tngov.in")
    assert gov_admin is not None

    total_in_db = db_session.query(Complaint).count()
    scoped_list, total_scoped = repo.list_scoped(gov_admin, limit=5)
    assert total_scoped == total_in_db, "Government administrator must have global visibility across all complaints"

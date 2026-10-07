import pytest
from datetime import datetime, timedelta
from app.models.entities import (
    User, UserRole, Department, Ward, Project, ProjectUpdate, ProjectFollower,
    ProjectRating, ProjectSyncLog, ProjectStatus, ProjectSource
)
from app.services.project_service import ProjectService
from app.schemas.project import ProjectCreate, ProjectUpdatePayload, ProjectUpdateItemCreate, ProjectRatingCreate
from app.core.security import get_password_hash


@pytest.fixture
def project_test_users(db_session):
    db_session.rollback()
    t_id = datetime.utcnow().strftime('%f')[:5]

    dept_roads = db_session.query(Department).filter(Department.code == "ROA").first()
    dept_water = db_session.query(Department).filter(Department.code == "WAT").first()

    gov_admin = User(
        name="Project Gov Admin",
        mobile=f"991{t_id}",
        email=f"govadmin_{t_id}@test.gov.in",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.GOV_ADMIN,
        preferred_language="en",
        is_active=True,
    )
    dept_admin_roads = User(
        name="Roads Admin",
        mobile=f"992{t_id}",
        email=f"roadadmin_{t_id}@test.gov.in",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.DEPT_ADMIN,
        department_id=dept_roads.id if dept_roads else None,
        preferred_language="en",
        is_active=True,
    )
    citizen = User(
        name="Project Citizen",
        mobile=f"993{t_id}",
        email=f"citizen_{t_id}@test.gov.in",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.CITIZEN,
        public_id=f"cit-proj-{t_id}",
        public_display_name="Citizen Test",
        preferred_language="en",
        is_active=True,
    )
    db_session.add_all([gov_admin, dept_admin_roads, citizen])
    db_session.commit()
    db_session.refresh(gov_admin)
    db_session.refresh(dept_admin_roads)
    db_session.refresh(citizen)

    yield {
        "gov_admin": gov_admin,
        "dept_admin_roads": dept_admin_roads,
        "citizen": citizen,
        "dept_roads": dept_roads,
        "dept_water": dept_water,
    }

    # Cleanup
    db_session.rollback()
    for u in [gov_admin, dept_admin_roads, citizen]:
        db_session.query(ProjectFollower).filter(ProjectFollower.user_id == u.id).delete()
        db_session.query(ProjectRating).filter(ProjectRating.user_id == u.id).delete()
        db_session.query(ProjectUpdate).filter(ProjectUpdate.author_id == u.id).delete()
        db_session.delete(u)
    db_session.commit()


def test_compute_project_metrics_delay_and_lag(db_session, project_test_users):
    service = ProjectService(db_session)
    now = datetime.utcnow()

    # Case 1: Overdue project (due_date in past, status IN_PROGRESS)
    overdue_proj = Project(
        title="Test Overdue Bridge",
        category="Roads",
        status=ProjectStatus.IN_PROGRESS,
        start_date=now - timedelta(days=60),
        due_date=now - timedelta(days=5),
        progress_percent=80.0,
    )
    m1 = service.compute_project_metrics(overdue_proj)
    assert m1["is_delayed"] is True

    # Case 2: Lag alert: 80% elapsed time vs 30% progress (>25% mismatch)
    laggy_proj = Project(
        title="Test Lagging Drain",
        category="Drainage",
        status=ProjectStatus.IN_PROGRESS,
        start_date=now - timedelta(days=80),
        due_date=now + timedelta(days=20),  # 80 days of 100 days total = 80%
        progress_percent=30.0,
    )
    m2 = service.compute_project_metrics(laggy_proj)
    assert m2["is_delayed"] is False
    assert m2["progress_lag_alert"] is True
    assert m2["time_elapsed_percent"] >= 75.0

    # Case 3: Completed project should never be delayed or have lag alert
    completed_proj = Project(
        title="Test Completed Flyover",
        category="Roads",
        status=ProjectStatus.COMPLETED,
        start_date=now - timedelta(days=120),
        due_date=now - timedelta(days=10),
        progress_percent=100.0,
    )
    m3 = service.compute_project_metrics(completed_proj)
    assert m3["is_delayed"] is False
    assert m3["progress_lag_alert"] is False


def test_list_projects_and_rbac_scoping(db_session, project_test_users):
    service = ProjectService(db_session)
    dept_roads = project_test_users["dept_roads"]
    dept_admin_roads = project_test_users["dept_admin_roads"]
    gov_admin = project_test_users["gov_admin"]

    # Gov admin sees all projects
    all_projects = service.list_projects(current_user=gov_admin)
    assert len(all_projects) >= 1

    # Dept admin sees only their department's projects
    dept_projects = service.list_projects(current_user=dept_admin_roads)
    for p in dept_projects:
        assert p["department_id"] == dept_roads.id

    # Filter by search
    searched = service.list_projects(search="Metro", current_user=gov_admin)
    assert len(searched) >= 1
    for p in searched:
        combined_text = (p["title"] + (p["description"] or "") + (p["contractor"] or "") + (p["category"] or "")).lower()
        assert "metro" in combined_text


def test_project_create_and_detail(db_session, project_test_users):
    service = ProjectService(db_session)
    gov_admin = project_test_users["gov_admin"]
    now = datetime.utcnow()

    create_data = ProjectCreate(
        title="Automated Test Smart Park",
        description="Public green recreation area with solar lighting.",
        category="Parks & Environment",
        status=ProjectStatus.PLANNED,
        budget_amount=2500000.0,
        progress_percent=10.0,
        contractor="Test Infra Works",
        start_date=now,
        due_date=now + timedelta(days=90),
    )

    created = service.create_project(gov_admin, create_data)
    assert created.id is not None
    assert created.title == "Automated Test Smart Park"

    detail = service.get_project_detail(created.id, gov_admin)
    assert detail["id"] == created.id
    assert detail["progress_percent"] == 10.0
    assert detail["is_following"] is False

    # Cleanup
    db_session.delete(created)
    db_session.commit()


def test_project_follow_and_transparency_rating(db_session, project_test_users):
    service = ProjectService(db_session)
    citizen = project_test_users["citizen"]

    # Get any seeded project
    project = db_session.query(Project).first()
    assert project is not None

    # Toggle follow on (user_id, project_id)
    is_following_1 = service.toggle_follow(citizen.id, project.id)
    assert is_following_1 is True

    detail1 = service.get_project_detail(project.id, citizen)
    assert detail1["is_following"] is True

    # Toggle follow off
    is_following_2 = service.toggle_follow(citizen.id, project.id)
    assert is_following_2 is False

    # Submit transparency rating (1 to 5)
    rating = service.submit_transparency_rating(
        user_id=citizen.id,
        project_id=project.id,
        score=5,
        comment="Excellent public display of progress."
    )
    assert rating.transparency_score == 5

    # Refetched detail reflects rating
    detail2 = service.get_project_detail(project.id, citizen)
    assert detail2["user_rating"] == 5
    assert detail2["transparency_rating"] >= 1.0


def test_project_updates_citizen_vs_staff(db_session, project_test_users):
    service = ProjectService(db_session)
    citizen = project_test_users["citizen"]
    gov_admin = project_test_users["gov_admin"]

    project = db_session.query(Project).first()
    assert project is not None

    # Citizen adds an update -> should be marked is_verified = False
    cit_update = service.add_project_update(
        user=citizen,
        project_id=project.id,
        note="Citizen community observation from walking path."
    )
    assert cit_update.is_verified is False
    assert cit_update.author_role == UserRole.CITIZEN.value

    # Admin adds an update with progress update -> should be marked is_verified = True
    new_progress = min(project.progress_percent + 5.0, 100.0)
    admin_update = service.add_project_update(
        user=gov_admin,
        project_id=project.id,
        note="Official milestone inspection completed by executive engineers.",
        progress_percent=new_progress
    )
    assert admin_update.is_verified is True
    assert admin_update.progress_percent == new_progress

    # Clean up updates
    db_session.delete(cit_update)
    db_session.delete(admin_update)
    db_session.commit()


def test_csv_bulk_import(db_session, project_test_users):
    service = ProjectService(db_session)
    gov_admin = project_test_users["gov_admin"]

    csv_content = """title,description,category,status,budget_amount,progress_percent,contractor
Test CSV Solar Highway,Solar panels along bypass,Energy & Roads,planned,50000000,0,SunPower Infra
Test CSV Water Desal,Reverse osmosis plant,Water,in_progress,75000000,25.5,Chennai Aqua Tech
"""

    report = service.import_csv(csv_content, gov_admin)
    assert report["success"] is True
    assert report["imported_count"] == 2
    assert report["errors_count"] == 0

    # Clean up imported
    imported_titles = ["Test CSV Solar Highway", "Test CSV Water Desal"]
    db_session.query(Project).filter(Project.title.in_(imported_titles)).delete()
    db_session.commit()


def test_open_data_sync_conflict_handling(db_session, project_test_users):
    service = ProjectService(db_session)

    # TN-TWAD-2026-003 is one of the incoming open data feed external_ids.
    # We pre-create it with source LOCAL_TRACKING to test conflict avoidance and preservation.
    existing = db_session.query(Project).filter(Project.external_id == "TN-TWAD-2026-003").first()
    if existing:
        db_session.delete(existing)
        db_session.commit()

    local_proj = Project(
        title="Locally Customized Water Line",
        category="Water Supply",
        status=ProjectStatus.IN_PROGRESS,
        source=ProjectSource.LOCAL_TRACKING,
        external_id="TN-TWAD-2026-003",
        budget_amount=9900000.0,
        progress_percent=50.0,
    )
    db_session.add(local_proj)
    db_session.commit()
    db_session.refresh(local_proj)

    # Trigger sync
    sync_res = service.sync_government_data()
    assert sync_res["success"] is True
    assert sync_res["conflicts_detected"] >= 1  # Flagged TN-TWAD-2026-003 as conflict and did not overwrite

    # Verify local_proj was preserved
    db_session.refresh(local_proj)
    assert local_proj.title == "Locally Customized Water Line"
    assert local_proj.source == ProjectSource.LOCAL_TRACKING

    # Clean up
    db_session.delete(local_proj)
    db_session.commit()

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token, get_password_hash
from app.models.entities import (
    User, UserRole, PointsLedger, Badge, UserBadge, BadgeRarity,
    Complaint, ComplaintStatus, ComplaintPriority, ComplaintChannel,
    ComplaintCategory, Project, ProjectStatus, ProjectSource, ProjectFollower,
    ProjectRating, Group, GroupVisibility, GroupMemberRole, GroupPost,
    ContentFlag, FlagStatus, ModerationAuditLog, LearningModule, Certificate,
    ModuleDifficulty, Ward, Department
)
from app.services.gamification_service import GamificationService
from app.services.project_service import ProjectService
from app.services.complaint_service import ComplaintService

client = TestClient(app)


@pytest.fixture(scope="function")
def db():
    session = SessionLocal()
    session.rollback()
    yield session
    session.close()


@pytest.fixture(scope="module")
def quality_users():
    db_setup = SessionLocal()
    timestamp = int(datetime.utcnow().timestamp())

    citizen = User(
        name="Quality Citizen",
        email=f"qual_citizen_{timestamp}@tngov.in",
        mobile=f"9840{timestamp % 1000000:06d}",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.CITIZEN,
        public_id=f"cit-qual-{timestamp}",
        public_display_name="Quality Citizen",
        is_active=True,
    )
    db_setup.add(citizen)

    dept_admin = User(
        name="Quality Dept Admin",
        email=f"qual_deptadmin_{timestamp}@tngov.in",
        mobile=f"9800{timestamp % 1000000:06d}",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.DEPT_ADMIN,
        is_active=True,
    )
    db_setup.add(dept_admin)

    gov_admin = User(
        name="Quality Gov Admin",
        email=f"qual_govadmin_{timestamp}@tngov.in",
        mobile=f"9810{timestamp % 1000000:06d}",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.GOV_ADMIN,
        is_active=True,
    )
    db_setup.add(gov_admin)

    db_setup.commit()
    db_setup.refresh(citizen)
    db_setup.refresh(dept_admin)
    db_setup.refresh(gov_admin)
    db_setup.close()

    return {
        "citizen": citizen,
        "dept_admin": dept_admin,
        "gov_admin": gov_admin,
    }


def get_token(user: User):
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


# ----------------------------------------------------------------------
# 1. Points Ledger: Idempotency & Reversal
# ----------------------------------------------------------------------
def test_points_ledger_idempotency_and_reversal(db: Session, quality_users):
    citizen = quality_users["citizen"]
    service = GamificationService(db)
    source_id = f"test_idemp_{citizen.id}_{int(datetime.utcnow().timestamp())}"

    # 1. Award points first time
    entry1 = service.award_points(
        user_id=citizen.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points=25,
        check_daily_cap=False
    )
    assert entry1 is not None
    assert entry1.points == 25

    initial_score = service.get_user_score(citizen.id)

    # 2. Second award with same key must return existing entry and NOT double-award
    entry2 = service.award_points(
        user_id=citizen.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points=25,
        check_daily_cap=False
    )
    assert entry2.id == entry1.id
    assert service.get_user_score(citizen.id) == initial_score

    # 3. Points Reversal: append negative points to reduce score
    rev_entry1 = service.reverse_points(
        user_id=citizen.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points_to_deduct=25
    )
    assert rev_entry1 is not None
    assert rev_entry1.points == -25
    assert service.get_user_score(citizen.id) == initial_score - 25

    # 4. Reversal idempotency: reversing again must not double-deduct
    rev_entry2 = service.reverse_points(
        user_id=citizen.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points_to_deduct=25
    )
    assert rev_entry2.id == rev_entry1.id
    assert service.get_user_score(citizen.id) == initial_score - 25

    # Clean up test ledger entries to prevent orphaned test records
    db.query(PointsLedger).filter(PointsLedger.source_id == source_id).delete()
    db.commit()


# ----------------------------------------------------------------------
# 2. Badge Rules & Evaluation
# ----------------------------------------------------------------------
def test_badge_rules_and_evaluation(db: Session, quality_users):
    citizen = quality_users["citizen"]
    service = GamificationService(db)

    badge_code = f"test_badge_{int(datetime.utcnow().timestamp())}"
    current_score = service.get_user_score(citizen.id)
    target_score = current_score + 30

    badge = Badge(
        code=badge_code,
        name_en="Quality Test Badge",
        name_ta="தரப் பேட்ஜ்",
        description_en="Awarded during automated testing",
        description_ta="தானியங்கி சோதனை",
        icon="Award",
        rarity=BadgeRarity.COMMON,
        event_type="score_threshold",
        threshold=target_score,
        points_reward=10,
        is_active=True
    )
    db.add(badge)
    db.commit()

    # User does not have badge yet
    has_before = db.query(UserBadge).filter(
        UserBadge.user_id == citizen.id,
        UserBadge.badge_id == badge.id
    ).first()
    assert has_before is None

    # Award points to cross target threshold
    service.award_points(
        user_id=citizen.id,
        reason="test_score_jump",
        source_type="test",
        source_id=f"test_pts_{int(datetime.utcnow().timestamp())}",
        points=35,
        check_daily_cap=False
    )

    # User now has badge with earned_at timestamp
    user_badge = db.query(UserBadge).filter(
        UserBadge.user_id == citizen.id,
        UserBadge.badge_id == badge.id
    ).first()
    assert user_badge is not None
    assert user_badge.earned_at is not None


# ----------------------------------------------------------------------
# 3. State Transitions & Illegal Transition Rejections
# ----------------------------------------------------------------------
def test_complaint_state_machine_legal_and_illegal_transitions(db: Session, quality_users):
    citizen = quality_users["citizen"]
    gov_admin = quality_users["gov_admin"]
    service = ComplaintService(db)

    category = db.query(ComplaintCategory).first()
    ward = db.query(Ward).first()

    # Create test complaint via ComplaintService
    comp = service.create_complaint(
        citizen=citizen,
        title="Quality State Machine Test",
        description="Testing complaint transitions",
        category_id=category.id,
        ward_id=ward.id if ward else None,
    )

    # Illegal transition: Attempting to resolve directly from submitted
    res_illegal = client.patch(
        f"/api/v1/complaints/{comp.id}/status",
        json={"status": "resolved", "note": "Illegal resolve"},
        headers=get_token(gov_admin)
    )
    assert res_illegal.status_code == 400

    # Legal transition: submitted -> assigned
    res_assign = client.patch(
        f"/api/v1/complaints/{comp.id}/status",
        json={"status": "assigned", "note": "Assigned to ward division"},
        headers=get_token(gov_admin)
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["status"] == "assigned"


# ----------------------------------------------------------------------
# 4. Open Data Sync Upsert & Conflict Handling
# ----------------------------------------------------------------------
def test_open_data_sync_upsert_and_conflict_handling(db: Session, quality_users):
    service = ProjectService(db)
    source_id = f"EXT-SYNC-{int(datetime.utcnow().timestamp())}"

    # Initial import record
    records = [
        {
            "external_id": source_id,
            "title": "Smart City Intelligent Water Metering",
            "category": "Water Supply & Sewerage Board",
            "budget_amount": 45000000.0,
            "district": "Chennai",
            "constituency": "T. Nagar",
            "latitude": 13.0418,
            "longitude": 80.2341,
            "start_date": "2025-01-01T00:00:00",
            "due_date": "2026-06-30T00:00:00",
            "contractor": "Metro Flow Systems Pvt Ltd",
            "status": "in_progress",
            "progress_percent": 35.0,
            "source_url": f"https://opendata.tn.gov.in/projects/{source_id}"
        }
    ]

    res1 = service.sync_government_data(external_records=records)
    assert res1["success"] is True
    assert res1["records_ingested"] >= 1

    project = db.query(Project).filter(Project.external_id == source_id).first()
    assert project is not None
    assert project.progress_percent == 35.0

    # User adds a follower and community rating to project
    citizen = quality_users["citizen"]
    db.add(ProjectFollower(project_id=project.id, user_id=citizen.id))
    db.add(ProjectRating(project_id=project.id, user_id=citizen.id, transparency_score=5, comment="Great work"))
    db.commit()

    # Second sync with conflict detection:
    # If the project is locally tracked, it detects conflict and preserves local fields
    project.source = ProjectSource.LOCAL_TRACKING
    project.title = "Locally Modified Project Title"
    db.commit()

    records_conflicting = [
        {
            "external_id": source_id,
            "title": "Remote Conflicting Title Should Not Overwrite",
            "category": "Water Supply",
            "status": "completed",
            "budget_amount": 50000000.0,
            "progress_percent": 100.0,
        }
    ]

    res2 = service.sync_government_data(external_records=records_conflicting)
    assert res2["success"] is True
    assert res2["conflicts_detected"] >= 1

    db.refresh(project)
    # Local title preserved
    assert project.title == "Locally Modified Project Title"
    # Followers and ratings preserved
    assert len(project.followers) == 1
    assert len(project.ratings) == 1


# ----------------------------------------------------------------------
# 5. Role-Based Access Control (RBAC) Permissions
# ----------------------------------------------------------------------
def test_rbac_scoping_and_forbidden_actions(quality_users):
    citizen = quality_users["citizen"]
    gov_admin = quality_users["gov_admin"]

    # Citizen trying to access admin analytics endpoint -> 403 Forbidden
    res_cit = client.get("/api/v1/analytics/officers", headers=get_token(citizen))
    assert res_cit.status_code == 403

    # Gov Admin allowed
    res_admin = client.get("/api/v1/analytics/officers", headers=get_token(gov_admin))
    assert res_admin.status_code == 200


# ----------------------------------------------------------------------
# 6. Moderation Flows: Flags, Queue, Actions & Audit Logs
# ----------------------------------------------------------------------
def test_community_moderation_queue_and_audit_logging(db: Session, quality_users):
    citizen = quality_users["citizen"]
    gov_admin = quality_users["gov_admin"]

    # Create test group & post
    group = Group(
        name="Quality Mod Test Group",
        category="Civic Action",
        description="Testing moderation queue",
        visibility=GroupVisibility.PUBLIC,
        moderator_id=citizen.id
    )
    db.add(group)
    db.flush()

    post = GroupPost(
        group_id=group.id,
        author_id=citizen.id,
        title="Quality Test Abuse Post",
        content="Testing abusive flag text here with contact 99999",
        is_hidden=False
    )
    db.add(post)
    db.commit()

    # Citizen flags post
    res_flag = client.post(
        "/api/v1/community/flags",
        json={"content_type": "group_post", "content_id": post.id, "reason": "Contains unsolicited spam numbers"},
        headers=get_token(citizen)
    )
    assert res_flag.status_code == 200

    # Moderator views moderation queue
    res_queue = client.get("/api/v1/community/flags?status=pending", headers=get_token(gov_admin))
    assert res_queue.status_code == 200
    queue = res_queue.json()
    assert any(item["content_id"] == post.id for item in queue)

    flag_id = [item["id"] for item in queue if item["content_id"] == post.id][0]

    # Moderator hides content
    res_action = client.post(
        f"/api/v1/community/flags/{flag_id}/action",
        json={"action": "hide", "note": "Hidden for content guidelines violation"},
        headers=get_token(gov_admin)
    )
    assert res_action.status_code == 200
    assert res_action.json()["status"] == "reviewed"

    db.refresh(post)
    assert post.is_hidden is True

    # Audit log check
    audit = db.query(ModerationAuditLog).filter(
        ModerationAuditLog.target_id == post.id,
        ModerationAuditLog.target_type == "group_post"
    ).first()
    assert audit is not None
    assert audit.action == "moderation_hide"


# ----------------------------------------------------------------------
# 7. Certificate Verification (/verify/:code)
# ----------------------------------------------------------------------
def test_certificate_public_verification(db: Session, quality_users):
    citizen = quality_users["citizen"]
    mod = db.query(LearningModule).first()
    assert mod is not None

    cert_code = f"CERT-QUAL-{int(datetime.utcnow().timestamp())}"
    cert = Certificate(
        user_id=citizen.id,
        module_id=mod.id,
        title=mod.title,
        certificate_code=cert_code,
        score=100.0,
        issued_at=datetime.utcnow()
    )
    db.add(cert)
    db.commit()

    # Verify valid certificate
    res_valid = client.get(f"/api/v1/education/verify/{cert_code}")
    assert res_valid.status_code == 200
    data = res_valid.json()
    assert data["valid"] is True
    assert data["certificate_code"] == cert_code
    assert data["recipient_name"] == (citizen.public_display_name or citizen.name)

    # Verify invalid certificate code -> 404
    res_invalid = client.get("/api/v1/education/verify/NON-EXISTENT-CODE")
    assert res_invalid.status_code == 404

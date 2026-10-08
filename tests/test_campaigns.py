import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.entities import (
    User, UserRole, Campaign, CampaignTask, CampaignParticipant,
    CampaignUserTaskProgress, CampaignStatus, CampaignTaskType,
    Badge, UserBadge, PointsLedger, Notification, Complaint,
    ComplaintStatus, ComplaintPriority, ComplaintChannel, Ward, ComplaintCategory
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def test_users(db: Session):
    citizen = db.query(User).filter(User.email == "camp_test_citizen@tngov.in").first()
    if not citizen:
        citizen = User(
            name="Campaign Test Citizen",
            email="camp_test_citizen@tngov.in",
            mobile="9840999111",
            hashed_password="dummy_hashed_password",
            role=UserRole.CITIZEN,
            public_id="cit-camp-01",
            public_display_name="Camp Citizen",
            leaderboard_opt_out=False,
            is_active=True,
        )
        db.add(citizen)
        db.commit()
        db.refresh(citizen)

    opted_out_citizen = db.query(User).filter(User.email == "camp_optout_citizen@tngov.in").first()
    if not opted_out_citizen:
        opted_out_citizen = User(
            name="Opted Out Citizen",
            email="camp_optout_citizen@tngov.in",
            mobile="9840999222",
            hashed_password="dummy_hashed_password",
            role=UserRole.CITIZEN,
            public_id="cit-camp-optout",
            public_display_name="Private Citizen",
            leaderboard_opt_out=True,
            is_active=True,
        )
        db.add(opted_out_citizen)
        db.commit()
        db.refresh(opted_out_citizen)

    gov_admin = db.query(User).filter(User.role == UserRole.GOV_ADMIN).first()
    if not gov_admin:
        gov_admin = User(
            name="State Administrator",
            email="camp_govadmin@tngov.in",
            mobile="9800000099",
            hashed_password="dummy_hashed_password",
            role=UserRole.GOV_ADMIN,
            is_active=True,
        )
        db.add(gov_admin)
        db.commit()
        db.refresh(gov_admin)

    return {
        "citizen": citizen,
        "opted_out": opted_out_citizen,
        "gov_admin": gov_admin,
    }


def get_auth_headers(user: User):
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def test_list_campaigns_and_dynamic_stats(test_users):
    """Verify listing seasonal campaigns with dynamic statistics and filters."""
    res = client.get("/api/v1/campaigns")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "stats" in data
    assert data["stats"]["total_campaigns"] >= 1
    assert data["stats"]["active_campaigns"] >= 1
    assert data["stats"]["total_participants"] >= 1

    # Filter by theme
    res_theme = client.get("/api/v1/campaigns?season_theme=monsoon")
    assert res_theme.status_code == 200
    theme_items = res_theme.json()["items"]
    assert len(theme_items) >= 1
    assert any("monsoon" in item["season_theme"].lower() for item in theme_items)

    # Filter by status
    res_status = client.get("/api/v1/campaigns?status=active")
    assert res_status.status_code == 200
    for item in res_status.json()["items"]:
        assert item["status"] == "active"


def test_get_campaign_detail_by_slug_and_id(test_users):
    """Verify getting campaign details by slug and numeric ID."""
    res = client.get("/api/v1/campaigns/monsoon-preparedness-2026")
    assert res.status_code == 200
    camp = res.json()
    assert camp["slug"] == "monsoon-preparedness-2026"
    assert "tasks" in camp
    assert len(camp["tasks"]) >= 1
    assert camp["target_metric"] == "reports_filed"
    assert "top_leaderboard" in camp
    assert isinstance(camp["progress_percent"], (int, float))

    # Test by ID
    res_id = client.get(f"/api/v1/campaigns/{camp['id']}")
    assert res_id.status_code == 200
    assert res_id.json()["id"] == camp["id"]


def test_citizen_join_and_leave_campaign(test_users, db: Session):
    """Verify citizen joining awards +25 points and initializes tasks; leaving resets."""
    citizen = test_users["citizen"]
    headers = get_auth_headers(citizen)

    # Get monsoon campaign
    camp = db.query(Campaign).filter(Campaign.slug == "monsoon-preparedness-2026").first()
    assert camp is not None

    # First clean up if already joined
    db.query(CampaignUserTaskProgress).filter(
        CampaignUserTaskProgress.campaign_id == camp.id,
        CampaignUserTaskProgress.user_id == citizen.id
    ).delete()
    db.query(CampaignParticipant).filter(
        CampaignParticipant.campaign_id == camp.id,
        CampaignParticipant.user_id == citizen.id
    ).delete()
    db.commit()

    # Join campaign
    join_res = client.post(f"/api/v1/campaigns/{camp.slug}/join", headers=headers)
    assert join_res.status_code == 200
    camp_detail = join_res.json()
    assert camp_detail["is_joined"] is True

    # Check participant in DB
    part = db.query(CampaignParticipant).filter(
        CampaignParticipant.campaign_id == camp.id,
        CampaignParticipant.user_id == citizen.id
    ).first()
    assert part is not None
    assert part.points_earned >= 25

    # Check PointsLedger entry
    ledger = db.query(PointsLedger).filter(
        PointsLedger.user_id == citizen.id,
        PointsLedger.reason == "campaign_joined",
        PointsLedger.source_id == str(camp.id)
    ).first()
    assert ledger is not None
    assert ledger.points == 25

    # Idempotent second join
    join_res2 = client.post(f"/api/v1/campaigns/{camp.slug}/join", headers=headers)
    assert join_res2.status_code == 200

    # Leave campaign
    leave_res = client.post(f"/api/v1/campaigns/{camp.slug}/leave", headers=headers)
    assert leave_res.status_code == 200
    assert leave_res.json()["status"] == "left"

    # Confirm deleted
    part_after = db.query(CampaignParticipant).filter(
        CampaignParticipant.campaign_id == camp.id,
        CampaignParticipant.user_id == citizen.id
    ).first()
    assert part_after is None


def test_campaign_task_progress_evaluation_and_completion(test_users, db: Session):
    """
    Verify real-time evaluation of user activities against campaign tasks,
    completing tasks and unlocking campaign completion bonus points and badge.
    """
    import random
    ts = int(datetime.utcnow().timestamp())
    fresh_citizen = User(
        name="Micro Test Citizen",
        email=f"fresh_micro_{ts}@tngov.in",
        mobile=f"9840{random.randint(100000, 999999)}",
        hashed_password="dummy",
        role=UserRole.CITIZEN,
        public_id=f"cit-micro-{ts}",
        public_display_name="Fresh Citizen",
        is_active=True,
    )
    db.add(fresh_citizen)
    db.commit()
    db.refresh(fresh_citizen)
    citizen = fresh_citizen
    headers = get_auth_headers(citizen)

    # Create a small standalone test campaign
    badge = db.query(Badge).filter(Badge.code == "monsoon_guardian").first()
    now = datetime.utcnow()
    test_camp = Campaign(
        title="Test Micro Campaign",
        slug=f"test-micro-camp-{ts}",
        description="Testing task evaluation",
        season_theme="testing",
        start_at=now - timedelta(hours=1),
        end_at=now + timedelta(days=5),
        target_metric="reports_filed",
        target_value=10,
        region="Chennai",
        status=CampaignStatus.ACTIVE,
        points_reward=50,
        badge_id=badge.id if badge else None,
        created_by=test_users["gov_admin"].id
    )
    db.add(test_camp)
    db.flush()

    task = CampaignTask(
        campaign_id=test_camp.id,
        title="Test Verify 1 Report",
        description="Verify a report",
        task_type=CampaignTaskType.VERIFY_REPORTS,
        target_count=1,
        points_reward=15,
        display_order=1
    )
    db.add(task)
    db.commit()

    # Join campaign
    join_res = client.post(f"/api/v1/campaigns/{test_camp.id}/join", headers=headers)
    assert join_res.status_code == 200

    # Initially task is not complete
    detail_res = client.get(f"/api/v1/campaigns/{test_camp.id}", headers=headers)
    assert detail_res.status_code == 200
    tasks = detail_res.json()["tasks"]
    assert len(tasks) == 1
    assert tasks[0]["is_completed"] is False

    # Simulate activity: citizen verifies a report during campaign window
    p_verify = PointsLedger(
        user_id=citizen.id,
        points=10,
        reason="verified_other_report",
        source_type="complaint_verify",
        source_id=f"test_verify_{int(now.timestamp())}",
        created_at=now
    )
    db.add(p_verify)
    db.commit()

    # Fetch detail again with user token to trigger evaluation
    eval_res = client.get(f"/api/v1/campaigns/{test_camp.id}", headers=headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.json()

    # Task should be completed
    assert eval_data["tasks"][0]["is_completed"] is True
    assert eval_data["tasks"][0]["user_current_count"] >= 1

    # Entire campaign should be completed for participant
    assert eval_data["is_completed"] is True
    assert eval_data["user_points_earned"] >= 65  # 25 join + 15 task + 50 bonus = 90

    # Check badge awarded if badge existed
    if badge:
        user_badge = db.query(UserBadge).filter(
            UserBadge.user_id == citizen.id,
            UserBadge.badge_id == badge.id
        ).first()
        assert user_badge is not None


def test_campaign_leaderboard_privacy_and_optout(test_users, db: Session):
    """
    Verify leaderboard privacy rules:
    - Opted out users are excluded.
    - Public pseudonyms/display names used, no emails or phone numbers.
    """
    camp = db.query(Campaign).filter(Campaign.slug == "monsoon-preparedness-2026").first()
    assert camp is not None

    opted_out = test_users["opted_out"]
    # Ensure opted_out is a participant
    part = db.query(CampaignParticipant).filter(
        CampaignParticipant.campaign_id == camp.id,
        CampaignParticipant.user_id == opted_out.id
    ).first()
    if not part:
        db.add(CampaignParticipant(
            campaign_id=camp.id,
            user_id=opted_out.id,
            joined_at=datetime.utcnow(),
            is_completed=False,
            points_earned=25
        ))
        db.commit()

    res = client.get(f"/api/v1/campaigns/{camp.slug}/leaderboard")
    assert res.status_code == 200
    lb = res.json()
    assert isinstance(lb, list)

    # Opted-out user must not appear
    for entry in lb:
        assert entry["user_id"] != opted_out.id
        assert "email" not in entry
        assert "mobile" not in entry
        assert "display_name" in entry
        assert "public_id" in entry
        assert "rank" in entry


def test_campaign_lifecycle_sync_endpoint(test_users):
    """Verify background sync endpoint for campaign lifecycles."""
    gov_admin = test_users["gov_admin"]
    citizen = test_users["citizen"]

    # Citizen forbidden
    res_cit = client.post("/api/v1/campaigns/sync", headers=get_auth_headers(citizen))
    assert res_cit.status_code == 403

    # Gov Admin allowed
    res_admin = client.post("/api/v1/campaigns/sync", headers=get_auth_headers(gov_admin))
    assert res_admin.status_code == 200
    summary = res_admin.json()
    assert "activated_count" in summary
    assert "completed_count" in summary
    assert isinstance(summary["details"], list)


def test_admin_create_campaign_rbac(test_users):
    """Verify only Gov Admin can create new seasonal campaigns."""
    citizen = test_users["citizen"]
    gov_admin = test_users["gov_admin"]

    payload = {
        "title": "Winter Lake Cleanup Drive",
        "slug": f"winter-lake-cleanup-{int(datetime.utcnow().timestamp())}",
        "description": "Restoration of urban wetland perimeters",
        "season_theme": "winter",
        "start_at": (datetime.utcnow() + timedelta(days=2)).isoformat(),
        "end_at": (datetime.utcnow() + timedelta(days=20)).isoformat(),
        "target_metric": "reports_filed",
        "target_value": 75,
        "region": "Chennai",
        "points_reward": 50,
        "tasks": [
            {
                "title": "Document 2 Wetland Encroachments",
                "description": "Take pictures of lake boundary violations",
                "task_type": "report_issues",
                "target_count": 2,
                "points_reward": 20,
                "display_order": 1
            }
        ]
    }

    # Citizen attempt -> 403
    res_cit = client.post("/api/v1/campaigns", json=payload, headers=get_auth_headers(citizen))
    assert res_cit.status_code == 403

    # Gov Admin attempt -> 201
    res_admin = client.post("/api/v1/campaigns", json=payload, headers=get_auth_headers(gov_admin))
    assert res_admin.status_code == 201
    created = res_admin.json()
    assert created["title"] == "Winter Lake Cleanup Drive"
    assert created["status"] == "scheduled"
    assert len(created["tasks"]) == 1

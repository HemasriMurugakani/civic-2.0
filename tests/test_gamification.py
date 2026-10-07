import pytest
from datetime import datetime, timedelta
from app.models.entities import (
    User, UserRole, PointsLedger, Badge, UserBadge, Complaint, ComplaintStatus, Notification
)
from app.services.gamification_service import GamificationService, LEVEL_THRESHOLDS, DAILY_CAPS
from app.core.security import get_password_hash


@pytest.fixture
def gamification_user(db_session):
    db_session.rollback()
    mobile = f"99999{datetime.utcnow().strftime('%f')[:5]}"
    user = User(
        name="Gamification Test User",
        mobile=mobile,
        email=f"gamify_{mobile}@test.gov.in",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.CITIZEN,
        preferred_language="en",
        public_id=f"cit-test-{mobile}",
        public_display_name="Test Citizen",
        leaderboard_opt_out=False,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    yield user
    # Cleanup
    db_session.rollback()
    db_session.query(Notification).filter(Notification.user_id == user.id).delete()
    db_session.query(PointsLedger).filter(PointsLedger.user_id == user.id).delete()
    db_session.query(UserBadge).filter(UserBadge.user_id == user.id).delete()
    db_session.delete(user)
    db_session.commit()


def test_points_ledger_idempotency(db_session, gamification_user):
    service = GamificationService(db_session)
    source_id = f"test_comp_{gamification_user.id}"

    # Award points first time
    entry1 = service.award_points(
        user_id=gamification_user.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points=15
    )
    assert entry1 is not None
    assert entry1.points == 15

    # Second call with same user, reason, source_type, source_id MUST be idempotent
    entry2 = service.award_points(
        user_id=gamification_user.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points=15
    )
    assert entry2 is not None
    assert entry2.id == entry1.id

    # Total score should be exactly 15, not 30
    total_score = service.get_user_score(gamification_user.id)
    assert total_score == 15


def test_daily_cap_enforcement(db_session, gamification_user):
    service = GamificationService(db_session)
    cap = DAILY_CAPS["verified_other_report"] # 30 points

    # Earn 25 points (5 points * 5 times)
    for i in range(5):
        entry = service.award_points(
            user_id=gamification_user.id,
            reason="verified_other_report",
            source_type="complaint",
            source_id=f"verif_{gamification_user.id}_{i}",
            points=5,
            check_daily_cap=True
        )
        assert entry is not None

    # Next 5 points brings total to 30 (cap reached)
    entry_cap = service.award_points(
        user_id=gamification_user.id,
        reason="verified_other_report",
        source_type="complaint",
        source_id=f"verif_{gamification_user.id}_last",
        points=5,
        check_daily_cap=True
    )
    assert entry_cap is not None

    # Next attempt should be blocked by daily cap
    entry_blocked = service.award_points(
        user_id=gamification_user.id,
        reason="verified_other_report",
        source_type="complaint",
        source_id=f"verif_{gamification_user.id}_exceeded",
        points=5,
        check_daily_cap=True
    )
    assert entry_blocked is None


def test_self_voting_prevention(db_session, gamification_user):
    service = GamificationService(db_session)

    # Citizen tries to verify their own complaint
    res = service.record_event(
        user_id=gamification_user.id,
        event_type="verified_other_report",
        source_type="complaint",
        source_id="own_complaint_99",
        self_check_author_id=gamification_user.id
    )

    assert res["success"] is False
    assert res["awarded"] is False
    assert "Self-interaction" in res["reason"]


def test_points_reversal(db_session, gamification_user):
    service = GamificationService(db_session)
    source_id = f"rev_test_{gamification_user.id}"

    # Award points
    service.award_points(
        user_id=gamification_user.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points=25
    )
    score_before = service.get_user_score(gamification_user.id)

    # Reverse points
    rev_entry = service.reverse_points(
        user_id=gamification_user.id,
        reason="report_submitted",
        source_type="complaint",
        source_id=source_id,
        points_to_deduct=25
    )
    assert rev_entry is not None
    assert rev_entry.points == -25

    score_after = service.get_user_score(gamification_user.id)
    assert score_after == score_before - 25


def test_level_calculation_and_progress_percent():
    # Level 1 test (0 - 49 pts)
    lvl1 = GamificationService.calculate_level(25)
    assert lvl1["level"] == 1
    assert lvl1["title_en"] == "Aware Citizen L1"
    assert lvl1["next_level_threshold"] == 50
    assert lvl1["points_to_next_level"] == 25
    assert lvl1["progress_percent"] == 50.0

    # Level 3 test (150 - 349 pts)
    lvl3 = GamificationService.calculate_level(250)
    assert lvl3["level"] == 3
    assert lvl3["title_en"] == "Engaged Citizen"
    assert lvl3["next_level_threshold"] == 350
    assert lvl3["points_to_next_level"] == 100
    # Range is 150 to 350 (span 200). 250 - 150 = 100 earned. 100/200 = 50.0%
    assert lvl3["progress_percent"] == 50.0

    # Max level test (750+ pts)
    lvl5 = GamificationService.calculate_level(800)
    assert lvl5["level"] == 5
    assert lvl5["title_en"] == "Civic Champion"
    assert lvl5["next_level_threshold"] is None
    assert lvl5["progress_percent"] == 100.0


def test_leaderboard_privacy_and_opt_out(db_session, gamification_user):
    service = GamificationService(db_session)

    # Give user some points
    service.award_points(
        user_id=gamification_user.id,
        reason="test_leaderboard_pts",
        source_type="test",
        source_id=f"lb_{gamification_user.id}",
        points=100
    )

    # Check leaderboard: user should be present with public_display_name, no PII
    lb = service.get_leaderboard(scope="global", period="all", limit=50)
    user_item = next((item for item in lb["items"] if item["public_id"] == gamification_user.public_id), None)
    assert user_item is not None
    assert user_item["display_name"] == gamification_user.public_display_name
    assert "@" not in user_item["display_name"]
    assert "98" not in user_item["display_name"]

    # Now opt out of leaderboard
    gamification_user.leaderboard_opt_out = True
    db_session.add(gamification_user)
    db_session.commit()

    # User should now be excluded from leaderboard
    lb_after = service.get_leaderboard(scope="global", period="all", limit=50)
    user_item_after = next((item for item in lb_after["items"] if item["public_id"] == gamification_user.public_id), None)
    assert user_item_after is None

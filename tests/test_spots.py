import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.entities import (
    User, UserRole, Spot, SpotCheckin, SpotAdoptionHistory,
    SpotType, SpotStatus, CareFrequency, PointsLedger, Notification,
    Department, Ward
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def test_users(db: Session):
    citizen = db.query(User).filter(User.email == "spot_test_citizen@tngov.in").first()
    if not citizen:
        citizen = User(
            name="Spot Test Citizen",
            email="spot_test_citizen@tngov.in",
            mobile="9840888771",
            hashed_password="dummy_hashed_password",
            role=UserRole.CITIZEN,
            public_id="cit-spot-01",
            public_display_name="Spot Tester",
            is_active=True,
        )
        db.add(citizen)
        db.commit()
        db.refresh(citizen)

    officer = db.query(User).filter(User.email == "spot_test_officer@tngov.in").first()
    if not officer:
        officer = User(
            name="Spot Test Officer",
            email="spot_test_officer@tngov.in",
            mobile="9840888772",
            hashed_password="dummy_hashed_password",
            role=UserRole.OFFICER,
            public_id="off-spot-01",
            public_display_name="Spot Officer",
            is_active=True,
        )
        db.add(officer)
        db.commit()
        db.refresh(officer)

    gov_admin = db.query(User).filter(User.role == UserRole.GOV_ADMIN).first()
    if not gov_admin:
        gov_admin = User(
            name="Spot Test Admin",
            email="spot_test_admin@tngov.in",
            mobile="9840888773",
            hashed_password="dummy_hashed_password",
            role=UserRole.GOV_ADMIN,
            public_id="adm-spot-01",
            public_display_name="Gov Admin",
            is_active=True,
        )
        db.add(gov_admin)
        db.commit()
        db.refresh(gov_admin)

    db.query(SpotCheckin).filter(SpotCheckin.user_id == citizen.id).delete()
    db.query(SpotAdoptionHistory).filter(SpotAdoptionHistory.user_id == citizen.id).delete()
    db.query(PointsLedger).filter(
        PointsLedger.user_id == citizen.id,
        PointsLedger.reason.in_(["spot_adopted", "spot_checkin"])
    ).delete()
    for s in db.query(Spot).filter(Spot.adopted_by == citizen.id).all():
        s.status = SpotStatus.AVAILABLE
        s.adopted_by = None
        s.adopted_at = None
    db.commit()

    cit_token = create_access_token({"sub": str(citizen.id), "role": citizen.role.value})
    off_token = create_access_token({"sub": str(officer.id), "role": officer.role.value})
    adm_token = create_access_token({"sub": str(gov_admin.id), "role": gov_admin.role.value})

    return {
        "citizen": citizen,
        "officer": officer,
        "admin": gov_admin,
        "cit_token": cit_token,
        "off_token": off_token,
        "adm_token": adm_token,
    }


def test_list_spots_and_computed_stats(test_users):
    """Verify listing spots computes stats dynamically and supports filtering."""
    response = client.get("/api/v1/spots")
    assert response.status_code == 200
    data = response.json()

    assert "total" in data
    assert "items" in data
    assert "stats" in data
    assert data["stats"]["total_spots"] >= 10
    assert data["stats"]["available_spots"] >= 1
    assert data["stats"]["adopted_spots"] >= 1

    # Filter by spot_type
    res_park = client.get("/api/v1/spots?spot_type=park")
    assert res_park.status_code == 200
    park_data = res_park.json()
    assert all(item["spot_type"] == "park" for item in park_data["items"])

    # Filter by status
    res_avail = client.get("/api/v1/spots?status=available")
    assert res_avail.status_code == 200
    avail_data = res_avail.json()
    assert all(item["status"] == "available" for item in avail_data["items"])


def test_get_spot_detail_and_map_points():
    """Verify spot detail includes checkins, history, and map returns GIS points."""
    # Detail for spot 1
    res_detail = client.get("/api/v1/spots/1")
    assert res_detail.status_code == 200
    spot_data = res_detail.json()
    assert spot_data["id"] == 1
    assert "checkins" in spot_data
    assert "history" in spot_data
    assert "linked_complaints" in spot_data

    # Map points
    res_map = client.get("/api/v1/spots/map")
    assert res_map.status_code == 200
    points = res_map.json()
    assert isinstance(points, list)
    assert len(points) >= 10
    assert "latitude" in points[0]
    assert "longitude" in points[0]
    assert "spot_type" in points[0]


def test_adopt_spot_flow_and_points_award(test_users, db: Session):
    """Test citizen adopting an available spot, earning 100 points idempotently."""
    cit_headers = {"Authorization": f"Bearer {test_users['cit_token']}"}

    # Find an available spot
    spot = db.query(Spot).filter(Spot.status == SpotStatus.AVAILABLE).first()
    assert spot is not None, "At least one available spot should exist"
    spot_id = spot.id

    payload = {
        "commitment_actions": ["Daily litter inspection", "Watering saplings", "Graffiti removal"],
        "care_frequency": "weekly"
    }

    res_adopt = client.post(f"/api/v1/spots/{spot_id}/adopt", json=payload, headers=cit_headers)
    assert res_adopt.status_code == 200
    adopted_spot = res_adopt.json()

    assert adopted_spot["status"] == "adopted"
    assert adopted_spot["adopted_by"] == test_users["citizen"].id
    assert "Daily litter inspection" in adopted_spot["commitment_actions"]

    # Verify points awarded (+100)
    point_entry = db.query(PointsLedger).filter(
        PointsLedger.user_id == test_users["citizen"].id,
        PointsLedger.reason == "spot_adopted"
    ).first()
    assert point_entry is not None
    assert point_entry.points == 100

    # Cannot adopt an already adopted spot
    res_dup = client.post(f"/api/v1/spots/{spot_id}/adopt", json=payload, headers=cit_headers)
    assert res_dup.status_code == 400


def test_checkin_spot_and_points_award(test_users, db: Session):
    """Test submitting a check-in with note, photo, actions, awarding 15 points."""
    cit_headers = {"Authorization": f"Bearer {test_users['cit_token']}"}

    # Find spot adopted by citizen
    spot = db.query(Spot).filter(Spot.adopted_by == test_users["citizen"].id).first()
    assert spot is not None

    payload = {
        "note": "Planted 3 new saplings and swept dry fallen leaves around perimeter benches.",
        "photo_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800",
        "actions_completed": ["Daily litter inspection", "Watering saplings"]
    }

    res_checkin = client.post(f"/api/v1/spots/{spot.id}/checkin", json=payload, headers=cit_headers)
    assert res_checkin.status_code == 200
    chk_data = res_checkin.json()

    assert chk_data["spot_id"] == spot.id
    assert chk_data["points_awarded"] == 15
    assert chk_data["note"] == payload["note"]

    # Verify points ledger has +15
    point_chk = db.query(PointsLedger).filter(
        PointsLedger.user_id == test_users["citizen"].id,
        PointsLedger.reason == "spot_checkin"
    ).first()
    assert point_chk is not None
    assert point_chk.points == 15


def test_release_spot_voluntary(test_users, db: Session):
    """Test adopter voluntarily releasing their spot."""
    cit_headers = {"Authorization": f"Bearer {test_users['cit_token']}"}

    spot = db.query(Spot).filter(Spot.adopted_by == test_users["citizen"].id).first()
    assert spot is not None

    payload = {"reason": "Moving to another neighborhood"}
    res_release = client.post(f"/api/v1/spots/{spot.id}/release", json=payload, headers=cit_headers)
    assert res_release.status_code == 200
    rel_data = res_release.json()

    assert rel_data["status"] == "available"
    assert rel_data["adopted_by"] is None

    # Verify history entry created
    hist = db.query(SpotAdoptionHistory).filter(
        SpotAdoptionHistory.spot_id == spot.id,
        SpotAdoptionHistory.action == "released"
    ).first()
    assert hist is not None
    assert "Moving to another neighborhood" in hist.reason


def test_max_adoptions_cap(test_users, db: Session):
    """Enforce max 3 active spots per citizen."""
    cit_headers = {"Authorization": f"Bearer {test_users['cit_token']}"}

    # Ensure no spots currently adopted by citizen
    for s in db.query(Spot).filter(Spot.adopted_by == test_users["citizen"].id).all():
        s.status = SpotStatus.AVAILABLE
        s.adopted_by = None
        s.adopted_at = None
    db.commit()

    # Find 4 available spots
    avail_spots = db.query(Spot).filter(Spot.status == SpotStatus.AVAILABLE).limit(4).all()
    assert len(avail_spots) >= 4

    payload = {"commitment_actions": ["Testing cap"], "care_frequency": "weekly"}

    # Adopt 3
    for s in avail_spots[:3]:
        r = client.post(f"/api/v1/spots/{s.id}/adopt", json=payload, headers=cit_headers)
        assert r.status_code == 200

    # 4th adoption must fail with 400
    r_fourth = client.post(f"/api/v1/spots/{avail_spots[3].id}/adopt", json=payload, headers=cit_headers)
    assert r_fourth.status_code == 400
    assert "maximum limit" in r_fourth.json()["detail"]

    # Clean up: release those 3 spots so subsequent tests have available spots
    for s in avail_spots[:3]:
        client.post(f"/api/v1/spots/{s.id}/release", json={"reason": "Test cleanup"}, headers=cit_headers)


def test_scheduler_reminders_and_auto_release(test_users, db: Session):
    """Simulate overdue checkin leading to auto-release after missed checkin threshold."""
    adm_headers = {"Authorization": f"Bearer {test_users['adm_token']}"}

    # Create a test spot that missed 3 cycles
    now = datetime.utcnow()
    test_overdue_spot = Spot(
        name="Overdue Test Spot",
        spot_type=SpotType.PARK,
        description="Spot to test scheduler auto release",
        address="Test Road, Chennai",
        latitude=13.0,
        longitude=80.2,
        district="Chennai Central",
        status=SpotStatus.ADOPTED,
        adopted_by=test_users["citizen"].id,
        adopted_at=now - timedelta(days=60),
        last_checkin_at=now - timedelta(days=40),
        missed_checkins_count=2, # Next cycle reaches max 3
        max_missed_checkins=3,
        care_frequency=CareFrequency.WEEKLY,
        commitment_actions=["Watering"],
        created_at=now - timedelta(days=60),
        updated_at=now - timedelta(days=40)
    )
    db.add(test_overdue_spot)
    db.commit()
    db.refresh(test_overdue_spot)

    res_sched = client.post("/api/v1/spots/scheduler/check-reminders", headers=adm_headers)
    assert res_sched.status_code == 200
    sched_summary = res_sched.json()

    assert sched_summary["checked_spots_count"] >= 1
    assert sched_summary["auto_released_count"] >= 1

    # Verify spot is now available
    db.refresh(test_overdue_spot)
    assert test_overdue_spot.status == SpotStatus.AVAILABLE
    assert test_overdue_spot.adopted_by is None

    # Clean up test spot
    db.delete(test_overdue_spot)
    db.commit()


def test_officer_admin_status_update_and_bulk_create(test_users, db: Session):
    """Verify Officer can update status to MAINTENANCE and Admin can bulk create."""
    off_headers = {"Authorization": f"Bearer {test_users['off_token']}"}
    adm_headers = {"Authorization": f"Bearer {test_users['adm_token']}"}

    spot = db.query(Spot).filter(Spot.status == SpotStatus.AVAILABLE).first()
    assert spot is not None

    # Officer sets status to MAINTENANCE
    status_payload = {"status": "maintenance", "note": "Renovating play equipment"}
    res_status = client.patch(f"/api/v1/spots/{spot.id}/status", json=status_payload, headers=off_headers)
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "maintenance"

    # Reset back to available
    client.patch(f"/api/v1/spots/{spot.id}/status", json={"status": "available", "note": "Renovation done"}, headers=off_headers)

    # Bulk create spots by Admin
    bulk_payload = {
        "spots": [
            {
                "name": "Bulk Spot Alpha",
                "spot_type": "bus_stop",
                "description": "Bulk import test",
                "address": "OMR Sholinganallur",
                "latitude": 12.90,
                "longitude": 80.22,
                "district": "Chennai South",
                "care_frequency": "daily",
                "commitment_actions": ["Shelter cleaning"]
            }
        ]
    }
    res_bulk = client.post("/api/v1/spots/bulk", json=bulk_payload, headers=adm_headers)
    assert res_bulk.status_code == 200
    assert res_bulk.json()["created_count"] == 1

    # Clean up bulk spot
    b_spot = db.query(Spot).filter(Spot.name == "Bulk Spot Alpha").first()
    if b_spot:
        db.delete(b_spot)
        db.commit()

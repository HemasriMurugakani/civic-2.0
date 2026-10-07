import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.models.entities import ComplaintStatus, UserRole

client = TestClient(app)

def test_complete_citizen_officer_admin_lifecycle():
    # -------------------------------------------------------------
    # 1. Citizen Registration and Filing
    # -------------------------------------------------------------
    reg_mobile = f"98765{datetime.utcnow().strftime('%M%S%f')[:5]}"
    reg_payload = {
        "name": "E2E Lifecycle Citizen",
        "mobile": reg_mobile,
        "password": "Password@123",
        "email": f"lifecycle_{reg_mobile}@tngov.in",
        "preferred_language": "en",
        "role": "citizen",
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200, reg_res.text
    citizen_tokens = reg_res.json()
    citizen_headers = {"Authorization": f"Bearer {citizen_tokens['access_token']}"}

    # Fetch master data to get a valid category and ward
    master_res = client.get("/api/v1/public/master-data")
    assert master_res.status_code == 200
    master_data = master_res.json()
    category = master_data["categories"][0]
    ward = master_data["wards"][0]

    # Citizen files a grievance
    complaint_payload = {
        "title": "E2E Pipeline Rupture on 4th Cross",
        "description": "Continuous freshwater leakage eroding the road foundation. Urgent repair needed.",
        "category_id": category["id"],
        "ward_id": ward["id"],
        "latitude": 13.0827,
        "longitude": 80.2707,
        "address_text": "4th Cross Street, Chennai",
        "channel": "web",
    }
    create_res = client.post("/api/v1/complaints", json=complaint_payload, headers=citizen_headers)
    assert create_res.status_code == 200, create_res.text
    created = create_res.json()
    complaint_id = created["id"]
    reference_no = created["reference_no"]

    assert created["status"] in ["submitted", "assigned"]
    assert reference_no.startswith("GOV-2026-")

    # -------------------------------------------------------------
    # 2. Public Tracking Verification
    # -------------------------------------------------------------
    track_res = client.get(f"/api/v1/public/track/{reference_no}")
    assert track_res.status_code == 200
    track_data = track_res.json()
    assert track_data["reference_no"] == reference_no
    assert len(track_data["history"]) >= 1

    # -------------------------------------------------------------
    # 3. Department Admin Reassigns / Verifies Assignment
    # -------------------------------------------------------------
    admin_login = client.post("/api/v1/auth/login", json={
        "username": "govadmin@tngov.in",
        "password": "Civic@123",
    })
    assert admin_login.status_code == 200
    gov_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # Assign to Officer Murugan K (officer.san1@tngov.in, mobile: 9810000011)
    officer_login = client.post("/api/v1/auth/login", json={
        "username": "officer.san1@tngov.in",
        "password": "Civic@123",
    })
    assert officer_login.status_code == 200
    officer_user = officer_login.json()["user"]
    officer_headers = {"Authorization": f"Bearer {officer_login.json()['access_token']}"}

    reassign_res = client.post(
        f"/api/v1/complaints/{complaint_id}/reassign",
        json={"officer_id": officer_user["id"], "note": "Assigned for lifecycle test"},
        headers=gov_headers,
    )
    assert reassign_res.status_code == 200

    # -------------------------------------------------------------
    # 4. Officer Workbench: Acknowledge -> In Progress -> Resolve
    # -------------------------------------------------------------
    # Step A: Acknowledge
    ack_res = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "acknowledged", "note": "Field crew arrived on site"},
        headers=officer_headers,
    )
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "acknowledged"

    # Step B: In Progress
    prog_res = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "in_progress", "note": "Welding and pipe collar replacement ongoing"},
        headers=officer_headers,
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "in_progress"

    # Step C: Resolve (Requires note)
    res_res = client.patch(
        f"/api/v1/complaints/{complaint_id}/status",
        json={"status": "resolved", "note": "Pipeline collar replaced, pressure tested, site cleaned"},
        headers=officer_headers,
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "resolved"

    # -------------------------------------------------------------
    # 5. Citizen Verifies & Rates 5 Stars
    # -------------------------------------------------------------
    feedback_res = client.post(
        f"/api/v1/complaints/{complaint_id}/feedback",
        json={
            "rating": 5,
            "comment": "Superb work. No more water leakage.",
            "confirmed_resolved": True,
        },
        headers=citizen_headers,
    )
    assert feedback_res.status_code == 200

    # Verify status changed to citizen_verified
    detail_res = client.get(f"/api/v1/complaints/{complaint_id}", headers=citizen_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["status"] == "citizen_verified"
    assert detail["feedback"] is not None
    assert detail["feedback"]["rating"] == 5
    assert detail["verified_at"] is not None

    # -------------------------------------------------------------
    # 6. Gov Admin Governance Overview telemetry reflects resolution
    # -------------------------------------------------------------
    kpi_res = client.get("/api/v1/analytics/kpi", headers=gov_headers)
    assert kpi_res.status_code == 200
    kpi_data = kpi_res.json()
    assert kpi_data["total_complaints"] > 0
    assert kpi_data["resolved_complaints"] > 0
    assert kpi_data["citizen_verified_rate"] > 0

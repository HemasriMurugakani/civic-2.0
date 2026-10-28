import pytest
from datetime import datetime, timedelta
from sqlalchemy import desc
from app.services.duplicate_service import DuplicateDetectionService
from app.schemas.duplicate import DuplicateCheckRequest
from app.models.entities import Complaint, ComplaintStatus, ComplaintPriority, ComplaintCluster

def test_multilingual_semantic_embedding_generation(db_session):
    svc = DuplicateDetectionService(db_session)

    # English & Tamil descriptions of the same issue
    en_text = "Drinking water pipeline burst near vegetable market, heavy leakage on road"
    ta_text = "காய்கறி சந்தை அருகே குடிநீர் குழாய் உடைந்து சாலையில் பெருமளவு நீர் வீணாகிறது"
    unrelated_text = "Fallen tree branch blocking walkway in public park"

    vec_en = svc.encode_text(en_text)
    vec_ta = svc.encode_text(ta_text)
    vec_unrelated = svc.encode_text(unrelated_text)

    assert len(vec_en) == 384
    assert len(vec_ta) == 384

    # Dot product of normalized vectors = Cosine similarity
    sim_bilingual = float(vec_en @ vec_ta)
    sim_unrelated = float(vec_en @ vec_unrelated)

    # Bilingual matching issue should have higher similarity than unrelated issue
    assert sim_bilingual > sim_unrelated
    assert sim_bilingual > 0.25


def test_spatial_distance_and_penalty(db_session):
    svc = DuplicateDetectionService(db_session)

    # Royapuram coordinates
    lat1, lon1 = 13.1110, 80.2970
    # 80 meters away on same street
    lat2, lon2 = 13.1117, 80.2972
    # Madurai coordinates (~420 km away)
    lat3, lon3 = 9.9252, 78.1198

    dist_near = svc.haversine_meters(lat1, lon1, lat2, lon2)
    dist_far = svc.haversine_meters(lat1, lon1, lat3, lon3)

    assert dist_near < 120.0
    assert dist_far > 400000.0

    score_near = svc.compute_spatial_score(dist_near, same_ward=True)
    score_far = svc.compute_spatial_score(dist_far, same_ward=False)

    assert score_near >= 0.85
    assert score_far == 0.0


def test_check_duplicate_live_matching(db_session):
    svc = DuplicateDetectionService(db_session)

    # Find a recent open complaint in the database
    existing = (
        db_session.query(Complaint)
        .filter(Complaint.status == ComplaintStatus.SUBMITTED)
        .order_by(desc(Complaint.created_at))
        .first()
    )
    assert existing is not None

    # Query with a paraphrased version of the same issue in the same ward and location
    req = DuplicateCheckRequest(
        title=f"Reported issue: {existing.title}",
        description=existing.description,
        ward_id=existing.ward_id,
        category_id=existing.category_id,
        latitude=existing.latitude,
        longitude=existing.longitude,
        threshold=0.60,
        limit=5,
    )

    response = svc.check_duplicate(req)
    assert response.candidates_count > 0
    assert response.highest_score >= 0.60

    # The existing complaint should appear in top candidates
    matched_ids = [c.complaint_id for c in response.candidates]
    assert existing.id in matched_ids


def test_cluster_merging(db_session):
    svc = DuplicateDetectionService(db_session)

    complaints = (
        db_session.query(Complaint)
        .filter(Complaint.status == ComplaintStatus.SUBMITTED)
        .limit(3)
        .all()
    )
    if len(complaints) < 3:
        pytest.skip("Not enough complaints to test clustering")

    master = complaints[0]
    duplicates = [c.id for c in complaints[1:]]

    result = svc.merge_into_cluster(
        master_complaint_id=master.id,
        duplicate_ids=duplicates,
        reason="Test duplicate batch merge"
    )

    assert result["master_complaint_id"] == master.id
    assert result["merged_count"] == len(duplicates)
    assert result["total_cluster_complaints"] >= 3

    # Check cluster in database
    cluster = db_session.query(ComplaintCluster).filter(ComplaintCluster.id == result["cluster_id"]).first()
    assert cluster is not None
    assert cluster.ward_id == master.ward_id


def test_public_check_duplicate_api_endpoint(db_session):
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    recent = (
        db_session.query(Complaint)
        .filter(Complaint.status == ComplaintStatus.SUBMITTED)
        .order_by(desc(Complaint.created_at))
        .first()
    )
    assert recent is not None

    payload = {
        "title": recent.title,
        "description": recent.description,
        "ward_id": recent.ward_id,
        "category_id": recent.category_id,
        "latitude": recent.latitude,
        "longitude": recent.longitude,
        "threshold": 0.50,
        "limit": 3
    }

    res = client.post("/api/v1/public/issues/check-duplicate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "is_duplicate_likely" in data
    assert "candidates" in data
    assert data["candidates_count"] > 0


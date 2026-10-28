import pytest
from app.services.priority_service import PriorityPredictionService
from app.schemas.priority import PriorityPredictionRequest
from app.models.entities import Complaint, ComplaintStatus, ComplaintPriority, AIPrediction

def test_critical_hazard_detection_english(db_session):
    svc = PriorityPredictionService(db_session)
    req = PriorityPredictionRequest(
        title="Dangling live electric wire sparking near primary school gate",
        description="Live high voltage wire fell on the road. Children walking past, extreme danger of electrocution.",
        location_text="Anna Salai, Royapuram"
    )
    res = svc.predict_priority(req)

    assert res.recommended_priority == "CRITICAL"
    assert res.urgency_score >= 0.80
    assert res.sla_multiplier == 0.25
    assert res.sla_recommended_hours <= 12
    assert any("wire" in h.lower() or "electric" in h.lower() for h in res.hazard_signals)


def test_critical_hazard_detection_tamil(db_session):
    svc = PriorityPredictionService(db_session)
    req = PriorityPredictionRequest(
        title="பள்ளி அருகே மின் கம்பி அறுந்து விழுந்து தீப்பொறி பறக்கிறது",
        description="சாலையில் திறந்த நிலையில் உள்ள மின்சாரம் பாயும் கம்பி. பொதுமக்கள் குழந்தைகள் மீது படும் அபாயம்.",
    )
    res = svc.predict_priority(req)

    assert res.recommended_priority == "CRITICAL"
    assert res.urgency_score >= 0.75
    assert res.sla_multiplier == 0.25


def test_open_manhole_hazard_detection(db_session):
    svc = PriorityPredictionService(db_session)
    req = PriorityPredictionRequest(
        title="Open manhole chamber on waterlogged street",
        description="Deep sewage pit uncovered without warning sign or barricade.",
    )
    res = svc.predict_priority(req)

    assert res.recommended_priority == "CRITICAL"
    assert any("manhole" in h.lower() for h in res.hazard_signals)


def test_high_priority_detection(db_session):
    svc = PriorityPredictionService(db_session)
    req = PriorityPredictionRequest(
        title="Severe monsoon flood water entering houses",
        description="Entire colony waterlogged knee deep, power cut for 2 days.",
    )
    res = svc.predict_priority(req)

    assert res.recommended_priority in ["HIGH", "CRITICAL"]
    assert res.urgency_score >= 0.60


def test_low_priority_detection(db_session):
    svc = PriorityPredictionService(db_session)
    req = PriorityPredictionRequest(
        title="Spelling mistake on municipal ward signboard",
        description="Minor typo on street name board. Requesting repainting.",
    )
    res = svc.predict_priority(req)

    assert res.recommended_priority in ["LOW", "MEDIUM"]
    assert res.urgency_score < 0.50
    assert res.sla_multiplier >= 1.0


def test_ai_insights_endpoint(db_session):
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    # Public endpoint
    payload = {
        "title": "Sparking transformer near hospital ambulance entrance",
        "description": "Continuous sparks and smoke from distribution box."
    }
    res = client.post("/api/v1/public/issues/predict-priority", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["recommended_priority"] == "CRITICAL"
    assert data["urgency_score"] >= 0.80
    assert len(data["hazard_signals"]) > 0


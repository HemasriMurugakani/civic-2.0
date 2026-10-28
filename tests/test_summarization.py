import re
import pytest
from datetime import datetime, timedelta
from app.services.summarization_service import SummarizationService
from app.services.ai_gateway import LocalMultilingualAIProvider
from app.schemas.summary import ExecutiveSummaryResponse
from app.models.entities import (
    Complaint, ComplaintStatus, ComplaintPriority, ComplaintChannel,
    ComplaintStatusHistory, ComplaintComment, AIPrediction, User, Ward, ComplaintCategory
)

def test_summarize_existing_complaint_english(db_session):
    # Find or use an existing complaint
    complaint = db_session.query(Complaint).first()
    assert complaint is not None, "At least one complaint must exist in DB for testing"

    svc = SummarizationService(db_session)
    res = svc.summarize_complaint(complaint.id, language="en")

    assert isinstance(res, ExecutiveSummaryResponse)
    assert res.complaint_id == complaint.id
    assert res.language == "en"
    assert res.model_name == "NammaNagar-Executive-Summarizer-V1"
    assert len(res.headline) > 5

    # Check 2-sentence executive summary constraint
    # Sentences end with '.'
    sentences = [s.strip() for s in res.summary.split(".") if s.strip()]
    assert len(sentences) == 2, f"Summary must be exactly 2 sentences, got {len(sentences)}: '{res.summary}'"

    # Verify actionable next steps
    assert isinstance(res.action_items, list)
    assert len(res.action_items) >= 1
    for item in res.action_items:
        assert len(item) > 5

    # Verify key entities
    assert "department" in res.key_entities
    assert "ward" in res.key_entities
    assert "status" in res.key_entities
    assert "assigned_officer" in res.key_entities
    assert "sla_status" in res.key_entities

    # Verify AIPrediction logged
    pred = (
        db_session.query(AIPrediction)
        .filter(AIPrediction.complaint_id == complaint.id, AIPrediction.task == "summarize")
        .order_by(AIPrediction.created_at.desc())
        .first()
    )
    assert pred is not None
    assert pred.model_name == "NammaNagar-Executive-Summarizer-V1"


def test_summarize_complaint_tamil(db_session):
    complaint = db_session.query(Complaint).first()
    assert complaint is not None

    svc = SummarizationService(db_session)
    res = svc.summarize_complaint(complaint.id, language="ta")

    assert isinstance(res, ExecutiveSummaryResponse)
    assert res.language == "ta"

    # Check presence of Tamil characters in summary
    tamil_regex = re.compile(r"[\u0B80-\u0BFF]")
    assert tamil_regex.search(res.summary) is not None, "Tamil summary must contain Tamil script"

    # Sentences split by '.' or '|'
    sentences = [s.strip() for s in res.summary.split(".") if s.strip()]
    assert len(sentences) == 2, f"Tamil summary must be exactly 2 sentences, got {len(sentences)}: '{res.summary}'"

    # Check action items in Tamil
    assert len(res.action_items) >= 1
    assert any(tamil_regex.search(item) for item in res.action_items), "Action items must include Tamil text"


def test_summarize_operational_progress_reflection(db_session):
    # Create or update a test complaint with history notes
    complaint = db_session.query(Complaint).first()
    assert complaint is not None

    # Add a mock progress note
    test_note = "Field engineering team completed pipeline pressure test and patched leakage"
    hist = ComplaintStatusHistory(
        complaint_id=complaint.id,
        from_status=ComplaintStatus.ASSIGNED,
        to_status=ComplaintStatus.IN_PROGRESS,
        actor_id=None,
        note=test_note,
        timestamp=datetime.utcnow()
    )
    db_session.add(hist)
    db_session.commit()

    svc = SummarizationService(db_session)
    res = svc.summarize_complaint(complaint.id, language="en")

    # Clean up test note
    db_session.delete(hist)
    db_session.commit()

    assert "pipeline pressure test" in res.summary.lower() or "rectification" in res.summary.lower() or "field" in res.summary.lower()


def test_ai_gateway_summarize_integration(db_session):
    complaint = db_session.query(Complaint).first()
    assert complaint is not None

    provider = LocalMultilingualAIProvider()
    data = provider.summarize(complaint.id, db=db_session, language="en")

    assert isinstance(data, dict)
    assert data["status"] == "ready"
    assert "summary" in data
    assert "action_items" in data
    assert "key_entities" in data
    assert data["complaint_id"] == complaint.id


def test_summarize_non_existent_raises(db_session):
    svc = SummarizationService(db_session)
    with pytest.raises(ValueError, match="not found"):
        svc.summarize_complaint(complaint_id=99999999)


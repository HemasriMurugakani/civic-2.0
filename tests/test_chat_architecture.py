import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.entities import (
    User, UserRole, ChatSession, ChatMessage,
    Complaint, Ward, SLARule
)
from app.repositories.user_repo import UserRepository
from app.services.chat_service import ChatService
from app.schemas.chat import ChatRequest


@pytest.fixture
def client():
    return TestClient(app)


def test_persona_capabilities(db_session):
    service = ChatService(db_session)
    capabilities = service.get_persona_capabilities()
    
    assert len(capabilities) == 3
    codes = [c.code for c in capabilities]
    assert "citizen" in codes
    assert "officer" in codes
    assert "gov_admin" in codes

    citizen_cap = next(c for c in capabilities if c.code == "citizen")
    assert citizen_cap.name == "Namma Civic Assistant"
    assert citizen_cap.name_ta == "நம்ம உதவி உதவியாளர்"
    assert len(citizen_cap.sample_prompts) > 0


def test_persona_resolution(db_session):
    service = ChatService(db_session)
    user_repo = UserRepository(db_session)

    # 1. Anonymous visitor
    assert service._resolve_persona(None) == "citizen"

    # 2. Citizen user
    citizen = user_repo.get_by_email("citizen1@tngov.in")
    assert citizen is not None
    assert service._resolve_persona(citizen) == "citizen"

    # 3. Officer user
    officer = user_repo.get_by_email("officer.san1@tngov.in")
    assert officer is not None
    assert service._resolve_persona(officer) == "officer"

    # 4. Department admin
    dept_admin = user_repo.get_by_email("admin.sanitation@tngov.in")
    assert dept_admin is not None
    assert service._resolve_persona(dept_admin) == "gov_admin"

    # 5. Government admin
    gov_admin = user_repo.get_by_email("govadmin@tngov.in")
    assert gov_admin is not None
    assert service._resolve_persona(gov_admin) == "gov_admin"


def test_chat_session_lifecycle(db_session):
    service = ChatService(db_session)

    # 1. Create session
    session = service.get_or_create_session(language="en")
    assert session is not None
    assert session.session_uuid is not None
    assert session.persona == "citizen"
    assert session.language == "en"

    # 2. Retrieve session by UUID
    retrieved = service.get_session_by_uuid(session.session_uuid)
    assert retrieved is not None
    assert retrieved.id == session.id

    # 3. Reuse session with updated metadata
    updated = service.get_or_create_session(
        session_uuid=session.session_uuid,
        language="ta",
        active_context={"route": "/issues"}
    )
    assert updated.id == session.id
    assert updated.language == "ta"
    assert updated.context_metadata == {"route": "/issues"}

    # 4. Delete session
    deleted = service.delete_session(session.session_uuid)
    assert deleted is True

    # 5. Confirm deletion
    assert service.get_session_by_uuid(session.session_uuid) is None

    # 6. Delete nonexistent session returns False
    assert service.delete_session("non-existent-uuid-12345") is False


def test_chat_session_ownership_rbac(db_session):
    service = ChatService(db_session)
    user_repo = UserRepository(db_session)

    citizen1 = user_repo.get_by_email("citizen1@tngov.in")
    citizen2 = user_repo.get_by_email("citizen2@tngov.in")
    gov_admin = user_repo.get_by_email("govadmin@tngov.in")

    # Create session owned by citizen1
    session = service.get_or_create_session(user=citizen1)
    assert session.user_id == citizen1.id

    # citizen2 attempts to delete citizen1's session -> denied
    denied = service.delete_session(session.session_uuid, user=citizen2)
    assert denied is False
    assert service.get_session_by_uuid(session.session_uuid) is not None

    # gov_admin can delete any session -> allowed
    allowed = service.delete_session(session.session_uuid, user=gov_admin)
    assert allowed is True
    assert service.get_session_by_uuid(session.session_uuid) is None


def test_intent_detection_and_classification(db_session):
    service = ChatService(db_session)

    # Citizen intents
    assert service._detect_intent("Track GOV-2026-000101", "citizen") == "track_complaint"
    assert service._detect_intent("What is the status of my complaint?", "citizen") == "track_complaint"
    assert service._detect_intent("How do I report a pothole on my street?", "citizen") == "file_complaint"
    assert service._detect_intent("What is the SLA turnaround for garbage overflow?", "citizen") == "sla_turnaround"
    assert service._detect_intent("Who is the nodal officer for Ward 51?", "citizen") == "ward_info"
    assert service._detect_intent("How can our resident group adopt a neighborhood park?", "citizen") == "spot_adoption"
    assert service._detect_intent("Are there active monsoon preparedness campaigns?", "citizen") == "campaign_info"

    # Officer intents
    assert service._detect_intent("Show my pending complaints approaching SLA breach", "officer") == "officer_triage"
    assert service._detect_intent("Draft an official resolution inspection note", "officer") == "draft_resolution"
    assert service._detect_intent("City-wide resolution rate and bottlenecks", "gov_admin") == "governance_kpi"

    # Default fallback
    assert service._detect_intent("Good morning, what services do you offer?", "citizen") == "general_qa"


def test_track_complaint_grounding(db_session):
    service = ChatService(db_session)

    # Fetch an actual complaint from seed database
    sample_complaint = db_session.query(Complaint).first()
    assert sample_complaint is not None
    ref_no = sample_complaint.reference_no

    request = ChatRequest(message=f"Track complaint {ref_no}", language="en")
    response = service.process_message(request)

    assert response.intent == "track_complaint"
    assert ref_no in response.reply_text
    assert sample_complaint.title in response.reply_text
    assert len(response.citations) > 0
    assert response.citations[0].source_type == "complaint"
    assert response.citations[0].reference_id == ref_no
    assert any(c.action_type == "navigate" for c in response.suggested_actions)

    # Clean up test session
    service.delete_session(response.session_uuid)


def test_track_complaint_not_found(db_session):
    service = ChatService(db_session)

    request = ChatRequest(message="Track complaint GOV-2026-999999", language="en")
    response = service.process_message(request)

    assert response.intent == "track_complaint"
    assert "could not find a record" in response.reply_text
    assert any(c.payload.get("path") == "/track" for c in response.suggested_actions)

    # Clean up
    service.delete_session(response.session_uuid)


def test_ward_info_grounding(db_session):
    service = ChatService(db_session)

    request = ChatRequest(message="Tell me about Ward 51 and the nodal officer", language="en")
    response = service.process_message(request)

    assert response.intent == "ward_info"
    assert "Ward 51" in response.reply_text
    assert "Greater Chennai Corporation" in response.reply_text
    assert len(response.citations) > 0
    assert response.citations[0].source_type == "ward"
    assert any("report?ward=51" in c.payload.get("path", "") for c in response.suggested_actions)

    # Clean up
    service.delete_session(response.session_uuid)


def test_sla_turnaround_grounding(db_session):
    service = ChatService(db_session)

    request = ChatRequest(message="What is the SLA turnaround for garbage overflow?", language="en")
    response = service.process_message(request)

    assert response.intent == "sla_turnaround"
    assert "Tamil Nadu Civic SLA" in response.reply_text or "Citizen Charter" in response.reply_text
    assert len(response.citations) > 0
    assert response.citations[0].source_type == "sla_rule"

    # Clean up
    service.delete_session(response.session_uuid)


def test_officer_triage_authorized(db_session):
    service = ChatService(db_session)
    user_repo = UserRepository(db_session)

    officer = user_repo.get_by_email("officer.san1@tngov.in")
    assert officer is not None

    request = ChatRequest(message="Show my pending complaints approaching SLA breach", language="en")
    response = service.process_message(request, user=officer)

    assert response.persona == "officer"
    assert response.intent == "officer_triage"
    assert "Officer Workbench Triage Summary" in response.reply_text
    assert len(response.citations) > 0
    assert any(c.payload.get("path") == "/officer" for c in response.suggested_actions)

    # Clean up
    service.delete_session(response.session_uuid)


def test_officer_triage_unauthorized_citizen(db_session):
    service = ChatService(db_session)
    user_repo = UserRepository(db_session)

    citizen = user_repo.get_by_email("citizen1@tngov.in")
    assert citizen is not None

    request = ChatRequest(message="Show my pending complaints approaching SLA breach", language="en")
    response = service.process_message(request, user=citizen)

    # Citizen is blocked from officer triage operations
    assert "Officer triage operations require an authorized nodal officer" in response.reply_text
    assert len(response.citations) == 0

    # Clean up
    service.delete_session(response.session_uuid)


def test_draft_resolution_officer(db_session):
    service = ChatService(db_session)
    user_repo = UserRepository(db_session)

    officer = user_repo.get_by_email("officer.san1@tngov.in")
    request = ChatRequest(message="Draft an official resolution inspection note", language="en")
    response = service.process_message(request, user=officer)

    assert response.intent == "draft_resolution"
    assert "Tamil Nadu Municipal Engineering Standards" in response.reply_text
    assert any(c.action_type == "copy_draft" for c in response.suggested_actions)

    # Clean up
    service.delete_session(response.session_uuid)


def test_bilingual_tamil_interaction(db_session):
    service = ChatService(db_session)

    # 1. General greeting in Tamil
    request_greet = ChatRequest(message="வணக்கம்", language="ta")
    res_greet = service.process_message(request_greet)
    assert "வணக்கம்" in res_greet.reply_text
    assert res_greet.language == "ta"
    assert any(c.label_ta is not None for c in res_greet.suggested_actions)
    service.delete_session(res_greet.session_uuid)

    # 2. File complaint procedure in Tamil
    request_file = ChatRequest(message="பொதுப் பிரச்சினை புகார் பதிவு செய்வது எப்படி", language="ta")
    res_file = service.process_message(request_file)
    assert res_file.intent == "file_complaint"
    assert "புகார்" in res_file.reply_text
    assert any(c.label_ta == "இப்போதே புகார் செய்" for c in res_file.suggested_actions)
    service.delete_session(res_file.session_uuid)


def test_chat_api_endpoints(client):
    # 1. GET /api/v1/chat/personas
    res_personas = client.get("/api/v1/chat/personas")
    assert res_personas.status_code == 200
    personas_data = res_personas.json()
    assert len(personas_data) == 3
    persona_codes = [p["code"] for p in personas_data]
    assert "citizen" in persona_codes
    assert "officer" in persona_codes
    assert "gov_admin" in persona_codes

    # 2. POST /api/v1/chat/message (new session)
    payload = {
        "message": "Hello, how do I report a pothole on my street?",
        "language": "en"
    }
    res_msg = client.post("/api/v1/chat/message", json=payload)
    assert res_msg.status_code == 200
    msg_data = res_msg.json()
    assert msg_data["intent"] == "file_complaint"
    assert "session_uuid" in msg_data
    session_uuid = msg_data["session_uuid"]
    assert len(msg_data["suggested_actions"]) > 0

    # 3. GET /api/v1/chat/sessions/{session_uuid}
    res_session = client.get(f"/api/v1/chat/sessions/{session_uuid}")
    assert res_session.status_code == 200
    session_data = res_session.json()
    assert session_data["session_uuid"] == session_uuid
    assert len(session_data["messages"]) >= 2  # user message and assistant message

    # 4. Continue existing session
    followup_payload = {
        "message": "What is the SLA turnaround for garbage overflow?",
        "session_uuid": session_uuid,
        "language": "en"
    }
    res_followup = client.post("/api/v1/chat/message", json=followup_payload)
    assert res_followup.status_code == 200
    followup_data = res_followup.json()
    assert followup_data["session_uuid"] == session_uuid
    assert followup_data["intent"] == "sla_turnaround"

    # 5. DELETE /api/v1/chat/sessions/{session_uuid}
    res_del = client.delete(f"/api/v1/chat/sessions/{session_uuid}")
    assert res_del.status_code == 200
    assert res_del.json()["success"] is True

    # 6. Verify deleted session is 404
    res_after = client.get(f"/api/v1/chat/sessions/{session_uuid}")
    assert res_after.status_code == 404

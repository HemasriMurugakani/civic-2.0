import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_access_token
from app.models.entities import (
    User, UserRole, LearningModule, ModuleLesson, QuizQuestion,
    UserModuleProgress, Certificate, PointsLedger, ModuleProgressStatus,
    ModuleDifficulty
)

client = TestClient(app)


@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="module")
def test_users(db: Session):
    citizen = db.query(User).filter(User.email == "edu_test_runner@tngov.in").first()
    if not citizen:
        citizen = User(
            name="Edu Test Runner",
            email="edu_test_runner@tngov.in",
            mobile="9840999888",
            hashed_password="dummy_hashed_password",
            role=UserRole.CITIZEN,
            public_id="cit-edu-test",
            public_display_name="Edu Test Runner",
            is_active=True,
        )
        db.add(citizen)
        db.commit()
        db.refresh(citizen)

    gov_admin = db.query(User).filter(User.role == UserRole.GOV_ADMIN).first()
    if not gov_admin:
        gov_admin = User(
            name="Test Gov Admin",
            email="edu_admin@tngov.in",
            mobile="9840999902",
            hashed_password="dummy_hashed_password",
            role=UserRole.GOV_ADMIN,
            public_id="adm-edu-01",
            public_display_name="Gov Admin",
            is_active=True,
        )
        db.add(gov_admin)
        db.commit()
        db.refresh(gov_admin)

    # Clean up prior test runs for citizen
    db.query(Certificate).filter(Certificate.user_id == citizen.id).delete()
    db.query(UserModuleProgress).filter(UserModuleProgress.user_id == citizen.id).delete()
    db.query(PointsLedger).filter(PointsLedger.user_id == citizen.id).delete()
    db.commit()

    citizen_token = create_access_token({"sub": str(citizen.id), "role": citizen.role.value})
    admin_token = create_access_token({"sub": str(gov_admin.id), "role": gov_admin.role.value})

    yield {
        "citizen": citizen,
        "gov_admin": gov_admin,
        "citizen_token": citizen_token,
        "admin_token": admin_token,
    }

    # Teardown
    db.query(Certificate).filter(Certificate.user_id == citizen.id).delete()
    db.query(UserModuleProgress).filter(UserModuleProgress.user_id == citizen.id).delete()
    db.query(PointsLedger).filter(PointsLedger.user_id == citizen.id).delete()
    db.commit()


def test_list_learning_modules(test_users):
    """Verify listing published civic learning modules with difficulty filter."""
    res = client.get("/api/v1/education/modules?language=en")
    assert res.status_code == 200
    modules = res.json()
    assert len(modules) >= 5
    assert all("lessons_count" in m for m in modules)
    assert all("quiz_questions_count" in m for m in modules)

    # Test filtering by difficulty
    res_beg = client.get("/api/v1/education/modules?difficulty=beginner")
    assert res_beg.status_code == 200
    beg_modules = res_beg.json()
    assert all(m["difficulty"] == "beginner" for m in beg_modules)


def test_get_module_detail_student_view(test_users):
    """Verify module detail returns lessons and questions without exposing correct answer indexes to student."""
    headers = {"Authorization": f"Bearer {test_users['citizen_token']}"}
    res = client.get("/api/v1/education/modules/understanding-municipal-budgets", headers=headers)
    assert res.status_code == 200
    detail = res.json()
    assert detail["slug"] == "understanding-municipal-budgets"
    assert len(detail["lessons"]) >= 3
    assert len(detail["quiz_questions"]) >= 3

    # Ensure student view doesn't expose correct_option_index
    for q in detail["quiz_questions"]:
        assert "options" in q
        assert "correct_option_index" not in q
        assert "explanation" not in q


def test_lesson_progression_and_completion(db: Session, test_users):
    """Verify completing lessons advances progress percentage and current_lesson_order."""
    module = db.query(LearningModule).filter(LearningModule.slug == "local-governance-structure").first()
    assert module is not None
    assert len(module.lessons) >= 2
    l1 = module.lessons[0]

    headers = {"Authorization": f"Bearer {test_users['citizen_token']}"}
    payload = {"lesson_id": l1.id}
    res = client.post(f"/api/v1/education/modules/{module.id}/lessons/complete", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert l1.id in data["completed_lesson_ids"]
    assert data["progress_percent"] > 0.0
    assert data["current_lesson_order"] >= 2


def test_quiz_submission_scoring_and_idempotent_rewards(db: Session, test_users):
    """Verify quiz scoring, answer explanations, points award idempotency, and certificate generation."""
    module = db.query(LearningModule).filter(LearningModule.slug == "right-to-information-rti").first()
    assert module is not None
    questions = module.quiz_questions
    assert len(questions) >= 3

    # Answer all correctly for 100% score
    correct_answers = {str(q.id): q.correct_option_index for q in questions}

    headers = {"Authorization": f"Bearer {test_users['citizen_token']}"}
    payload = {"answers": correct_answers}
    res = client.post(f"/api/v1/education/modules/{module.id}/quiz/submit", json=payload, headers=headers)
    assert res.status_code == 200
    result = res.json()

    assert result["score"] == 100.0
    assert result["passed"] is True
    assert result["points_awarded"] == module.points
    assert result["bonus_awarded"] == module.bonus_points
    assert result["certificate_code"] is not None
    assert result["certificate_code"].startswith("TN-CIVIC-")
    assert len(result["question_reviews"]) == len(questions)

    cert_code = result["certificate_code"]

    # Retake quiz with same perfect score - verify idempotency (no duplicate points awarded)
    res_retake = client.post(f"/api/v1/education/modules/{module.id}/quiz/submit", json=payload, headers=headers)
    assert res_retake.status_code == 200
    retake_result = res_retake.json()
    assert retake_result["points_awarded"] == 0  # Idempotent!
    assert retake_result["bonus_awarded"] == 0   # Idempotent!
    assert retake_result["certificate_code"] == cert_code


def test_certificate_pdf_generation_and_public_verification(test_users):
    """Verify PDF certificate can be downloaded and verified publicly."""
    headers = {"Authorization": f"Bearer {test_users['citizen_token']}"}
    res_my_certs = client.get("/api/v1/education/certificates/me", headers=headers)
    assert res_my_certs.status_code == 200
    certs = res_my_certs.json()
    assert len(certs) >= 1

    cert_code = certs[0]["certificate_code"]

    # Public verification
    res_verify = client.get(f"/api/v1/education/verify/{cert_code}")
    assert res_verify.status_code == 200
    v_data = res_verify.json()
    assert v_data["valid"] is True
    assert v_data["certificate_code"] == cert_code
    assert v_data["status"] == "VERIFIED_OFFICIAL"

    # PDF download
    res_pdf = client.get(f"/api/v1/education/certificates/{cert_code}/pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    # PDF starts with %PDF-
    assert res_pdf.content.startswith(b"%PDF-")
    assert len(res_pdf.content) > 1000


def test_learning_leaderboard_and_analytics():
    """Verify learning leaderboard and public education KPI analytics."""
    res_lb = client.get("/api/v1/education/leaderboard?limit=10")
    assert res_lb.status_code == 200
    lb = res_lb.json()
    assert len(lb) >= 1
    assert "modules_completed" in lb[0]
    assert "total_learning_points" in lb[0]
    assert "public_id" in lb[0]

    res_an = client.get("/api/v1/education/analytics")
    assert res_an.status_code == 200
    analytics = res_an.json()
    assert analytics["total_completions"] >= 1
    assert analytics["total_certificates_issued"] >= 1
    assert len(analytics["module_metrics"]) >= 5


def test_admin_module_management_and_rbac(db: Session, test_users):
    """Verify Government Admin can create module while Citizen is forbidden (403)."""
    import uuid
    unique_slug = f"ward-waste-{uuid.uuid4().hex[:6]}"
    payload = {
        "title": "Ward Level Waste Segregation Mastery",
        "slug": unique_slug,
        "summary": "Step by step training on source segregation, composting, and dry waste collection.",
        "difficulty": "beginner",
        "duration_minutes": 15,
        "points": 40,
        "bonus_points": 20,
        "display_order": 99,
        "language": "en",
        "is_published": True,
    }

    # Citizen attempt -> 403 Forbidden
    cit_headers = {"Authorization": f"Bearer {test_users['citizen_token']}"}
    res_forbidden = client.post("/api/v1/education/admin/modules", json=payload, headers=cit_headers)
    assert res_forbidden.status_code == 403

    # Admin attempt -> 200 OK
    adm_headers = {"Authorization": f"Bearer {test_users['admin_token']}"}
    res_created = client.post("/api/v1/education/admin/modules", json=payload, headers=adm_headers)
    assert res_created.status_code == 200
    created = res_created.json()
    assert created["slug"] == unique_slug

    # Add lesson to created module
    lesson_payload = {
        "title": "Wet vs Dry Waste Segregation at Source",
        "display_order": 1,
        "content_markdown": "Proper segregation guidelines for green and blue bins.",
        "duration_minutes": 5,
    }
    res_lesson = client.post(f"/api/v1/education/admin/modules/{created['id']}/lessons", json=lesson_payload, headers=adm_headers)
    assert res_lesson.status_code == 200

    # Cleanup created module
    db.query(LearningModule).filter(LearningModule.slug == unique_slug).delete()
    db.commit()

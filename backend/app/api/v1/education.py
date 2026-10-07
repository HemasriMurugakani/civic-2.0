from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, get_optional_current_user, require_roles
from app.models.entities import User, UserRole, ModuleDifficulty
from app.services.education_service import EducationService
from app.schemas.education import (
    LearningModuleListItem, LearningModuleDetail, LessonCompleteRequest,
    QuizSubmissionRequest, QuizSubmissionResult, CertificateResponse,
    PublicCertificateVerify, LearningLeaderboardEntry, EducationAnalytics,
    ModuleCreate, ModuleUpdate, LessonCreate, QuizQuestionCreate
)

router = APIRouter(prefix="/education", tags=["Civic Education"])


@router.get("/modules", response_model=List[LearningModuleListItem])
def list_modules(
    language: str = Query("en", description="Language filter: en or ta"),
    difficulty: Optional[ModuleDifficulty] = Query(None, description="beginner, intermediate, advanced"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """List published learning modules with personalized progress if authenticated."""
    service = EducationService(db)
    user_id = current_user.id if current_user else None
    return service.list_modules(user_id=user_id, language=language, difficulty=difficulty)


@router.get("/modules/{identifier}", response_model=LearningModuleDetail)
def get_module_detail(
    identifier: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve module lessons and quiz questions by slug or ID."""
    service = EducationService(db)
    user_id = current_user.id if current_user else None
    is_admin = bool(current_user and current_user.role in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN])
    return service.get_module(identifier=identifier, user_id=user_id, is_admin=is_admin)


@router.post("/modules/{module_id}/lessons/complete")
def complete_lesson(
    module_id: int,
    payload: LessonCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a lesson complete and track curriculum progress."""
    service = EducationService(db)
    return service.complete_lesson(
        user_id=current_user.id,
        module_id=module_id,
        lesson_id=payload.lesson_id
    )


@router.post("/modules/{module_id}/quiz/submit", response_model=QuizSubmissionResult)
def submit_quiz(
    module_id: int,
    payload: QuizSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit module quiz. Scores responses, awards civic points & bonuses,
    and generates verifiable certificate upon passing.
    """
    service = EducationService(db)
    return service.submit_quiz(
        user_id=current_user.id,
        module_id=module_id,
        answers=payload.answers
    )


@router.get("/certificates/me", response_model=List[CertificateResponse])
def get_my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all earned civic competency certificates for current citizen."""
    service = EducationService(db)
    return service.get_user_certificates(user_id=current_user.id)


@router.get("/certificates/{code}/pdf")
def download_certificate_pdf(
    code: str,
    db: Session = Depends(get_db),
):
    """Download official high-resolution PDF certificate."""
    service = EducationService(db)
    pdf_bytes = service.generate_certificate_pdf(certificate_code=code)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="TN_Civic_Certificate_{code}.pdf"',
            "Cache-Control": "public, max-age=3600"
        }
    )


@router.get("/verify/{code}", response_model=PublicCertificateVerify)
def verify_certificate(
    code: str,
    db: Session = Depends(get_db),
):
    """Public verification of credential authenticity."""
    service = EducationService(db)
    return service.verify_certificate(certificate_code=code)


@router.get("/leaderboard", response_model=List[LearningLeaderboardEntry])
def get_learning_leaderboard(
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Public civic learning leaderboard ranked by completed modules & learning points."""
    service = EducationService(db)
    return service.get_learning_leaderboard(limit=limit)


@router.get("/analytics", response_model=EducationAnalytics)
def get_education_analytics(
    db: Session = Depends(get_db),
):
    """Overall civic learning KPIs and module completion statistics."""
    service = EducationService(db)
    return service.get_education_analytics()


# Admin management endpoints
@router.post("/admin/modules", response_model=LearningModuleListItem)
def create_module(
    payload: ModuleCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new civic education module (Government Admin only)."""
    service = EducationService(db)
    m = service.create_module(payload)
    return service.get_module(str(m.id), is_admin=True)


@router.patch("/admin/modules/{module_id}", response_model=LearningModuleListItem)
def update_module(
    module_id: int,
    payload: ModuleUpdate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    """Update module details (Government Admin only)."""
    service = EducationService(db)
    service.update_module(module_id, payload)
    return service.get_module(str(module_id), is_admin=True)


@router.post("/admin/modules/{module_id}/lessons")
def add_lesson(
    module_id: int,
    payload: LessonCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    """Add a lesson to a module (Government Admin only)."""
    service = EducationService(db)
    return service.add_lesson(module_id, payload)


@router.post("/admin/modules/{module_id}/quiz")
def add_quiz_question(
    module_id: int,
    payload: QuizQuestionCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    """Add a quiz question to a module (Government Admin only)."""
    service = EducationService(db)
    return service.add_quiz_question(module_id, payload)

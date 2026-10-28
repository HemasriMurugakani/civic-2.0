from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_roles
from app.models.entities import (
    User, UserRole, ComplaintStatus, ComplaintPriority,
    EvidenceType, ComplaintEvidence
)
from app.repositories.complaint_repo import ComplaintRepository
from app.services.complaint_service import ComplaintService
from app.services.sla_service import SLAService
from app.services.storage import default_storage
from app.services.ai_gateway import ai_provider
from app.services.masking_service import MaskingService
from app.schemas.complaint import (
    ComplaintCreate, ComplaintListItem, ComplaintDetailResponse,
    ComplaintStatusUpdate, ComplaintAssignRequest, ComplaintReopenRequest,
    ComplaintEscalateRequest, ComplaintCommentCreate, ComplaintCommentResponse,
    ComplaintEvidenceResponse, CitizenFeedbackCreate, CitizenFeedbackResponse,
    StatusHistoryItem
)
from app.schemas.duplicate import DuplicateCheckRequest, DuplicateCheckResponse, ClusterMergeRequest
from app.services.duplicate_service import DuplicateDetectionService

router = APIRouter(prefix="/complaints", tags=["Complaints"])

def _mask_mobile(mobile: Optional[str]) -> str:
    if not mobile or len(mobile) < 10:
        return "98******21"
    return f"{mobile[:2]}******{mobile[-2:]}"

def _build_list_item(complaint, current_user: User) -> ComplaintListItem:
    sla_metrics = SLAService.calculate_sla_metrics(complaint)

    # Find active assigned officer
    assigned_officer_id = None
    assigned_officer_name = None
    for a in complaint.assignments:
        if a.is_active:
            assigned_officer_id = a.officer_id
            assigned_officer_name = a.officer.name if a.officer else None
            break

    # Role-based privacy masking
    is_own = (current_user.id == complaint.citizen_id)
    is_anon = bool(complaint.citizen and complaint.citizen.mobile == "9800000000")
    citizen_display = MaskingService.mask_name_by_role(
        complaint.citizen,
        viewer_role=current_user.role,
        is_anonymous=is_anon,
        is_own_record=is_own
    )
    masked_mobile = MaskingService.mask_mobile_by_role(
        complaint.citizen.mobile if complaint.citizen else None,
        viewer_role=current_user.role,
        is_anonymous=is_anon,
        is_own_record=is_own
    )

    return ComplaintListItem(
        id=complaint.id,
        reference_no=complaint.reference_no,
        citizen_id=complaint.citizen_id,
        citizen_name=citizen_display,
        citizen_mobile_masked=masked_mobile,
        category_id=complaint.category_id,
        category_name_en=complaint.category.name_en if complaint.category else "",
        category_name_ta=complaint.category.name_ta if complaint.category else "",
        department_id=complaint.category.department_id if complaint.category else 0,
        department_name_en=complaint.category.department.name_en if (complaint.category and complaint.category.department) else "",
        ward_id=complaint.ward_id,
        ward_name=complaint.ward.name if complaint.ward else "",
        ward_number=complaint.ward.ward_number if complaint.ward else 0,
        title=complaint.title,
        description=complaint.description,
        channel=complaint.channel,
        status=complaint.status,
        final_priority=complaint.final_priority,
        sla_deadline=complaint.sla_deadline,
        sla_hours_total=sla_metrics["sla_hours_total"],
        sla_status=sla_metrics["sla_status"],
        sla_remaining_hours=sla_metrics["sla_remaining_hours"],
        sla_elapsed_percentage=sla_metrics["sla_elapsed_percentage"],
        escalation_level=complaint.escalation_level,
        assigned_officer_id=assigned_officer_id,
        assigned_officer_name=assigned_officer_name,
        latitude=complaint.latitude,
        longitude=complaint.longitude,
        address_text=complaint.address_text,
        created_at=complaint.created_at,
        updated_at=complaint.updated_at,
        resolved_at=complaint.resolved_at,
        verified_at=complaint.verified_at,
    )

@router.get("", response_model=List[ComplaintListItem])
def list_complaints(
    status: Optional[ComplaintStatus] = None,
    priority: Optional[ComplaintPriority] = None,
    ward_id: Optional[int] = None,
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = ComplaintRepository(db)
    complaints, _ = repo.list_scoped(
        user=current_user,
        status=status,
        priority=priority,
        ward_id=ward_id,
        department_id=department_id,
        category_id=category_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
    return [_build_list_item(c, current_user) for c in complaints]

@router.post("", response_model=ComplaintListItem)
def create_complaint(
    payload: ComplaintCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ComplaintService(db)
    complaint = service.create_complaint(
        citizen=current_user,
        title=payload.title,
        description=payload.description,
        category_id=payload.category_id,
        ward_id=payload.ward_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        address_text=payload.address_text,
        channel=payload.channel,
    )
    return _build_list_item(complaint, current_user)

@router.get("/{complaint_id}", response_model=ComplaintDetailResponse)
def get_complaint_detail(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = ComplaintRepository(db)
    complaint = repo.get_scoped_by_id(complaint_id, current_user)
    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found or access denied",
        )

    base_item = _build_list_item(complaint, current_user)

    # History
    history_items = [
        StatusHistoryItem(
            id=h.id,
            from_status=h.from_status,
            to_status=h.to_status,
            actor_id=h.actor_id,
            actor_name=h.actor.name if h.actor else "System",
            actor_role=h.actor.role.value if h.actor else "system",
            note=h.note,
            timestamp=h.timestamp,
        )
        for h in complaint.status_history
    ]

    # Comments (filter internal comments if viewer is citizen)
    comments = []
    for c in complaint.comments:
        if c.is_internal and current_user.role == UserRole.CITIZEN:
            continue
        comments.append(
            ComplaintCommentResponse(
                id=c.id,
                complaint_id=c.complaint_id,
                user_id=c.user_id,
                user_name=c.user.name if c.user else "User",
                user_role=c.user.role if c.user else UserRole.CITIZEN,
                comment=c.comment,
                is_internal=c.is_internal,
                created_at=c.created_at,
            )
        )

    # Evidence
    evidence_items = [
        ComplaintEvidenceResponse(
            id=e.id,
            complaint_id=e.complaint_id,
            uploader_id=e.uploader_id,
            uploader_name=e.uploader.name if e.uploader else "User",
            evidence_type=e.evidence_type,
            file_path=e.file_path,
            file_name=e.file_name,
            file_size=e.file_size,
            mime_type=e.mime_type,
            created_at=e.created_at,
        )
        for e in complaint.evidence
    ]

    # Feedback
    feedback_item = None
    if complaint.feedback:
        feedback_item = CitizenFeedbackResponse(
            id=complaint.feedback.id,
            complaint_id=complaint.feedback.complaint_id,
            citizen_id=complaint.feedback.citizen_id,
            rating=complaint.feedback.rating,
            comment=complaint.feedback.comment,
            confirmed_resolved=complaint.feedback.confirmed_resolved,
            created_at=complaint.feedback.created_at,
        )

    return ComplaintDetailResponse(
        **base_item.model_dump(),
        history=history_items,
        comments=comments,
        evidence=evidence_items,
        feedback=feedback_item,
    )

@router.patch("/{complaint_id}/status", response_model=ComplaintListItem)
def update_complaint_status(
    complaint_id: int,
    payload: ComplaintStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ComplaintService(db)
    complaint = service.update_status(
        complaint_id=complaint_id,
        new_status=payload.status,
        actor=current_user,
        note=payload.note,
    )
    return _build_list_item(complaint, current_user)

@router.post("/{complaint_id}/reassign", response_model=ComplaintListItem)
def reassign_complaint(
    complaint_id: int,
    payload: ComplaintAssignRequest,
    current_user: User = Depends(require_roles(UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    service = ComplaintService(db)
    complaint = service.reassign_complaint(
        complaint_id=complaint_id,
        officer_id=payload.officer_id,
        current_user=current_user,
        note=payload.note,
    )
    return _build_list_item(complaint, current_user)

@router.post("/{complaint_id}/reopen", response_model=ComplaintListItem)
def reopen_complaint(
    complaint_id: int,
    payload: ComplaintReopenRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ComplaintService(db)
    complaint = service.reopen_complaint(
        complaint_id=complaint_id,
        citizen=current_user,
        reason=payload.reason,
    )
    return _build_list_item(complaint, current_user)

@router.post("/{reference_no}/escalate", response_model=ComplaintListItem)
def escalate_complaint(
    reference_no: str,
    payload: ComplaintEscalateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ComplaintService(db)
    complaint = service.escalate_complaint(
        reference_no=reference_no,
        current_user=current_user,
        reason=payload.reason,
    )
    return _build_list_item(complaint, current_user)

@router.post("/{complaint_id}/comments", response_model=ComplaintCommentResponse)
def add_comment(
    complaint_id: int,
    payload: ComplaintCommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ComplaintService(db)
    comment = service.add_comment(
        complaint_id=complaint_id,
        user=current_user,
        comment_text=payload.comment,
        is_internal=payload.is_internal,
    )
    return ComplaintCommentResponse(
        id=comment.id,
        complaint_id=comment.complaint_id,
        user_id=comment.user_id,
        user_name=current_user.name,
        user_role=current_user.role,
        comment=comment.comment,
        is_internal=comment.is_internal,
        created_at=comment.created_at,
    )

@router.post("/{complaint_id}/evidence", response_model=ComplaintEvidenceResponse)
def upload_evidence(
    complaint_id: int,
    evidence_type: EvidenceType = Form(EvidenceType.CITIZEN),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = ComplaintRepository(db)
    complaint = repo.get_scoped_by_id(complaint_id, current_user)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    rel_path, orig_name, size, mime = default_storage.save_file(file)

    evidence = ComplaintEvidence(
        complaint_id=complaint_id,
        uploader_id=current_user.id,
        evidence_type=evidence_type,
        file_path=rel_path,
        file_name=orig_name,
        file_size=size,
        mime_type=mime,
    )
    repo.add_evidence(evidence)

    return ComplaintEvidenceResponse(
        id=evidence.id,
        complaint_id=evidence.complaint_id,
        uploader_id=evidence.uploader_id,
        uploader_name=current_user.name,
        evidence_type=evidence.evidence_type,
        file_path=evidence.file_path,
        file_name=evidence.file_name,
        file_size=evidence.file_size,
        mime_type=evidence.mime_type,
        created_at=evidence.created_at,
    )

@router.post("/{complaint_id}/feedback", response_model=CitizenFeedbackResponse)
def submit_feedback(
    complaint_id: int,
    payload: CitizenFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = ComplaintService(db)
    feedback = service.add_feedback(
        complaint_id=complaint_id,
        citizen=current_user,
        rating=payload.rating,
        comment=payload.comment,
        confirmed_resolved=payload.confirmed_resolved,
    )
    return CitizenFeedbackResponse(
        id=feedback.id,
        complaint_id=feedback.complaint_id,
        citizen_id=feedback.citizen_id,
        rating=feedback.rating,
        comment=feedback.comment,
        confirmed_resolved=feedback.confirmed_resolved,
        created_at=feedback.created_at,
    )

# Section 7: Existing, clean AI seams returning status: not_available
@router.get("/{complaint_id}/ai-insights")
def get_ai_insights(
    complaint_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = ComplaintRepository(db)
    complaint = repo.get_scoped_by_id(complaint_id, current_user)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    return {
        "status": "not_available",
        "message": "AI insights module is scheduled for future release. Baseline rule-based classification active.",
        "insights": [],
    }

@router.get("/{complaint_id}/similar")
def get_similar_complaints(
    complaint_id: int,
    limit: int = Query(5, ge=1, le=20),
    threshold: float = Query(0.60, ge=0.0, le=1.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = ComplaintRepository(db)
    complaint = repo.get_scoped_by_id(complaint_id, current_user)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    svc = DuplicateDetectionService(db)
    items = svc.find_similar_complaints(complaint_id, limit=limit, threshold=threshold)
    return {
        "status": "ready",
        "complaint_id": complaint_id,
        "count": len(items),
        "items": items,
    }

@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
def check_duplicate_complaint(
    payload: DuplicateCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = DuplicateDetectionService(db)
    return svc.check_duplicate(payload)

@router.post("/merge-cluster")
def merge_complaints_into_cluster(
    payload: ClusterMergeRequest,
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    svc = DuplicateDetectionService(db)
    try:
        result = svc.merge_into_cluster(
            master_complaint_id=payload.master_complaint_id,
            duplicate_ids=payload.duplicate_complaint_ids,
            cluster_name=payload.cluster_name,
            reason=payload.reason,
        )
        return {"status": "success", "result": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

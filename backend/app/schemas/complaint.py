from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.entities import (
    ComplaintStatus, ComplaintPriority, ComplaintChannel,
    EvidenceType, UserRole
)

class ComplaintCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10, max_length=3000)
    category_id: int
    ward_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_text: Optional[str] = Field(None, max_length=500)
    channel: ComplaintChannel = ComplaintChannel.WEB

class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus
    note: Optional[str] = Field(None, max_length=1000)

class ComplaintAssignRequest(BaseModel):
    officer_id: int
    note: Optional[str] = None

class ComplaintEscalateRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=1000)

class ComplaintReopenRequest(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)

class ComplaintCommentCreate(BaseModel):
    comment: str = Field(..., min_length=1, max_length=2000)
    is_internal: bool = False

class ComplaintCommentResponse(BaseModel):
    id: int
    complaint_id: int
    user_id: int
    user_name: str
    user_role: UserRole
    comment: str
    is_internal: bool
    created_at: datetime

    class Config:
        from_attributes = True

class ComplaintEvidenceResponse(BaseModel):
    id: int
    complaint_id: int
    uploader_id: int
    uploader_name: Optional[str] = None
    evidence_type: EvidenceType
    file_path: str
    file_name: str
    file_size: int
    mime_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class CitizenFeedbackCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)
    confirmed_resolved: bool = True

class CitizenFeedbackResponse(BaseModel):
    id: int
    complaint_id: int
    citizen_id: int
    rating: int
    comment: Optional[str] = None
    confirmed_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True

class StatusHistoryItem(BaseModel):
    id: int
    from_status: Optional[str] = None
    to_status: str
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    note: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class ComplaintAssignmentResponse(BaseModel):
    id: int
    officer_id: int
    officer_name: str
    assigned_at: datetime
    is_active: bool

    class Config:
        from_attributes = True

class ComplaintListItem(BaseModel):
    id: int
    reference_no: str
    citizen_id: int
    citizen_name: Optional[str] = None
    citizen_mobile_masked: Optional[str] = None
    category_id: int
    category_name_en: str
    category_name_ta: str
    department_id: int
    department_name_en: str
    ward_id: int
    ward_name: str
    ward_number: int
    title: str
    description: str
    channel: ComplaintChannel
    status: ComplaintStatus
    final_priority: ComplaintPriority
    sla_deadline: datetime
    sla_hours_total: int
    sla_status: str  # "within_sla", "approaching", "breached"
    sla_remaining_hours: float
    sla_elapsed_percentage: float
    escalation_level: int
    assigned_officer_id: Optional[int] = None
    assigned_officer_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ComplaintDetailResponse(ComplaintListItem):
    history: List[StatusHistoryItem] = []
    comments: List[ComplaintCommentResponse] = []
    evidence: List[ComplaintEvidenceResponse] = []
    feedback: Optional[CitizenFeedbackResponse] = None

class PublicTrackResponse(BaseModel):
    reference_no: str
    title: str
    category_name_en: str
    category_name_ta: str
    department_name_en: str
    ward_name: str
    status: ComplaintStatus
    final_priority: ComplaintPriority
    created_at: datetime
    sla_deadline: datetime
    sla_status: str
    resolved_at: Optional[datetime] = None
    verified_at: Optional[datetime] = None
    history: List[StatusHistoryItem] = []

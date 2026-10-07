from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models.entities import ProjectStatus, ProjectSource


class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: str
    status: ProjectStatus = ProjectStatus.PLANNED
    source: ProjectSource = ProjectSource.LOCAL_TRACKING
    ward_id: Optional[int] = None
    department_id: Optional[int] = None
    district: Optional[str] = None
    constituency: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contractor: Optional[str] = None
    budget_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    progress_percent: float = Field(0.0, ge=0.0, le=100.0)
    external_id: Optional[str] = None
    source_url: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdatePayload(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    status: Optional[ProjectStatus] = None
    ward_id: Optional[int] = None
    department_id: Optional[int] = None
    district: Optional[str] = None
    constituency: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contractor: Optional[str] = None
    budget_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    source_url: Optional[str] = None


class ProjectUpdateItemCreate(BaseModel):
    note: str
    progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    photo_url: Optional[str] = None


class ProjectUpdateItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    author_id: int
    author_name: str
    author_role: str
    note: str
    progress_percent: Optional[float] = None
    photo_url: Optional[str] = None
    is_verified: bool
    created_at: datetime


class ProjectRatingCreate(BaseModel):
    transparency_score: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class ProjectListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    category: str
    status: ProjectStatus
    source: ProjectSource
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    district: Optional[str] = None
    constituency: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    contractor: Optional[str] = None
    budget_amount: Optional[float] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    progress_percent: float
    is_delayed: bool
    progress_lag_alert: bool
    time_elapsed_percent: Optional[float] = None
    linked_complaints_count: int = 0
    updates_count: int = 0
    followers_count: int = 0
    transparency_rating: float = 0.0
    ratings_count: int = 0
    last_synced_at: Optional[datetime] = None
    created_at: datetime


class ProjectDetailResponse(ProjectListItem):
    is_following: bool = False
    user_rating: Optional[int] = None
    updates: List[ProjectUpdateItemResponse] = []


class ProjectMapPoint(BaseModel):
    id: int
    title: str
    category: str
    status: ProjectStatus
    progress_percent: float
    latitude: float
    longitude: float
    budget_amount: Optional[float] = None
    district: Optional[str] = None


class ProjectSyncResponse(BaseModel):
    success: bool
    source_name: str
    records_ingested: int
    records_updated: int
    conflicts_detected: int
    message: str
    synced_at: datetime

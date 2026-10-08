from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models.entities import SpotType, SpotStatus, CareFrequency


class SpotBase(BaseModel):
    name: str
    spot_type: SpotType = SpotType.PARK
    description: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    district: str
    ward_id: Optional[int] = None
    department_id: Optional[int] = None
    photo_url: Optional[str] = None
    care_frequency: CareFrequency = CareFrequency.WEEKLY
    commitment_actions: List[str] = []
    max_missed_checkins: int = 3


class SpotCreate(SpotBase):
    pass


class SpotBulkCreate(BaseModel):
    spots: List[SpotCreate]


class SpotStatusUpdate(BaseModel):
    status: SpotStatus
    note: Optional[str] = None


class SpotAdoptRequest(BaseModel):
    commitment_actions: List[str] = Field(default_factory=lambda: ["Litter cleaning", "Plant care & watering", "Reporting damages"])
    care_frequency: CareFrequency = CareFrequency.WEEKLY


class SpotReleaseRequest(BaseModel):
    reason: Optional[str] = "Relinquished care voluntarily"


class SpotCheckinCreate(BaseModel):
    note: str
    photo_url: Optional[str] = None
    actions_completed: List[str] = Field(default_factory=list)


class SpotCheckinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spot_id: int
    user_id: int
    user_display_name: Optional[str] = None
    note: str
    photo_url: Optional[str] = None
    actions_completed: List[str] = []
    points_awarded: int
    created_at: datetime


class SpotAdoptionHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    spot_id: int
    user_id: int
    user_display_name: Optional[str] = None
    action: str
    reason: Optional[str] = None
    created_at: datetime


class SpotListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    spot_type: SpotType
    description: Optional[str] = None
    address: str
    latitude: float
    longitude: float
    district: str
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    department_id: Optional[int] = None
    department_name: Optional[str] = None
    status: SpotStatus
    adopted_by: Optional[int] = None
    adopter_name: Optional[str] = None
    adopted_at: Optional[datetime] = None
    care_frequency: CareFrequency
    commitment_actions: List[str] = []
    last_checkin_at: Optional[datetime] = None
    missed_checkins_count: int = 0
    photo_url: Optional[str] = None
    checkins_count: int = 0
    linked_complaints_count: int = 0
    created_at: datetime


class SpotDetail(SpotListItem):
    model_config = ConfigDict(from_attributes=True)

    checkins: List[SpotCheckinResponse] = []
    history: List[SpotAdoptionHistoryResponse] = []
    linked_complaints: List[Dict[str, Any]] = []


class SpotMapPoint(BaseModel):
    id: int
    name: str
    spot_type: SpotType
    latitude: float
    longitude: float
    status: SpotStatus
    address: str
    district: str
    ward_id: Optional[int] = None
    adopter_name: Optional[str] = None
    last_checkin_at: Optional[datetime] = None


class SpotSchedulerSummary(BaseModel):
    checked_spots_count: int
    reminders_sent: int
    auto_released_count: int
    details: List[str] = []

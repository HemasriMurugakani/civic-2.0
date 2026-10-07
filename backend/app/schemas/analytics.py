from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    complaint_id: Optional[int] = None
    event_type: str
    title: str
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationMarkRead(BaseModel):
    notification_ids: Optional[List[int]] = None  # None means mark all as read


# Analytics Schemas
class AnalyticsKPIData(BaseModel):
    total_complaints: int
    resolved_complaints: int
    pending_complaints: int
    critical_complaints: int
    sla_compliance_rate: float  # Percentage 0-100
    avg_resolution_hours: float
    avg_rating: float
    citizen_verified_rate: float
    # Trend comparison deltas vs previous period
    total_trend_delta: float
    resolved_trend_delta: float
    sla_trend_delta: float
    rating_trend_delta: float

class CategoryBreakdownItem(BaseModel):
    category_id: int
    name_en: str
    name_ta: str
    count: int
    resolved_count: int
    sla_breached_count: int
    avg_resolution_hours: float

class WardHotspotItem(BaseModel):
    ward_id: int
    ward_number: int
    ward_name: str
    centroid_lat: float
    centroid_lng: float
    total_complaints: int
    unresolved_count: int
    critical_count: int
    avg_resolution_days: float
    avg_rating: float
    sla_compliance_rate: float
    top_category: Optional[str] = None
    category_split: Dict[str, int] = {}

class OfficerWorkloadItem(BaseModel):
    officer_id: int
    officer_name: str
    department_id: int
    department_name: str
    active_complaints: int
    resolved_complaints: int
    overdue_complaints: int
    avg_resolution_hours: float

class DailyTrendItem(BaseModel):
    date: str
    created_count: int
    resolved_count: int

class LeaderboardDepartmentItem(BaseModel):
    department_id: int
    department_code: str
    department_name_en: str
    total_complaints: int
    resolved_complaints: int
    sla_compliance_rate: float
    avg_resolution_days: float
    avg_rating: float
    citizen_confirmed_rate: float

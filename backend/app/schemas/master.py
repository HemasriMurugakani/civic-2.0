from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.entities import ComplaintPriority, UserRole

class DepartmentBase(BaseModel):
    code: str
    name_en: str
    name_ta: str
    description: Optional[str] = None
    is_active: bool = True

class DepartmentCreate(DepartmentBase):
    pass

class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class WardBase(BaseModel):
    ward_number: int
    name: str
    centroid_lat: float
    centroid_lng: float
    population: int
    is_active: bool = True

class WardCreate(WardBase):
    pass

class WardResponse(WardBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CategoryBase(BaseModel):
    department_id: int
    code: str
    name_en: str
    name_ta: str
    sla_hours: int = 48
    default_priority: ComplaintPriority = ComplaintPriority.MEDIUM
    is_active: bool = True

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    department_name: Optional[str] = None

    class Config:
        from_attributes = True


class SLARuleBase(BaseModel):
    category_id: Optional[int] = None
    escalation_level: int = 1
    warning_threshold_pct: int = 70
    breach_action: str = "notify_and_escalate"
    notify_roles: str = "officer,dept_admin"
    is_active: bool = True

class SLARuleCreate(SLARuleBase):
    pass

class SLARuleResponse(SLARuleBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

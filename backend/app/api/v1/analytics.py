from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, require_roles
from app.models.entities import User, UserRole
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    AnalyticsKPIData, CategoryBreakdownItem, WardHotspotItem,
    OfficerWorkloadItem, DailyTrendItem, LeaderboardDepartmentItem
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/kpi", response_model=AnalyticsKPIData)
def get_kpis(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_kpi_summary(
        user=current_user,
        start_date=start_date,
        end_date=end_date,
        department_id=department_id,
    )

@router.get("/categories", response_model=List[CategoryBreakdownItem])
def get_category_analytics(
    department_id: Optional[int] = None,
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_category_breakdown(
        user=current_user,
        department_id=department_id,
        days=days,
    )

@router.get("/wards", response_model=List[WardHotspotItem])
def get_ward_hotspots(
    department_id: Optional[int] = None,
    days: int = Query(60, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_ward_hotspots(
        user=current_user,
        department_id=department_id,
        days=days,
    )

@router.get("/officers", response_model=List[OfficerWorkloadItem])
def get_officer_workloads(
    department_id: Optional[int] = None,
    current_user: User = Depends(require_roles(UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_officer_workload(
        user=current_user,
        department_id=department_id,
    )

@router.get("/trends", response_model=List[DailyTrendItem])
def get_daily_trends(
    days: int = Query(14, ge=7, le=90),
    department_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_daily_trends(
        user=current_user,
        days=days,
        department_id=department_id,
    )

@router.get("/leaderboard", response_model=List[LeaderboardDepartmentItem])
def get_department_leaderboard(
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    service = AnalyticsService(db)
    return service.get_department_leaderboard()

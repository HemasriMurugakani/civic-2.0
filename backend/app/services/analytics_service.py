from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.models.entities import User
from app.services.metrics_service import MetricsService


class AnalyticsService:
    """
    Adapter delegating to MetricsService (Single Source of Truth).
    Eliminates all duplicate analytics computation logic.
    """

    def __init__(self, db: Session):
        self.db = db
        self.metrics = MetricsService(db)

    def get_kpi_summary(
        self,
        user: User,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        department_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        return self.metrics.get_kpi_summary(
            user=user,
            start_date=start_date,
            end_date=end_date,
            department_id=department_id,
        )

    def get_category_breakdown(
        self,
        user: User,
        department_id: Optional[int] = None,
        days: int = 30,
    ) -> List[Dict[str, Any]]:
        return self.metrics.get_category_breakdown(
            user=user,
            department_id=department_id,
            days=days,
        )

    def get_ward_hotspots(
        self,
        user: User,
        department_id: Optional[int] = None,
        days: int = 60,
    ) -> List[Dict[str, Any]]:
        return self.metrics.get_ward_hotspots(
            user=user,
            department_id=department_id,
            days=days,
        )

    def get_officer_workload(
        self,
        user: User,
        department_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        return self.metrics.get_officer_workload(
            user=user,
            department_id=department_id,
        )

    def get_daily_trends(
        self,
        user: User,
        days: int = 14,
        department_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        return self.metrics.get_daily_trends(
            user=user,
            days=days,
            department_id=department_id,
        )

    def get_department_leaderboard(self, days: int = 90) -> List[Dict[str, Any]]:
        return self.metrics.get_department_leaderboard(days=days)

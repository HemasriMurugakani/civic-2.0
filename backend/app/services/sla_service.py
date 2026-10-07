from datetime import datetime, timedelta
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.entities import (
    Complaint, ComplaintStatus, UserRole, User, ComplaintAssignment
)
from app.services.notification_service import NotificationService
from app.core.config import settings

logger = logging.getLogger("civic.sla")

class SLAService:
    def __init__(self, db: Session):
        self.db = db
        self.notification_service = NotificationService(db)

    @staticmethod
    def calculate_sla_metrics(complaint: Complaint, now: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Calculates SLA status, remaining hours, and elapsed percentage.
        Elapsed % = ((now - created_at) / (sla_deadline - created_at)) * 100
        """
        now = now or datetime.utcnow()
        created_at = complaint.created_at
        deadline = complaint.sla_deadline

        total_seconds = max((deadline - created_at).total_seconds(), 1.0)
        elapsed_seconds = (now - created_at).total_seconds()
        remaining_seconds = (deadline - now).total_seconds()

        elapsed_pct = round((elapsed_seconds / total_seconds) * 100, 1)
        remaining_hours = round(remaining_seconds / 3600.0, 1)

        # Status: within_sla (< 70%), approaching (>= 70% and <= 100%), breached (> 100%)
        if complaint.status in [ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED]:
            # For resolved, compare resolved_at vs deadline
            res_time = complaint.resolved_at or now
            if res_time <= deadline:
                sla_status = "within_sla"
            else:
                sla_status = "breached"
        else:
            if elapsed_pct >= 100.0:
                sla_status = "breached"
            elif elapsed_pct >= settings.SLA_WARNING_PERCENTAGE:
                sla_status = "approaching"
            else:
                sla_status = "within_sla"

        return {
            "sla_status": sla_status,
            "sla_remaining_hours": remaining_hours,
            "sla_elapsed_percentage": max(elapsed_pct, 0.0),
            "sla_hours_total": int(round(total_seconds / 3600.0)),
        }

    def process_open_complaints_sla(self, now: Optional[datetime] = None) -> Dict[str, int]:
        """
        Evaluates SLA for all open complaints. Idempotent background job.
        """
        now = now or datetime.utcnow()
        open_statuses = [
            ComplaintStatus.SUBMITTED,
            ComplaintStatus.ASSIGNED,
            ComplaintStatus.ACKNOWLEDGED,
            ComplaintStatus.IN_PROGRESS,
            ComplaintStatus.REOPENED,
        ]

        open_complaints = self.db.query(Complaint).filter(
            Complaint.status.in_(open_statuses)
        ).all()

        results = {
            "checked": len(open_complaints),
            "warnings_emitted": 0,
            "breaches_level_1": 0,
            "breaches_level_2": 0,
        }

        for complaint in open_complaints:
            metrics = self.calculate_sla_metrics(complaint, now=now)
            status_calc = metrics["sla_status"]
            elapsed_pct = metrics["sla_elapsed_percentage"]

            # Active officer
            active_officer_id = None
            for assignment in complaint.assignments:
                if assignment.is_active:
                    active_officer_id = assignment.officer_id
                    break

            # 1. Warning approaching threshold (>= 70% and < 100%)
            if status_calc == "approaching" and active_officer_id:
                dedupe = f"sla:approaching:{complaint.id}"
                notif = self.notification_service.notify_user(
                    user_id=active_officer_id,
                    title="SLA Warning Approaching",
                    message=f"Complaint {complaint.reference_no} is at {elapsed_pct}% SLA. Deadline is approaching ({complaint.sla_deadline.strftime('%d %b %H:%M')}).",
                    event_type="sla_approaching",
                    dedupe_key=dedupe,
                    complaint_id=complaint.id,
                )
                if notif:
                    results["warnings_emitted"] += 1

            # 2. SLA Breach Level 1 (breached deadline)
            elif status_calc == "breached":
                if complaint.escalation_level < 1:
                    complaint.escalation_level = 1
                    complaint.updated_at = now
                    self.db.commit()

                # Notify officer
                if active_officer_id:
                    dedupe_officer = f"sla:breach:lvl1:officer:{complaint.id}"
                    notif = self.notification_service.notify_user(
                        user_id=active_officer_id,
                        title="⚠️ SLA Breach Notice",
                        message=f"Complaint {complaint.reference_no} has exceeded its SLA deadline. Escalated to Level 1.",
                        event_type="sla_breach_lvl1",
                        dedupe_key=dedupe_officer,
                        complaint_id=complaint.id,
                    )
                    if notif:
                        results["breaches_level_1"] += 1

                # Notify Dept Admins
                dept_admins = (
                    self.db.query(User)
                    .filter(
                        User.role == UserRole.DEPT_ADMIN,
                        User.department_id == complaint.category.department_id,
                    )
                    .all()
                )
                for admin in dept_admins:
                    dedupe_admin = f"sla:breach:lvl1:admin:{complaint.id}:{admin.id}"
                    self.notification_service.notify_user(
                        user_id=admin.id,
                        title="⚠️ SLA Breach in your Department",
                        message=f"Complaint {complaint.reference_no} has breached SLA. Action or reassignment required.",
                        event_type="sla_breach_lvl1",
                        dedupe_key=dedupe_admin,
                        complaint_id=complaint.id,
                    )

                # 3. SLA Breach Level 2 (24h past deadline or > 150% elapsed)
                second_threshold = complaint.sla_deadline + timedelta(
                    hours=settings.SLA_ESCALATION_LEVEL_2_HOURS
                )
                if now > second_threshold and complaint.escalation_level < 2:
                    complaint.escalation_level = 2
                    complaint.updated_at = now
                    self.db.commit()

                    # Escalate to Government Admins
                    gov_admins = self.db.query(User).filter(User.role == UserRole.GOV_ADMIN).all()
                    for g_admin in gov_admins:
                        dedupe_gov = f"sla:breach:lvl2:gov:{complaint.id}:{g_admin.id}"
                        notif = self.notification_service.notify_user(
                            user_id=g_admin.id,
                            title="🚨 Critical SLA Escalation (Level 2)",
                            message=f"Complaint {complaint.reference_no} is >{settings.SLA_ESCALATION_LEVEL_2_HOURS}h overdue. Escalated to Government Administrator.",
                            event_type="sla_breach_lvl2",
                            dedupe_key=dedupe_gov,
                            complaint_id=complaint.id,
                        )
                        if notif:
                            results["breaches_level_2"] += 1

        return results

from datetime import datetime, timedelta
import random
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.entities import (
    Complaint, ComplaintAssignment, ComplaintStatusHistory,
    ComplaintComment, ComplaintEvidence, CitizenFeedback,
    ComplaintCategory, User, UserRole, ComplaintStatus,
    ComplaintPriority, ComplaintChannel, EvidenceType
)
from app.repositories.complaint_repo import ComplaintRepository
from app.repositories.user_repo import UserRepository
from app.repositories.master_repo import MasterRepository
from app.services.notification_service import NotificationService

# Transition Table: allowed (from_status -> to_status) mapping to permitted roles
ALLOWED_TRANSITIONS: Dict[ComplaintStatus, Dict[ComplaintStatus, List[UserRole]]] = {
    ComplaintStatus.SUBMITTED: {
        ComplaintStatus.ASSIGNED: [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
        ComplaintStatus.ACKNOWLEDGED: [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
    },
    ComplaintStatus.ASSIGNED: {
        ComplaintStatus.ACKNOWLEDGED: [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
        ComplaintStatus.IN_PROGRESS: [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
    },
    ComplaintStatus.ACKNOWLEDGED: {
        ComplaintStatus.IN_PROGRESS: [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
        ComplaintStatus.RESOLVED: [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
    },
    ComplaintStatus.IN_PROGRESS: {
        ComplaintStatus.RESOLVED: [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
    },
    ComplaintStatus.RESOLVED: {
        ComplaintStatus.CITIZEN_VERIFIED: [UserRole.CITIZEN, UserRole.GOV_ADMIN],
        ComplaintStatus.REOPENED: [UserRole.CITIZEN, UserRole.GOV_ADMIN],
    },
    ComplaintStatus.REOPENED: {
        ComplaintStatus.ASSIGNED: [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
        ComplaintStatus.IN_PROGRESS: [UserRole.OFFICER, UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN],
    },
    ComplaintStatus.CITIZEN_VERIFIED: {
        # Terminal successful state
    },
}

class ComplaintService:
    def __init__(self, db: Session):
        self.db = db
        self.complaint_repo = ComplaintRepository(db)
        self.user_repo = UserRepository(db)
        self.master_repo = MasterRepository(db)
        self.notification_service = NotificationService(db)

    def _generate_reference_no(self) -> str:
        current_year = datetime.utcnow().year
        # Count complaints this year to form sequential reference number
        count = self.db.query(func.count(Complaint.id)).scalar() or 0
        seq = count + 1
        ref = f"GOV-{current_year}-{seq:06d}"
        # Ensure uniqueness
        while self.db.query(Complaint).filter(Complaint.reference_no == ref).first():
            seq += 1
            ref = f"GOV-{current_year}-{seq:06d}"
        return ref

    def create_complaint(
        self,
        citizen: User,
        title: str,
        description: str,
        category_id: int,
        ward_id: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        address_text: Optional[str] = None,
        channel: ComplaintChannel = ComplaintChannel.WEB,
    ) -> Complaint:
        category = self.master_repo.get_category_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Complaint category not found")

        ward = self.master_repo.get_ward_by_id(ward_id)
        if not ward:
            raise HTTPException(status_code=404, detail="Ward not found")

        reference_no = self._generate_reference_no()
        now = datetime.utcnow()
        sla_hours = category.sla_hours or 48
        sla_deadline = now + timedelta(hours=sla_hours)

        lat = latitude if latitude is not None else (ward.centroid_lat if ward else 13.0827)
        lng = longitude if longitude is not None else (ward.centroid_lng if ward else 80.2707)

        complaint = Complaint(
            reference_no=reference_no,
            citizen_id=citizen.id,
            category_id=category_id,
            ward_id=ward_id,
            title=title,
            description=description,
            latitude=lat,
            longitude=lng,
            address_text=address_text,
            channel=channel,
            status=ComplaintStatus.SUBMITTED,
            final_priority=category.default_priority or ComplaintPriority.MEDIUM,
            sla_deadline=sla_deadline,
            escalation_level=0,
            created_at=now,
            updated_at=now,
        )
        self.complaint_repo.create(complaint)

        # Initial history record
        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=None,
            to_status=ComplaintStatus.SUBMITTED.value,
            actor_id=citizen.id,
            note="Grievance submitted by citizen",
            timestamp=now,
        )
        self.complaint_repo.add_status_history(history)

        # Notify Citizen
        self.notification_service.notify_user(
            user_id=citizen.id,
            title="Complaint Filed Successfully",
            message=f"Your complaint '{title}' has been registered with reference {reference_no}. SLA deadline: {sla_deadline.strftime('%d %b %Y %H:%M')}",
            event_type="complaint_created",
            dedupe_key=f"created:{complaint.id}",
            complaint_id=complaint.id,
            recipient_contact=citizen.mobile,
        )

        # Gamification: Award points to citizen for report_submitted
        try:
            from app.services.gamification_service import GamificationService
            GamificationService(self.db).record_event(
                user_id=citizen.id,
                event_type="report_submitted",
                source_type="complaint",
                source_id=str(complaint.id),
            )
        except Exception:
            pass

        # Auto-assignment flow: find officer in department & ward with fewest open complaints
        best_officer_id = self.complaint_repo.find_best_officer_for_assignment(
            department_id=category.department_id,
            ward_id=ward_id,
        )

        if best_officer_id:
            self._assign_complaint_internal(
                complaint=complaint,
                officer_id=best_officer_id,
                assigned_by=None,  # System
                note="Auto-assigned based on workload and ward proximity",
            )
        else:
            # Notify department admin queue
            dept_admins = self.user_repo.list_users(role=UserRole.DEPT_ADMIN, department_id=category.department_id)
            for admin in dept_admins:
                self.notification_service.notify_user(
                    user_id=admin.id,
                    title="New Unassigned Complaint",
                    message=f"New complaint {reference_no} in Ward {ward.ward_number} requires assignment.",
                    event_type="unassigned_complaint",
                    dedupe_key=f"unassigned:{complaint.id}:{admin.id}",
                    complaint_id=complaint.id,
                )

        return complaint

    def _assign_complaint_internal(
        self,
        complaint: Complaint,
        officer_id: int,
        assigned_by: Optional[User],
        note: Optional[str] = None,
    ):
        officer = self.user_repo.get_by_id(officer_id)
        if not officer or officer.role != UserRole.OFFICER:
            raise HTTPException(status_code=400, detail="Target user is not an active officer")

        now = datetime.utcnow()
        assignment = ComplaintAssignment(
            complaint_id=complaint.id,
            officer_id=officer_id,
            assigned_by_id=assigned_by.id if assigned_by else None,
            assigned_at=now,
            is_active=True,
        )
        self.complaint_repo.add_assignment(assignment)

        # Update status if still submitted or reopened
        from_status = complaint.status
        complaint.status = ComplaintStatus.ASSIGNED
        complaint.updated_at = now
        self.complaint_repo.update(complaint)

        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=from_status.value if from_status else None,
            to_status=ComplaintStatus.ASSIGNED.value,
            actor_id=assigned_by.id if assigned_by else None,
            note=note or f"Assigned to Officer {officer.name}",
            timestamp=now,
        )
        self.complaint_repo.add_status_history(history)

        # Notify the assigned officer
        self.notification_service.notify_user(
            user_id=officer.id,
            title="New Grievance Assigned",
            message=f"Complaint {complaint.reference_no} ({complaint.title}) has been assigned to you.",
            event_type="complaint_assigned",
            dedupe_key=f"assigned:{complaint.id}:{officer.id}:{now.timestamp()}",
            complaint_id=complaint.id,
            recipient_contact=officer.mobile,
        )

    def reassign_complaint(
        self,
        complaint_id: int,
        officer_id: int,
        current_user: User,
        note: Optional[str] = None,
    ) -> Complaint:
        complaint = self.complaint_repo.get_scoped_by_id(complaint_id, current_user)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found or access denied")

        if current_user.role not in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            raise HTTPException(status_code=403, detail="Only Department or Government Admins can reassign")

        self._assign_complaint_internal(
            complaint=complaint,
            officer_id=officer_id,
            assigned_by=current_user,
            note=note or f"Reassigned by {current_user.name}",
        )
        return complaint

    def update_status(
        self,
        complaint_id: int,
        new_status: ComplaintStatus,
        actor: User,
        note: Optional[str] = None,
    ) -> Complaint:
        complaint = self.complaint_repo.get_scoped_by_id(complaint_id, actor)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found or access denied")

        current_status = complaint.status

        # If already at target status, return
        if current_status == new_status:
            return complaint

        # Validate legal transition in state machine
        allowed_targets = ALLOWED_TRANSITIONS.get(current_status, {})
        allowed_roles = allowed_targets.get(new_status, [])

        if not allowed_roles or actor.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Illegal transition: Cannot move complaint from '{current_status.value}' to '{new_status.value}' for role '{actor.role.value}'"
            )

        # Resolution requirement: note is mandatory
        if new_status == ComplaintStatus.RESOLVED:
            if not note or len(note.strip()) < 3:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A resolution note explaining the fix is mandatory when resolving a complaint"
                )

        now = datetime.utcnow()
        complaint.status = new_status
        complaint.updated_at = now

        if new_status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = now
        elif new_status == ComplaintStatus.CITIZEN_VERIFIED:
            complaint.verified_at = now

        self.complaint_repo.update(complaint)

        # Immutable history record
        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=current_status.value,
            to_status=new_status.value,
            actor_id=actor.id,
            note=note or f"Status changed to {new_status.value}",
            timestamp=now,
        )
        self.complaint_repo.add_status_history(history)

        # Notifications on status transition
        if new_status == ComplaintStatus.RESOLVED:
            # Notify citizen that complaint has been resolved and invite verification/rating
            self.notification_service.notify_user(
                user_id=complaint.citizen_id,
                title="Complaint Resolved",
                message=f"Your complaint {complaint.reference_no} has been marked resolved. Note: {note}. Please confirm or reopen.",
                event_type="complaint_resolved",
                dedupe_key=f"resolved:{complaint.id}:{now.timestamp()}",
                complaint_id=complaint.id,
                recipient_contact=complaint.citizen.mobile if complaint.citizen else None,
            )
        elif new_status == ComplaintStatus.CITIZEN_VERIFIED:
            # Gamification: award points for fix_confirmed
            try:
                from app.services.gamification_service import GamificationService
                GamificationService(self.db).record_event(
                    user_id=complaint.citizen_id,
                    event_type="fix_confirmed",
                    source_type="complaint",
                    source_id=str(complaint.id),
                )
            except Exception:
                pass

            # Notify officer and admin
            for assignment in complaint.assignments:
                if assignment.is_active:
                    self.notification_service.notify_user(
                        user_id=assignment.officer_id,
                        title="Citizen Confirmed Resolution",
                        message=f"Citizen confirmed resolution for {complaint.reference_no}.",
                        event_type="citizen_verified",
                        dedupe_key=f"verified:{complaint.id}:{now.timestamp()}",
                        complaint_id=complaint.id,
                    )

        return complaint

    def reopen_complaint(
        self,
        complaint_id: int,
        citizen: User,
        reason: str,
    ) -> Complaint:
        complaint = self.complaint_repo.get_scoped_by_id(complaint_id, citizen)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")

        if complaint.status != ComplaintStatus.RESOLVED:
            raise HTTPException(
                status_code=400,
                detail="Only resolved complaints can be reopened"
            )

        now = datetime.utcnow()
        from_status = complaint.status
        complaint.status = ComplaintStatus.REOPENED
        complaint.updated_at = now
        complaint.resolved_at = None
        self.complaint_repo.update(complaint)

        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=from_status.value,
            to_status=ComplaintStatus.REOPENED.value,
            actor_id=citizen.id,
            note=f"Reopened by citizen. Reason: {reason}",
            timestamp=now,
        )
        self.complaint_repo.add_status_history(history)

        # Notify assigned officer and department admin
        active_officer_id = None
        for assignment in complaint.assignments:
            if assignment.is_active:
                active_officer_id = assignment.officer_id
                self.notification_service.notify_user(
                    user_id=assignment.officer_id,
                    title="Complaint Reopened by Citizen",
                    message=f"Citizen reopened complaint {complaint.reference_no}. Reason: {reason}",
                    event_type="complaint_reopened",
                    dedupe_key=f"reopened:{complaint.id}:{now.timestamp()}",
                    complaint_id=complaint.id,
                )

        # Also auto-move back to ASSIGNED if officer is still active
        if active_officer_id:
            complaint.status = ComplaintStatus.ASSIGNED
            self.complaint_repo.update(complaint)
            hist_assign = ComplaintStatusHistory(
                complaint_id=complaint.id,
                from_status=ComplaintStatus.REOPENED.value,
                to_status=ComplaintStatus.ASSIGNED.value,
                actor_id=None,
                note="Re-routed to officer for re-investigation",
                timestamp=now + timedelta(seconds=1),
            )
            self.complaint_repo.add_status_history(hist_assign)

        return complaint

    def escalate_complaint(
        self,
        reference_no: str,
        current_user: User,
        reason: Optional[str] = None,
    ) -> Complaint:
        complaint = self.complaint_repo.get_scoped_by_reference_no(reference_no, current_user)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found or access denied")

        now = datetime.utcnow()
        complaint.escalation_level += 1
        complaint.updated_at = now
        self.complaint_repo.update(complaint)

        history = ComplaintStatusHistory(
            complaint_id=complaint.id,
            from_status=complaint.status.value,
            to_status=complaint.status.value,
            actor_id=current_user.id,
            note=f"Escalated to Level {complaint.escalation_level}. {reason or 'Citizen reported overdue issue.'}",
            timestamp=now,
        )
        self.complaint_repo.add_status_history(history)

        # Notify Department Admin
        dept_admins = self.user_repo.list_users(
            role=UserRole.DEPT_ADMIN,
            department_id=complaint.category.department_id
        )
        for admin in dept_admins:
            self.notification_service.notify_user(
                user_id=admin.id,
                title=f"Complaint Escalated (Level {complaint.escalation_level})",
                message=f"Complaint {complaint.reference_no} has been escalated by citizen. Reason: {reason or 'Overdue resolution'}",
                event_type="complaint_escalated",
                dedupe_key=f"escalate:{complaint.id}:lvl{complaint.escalation_level}:{admin.id}",
                complaint_id=complaint.id,
            )

        return complaint

    def add_feedback(
        self,
        complaint_id: int,
        citizen: User,
        rating: int,
        comment: Optional[str] = None,
        confirmed_resolved: bool = True,
    ) -> CitizenFeedback:
        complaint = self.complaint_repo.get_scoped_by_id(complaint_id, citizen)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")

        # Check existing feedback
        existing = self.db.query(CitizenFeedback).filter(
            CitizenFeedback.complaint_id == complaint_id
        ).first()
        if existing:
            existing.rating = rating
            existing.comment = comment
            existing.confirmed_resolved = confirmed_resolved
            self.db.commit()
            self.db.refresh(existing)
            feedback = existing
        else:
            feedback = CitizenFeedback(
                complaint_id=complaint_id,
                citizen_id=citizen.id,
                rating=rating,
                comment=comment,
                confirmed_resolved=confirmed_resolved,
            )
            self.complaint_repo.add_feedback(feedback)

        # If confirmed resolved, mark complaint verified
        if confirmed_resolved and complaint.status == ComplaintStatus.RESOLVED:
            self.update_status(
                complaint_id=complaint_id,
                new_status=ComplaintStatus.CITIZEN_VERIFIED,
                actor=citizen,
                note=f"Citizen verified resolution and rated {rating}/5 stars.",
            )

        return feedback

    def add_comment(
        self,
        complaint_id: int,
        user: User,
        comment_text: str,
        is_internal: bool = False,
    ) -> ComplaintComment:
        complaint = self.complaint_repo.get_scoped_by_id(complaint_id, user)
        if not complaint:
            raise HTTPException(status_code=404, detail="Complaint not found")

        # Citizens cannot post internal staff comments
        if is_internal and user.role == UserRole.CITIZEN:
            is_internal = False

        comment = ComplaintComment(
            complaint_id=complaint_id,
            user_id=user.id,
            comment=comment_text,
            is_internal=is_internal,
        )
        self.complaint_repo.add_comment(comment)

        # Cross notify
        now = datetime.utcnow()
        if user.role == UserRole.CITIZEN:
            # Notify active officer
            for assignment in complaint.assignments:
                if assignment.is_active:
                    self.notification_service.notify_user(
                        user_id=assignment.officer_id,
                        title=f"New Citizen Comment on {complaint.reference_no}",
                        message=comment_text[:100],
                        event_type="comment_added",
                        dedupe_key=f"comment:{comment.id}:{assignment.officer_id}",
                        complaint_id=complaint_id,
                    )
        elif not is_internal:
            # Staff commented publicly, notify citizen
            self.notification_service.notify_user(
                user_id=complaint.citizen_id,
                title=f"Update on your grievance {complaint.reference_no}",
                message=comment_text[:100],
                event_type="comment_added",
                dedupe_key=f"comment:{comment.id}:{complaint.citizen_id}",
                complaint_id=complaint_id,
            )

        return comment

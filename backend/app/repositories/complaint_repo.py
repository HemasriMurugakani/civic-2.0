from typing import Optional, List, Tuple
from datetime import datetime
from sqlalchemy.orm import Session, Query, joinedload
from sqlalchemy import or_, and_, func
from app.models.entities import (
    Complaint, ComplaintAssignment, ComplaintStatusHistory,
    ComplaintComment, ComplaintEvidence, CitizenFeedback,
    ComplaintCategory, User, UserRole, ComplaintStatus,
    ComplaintPriority
)

class ComplaintRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_scoped_query(self, user: User) -> Query:
        """
        Builds a base query strictly scoped to the user's role and departmental boundary.
        - Citizen: only complaints filed by themselves.
        - Officer: only complaints actively assigned to themselves.
        - Dept Admin: only complaints belonging to categories of their department.
        - Gov Admin: all complaints across the entire government.
        """
        query = self.db.query(Complaint)

        if user.role == UserRole.CITIZEN:
            query = query.filter(Complaint.citizen_id == user.id)

        elif user.role == UserRole.OFFICER:
            query = query.join(
                ComplaintAssignment,
                and_(
                    ComplaintAssignment.complaint_id == Complaint.id,
                    ComplaintAssignment.officer_id == user.id,
                    ComplaintAssignment.is_active == True,
                )
            )

        elif user.role == UserRole.DEPT_ADMIN:
            query = query.join(
                ComplaintCategory,
                ComplaintCategory.id == Complaint.category_id
            ).filter(
                ComplaintCategory.department_id == user.department_id
            )

        elif user.role == UserRole.GOV_ADMIN:
            # Full visibility across all departments and wards
            pass

        return query

    def get_scoped_by_id(self, complaint_id: int, user: User) -> Optional[Complaint]:
        """
        Fetches complaint by ID with strict repository-level role scoping.
        Returns None if user does not have permission to access the complaint.
        """
        return self.get_scoped_query(user).filter(Complaint.id == complaint_id).first()

    def get_scoped_by_reference_no(self, reference_no: str, user: User) -> Optional[Complaint]:
        return self.get_scoped_query(user).filter(Complaint.reference_no == reference_no).first()

    def get_public_by_reference_no(self, reference_no: str) -> Optional[Complaint]:
        """Public tracking lookup (anonymized in API response)."""
        return self.db.query(Complaint).filter(Complaint.reference_no == reference_no).first()

    def get_by_id_unscoped(self, complaint_id: int) -> Optional[Complaint]:
        """Internal lookup for system services like SLA engine."""
        return self.db.query(Complaint).filter(Complaint.id == complaint_id).first()

    def list_scoped(
        self,
        user: User,
        status: Optional[ComplaintStatus] = None,
        priority: Optional[ComplaintPriority] = None,
        ward_id: Optional[int] = None,
        department_id: Optional[int] = None,
        category_id: Optional[int] = None,
        search: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Complaint], int]:
        """
        Returns a paginated list of complaints within the user's scope,
        plus the total matching count.
        """
        query = self.get_scoped_query(user)

        if status:
            query = query.filter(Complaint.status == status)
        if priority:
            query = query.filter(Complaint.final_priority == priority)
        if ward_id:
            query = query.filter(Complaint.ward_id == ward_id)
        if category_id:
            query = query.filter(Complaint.category_id == category_id)

        # Department filter (if gov admin wants to filter by a specific department)
        if department_id and user.role == UserRole.GOV_ADMIN:
            query = query.join(
                ComplaintCategory,
                ComplaintCategory.id == Complaint.category_id
            ).filter(
                ComplaintCategory.department_id == department_id
            )

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Complaint.reference_no.ilike(search_term),
                    Complaint.title.ilike(search_term),
                    Complaint.description.ilike(search_term),
                )
            )

        if start_date:
            query = query.filter(Complaint.created_at >= start_date)
        if end_date:
            query = query.filter(Complaint.created_at <= end_date)

        total = query.count()
        complaints = (
            query.order_by(Complaint.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return complaints, total

    def find_best_officer_for_assignment(
        self, department_id: int, ward_id: int
    ) -> Optional[int]:
        """
        Finds the officer in the given department and ward with the fewest active/open complaints.
        Fallback 1: any officer in that department.
        Fallback 2: None (will route to department admin queue).
        """
        # Step 1: Check officers assigned to the same department and ward
        ward_officers = (
            self.db.query(User)
            .filter(
                User.role == UserRole.OFFICER,
                User.department_id == department_id,
                User.ward_id == ward_id,
                User.is_active == True,
            )
            .all()
        )

        candidates = ward_officers
        if not candidates:
            # Fallback 1: any officer in the same department
            candidates = (
                self.db.query(User)
                .filter(
                    User.role == UserRole.OFFICER,
                    User.department_id == department_id,
                    User.is_active == True,
                )
                .all()
            )

        if not candidates:
            return None

        candidate_ids = [c.id for c in candidates]

        # Calculate count of active complaints per officer
        open_counts = (
            self.db.query(
                ComplaintAssignment.officer_id,
                func.count(ComplaintAssignment.id).label("active_count"),
            )
            .join(Complaint, Complaint.id == ComplaintAssignment.complaint_id)
            .filter(
                ComplaintAssignment.officer_id.in_(candidate_ids),
                ComplaintAssignment.is_active == True,
                Complaint.status.in_([
                    ComplaintStatus.SUBMITTED,
                    ComplaintStatus.ASSIGNED,
                    ComplaintStatus.ACKNOWLEDGED,
                    ComplaintStatus.IN_PROGRESS,
                ]),
            )
            .group_by(ComplaintAssignment.officer_id)
            .all()
        )

        counts_dict = {officer_id: count for officer_id, count in open_counts}
        # Pick candidate with minimum active complaints
        best_candidate = min(candidates, key=lambda u: counts_dict.get(u.id, 0))
        return best_candidate.id

    def create(self, complaint: Complaint) -> Complaint:
        self.db.add(complaint)
        self.db.commit()
        self.db.refresh(complaint)
        return complaint

    def update(self, complaint: Complaint) -> Complaint:
        self.db.commit()
        self.db.refresh(complaint)
        return complaint

    def add_assignment(self, assignment: ComplaintAssignment) -> ComplaintAssignment:
        # Deactivate existing active assignments for this complaint
        self.db.query(ComplaintAssignment).filter(
            ComplaintAssignment.complaint_id == assignment.complaint_id,
            ComplaintAssignment.is_active == True,
        ).update({"is_active": False})

        self.db.add(assignment)
        self.db.commit()
        self.db.refresh(assignment)
        return assignment

    def add_status_history(self, history: ComplaintStatusHistory) -> ComplaintStatusHistory:
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        return history

    def add_comment(self, comment: ComplaintComment) -> ComplaintComment:
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return comment

    def add_evidence(self, evidence: ComplaintEvidence) -> ComplaintEvidence:
        self.db.add(evidence)
        self.db.commit()
        self.db.refresh(evidence)
        return evidence

    def add_feedback(self, feedback: CitizenFeedback) -> CitizenFeedback:
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)
        return feedback

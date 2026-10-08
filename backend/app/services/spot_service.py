from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from fastapi import HTTPException, status

from app.models.entities import (
    Spot, SpotCheckin, SpotAdoptionHistory, SpotType, SpotStatus, CareFrequency,
    User, UserRole, Ward, Department, Complaint, Notification
)
from app.schemas.spots import (
    SpotCreate, SpotAdoptRequest, SpotReleaseRequest, SpotCheckinCreate,
    SpotStatusUpdate, SpotSchedulerSummary
)
from app.services.gamification_service import GamificationService


class SpotService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    def list_spots(
        self,
        search: Optional[str] = None,
        spot_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        district: Optional[str] = None,
        ward_id: Optional[int] = None,
        department_id: Optional[int] = None,
        adopted_by_user_id: Optional[int] = None,
        current_user: Optional[User] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        List spots with filtering and computed stats.
        Respects RBAC:
        - Department Admins see spots scoped to their department by default (unless global filter given).
        """
        query = self.db.query(Spot)

        # RBAC scoping for Department Admin
        if current_user and current_user.role == UserRole.DEPT_ADMIN and current_user.department_id:
            if not department_id:
                query = query.filter(Spot.department_id == current_user.department_id)

        # Filters
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Spot.name.ilike(search_term),
                    Spot.address.ilike(search_term),
                    Spot.district.ilike(search_term)
                )
            )

        if spot_type:
            try:
                st = SpotType(spot_type)
                query = query.filter(Spot.spot_type == st)
            except ValueError:
                pass

        if status_filter:
            try:
                sf = SpotStatus(status_filter)
                query = query.filter(Spot.status == sf)
            except ValueError:
                pass

        if district:
            query = query.filter(Spot.district.ilike(f"%{district.strip()}%"))

        if ward_id:
            query = query.filter(Spot.ward_id == ward_id)

        if department_id:
            query = query.filter(Spot.department_id == department_id)

        if adopted_by_user_id:
            query = query.filter(Spot.adopted_by == adopted_by_user_id)

        total_count = query.count()
        spots = query.order_by(desc(Spot.created_at)).offset(offset).limit(limit).all()

        # Dynamic overall stats across all spots in current scope
        base_scope_query = self.db.query(Spot)
        if current_user and current_user.role == UserRole.DEPT_ADMIN and current_user.department_id:
            base_scope_query = base_scope_query.filter(Spot.department_id == current_user.department_id)

        total_spots = base_scope_query.count()
        available_spots = base_scope_query.filter(Spot.status == SpotStatus.AVAILABLE).count()
        adopted_spots = base_scope_query.filter(Spot.status == SpotStatus.ADOPTED).count()

        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_checkins = self.db.query(func.count(SpotCheckin.id)).filter(
            SpotCheckin.created_at >= thirty_days_ago
        ).scalar() or 0

        # Transform spots into response items
        items = []
        for s in spots:
            checkins_count = self.db.query(func.count(SpotCheckin.id)).filter(SpotCheckin.spot_id == s.id).scalar() or 0
            complaints_count = self.db.query(func.count(Complaint.id)).filter(Complaint.spot_id == s.id).scalar() or 0

            adopter_name = None
            if s.adopter:
                adopter_name = s.adopter.public_display_name or s.adopter.name

            ward_name = s.ward.name if s.ward else None
            dept_name = s.department.name_en if s.department else None

            items.append({
                "id": s.id,
                "name": s.name,
                "spot_type": s.spot_type,
                "description": s.description,
                "address": s.address,
                "latitude": s.latitude,
                "longitude": s.longitude,
                "district": s.district,
                "ward_id": s.ward_id,
                "ward_name": ward_name,
                "department_id": s.department_id,
                "department_name": dept_name,
                "status": s.status,
                "adopted_by": s.adopted_by,
                "adopter_name": adopter_name,
                "adopted_at": s.adopted_at,
                "care_frequency": s.care_frequency,
                "commitment_actions": s.commitment_actions or [],
                "last_checkin_at": s.last_checkin_at,
                "missed_checkins_count": s.missed_checkins_count,
                "photo_url": s.photo_url,
                "checkins_count": checkins_count,
                "linked_complaints_count": complaints_count,
                "created_at": s.created_at
            })

        return {
            "total": total_count,
            "items": items,
            "stats": {
                "total_spots": total_spots,
                "available_spots": available_spots,
                "adopted_spots": adopted_spots,
                "recent_checkins": recent_checkins
            }
        }

    def get_spot_detail(self, spot_id: int) -> Dict[str, Any]:
        """Get complete spot details, check-in history, complaints, and adoption history."""
        spot = self.db.query(Spot).filter(Spot.id == spot_id).first()
        if not spot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")

        # Fetch check-ins
        checkins = self.db.query(SpotCheckin).filter(
            SpotCheckin.spot_id == spot.id
        ).order_by(desc(SpotCheckin.created_at)).limit(20).all()

        checkin_items = []
        for c in checkins:
            uname = c.user.public_display_name if c.user and c.user.public_display_name else (c.user.name if c.user else "Citizen")
            checkin_items.append({
                "id": c.id,
                "spot_id": c.spot_id,
                "user_id": c.user_id,
                "user_display_name": uname,
                "note": c.note,
                "photo_url": c.photo_url,
                "actions_completed": c.actions_completed or [],
                "points_awarded": c.points_awarded,
                "created_at": c.created_at
            })

        # Fetch adoption history
        history = self.db.query(SpotAdoptionHistory).filter(
            SpotAdoptionHistory.spot_id == spot.id
        ).order_by(desc(SpotAdoptionHistory.created_at)).limit(20).all()

        history_items = []
        for h in history:
            uname = h.user.public_display_name if h.user and h.user.public_display_name else (h.user.name if h.user else "User")
            history_items.append({
                "id": h.id,
                "spot_id": h.spot_id,
                "user_id": h.user_id,
                "user_display_name": uname,
                "action": h.action,
                "reason": h.reason,
                "created_at": h.created_at
            })

        # Fetch linked complaints
        complaints = self.db.query(Complaint).filter(
            Complaint.spot_id == spot.id
        ).order_by(desc(Complaint.created_at)).limit(20).all()

        complaint_items = []
        for comp in complaints:
            complaint_items.append({
                "id": comp.id,
                "reference_no": comp.reference_no,
                "title": comp.title,
                "status": comp.status.value if hasattr(comp.status, "value") else str(comp.status),
                "created_at": comp.created_at
            })

        adopter_name = None
        if spot.adopter:
            adopter_name = spot.adopter.public_display_name or spot.adopter.name

        return {
            "id": spot.id,
            "name": spot.name,
            "spot_type": spot.spot_type,
            "description": spot.description,
            "address": spot.address,
            "latitude": spot.latitude,
            "longitude": spot.longitude,
            "district": spot.district,
            "ward_id": spot.ward_id,
            "ward_name": spot.ward.name if spot.ward else None,
            "department_id": spot.department_id,
            "department_name": spot.department.name_en if spot.department else None,
            "status": spot.status,
            "adopted_by": spot.adopted_by,
            "adopter_name": adopter_name,
            "adopted_at": spot.adopted_at,
            "care_frequency": spot.care_frequency,
            "commitment_actions": spot.commitment_actions or [],
            "last_checkin_at": spot.last_checkin_at,
            "missed_checkins_count": spot.missed_checkins_count,
            "photo_url": spot.photo_url,
            "checkins_count": len(checkin_items),
            "linked_complaints_count": len(complaint_items),
            "created_at": spot.created_at,
            "checkins": checkin_items,
            "history": history_items,
            "linked_complaints": complaint_items
        }

    def adopt_spot(self, spot_id: int, user: User, payload: SpotAdoptRequest) -> Dict[str, Any]:
        """
        Adopt an available spot.
        Enforces maximum 3 active spots per citizen to ensure broad community participation.
        Awards +100 points via points_ledger (idempotent).
        """
        spot = self.db.query(Spot).filter(Spot.id == spot_id).first()
        if not spot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")

        if spot.status != SpotStatus.AVAILABLE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Spot is currently {spot.status.value} and cannot be adopted"
            )

        # Enforce max 3 active adoptions per citizen
        active_count = self.db.query(func.count(Spot.id)).filter(
            Spot.adopted_by == user.id,
            Spot.status == SpotStatus.ADOPTED
        ).scalar() or 0

        if active_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already adopted 3 spots (maximum limit). Please release an existing spot to adopt a new one."
            )

        now = datetime.utcnow()
        spot.status = SpotStatus.ADOPTED
        spot.adopted_by = user.id
        spot.adopted_at = now
        spot.commitment_actions = payload.commitment_actions or ["Litter cleaning", "Plant care & monitoring"]
        spot.care_frequency = payload.care_frequency
        spot.missed_checkins_count = 0
        spot.updated_at = now

        # Record adoption history
        history = SpotAdoptionHistory(
            spot_id=spot.id,
            user_id=user.id,
            action="adopted",
            reason="Adopted with commitment actions: " + ", ".join(spot.commitment_actions),
            created_at=now
        )
        self.db.add(history)

        # Award points (+100) via PointsLedger
        ledger_entry = self.gamification.award_points(
            user_id=user.id,
            reason="spot_adopted",
            source_type="spot",
            source_id=f"{spot.id}_{now.strftime('%Y%m%d%H%M%S')}",
            points=100
        )

        # Check badges
        self.gamification.evaluate_badges(user.id)

        # Send in-app notification
        notif = Notification(
            user_id=user.id,
            event_type="spot_adopted",
            title=f"Adopted {spot.name}!",
            message=f"You have committed to caring for '{spot.name}'. You earned +100 Civic Points! Regular check-ins will keep this spot shining.",
            dedupe_key=f"spot_adopt_{spot.id}_{user.id}_{now.strftime('%Y%m%d%H%M')}"
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(spot)

        return self.get_spot_detail(spot.id)

    def release_spot(self, spot_id: int, user: User, payload: SpotReleaseRequest) -> Dict[str, Any]:
        """
        Release an adopted spot voluntarily or via administrative authority.
        """
        spot = self.db.query(Spot).filter(Spot.id == spot_id).first()
        if not spot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")

        # Must be the adopter OR an administrator / officer
        is_adopter = spot.adopted_by == user.id
        is_admin = user.role in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN, UserRole.OFFICER]

        if not is_adopter and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to release this spot"
            )

        now = datetime.utcnow()
        previous_adopter_id = spot.adopted_by

        spot.status = SpotStatus.AVAILABLE
        spot.adopted_by = None
        spot.adopted_at = None
        spot.missed_checkins_count = 0
        spot.updated_at = now

        # Record history
        history = SpotAdoptionHistory(
            spot_id=spot.id,
            user_id=user.id,
            action="released",
            reason=payload.reason or "Voluntary relinquishment of spot care",
            created_at=now
        )
        self.db.add(history)

        # Notify former adopter if released by admin
        if previous_adopter_id and previous_adopter_id != user.id:
            notif = Notification(
                user_id=previous_adopter_id,
                event_type="spot_released",
                title=f"Adoption ended for {spot.name}",
                message=f"The adoption for '{spot.name}' has been concluded. Thank you for your service!",
                dedupe_key=f"spot_release_{spot.id}_{previous_adopter_id}_{now.strftime('%Y%m%d%H%M')}"
            )
            self.db.add(notif)

        self.db.commit()
        self.db.refresh(spot)

        return self.get_spot_detail(spot.id)

    def checkin_spot(self, spot_id: int, user: User, payload: SpotCheckinCreate) -> Dict[str, Any]:
        """
        Record a periodic care check-in with photo and note.
        Awards +15 Civic Points.
        Resets missed check-ins count to 0.
        """
        spot = self.db.query(Spot).filter(Spot.id == spot_id).first()
        if not spot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")

        # Adopter or Officer/Admin
        if spot.adopted_by != user.id and user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN, UserRole.OFFICER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the registered adopter or municipal staff can submit check-ins for this spot"
            )

        now = datetime.utcnow()
        points_to_award = 15

        checkin = SpotCheckin(
            spot_id=spot.id,
            user_id=user.id,
            note=payload.note,
            photo_url=payload.photo_url,
            actions_completed=payload.actions_completed or ["Routine care inspection"],
            points_awarded=points_to_award,
            created_at=now
        )
        self.db.add(checkin)

        # Update spot's last check-in timestamp and reset missed check-ins
        spot.last_checkin_at = now
        spot.missed_checkins_count = 0
        spot.updated_at = now

        # Award points via PointsLedger
        self.gamification.award_points(
            user_id=user.id,
            reason="spot_checkin",
            source_type="spot_checkin",
            source_id=f"{spot.id}_{now.strftime('%Y%m%d%H%M%S')}",
            points=points_to_award
        )

        # Check badges
        self.gamification.evaluate_badges(user.id)

        # Send celebratory notification
        notif = Notification(
            user_id=user.id,
            event_type="spot_checkin",
            title=f"Check-in verified for {spot.name}",
            message=f"Thank you for maintaining '{spot.name}'! You earned +{points_to_award} Civic Points.",
            dedupe_key=f"checkin_{spot.id}_{user.id}_{now.strftime('%Y%m%d%H%M')}"
        )
        self.db.add(notif)
        self.db.commit()
        self.db.refresh(checkin)

        uname = user.public_display_name or user.name
        return {
            "id": checkin.id,
            "spot_id": checkin.spot_id,
            "user_id": checkin.user_id,
            "user_display_name": uname,
            "note": checkin.note,
            "photo_url": checkin.photo_url,
            "actions_completed": checkin.actions_completed,
            "points_awarded": checkin.points_awarded,
            "created_at": checkin.created_at
        }

    def process_periodic_reminders_and_auto_release(self) -> SpotSchedulerSummary:
        """
        Background scheduler job:
        - Scans all ADOPTED spots.
        - Calculates if a check-in is overdue based on care_frequency:
            daily -> 2 days without checkin
            weekly -> 8 days without checkin
            biweekly -> 16 days without checkin
            monthly -> 32 days without checkin
        - If overdue: increments missed_checkins_count.
        - If missed_checkins_count >= max_missed_checkins: auto-releases the spot!
        - Otherwise: sends reminder notification to adopter.
        """
        now = datetime.utcnow()
        adopted_spots = self.db.query(Spot).filter(Spot.status == SpotStatus.ADOPTED).all()

        reminders_sent = 0
        auto_released_count = 0
        details = []

        frequency_thresholds = {
            CareFrequency.DAILY: timedelta(days=2),
            CareFrequency.WEEKLY: timedelta(days=8),
            CareFrequency.BIWEEKLY: timedelta(days=16),
            CareFrequency.MONTHLY: timedelta(days=32),
        }

        for spot in adopted_spots:
            last_activity = spot.last_checkin_at or spot.adopted_at or spot.created_at
            threshold = frequency_thresholds.get(spot.care_frequency, timedelta(days=8))

            if now - last_activity > threshold:
                spot.missed_checkins_count += 1
                details.append(f"Spot {spot.name} missed checkin cycle (missed {spot.missed_checkins_count}/{spot.max_missed_checkins})")

                if spot.missed_checkins_count >= spot.max_missed_checkins:
                    # Auto-release spot
                    previous_adopter_id = spot.adopted_by
                    spot.status = SpotStatus.AVAILABLE
                    spot.adopted_by = None
                    spot.missed_checkins_count = 0
                    spot.updated_at = now

                    # Record history
                    hist = SpotAdoptionHistory(
                        spot_id=spot.id,
                        user_id=previous_adopter_id,
                        action="auto_released",
                        reason=f"Auto-released after {spot.max_missed_checkins} consecutive missed check-in cycles.",
                        created_at=now
                    )
                    self.db.add(hist)

                    # Notify former adopter
                    if previous_adopter_id:
                        notif = Notification(
                            user_id=previous_adopter_id,
                            event_type="spot_auto_released",
                            title=f"Spot released: {spot.name}",
                            message=f"Due to {spot.max_missed_checkins} missed care check-ins, '{spot.name}' has been made available for other community members to adopt.",
                            dedupe_key=f"auto_release_{spot.id}_{previous_adopter_id}_{now.strftime('%Y%m%d%H%M')}"
                        )
                        self.db.add(notif)
                    auto_released_count += 1
                else:
                    # Send reminder notification
                    if spot.adopted_by:
                        notif = Notification(
                            user_id=spot.adopted_by,
                            event_type="spot_checkin_reminder",
                            title=f"Care check-in due: {spot.name}",
                            message=f"Your care check-in for '{spot.name}' is overdue ({spot.missed_checkins_count}/{spot.max_missed_checkins} missed cycles). Please submit a quick check-in to keep your adoption active!",
                            dedupe_key=f"remind_{spot.id}_{spot.adopted_by}_{spot.missed_checkins_count}_{now.strftime('%Y%W')}"
                        )
                        self.db.add(notif)
                        reminders_sent += 1

        self.db.commit()

        return SpotSchedulerSummary(
            checked_spots_count=len(adopted_spots),
            reminders_sent=reminders_sent,
            auto_released_count=auto_released_count,
            details=details
        )

    def get_map_points(self) -> List[Dict[str, Any]]:
        """Fetch lightweight GIS points for Leaflet map mode."""
        spots = self.db.query(Spot).all()
        points = []
        for s in spots:
            adopter_name = None
            if s.adopter:
                adopter_name = s.adopter.public_display_name or s.adopter.name
            points.append({
                "id": s.id,
                "name": s.name,
                "spot_type": s.spot_type.value if hasattr(s.spot_type, "value") else str(s.spot_type),
                "latitude": s.latitude,
                "longitude": s.longitude,
                "status": s.status.value if hasattr(s.status, "value") else str(s.status),
                "address": s.address,
                "district": s.district,
                "ward_id": s.ward_id,
                "adopter_name": adopter_name,
                "last_checkin_at": s.last_checkin_at
            })
        return points

    def update_spot_status(self, spot_id: int, user: User, payload: SpotStatusUpdate) -> Dict[str, Any]:
        """
        Officer or Administrator updates spot status (e.g., mark MAINTENANCE).
        """
        if user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN, UserRole.OFFICER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only municipal officers and administrators can manually update spot status"
            )

        spot = self.db.query(Spot).filter(Spot.id == spot_id).first()
        if not spot:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Spot not found")

        # Department scoping for Department Admin
        if user.role == UserRole.DEPT_ADMIN and user.department_id and spot.department_id:
            if spot.department_id != user.department_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot modify spots outside your department"
                )

        spot.status = payload.status
        spot.updated_at = datetime.utcnow()

        # Log status change in history
        history = SpotAdoptionHistory(
            spot_id=spot.id,
            user_id=user.id,
            action=f"status_updated_to_{payload.status.value}",
            reason=payload.note or "Status changed by municipal authority",
            created_at=datetime.utcnow()
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(spot)

        return self.get_spot_detail(spot.id)

    def create_spot(self, payload: SpotCreate, user: User) -> Dict[str, Any]:
        """Create a new spot (Admin/Officer only)."""
        if user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can create spots"
            )

        # Department scoping for Dept Admin
        dept_id = payload.department_id
        if user.role == UserRole.DEPT_ADMIN and user.department_id:
            dept_id = user.department_id

        spot = Spot(
            name=payload.name,
            spot_type=payload.spot_type,
            description=payload.description,
            address=payload.address,
            latitude=payload.latitude,
            longitude=payload.longitude,
            district=payload.district,
            ward_id=payload.ward_id,
            department_id=dept_id,
            status=SpotStatus.AVAILABLE,
            care_frequency=payload.care_frequency,
            commitment_actions=payload.commitment_actions or ["Litter cleaning", "Plant care & monitoring"],
            max_missed_checkins=payload.max_missed_checkins or 3,
            photo_url=payload.photo_url,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        self.db.add(spot)
        self.db.commit()
        self.db.refresh(spot)

        return self.get_spot_detail(spot.id)

    def bulk_create_spots(self, spots_data: List[SpotCreate], user: User) -> Dict[str, Any]:
        """Bulk import spots from admin interface."""
        if user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can bulk create spots"
            )

        created_count = 0
        now = datetime.utcnow()

        for item in spots_data:
            dept_id = item.department_id
            if user.role == UserRole.DEPT_ADMIN and user.department_id:
                dept_id = user.department_id

            spot = Spot(
                name=item.name,
                spot_type=item.spot_type,
                description=item.description,
                address=item.address,
                latitude=item.latitude,
                longitude=item.longitude,
                district=item.district,
                ward_id=item.ward_id,
                department_id=dept_id,
                status=SpotStatus.AVAILABLE,
                care_frequency=item.care_frequency,
                commitment_actions=item.commitment_actions or ["Litter cleaning", "Plant care & monitoring"],
                max_missed_checkins=item.max_missed_checkins or 3,
                photo_url=item.photo_url,
                created_at=now,
                updated_at=now
            )
            self.db.add(spot)
            created_count += 1

        self.db.commit()
        return {"created_count": created_count, "status": "success"}

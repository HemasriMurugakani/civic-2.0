from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, get_optional_current_user, require_roles
from app.models.entities import User, UserRole
from app.services.spot_service import SpotService
from app.schemas.spots import (
    SpotCreate, SpotBulkCreate, SpotStatusUpdate, SpotAdoptRequest,
    SpotReleaseRequest, SpotCheckinCreate, SpotCheckinResponse,
    SpotDetail, SpotMapPoint, SpotSchedulerSummary
)

router = APIRouter(prefix="/spots", tags=["Adopt-a-Spot"])


@router.get("", response_model=Dict[str, Any])
def list_spots(
    search: Optional[str] = Query(None, description="Search by name, address, district"),
    spot_type: Optional[str] = Query(None, description="Spot type filter"),
    status: Optional[str] = Query(None, description="Status filter: available, adopted, maintenance"),
    district: Optional[str] = Query(None, description="District filter"),
    ward_id: Optional[int] = Query(None, description="Ward ID filter"),
    department_id: Optional[int] = Query(None, description="Department ID filter"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """List adoptable spots with dynamic statistics and filters."""
    service = SpotService(db)
    return service.list_spots(
        search=search,
        spot_type=spot_type,
        status_filter=status,
        district=district,
        ward_id=ward_id,
        department_id=department_id,
        current_user=current_user,
        limit=limit,
        offset=offset
    )


@router.get("/map", response_model=List[SpotMapPoint])
def get_spots_map(db: Session = Depends(get_db)):
    """Fetch lightweight GIS coordinates and statuses for the interactive Leaflet map."""
    service = SpotService(db)
    return service.get_map_points()


@router.get("/my-adoptions", response_model=Dict[str, Any])
def get_my_adoptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve spots adopted by the current citizen."""
    service = SpotService(db)
    return service.list_spots(
        adopted_by_user_id=current_user.id,
        current_user=current_user
    )


@router.get("/{spot_id}", response_model=SpotDetail)
def get_spot_detail(
    spot_id: int,
    db: Session = Depends(get_db),
):
    """Get full details for a specific spot, including check-in history and linked grievances."""
    service = SpotService(db)
    return service.get_spot_detail(spot_id)


@router.post("/{spot_id}/adopt", response_model=SpotDetail)
def adopt_spot(
    spot_id: int,
    payload: SpotAdoptRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adopt an available spot with care commitments.
    Awards +100 Civic Points and evaluates unlocked badges.
    """
    service = SpotService(db)
    return service.adopt_spot(spot_id=spot_id, user=current_user, payload=payload)


@router.post("/{spot_id}/release", response_model=SpotDetail)
def release_spot(
    spot_id: int,
    payload: SpotReleaseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Relinquish care of an adopted spot voluntarily or via administrative authority."""
    service = SpotService(db)
    return service.release_spot(spot_id=spot_id, user=current_user, payload=payload)


@router.post("/{spot_id}/checkin", response_model=SpotCheckinResponse)
def checkin_spot(
    spot_id: int,
    payload: SpotCheckinCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a periodic care check-in with photo and note.
    Awards +15 Civic Points and resets missed check-in counters.
    """
    service = SpotService(db)
    return service.checkin_spot(spot_id=spot_id, user=current_user, payload=payload)


@router.post("/scheduler/check-reminders", response_model=SpotSchedulerSummary)
def run_periodic_reminders_and_auto_release(
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Background maintenance task:
    Checks for overdue check-ins, delivers in-app notifications, and auto-releases abandoned spots.
    """
    service = SpotService(db)
    return service.process_periodic_reminders_and_auto_release()


@router.patch("/{spot_id}/status", response_model=SpotDetail)
def update_spot_status(
    spot_id: int,
    payload: SpotStatusUpdate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN, UserRole.OFFICER)),
    db: Session = Depends(get_db),
):
    """Update spot status (e.g. mark maintenance) by municipal officer or admin."""
    service = SpotService(db)
    return service.update_spot_status(spot_id=spot_id, user=current_user, payload=payload)


@router.post("", response_model=SpotDetail)
def create_spot(
    payload: SpotCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN)),
    db: Session = Depends(get_db),
):
    """Create a new adoptable spot."""
    service = SpotService(db)
    return service.create_spot(payload=payload, user=current_user)


@router.post("/bulk", response_model=Dict[str, Any])
def bulk_create_spots(
    payload: SpotBulkCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN)),
    db: Session = Depends(get_db),
):
    """Bulk create adoptable spots."""
    service = SpotService(db)
    return service.bulk_create_spots(spots_data=payload.spots, user=current_user)

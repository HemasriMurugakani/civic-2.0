from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_optional_current_user
from app.models.entities import User, UserRole
from app.services.project_service import ProjectService
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdatePayload,
    ProjectListItem,
    ProjectDetailResponse,
    ProjectUpdateItemCreate,
    ProjectUpdateItemResponse,
    ProjectRatingCreate,
    ProjectMapPoint,
    ProjectSyncResponse,
)

router = APIRouter(prefix="/projects", tags=["Infrastructure Projects"])


@router.get("", response_model=List[ProjectListItem])
def list_projects(
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    source: Optional[str] = None,
    ward_id: Optional[int] = None,
    department_id: Optional[int] = None,
    budget_min: Optional[float] = None,
    budget_max: Optional[float] = None,
    overdue_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """List infrastructure projects with filtering and RBAC department scoping."""
    service = ProjectService(db)
    return service.list_projects(
        search=search,
        category=category,
        status_filter=status,
        source=source,
        ward_id=ward_id,
        department_id=department_id,
        budget_min=budget_min,
        budget_max=budget_max,
        overdue_only=overdue_only,
        current_user=current_user,
        limit=limit,
        offset=offset,
    )


@router.get("/map", response_model=List[ProjectMapPoint])
def get_projects_map_points(db: Session = Depends(get_db)):
    """Lightweight map points for Leaflet map mode."""
    service = ProjectService(db)
    return service.get_map_points()


@router.post("", response_model=ProjectListItem, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new infrastructure project. RBAC: Department Admin or Government Admin."""
    service = ProjectService(db)
    p = service.create_project(current_user, payload)
    return service.get_project_detail(p.id, current_user)


@router.post("/sync", response_model=ProjectSyncResponse)
def sync_government_open_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger manual sync with government open data portal. RBAC: Government Admin."""
    if current_user.role != UserRole.GOV_ADMIN:
        raise HTTPException(status_code=403, detail="Only Government Administrators can trigger manual open data sync")

    service = ProjectService(db)
    return service.sync_government_data()


@router.post("/bulk-import")
async def bulk_import_projects_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk import projects from CSV file with validation report. RBAC: Admins."""
    content = (await file.read()).decode("utf-8")
    service = ProjectService(db)
    return service.import_csv(content, current_user)


@router.get("/{project_id}", response_model=ProjectDetailResponse)
def get_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get project details with update history and follow status."""
    service = ProjectService(db)
    return service.get_project_detail(project_id, current_user)


@router.put("/{project_id}", response_model=ProjectDetailResponse)
def update_project(
    project_id: int,
    payload: ProjectUpdatePayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update project metadata or progress. RBAC: Department Admin or Government Admin."""
    service = ProjectService(db)
    service.update_project(current_user, project_id, payload)
    return service.get_project_detail(project_id, current_user)


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete project. RBAC: Admins."""
    service = ProjectService(db)
    service.delete_project(current_user, project_id)
    return {"success": True, "message": "Project deleted successfully"}


@router.post("/{project_id}/updates", response_model=ProjectUpdateItemResponse)
def post_project_update(
    project_id: int,
    payload: ProjectUpdateItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Post an update on an infrastructure project.
    Officers/Admins: verified immediately; updates project.progress_percent.
    Citizens: marked as pending moderation.
    """
    service = ProjectService(db)
    upd = service.add_project_update(
        user=current_user,
        project_id=project_id,
        note=payload.note,
        progress_percent=payload.progress_percent,
        photo_url=payload.photo_url,
    )
    return {
        "id": upd.id,
        "project_id": upd.project_id,
        "author_id": upd.author_id,
        "author_name": current_user.name,
        "author_role": upd.author_role,
        "note": upd.note,
        "progress_percent": upd.progress_percent,
        "photo_url": upd.photo_url,
        "is_verified": upd.is_verified,
        "created_at": upd.created_at,
    }


@router.post("/{project_id}/follow")
def toggle_follow_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Follow or unfollow a project to receive update notifications."""
    service = ProjectService(db)
    is_following = service.toggle_follow(current_user.id, project_id)
    return {"success": True, "is_following": is_following}


@router.post("/{project_id}/transparency-rating")
def rate_project_transparency(
    project_id: int,
    payload: ProjectRatingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit transparency rating (1-5 stars) on a public project."""
    service = ProjectService(db)
    rating = service.submit_transparency_rating(
        user_id=current_user.id,
        project_id=project_id,
        score=payload.transparency_score,
        comment=payload.comment,
    )
    return {
        "success": True,
        "transparency_score": rating.transparency_score,
        "comment": rating.comment,
    }

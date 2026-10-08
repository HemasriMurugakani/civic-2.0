from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user, get_optional_current_user, require_roles
from app.models.entities import User, UserRole
from app.services.campaign_service import CampaignService
from app.schemas.campaigns import (
    CampaignCreate, CampaignUpdate, CampaignDetail,
    CampaignLeaderboardEntry, CampaignSyncSummary
)

router = APIRouter(prefix="/campaigns", tags=["Seasonal Campaigns"])


@router.get("", response_model=Dict[str, Any])
def list_campaigns(
    status: Optional[str] = Query(None, description="Filter by status: draft, scheduled, active, completed, cancelled"),
    season_theme: Optional[str] = Query(None, description="Filter by season theme (e.g. monsoon, swachhata)"),
    region: Optional[str] = Query(None, description="Filter by region/city"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    List seasonal campaigns with dynamically computed community progress,
    participation numbers, and current user join status.
    """
    service = CampaignService(db)
    user_id = current_user.id if current_user else None
    return service.list_campaigns(
        status_filter=status,
        season_theme=season_theme,
        region=region,
        user_id=user_id
    )


@router.post("/sync", response_model=CampaignSyncSummary)
def sync_campaign_lifecycles(
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    """
    Synchronize campaign lifecycles based on current UTC time:
    - Transitions SCHEDULED campaigns to ACTIVE if start_at has arrived.
    - Transitions ACTIVE campaigns to COMPLETED if end_at has passed.
    """
    service = CampaignService(db)
    return service.sync_campaign_lifecycles()


@router.get("/{identifier}", response_model=CampaignDetail)
def get_campaign_detail(
    identifier: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a seasonal campaign, including:
    - Target metric progress
    - Dynamic task checklist with live user completion status
    - Top campaign leaderboard
    """
    service = CampaignService(db)
    user_id = current_user.id if current_user else None
    return service.get_campaign_detail(identifier=identifier, user_id=user_id)


@router.post("/{identifier}/join", response_model=CampaignDetail)
def join_campaign(
    identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Citizen joins an active or scheduled campaign.
    Awards +25 Civic Points (idempotent) and begins live task tracking.
    """
    service = CampaignService(db)
    return service.join_campaign(identifier=identifier, user=current_user)


@router.post("/{identifier}/leave")
def leave_campaign(
    identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Citizen leaves a seasonal campaign and resets campaign-specific task progress."""
    service = CampaignService(db)
    return service.leave_campaign(identifier=identifier, user=current_user)


@router.get("/{identifier}/leaderboard", response_model=List[CampaignLeaderboardEntry])
def get_campaign_leaderboard(
    identifier: str,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    Retrieve ranked participants for a campaign.
    Enforces privacy rules (pseudonyms/public display name, opt-outs excluded).
    """
    service = CampaignService(db)
    return service.get_campaign_leaderboard(identifier=identifier, limit=limit)


@router.post("", response_model=CampaignDetail, status_code=status.HTTP_201_CREATED)
def create_campaign(
    payload: CampaignCreate,
    current_user: User = Depends(require_roles(UserRole.GOV_ADMIN)),
    db: Session = Depends(get_db),
):
    """Government Administrator creates a new seasonal civic campaign with specific tasks."""
    service = CampaignService(db)
    return service.create_campaign(payload=payload, user=current_user)

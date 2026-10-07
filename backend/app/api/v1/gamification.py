from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_optional_current_user
from app.models.entities import User
from app.services.gamification_service import GamificationService
from app.schemas.gamification import (
    GamificationProgressResponse,
    LeaderboardResponse,
    UserProfileResponse,
    PrivacySettingsUpdate,
    BadgeResponse,
)

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/me/progress", response_model=GamificationProgressResponse)
def get_my_progress(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the authenticated citizen's points, level, rank, and badges."""
    service = GamificationService(db)
    return service.get_user_progress(current_user)


@router.put("/me/privacy", response_model=GamificationProgressResponse)
def update_my_privacy(
    payload: PrivacySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update public display name or leaderboard opt-out status."""
    service = GamificationService(db)
    service.ensure_user_pseudonym(current_user)

    if payload.public_display_name is not None:
        cleaned = payload.public_display_name.strip()
        if len(cleaned) < 2 or len(cleaned) > 50:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Display name must be between 2 and 50 characters",
            )
        current_user.public_display_name = cleaned

    if payload.leaderboard_opt_out is not None:
        current_user.leaderboard_opt_out = payload.leaderboard_opt_out

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return service.get_user_progress(current_user)


@router.get("/leaderboard", response_model=LeaderboardResponse)
def get_leaderboard(
    scope: str = Query("global", pattern="^(global|district|group)$"),
    period: str = Query("all", pattern="^(all|month)$"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """
    Public community leaderboard.
    Respects privacy: only displays pseudonymized names, never PII.
    Excludes users who opted out.
    """
    service = GamificationService(db)
    user_id = current_user.id if current_user else None
    ward_id = current_user.ward_id if (current_user and scope == "district") else None

    return service.get_leaderboard(
        scope=scope,
        period=period,
        limit=limit,
        current_user_id=user_id,
        ward_id=ward_id,
    )


@router.get("/users/{public_id}/profile", response_model=UserProfileResponse)
def get_user_profile(
    public_id: str,
    db: Session = Depends(get_db),
):
    """Get public profile for a user by their pseudonymized public_id."""
    service = GamificationService(db)
    profile = service.get_public_profile(public_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{public_id}' not found",
        )
    return profile


@router.get("/badges", response_model=List[BadgeResponse])
def get_all_badges(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get all civic achievements and badges with unlock criteria."""
    service = GamificationService(db)
    user_id = current_user.id if current_user else None
    return service.list_all_badges(current_user_id=user_id)

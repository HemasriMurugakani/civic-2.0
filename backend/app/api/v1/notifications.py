from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.entities import User
from app.repositories.notification_repo import NotificationRepository
from app.schemas.analytics import NotificationResponse
from app.schemas.complaint import BaseModel

class MarkReadPayload(BaseModel):
    notification_ids: List[int] = []

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=List[NotificationResponse])
def list_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = NotificationRepository(db)
    notifs = repo.list_user_notifications(user_id=current_user.id, unread_only=unread_only, limit=limit)
    return [NotificationResponse.model_validate(n) for n in notifs]

@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = NotificationRepository(db)
    count = repo.get_unread_count(user_id=current_user.id)
    return {"unread_count": count}

@router.post("/mark-read")
def mark_notifications_read(
    payload: MarkReadPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = NotificationRepository(db)
    updated = repo.mark_as_read(
        user_id=current_user.id,
        notification_ids=payload.notification_ids if payload.notification_ids else None
    )
    return {"status": "success", "updated_count": updated}

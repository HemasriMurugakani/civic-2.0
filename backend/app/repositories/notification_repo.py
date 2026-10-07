from typing import Optional, List
from sqlalchemy.orm import Session
from app.models.entities import Notification

class NotificationRepository:
    def __init__(self, db: Session):
        self.db = db

    def list_user_notifications(
        self, user_id: int, unread_only: bool = False, limit: int = 50
    ) -> List[Notification]:
        q = self.db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            q = q.filter(Notification.is_read == False)
        return q.order_by(Notification.created_at.desc()).limit(limit).all()

    def get_unread_count(self, user_id: int) -> int:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).count()

    def create_if_not_exists(
        self,
        user_id: int,
        complaint_id: Optional[int],
        event_type: str,
        title: str,
        message: str,
        dedupe_key: str,
    ) -> Optional[Notification]:
        """
        Idempotent notification creation using dedupe_key.
        Returns the new notification, or None if already notified.
        """
        existing = self.db.query(Notification).filter(
            Notification.dedupe_key == dedupe_key
        ).first()
        if existing:
            return None

        notif = Notification(
            user_id=user_id,
            complaint_id=complaint_id,
            event_type=event_type,
            title=title,
            message=message,
            dedupe_key=dedupe_key,
        )
        self.db.add(notif)
        try:
            self.db.commit()
            self.db.refresh(notif)
            return notif
        except Exception:
            self.db.rollback()
            return None

    def mark_as_read(self, user_id: int, notification_ids: Optional[List[int]] = None) -> int:
        q = self.db.query(Notification).filter(Notification.user_id == user_id)
        if notification_ids:
            q = q.filter(Notification.id.in_(notification_ids))
        updated = q.update({"is_read": True}, synchronize_session=False)
        self.db.commit()
        return updated

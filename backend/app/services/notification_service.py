import logging
from typing import Protocol, Optional
from sqlalchemy.orm import Session
from app.repositories.notification_repo import NotificationRepository

logger = logging.getLogger("civic.notifications")

class NotificationProvider(Protocol):
    def send(self, recipient: str, title: str, message: str, channel: str = "sms") -> bool:
        ...

class ConsoleNotificationProvider:
    """Dev console provider that prints SMS / Email alerts."""
    def send(self, recipient: str, title: str, message: str, channel: str = "sms") -> bool:
        logger.info(f"[{channel.upper()} to {recipient}] {title}: {message}")
        print(f"\n📢 [{channel.upper()} -> {recipient}] {title}: {message}")
        return True

class NotificationService:
    def __init__(self, db: Session, provider: Optional[NotificationProvider] = None):
        self.db = db
        self.repo = NotificationRepository(db)
        self.provider = provider or ConsoleNotificationProvider()

    def notify_user(
        self,
        user_id: int,
        title: str,
        message: str,
        event_type: str,
        dedupe_key: str,
        complaint_id: Optional[int] = None,
        recipient_contact: Optional[str] = None,
    ):
        # 1. Create in-app notification idempotently
        notif = self.repo.create_if_not_exists(
            user_id=user_id,
            complaint_id=complaint_id,
            event_type=event_type,
            title=title,
            message=message,
            dedupe_key=dedupe_key,
        )

        # 2. Dispatch to external channel (console in dev)
        if notif and recipient_contact:
            self.provider.send(
                recipient=recipient_contact,
                title=title,
                message=message,
                channel="sms" if recipient_contact.isdigit() else "email"
            )

        return notif

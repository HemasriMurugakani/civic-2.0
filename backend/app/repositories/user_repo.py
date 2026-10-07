from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.entities import User, UserRole

class UserRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_mobile(self, mobile: str) -> Optional[User]:
        return self.db.query(User).filter(User.mobile == mobile).first()

    def get_by_email(self, email: str) -> Optional[User]:
        if not email:
            return None
        return self.db.query(User).filter(User.email == email).first()

    def get_by_identifier(self, identifier: str) -> Optional[User]:
        """Matches either mobile or email."""
        return self.db.query(User).filter(
            or_(User.mobile == identifier, User.email == identifier)
        ).first()

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def list_officers(self, department_id: Optional[int] = None, ward_id: Optional[int] = None) -> List[User]:
        query = self.db.query(User).filter(User.role == UserRole.OFFICER, User.is_active == True)
        if department_id:
            query = query.filter(User.department_id == department_id)
        if ward_id:
            query = query.filter(User.ward_id == ward_id)
        return query.all()

    def list_users(self, role: Optional[UserRole] = None, department_id: Optional[int] = None) -> List[User]:
        query = self.db.query(User).filter(User.is_active == True)
        if role:
            query = query.filter(User.role == role)
        if department_id:
            query = query.filter(User.department_id == department_id)
        return query.all()

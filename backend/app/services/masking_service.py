from typing import Optional, Dict, Any
from app.models.entities import User, UserRole, Complaint

class MaskingService:
    @staticmethod
    def get_public_display_name(user: Optional[User]) -> str:
        """
        Returns the privacy-preserving pseudonym for a user.
        e.g. 'Kavitha S.' or 'Citizen #1024'.
        """
        if not user:
            return "Citizen"
        if getattr(user, "public_display_name", None):
            return user.public_display_name
        parts = user.name.strip().split()
        if len(parts) > 1:
            return f"{parts[0]} {parts[-1][0]}."
        return parts[0] if parts else f"Citizen #{user.id:04d}"

    @staticmethod
    def mask_name_by_role(
        user: Optional[User],
        viewer_role: Optional[UserRole],
        is_anonymous: bool = False,
        is_own_record: bool = False
    ) -> str:
        """
        Role-scoped name masking:
        - Anonymous reports: ALWAYS 'Anonymous Citizen' to all roles without exception.
        - Own record: Real name.
        - Public / Citizen / Officer: Privacy pseudonym (e.g. 'Kavitha S.').
        - Dept Admin / Gov Admin: Full name for administrative action, unless anonymous.
        """
        if is_anonymous:
            return "Anonymous Citizen"
        if not user:
            return "Citizen"
        if is_own_record:
            return user.name
        if viewer_role in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            return user.name
        return MaskingService.get_public_display_name(user)

    @staticmethod
    def mask_mobile_by_role(
        mobile: Optional[str],
        viewer_role: Optional[UserRole],
        is_anonymous: bool = False,
        is_own_record: bool = False
    ) -> Optional[str]:
        """
        Role-scoped mobile number masking:
        - Anonymous or Public: None (never revealed).
        - Own record: Full mobile.
        - Officer: Partial redaction (e.g. '984000****').
        - Dept Admin / Gov Admin: Full mobile.
        """
        if is_anonymous or not mobile:
            return None
        if is_own_record or viewer_role in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            return mobile
        if viewer_role == UserRole.OFFICER:
            clean = mobile.strip()
            if len(clean) >= 10:
                return f"{clean[:6]}****"
            return "****"
        return None

    @staticmethod
    def mask_email_by_role(
        email: Optional[str],
        viewer_role: Optional[UserRole],
        is_anonymous: bool = False,
        is_own_record: bool = False
    ) -> Optional[str]:
        """
        Role-scoped email masking:
        - Anonymous / Public / Officer: None.
        - Own record / Dept Admin / Gov Admin: Full email.
        """
        if is_anonymous or not email:
            return None
        if is_own_record or viewer_role in [UserRole.DEPT_ADMIN, UserRole.GOV_ADMIN]:
            return email
        return None

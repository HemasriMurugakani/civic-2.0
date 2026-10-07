import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, Enum as SQLEnum, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    OFFICER = "officer"
    DEPT_ADMIN = "dept_admin"
    GOV_ADMIN = "gov_admin"

class ComplaintStatus(str, enum.Enum):
    SUBMITTED = "submitted"
    ASSIGNED = "assigned"
    ACKNOWLEDGED = "acknowledged"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CITIZEN_VERIFIED = "citizen_verified"
    REOPENED = "reopened"

class ComplaintPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplaintChannel(str, enum.Enum):
    WEB = "web"
    MOBILE = "mobile"
    HELPLINE = "helpline"
    EMAIL = "email"

class EvidenceType(str, enum.Enum):
    CITIZEN = "citizen"
    BEFORE = "before"
    AFTER = "after"


class BadgeRarity(str, enum.Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class ProjectStatus(str, enum.Enum):
    PLANNED = "planned"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    DELAYED = "delayed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ProjectSource(str, enum.Enum):
    LOCAL_TRACKING = "local_tracking"
    GOVERNMENT_DATA = "government_data"


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name_en = Column(String(255), nullable=False)
    name_ta = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="department")
    categories = relationship("ComplaintCategory", back_populates="department")


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    ward_number = Column(Integer, unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    centroid_lat = Column(Float, nullable=False)
    centroid_lng = Column(Float, nullable=False)
    population = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    users = relationship("User", back_populates="ward")
    complaints = relationship("Complaint", back_populates="ward")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    mobile = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True, index=True)
    preferred_language = Column(String(10), default="en", nullable=False)
    public_display_name = Column(String(100), nullable=True)
    public_id = Column(String(50), unique=True, index=True, nullable=True)
    leaderboard_opt_out = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="users")
    ward = relationship("Ward", back_populates="users")
    complaints = relationship("Complaint", back_populates="citizen", foreign_keys="Complaint.citizen_id")
    assigned_complaints = relationship("ComplaintAssignment", back_populates="officer", foreign_keys="ComplaintAssignment.officer_id")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    points_entries = relationship("PointsLedger", back_populates="user", cascade="all, delete-orphan")
    badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")


class ComplaintCategory(Base):
    __tablename__ = "complaint_categories"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name_en = Column(String(255), nullable=False)
    name_ta = Column(String(255), nullable=False)
    sla_hours = Column(Integer, default=48, nullable=False)
    default_priority = Column(SQLEnum(ComplaintPriority), default=ComplaintPriority.MEDIUM, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    department = relationship("Department", back_populates="categories")
    complaints = relationship("Complaint", back_populates="category")


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    reference_no = Column(String(50), unique=True, nullable=False, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("complaint_categories.id"), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    address_text = Column(String(500), nullable=True)
    channel = Column(SQLEnum(ComplaintChannel), default=ComplaintChannel.WEB, nullable=False)
    status = Column(SQLEnum(ComplaintStatus), default=ComplaintStatus.SUBMITTED, nullable=False, index=True)
    final_priority = Column(SQLEnum(ComplaintPriority), default=ComplaintPriority.MEDIUM, nullable=False, index=True)
    sla_deadline = Column(DateTime, nullable=False, index=True)
    escalation_level = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    verified_at = Column(DateTime, nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)

    __table_args__ = (
        Index("idx_complaint_status_ward", "status", "ward_id"),
        Index("idx_complaint_status_created", "status", "created_at"),
        Index("idx_complaint_ward_created", "ward_id", "created_at"),
    )

    citizen = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    category = relationship("ComplaintCategory", back_populates="complaints")
    ward = relationship("Ward", back_populates="complaints")
    project = relationship("Project", back_populates="complaints")
    assignments = relationship("ComplaintAssignment", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintStatusHistory.timestamp")
    comments = relationship("ComplaintComment", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintComment.created_at")
    evidence = relationship("ComplaintEvidence", back_populates="complaint", cascade="all, delete-orphan")
    feedback = relationship("CitizenFeedback", back_populates="complaint", uselist=False, cascade="all, delete-orphan")
    ai_predictions = relationship("AIPrediction", back_populates="complaint", cascade="all, delete-orphan")


class ComplaintAssignment(Base):
    __tablename__ = "complaint_assignments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    officer_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assigned_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    complaint = relationship("Complaint", back_populates="assignments")
    officer = relationship("User", back_populates="assigned_complaints", foreign_keys=[officer_id])
    assigned_by = relationship("User", foreign_keys=[assigned_by_id])


class ComplaintStatusHistory(Base):
    __tablename__ = "complaint_status_history"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    from_status = Column(String(50), nullable=True)
    to_status = Column(String(50), nullable=False)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    note = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="status_history")
    actor = relationship("User")


class ComplaintComment(Base):
    __tablename__ = "complaint_comments"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="comments")
    user = relationship("User")


class ComplaintEvidence(Base):
    __tablename__ = "complaint_evidence"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    uploader_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    evidence_type = Column(SQLEnum(EvidenceType), default=EvidenceType.CITIZEN, nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    mime_type = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="evidence")
    uploader = relationship("User")


class CitizenFeedback(Base):
    __tablename__ = "citizen_feedback"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), unique=True, nullable=False, index=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True)
    confirmed_resolved = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="feedback")
    citizen = relationship("User")


class SLARule(Base):
    __tablename__ = "sla_rules"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("complaint_categories.id"), nullable=True, index=True)
    escalation_level = Column(Integer, default=1, nullable=False)
    warning_threshold_pct = Column(Integer, default=70, nullable=False)
    breach_action = Column(String(100), default="notify_and_escalate", nullable=False)
    notify_roles = Column(String(255), default="officer,dept_admin", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    category = relationship("ComplaintCategory")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    dedupe_key = Column(String(255), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="notifications")
    complaint = relationship("Complaint")


# Future-Ready Placeholder Tables
class AIPrediction(Base):
    __tablename__ = "ai_predictions"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    task = Column(String(100), nullable=False)
    label = Column(String(100), nullable=False)
    score = Column(Float, nullable=True)
    confidence = Column(Float, nullable=True)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    complaint = relationship("Complaint", back_populates="ai_predictions")


class ComplaintEmbedding(Base):
    __tablename__ = "complaint_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=False, index=True)
    vector_data = Column(Text, nullable=False)
    model_name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ComplaintCluster(Base):
    __tablename__ = "complaint_clusters"

    id = Column(Integer, primary_key=True, index=True)
    cluster_name = Column(String(255), nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True)
    complaint_count = Column(Integer, default=0, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


# ==========================================
# Gamification Core Models (Milestone F1)
# ==========================================
class PointsLedger(Base):
    __tablename__ = "points_ledger"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    points = Column(Integer, nullable=False)
    reason = Column(String(100), nullable=False, index=True)
    source_type = Column(String(50), nullable=False, index=True)
    source_id = Column(String(100), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="points_entries")

    __table_args__ = (
        UniqueConstraint("user_id", "reason", "source_type", "source_id", name="uq_points_ledger_idempotency"),
        Index("ix_points_ledger_user_created", "user_id", "created_at"),
    )


class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name_en = Column(String(255), nullable=False)
    name_ta = Column(String(255), nullable=False)
    description_en = Column(Text, nullable=False)
    description_ta = Column(Text, nullable=False)
    icon = Column(String(100), nullable=False)
    rarity = Column(SQLEnum(BadgeRarity), default=BadgeRarity.COMMON, nullable=False)
    event_type = Column(String(100), nullable=False, index=True)
    threshold = Column(Integer, default=1, nullable=False)
    points_reward = Column(Integer, default=25, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user_badges = relationship("UserBadge", back_populates="badge", cascade="all, delete-orphan")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False, index=True)
    earned_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="badges")
    badge = relationship("Badge", back_populates="user_badges")

    __table_args__ = (
        UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),
    )


# ==========================================
# Infrastructure Project Tracker (Milestone F2)
# ==========================================
class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.PLANNED, nullable=False, index=True)
    source = Column(SQLEnum(ProjectSource), default=ProjectSource.LOCAL_TRACKING, nullable=False)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)
    district = Column(String(100), nullable=True)
    constituency = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    contractor = Column(String(255), nullable=True)
    budget_amount = Column(Float, nullable=True)  # in INR
    start_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True, index=True)
    progress_percent = Column(Float, default=0.0, nullable=False)
    last_synced_at = Column(DateTime, nullable=True)
    external_id = Column(String(100), unique=True, nullable=True, index=True)
    source_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    ward = relationship("Ward")
    department = relationship("Department")
    updates = relationship("ProjectUpdate", back_populates="project", cascade="all, delete-orphan", order_by="ProjectUpdate.created_at.desc()")
    followers = relationship("ProjectFollower", back_populates="project", cascade="all, delete-orphan")
    ratings = relationship("ProjectRating", back_populates="project", cascade="all, delete-orphan")
    complaints = relationship("Complaint", back_populates="project")


class ProjectUpdate(Base):
    __tablename__ = "project_updates"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    author_role = Column(String(50), nullable=False)
    note = Column(Text, nullable=False)
    progress_percent = Column(Float, nullable=True)
    photo_url = Column(String(500), nullable=True)
    is_verified = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    project = relationship("Project", back_populates="updates")
    author = relationship("User")


class ProjectFollower(Base):
    __tablename__ = "project_followers"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="followers")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_follower"),
    )


class ProjectRating(Base):
    __tablename__ = "project_ratings"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    transparency_score = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="ratings")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_rating"),
    )


class ProjectSyncLog(Base):
    __tablename__ = "project_sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)  # "success", "failed", "conflict"
    records_ingested = Column(Integer, default=0, nullable=False)
    records_updated = Column(Integer, default=0, nullable=False)
    conflicts_detected = Column(Integer, default=0, nullable=False)
    log_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

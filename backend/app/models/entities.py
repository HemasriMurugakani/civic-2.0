import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime,
    ForeignKey, Enum as SQLEnum, Index, UniqueConstraint, JSON
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


class CommunityVoteType(str, enum.Enum):
    CONFIRM = "confirm"
    DISPUTE = "dispute"


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


class ModuleDifficulty(str, enum.Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ModuleProgressStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


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
    module_progress = relationship("UserModuleProgress", back_populates="user", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="user", cascade="all, delete-orphan")


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
    spot_id = Column(Integer, ForeignKey("spots.id"), nullable=True, index=True)

    __table_args__ = (
        Index("idx_complaint_status_ward", "status", "ward_id"),
        Index("idx_complaint_status_created", "status", "created_at"),
        Index("idx_complaint_ward_created", "ward_id", "created_at"),
    )

    citizen = relationship("User", back_populates="complaints", foreign_keys=[citizen_id])
    category = relationship("ComplaintCategory", back_populates="complaints")
    ward = relationship("Ward", back_populates="complaints")
    project = relationship("Project", back_populates="complaints")
    spot = relationship("Spot", back_populates="complaints")
    assignments = relationship("ComplaintAssignment", back_populates="complaint", cascade="all, delete-orphan")
    status_history = relationship("ComplaintStatusHistory", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintStatusHistory.timestamp")
    comments = relationship("ComplaintComment", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintComment.created_at")
    evidence = relationship("ComplaintEvidence", back_populates="complaint", cascade="all, delete-orphan")
    feedback = relationship("CitizenFeedback", back_populates="complaint", uselist=False, cascade="all, delete-orphan")
    ai_predictions = relationship("AIPrediction", back_populates="complaint", cascade="all, delete-orphan")
    community_votes = relationship("ComplaintCommunityVote", back_populates="complaint", cascade="all, delete-orphan")


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


class ComplaintCommunityVote(Base):
    __tablename__ = "complaint_community_votes"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(Integer, ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    vote_type = Column(SQLEnum(CommunityVoteType), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("complaint_id", "user_id", name="uq_complaint_community_vote_user"),
        Index("idx_vote_complaint_type", "complaint_id", "vote_type"),
    )

    complaint = relationship("Complaint", back_populates="community_votes")
    user = relationship("User")


class PlatformVisitor(Base):
    __tablename__ = "platform_visitors"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    ip_hash = Column(String(64), nullable=True)
    user_agent = Column(String(255), nullable=True)
    last_seen_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


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


# ==========================================
# Community Hub (Milestone F3)
# ==========================================
class GroupVisibility(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class GroupMemberRole(str, enum.Enum):
    MEMBER = "member"
    MODERATOR = "moderator"


class FlagStatus(str, enum.Enum):
    PENDING = "pending"
    REVIEWED = "reviewed"
    DISMISSED = "dismissed"


class ConnectionStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True, index=True)
    visibility = Column(SQLEnum(GroupVisibility), default=GroupVisibility.PUBLIC, nullable=False)
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    member_count = Column(Integer, default=1, nullable=False)
    last_activity_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    ward = relationship("Ward")
    moderator = relationship("User", foreign_keys=[moderator_id])
    memberships = relationship("GroupMembership", back_populates="group", cascade="all, delete-orphan")
    posts = relationship("GroupPost", back_populates="group", cascade="all, delete-orphan", order_by="GroupPost.created_at.desc()")


class GroupMembership(Base):
    __tablename__ = "group_memberships"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(SQLEnum(GroupMemberRole), default=GroupMemberRole.MEMBER, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    group = relationship("Group", back_populates="memberships")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("group_id", "user_id", name="uq_group_membership"),
    )


class GroupPost(Base):
    __tablename__ = "group_posts"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("groups.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    upvotes_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    group = relationship("Group", back_populates="posts")
    author = relationship("User")
    comments = relationship("GroupPostComment", back_populates="post", cascade="all, delete-orphan", order_by="GroupPostComment.created_at.asc()")


class GroupPostComment(Base):
    __tablename__ = "group_post_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("group_posts.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("group_post_comments.id"), nullable=True, index=True)
    is_hidden = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    post = relationship("GroupPost", back_populates="comments")
    author = relationship("User")


class DiscussionThread(Base):
    __tablename__ = "discussion_threads"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    body = Column(Text, nullable=False)
    category = Column(String(100), nullable=False, index=True)
    district = Column(String(100), nullable=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    linked_complaint_id = Column(Integer, ForeignKey("complaints.id"), nullable=True, index=True)
    linked_project_id = Column(Integer, ForeignKey("projects.id"), nullable=True, index=True)
    upvotes_count = Column(Integer, default=0, nullable=False)
    replies_count = Column(Integer, default=0, nullable=False)
    is_pinned = Column(Boolean, default=False, nullable=False)
    is_locked = Column(Boolean, default=False, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    best_answer_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    author = relationship("User")
    ward = relationship("Ward")
    linked_complaint = relationship("Complaint")
    linked_project = relationship("Project")
    replies = relationship("DiscussionReply", back_populates="thread", cascade="all, delete-orphan", order_by="DiscussionReply.created_at.asc()")
    upvotes = relationship("ThreadUpvote", back_populates="thread", cascade="all, delete-orphan")
    followers = relationship("ThreadFollower", back_populates="thread", cascade="all, delete-orphan")


class DiscussionReply(Base):
    __tablename__ = "discussion_replies"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("discussion_threads.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    parent_id = Column(Integer, ForeignKey("discussion_replies.id"), nullable=True, index=True)
    upvotes_count = Column(Integer, default=0, nullable=False)
    is_best_answer = Column(Boolean, default=False, nullable=False)
    is_hidden = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    thread = relationship("DiscussionThread", back_populates="replies")
    author = relationship("User")
    upvotes = relationship("ReplyUpvote", back_populates="reply", cascade="all, delete-orphan")


class ThreadUpvote(Base):
    __tablename__ = "thread_upvotes"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("discussion_threads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    thread = relationship("DiscussionThread", back_populates="upvotes")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_thread_upvote"),
    )


class ReplyUpvote(Base):
    __tablename__ = "reply_upvotes"

    id = Column(Integer, primary_key=True, index=True)
    reply_id = Column(Integer, ForeignKey("discussion_replies.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    reply = relationship("DiscussionReply", back_populates="upvotes")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("reply_id", "user_id", name="uq_reply_upvote"),
    )


class ThreadFollower(Base):
    __tablename__ = "thread_followers"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("discussion_threads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    thread = relationship("DiscussionThread", back_populates="followers")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint("thread_id", "user_id", name="uq_thread_follower"),
    )


class CitizenConnection(Base):
    __tablename__ = "citizen_connections"

    id = Column(Integer, primary_key=True, index=True)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(SQLEnum(ConnectionStatus), default=ConnectionStatus.PENDING, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    requester = relationship("User", foreign_keys=[requester_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

    __table_args__ = (
        UniqueConstraint("requester_id", "receiver_id", name="uq_citizen_connection"),
    )


class ContentFlag(Base):
    __tablename__ = "content_flags"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content_type = Column(String(50), nullable=False)  # "group_post", "group_comment", "thread", "thread_reply"
    content_id = Column(Integer, nullable=False, index=True)
    reason = Column(String(255), nullable=False)
    status = Column(SQLEnum(FlagStatus), default=FlagStatus.PENDING, nullable=False, index=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    action_taken = Column(String(50), nullable=True)  # "hidden", "warned", "dismissed"
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    reporter = relationship("User", foreign_keys=[reporter_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])


class ModerationAuditLog(Base):
    __tablename__ = "moderation_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # "hide_content", "warn_user", "dismiss_flag", "pin_post"
    target_type = Column(String(50), nullable=False)
    target_id = Column(Integer, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    actor = relationship("User")


class LearningModule(Base):
    __tablename__ = "learning_modules"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    difficulty = Column(SQLEnum(ModuleDifficulty), default=ModuleDifficulty.BEGINNER, nullable=False)
    duration_minutes = Column(Integer, default=20, nullable=False)
    points = Column(Integer, default=50, nullable=False)
    bonus_points = Column(Integer, default=25, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    language = Column(String(10), default="en", nullable=False)
    is_published = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    lessons = relationship("ModuleLesson", back_populates="module", cascade="all, delete-orphan", order_by="ModuleLesson.display_order")
    quiz_questions = relationship("QuizQuestion", back_populates="module", cascade="all, delete-orphan", order_by="QuizQuestion.display_order")
    progress_records = relationship("UserModuleProgress", back_populates="module", cascade="all, delete-orphan")
    certificates = relationship("Certificate", back_populates="module")


class ModuleLesson(Base):
    __tablename__ = "module_lessons"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    display_order = Column(Integer, default=1, nullable=False)
    content_markdown = Column(Text, nullable=False)
    video_url = Column(String(500), nullable=True)
    duration_minutes = Column(Integer, default=5, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    module = relationship("LearningModule", back_populates="lessons")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # list of strings: ["Option A", "Option B", ...]
    correct_option_index = Column(Integer, nullable=False)  # 0-indexed
    explanation = Column(Text, nullable=False)
    display_order = Column(Integer, default=1, nullable=False)

    module = relationship("LearningModule", back_populates="quiz_questions")


class UserModuleProgress(Base):
    __tablename__ = "user_module_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("learning_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(SQLEnum(ModuleProgressStatus), default=ModuleProgressStatus.NOT_STARTED, nullable=False)
    current_lesson_order = Column(Integer, default=1, nullable=False)
    completed_lesson_ids = Column(JSON, default=list, nullable=False)
    score = Column(Float, default=0.0, nullable=False)
    passed = Column(Boolean, default=False, nullable=False)
    attempts_count = Column(Integer, default=0, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'module_id', name='uq_user_module_progress'),
    )

    user = relationship("User", back_populates="module_progress")
    module = relationship("LearningModule", back_populates="progress_records")


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(Integer, ForeignKey("learning_modules.id", ondelete="SET NULL"), nullable=True, index=True)
    certificate_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    score = Column(Float, default=100.0, nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="certificates")
    module = relationship("LearningModule", back_populates="certificates")


# ==========================================
# Adopt-a-Spot (Milestone F5)
# ==========================================
class SpotType(str, enum.Enum):
    PARK = "park"
    BUS_STOP = "bus_stop"
    WATER_BODY = "water_body"
    STREET = "street"
    SCHOOL_SURROUNDINGS = "school_surroundings"
    DRAIN = "drain"
    PUBLIC_TOILET = "public_toilet"
    OTHER = "other"


class SpotStatus(str, enum.Enum):
    AVAILABLE = "available"
    PENDING_APPROVAL = "pending_approval"
    ADOPTED = "adopted"
    MAINTENANCE = "maintenance"


class CareFrequency(str, enum.Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class Spot(Base):
    __tablename__ = "spots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    spot_type = Column(SQLEnum(SpotType), default=SpotType.PARK, nullable=False, index=True)
    description = Column(Text, nullable=True)
    address = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    district = Column(String(100), nullable=False, index=True)
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True, index=True)
    status = Column(SQLEnum(SpotStatus), default=SpotStatus.AVAILABLE, nullable=False, index=True)
    adopted_by = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    adopted_at = Column(DateTime, nullable=True)
    commitment_actions = Column(JSON, default=list, nullable=False)
    care_frequency = Column(SQLEnum(CareFrequency), default=CareFrequency.WEEKLY, nullable=False)
    last_checkin_at = Column(DateTime, nullable=True)
    missed_checkins_count = Column(Integer, default=0, nullable=False)
    max_missed_checkins = Column(Integer, default=3, nullable=False)
    photo_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    ward = relationship("Ward")
    department = relationship("Department")
    adopter = relationship("User", foreign_keys=[adopted_by])
    checkins = relationship("SpotCheckin", back_populates="spot", cascade="all, delete-orphan", order_by="SpotCheckin.created_at.desc()")
    adoption_history = relationship("SpotAdoptionHistory", back_populates="spot", cascade="all, delete-orphan", order_by="SpotAdoptionHistory.created_at.desc()")
    complaints = relationship("Complaint", back_populates="spot")


class SpotCheckin(Base):
    __tablename__ = "spot_checkins"

    id = Column(Integer, primary_key=True, index=True)
    spot_id = Column(Integer, ForeignKey("spots.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    note = Column(Text, nullable=False)
    photo_url = Column(String(500), nullable=True)
    actions_completed = Column(JSON, default=list, nullable=False)
    points_awarded = Column(Integer, default=15, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    spot = relationship("Spot", back_populates="checkins")
    user = relationship("User")


class SpotAdoptionHistory(Base):
    __tablename__ = "spot_adoptions_history"

    id = Column(Integer, primary_key=True, index=True)
    spot_id = Column(Integer, ForeignKey("spots.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    spot = relationship("Spot", back_populates="adoption_history")
    user = relationship("User")


# ==========================================
# Seasonal Campaigns (Milestone F6)
# ==========================================
class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class CampaignTaskType(str, enum.Enum):
    REPORT_ISSUES = "report_issues"
    VERIFY_REPORTS = "verify_reports"
    COMPLETE_MODULE = "complete_module"
    ADOPT_SPOT = "adopt_spot"


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    season_theme = Column(String(100), nullable=False, index=True)
    banner_image_url = Column(String(500), nullable=True)
    start_at = Column(DateTime, nullable=False, index=True)
    end_at = Column(DateTime, nullable=False, index=True)
    target_metric = Column(String(100), default="reports_filed", nullable=False)
    target_value = Column(Integer, default=100, nullable=False)
    region = Column(String(100), default="Chennai", nullable=False, index=True)
    status = Column(SQLEnum(CampaignStatus), default=CampaignStatus.SCHEDULED, nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey("badges.id", ondelete="SET NULL"), nullable=True)
    points_reward = Column(Integer, default=50, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    badge = relationship("Badge")
    creator = relationship("User", foreign_keys=[created_by])
    tasks = relationship("CampaignTask", back_populates="campaign", cascade="all, delete-orphan", order_by="CampaignTask.display_order")
    participants = relationship("CampaignParticipant", back_populates="campaign", cascade="all, delete-orphan")


class CampaignTask(Base):
    __tablename__ = "campaign_tasks"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    task_type = Column(SQLEnum(CampaignTaskType), nullable=False)
    target_count = Column(Integer, default=1, nullable=False)
    points_reward = Column(Integer, default=20, nullable=False)
    display_order = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    campaign = relationship("Campaign", back_populates="tasks")
    user_progress = relationship("CampaignUserTaskProgress", back_populates="task", cascade="all, delete-orphan")


class CampaignParticipant(Base):
    __tablename__ = "campaign_participants"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)
    points_earned = Column(Integer, default=0, nullable=False)

    __table_args__ = (
        UniqueConstraint("campaign_id", "user_id", name="uq_campaign_participant"),
    )

    campaign = relationship("Campaign", back_populates="participants")
    user = relationship("User")


class CampaignUserTaskProgress(Base):
    __tablename__ = "campaign_user_task_progress"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("campaign_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    current_count = Column(Integer, default=0, nullable=False)
    is_completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("task_id", "user_id", name="uq_campaign_user_task_progress"),
    )

    task = relationship("CampaignTask", back_populates="user_progress")
    user = relationship("User")





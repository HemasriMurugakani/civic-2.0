from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models.entities import GroupVisibility, GroupMemberRole, FlagStatus, ConnectionStatus


# ==========================================
# Groups Schemas
# ==========================================
class GroupCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., min_length=2, max_length=100)
    district: Optional[str] = "Chennai"
    ward_id: Optional[int] = None
    visibility: GroupVisibility = GroupVisibility.PUBLIC


class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    category: Optional[str] = None
    district: Optional[str] = None
    ward_id: Optional[int] = None
    visibility: Optional[GroupVisibility] = None


class GroupListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None
    category: str
    district: Optional[str] = None
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    visibility: GroupVisibility
    moderator_id: int
    moderator_name: str
    member_count: int
    posts_count: int = 0
    is_member: bool = False
    my_role: Optional[str] = None
    last_activity_at: datetime
    created_at: datetime


class GroupPostCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    content: str = Field(..., min_length=5)


class GroupCommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    parent_id: Optional[int] = None


class GroupCommentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    post_id: int
    author_id: int
    author_name: str
    author_role: str
    content: str
    parent_id: Optional[int] = None
    is_hidden: bool = False
    created_at: datetime


class GroupPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    group_id: int
    author_id: int
    author_name: str
    author_role: str
    title: str
    content: str
    is_pinned: bool
    is_hidden: bool = False
    upvotes_count: int
    comments_count: int = 0
    comments: List[GroupCommentResponse] = []
    created_at: datetime


class GroupDetail(GroupListItem):
    posts: List[GroupPostResponse] = []


# ==========================================
# Discussion Threads Schemas
# ==========================================
class ThreadCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    body: str = Field(..., min_length=10)
    category: str = Field(..., min_length=2, max_length=100)
    district: Optional[str] = "Chennai"
    ward_id: Optional[int] = None
    linked_complaint_id: Optional[int] = None
    linked_project_id: Optional[int] = None


class ThreadReplyCreate(BaseModel):
    content: str = Field(..., min_length=2)
    parent_id: Optional[int] = None


class ThreadReplyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    thread_id: int
    author_id: int
    author_name: str
    author_role: str
    author_level: int = 1
    content: str
    parent_id: Optional[int] = None
    upvotes_count: int
    has_upvoted: bool = False
    is_best_answer: bool
    is_hidden: bool = False
    created_at: datetime


class ThreadListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    district: Optional[str] = None
    ward_id: Optional[int] = None
    ward_name: Optional[str] = None
    author_id: int
    author_name: str
    author_role: str
    author_level: int = 1
    upvotes_count: int
    replies_count: int
    has_upvoted: bool = False
    is_following: bool = False
    is_pinned: bool
    is_locked: bool
    has_best_answer: bool = False
    linked_complaint_id: Optional[int] = None
    linked_project_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class ThreadDetail(ThreadListItem):
    body: str
    linked_complaint_title: Optional[str] = None
    linked_project_title: Optional[str] = None
    replies: List[ThreadReplyResponse] = []


# ==========================================
# Citizen Connections Schemas
# ==========================================
class ConnectionRequestCreate(BaseModel):
    receiver_id: int


class ConnectionItem(BaseModel):
    id: int
    other_user_id: int
    other_user_name: str
    other_user_public_id: Optional[str] = None
    status: ConnectionStatus
    direction: str  # "incoming" or "outgoing"
    created_at: datetime


# ==========================================
# Moderation & Content Safety Schemas
# ==========================================
class ContentFlagCreate(BaseModel):
    content_type: str = Field(..., description="group_post, group_comment, thread, thread_reply")
    content_id: int
    reason: str = Field(..., min_length=3, max_length=255)


class ContentFlagItem(BaseModel):
    id: int
    reporter_id: int
    reporter_name: str
    content_type: str
    content_id: int
    content_snippet: str
    reason: str
    status: FlagStatus
    action_taken: Optional[str] = None
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class ModerationActionPayload(BaseModel):
    action: str = Field(..., description="hide, warn, dismiss")
    note: Optional[str] = None


class ModerationAuditLogItem(BaseModel):
    id: int
    actor_id: int
    actor_name: str
    action: str
    target_type: str
    target_id: int
    note: Optional[str] = None
    created_at: datetime

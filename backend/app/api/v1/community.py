from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user, get_optional_current_user
from app.models.entities import User, UserRole
from app.services.community_service import CommunityService
from app.schemas.community import (
    GroupCreate,
    GroupListItem,
    GroupDetail,
    GroupPostCreate,
    GroupPostResponse,
    GroupCommentCreate,
    GroupCommentResponse,
    ThreadCreate,
    ThreadListItem,
    ThreadDetail,
    ThreadReplyCreate,
    ThreadReplyResponse,
    ConnectionRequestCreate,
    ConnectionItem,
    ContentFlagCreate,
    ContentFlagItem,
    ModerationActionPayload,
    ModerationAuditLogItem,
)

router = APIRouter(prefix="/community", tags=["Community Hub"])


# ==========================================
# Local Groups
# ==========================================
@router.get("/groups", response_model=List[GroupListItem])
def list_groups(
    search: Optional[str] = None,
    category: Optional[str] = None,
    ward_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """List active local groups with category and ward filtering."""
    service = CommunityService(db)
    return service.list_groups(
        search=search,
        category=category,
        ward_id=ward_id,
        current_user=current_user,
        limit=limit,
        offset=offset,
    )


@router.post("/groups", response_model=GroupListItem, status_code=status.HTTP_201_CREATED)
def create_group(
    payload: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new local group. Creator becomes initial Moderator."""
    service = CommunityService(db)
    g = service.create_group(current_user, payload)
    detail = service.get_group_detail(g.id, current_user)
    return detail


@router.get("/groups/{group_id}", response_model=GroupDetail)
def get_group_detail(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get group overview, pinned posts, and discussion feed."""
    service = CommunityService(db)
    return service.get_group_detail(group_id, current_user)


@router.post("/groups/{group_id}/join")
def join_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Join a civic community group."""
    service = CommunityService(db)
    return service.join_group(group_id, current_user)


@router.post("/groups/{group_id}/leave")
def leave_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Leave a community group."""
    service = CommunityService(db)
    return service.leave_group(group_id, current_user)


@router.post("/groups/{group_id}/posts", response_model=GroupPostResponse, status_code=status.HTTP_201_CREATED)
def create_group_post(
    group_id: int,
    payload: GroupPostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a post in a group."""
    service = CommunityService(db)
    p = service.create_group_post(group_id, current_user, payload)
    return {
        "id": p.id,
        "group_id": p.group_id,
        "author_id": p.author_id,
        "author_name": current_user.name,
        "author_role": current_user.role.value,
        "title": p.title,
        "content": p.content,
        "is_pinned": p.is_pinned,
        "is_hidden": p.is_hidden,
        "upvotes_count": p.upvotes_count,
        "comments_count": 0,
        "comments": [],
        "created_at": p.created_at,
    }


@router.post("/groups/posts/{post_id}/pin")
def pin_group_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pin or unpin a post. RBAC: Group Moderator or Administrators."""
    service = CommunityService(db)
    is_pinned = service.toggle_pin_post(post_id, current_user)
    return {"success": True, "is_pinned": is_pinned}


@router.post("/groups/posts/{post_id}/comments", response_model=GroupCommentResponse, status_code=status.HTTP_201_CREATED)
def add_group_post_comment(
    post_id: int,
    payload: GroupCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a comment or reply to a group post."""
    service = CommunityService(db)
    c = service.add_group_comment(post_id, current_user, payload)
    return {
        "id": c.id,
        "post_id": c.post_id,
        "author_id": c.author_id,
        "author_name": current_user.name,
        "author_role": current_user.role.value,
        "content": c.content,
        "parent_id": c.parent_id,
        "is_hidden": c.is_hidden,
        "created_at": c.created_at,
    }


# ==========================================
# Discussion Threads
# ==========================================
@router.get("/threads", response_model=List[ThreadListItem])
def list_threads(
    category: Optional[str] = None,
    search: Optional[str] = None,
    ward_id: Optional[int] = None,
    sort_by: str = Query("new", description="new, top, active"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """List discussion threads with upvotes and reply counts."""
    service = CommunityService(db)
    return service.list_threads(
        category=category,
        search=search,
        ward_id=ward_id,
        sort_by=sort_by,
        current_user=current_user,
        limit=limit,
        offset=offset,
    )


@router.post("/threads", response_model=ThreadListItem, status_code=status.HTTP_201_CREATED)
def create_thread(
    payload: ThreadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new public civic discussion thread."""
    service = CommunityService(db)
    t = service.create_thread(current_user, payload)
    detail = service.get_thread_detail(t.id, current_user)
    return detail


@router.get("/threads/{thread_id}", response_model=ThreadDetail)
def get_thread_detail(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """Get discussion thread details with complete reply tree and vote state."""
    service = CommunityService(db)
    return service.get_thread_detail(thread_id, current_user)


@router.post("/threads/{thread_id}/upvote")
def upvote_thread(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle upvote on a discussion thread."""
    service = CommunityService(db)
    return service.toggle_thread_upvote(thread_id, current_user)


@router.post("/threads/{thread_id}/follow")
def follow_thread(
    thread_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Follow or unfollow a thread for notifications."""
    service = CommunityService(db)
    is_following = service.toggle_follow_thread(thread_id, current_user)
    return {"success": True, "is_following": is_following}


@router.post("/threads/{thread_id}/replies", response_model=ThreadReplyResponse, status_code=status.HTTP_201_CREATED)
def create_thread_reply(
    thread_id: int,
    payload: ThreadReplyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Post a reply to a discussion thread."""
    service = CommunityService(db)
    r = service.create_thread_reply(thread_id, current_user, payload)
    return {
        "id": r.id,
        "thread_id": r.thread_id,
        "author_id": r.author_id,
        "author_name": current_user.public_display_name or current_user.name,
        "author_role": current_user.role.value,
        "author_level": service.gamification.calculate_level(service.gamification.get_user_points(current_user.id))["level"],
        "content": r.content,
        "parent_id": r.parent_id,
        "upvotes_count": r.upvotes_count,
        "has_upvoted": False,
        "is_best_answer": r.is_best_answer,
        "is_hidden": r.is_hidden,
        "created_at": r.created_at,
    }


@router.post("/threads/replies/{reply_id}/upvote")
def upvote_thread_reply(
    reply_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Toggle upvote on a reply."""
    service = CommunityService(db)
    return service.toggle_reply_upvote(reply_id, current_user)


@router.post("/threads/{thread_id}/replies/{reply_id}/best-answer")
def mark_best_answer(
    thread_id: int,
    reply_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a reply as the best answer. Author or Admins only."""
    service = CommunityService(db)
    return service.mark_best_answer(thread_id, reply_id, current_user)


# ==========================================
# Citizen Connections
# ==========================================
@router.get("/connections", response_model=List[ConnectionItem])
def list_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List incoming, outgoing, and accepted connections."""
    service = CommunityService(db)
    return service.list_connections(current_user)


@router.post("/connections/request")
def request_connection(
    payload: ConnectionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send connection request to another citizen."""
    service = CommunityService(db)
    return service.send_connection_request(current_user, payload.receiver_id)


@router.post("/connections/{connection_id}/respond")
def respond_connection(
    connection_id: int,
    action: str = Query(..., description="accept, reject, block"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept, reject, or block connection request."""
    service = CommunityService(db)
    return service.respond_to_connection(connection_id, current_user, action)


# ==========================================
# Moderation & Content Safety
# ==========================================
@router.post("/flags")
def flag_content(
    payload: ContentFlagCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Flag suspicious, spam, or abusive content."""
    service = CommunityService(db)
    flag = service.flag_content(current_user, payload)
    return {"success": True, "flag_id": flag.id, "message": "Content submitted for moderation review"}


@router.get("/flags", response_model=List[ContentFlagItem])
def list_moderation_flags(
    status: Optional[str] = "pending",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View flagged items in the moderation queue. RBAC: Admins or Officers."""
    if current_user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN, UserRole.OFFICER]:
        raise HTTPException(status_code=403, detail="Moderation queue restricted to staff")

    service = CommunityService(db)
    return service.list_flags(status_filter=status, current_user=current_user)


@router.post("/flags/{flag_id}/action")
def take_moderation_action(
    flag_id: int,
    payload: ModerationActionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resolve a flag (hide content, warn user, or dismiss)."""
    if current_user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN]:
        raise HTTPException(status_code=403, detail="Moderation actions restricted to administrators")

    service = CommunityService(db)
    return service.take_moderation_action(flag_id, current_user, payload)


@router.get("/audit-logs", response_model=List[ModerationAuditLogItem])
def list_moderation_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """View moderation audit trail. RBAC: Admins."""
    if current_user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN]:
        raise HTTPException(status_code=403, detail="Audit logs restricted to administrators")

    service = CommunityService(db)
    return service.list_audit_logs(limit=limit, offset=offset)

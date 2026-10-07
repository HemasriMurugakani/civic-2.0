import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from fastapi import HTTPException, status

from app.models.entities import (
    Group, GroupMembership, GroupPost, GroupPostComment,
    DiscussionThread, DiscussionReply, ThreadUpvote, ReplyUpvote, ThreadFollower,
    CitizenConnection, ContentFlag, ModerationAuditLog,
    GroupVisibility, GroupMemberRole, FlagStatus, ConnectionStatus,
    User, UserRole, Ward, Complaint, Project, Notification
)
from app.schemas.community import (
    GroupCreate, GroupUpdate, GroupPostCreate, GroupCommentCreate,
    ThreadCreate, ThreadReplyCreate, ContentFlagCreate, ModerationActionPayload
)
from app.services.gamification_service import GamificationService

# Rule-based moderation: Banned words list
BANNED_WORDS = [
    "scam", "phishing", "fake_scheme", "buy_crypto", "free_money",
    "lottery_winner", "click_here_now", "porn", "gambling_club"
]


class CommunityService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    @staticmethod
    def validate_content_safety(text: str) -> None:
        """Rule-based content filtering: checks banned words and excessive URLs."""
        if not text:
            return

        text_lower = text.lower()
        for bw in BANNED_WORDS:
            if bw in text_lower:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Content contains restricted term: '{bw}'. Please keep civic discussions civil and relevant."
                )

        # Link limits: max 2 hyperlinks per post to prevent spam
        urls = re.findall(r'https?://\S+', text)
        if len(urls) > 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Posts cannot contain more than 2 external hyperlinks."
            )

    # ==========================================
    # Groups Methods
    # ==========================================
    def list_groups(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        ward_id: Optional[int] = None,
        current_user: Optional[User] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List active civic community groups with member status."""
        query = self.db.query(Group).filter(Group.is_active == True)

        if search:
            s_clean = f"%{search.strip()}%"
            query = query.filter(or_(Group.name.ilike(s_clean), Group.description.ilike(s_clean)))

        if category and category.lower() != "all":
            query = query.filter(func.lower(Group.category) == category.lower())

        if ward_id:
            query = query.filter(Group.ward_id == ward_id)

        groups = query.order_by(desc(Group.last_activity_at)).offset(offset).limit(limit).all()

        user_memberships = {}
        if current_user:
            m_list = self.db.query(GroupMembership).filter(
                GroupMembership.user_id == current_user.id
            ).all()
            user_memberships = {m.group_id: m.role.value for m in m_list}

        result = []
        for g in groups:
            p_count = self.db.query(GroupPost).filter(
                GroupPost.group_id == g.id, GroupPost.is_hidden == False
            ).count()

            result.append({
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "category": g.category,
                "district": g.district,
                "ward_id": g.ward_id,
                "ward_name": g.ward.name if g.ward else None,
                "visibility": g.visibility,
                "moderator_id": g.moderator_id,
                "moderator_name": g.moderator.name if g.moderator else "Moderator",
                "member_count": g.member_count,
                "posts_count": p_count,
                "is_member": g.id in user_memberships,
                "my_role": user_memberships.get(g.id),
                "last_activity_at": g.last_activity_at,
                "created_at": g.created_at,
            })
        return result

    def get_group_detail(self, group_id: int, current_user: Optional[User] = None) -> Dict[str, Any]:
        """Fetch group details with posts and membership role."""
        group = self.db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
        if not group:
            raise HTTPException(status_code=404, detail="Community group not found")

        my_role = None
        is_member = False
        if current_user:
            m = self.db.query(GroupMembership).filter(
                GroupMembership.group_id == group.id,
                GroupMembership.user_id == current_user.id
            ).first()
            if m:
                is_member = True
                my_role = m.role.value

        # Fetch visible posts
        posts = self.db.query(GroupPost).filter(
            GroupPost.group_id == group.id,
            GroupPost.is_hidden == False
        ).order_by(desc(GroupPost.is_pinned), desc(GroupPost.created_at)).limit(50).all()

        posts_data = []
        for p in posts:
            comments = self.db.query(GroupPostComment).filter(
                GroupPostComment.post_id == p.id,
                GroupPostComment.is_hidden == False
            ).order_by(GroupPostComment.created_at.asc()).all()

            posts_data.append({
                "id": p.id,
                "group_id": p.group_id,
                "author_id": p.author_id,
                "author_name": p.author.name if p.author else "Citizen",
                "author_role": p.author.role.value if p.author else "citizen",
                "title": p.title,
                "content": p.content,
                "is_pinned": p.is_pinned,
                "is_hidden": p.is_hidden,
                "upvotes_count": p.upvotes_count,
                "comments_count": len(comments),
                "comments": [
                    {
                        "id": c.id,
                        "post_id": c.post_id,
                        "author_id": c.author_id,
                        "author_name": c.author.name if c.author else "Citizen",
                        "author_role": c.author.role.value if c.author else "citizen",
                        "content": c.content,
                        "parent_id": c.parent_id,
                        "is_hidden": c.is_hidden,
                        "created_at": c.created_at,
                    }
                    for c in comments
                ],
                "created_at": p.created_at,
            })

        return {
            "id": group.id,
            "name": group.name,
            "description": group.description,
            "category": group.category,
            "district": group.district,
            "ward_id": group.ward_id,
            "ward_name": group.ward.name if group.ward else None,
            "visibility": group.visibility,
            "moderator_id": group.moderator_id,
            "moderator_name": group.moderator.name if group.moderator else "Moderator",
            "member_count": group.member_count,
            "posts_count": len(posts),
            "is_member": is_member,
            "my_role": my_role,
            "last_activity_at": group.last_activity_at,
            "created_at": group.created_at,
            "posts": posts_data,
        }

    def create_group(self, current_user: User, payload: GroupCreate) -> Group:
        """Create a new local group. Creator becomes initial Moderator."""
        self.validate_content_safety(payload.name + " " + (payload.description or ""))

        group = Group(
            name=payload.name.strip(),
            description=payload.description.strip() if payload.description else None,
            category=payload.category.strip(),
            district=payload.district or "Chennai",
            ward_id=payload.ward_id,
            visibility=payload.visibility,
            moderator_id=current_user.id,
            member_count=1,
            last_activity_at=datetime.utcnow(),
            created_at=datetime.utcnow(),
        )
        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)

        # Add moderator membership
        membership = GroupMembership(
            group_id=group.id,
            user_id=current_user.id,
            role=GroupMemberRole.MODERATOR,
            joined_at=datetime.utcnow()
        )
        self.db.add(membership)
        self.db.commit()

        # Gamification reward for creating civic group
        self.gamification.award_points(
            user_id=current_user.id,
            reason="group_created",
            source_type="group",
            source_id=str(group.id),
            points=25
        )

        return group

    def join_group(self, group_id: int, current_user: User) -> Dict[str, Any]:
        """Join a civic community group."""
        group = self.db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        existing = self.db.query(GroupMembership).filter(
            GroupMembership.group_id == group.id,
            GroupMembership.user_id == current_user.id
        ).first()

        if existing:
            return {"success": True, "message": "Already a member", "role": existing.role.value}

        m = GroupMembership(
            group_id=group.id,
            user_id=current_user.id,
            role=GroupMemberRole.MEMBER,
            joined_at=datetime.utcnow()
        )
        self.db.add(m)
        group.member_count += 1
        group.last_activity_at = datetime.utcnow()
        self.db.commit()

        return {"success": True, "message": "Joined group successfully", "role": "member"}

    def leave_group(self, group_id: int, current_user: User) -> Dict[str, Any]:
        """Leave a community group."""
        group = self.db.query(Group).filter(Group.id == group_id).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        membership = self.db.query(GroupMembership).filter(
            GroupMembership.group_id == group.id,
            GroupMembership.user_id == current_user.id
        ).first()

        if not membership:
            raise HTTPException(status_code=400, detail="You are not a member of this group")

        # Moderator safeguard
        if membership.role == GroupMemberRole.MODERATOR:
            other_mods = self.db.query(GroupMembership).filter(
                GroupMembership.group_id == group.id,
                GroupMembership.user_id != current_user.id,
                GroupMembership.role == GroupMemberRole.MODERATOR
            ).count()
            if other_mods == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot leave as the only moderator. Please assign another moderator first."
                )

        self.db.delete(membership)
        group.member_count = max(group.member_count - 1, 0)
        self.db.commit()

        return {"success": True, "message": "Left group successfully"}

    def create_group_post(self, group_id: int, current_user: User, payload: GroupPostCreate) -> GroupPost:
        """Create a post in a group."""
        group = self.db.query(Group).filter(Group.id == group_id, Group.is_active == True).first()
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        # Check membership
        membership = self.db.query(GroupMembership).filter(
            GroupMembership.group_id == group.id,
            GroupMembership.user_id == current_user.id
        ).first()
        if not membership and current_user.role not in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN]:
            raise HTTPException(status_code=403, detail="You must join this group before posting")

        self.validate_content_safety(payload.title + " " + payload.content)

        post = GroupPost(
            group_id=group.id,
            author_id=current_user.id,
            title=payload.title.strip(),
            content=payload.content.strip(),
            is_pinned=False,
            is_hidden=False,
            upvotes_count=0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(post)
        group.last_activity_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(post)

        # Gamification reward for posting in civic group
        self.gamification.award_points(
            user_id=current_user.id,
            reason="post_made",
            source_type="group_post",
            source_id=str(post.id),
            points=5
        )

        return post

    def toggle_pin_post(self, post_id: int, current_user: User) -> bool:
        """Pin or unpin a post. Only Group Moderators or Admins can pin."""
        post = self.db.query(GroupPost).filter(GroupPost.id == post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        # Check moderator permission
        membership = self.db.query(GroupMembership).filter(
            GroupMembership.group_id == post.group_id,
            GroupMembership.user_id == current_user.id
        ).first()

        is_mod = membership and membership.role == GroupMemberRole.MODERATOR
        is_admin = current_user.role in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN]

        if not (is_mod or is_admin):
            raise HTTPException(status_code=403, detail="Only group moderators or administrators can pin posts")

        post.is_pinned = not post.is_pinned
        self.db.commit()

        # Log moderation audit
        self.db.add(ModerationAuditLog(
            actor_id=current_user.id,
            action="pin_post" if post.is_pinned else "unpin_post",
            target_type="group_post",
            target_id=post.id,
            note=f"Post '{post.title[:30]}' pin toggled by {current_user.name}",
            created_at=datetime.utcnow()
        ))
        self.db.commit()

        return post.is_pinned

    def add_group_comment(self, post_id: int, current_user: User, payload: GroupCommentCreate) -> GroupPostComment:
        """Add a comment or nested reply to a group post."""
        post = self.db.query(GroupPost).filter(GroupPost.id == post_id, GroupPost.is_hidden == False).first()
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        self.validate_content_safety(payload.content)

        comment = GroupPostComment(
            post_id=post.id,
            author_id=current_user.id,
            content=payload.content.strip(),
            parent_id=payload.parent_id,
            is_hidden=False,
            created_at=datetime.utcnow(),
        )
        self.db.add(comment)

        # Update group activity
        group = self.db.query(Group).filter(Group.id == post.group_id).first()
        if group:
            group.last_activity_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(comment)
        return comment

    # ==========================================
    # Discussion Threads Methods
    # ==========================================
    def list_threads(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        ward_id: Optional[int] = None,
        sort_by: str = "new",  # "new", "top", "active"
        current_user: Optional[User] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List discussion threads with upvote and following status."""
        query = self.db.query(DiscussionThread).filter(DiscussionThread.is_hidden == False)

        if search:
            s_clean = f"%{search.strip()}%"
            query = query.filter(or_(DiscussionThread.title.ilike(s_clean), DiscussionThread.body.ilike(s_clean)))

        if category and category.lower() != "all":
            query = query.filter(func.lower(DiscussionThread.category) == category.lower())

        if ward_id:
            query = query.filter(DiscussionThread.ward_id == ward_id)

        # Sort order
        if sort_by == "top":
            query = query.order_by(desc(DiscussionThread.is_pinned), desc(DiscussionThread.upvotes_count))
        elif sort_by == "active":
            query = query.order_by(desc(DiscussionThread.is_pinned), desc(DiscussionThread.updated_at))
        else:
            query = query.order_by(desc(DiscussionThread.is_pinned), desc(DiscussionThread.created_at))

        threads = query.offset(offset).limit(limit).all()

        user_upvotes = set()
        user_follows = set()
        if current_user:
            t_ids = [t.id for t in threads]
            upvoted = self.db.query(ThreadUpvote.thread_id).filter(
                ThreadUpvote.thread_id.in_(t_ids),
                ThreadUpvote.user_id == current_user.id
            ).all()
            user_upvotes = {u[0] for u in upvoted}

            followed = self.db.query(ThreadFollower.thread_id).filter(
                ThreadFollower.thread_id.in_(t_ids),
                ThreadFollower.user_id == current_user.id
            ).all()
            user_follows = {f[0] for f in followed}

        return [
            {
                "id": t.id,
                "title": t.title,
                "category": t.category,
                "district": t.district,
                "ward_id": t.ward_id,
                "ward_name": t.ward.name if t.ward else None,
                "author_id": t.author_id,
                "author_name": t.author.public_display_name or t.author.name if t.author else "Citizen",
                "author_role": t.author.role.value if t.author else "citizen",
                "author_level": self.gamification.calculate_level(self.gamification.get_user_points(t.author_id))["level"] if t.author_id else 1,
                "upvotes_count": t.upvotes_count,
                "replies_count": t.replies_count,
                "has_upvoted": t.id in user_upvotes,
                "is_following": t.id in user_follows,
                "is_pinned": t.is_pinned,
                "is_locked": t.is_locked,
                "has_best_answer": t.best_answer_id is not None,
                "linked_complaint_id": t.linked_complaint_id,
                "linked_project_id": t.linked_project_id,
                "created_at": t.created_at,
                "updated_at": t.updated_at,
            }
            for t in threads
        ]

    def get_thread_detail(self, thread_id: int, current_user: Optional[User] = None) -> Dict[str, Any]:
        """Fetch complete thread with nested replies, vote states, and linked entities."""
        thread = self.db.query(DiscussionThread).filter(
            DiscussionThread.id == thread_id,
            DiscussionThread.is_hidden == False
        ).first()
        if not thread:
            raise HTTPException(status_code=404, detail="Discussion thread not found")

        has_upvoted = False
        is_following = False
        if current_user:
            has_upvoted = self.db.query(ThreadUpvote).filter(
                ThreadUpvote.thread_id == thread.id,
                ThreadUpvote.user_id == current_user.id
            ).first() is not None

            is_following = self.db.query(ThreadFollower).filter(
                ThreadFollower.thread_id == thread.id,
                ThreadFollower.user_id == current_user.id
            ).first() is not None

        # Fetch visible replies
        replies = self.db.query(DiscussionReply).filter(
            DiscussionReply.thread_id == thread.id,
            DiscussionReply.is_hidden == False
        ).order_by(desc(DiscussionReply.is_best_answer), DiscussionReply.created_at.asc()).all()

        user_reply_upvotes = set()
        if current_user:
            r_ids = [r.id for r in replies]
            r_upvoted = self.db.query(ReplyUpvote.reply_id).filter(
                ReplyUpvote.reply_id.in_(r_ids),
                ReplyUpvote.user_id == current_user.id
            ).all()
            user_reply_upvotes = {ru[0] for ru in r_upvoted}

        replies_data = [
            {
                "id": r.id,
                "thread_id": r.thread_id,
                "author_id": r.author_id,
                "author_name": r.author.public_display_name or r.author.name if r.author else "Citizen",
                "author_role": r.author.role.value if r.author else "citizen",
                "author_level": self.gamification.calculate_level(self.gamification.get_user_points(r.author_id))["level"] if r.author_id else 1,
                "content": r.content,
                "parent_id": r.parent_id,
                "upvotes_count": r.upvotes_count,
                "has_upvoted": r.id in user_reply_upvotes,
                "is_best_answer": r.is_best_answer,
                "is_hidden": r.is_hidden,
                "created_at": r.created_at,
            }
            for r in replies
        ]

        return {
            "id": thread.id,
            "title": thread.title,
            "body": thread.body,
            "category": thread.category,
            "district": thread.district,
            "ward_id": thread.ward_id,
            "ward_name": thread.ward.name if thread.ward else None,
            "author_id": thread.author_id,
            "author_name": thread.author.public_display_name or thread.author.name if thread.author else "Citizen",
            "author_role": thread.author.role.value if thread.author else "citizen",
            "author_level": self.gamification.calculate_level(self.gamification.get_user_points(thread.author_id))["level"] if thread.author_id else 1,
            "upvotes_count": thread.upvotes_count,
            "replies_count": thread.replies_count,
            "has_upvoted": has_upvoted,
            "is_following": is_following,
            "is_pinned": thread.is_pinned,
            "is_locked": thread.is_locked,
            "has_best_answer": thread.best_answer_id is not None,
            "linked_complaint_id": thread.linked_complaint_id,
            "linked_complaint_title": thread.linked_complaint.title if thread.linked_complaint else None,
            "linked_project_id": thread.linked_project_id,
            "linked_project_title": thread.linked_project.title if thread.linked_project else None,
            "created_at": thread.created_at,
            "updated_at": thread.updated_at,
            "replies": replies_data,
        }

    def create_thread(self, current_user: User, payload: ThreadCreate) -> DiscussionThread:
        """Create a new public discussion thread."""
        self.validate_content_safety(payload.title + " " + payload.body)

        thread = DiscussionThread(
            title=payload.title.strip(),
            body=payload.body.strip(),
            category=payload.category.strip(),
            district=payload.district or "Chennai",
            ward_id=payload.ward_id,
            author_id=current_user.id,
            linked_complaint_id=payload.linked_complaint_id,
            linked_project_id=payload.linked_project_id,
            upvotes_count=0,
            replies_count=0,
            is_pinned=False,
            is_locked=False,
            is_hidden=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)

        # Auto-subscribe creator as follower
        self.db.add(ThreadFollower(thread_id=thread.id, user_id=current_user.id, created_at=datetime.utcnow()))
        self.db.commit()

        # Gamification reward
        self.gamification.award_points(
            user_id=current_user.id,
            reason="post_made",
            source_type="thread",
            source_id=str(thread.id),
            points=10
        )

        return thread

    def toggle_thread_upvote(self, thread_id: int, current_user: User) -> Dict[str, Any]:
        """Upvote or remove upvote from a discussion thread."""
        thread = self.db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")

        existing = self.db.query(ThreadUpvote).filter(
            ThreadUpvote.thread_id == thread.id,
            ThreadUpvote.user_id == current_user.id
        ).first()

        if existing:
            self.db.delete(existing)
            thread.upvotes_count = max(thread.upvotes_count - 1, 0)
            self.db.commit()
            return {"upvoted": False, "upvotes_count": thread.upvotes_count}
        else:
            self.db.add(ThreadUpvote(thread_id=thread.id, user_id=current_user.id, created_at=datetime.utcnow()))
            thread.upvotes_count += 1
            self.db.commit()
            return {"upvoted": True, "upvotes_count": thread.upvotes_count}

    def create_thread_reply(self, thread_id: int, current_user: User, payload: ThreadReplyCreate) -> DiscussionReply:
        """Post a reply to a discussion thread and notify followers."""
        thread = self.db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        if thread.is_locked:
            raise HTTPException(status_code=400, detail="This discussion thread is locked for new replies")

        self.validate_content_safety(payload.content)

        reply = DiscussionReply(
            thread_id=thread.id,
            author_id=current_user.id,
            content=payload.content.strip(),
            parent_id=payload.parent_id,
            upvotes_count=0,
            is_best_answer=False,
            is_hidden=False,
            created_at=datetime.utcnow(),
        )
        self.db.add(reply)
        thread.replies_count += 1
        thread.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(reply)

        # Notify thread author if not self
        if thread.author_id != current_user.id:
            notif = Notification(
                user_id=thread.author_id,
                title="New Reply on Discussion Thread",
                message=f"{current_user.name} replied to your thread '{thread.title[:40]}'.",
                event_type="community_reply",
                dedupe_key=f"thread_reply_{reply.id}_{thread.author_id}",
                is_read=False,
                created_at=datetime.utcnow(),
            )
            self.db.add(notif)
            self.db.commit()

        # Gamification reward
        self.gamification.award_points(
            user_id=current_user.id,
            reason="post_made",
            source_type="thread_reply",
            source_id=str(reply.id),
            points=5
        )

        return reply

    def toggle_reply_upvote(self, reply_id: int, current_user: User) -> Dict[str, Any]:
        """Upvote or remove upvote from a reply."""
        reply = self.db.query(DiscussionReply).filter(DiscussionReply.id == reply_id).first()
        if not reply:
            raise HTTPException(status_code=404, detail="Reply not found")

        existing = self.db.query(ReplyUpvote).filter(
            ReplyUpvote.reply_id == reply.id,
            ReplyUpvote.user_id == current_user.id
        ).first()

        if existing:
            self.db.delete(existing)
            reply.upvotes_count = max(reply.upvotes_count - 1, 0)
            self.db.commit()
            return {"upvoted": False, "upvotes_count": reply.upvotes_count}
        else:
            self.db.add(ReplyUpvote(reply_id=reply.id, user_id=current_user.id, created_at=datetime.utcnow()))
            reply.upvotes_count += 1
            self.db.commit()
            return {"upvoted": True, "upvotes_count": reply.upvotes_count}

    def mark_best_answer(self, thread_id: int, reply_id: int, current_user: User) -> Dict[str, Any]:
        """Designate a reply as the best answer. Allowed for thread author or Admins."""
        thread = self.db.query(DiscussionThread).filter(DiscussionThread.id == thread_id).first()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")

        is_author = thread.author_id == current_user.id
        is_admin = current_user.role in [UserRole.GOV_ADMIN, UserRole.DEPT_ADMIN]
        if not (is_author or is_admin):
            raise HTTPException(status_code=403, detail="Only the thread author or administrators can designate the best answer")

        reply = self.db.query(DiscussionReply).filter(
            DiscussionReply.id == reply_id,
            DiscussionReply.thread_id == thread.id
        ).first()
        if not reply:
            raise HTTPException(status_code=404, detail="Reply not found in this thread")

        # Clear previous best answer if any
        prev_best = self.db.query(DiscussionReply).filter(
            DiscussionReply.thread_id == thread.id,
            DiscussionReply.is_best_answer == True
        ).all()
        for pb in prev_best:
            pb.is_best_answer = False

        reply.is_best_answer = True
        thread.best_answer_id = reply.id
        self.db.commit()

        # Award points to reply author
        self.gamification.award_points(
            user_id=reply.author_id,
            reason="best_answer_awarded",
            source_type="thread_reply",
            source_id=str(reply.id),
            points=25
        )

        return {"success": True, "best_answer_id": reply.id}

    def toggle_follow_thread(self, thread_id: int, current_user: User) -> bool:
        """Follow or unfollow a thread for reply alerts."""
        existing = self.db.query(ThreadFollower).filter(
            ThreadFollower.thread_id == thread_id,
            ThreadFollower.user_id == current_user.id
        ).first()

        if existing:
            self.db.delete(existing)
            self.db.commit()
            return False
        else:
            self.db.add(ThreadFollower(thread_id=thread_id, user_id=current_user.id, created_at=datetime.utcnow()))
            self.db.commit()
            return True

    # ==========================================
    # Citizen Connections Methods
    # ==========================================
    def send_connection_request(self, requester: User, receiver_id: int) -> Dict[str, Any]:
        """Send connection request to another citizen."""
        if requester.id == receiver_id:
            raise HTTPException(status_code=400, detail="Cannot send a connection request to yourself")

        receiver = self.db.query(User).filter(User.id == receiver_id, User.is_active == True).first()
        if not receiver:
            raise HTTPException(status_code=404, detail="Citizen not found")

        # Check existing connection in either direction
        existing = self.db.query(CitizenConnection).filter(
            or_(
                and_(CitizenConnection.requester_id == requester.id, CitizenConnection.receiver_id == receiver_id),
                and_(CitizenConnection.requester_id == receiver_id, CitizenConnection.receiver_id == requester.id),
            )
        ).first()

        if existing:
            if existing.status == ConnectionStatus.ACCEPTED:
                return {"success": True, "message": "Already connected", "status": "accepted"}
            if existing.status == ConnectionStatus.PENDING:
                return {"success": True, "message": "Connection request pending", "status": "pending"}
            if existing.status == ConnectionStatus.BLOCKED:
                raise HTTPException(status_code=403, detail="Unable to connect with this user")

        conn = CitizenConnection(
            requester_id=requester.id,
            receiver_id=receiver_id,
            status=ConnectionStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(conn)
        self.db.commit()

        # Send notification to receiver
        self.db.add(Notification(
            user_id=receiver_id,
            title="New Civic Connection Request",
            message=f"{requester.public_display_name or requester.name} wants to connect with you.",
            event_type="connection_request",
            dedupe_key=f"conn_req_{conn.id}_{receiver_id}",
            is_read=False,
            created_at=datetime.utcnow(),
        ))
        self.db.commit()

        return {"success": True, "message": "Connection request sent", "status": "pending"}

    def respond_to_connection(self, connection_id: int, current_user: User, action: str) -> Dict[str, Any]:
        """Accept, reject, or block connection."""
        conn = self.db.query(CitizenConnection).filter(CitizenConnection.id == connection_id).first()
        if not conn:
            raise HTTPException(status_code=404, detail="Connection request not found")

        if conn.receiver_id != current_user.id and current_user.role != UserRole.GOV_ADMIN:
            raise HTTPException(status_code=403, detail="Not authorized to respond to this request")

        if action == "accept":
            conn.status = ConnectionStatus.ACCEPTED
        elif action == "reject":
            conn.status = ConnectionStatus.REJECTED
        elif action == "block":
            conn.status = ConnectionStatus.BLOCKED
        else:
            raise HTTPException(status_code=400, detail="Invalid action")

        conn.updated_at = datetime.utcnow()
        self.db.commit()
        return {"success": True, "status": conn.status.value}

    def list_connections(self, current_user: User) -> List[Dict[str, Any]]:
        """List incoming requests, outgoing requests, and active connections."""
        conns = self.db.query(CitizenConnection).filter(
            or_(
                CitizenConnection.requester_id == current_user.id,
                CitizenConnection.receiver_id == current_user.id
            )
        ).order_by(desc(CitizenConnection.updated_at)).all()

        results = []
        for c in conns:
            is_requester = c.requester_id == current_user.id
            other_user = c.receiver if is_requester else c.requester

            results.append({
                "id": c.id,
                "other_user_id": other_user.id if other_user else 0,
                "other_user_name": other_user.public_display_name or other_user.name if other_user else "Citizen",
                "other_user_public_id": other_user.public_id if other_user else None,
                "status": c.status,
                "direction": "outgoing" if is_requester else "incoming",
                "created_at": c.created_at,
            })
        return results

    # ==========================================
    # Moderation & Content Safety Methods
    # ==========================================
    def flag_content(self, current_user: User, payload: ContentFlagCreate) -> ContentFlag:
        """Submit a moderation flag for suspicious or abusive content."""
        flag = ContentFlag(
            reporter_id=current_user.id,
            content_type=payload.content_type,
            content_id=payload.content_id,
            reason=payload.reason.strip(),
            status=FlagStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        self.db.add(flag)
        self.db.commit()
        self.db.refresh(flag)
        return flag

    def list_flags(self, status_filter: Optional[str] = "pending", current_user: Optional[User] = None) -> List[Dict[str, Any]]:
        """List flagged items in the moderation queue."""
        query = self.db.query(ContentFlag)
        if status_filter and status_filter.lower() != "all":
            try:
                f_status = FlagStatus(status_filter.lower())
                query = query.filter(ContentFlag.status == f_status)
            except ValueError:
                pass

        flags = query.order_by(desc(ContentFlag.created_at)).limit(50).all()

        results = []
        for f in flags:
            snippet = "Content details"
            if f.content_type == "thread":
                t = self.db.query(DiscussionThread).filter(DiscussionThread.id == f.content_id).first()
                if t: snippet = f"Thread: {t.title} - {t.body[:60]}"
            elif f.content_type == "thread_reply":
                r = self.db.query(DiscussionReply).filter(DiscussionReply.id == f.content_id).first()
                if r: snippet = f"Reply: {r.content[:80]}"
            elif f.content_type == "group_post":
                gp = self.db.query(GroupPost).filter(GroupPost.id == f.content_id).first()
                if gp: snippet = f"Group Post: {gp.title} - {gp.content[:60]}"
            elif f.content_type == "group_comment":
                gc = self.db.query(GroupPostComment).filter(GroupPostComment.id == f.content_id).first()
                if gc: snippet = f"Group Comment: {gc.content[:80]}"

            results.append({
                "id": f.id,
                "reporter_id": f.reporter_id,
                "reporter_name": f.reporter.name if f.reporter else "Anonymous Reporter",
                "content_type": f.content_type,
                "content_id": f.content_id,
                "content_snippet": snippet,
                "reason": f.reason,
                "status": f.status,
                "action_taken": f.action_taken,
                "reviewed_by_name": f.reviewer.name if f.reviewer else None,
                "reviewed_at": f.reviewed_at,
                "created_at": f.created_at,
            })
        return results

    def take_moderation_action(self, flag_id: int, current_user: User, payload: ModerationActionPayload) -> Dict[str, Any]:
        """Review a flag and execute moderation: hide content, warn user, or dismiss flag."""
        flag = self.db.query(ContentFlag).filter(ContentFlag.id == flag_id).first()
        if not flag:
            raise HTTPException(status_code=404, detail="Flag not found")

        action = payload.action.lower()
        now = datetime.utcnow()

        author_id = None
        if action == "hide":
            # Soft delete / hide target content
            if flag.content_type == "thread":
                item = self.db.query(DiscussionThread).filter(DiscussionThread.id == flag.content_id).first()
                if item:
                    item.is_hidden = True
                    author_id = item.author_id
            elif flag.content_type == "thread_reply":
                item = self.db.query(DiscussionReply).filter(DiscussionReply.id == flag.content_id).first()
                if item:
                    item.is_hidden = True
                    author_id = item.author_id
            elif flag.content_type == "group_post":
                item = self.db.query(GroupPost).filter(GroupPost.id == flag.content_id).first()
                if item:
                    item.is_hidden = True
                    author_id = item.author_id
            elif flag.content_type == "group_comment":
                item = self.db.query(GroupPostComment).filter(GroupPostComment.id == flag.content_id).first()
                if item:
                    item.is_hidden = True
                    author_id = item.author_id

            flag.status = FlagStatus.REVIEWED
            flag.action_taken = "hidden"

            # Reverse gamification points if content is removed for abuse
            if author_id:
                self.gamification.reverse_points(
                    user_id=author_id,
                    source_type=flag.content_type,
                    source_id=str(flag.content_id),
                    reason="content_moderated_abuse"
                )

        elif action == "warn":
            flag.status = FlagStatus.REVIEWED
            flag.action_taken = "warned"

        elif action == "dismiss":
            flag.status = FlagStatus.DISMISSED
            flag.action_taken = "dismissed"
        else:
            raise HTTPException(status_code=400, detail="Invalid moderation action")

        flag.reviewed_by = current_user.id
        flag.reviewed_at = now

        # Add audit log
        audit = ModerationAuditLog(
            actor_id=current_user.id,
            action=f"moderation_{action}",
            target_type=flag.content_type,
            target_id=flag.content_id,
            note=payload.note or f"Flag #{flag.id} resolved with action '{action}'",
            created_at=now
        )
        self.db.add(audit)
        self.db.commit()

        return {"success": True, "action_taken": flag.action_taken, "status": flag.status.value}

    def list_audit_logs(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """List moderation audit history."""
        logs = self.db.query(ModerationAuditLog).order_by(
            desc(ModerationAuditLog.created_at)
        ).offset(offset).limit(limit).all()

        return [
            {
                "id": l.id,
                "actor_id": l.actor_id,
                "actor_name": l.actor.name if l.actor else "System Moderator",
                "action": l.action,
                "target_type": l.target_type,
                "target_id": l.target_id,
                "note": l.note,
                "created_at": l.created_at,
            }
            for l in logs
        ]

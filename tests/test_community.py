import pytest
from datetime import datetime, timedelta
from app.models.entities import (
    User, UserRole, Ward, Group, GroupMembership, GroupPost, GroupPostComment,
    DiscussionThread, DiscussionReply, ThreadUpvote, ReplyUpvote, ThreadFollower,
    CitizenConnection, ContentFlag, ModerationAuditLog,
    GroupVisibility, GroupMemberRole, FlagStatus, ConnectionStatus, Notification
)
from app.services.community_service import CommunityService
from app.schemas.community import (
    GroupCreate, GroupPostCreate, GroupCommentCreate,
    ThreadCreate, ThreadReplyCreate, ContentFlagCreate, ModerationActionPayload
)
from app.core.security import get_password_hash


@pytest.fixture
def community_users(db_session):
    db_session.rollback()
    t_id = datetime.utcnow().strftime('%f')[:5]

    user_a = User(
        name=f"Comm User A {t_id}",
        mobile=f"9871{t_id}",
        email=f"usera_{t_id}@test.gov.in",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.CITIZEN,
        public_id=f"cit-a-{t_id}",
        public_display_name=f"User A {t_id}",
        preferred_language="en",
        is_active=True,
    )
    user_b = User(
        name=f"Comm User B {t_id}",
        mobile=f"9872{t_id}",
        email=f"userb_{t_id}@test.gov.in",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.CITIZEN,
        public_id=f"cit-b-{t_id}",
        public_display_name=f"User B {t_id}",
        preferred_language="en",
        is_active=True,
    )
    admin = User(
        name=f"Comm Admin {t_id}",
        mobile=f"9873{t_id}",
        email=f"admin_{t_id}@test.gov.in",
        hashed_password=get_password_hash("Civic@123"),
        role=UserRole.GOV_ADMIN,
        preferred_language="en",
        is_active=True,
    )
    db_session.add_all([user_a, user_b, admin])
    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)
    db_session.refresh(admin)

    yield {
        "user_a": user_a,
        "user_b": user_b,
        "admin": admin,
    }

    # Cleanup
    db_session.rollback()
    for u in [user_a, user_b, admin]:
        db_session.query(Notification).filter(Notification.user_id == u.id).delete()
        db_session.query(GroupMembership).filter(GroupMembership.user_id == u.id).delete()
        db_session.query(ThreadUpvote).filter(ThreadUpvote.user_id == u.id).delete()
        db_session.query(ReplyUpvote).filter(ReplyUpvote.user_id == u.id).delete()
        db_session.query(ThreadFollower).filter(ThreadFollower.user_id == u.id).delete()
        db_session.query(CitizenConnection).filter(
            (CitizenConnection.requester_id == u.id) | (CitizenConnection.receiver_id == u.id)
        ).delete()
        db_session.query(ContentFlag).filter(ContentFlag.reporter_id == u.id).delete()
        db_session.query(ModerationAuditLog).filter(ModerationAuditLog.actor_id == u.id).delete()
        db_session.query(DiscussionReply).filter(DiscussionReply.author_id == u.id).delete()
        db_session.query(DiscussionThread).filter(DiscussionThread.author_id == u.id).delete()
        db_session.query(GroupPostComment).filter(GroupPostComment.author_id == u.id).delete()
        db_session.query(GroupPost).filter(GroupPost.author_id == u.id).delete()
        db_session.query(Group).filter(Group.moderator_id == u.id).delete()
        db_session.delete(u)
    db_session.commit()


def test_create_and_list_groups(db_session, community_users):
    service = CommunityService(db_session)
    user_a = community_users["user_a"]

    payload = GroupCreate(
        name="Velachery Wetland Friends",
        description="Preserving lake biodiversity and stormwater channels.",
        category="Urban Ecology",
        district="Chennai",
        visibility=GroupVisibility.PUBLIC,
    )

    group = service.create_group(user_a, payload)
    assert group.id is not None
    assert group.name == "Velachery Wetland Friends"
    assert group.member_count == 1
    assert group.moderator_id == user_a.id

    # Check listing
    groups = service.list_groups(search="Wetland", current_user=user_a)
    assert len(groups) >= 1
    found = next((g for g in groups if g["id"] == group.id), None)
    assert found is not None
    assert found["is_member"] is True
    assert found["my_role"] == "moderator"

    # Cleanup
    db_session.delete(group)
    db_session.commit()


def test_group_join_and_leave(db_session, community_users):
    service = CommunityService(db_session)
    user_a = community_users["user_a"]
    user_b = community_users["user_b"]

    group = service.create_group(user_a, GroupCreate(
        name="Mylapore Heritage Walkers",
        description="Preserving historic architectural avenues.",
        category="Heritage & Culture",
    ))

    # User B joins
    res_join = service.join_group(group.id, user_b)
    assert res_join["success"] is True
    db_session.refresh(group)
    assert group.member_count == 2

    # User B leaves
    res_leave = service.leave_group(group.id, user_b)
    assert res_leave["success"] is True
    db_session.refresh(group)
    assert group.member_count == 1

    # Cleanup
    db_session.delete(group)
    db_session.commit()


def test_group_post_and_pin(db_session, community_users):
    service = CommunityService(db_session)
    user_a = community_users["user_a"]
    user_b = community_users["user_b"]

    group = service.create_group(user_a, GroupCreate(
        name="Saidapet Civic Forum",
        description="Ward discussions.",
        category="Civic Action",
    ))
    service.join_group(group.id, user_b)

    # User B posts in group
    post = service.create_group_post(group.id, user_b, GroupPostCreate(
        title="Weekly Cleanliness Drive on Bazaar Road",
        content="Join us this Sunday morning with gloves and dust masks.",
    ))
    assert post.id is not None
    assert post.is_pinned is False

    # Non-moderator (User B) cannot pin post
    with pytest.raises(Exception):
        service.toggle_pin_post(post.id, user_b)

    # Moderator (User A) can pin post
    is_pinned = service.toggle_pin_post(post.id, user_a)
    assert is_pinned is True

    # Add comment to post
    comment = service.add_group_comment(post.id, user_a, GroupCommentCreate(
        content="Great initiative! I will bring waste collection bags."
    ))
    assert comment.id is not None

    # Cleanup
    db_session.delete(group)
    db_session.commit()


def test_discussion_thread_lifecycle_and_upvotes(db_session, community_users):
    service = CommunityService(db_session)
    user_a = community_users["user_a"]
    user_b = community_users["user_b"]

    thread = service.create_thread(user_a, ThreadCreate(
        title="Best method for composting wet waste in small apartments?",
        body="We are looking for odorless indoor aerated terracotta bin setups.",
        category="Waste Management",
        district="Chennai",
    ))
    assert thread.id is not None
    assert thread.upvotes_count == 0

    # User B upvotes thread
    v1 = service.toggle_thread_upvote(thread.id, user_b)
    assert v1["upvoted"] is True
    assert v1["upvotes_count"] == 1

    # User B upvotes again -> toggles off
    v2 = service.toggle_thread_upvote(thread.id, user_b)
    assert v2["upvoted"] is False
    assert v2["upvotes_count"] == 0

    # User B replies to thread
    reply = service.create_thread_reply(thread.id, user_b, ThreadReplyCreate(
        content="Khamba 3-tier pots work exceptionally well with coco-peat!"
    ))
    assert reply.id is not None
    db_session.refresh(thread)
    assert thread.replies_count == 1

    # Thread author marks best answer
    ba_res = service.mark_best_answer(thread.id, reply.id, user_a)
    assert ba_res["success"] is True
    assert ba_res["best_answer_id"] == reply.id

    # Non-author cannot mark best answer
    with pytest.raises(Exception):
        service.mark_best_answer(thread.id, reply.id, user_b)

    # Follow thread toggle
    assert service.toggle_follow_thread(thread.id, user_b) is True
    assert service.toggle_follow_thread(thread.id, user_b) is False

    # Cleanup
    db_session.delete(thread)
    db_session.commit()


def test_citizen_connections_flow(db_session, community_users):
    service = CommunityService(db_session)
    user_a = community_users["user_a"]
    user_b = community_users["user_b"]

    # Send connection request
    req = service.send_connection_request(user_a, user_b.id)
    assert req["success"] is True
    assert req["status"] == "pending"

    # User B lists connections (incoming request)
    conns_b = service.list_connections(user_b)
    incoming = next((c for c in conns_b if c["direction"] == "incoming" and c["other_user_id"] == user_a.id), None)
    assert incoming is not None
    assert incoming["status"] == ConnectionStatus.PENDING

    # User B accepts request
    res_accept = service.respond_to_connection(incoming["id"], user_b, action="accept")
    assert res_accept["success"] is True
    assert res_accept["status"] == "accepted"


def test_content_safety_banned_words_and_links(db_session, community_users):
    service = CommunityService(db_session)
    user_a = community_users["user_a"]

    # Banned words check
    with pytest.raises(Exception) as exc1:
        service.create_thread(user_a, ThreadCreate(
            title="Check out this free_money trick now",
            body="Guaranteed earnings click right now",
            category="Civic Action",
        ))
    assert "restricted term" in str(exc1.value)

    # Link spam check (> 2 URLs)
    spam_body = "Visit https://link1.com and https://link2.com and also https://link3.com for details"
    with pytest.raises(Exception) as exc2:
        service.create_thread(user_a, ThreadCreate(
            title="Legitimate Discussion Title Here",
            body=spam_body,
            category="Civic Action",
        ))
    assert "hyperlinks" in str(exc2.value)


def test_moderation_flag_queue_and_action(db_session, community_users):
    service = CommunityService(db_session)
    user_a = community_users["user_a"]
    user_b = community_users["user_b"]
    admin = community_users["admin"]

    thread = service.create_thread(user_a, ThreadCreate(
        title="Questionable Thread for Testing Flags",
        body="This thread contains borderline advertising text.",
        category="General",
    ))

    # User B flags the thread
    flag = service.flag_content(user_b, ContentFlagCreate(
        content_type="thread",
        content_id=thread.id,
        reason="Promotional content not civic relevant",
    ))
    assert flag.id is not None
    assert flag.status == FlagStatus.PENDING

    # Admin lists flags
    queue = service.list_flags(status_filter="pending", current_user=admin)
    flag_in_queue = next((f for f in queue if f["id"] == flag.id), None)
    assert flag_in_queue is not None

    # Admin hides content
    act_res = service.take_moderation_action(
        flag.id, admin, ModerationActionPayload(action="hide", note="Commercial spam hidden.")
    )
    assert act_res["success"] is True
    assert act_res["action_taken"] == "hidden"

    # Thread should now be hidden
    db_session.refresh(thread)
    assert thread.is_hidden is True

    # Audit log recorded
    logs = service.list_audit_logs(limit=10)
    assert any(l["target_id"] == thread.id and "hide" in l["action"] for l in logs)

    # Cleanup
    db_session.delete(thread)
    db_session.commit()

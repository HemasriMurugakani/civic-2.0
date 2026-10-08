from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case

from app.models.entities import (
    User, PointsLedger, Badge, UserBadge, BadgeRarity,
    Complaint, ComplaintStatus, Notification
)


LEVEL_THRESHOLDS = [
    {"level": 1, "title_en": "Aware Citizen L1", "title_ta": "விழிப்புணர்வு குடிமகன் 1", "min_points": 0, "max_points": 49},
    {"level": 2, "title_en": "Aware Citizen L2", "title_ta": "விழிப்புணர்வு குடிமகன் 2", "min_points": 50, "max_points": 149},
    {"level": 3, "title_en": "Engaged Citizen", "title_ta": "செயல்பாட்டு குடிமகன்", "min_points": 150, "max_points": 349},
    {"level": 4, "title_en": "Community Leader", "title_ta": "சமூக தலைவர்", "min_points": 350, "max_points": 749},
    {"level": 5, "title_en": "Civic Champion", "title_ta": "மக்கள் நாயகன்", "min_points": 750, "max_points": None},
]

EVENT_POINTS = {
    "report_submitted": 15,
    "report_verified_by_community": 25,
    "verified_other_report": 5,
    "fix_confirmed": 20,
    "module_completed": 50,
    "group_created": 30,
    "post_made": 5,
    "spot_adopted": 100,
    "campaign_joined": 25,
}

DAILY_CAPS = {
    "report_submitted": 60,      # max 4 reports / day
    "verified_other_report": 30, # max 6 verifications / day
    "post_made": 20,             # max 4 posts / day
}


class GamificationService:
    def __init__(self, db: Session):
        self.db = db

    def ensure_user_pseudonym(self, user: User) -> None:
        """Ensure user has a public_id and public_display_name for privacy."""
        updated = False
        if not user.public_id:
            user.public_id = f"cit-{user.id:04d}"
            updated = True
        if not user.public_display_name:
            user.public_display_name = f"Citizen #{user.id:04d}"
            updated = True
        if updated:
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

    def get_user_score(self, user_id: int) -> int:
        """Calculate total points for a user from the append-only points_ledger."""
        total = self.db.query(func.coalesce(func.sum(PointsLedger.points), 0)).filter(
            PointsLedger.user_id == user_id
        ).scalar()
        return max(int(total), 0)

    @staticmethod
    def calculate_level(score: int) -> Dict[str, Any]:
        """Compute level and progress to next level based on score."""
        current_lvl = LEVEL_THRESHOLDS[0]
        for lvl in LEVEL_THRESHOLDS:
            if score >= lvl["min_points"]:
                current_lvl = lvl

        next_lvl = None
        for lvl in LEVEL_THRESHOLDS:
            if lvl["level"] == current_lvl["level"] + 1:
                next_lvl = lvl
                break

        if next_lvl:
            next_threshold = next_lvl["min_points"]
            pts_needed = max(next_threshold - score, 0)
            range_span = next_threshold - current_lvl["min_points"]
            earned_in_level = score - current_lvl["min_points"]
            progress_pct = round(min(max(earned_in_level / range_span * 100.0, 0.0), 100.0), 1)
        else:
            next_threshold = None
            pts_needed = 0
            progress_pct = 100.0

        return {
            "level": current_lvl["level"],
            "title_en": current_lvl["title_en"],
            "title_ta": current_lvl["title_ta"],
            "current_level_min": current_lvl["min_points"],
            "next_level_threshold": next_threshold,
            "points_to_next_level": pts_needed,
            "progress_percent": progress_pct,
        }

    def award_points(
        self,
        user_id: int,
        reason: str,
        source_type: str,
        source_id: str,
        points: Optional[int] = None,
        check_daily_cap: bool = True
    ) -> Optional[PointsLedger]:
        """
        Idempotent points awarding.
        Guarantees that (user_id, reason, source_type, source_id) is only awarded once.
        Enforces daily caps and evaluates badge rules.
        """
        # 1. Idempotency check: has this event already been awarded?
        existing = self.db.query(PointsLedger).filter(
            PointsLedger.user_id == user_id,
            PointsLedger.reason == reason,
            PointsLedger.source_type == source_type,
            PointsLedger.source_id == str(source_id)
        ).first()

        if existing:
            return existing

        pts_to_award = points if points is not None else EVENT_POINTS.get(reason, 10)

        # 2. Anti-abuse: daily cap check
        if check_daily_cap and reason in DAILY_CAPS:
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            today_earned = self.db.query(func.coalesce(func.sum(PointsLedger.points), 0)).filter(
                PointsLedger.user_id == user_id,
                PointsLedger.reason == reason,
                PointsLedger.created_at >= today_start
            ).scalar() or 0

            cap = DAILY_CAPS[reason]
            if today_earned >= cap:
                return None
            if today_earned + pts_to_award > cap:
                pts_to_award = cap - today_earned

        if pts_to_award <= 0:
            return None

        # Ensure user pseudonym exists for privacy and leaderboard consistency
        user_obj = self.db.query(User).filter(User.id == user_id).first()
        if user_obj and (not user_obj.public_id or not user_obj.public_display_name):
            self.ensure_user_pseudonym(user_obj)

        # 3. Insert into append-only ledger
        entry = PointsLedger(
            user_id=user_id,
            points=pts_to_award,
            reason=reason,
            source_type=source_type,
            source_id=str(source_id),
            created_at=datetime.utcnow()
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)

        # 4. Trigger badge rule evaluation
        self.evaluate_badges(user_id)

        return entry

    def reverse_points(
        self,
        user_id: int,
        reason: str,
        source_type: str,
        source_id: str,
        points_to_deduct: Optional[int] = None
    ) -> Optional[PointsLedger]:
        """
        Reverses points by appending a negative points entry into points_ledger.
        """
        reversal_reason = f"reversal_{reason}"
        existing_rev = self.db.query(PointsLedger).filter(
            PointsLedger.user_id == user_id,
            PointsLedger.reason == reversal_reason,
            PointsLedger.source_type == source_type,
            PointsLedger.source_id == str(source_id)
        ).first()

        if existing_rev:
            return existing_rev

        if points_to_deduct is None:
            orig = self.db.query(PointsLedger).filter(
                PointsLedger.user_id == user_id,
                PointsLedger.reason == reason,
                PointsLedger.source_type == source_type,
                PointsLedger.source_id == str(source_id)
            ).first()
            deduct_amount = orig.points if orig else EVENT_POINTS.get(reason, 15)
        else:
            deduct_amount = points_to_deduct

        entry = PointsLedger(
            user_id=user_id,
            points=-abs(deduct_amount),
            reason=reversal_reason,
            source_type=source_type,
            source_id=str(source_id),
            created_at=datetime.utcnow()
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)

        return entry

    def record_event(
        self,
        user_id: int,
        event_type: str,
        source_type: str,
        source_id: str,
        self_check_author_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        High-level event bus helper:
        - Prevents self-voting abuse
        - Awards points idempotently
        """
        # Anti-abuse: cannot earn points for interacting with own report/content
        if self_check_author_id is not None and self_check_author_id == user_id:
            return {
                "success": False,
                "awarded": False,
                "points": 0,
                "reason": "Self-interaction is ineligible for points"
            }

        entry = self.award_points(
            user_id=user_id,
            reason=event_type,
            source_type=source_type,
            source_id=source_id
        )

        return {
            "success": True,
            "awarded": entry is not None,
            "points": entry.points if entry else 0,
            "reason": event_type
        }

    def evaluate_badges(self, user_id: int) -> List[Badge]:
        """
        Evaluates criteria for all unearned active badges and awards those meeting thresholds.
        """
        # Get all badges the user has not yet unlocked
        unearned_badges = self.db.query(Badge).filter(
            Badge.is_active == True,
            ~Badge.id.in_(
                self.db.query(UserBadge.badge_id).filter(UserBadge.user_id == user_id)
            )
        ).all()

        if not unearned_badges:
            return []

        # Count metrics for the user
        reports_count = self.db.query(func.count(Complaint.id)).filter(
            Complaint.citizen_id == user_id
        ).scalar() or 0

        verifications_count = self.db.query(func.count(PointsLedger.id)).filter(
            PointsLedger.user_id == user_id,
            PointsLedger.reason == "verified_other_report"
        ).scalar() or 0

        fixes_confirmed_count = self.db.query(func.count(PointsLedger.id)).filter(
            PointsLedger.user_id == user_id,
            PointsLedger.reason == "fix_confirmed"
        ).scalar() or 0

        total_score = self.get_user_score(user_id)

        newly_earned = []

        for b in unearned_badges:
            earned = False
            if b.event_type == "report_submitted" and reports_count >= b.threshold:
                earned = True
            elif b.event_type == "verified_other_report" and verifications_count >= b.threshold:
                earned = True
            elif b.event_type == "fix_confirmed" and fixes_confirmed_count >= b.threshold:
                earned = True
            elif b.event_type == "score_threshold" and total_score >= b.threshold:
                earned = True

            if earned:
                # Award badge
                ub = UserBadge(user_id=user_id, badge_id=b.id, earned_at=datetime.utcnow())
                self.db.add(ub)

                # Award badge bonus points (idempotent via reason=badge_reward_<code_id>)
                bonus_entry = PointsLedger(
                    user_id=user_id,
                    points=b.points_reward,
                    reason=f"badge_reward_{b.code}",
                    source_type="badge",
                    source_id=str(b.id),
                    created_at=datetime.utcnow()
                )
                self.db.add(bonus_entry)

                # Send celebratory in-app notification
                notif = Notification(
                    user_id=user_id,
                    event_type="badge_unlocked",
                    title=f"Badge Unlocked: {b.name_en}!",
                    message=f"You earned the '{b.name_en}' badge and +{b.points_reward} bonus points!",
                    dedupe_key=f"badge_{b.id}_{user_id}"
                )
                self.db.add(notif)
                newly_earned.append(b)

        if newly_earned:
            self.db.commit()

        return newly_earned

    def get_user_progress(self, user: User) -> Dict[str, Any]:
        """Get full progress snapshot for a user."""
        self.ensure_user_pseudonym(user)
        score = self.get_user_score(user.id)
        lvl_data = self.calculate_level(score)

        # Per-user stats
        reports_count = self.db.query(func.count(Complaint.id)).filter(
            Complaint.citizen_id == user.id
        ).scalar() or 0

        resolved_count = self.db.query(func.count(Complaint.id)).filter(
            Complaint.citizen_id == user.id,
            Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED])
        ).scalar() or 0

        verifications_count = self.db.query(func.count(PointsLedger.id)).filter(
            PointsLedger.user_id == user.id,
            PointsLedger.reason == "verified_other_report"
        ).scalar() or 0

        # Rank computation
        user_scores_subq = (
            self.db.query(
                PointsLedger.user_id,
                func.sum(PointsLedger.points).label("total_score")
            )
            .group_by(PointsLedger.user_id)
            .subquery()
        )
        better_users = self.db.query(func.count(user_scores_subq.c.user_id)).filter(
            user_scores_subq.c.total_score > score
        ).scalar() or 0
        rank = better_users + 1

        # Earned badges
        earned_badges = (
            self.db.query(UserBadge, Badge)
            .join(Badge, UserBadge.badge_id == Badge.id)
            .filter(UserBadge.user_id == user.id)
            .order_by(UserBadge.earned_at.desc())
            .all()
        )

        badge_list = [
            {
                "id": ub.id,
                "badge_id": b.id,
                "code": b.code,
                "name_en": b.name_en,
                "name_ta": b.name_ta,
                "description_en": b.description_en,
                "description_ta": b.description_ta,
                "icon": b.icon,
                "rarity": b.rarity.value if hasattr(b.rarity, "value") else str(b.rarity),
                "earned_at": ub.earned_at
            }
            for ub, b in earned_badges
        ]

        return {
            "score": score,
            "level": lvl_data["level"],
            "level_title_en": lvl_data["title_en"],
            "level_title_ta": lvl_data["title_ta"],
            "current_level_min": lvl_data["current_level_min"],
            "next_level_threshold": lvl_data["next_level_threshold"],
            "points_to_next_level": lvl_data["points_to_next_level"],
            "progress_percent": lvl_data["progress_percent"],
            "rank": rank,
            "public_id": user.public_id,
            "public_display_name": user.public_display_name or f"Citizen #{user.id:04d}",
            "leaderboard_opt_out": user.leaderboard_opt_out,
            "stats": {
                "reports_count": reports_count,
                "resolved_count": resolved_count,
                "verifications_given": verifications_count,
            },
            "badges": badge_list,
        }

    def get_leaderboard(
        self,
        scope: str = "global",
        period: str = "all",
        limit: int = 50,
        current_user_id: Optional[int] = None,
        ward_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Ranked leaderboard respecting user privacy.
        Never outputs mobile or email.
        Excludes users where leaderboard_opt_out is True.
        """
        query = self.db.query(
            User.id,
            User.public_id,
            User.public_display_name,
            func.coalesce(func.sum(PointsLedger.points), 0).label("score")
        ).join(PointsLedger, User.id == PointsLedger.user_id)

        # Privacy: exclude opted-out users
        query = query.filter(User.leaderboard_opt_out == False)

        # Period filter
        if period == "month":
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            query = query.filter(PointsLedger.created_at >= thirty_days_ago)

        # Scope filter
        if scope == "district" and ward_id:
            query = query.filter(User.ward_id == ward_id)

        rows = (
            query.group_by(User.id, User.public_id, User.public_display_name)
            .having(func.sum(PointsLedger.points) > 0)
            .order_by(desc("score"))
            .limit(limit)
            .all()
        )

        items = []
        for rank_idx, (uid, pub_id, disp_name, sc) in enumerate(rows, start=1):
            score_val = int(sc)
            lvl_info = self.calculate_level(score_val)
            badge_cnt = self.db.query(func.count(UserBadge.id)).filter(UserBadge.user_id == uid).scalar() or 0

            items.append({
                "rank": rank_idx,
                "user_id": uid,
                "public_id": pub_id or f"cit-{uid:04d}",
                "display_name": disp_name or f"Citizen #{uid:04d}",
                "score": score_val,
                "level_title": lvl_info["title_en"],
                "badge_count": badge_cnt,
                "is_current_user": bool(current_user_id and uid == current_user_id)
            })

        return {
            "scope": scope,
            "period": period,
            "total_participants": len(items),
            "items": items,
        }

    def get_public_profile(self, public_id: str) -> Optional[Dict[str, Any]]:
        """Get sanitized public profile by public_id."""
        user = self.db.query(User).filter(User.public_id == public_id).first()
        if not user:
            # Fallback check if public_id is numeric ID
            if public_id.isdigit():
                user = self.db.query(User).filter(User.id == int(public_id)).first()
        if not user:
            return None

        self.ensure_user_pseudonym(user)
        score = self.get_user_score(user.id)
        lvl_data = self.calculate_level(score)

        reports_count = self.db.query(func.count(Complaint.id)).filter(
            Complaint.citizen_id == user.id
        ).scalar() or 0

        resolved_count = self.db.query(func.count(Complaint.id)).filter(
            Complaint.citizen_id == user.id,
            Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CITIZEN_VERIFIED])
        ).scalar() or 0

        verifications_count = self.db.query(func.count(PointsLedger.id)).filter(
            PointsLedger.user_id == user.id,
            PointsLedger.reason == "verified_other_report"
        ).scalar() or 0

        user_scores_subq = (
            self.db.query(
                PointsLedger.user_id,
                func.sum(PointsLedger.points).label("total_score")
            )
            .group_by(PointsLedger.user_id)
            .subquery()
        )
        better_users = self.db.query(func.count(user_scores_subq.c.user_id)).filter(
            user_scores_subq.c.total_score > score
        ).scalar() or 0
        rank = better_users + 1

        earned_badges = (
            self.db.query(UserBadge, Badge)
            .join(Badge, UserBadge.badge_id == Badge.id)
            .filter(UserBadge.user_id == user.id)
            .order_by(UserBadge.earned_at.desc())
            .all()
        )

        badge_list = [
            {
                "id": ub.id,
                "badge_id": b.id,
                "code": b.code,
                "name_en": b.name_en,
                "name_ta": b.name_ta,
                "description_en": b.description_en,
                "description_ta": b.description_ta,
                "icon": b.icon,
                "rarity": b.rarity.value if hasattr(b.rarity, "value") else str(b.rarity),
                "earned_at": ub.earned_at
            }
            for ub, b in earned_badges
        ]

        return {
            "public_id": user.public_id,
            "display_name": user.public_display_name or f"Citizen #{user.id:04d}",
            "level": lvl_data["level"],
            "level_title": lvl_data["title_en"],
            "score": score,
            "rank": rank,
            "stats": {
                "reports_count": reports_count,
                "resolved_count": resolved_count,
                "verifications_given": verifications_count,
            },
            "badges": badge_list,
            "member_since": user.created_at,
        }

    def list_all_badges(self, current_user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """List all active badges, indicating which are unlocked for current_user."""
        badges = self.db.query(Badge).filter(Badge.is_active == True).order_by(Badge.id.asc()).all()

        user_badge_map = {}
        if current_user_id:
            user_badges = self.db.query(UserBadge).filter(UserBadge.user_id == current_user_id).all()
            user_badge_map = {ub.badge_id: ub.earned_at for ub in user_badges}

        results = []
        for b in badges:
            earned = b.id in user_badge_map
            results.append({
                "id": b.id,
                "code": b.code,
                "name_en": b.name_en,
                "name_ta": b.name_ta,
                "description_en": b.description_en,
                "description_ta": b.description_ta,
                "icon": b.icon,
                "rarity": b.rarity.value if hasattr(b.rarity, "value") else str(b.rarity),
                "threshold": b.threshold,
                "event_type": b.event_type,
                "points_reward": b.points_reward,
                "earned": earned,
                "earned_at": user_badge_map.get(b.id)
            })

        return results

from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from fastapi import HTTPException, status

from app.models.entities import (
    Campaign, CampaignTask, CampaignParticipant, CampaignUserTaskProgress,
    CampaignStatus, CampaignTaskType, User, UserRole, Badge, UserBadge,
    PointsLedger, Complaint, Notification, UserModuleProgress, ModuleProgressStatus,
    Spot, SpotCheckin
)
from app.schemas.campaigns import (
    CampaignCreate, CampaignUpdate, CampaignTaskCreate,
    CampaignListItem, CampaignDetail, CampaignLeaderboardEntry,
    CampaignSyncSummary
)
from app.services.gamification_service import GamificationService


class CampaignService:
    def __init__(self, db: Session):
        self.db = db
        self.gamification = GamificationService(db)

    def _compute_current_metric_value(self, campaign: Campaign) -> int:
        """
        Dynamically computes the progress value for the campaign's target_metric from the DB.
        No hardcoded stats.
        """
        start = campaign.start_at
        end = campaign.end_at or datetime.utcnow()

        if campaign.target_metric == "reports_filed":
            query = self.db.query(func.count(Complaint.id)).filter(
                Complaint.created_at >= start,
                Complaint.created_at <= end
            )
            if campaign.region and campaign.region.lower() != "tamil nadu":
                query = query.filter(Complaint.address_text.ilike(f"%{campaign.region}%"))
            return query.scalar() or 0

        elif campaign.target_metric == "reports_verified":
            return self.db.query(func.count(PointsLedger.id)).filter(
                PointsLedger.reason == "verified_other_report",
                PointsLedger.created_at >= start,
                PointsLedger.created_at <= end
            ).scalar() or 0

        elif campaign.target_metric == "modules_completed":
            return self.db.query(func.count(UserModuleProgress.id)).filter(
                UserModuleProgress.status == ModuleProgressStatus.COMPLETED,
                UserModuleProgress.completed_at >= start,
                UserModuleProgress.completed_at <= end
            ).scalar() or 0

        elif campaign.target_metric == "spots_adopted":
            return self.db.query(func.count(Spot.id)).filter(
                Spot.adopted_at >= start,
                Spot.adopted_at <= end
            ).scalar() or 0

        elif campaign.target_metric == "total_participants":
            return self.db.query(func.count(CampaignParticipant.id)).filter(
                CampaignParticipant.campaign_id == campaign.id
            ).scalar() or 0

        else:
            # Default to participant count
            return self.db.query(func.count(CampaignParticipant.id)).filter(
                CampaignParticipant.campaign_id == campaign.id
            ).scalar() or 0

    def list_campaigns(
        self,
        status_filter: Optional[str] = None,
        season_theme: Optional[str] = None,
        region: Optional[str] = None,
        user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """List campaigns with dynamically computed community progress and user join status."""
        query = self.db.query(Campaign)

        if status_filter:
            try:
                st = CampaignStatus(status_filter)
                query = query.filter(Campaign.status == st)
            except ValueError:
                pass

        if season_theme:
            query = query.filter(Campaign.season_theme.ilike(f"%{season_theme.strip()}%"))

        if region:
            query = query.filter(Campaign.region.ilike(f"%{region.strip()}%"))

        campaigns = query.order_by(desc(Campaign.start_at)).all()

        # Compute dynamic overall stats
        total_campaigns = self.db.query(Campaign).count()
        active_campaigns = self.db.query(Campaign).filter(Campaign.status == CampaignStatus.ACTIVE).count()
        completed_campaigns = self.db.query(Campaign).filter(Campaign.status == CampaignStatus.COMPLETED).count()
        total_participants = self.db.query(CampaignParticipant).count()

        items = []
        for c in campaigns:
            current_val = self._compute_current_metric_value(c)
            progress_pct = round(min(100.0, (current_val / c.target_value * 100.0) if c.target_value > 0 else 0.0), 1)
            part_count = self.db.query(func.count(CampaignParticipant.id)).filter(CampaignParticipant.campaign_id == c.id).scalar() or 0
            tasks_count = len(c.tasks)

            is_joined = False
            is_completed = False
            user_pts = 0

            if user_id:
                part = self.db.query(CampaignParticipant).filter(
                    CampaignParticipant.campaign_id == c.id,
                    CampaignParticipant.user_id == user_id
                ).first()
                if part:
                    is_joined = True
                    is_completed = part.is_completed
                    user_pts = part.points_earned

            badge_name = c.badge.name_en if c.badge else None
            badge_icon = c.badge.icon if c.badge else None

            items.append({
                "id": c.id,
                "slug": c.slug,
                "title": c.title,
                "description": c.description,
                "season_theme": c.season_theme,
                "banner_image_url": c.banner_image_url,
                "start_at": c.start_at,
                "end_at": c.end_at,
                "target_metric": c.target_metric,
                "target_value": c.target_value,
                "current_value": current_val,
                "progress_percent": progress_pct,
                "region": c.region,
                "status": c.status,
                "points_reward": c.points_reward,
                "badge_id": c.badge_id,
                "badge_name": badge_name,
                "badge_icon": badge_icon,
                "participants_count": part_count,
                "tasks_count": tasks_count,
                "is_joined": is_joined,
                "is_completed": is_completed,
                "user_points_earned": user_pts,
                "created_at": c.created_at
            })

        return {
            "total": len(items),
            "items": items,
            "stats": {
                "total_campaigns": total_campaigns,
                "active_campaigns": active_campaigns,
                "completed_campaigns": completed_campaigns,
                "total_participants": total_participants
            }
        }

    def _evaluate_user_campaign_tasks(self, campaign: Campaign, user_id: int) -> None:
        """
        Dynamically evaluates task progress for a participant during the campaign timeframe.
        If all tasks are achieved, completes the campaign for the participant and awards rewards.
        """
        participant = self.db.query(CampaignParticipant).filter(
            CampaignParticipant.campaign_id == campaign.id,
            CampaignParticipant.user_id == user_id
        ).first()

        if not participant:
            return

        start = campaign.start_at
        end = campaign.end_at or datetime.utcnow()
        now = datetime.utcnow()

        all_completed = True
        total_task_points = 0

        for task in campaign.tasks:
            progress = self.db.query(CampaignUserTaskProgress).filter(
                CampaignUserTaskProgress.task_id == task.id,
                CampaignUserTaskProgress.user_id == user_id
            ).first()

            if not progress:
                progress = CampaignUserTaskProgress(
                    campaign_id=campaign.id,
                    task_id=task.id,
                    user_id=user_id,
                    current_count=0,
                    is_completed=False,
                    completed_at=None
                )
                self.db.add(progress)
                self.db.flush()

            # Count real activity between start and end
            count = 0
            if task.task_type == CampaignTaskType.REPORT_ISSUES:
                count = self.db.query(func.count(Complaint.id)).filter(
                    Complaint.citizen_id == user_id,
                    Complaint.created_at >= start,
                    Complaint.created_at <= end
                ).scalar() or 0

            elif task.task_type == CampaignTaskType.VERIFY_REPORTS:
                count = self.db.query(func.count(PointsLedger.id)).filter(
                    PointsLedger.user_id == user_id,
                    PointsLedger.reason == "verified_other_report",
                    PointsLedger.created_at >= start,
                    PointsLedger.created_at <= end
                ).scalar() or 0

            elif task.task_type == CampaignTaskType.COMPLETE_MODULE:
                count = self.db.query(func.count(UserModuleProgress.id)).filter(
                    UserModuleProgress.user_id == user_id,
                    UserModuleProgress.status == ModuleProgressStatus.COMPLETED,
                    UserModuleProgress.completed_at >= start,
                    UserModuleProgress.completed_at <= end
                ).scalar() or 0

            elif task.task_type == CampaignTaskType.ADOPT_SPOT:
                count = self.db.query(func.count(Spot.id)).filter(
                    Spot.adopted_by == user_id,
                    Spot.adopted_at >= start,
                    Spot.adopted_at <= end
                ).scalar() or 0

            progress.current_count = count

            if count >= task.target_count:
                if not progress.is_completed:
                    progress.is_completed = True
                    progress.completed_at = now
                    # Award task points
                    self.gamification.award_points(
                        user_id=user_id,
                        reason=f"campaign_task_{task.id}",
                        source_type="campaign_task",
                        source_id=str(task.id),
                        points=task.points_reward
                    )
                total_task_points += task.points_reward
            else:
                all_completed = False

        # If all tasks are completed and participant was not yet completed
        if all_completed and len(campaign.tasks) > 0 and not participant.is_completed:
            participant.is_completed = True
            participant.completed_at = now
            participant.points_earned = total_task_points + campaign.points_reward

            # Award campaign completion bonus points
            self.gamification.award_points(
                user_id=user_id,
                reason="campaign_completed",
                source_type="campaign",
                source_id=str(campaign.id),
                points=campaign.points_reward
            )

            # Award campaign badge if configured
            if campaign.badge_id:
                has_badge = self.db.query(UserBadge).filter(
                    UserBadge.user_id == user_id,
                    UserBadge.badge_id == campaign.badge_id
                ).first()
                if not has_badge:
                    ub = UserBadge(user_id=user_id, badge_id=campaign.badge_id, earned_at=now)
                    self.db.add(ub)

            # Send in-app notification
            dedupe_key = f"camp_done_{campaign.id}_{user_id}"
            existing_notif = self.db.query(Notification).filter(Notification.dedupe_key == dedupe_key).first()
            if not existing_notif:
                notif = Notification(
                    user_id=user_id,
                    event_type="campaign_completed",
                    title=f"Campaign Completed: {campaign.title}!",
                    message=f"Outstanding work! You finished all tasks for '{campaign.title}' and earned +{campaign.points_reward} bonus Civic Points!",
                    dedupe_key=dedupe_key
                )
                self.db.add(notif)

        self.db.commit()

    def get_campaign_detail(self, identifier: str, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Retrieve campaign details, task progress for user, and campaign leaderboard."""
        if identifier.isdigit():
            campaign = self.db.query(Campaign).filter(Campaign.id == int(identifier)).first()
        else:
            campaign = self.db.query(Campaign).filter(Campaign.slug == identifier).first()

        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

        # If user is logged in, evaluate real-time task progress
        if user_id:
            self._evaluate_user_campaign_tasks(campaign, user_id)

        current_val = self._compute_current_metric_value(campaign)
        progress_pct = round(min(100.0, (current_val / campaign.target_value * 100.0) if campaign.target_value > 0 else 0.0), 1)
        part_count = self.db.query(func.count(CampaignParticipant.id)).filter(CampaignParticipant.campaign_id == campaign.id).scalar() or 0

        is_joined = False
        is_completed = False
        user_points_earned = 0
        user_tasks_completed = 0

        if user_id:
            part = self.db.query(CampaignParticipant).filter(
                CampaignParticipant.campaign_id == campaign.id,
                CampaignParticipant.user_id == user_id
            ).first()
            if part:
                is_joined = True
                is_completed = part.is_completed
                user_points_earned = part.points_earned

        # Build tasks with user progress
        task_items = []
        for t in campaign.tasks:
            user_count = 0
            task_done = False
            done_at = None

            if user_id:
                prog = self.db.query(CampaignUserTaskProgress).filter(
                    CampaignUserTaskProgress.task_id == t.id,
                    CampaignUserTaskProgress.user_id == user_id
                ).first()
                if prog:
                    user_count = prog.current_count
                    task_done = prog.is_completed
                    done_at = prog.completed_at

            if task_done:
                user_tasks_completed += 1

            task_items.append({
                "id": t.id,
                "campaign_id": t.campaign_id,
                "title": t.title,
                "description": t.description,
                "task_type": t.task_type,
                "target_count": t.target_count,
                "points_reward": t.points_reward,
                "display_order": t.display_order,
                "user_current_count": user_count,
                "is_completed": task_done,
                "completed_at": done_at
            })

        # Top leaderboard for this campaign
        top_entries = self.get_campaign_leaderboard(str(campaign.id), limit=10)

        badge_name = campaign.badge.name_en if campaign.badge else None
        badge_icon = campaign.badge.icon if campaign.badge else None

        return {
            "id": campaign.id,
            "slug": campaign.slug,
            "title": campaign.title,
            "description": campaign.description,
            "season_theme": campaign.season_theme,
            "banner_image_url": campaign.banner_image_url,
            "start_at": campaign.start_at,
            "end_at": campaign.end_at,
            "target_metric": campaign.target_metric,
            "target_value": campaign.target_value,
            "current_value": current_val,
            "progress_percent": progress_pct,
            "region": campaign.region,
            "status": campaign.status,
            "points_reward": campaign.points_reward,
            "badge_id": campaign.badge_id,
            "badge_name": badge_name,
            "badge_icon": badge_icon,
            "participants_count": part_count,
            "tasks_count": len(campaign.tasks),
            "is_joined": is_joined,
            "is_completed": is_completed,
            "user_points_earned": user_points_earned,
            "user_tasks_completed": user_tasks_completed,
            "user_total_tasks": len(campaign.tasks),
            "created_at": campaign.created_at,
            "tasks": task_items,
            "top_leaderboard": top_entries
        }

    def join_campaign(self, identifier: str, user: User) -> Dict[str, Any]:
        """
        Citizen joins a seasonal campaign.
        Awards +25 Civic Points (idempotent) and initializes task progress tracking.
        """
        if identifier.isdigit():
            campaign = self.db.query(Campaign).filter(Campaign.id == int(identifier)).first()
        else:
            campaign = self.db.query(Campaign).filter(Campaign.slug == identifier).first()

        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

        if campaign.status not in [CampaignStatus.ACTIVE, CampaignStatus.SCHEDULED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot join campaign that is {campaign.status.value}"
            )

        participant = self.db.query(CampaignParticipant).filter(
            CampaignParticipant.campaign_id == campaign.id,
            CampaignParticipant.user_id == user.id
        ).first()

        if participant:
            # Already joined, just evaluate tasks and return
            return self.get_campaign_detail(str(campaign.id), user_id=user.id)

        now = datetime.utcnow()
        participant = CampaignParticipant(
            campaign_id=campaign.id,
            user_id=user.id,
            joined_at=now,
            is_completed=False,
            points_earned=25
        )
        self.db.add(participant)

        # Initialize progress for each task
        for t in campaign.tasks:
            prog = CampaignUserTaskProgress(
                campaign_id=campaign.id,
                task_id=t.id,
                user_id=user.id,
                current_count=0,
                is_completed=False
            )
            self.db.add(prog)

        # Award points for joining (+25 points)
        self.gamification.award_points(
            user_id=user.id,
            reason="campaign_joined",
            source_type="campaign",
            source_id=str(campaign.id),
            points=25
        )

        # In-app notification
        dedupe_key = f"join_camp_{campaign.id}_{user.id}"
        existing_notif = self.db.query(Notification).filter(Notification.dedupe_key == dedupe_key).first()
        if not existing_notif:
            notif = Notification(
                user_id=user.id,
                event_type="campaign_joined",
                title=f"Joined Campaign: {campaign.title}",
                message=f"You joined the '{campaign.title}' campaign! You earned +25 Civic Points. Complete tasks to unlock the campaign badge.",
                dedupe_key=dedupe_key
            )
            self.db.add(notif)
        self.db.commit()

        # Evaluate initial activity
        self._evaluate_user_campaign_tasks(campaign, user.id)

        return self.get_campaign_detail(str(campaign.id), user_id=user.id)

    def leave_campaign(self, identifier: str, user: User) -> Dict[str, Any]:
        """Citizen leaves a campaign."""
        if identifier.isdigit():
            campaign = self.db.query(Campaign).filter(Campaign.id == int(identifier)).first()
        else:
            campaign = self.db.query(Campaign).filter(Campaign.slug == identifier).first()

        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

        self.db.query(CampaignUserTaskProgress).filter(
            CampaignUserTaskProgress.campaign_id == campaign.id,
            CampaignUserTaskProgress.user_id == user.id
        ).delete()

        self.db.query(CampaignParticipant).filter(
            CampaignParticipant.campaign_id == campaign.id,
            CampaignParticipant.user_id == user.id
        ).delete()

        self.db.commit()
        return {"status": "left", "campaign_id": campaign.id}

    def get_campaign_leaderboard(self, identifier: str, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Calculates ranked participants for a campaign.
        Enforces privacy rules: pseudonyms/public display name, respects opt-out.
        """
        if identifier.isdigit():
            campaign = self.db.query(Campaign).filter(Campaign.id == int(identifier)).first()
        else:
            campaign = self.db.query(Campaign).filter(Campaign.slug == identifier).first()

        if not campaign:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

        participants = self.db.query(CampaignParticipant).filter(
            CampaignParticipant.campaign_id == campaign.id
        ).order_by(
            desc(CampaignParticipant.is_completed),
            desc(CampaignParticipant.points_earned),
            CampaignParticipant.joined_at.asc()
        ).limit(limit).all()

        results = []
        for idx, p in enumerate(participants, 1):
            user = p.user
            if not user or user.leaderboard_opt_out:
                continue

            # Count completed tasks for this user
            tasks_done = self.db.query(func.count(CampaignUserTaskProgress.id)).filter(
                CampaignUserTaskProgress.campaign_id == campaign.id,
                CampaignUserTaskProgress.user_id == p.user_id,
                CampaignUserTaskProgress.is_completed == True
            ).scalar() or 0

            dname = user.public_display_name or f"Citizen #{user.id:04d}"
            pid = user.public_id or f"cit-{user.id:04d}"

            results.append({
                "rank": idx,
                "user_id": p.user_id,
                "public_id": pid,
                "display_name": dname,
                "points_earned": p.points_earned,
                "tasks_completed_count": tasks_done,
                "is_completed": p.is_completed,
                "joined_at": p.joined_at
            })

        return results

    def sync_campaign_lifecycles(self) -> CampaignSyncSummary:
        """
        Background scheduler job:
        - Transitions SCHEDULED campaigns to ACTIVE when now >= start_at and now < end_at.
        - Transitions ACTIVE campaigns to COMPLETED when now >= end_at.
        """
        now = datetime.utcnow()
        activated_count = 0
        completed_count = 0
        details = []

        # 1. Activate scheduled campaigns
        scheduled = self.db.query(Campaign).filter(
            Campaign.status == CampaignStatus.SCHEDULED,
            Campaign.start_at <= now,
            Campaign.end_at > now
        ).all()

        for c in scheduled:
            c.status = CampaignStatus.ACTIVE
            c.updated_at = now
            activated_count += 1
            details.append(f"Campaign '{c.title}' activated.")

        # 2. Complete expired campaigns
        expired = self.db.query(Campaign).filter(
            Campaign.status == CampaignStatus.ACTIVE,
            Campaign.end_at <= now
        ).all()

        for c in expired:
            c.status = CampaignStatus.COMPLETED
            c.updated_at = now
            completed_count += 1
            details.append(f"Campaign '{c.title}' marked completed.")

        self.db.commit()

        return CampaignSyncSummary(
            activated_count=activated_count,
            completed_count=completed_count,
            details=details
        )

    def create_campaign(self, payload: CampaignCreate, user: User) -> Dict[str, Any]:
        """Admin creates a new seasonal campaign with tasks."""
        if user.role != UserRole.GOV_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only Government Administrators can create seasonal campaigns"
            )

        now = datetime.utcnow()
        # Initial status based on start_at
        initial_status = CampaignStatus.ACTIVE if payload.start_at <= now < payload.end_at else CampaignStatus.SCHEDULED

        campaign = Campaign(
            title=payload.title,
            slug=payload.slug,
            description=payload.description,
            season_theme=payload.season_theme,
            banner_image_url=payload.banner_image_url,
            start_at=payload.start_at,
            end_at=payload.end_at,
            target_metric=payload.target_metric,
            target_value=payload.target_value,
            region=payload.region,
            status=initial_status,
            badge_id=payload.badge_id,
            points_reward=payload.points_reward,
            created_by=user.id,
            created_at=now,
            updated_at=now
        )
        self.db.add(campaign)
        self.db.flush()

        for idx, t_data in enumerate(payload.tasks, 1):
            task = CampaignTask(
                campaign_id=campaign.id,
                title=t_data.title,
                description=t_data.description,
                task_type=t_data.task_type,
                target_count=t_data.target_count,
                points_reward=t_data.points_reward,
                display_order=t_data.display_order or idx,
                created_at=now
            )
            self.db.add(task)

        self.db.commit()
        return self.get_campaign_detail(str(campaign.id), user_id=user.id)

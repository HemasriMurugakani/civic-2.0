from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.models.entities import CampaignStatus, CampaignTaskType


class CampaignTaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: CampaignTaskType
    target_count: int = 1
    points_reward: int = 20
    display_order: int = 1


class CampaignTaskCreate(CampaignTaskBase):
    pass


class CampaignTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: int
    title: str
    description: Optional[str] = None
    task_type: CampaignTaskType
    target_count: int
    points_reward: int
    display_order: int
    user_current_count: int = 0
    is_completed: bool = False
    completed_at: Optional[datetime] = None


class CampaignCreate(BaseModel):
    title: str
    slug: str
    description: str
    season_theme: str
    banner_image_url: Optional[str] = None
    start_at: datetime
    end_at: datetime
    target_metric: str = "reports_filed"
    target_value: int = 100
    region: str = "Chennai"
    points_reward: int = 50
    badge_id: Optional[int] = None
    tasks: List[CampaignTaskCreate] = []


class CampaignUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    season_theme: Optional[str] = None
    banner_image_url: Optional[str] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    target_metric: Optional[str] = None
    target_value: Optional[int] = None
    region: Optional[str] = None
    status: Optional[CampaignStatus] = None
    points_reward: Optional[int] = None
    badge_id: Optional[int] = None


class CampaignListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    description: str
    season_theme: str
    banner_image_url: Optional[str] = None
    start_at: datetime
    end_at: datetime
    target_metric: str
    target_value: int
    current_value: int = 0
    progress_percent: float = 0.0
    region: str
    status: CampaignStatus
    points_reward: int
    badge_id: Optional[int] = None
    badge_name: Optional[str] = None
    badge_icon: Optional[str] = None
    participants_count: int = 0
    tasks_count: int = 0
    is_joined: bool = False
    is_completed: bool = False
    user_points_earned: int = 0
    created_at: datetime


class CampaignLeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    public_id: str
    display_name: str
    points_earned: int
    tasks_completed_count: int
    is_completed: bool
    joined_at: datetime


class CampaignDetail(CampaignListItem):
    model_config = ConfigDict(from_attributes=True)

    tasks: List[CampaignTaskResponse] = []
    top_leaderboard: List[CampaignLeaderboardEntry] = []
    user_tasks_completed: int = 0
    user_total_tasks: int = 0


class CampaignListResponse(BaseModel):
    total: number if False else int
    items: List[CampaignListItem]
    stats: Dict[str, Any]


class CampaignSyncSummary(BaseModel):
    activated_count: int
    completed_count: int
    details: List[str] = []

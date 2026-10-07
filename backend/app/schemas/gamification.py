from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.entities import BadgeRarity


class BadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name_en: str
    name_ta: str
    description_en: str
    description_ta: str
    icon: str
    rarity: BadgeRarity
    threshold: int
    event_type: str
    points_reward: int
    earned: bool = False
    earned_at: Optional[datetime] = None


class UserBadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    badge_id: int
    code: str
    name_en: str
    name_ta: str
    description_en: str
    description_ta: str
    icon: str
    rarity: str
    earned_at: datetime


class GamificationStats(BaseModel):
    reports_count: int
    resolved_count: int
    verifications_given: int


class GamificationProgressResponse(BaseModel):
    score: int
    level: int
    level_title_en: str
    level_title_ta: str
    current_level_min: int
    next_level_threshold: Optional[int]
    points_to_next_level: int
    progress_percent: float
    rank: int
    public_id: str
    public_display_name: str
    leaderboard_opt_out: bool
    stats: GamificationStats
    badges: List[UserBadgeResponse]


class LeaderboardItem(BaseModel):
    rank: int
    public_id: str
    display_name: str
    score: int
    level_title: str
    badge_count: int
    is_current_user: bool = False


class LeaderboardResponse(BaseModel):
    scope: str
    period: str
    total_participants: int
    items: List[LeaderboardItem]


class UserProfileResponse(BaseModel):
    public_id: str
    display_name: str
    level: int
    level_title: str
    score: int
    rank: int
    stats: GamificationStats
    badges: List[UserBadgeResponse]
    member_since: datetime


class PrivacySettingsUpdate(BaseModel):
    public_display_name: Optional[str] = None
    leaderboard_opt_out: Optional[bool] = None

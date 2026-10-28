from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class DuplicateCheckRequest(BaseModel):
    title: str = Field(..., description="Title of the civic issue")
    description: str = Field(..., description="Description of the civic issue")
    category_id: Optional[int] = Field(None, description="Category ID")
    ward_id: Optional[int] = Field(None, description="Ward ID")
    latitude: Optional[float] = Field(None, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, description="Longitude coordinate")
    threshold: float = Field(0.65, ge=0.0, le=1.0, description="Minimum composite duplicate score threshold")
    limit: int = Field(5, ge=1, le=20, description="Maximum number of duplicate candidates to return")
    days_cutoff: Optional[int] = Field(60, ge=1, le=365, description="Search window in days")


class DuplicateCandidate(BaseModel):
    complaint_id: int
    reference_no: str
    title: str
    description: str
    category_name: str
    ward_name: str
    ward_number: Optional[int] = None
    status: str
    created_at: datetime
    distance_meters: Optional[float] = None
    semantic_similarity: float
    spatial_score: float
    category_score: float
    temporal_score: float
    composite_score: float


class DuplicateCheckResponse(BaseModel):
    is_duplicate_likely: bool
    highest_score: float
    candidates_count: int
    candidates: List[DuplicateCandidate]


class ClusterMergeRequest(BaseModel):
    master_complaint_id: int
    duplicate_complaint_ids: List[int]
    cluster_name: Optional[str] = None
    reason: Optional[str] = "Identified as duplicate civic reports of the same incident"

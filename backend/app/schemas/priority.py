from typing import List, Optional
from pydantic import BaseModel, Field

class PriorityPredictionRequest(BaseModel):
    title: str = Field(..., description="Title or headline of the grievance")
    description: Optional[str] = Field("", description="Detailed description")
    category_id: Optional[int] = Field(None, description="Complaint category ID")
    category_code: Optional[str] = Field(None, description="Category code (e.g. ROA_POTHOLE, WAT_BURST)")
    ward_id: Optional[int] = Field(None, description="Ward ID")
    location_text: Optional[str] = Field(None, description="Street name, landmark, or location")


class PriorityPredictionResponse(BaseModel):
    recommended_priority: str = Field(..., description="Predicted priority: CRITICAL, HIGH, MEDIUM, LOW")
    urgency_score: float = Field(..., description="Continuous urgency score from 0.0 to 1.0")
    confidence: float = Field(..., description="Prediction confidence score from 0.0 to 1.0")
    hazard_signals: List[str] = Field(default_factory=list, description="Detected safety hazards or vulnerable zones")
    sla_multiplier: float = Field(1.0, description="Recommended SLA deadline multiplier (e.g. 0.25 for critical)")
    sla_recommended_hours: int = Field(48, description="Recommended resolution deadline in hours")
    explanation: str = Field(..., description="Human-readable rationale for the recommended priority")


from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class SummarizeRequest(BaseModel):
    complaint_id: Optional[int] = Field(None, description="Complaint ID to summarize")
    include_history: bool = Field(True, description="Whether to include status transition audit timeline")
    include_comments: bool = Field(True, description="Whether to include citizen and staff comments")
    language: str = Field("en", description="Summary language: 'en' for English, 'ta' for Tamil")


class ExecutiveSummaryResponse(BaseModel):
    status: str = Field("ready", description="Summary status")
    complaint_id: int
    reference_no: str
    headline: str = Field(..., description="Short one-line title")
    summary: str = Field(..., description="Concise 2-sentence executive summary for Ministers & Admins")
    action_items: List[str] = Field(default_factory=list, description="Immediate 2-3 actionable next steps")
    key_entities: Dict[str, Any] = Field(default_factory=dict, description="Structured metadata: department, ward, status, officer")
    language: str = Field("en", description="Output language")
    model_name: str = Field("NammaNagar-Executive-Summarizer-V1", description="Model identifier")


from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class CitationItem(BaseModel):
    source_type: str = Field(..., description="Type of citation: knowledge_base, complaint, ward, sla_rule, spot, campaign, project")
    title: str = Field(..., description="Display title for the source")
    reference_id: Optional[str] = Field(None, description="Identifier (e.g. GOV-2026-000101, Ward 51, Rule SLA-01)")
    snippet: Optional[str] = Field(None, description="Direct relevant excerpt backing the answer")
    url: Optional[str] = Field(None, description="Optional deep link within application")


class ActionChip(BaseModel):
    label: str = Field(..., description="Action chip button text")
    label_ta: Optional[str] = Field(None, description="Tamil translation for action chip")
    action_type: str = Field(..., description="Type of action: navigate, quick_reply, fill_report, track_complaint, copy_draft")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Action arguments or route path")


class ActionProposal(BaseModel):
    action_name: str = Field(..., description="Proposed system action requiring confirmation")
    summary: str = Field(..., description="Human-readable summary of proposed action")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Parameters for action execution")
    requires_confirmation: bool = Field(True, description="Whether explicit user confirmation is needed")


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    role: str
    content: str
    language: str = "en"
    intent: Optional[str] = None
    citations: Optional[List[CitationItem]] = None
    suggested_actions: Optional[List[ActionChip]] = None
    action_proposal: Optional[ActionProposal] = None
    created_at: datetime


class ChatSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_uuid: str
    user_id: Optional[int] = None
    persona: str = "citizen"
    language: str = "en"
    title: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ChatSessionDetail(ChatSessionResponse):
    messages: List[ChatMessageResponse] = []


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="Citizen or officer query")
    session_uuid: Optional[str] = Field(None, description="Optional existing session UUID to continue thread")
    language: Optional[str] = Field("en", description="Preferred response language: en or ta")
    active_context: Optional[Dict[str, Any]] = Field(None, description="Active UI context: current page, complaint ID, ward ID")


class ChatResponse(BaseModel):
    reply_text: str
    session_uuid: str
    persona: str
    language: str
    intent: str
    citations: List[CitationItem] = []
    suggested_actions: List[ActionChip] = []
    action_proposal: Optional[ActionProposal] = None
    created_at: datetime


class PersonaCapability(BaseModel):
    code: str
    name: str
    name_ta: str
    description: str
    allowed_roles: List[str]
    sample_prompts: List[str]

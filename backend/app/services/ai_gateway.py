from typing import Protocol, List, Dict, Any, Optional
from app.core.config import settings

class AIProvider(Protocol):
    def classify_complaint(self, title: str, description: str) -> Dict[str, Any]:
        ...

    def score_priority(self, title: str, description: str, category_name: str) -> Dict[str, Any]:
        ...

    def find_similar(self, complaint_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        ...

    def summarize(self, complaint_id: int) -> Dict[str, Any]:
        ...


class NoopProvider:
    """Non-AI baseline provider that returns empty seams."""

    def classify_complaint(self, title: str, description: str) -> Dict[str, Any]:
        return {"status": "not_available", "predicted_category": None, "confidence": 0.0}

    def score_priority(self, title: str, description: str, category_name: str) -> Dict[str, Any]:
        return {"status": "not_available", "recommended_priority": None, "confidence": 0.0}

    def find_similar(self, complaint_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        return []

    def summarize(self, complaint_id: int) -> Dict[str, Any]:
        return {"status": "not_available", "summary": None, "key_points": []}


def get_ai_provider() -> AIProvider:
    if settings.AI_ENABLED:
        # Future provider implementation (e.g. LLMProvider / GeminiProvider)
        return NoopProvider()
    return NoopProvider()

ai_provider = get_ai_provider()

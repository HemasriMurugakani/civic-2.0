from typing import Protocol, List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.config import settings

class AIProvider(Protocol):
    def classify_complaint(self, title: str, description: str) -> Dict[str, Any]:
        ...

    def score_priority(self, title: str, description: str, category_name: str) -> Dict[str, Any]:
        ...

    def find_similar(self, complaint_id: int, limit: int = 5, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        ...

    def summarize(self, complaint_id: int, db: Optional[Session] = None, language: str = "en") -> Dict[str, Any]:
        ...


class NoopProvider:
    """Non-AI baseline provider that returns empty seams."""

    def classify_complaint(self, title: str, description: str) -> Dict[str, Any]:
        return {"status": "not_available", "predicted_category": None, "confidence": 0.0}

    def score_priority(self, title: str, description: str, category_name: str) -> Dict[str, Any]:
        return {"status": "not_available", "recommended_priority": None, "confidence": 0.0}

    def find_similar(self, complaint_id: int, limit: int = 5, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        return []

    def summarize(self, complaint_id: int, db: Optional[Session] = None, language: str = "en") -> Dict[str, Any]:
        return {"status": "not_available", "summary": None, "action_items": [], "key_entities": {}}


class LocalMultilingualAIProvider:
    """
    Local ONNX Multilingual AI provider using FastEmbed and Spatio-Temporal Hybrid Scoring.
    Runs 100% locally on CPU without external API calls.
    """

    def classify_complaint(self, title: str, description: str) -> Dict[str, Any]:
        # Rule-based / keyword heuristics
        text = f"{title} {description}".lower()
        if any(w in text for w in ["water", "குடிநீர்", "drainage", "pipe", "sewage"]):
            return {"status": "predicted", "suggested_category": "Water Supply & Sewerage", "confidence": 0.88}
        if any(w in text for w in ["pothole", "சாலை", "road", "street", "tarmac"]):
            return {"status": "predicted", "suggested_category": "Roads & Stormwater Drains", "confidence": 0.90}
        if any(w in text for w in ["light", "மின்விளக்கு", "electric", "wire", "pole"]):
            return {"status": "predicted", "suggested_category": "Streetlights & Electricity", "confidence": 0.89}
        return {"status": "predicted", "suggested_category": "General Sanitation", "confidence": 0.65}

    def score_priority(self, title: str, description: str, category_name: str) -> Dict[str, Any]:
        from app.services.priority_service import PriorityPredictionService
        from app.schemas.priority import PriorityPredictionRequest
        svc = PriorityPredictionService(None)
        req = PriorityPredictionRequest(title=title, description=description)
        res = svc.predict_priority(req)
        return {
            "status": "scored",
            "recommended_priority": res.recommended_priority,
            "urgency_score": res.urgency_score,
            "confidence": res.confidence,
            "hazard_signals": res.hazard_signals,
            "sla_multiplier": res.sla_multiplier,
            "sla_recommended_hours": res.sla_recommended_hours,
            "explanation": res.explanation,
        }

    def find_similar(self, complaint_id: int, limit: int = 5, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        if not db:
            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                from app.services.duplicate_service import DuplicateDetectionService
                svc = DuplicateDetectionService(db)
                return svc.find_similar_complaints(complaint_id, limit=limit)
            finally:
                db.close()
        else:
            from app.services.duplicate_service import DuplicateDetectionService
            svc = DuplicateDetectionService(db)
            return svc.find_similar_complaints(complaint_id, limit=limit)

    def summarize(self, complaint_id: int, db: Optional[Session] = None, language: str = "en") -> Dict[str, Any]:
        if not db:
            from app.core.database import SessionLocal
            db = SessionLocal()
            try:
                from app.services.summarization_service import SummarizationService
                svc = SummarizationService(db)
                res = svc.summarize_complaint(complaint_id, language=language)
                return res.model_dump()
            finally:
                db.close()
        else:
            from app.services.summarization_service import SummarizationService
            svc = SummarizationService(db)
            res = svc.summarize_complaint(complaint_id, language=language)
            return res.model_dump()


def get_ai_provider() -> AIProvider:
    if settings.AI_ENABLED:
        return LocalMultilingualAIProvider()
    # Also default to LocalMultilingualAIProvider if fastembed is installed
    try:
        import fastembed
        return LocalMultilingualAIProvider()
    except ImportError:
        return NoopProvider()

ai_provider = get_ai_provider()

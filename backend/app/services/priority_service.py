import re
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from sqlalchemy.orm import Session

from app.models.entities import (
    Complaint, AIPrediction, ComplaintPriority, ComplaintCategory, Ward
)
from app.schemas.priority import PriorityPredictionRequest, PriorityPredictionResponse
from app.services.duplicate_service import get_embedding_model

logger = logging.getLogger("civic.priority")

# -----------------------------------------------------------------------------
# Canonical Bilingual Anchor Bank (Prototypes)
# -----------------------------------------------------------------------------
ANCHOR_PROTOTYPES = {
    "CRITICAL": [
        "Live high voltage electric wire sparking dangling on street danger of electrocution school children",
        "மின் கம்பி அறுந்து விழுந்து தீப்பொறி பறக்கிறது மின் அதிர்ச்சி உயிருக்கு ஆபத்து பள்ளி குழந்தைகள்",
        "Open manhole uncovered sewage chamber deep pit drowning risk pedestrians falling",
        "மூடப்படாத பாதாள சாக்கடை மேன்ஹோல் குழி பாதசாரிகள் குழந்தைகள் விழும் அபாயம்",
        "Contaminated poisoned drinking tap water chemical sewage foul smell cholera epidemic outbreak",
        "குடிநீரில் நச்சுக்கழிவு சாக்கடை கலந்து துர்நாற்றம் காலரா நோய் பரவும் அபாயம் மக்கள் பாதிப்பு",
        "Major road cave in structural collapse bridge sinkhole immediate vehicle fatal accident",
        "திடீர் சாலை உள்வாங்குதல் பாலம் விரிசல் பெரிய விபத்து அபாயம் வாகனங்கள் கவிழும் நிலை",
        "Gas cylinder leak chemical toxic fumes fire explosion risk panic residential colony",
        "எரிவாயு கசிவு நச்சு வாயு தீ விபத்து வெடிப்பு அபாயம் மக்கள் வெளியேற்றம்",
    ],
    "HIGH": [
        "Complete drinking water supply cut off 3 days no water hospital school residential area",
        "குடிநீர் விநியோகம் முற்றிலுமாக தடைப்பட்டு 3 நாட்களாக அவதி மருத்துவமனை பள்ளி குடியிருப்பு",
        "Severe monsoon flood water stagnation knee deep entering houses venomous snakes",
        "மழைநீர் வீடுகளுக்குள் புகுந்து முழங்கால் அளவு தேக்கம் விஷப் பூச்சிகள் போக்குவரத்து முடக்கம்",
        "Deep crater pothole on national highway arterial road causing multiple bike accidents",
        "தேசிய நெடுஞ்சாலையில் பெரிய பள்ளம் தொடர் இருசக்கர வாகன விபத்துகள்",
        "Large fallen banyan tree blocking main hospital ambulance route and traffic",
        "பெரிய மரம் விழுந்து மருத்துவமனை ஆம்புலன்ஸ் பாதை அடைப்பு போக்குவரத்து பாதிப்பு",
        "Aggressive rabid stray dog pack biting pedestrians children rabies menace",
        "வெறி நாய் கடி பொதுமக்கள் குழந்தைகள் மீது தாக்குதல் நாய்கள் தொல்லை",
    ],
    "MEDIUM": [
        "Street light not burning residential inner street lane dark at night difficulty walking",
        "தெரு விளக்கு எரியவில்லை குடியிருப்பு பகுதி இரவில் செல்ல அச்சம்",
        "Public municipal garbage bin overflowing waste scattered on sidewalk bad smell",
        "குப்பைத் தொட்டி நிரம்பி வழிகிறது நடைபாதையில் குப்பை சிதறல் துர்நாற்றம்",
        "Pothole on residential colony lane slow moving traffic vehicle bounce",
        "குடியிருப்பு தெருவில் சிறு பள்ளம் வாகனங்கள் மெதுவாக செல்கின்றன",
        "Minor water pipe joint leakage water dripping slowly on ground",
        "குழாய் இணைப்பில் சிறிய கசிவு நீர் வீணாகிறது",
        "Dead animal carcass on street side foul smell municipal removal needed",
        "சாலையோரம் இறந்த விலங்கு உடல் துர்நாற்றம் அகற்றப்பட வேண்டும்",
    ],
    "LOW": [
        "Defaced wall poster peeling on public government building bus stop paint faded",
        "சுவர் விளம்பரம் அகற்றப்பட வேண்டும் பேருந்து நிறுத்தம் வண்ணம் மங்கியுள்ளது",
        "Park bench wooden plank loose garden weeds overgrowth maintenance needed",
        "பூங்கா பெஞ்ச் பலகை தளர்ந்துள்ளது புல் செடிகள் வெட்டப்பட வேண்டும்",
        "Spelling mistake on municipal ward signboard lettering incorrect",
        "பெயர் பலகை எழுத்து பிழை திருத்தப்பட வேண்டும்",
        "Request for additional dustbin to be placed in residential street corner",
        "தெரு முனையில் கூடுதல் குப்பைத் தொட்டி வைக்க கோரிக்கை",
    ],
}

# -----------------------------------------------------------------------------
# Domain Hazard Rulebook (Regex & Keyword Signals)
# -----------------------------------------------------------------------------
HAZARD_RULES = [
    {
        "signal": "Live electric wire / electrocution hazard",
        "patterns": [
            r"wire.*(?:spark|hang|dang|fell|shock|electrocution|fire|snapp)",
            r"(?:sparking|snapped|dangling|live)\s+(?:wire|cable|transformer|pole)",
            r"மின்\s*கம்பி.*(?:அறுந்து|தீப்பொறி|அதிர்ச்சி|தொங்கு)",
            r"தீப்பொறி|மின்கசிவு|மின்சார\s*தாக்குதல்",
        ],
        "urgency_boost": 0.45,
        "forced_priority": "CRITICAL",
    },
    {
        "signal": "Open manhole / deep chamber hazard",
        "patterns": [
            r"open\s+(?:manhole|drain|gutter|chamber|pit)",
            r"(?:uncovered|broken)\s+(?:manhole|slab|drainage\s+lid)",
            r"மூடப்படாத\s+(?:மேன்ஹோல்|சாக்கடை|குழி)",
            r"பாதாள\s+சாக்கடை\s+மூடி\s+உடைப்பு",
        ],
        "urgency_boost": 0.40,
        "forced_priority": "CRITICAL",
    },
    {
        "signal": "Contaminated drinking water / public health emergency",
        "patterns": [
            r"(?:contaminated|toxic|poison|foul|chemical|cholera)\s+(?:water|tap|drinking)",
            r"sewage\s+(?:mixing|mixed|entering)\s+(?:drinking|tap)\s+water",
            r"குடிநீரில்.*(?:சாக்கடை|கலந்து|துர்நாற்றம்|நச்சு|கலங்கல்)",
            r"வாந்தி\s*பேதி|காலரா|நோய்\s*தொற்று",
        ],
        "urgency_boost": 0.35,
        "forced_priority": "CRITICAL",
    },
    {
        "signal": "Structural cave-in / bridge collapse risk",
        "patterns": [
            r"(?:road|bridge|wall)\s+(?:cave|sinkhole|collapse|crack|crater)",
            r"சாலை\s+(?:உள்வாங்குதல்|பிளவு|பெரிய\s+பள்ளம்)",
            r"பாலம்\s+விரிசல்|சுவர்\s+இடியும்\s+நிலை",
        ],
        "urgency_boost": 0.30,
        "forced_priority": "CRITICAL",
    },
    {
        "signal": "School zone / children proximity",
        "patterns": [
            r"(?:school|kindergarten|primary\s+school|nursery|students|kids|children)",
            r"பள்ளி|குழந்தைகள்|மாணவர்கள்",
        ],
        "urgency_boost": 0.15,
        "forced_priority": None,
    },
    {
        "signal": "Hospital / medical emergency corridor",
        "patterns": [
            r"(?:hospital|clinic|ambulance|patients|maternity|icu)",
            r"மருத்துவமனை|ஆம்புலன்ஸ்|நோயாளிகள்",
        ],
        "urgency_boost": 0.15,
        "forced_priority": None,
    },
    {
        "signal": "Monsoon flooding / homes waterlogged",
        "patterns": [
            r"(?:monsoon|flood|waterlog|submerged|knee\s+deep)\s+(?:water|homes|houses)",
            r"வெள்ளம்|மழைநீர்\s+வீடுகளில்\s+புகுந்தது|வெள்ளப்பெருக்கு",
        ],
        "urgency_boost": 0.20,
        "forced_priority": "HIGH",
    },
    {
        "signal": "National highway / arterial road accident hazard",
        "patterns": [
            r"(?:national\s+highway|expressway|arterial\s+road|speeding|fatal\s+accident)",
            r"தேசிய\s+நெடுஞ்சாலை|பைபாஸ்|அதிவேக\s+விபத்து",
        ],
        "urgency_boost": 0.15,
        "forced_priority": "HIGH",
    },
]


class PriorityPredictionService:
    """
    Bilingual AI Priority Prediction Service (English + Tamil + Tanglish).
    Uses FastEmbed Multilingual ONNX Embeddings + Canonical Anchor Bank + Domain Hazard Rules.
    """

    _anchor_vectors: Optional[Dict[str, np.ndarray]] = None

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self.model = get_embedding_model()
        self._ensure_anchor_vectors()

    # -------------------------------------------------------------------------
    # Anchor Vector Bank Initialization
    # -------------------------------------------------------------------------
    @classmethod
    def _ensure_anchor_vectors(cls):
        """Pre-compute normalized anchor vectors once and cache in memory."""
        if cls._anchor_vectors is not None:
            return

        model = get_embedding_model()
        vectors_by_tier = {}

        for tier, text_list in ANCHOR_PROTOTYPES.items():
            if model != "fallback":
                try:
                    embeds = list(model.embed(text_list))
                    matrix = np.array(embeds, dtype=np.float32)
                    # Normalize each row
                    norms = np.linalg.norm(matrix, axis=1, keepdims=True)
                    matrix = np.divide(matrix, norms, out=np.zeros_like(matrix), where=norms > 0)
                    vectors_by_tier[tier] = matrix
                except Exception as e:
                    logger.warning(f"Could not encode anchor prototypes for {tier}: {e}")
            else:
                vectors_by_tier[tier] = np.zeros((len(text_list), 384), dtype=np.float32)

        cls._anchor_vectors = vectors_by_tier
        logger.info("Priority Prediction anchor prototype bank initialized.")

    def encode_text(self, text: str) -> np.ndarray:
        """Encode query into a unit-normalized 384-dimensional vector."""
        if self.model != "fallback":
            try:
                embeds = list(self.model.embed([text]))
                vec = np.array(embeds[0], dtype=np.float32)
                norm = np.linalg.norm(vec)
                return vec / norm if norm > 0 else vec
            except Exception:
                pass
        # Fallback 384-dim zero vector
        return np.zeros(384, dtype=np.float32)

    # -------------------------------------------------------------------------
    # Hazard Signal Extraction
    # -------------------------------------------------------------------------
    @staticmethod
    def extract_hazard_signals(text: str) -> Tuple[List[str], float, Optional[str]]:
        """
        Scan text for life-safety hazards, sensitive zones, and risk amplifiers.
        Returns: (detected_signals, total_urgency_boost, highest_forced_priority)
        """
        detected_signals = []
        urgency_boost = 0.0
        forced_priority = None

        text_lower = text.lower()

        for rule in HAZARD_RULES:
            matched = False
            for pat in rule["patterns"]:
                if re.search(pat, text_lower, re.IGNORECASE):
                    matched = True
                    break
            if matched:
                detected_signals.append(rule["signal"])
                urgency_boost += rule["urgency_boost"]
                if rule["forced_priority"] == "CRITICAL":
                    forced_priority = "CRITICAL"
                elif rule["forced_priority"] == "HIGH" and forced_priority != "CRITICAL":
                    forced_priority = "HIGH"

        return detected_signals, min(urgency_boost, 0.60), forced_priority

    # -------------------------------------------------------------------------
    # Core Priority Prediction Pipeline
    # -------------------------------------------------------------------------
    def predict_priority(self, req: PriorityPredictionRequest) -> PriorityPredictionResponse:
        """
        Evaluate grievance text and produce an authoritative AI priority scoring.
        """
        parts = [req.title.strip()]
        if req.description and req.description.strip() != req.title.strip():
            parts.append(req.description.strip())
        if req.location_text:
            parts.append(f"Location: {req.location_text.strip()}")
        full_text = " — ".join(parts)

        # 1. Extract Domain Hazard Signals
        hazard_signals, hazard_boost, forced_priority = self.extract_hazard_signals(full_text)

        # 2. Semantic Anchor Cosine Similarity
        vec = self.encode_text(full_text)
        tier_scores: Dict[str, float] = {}

        if self._anchor_vectors:
            for tier, anchor_matrix in self._anchor_vectors.items():
                if len(anchor_matrix) > 0:
                    sims = anchor_matrix @ vec
                    # Use top-2 average similarity
                    top_sims = np.sort(sims)[-2:]
                    tier_scores[tier] = float(np.mean(top_sims))
                else:
                    tier_scores[tier] = 0.0
        else:
            tier_scores = {"CRITICAL": 0.2, "HIGH": 0.2, "MEDIUM": 0.5, "LOW": 0.2}

        crit_sim = tier_scores.get("CRITICAL", 0.0)
        high_sim = tier_scores.get("HIGH", 0.0)
        med_sim = tier_scores.get("MEDIUM", 0.0)
        low_sim = tier_scores.get("LOW", 0.0)

        # 3. Base Urgency Calculation
        base_urgency = (
            crit_sim * 1.0 +
            high_sim * 0.70 +
            med_sim * 0.40 +
            low_sim * 0.15
        ) / max(crit_sim + high_sim + med_sim + low_sim, 0.001)

        # Incorporate hazard boost
        combined_urgency = float(np.clip(base_urgency * 0.65 + hazard_boost * 0.35, 0.05, 0.99))

        # 4. Final Priority Classification Decision & Normalized Urgency Score
        if forced_priority == "CRITICAL" or crit_sim >= 0.65 or combined_urgency >= 0.80:
            rec_priority = "CRITICAL"
            sla_mult = 0.25
            sla_hours = 6
            confidence = min(0.99, max(0.88, crit_sim + hazard_boost))
            final_urgency = float(np.clip(max(combined_urgency, 0.82 + hazard_boost * 0.25), 0.82, 0.99))
            explanation = "Classified as CRITICAL due to imminent life-safety or public health hazard signals."
            if hazard_signals:
                explanation += f" Detected hazards: {', '.join(hazard_signals)}."
        elif forced_priority == "HIGH" or high_sim >= 0.58 or combined_urgency >= 0.60:
            rec_priority = "HIGH"
            sla_mult = 0.50
            sla_hours = 24
            confidence = min(0.95, max(0.78, high_sim + hazard_boost))
            final_urgency = float(np.clip(max(combined_urgency, 0.65 + hazard_boost * 0.20), 0.62, 0.81))
            explanation = "Classified as HIGH due to extensive community impact or vulnerable zone proximity."
            if hazard_signals:
                explanation += f" Detected factors: {', '.join(hazard_signals)}."
        elif low_sim > med_sim + 0.18 and combined_urgency < 0.35:
            rec_priority = "LOW"
            sla_mult = 1.50
            sla_hours = 72
            confidence = min(0.92, max(0.70, low_sim))
            final_urgency = float(np.clip(combined_urgency, 0.05, 0.35))
            explanation = "Classified as LOW priority non-urgent cosmetic or routine maintenance request."
        else:
            rec_priority = "MEDIUM"
            sla_mult = 1.00
            sla_hours = 48
            confidence = min(0.88, max(0.65, med_sim))
            final_urgency = float(np.clip(combined_urgency, 0.36, 0.61))
            explanation = "Classified as standard MEDIUM priority municipal service grievance."

        return PriorityPredictionResponse(
            recommended_priority=rec_priority,
            urgency_score=round(final_urgency, 4),
            confidence=round(confidence, 4),
            hazard_signals=hazard_signals,
            sla_multiplier=sla_mult,
            sla_recommended_hours=sla_hours,
            explanation=explanation,
        )

    # -------------------------------------------------------------------------
    # Persist Prediction into Database
    # -------------------------------------------------------------------------
    def evaluate_and_record_complaint(self, complaint: Complaint) -> PriorityPredictionResponse:
        """
        Evaluate a complaint and persist the result into the ai_predictions table.
        """
        category_name = complaint.category.name_en if complaint.category else None
        req = PriorityPredictionRequest(
            title=complaint.title,
            description=complaint.description,
            category_id=complaint.category_id,
            category_code=complaint.category.code if complaint.category else None,
            ward_id=complaint.ward_id,
            location_text=complaint.address_text,
        )
        res = self.predict_priority(req)

        if self.db:
            try:
                pred = AIPrediction(
                    complaint_id=complaint.id,
                    task="priority_scoring",
                    label=res.recommended_priority.lower(),
                    score=res.urgency_score,
                    confidence=res.confidence,
                    model_name="NammaNagar-Multilingual-Priority-V1",
                    model_version="1.0.0",
                    created_at=datetime.utcnow(),
                )
                self.db.add(pred)
                self.db.commit()
            except Exception as e:
                self.db.rollback()
                logger.warning(f"Could not record AIPrediction for complaint {complaint.id}: {e}")

        return res

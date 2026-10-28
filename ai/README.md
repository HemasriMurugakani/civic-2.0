# AI-GovInsight: AI Models Roadmap & Data Contracts

This document specifies the planned AI services, data contracts, and integration seams for AI-GovInsight. In accordance with the non-AI MVP specification, baseline rule-based systems are currently deployed with clean abstraction interfaces (`AIProvider` in `backend/app/services/ai_gateway.py`).

---

## 1. Planned Tasks & Models

### Task A: Grievance Auto-Classification (`classify_complaint`)
- **Objective**: Automatically route citizen complaints to the correct Department and Complaint Category based on free-form bilingual text (Tamil / English / Tanglish).
- **Planned Model**: Fine-tuned IndicBERT or multilingual RoBERTa-Tamil.
- **Contract**:
  ```json
  // Input
  {
    "title": "Water pipe broken near market",
    "description": "Drinking water flowing into drainage since morning"
  }
  // Output
  {
    "suggested_category_id": 9,
    "category_code": "WAT_PIPE_BURST",
    "department_id": 2,
    "confidence_score": 0.94,
    "secondary_predictions": [
      {"category_code": "WAT_SEWAGE_OVERFLOW", "confidence": 0.05}
    ]
  }
  ```

---

## 2. Task B: Severity & Urgency Priority Scoring (`score_priority`)
- **Objective**: Detect life-safety risks (e.g. open manholes during monsoon, live dangling electric wires, contaminated drinking water) and automatically recommend priority level (`critical`, `high`, `medium`, `low`).
- **Planned Model**: DistilBERT with risk-keyword attention layers and spatial hazard proximity features.
- **Contract**:
  ```json
  // Input
  {
    "title": "Dangling high voltage wire near school gate",
    "description": "Wire sparking, children walking past",
    "ward_id": 51
  }
  // Output
  {
    "recommended_priority": "critical",
    "urgency_score": 0.98,
    "hazard_signals": ["high voltage", "school proximity", "sparking"],
    "sla_multiplier": 0.5
  }
  ```

---

## 3. Task C: Vector Semantic Duplicate Detection (`find_similar`) — [LIVE]
- **Status**: **Implemented & Deployed** (`app.services.duplicate_service.DuplicateDetectionService`)
- **Objective**: Cluster citizen reports about the same incident (e.g., 20 residents filing complaints about the same transformer blast or main water burst) to prevent duplicate work, alert citizens during filing, and compute issue impact.
- **Model**: Local ONNX `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` via `fastembed` (384-dimensional dense bilingual embeddings, 6ms CPU inference).
- **Hybrid Scoring**:
  $$\text{DuplicateScore} = 0.50 \cdot S_{\text{semantic}} + 0.30 \cdot S_{\text{spatial}} + 0.15 \cdot S_{\text{category}} + 0.05 \cdot S_{\text{temporal}}$$
- **Active Endpoints**:
  - `POST /api/v1/public/issues/check-duplicate` (Public live check before citizen submission)
  - `GET /api/v1/complaints/{id}/similar` (Officer candidate view)
  - `POST /api/v1/complaints/merge-cluster` (Cluster & merge under Master Incident)
- **Contract**:
  ```json
  // Input (POST /api/v1/public/issues/check-duplicate)
  {
    "title": "Water pipe broken near market",
    "description": "Drinking water flowing on road",
    "ward_id": 51,
    "latitude": 13.1110,
    "longitude": 80.2970,
    "threshold": 0.65,
    "limit": 5
  }
  // Output
  {
    "is_duplicate_likely": true,
    "highest_score": 0.89,
    "candidates_count": 2,
    "candidates": [
      {
        "complaint_id": 1418,
        "reference_no": "GOV-2026-001418",
        "title": "Main water supply pipe burst",
        "description": "Water leaking on road since morning",
        "category_name": "Pipe Burst & Water Loss",
        "ward_name": "Zone 5 - Royapuram",
        "distance_meters": 45.2,
        "semantic_similarity": 0.91,
        "spatial_score": 1.0,
        "composite_score": 0.89
      }
    ]
  }
  ```

---

## 4. Task D: Thread & Grievance Summarization (`summarize`)
- **Objective**: Generate concise 2-sentence executive summaries for Department Admins and Ministers.
- **Planned Model**: Gemini 1.5 Flash / Gemma 2 9B.
- **Contract**:
  ```json
  // Input
  {
    "complaint_id": 1420,
    "include_history": true
  }
  // Output
  {
    "summary": "Resident reported contaminated tap water on 12th Oct. Crew isolated pipe rupture; repair ongoing; citizen notified.",
    "action_items": ["Inspect valve 4B", "Collect water sample for purity test"],
    "status": "ready"
  }
  ```

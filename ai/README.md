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

## 2. Task B: Severity & Urgency Priority Scoring (`score_priority`) — [LIVE]
- **Status**: **Implemented & Deployed** (`app.services.priority_service.PriorityPredictionService`)
- **Objective**: Detect life-safety hazards (live dangling wires, open manholes, contaminated drinking water, hospital/school zones, fire/spark hazards, structural collapse) and automatically recommend priority tier (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) with accelerated SLA resolution deadlines.
- **Model Architecture**: FastEmbed Multilingual ONNX Embeddings (`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`) with Canonical Bilingual Anchor Bank + Domain Hazard Signal Rules (Tamil, English, and Tanglish).
- **Active Endpoints**:
  - `POST /api/v1/public/issues/predict-priority` (Public pre-submission priority prediction seam)
  - `POST /api/v1/complaints/predict-priority` (Authenticated priority prediction seam)
  - `GET /api/v1/complaints/{id}/ai-insights` (Officer & Auditor AI Risk Inspection)
- **Contract**:
  ```json
  // Input (POST /api/v1/public/issues/predict-priority)
  {
    "title": "Dangling high voltage wire near primary school gate",
    "description": "Wire sparking, children walking past, danger of electrocution",
    "location_text": "Anna Salai, Royapuram"
  }
  // Output
  {
    "recommended_priority": "CRITICAL",
    "urgency_score": 0.97,
    "confidence": 0.99,
    "hazard_signals": [
      "Live electric wire / electrocution hazard",
      "School zone / children proximity"
    ],
    "sla_multiplier": 0.25,
    "sla_recommended_hours": 6,
    "explanation": "Classified as CRITICAL due to imminent life-safety or public health hazard signals. Detected hazards: Live electric wire / electrocution hazard, School zone / children proximity."
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

## 4. Task D: Thread & Grievance Summarization (`summarize`) — [LIVE]
- **Status**: **Implemented & Deployed** (`app.services.summarization_service.SummarizationService`)
- **Objective**: Generate concise 2-sentence executive summaries for Department Admins and Ministers with immediate actionable next steps and entity extraction.
- **Engine**: Fast Bilingual Executive Briefing Engine adhering to the **2-sentence structural invariant** (Sentence 1: Origin, Date, Ward, and Defect Category; Sentence 2: Field Notes, Assigned Officer, and Real-Time Resolution Milestone) in English & Tamil (`தமிழ்`).
- **Active Endpoints**:
  - `GET /api/v1/public/issues/{id}/summary?language=en|ta` (Public Executive Briefing for citizens, ministers, and auditors)
  - `GET /api/v1/complaints/{id}/summary?language=en|ta` (Department Admin and Officer Executive Briefing)
  - `POST /api/v1/complaints/{id}/summarize` (Customizable briefing with history and comment controls)
- **Frontend Integration**: [`ExecutiveSummaryCard.tsx`](file:///Users/mk/Desktop/civic-2.0/frontend/src/components/common/ExecutiveSummaryCard.tsx) on `/issues/:id` and `/complaints/:id` with one-click EN/தமிழ் toggle, ministerial copy button, and actionable next steps.
- **Contract**:
  ```json
  // Request: GET /api/v1/public/issues/1/summary?language=en
  // Response (200 OK)
  {
    "status": "ready",
    "complaint_id": 1,
    "reference_no": "TN-2026-000001",
    "headline": "Garbage Accumulation at Ward 21 - Chromepet, Chengalpattu",
    "summary": "Resident reported சந்தை பகுதியில் பெருமளவு குப்பை தேக்கம் in Ward 21 - Chromepet, Chengalpattu on Sep 05, 2026, classified under Garbage Accumulation. Field operations are actively underway (field crew actively executing rectification work) under assigned officer Manikandan R..",
    "action_items": [
      "Complete on-site physical civil/electrical rectification work",
      "Capture and upload mandatory post-repair evidence photograph"
    ],
    "key_entities": {
      "department": "Sanitation & Solid Waste Management",
      "ward": "Ward 21 - Chromepet, Chengalpattu",
      "ward_number": 202,
      "status": "in_progress",
      "priority": "high",
      "assigned_officer": "Manikandan R.",
      "elapsed_days": 53.5,
      "sla_status": "breached_sla",
      "evidence_count": 0,
      "timeline_events_count": 4
    },
    "language": "en",
    "model_name": "NammaNagar-Executive-Summarizer-V1"
  }
  ```

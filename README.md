# NammaNagar (நம்ம நகர்)

> **Citizen Grievance Redressal & Transparent Governance Platform**  
> Government of Tamil Nadu Civic Technology Infrastructure. Built for high trust, rapid bilingual mobile reporting (<2 mins), public community verification, enforceable SLA accountability, infrastructure transparency, civic education, and community stewardship across Tamil Nadu constituencies and municipal corporations.

---

## 🏛️ Comprehensive Feature Capabilities

### 1. Core Grievances & Governance Workflow
- **Bilingual Experience**: Full English and Tamil (`தமிழ்`) support across public pages, citizen filing, and category taxonomies with Google Noto Sans Tamil & Inter typography.
- **Canonical 20-Category Civic Filing**: Specialized filing taxonomy (Roads & Potholes, Streetlights, Water Supply, Drainage, Garbage, Public Health, Transport, Animal Menace, etc.) with automated constituency detection, GPS geolocation, and photo evidence.
- **Public Community Verification Board (`/issues`)**: Transparent public tracking board with district filters, verification votes, dispute reporting, and local representative / MLA / MP accountability.
- **Official SLA Tracking Pipeline (`/track`)**: Real-time status lookup with live audit progress timeline, SLA compliance chips, and official government accountability guarantees.
- **Strict Role-Based Access Control (RBAC)**: Repository-level scoping (`ScopedQueryBuilder`) preventing data leaks across four roles: Citizens, Field Officers, Department Administrators, and Government Administrators.
- **Audited Finite State Machine**: Formal state transitions:
  $$\text{Submitted} \longrightarrow \text{Assigned} \longrightarrow \text{Acknowledged} \longrightarrow \text{In Progress} \longrightarrow \text{Resolved} \longrightarrow \text{Citizen Verified}$$
  $$\text{Resolved} \longrightarrow \text{Reopened} \longrightarrow \text{Assigned}$$
- **SLA Escalation Engine**: Automated background engine calculating elapsed thresholds ($70\%$ approaching warning, $>100\%$ breach Level 1 to officer & department admin, $>24\text{h}$ breach Level 2 to state admin) with idempotent notification keys.
- **Interactive Officer Workbench (`/officer`)**: Drag-and-drop Kanban board (`@dnd-kit`) with live SLA countdown chips and mandatory rectification notes & after-repair photos.
- **Department & State Analytics (`/department`, `/governance`)**: SQL aggregations, EXPLAIN ANALYZE-optimized composite indexing, 14-day resolution trends, ward hotspot rankings, and officer workload rebalancing.
- **Interactive GIS Map (`/gis`)**: Leaflet + OpenStreetMap spatial analytics displaying priority pins, ward grievance density circles, and zone drawers.

### 2. Gamification Core & Reputation Engine (Milestone F1) (`/leaderboard`)
- **Append-Only Points Ledger**: Points earned with idempotency keys and automatic signed reversal upon content moderation or dispute resolution.
- **Level Thresholds (L1 - L5)**: Civic Novice ($0-99$), Ward Contributor ($100-299$), Community Champion ($300-699$), Civic Leader ($700-1499$), and Governance Luminary ($1500+$).
- **Badge Catalog**: Automated evaluation for milestones (First Grievance, Community Verifier, Spot Caretaker, Certified Citizen, Campaign Hero).
- **Competitive Leaderboards**: Filterable by Statewide, District, and Monthly periods with strict privacy opt-out toggle.

### 3. Infrastructure Project Tracker & Open Data Sync (Milestone F2) (`/projects`)
- **Public Works Monitoring**: Real-time capital expenditure tracking, contractor transparency, physical completion progress, and delay flagging.
- **Open Data Sync Adapter**: Bi-directional ingestion adapter with conflict resolution that protects local municipal modifications (`ProjectSource.LOCAL_TRACKING`).
- **Community Engagement**: Citizens follow projects for milestone alerts, submit transparency ratings (1-5 stars), and review progress photos.

### 4. Community Hub & Action Groups (Milestone F3) (`/community`)
- **Neighborhood Action Groups**: Public and closed citizen collectives organized around ward problems and civic causes with member roles and dedicated forums.
- **Civic Discussion Threads**: Community problem-solving forum with upvoting, threaded replies, and "Best Answer" recognition.
- **Content Safety & Moderation Queue**: Regex keyword filters and staff moderation dashboard with audit logging (`moderation_audit_logs`) and points clawback.

### 5. Civic Education Academy & PDF Certificates (Milestone F4) (`/education`)
- **State-Accredited Curriculum**: Interactive modules on Solid Waste Management, Grievance Rights, Ward Sabhas, RTI Act, and Water Conservation.
- **Knowledge Evaluations**: Formative quizzes with immediate explanations and 70% passing criterion.
- **Official PDF Certificates**: Dynamically rendered high-resolution PDF certificates generated with ReportLab.
- **Public Verification (`/verify/:code`)**: QR-code ready public verification portal for validating authenticity of issued certificates.

### 6. Adopt-a-Spot Public Space Stewardship (Milestone F5) (`/spots`)
- **Civic Space Stewardship**: Citizens adopt parks, bus stops, water bodies, and school buffers with actionable care pledges.
- **Periodic Check-ins**: Submit photo proof and completed maintenance checklists to earn civic points (+15 pts).
- **Cadence Scheduler**: APScheduler jobs monitor check-in cadences, emit reminders, and auto-release spots after 3 missed cycles.

### 7. Seasonal Civic Campaigns (Milestone F6) (`/campaigns`)
- **Target-Driven Campaigns**: Monsoon Preparedness, Swachh Ward Challenge, Water Body Rejuvenation, and Green Corridor Drive.
- **Milestone Task Progress**: Citizens join campaigns, execute designated tasks, and earn bonus points and exclusive badges.
- **Automated Lifecycle Transitions**: Time-based background transitions (`draft -> scheduled -> active -> completed`).

### 8. AI Semantic Duplicate Detection & Clustering (Milestone AI-1) (`/report`)
- **Local Multilingual ONNX Embeddings**: FastEmbed `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (384 dimensions, 6ms CPU inference).
- **Hybrid Spatio-Temporal Consensus Formula**: Jointly evaluates text cosine similarity (0.50), geodesic distance (0.30), category taxonomy (0.15), and temporal decay (0.05).
- **Live Citizen Upvote Seam**: Real-time debounced check on `/report` surfaces nearby matching tickets to prevent redundant filings.
- **Master Incident Clustering**: Merges duplicate tickets under canonical `ComplaintCluster` entities.
- **Architecture Documentation**: Detailed specifications in [`docs/architecture/semantic-duplicate-detection.md`](docs/architecture/semantic-duplicate-detection.md).

---

## 🚀 Quickstart & Setup Guide

### 1. Prerequisites
- **Python**: 3.11+
- **Node.js**: 18+ (tested on Node v20/v22/v24)
- **PostgreSQL**: 14+ running locally on port 5432

### 2. Database Setup
```bash
# Create database
createdb aigovinsight
```

### 3. Backend Setup
```bash
# Set up virtual environment
python3 -m venv backend/venv
source backend/venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Run migrations & seed realistic Tamil Nadu data (complaints, projects, groups, spots, campaigns)
PYTHONPATH=backend alembic upgrade head
PYTHONPATH=backend python -m app.scripts.seed --reset

# Start FastAPI server (runs on http://127.0.0.1:8000)
PYTHONPATH=backend uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4. Frontend Setup
```bash
cd frontend
npm install

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

---

## 🔑 Demo Login Credentials

All demo accounts share the password: **`Civic@123`**.  
The login page provides **1-click quick evaluation buttons** to switch roles instantly.

| Role | Email / Username | Mobile Number | Department / Scope |
| :--- | :--- | :--- | :--- |
| **Government Admin** | `govadmin@tngov.in` | `9800000001` | State Secretariat (Global Oversight) |
| **Dept Admin (Sanitation)** | `admin.sanitation@tngov.in` | `9800000010` | Solid Waste Management |
| **Dept Admin (Water)** | `admin.water@tngov.in` | `9800000020` | Water Supply & Sewerage Board |
| **Dept Admin (Roads)** | `admin.roads@tngov.in` | `9800000030` | Roads & Stormwater Drains |
| **Nodal Officer** | `officer.san1@tngov.in` | `9810000011` | Ward 51 (Royapuram) |
| **Nodal Officer** | `officer.wat1@tngov.in` | `9810000021` | Ward 102 (Anna Nagar) |
| **Citizen (Kavitha S.)** | `citizen1@tngov.in` | `9840000001` | Ward 51 Resident |
| **Citizen (Senthil N.)** | `citizen2@tngov.in` | `9840000002` | Ward 117 Resident |

---

## 🧪 Quality Suite & Automated Testing (Milestone F7)

### 1. Pytest Backend Suite (58 Tests Passing)
Run the complete unit and integration test suite:
```bash
PYTHONPATH=backend ./backend/venv/bin/pytest tests/ -v
```

Test coverage includes:
- `tests/test_quality_comprehensive.py`: Points ledger idempotency & reversals, badge rules, state transitions, open data sync conflict handling, RBAC permissions, community moderation queue, certificate verification.
- `tests/test_gamification.py`: Points economy, anti-abuse daily caps, leaderboards, level calculation.
- `tests/test_projects.py`: Project follower lifecycle, open data sync adapter, community transparency ratings.
- `tests/test_community.py`: Action groups, memberships, forum posts, discussion replies, best answers, flag queue.
- `tests/test_education.py`: Modules, lessons, quiz evaluation, ReportLab PDF generation, verification endpoint.
- `tests/test_spots.py`: Spot adoption, care check-ins, auto-release scheduler, photo submission.
- `tests/test_campaigns.py`: Seasonal campaigns, task progress tracking, participant metrics, state transitions.
- `tests/test_rbac.py`: Strict repository scoping, multi-department boundaries, forbidden actions.
- `tests/test_state_machine.py`: Legal grievance lifecycle and rejection of illegal state transitions.
- `tests/test_sla_engine.py`: Frozen-clock SLA breach escalation, warning triggers, notification idempotency.
- `tests/test_lifecycle_e2e.py`: Full end-to-end citizen submission to officer resolution lifecycle.

### 2. Playwright E2E User Journeys (5/5 Passing)
Run the Playwright end-to-end test suite against Chromium:
```bash
cd frontend
npx playwright test
```

Tested journeys:
1. **Citizen Group & Post**: Citizen joins a neighborhood action group and posts a topic in the community forum.
2. **Citizen Points & Badges**: Citizen earns civic points and reviews badge progression on the gamification leaderboard.
3. **Citizen Education & Certificate**: Citizen reviews module syllabus, tests evaluation, and verifies an accredited certificate at `/verify/:code`.
4. **Adopt-a-Spot Stewardship**: Citizen explores adoptable spaces, reviews stewardship commitments, and adopts a spot.
5. **Infrastructure Follower**: Citizen follows a capital infrastructure project and monitors real-time notification alerts.

---

## 📂 Repository Structure

```
civic-2.0/
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── api/v1/             # FastAPI routers (auth, complaints, projects, community, education, spots, campaigns)
│   │   ├── core/               # Database engine, security (JWT/bcrypt), configuration
│   │   ├── models/             # SQLAlchemy 2.0 entities, enums, composite indexes
│   │   ├── repositories/       # Scoped query builders enforcing RBAC
│   │   ├── schemas/            # Pydantic v2 validation contracts
│   │   ├── scripts/            # Seed data (realistic Tamil Nadu grievances, projects, spots)
│   │   └── services/           # State machine, gamification, SLA engine, scheduler, PDF generator
│   └── uploads/                # Local file storage (S3-ready abstraction)
├── frontend/
│   ├── e2e/                    # Playwright end-to-end test suite
│   ├── src/
│   │   ├── components/         # StatusBadge, SLAChip, StatCard, Timeline, DataTable, AppLayout
│   │   ├── i18n/               # Bilingual English / Tamil localization
│   │   ├── lib/                # Auth provider, API client, TypeScript types
│   │   └── pages/              # Landing, Report, Issues, Projects, Community, Education, Spots, Campaigns
│   └── playwright.config.ts    # Playwright configuration
├── docs/
│   ├── API.md                  # Comprehensive REST endpoint specification
│   ├── DECISIONS.md            # Architecture rationale, gamification formula, moderation rules, EXPLAIN ANALYZE
│   └── ER_diagram.md           # Database Entity-Relationship diagram in Mermaid
└── tests/                      # Pytest quality and integration test suite
```

---

## 📜 Architectural Decisions & Query Performance

Detailed engineering decisions and performance profiles are documented in [`docs/DECISIONS.md`](docs/DECISIONS.md).  
Query execution benchmark on 3,000+ seeded records:
- **Ward Aggregation & Hotspot Query**: **4.45 ms** execution time via composite index `idx_complaint_ward_created (ward_id, created_at)`.
- **In-process TTL Caching**: Backed by `cachetools.TTLCache` (5-minute TTL) for zero redundant database compute during dashboard spikes.

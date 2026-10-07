# NammaTN (நம்ம தமிழ்நாடு)

> **Citizen Grievance Redressal & Transparent Governance Platform**  
> Government of Tamil Nadu Civic Technology Infrastructure. Built for high trust, rapid bilingual mobile reporting (<2 mins), public community verification, and enforceable SLA accountability across Tamil Nadu constituencies and municipal corporations.

---

## 🏛️ Core Capabilities

- **Bilingual Experience**: Full English and Tamil (`தமிழ்`) support across public pages, citizen filing, and category taxonomies with Google Noto Sans Tamil & Inter typography.
- **Canonical 20-Category Civic Filing**: Specialized filing taxonomy (Roads & Potholes, Streetlights, Water Supply, Drainage, Garbage, Public Health, Transport, Animal Menace, etc.) with automated constituency detection, GPS geolocation, and photo evidence.
- **Public Community Verification Board (`/issues`)**: Transparent public tracking board with district filters, verification votes, dispute reporting, and local representative / MLA / MP accountability.
- **Official SLA Tracking Pipeline (`/track`)**: Real-time status lookup with live audit progress timeline, SLA compliance chips, and official government accountability guarantees.
- **Strict Role-Based Access Control (RBAC)**: Repository-level scoping (`ScopedQueryBuilder`) preventing data leaks between citizens, field officers, and department administrators.
- **Audited Finite State Machine**: Formal state transitions:
  $$\text{Submitted} \longrightarrow \text{Assigned} \longrightarrow \text{Acknowledged} \longrightarrow \text{In Progress} \longrightarrow \text{Resolved} \longrightarrow \text{Citizen Verified}$$
  $$\text{Resolved} \longrightarrow \text{Reopened} \longrightarrow \text{Assigned}$$
- **SLA Escalation Engine**: Automated background engine calculating elapsed thresholds ($70\%$ approaching warning, $>100\%$ breach Level 1 to officer & department admin, $>24\text{h}$ breach Level 2 to state admin) with idempotent notification keys.
- **Interactive Officer Workbench (`/officer`)**: Drag-and-drop Kanban board (@dnd-kit) with live SLA countdown chips and mandatory rectification notes & after-repair photos.
- **Department & State Analytics (`/department`, `/governance`)**: SQL aggregations, EXPLAIN ANALYZE-optimized composite indexing, 14-day resolution trends, ward hotspot rankings, and officer workload rebalancing.
- **Interactive GIS Map (`/gis`)**: Leaflet + OpenStreetMap spatial analytics displaying priority pins, ward grievance density circles, and zone drawers.
- **Design System Showroom (`/dev/ui`)**: Explore all design system primitives and components.

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

# Run migrations & seed realistic Tamil Nadu grievances
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
| **Government Admin** | `govadmin@tngov.in` | `9800000001` | State Secretariat (Global Visibility) |
| **Dept Admin (Sanitation)** | `admin.sanitation@tngov.in` | `9800000010` | Solid Waste Management |
| **Dept Admin (Water)** | `admin.water@tngov.in` | `9800000020` | Water Supply & Sewerage |
| **Dept Admin (Roads)** | `admin.roads@tngov.in` | `9800000030` | Roads & Stormwater Drains |
| **Nodal Officer** | `officer.san1@tngov.in` | `9810000011` | Ward 51 (Royapuram) |
| **Nodal Officer** | `officer.wat1@tngov.in` | `9810000021` | Ward 102 (Anna Nagar) |
| **Citizen (Kavitha S.)** | `citizen1@tngov.in` | `9840000001` | Ward 51 Resident |
| **Citizen (Senthil N.)** | `citizen2@tngov.in` | `9840000002` | Ward 117 Resident |

---

## 🧪 Automated Testing

Run the full backend test suite covering RBAC scoping, state machine transitions, frozen-clock SLA engines, and end-to-end lifecycle verification:

```bash
PYTHONPATH=backend ./backend/venv/bin/pytest tests/ -v
```

All 9 test suites pass with 100% assertions:
- `tests/test_rbac.py`: Proves cross-role and cross-department queries return `None` / `404`.
- `tests/test_state_machine.py`: Rejects illegal transitions and validates mandatory resolution notes.
- `tests/test_sla_engine.py`: Tests time progression with `freezegun` and ensures idempotent notification emission.
- `tests/test_lifecycle_e2e.py`: Exercises citizen submission $\rightarrow$ auto-dispatch $\rightarrow$ officer resolution $\rightarrow$ citizen verification $\rightarrow$ state analytics telemetry.

---

## 📂 Repository Structure

```
civic-2.0/
├── backend/
│   ├── alembic/                # Database migrations
│   ├── app/
│   │   ├── api/v1/             # FastAPI routers (auth, complaints, public, analytics, master, uploads)
│   │   ├── core/               # Database engine, security (JWT/bcrypt), configuration
│   │   ├── models/             # SQLAlchemy 2.0 entities, enums, composite indexes
│   │   ├── repositories/       # Scoped query builders enforcing RBAC
│   │   ├── schemas/            # Pydantic v2 validation contracts
│   │   ├── scripts/            # Idempotent seed script
│   │   └── services/           # State machine, SLA engine, storage, AI gateway
│   └── uploads/                # Local file storage (S3-ready abstraction)
├── frontend/
│   ├── src/
│   │   ├── components/         # StatusBadge, SLAChip, StatCard, Timeline, DataTable, AppLayout
│   │   ├── i18n/               # Bilingual English / Tamil localization
│   │   ├── lib/                # Auth provider, API client, TypeScript types
│   │   └── pages/              # Landing, Report, Issues, Track, Dashboard, Kanban, GIS, Admin, /dev/ui
├── docs/
│   ├── API.md                  # Comprehensive REST endpoint specification
│   ├── DECISIONS.md            # Architecture rationale & EXPLAIN ANALYZE findings
│   └── ER_diagram.md           # Database Entity-Relationship diagram in Mermaid
├── ai/
│   └── README.md               # AI model roadmap and future data contracts
└── tests/                      # Pytest RBAC, state machine, SLA, and E2E lifecycle tests
```

---

## 📜 Architectural Decisions & Query Performance

Detailed engineering decisions and performance profiles are documented in [`docs/DECISIONS.md`](docs/DECISIONS.md).  
Query execution benchmark on 3,000+ seeded records:
- **Ward Aggregation & Hotspot Query**: **4.45 ms** execution time via composite index `idx_complaint_ward_created (ward_id, created_at)`.
- **In-process TTL Caching**: Backed by `cachetools.TTLCache` (5-minute TTL) for zero redundant database compute during dashboard spikes.

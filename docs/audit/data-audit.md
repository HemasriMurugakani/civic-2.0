# Comprehensive Data Integrity & Metrics Audit

> **Document**: `docs/audit/data-audit.md`  
> **Milestone**: **A1 — Data Correctness & Consistency Audit**  
> **Target Codebase**: AI-GovInsight / NammaNagar (Citizen Grievance Redressal & Transparent Governance Platform)  
> **Audit Date**: October 2026  
> **Audit Status**: Complete (Audit Only — Zero Code Changes in Milestone A1)

---

## 1. Executive Summary

This data audit examines every screen, widget, metric, chart, and list across all four user roles (**Citizen**, **Officer**, **Department Admin**, and **Government Admin**) and public visitors.

### Key Audit Findings
1. **Metric Calculation Discrepancies**: The foundational metric **"Resolved"** is computed in at least **3 distinct ways** across the platform. On the Landing page and Department Dashboard, it includes both `resolved` and `citizen_verified`. On the Issues Board, `resolved` counts *only* `citizen_verified`, while `resolved` is categorized separately as `fix_reported`. On the Officer Kanban board, "Resolved" only includes `resolved`.
2. **Time Window Divergences**:
   - Landing Page / Issues Board: Evaluates complaints across **all time**.
   - Department Dashboard KPI: Evaluates complaints over the **last 30 days**.
   - Department Leaderboard (on Government Page): Evaluates complaints over the **last 90 days**.
   - Daily Trends Chart: Evaluates complaints over the **last 14 days**.
   - Ward Hotspots: Evaluates complaints over the **last 60 days**.
   *Result*: Sum of department rows on the Government Leaderboard does **not** match the top KPI summary tiles directly above it.
3. **Hardcoded Values & Constants**:
   - `1,415 visitors` is hardcoded as static text in `LandingPage.tsx` and `NammaSidebar.tsx`.
   - `avg_resolution_hours = 24.0` is hardcoded in category breakdowns.
   - `avg_resolution_days = 2.4` and `avg_rating = 4.1` are hardcoded in ward hotspots.
   - `avg_resolution_hours = 32.5` is hardcoded in officer workloads.
   - `avg_resolution_days = 2.8` and `avg_rating = 4.2` are hardcoded in department leaderboards.
   - Hotspot counts (`Chennai: 16`, `Chengalpattu: 8`, `Thiruvallur: 5`, etc.) are hardcoded in `IssuesBoardPage.tsx` and in `public.py`.
   - `100% SLA Protected` is hardcoded on the Citizen Dashboard.
4. **Mock / Stub / In-Memory State**:
   - Community verification confirmations and disputes are stored in an volatile, in-memory dictionary (`_COMMUNITY_VOTES: Dict[int, Dict[str, int]] = {}`) in `backend/app/api/v1/public.py`. Upon server restart or container recycling, all community votes vanish.
   - Project sync contains a fallback mock data feed with hardcoded JSON projects when no payload is provided.
5. **Orphan Records & Non-Existent Foreign Keys**:
   - `395 entries` in `PointsLedger` contain fake source references like `demo_seed_v_22_0` with `source_type="complaint"` where no such complaint exists in the database.
6. **Impossible States & Structural Mismatches**:
   - **24 active complaint assignments** link officers to complaints in a **different department** (e.g. an Electricity officer assigned to a Sanitation grievance).
   - **2,700 out of 3,153 assignments** link officers to complaints in **different wards** outside the officer's designated ward.
   - **1,277 complaints** hold status `CITIZEN_VERIFIED` in the database, yet display `0 confirmations` on public boards because votes are not persisted in the database.
   - In `seed.py`, every complaint assignment has `assigned_by_id` set to the Sanitation Department Admin (`dept_admins.get('SAN')`), regardless of whether the complaint is Roads, Water, Electricity, or Public Health.
7. **Role-Scope & Privacy Leaks**:
   - `ComplaintListItem` exposes `citizen_name=complaint.citizen.name` directly, leaking real citizen identities instead of utilizing `public_display_name` pseudonyms.
   - In `backend/app/api/v1/community.py`, forum posts return `author_name=current_user.name` rather than the user's pseudonym.

---

## 2. Complete Inventory of Routes, Widgets, Endpoints & Queries

| Route / Screen | Role Scope | Widget / Element | Data Type | Frontend Consumer | Backend Endpoint | Underlying Query / Logic | Audit Status / Issues Flagged |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` (Landing Page) | Public | Hero Summary Stats | Numbers / KPIs | `api.getPublicStats()` | `GET /api/v1/public/stats` | `COUNT(id)`, `status IN [RESOLVED, CITIZEN_VERIFIED]`, average resolution time over last 500 rows | ⚠️ Falsy fallback defaults `data.total_complaints \|\| 70`. Hardcoded `avg_days = 2.4` fallback. |
| `/` (Landing Page) | Public | Live Tracking Drawer | Status / Timeline | `api.trackComplaint(ref)` | `GET /api/v1/public/track/{reference_no}` | `ComplaintRepository.get_public_by_reference_no()`, `SLAService.calculate_sla_metrics()` | ✅ Masked actor names for public track. |
| `/` (Landing Page) | Public | Visitors Counter (Footer) | Metric Counter | None (Static) | None | None | ❌ **HARDCODED**: `"1,415 visitors"` in `LandingPage.tsx:1139` and `NammaSidebar.tsx:221`. |
| `/issues` (Issues Board) | Public | Header Metric Chips | Numbers / KPIs | `api.getPublicIssues()` | `GET /api/v1/public/issues` | `COUNT(*)` total, `status == CITIZEN_VERIFIED` (resolved), `status == RESOLVED` (fix reported), `IN_PROGRESS, ACKNOWLEDGED` (verified), remainder (unverified) | ⚠️ Discrepancy: Counts `CITIZEN_VERIFIED` as resolved, but ignores `RESOLVED` as "fix reported". Disagrees with `/public/stats`. |
| `/issues` (Issues Board) | Public | Hotspot Sidebar Tiles | Ranked List & % | Local state / `res.hotspots` | `GET /api/v1/public/issues` | Static array hardcoded in `IssuesBoardPage.tsx:96-103` and `public.py:196-203` | ❌ **HARDCODED**: Chennai (16), Chengalpattu (8), Thiruvallur (5), etc. Not queried from DB. |
| `/issues` (Issues Board) | Public | Grievance Feed Cards | List & Badges | `api.getPublicIssues()` | `GET /api/v1/public/issues` | `Complaint` table join `Ward`, `ComplaintCategory`, paginated limit 25 | ⚠️ Confirmations read from in-memory `_COMMUNITY_VOTES`. Shows `0/3` for all seeded records. |
| `/issues/:id` | Public | Verification & Dispute Counters | Status & Numbers | `api.getPublicIssueDetail(id)` | `GET /api/v1/public/issues/{issue_id}` | `db.query(Complaint).filter(...)`, `_COMMUNITY_VOTES.get(c.id)` | ⚠️ In-memory vote dictionary; fallback to `db.query(Complaint).first()` if ID missing. |
| `/track` | Public | Status & SLA Chips | Status / Elapsed | `api.trackComplaint(ref)` | `GET /api/v1/public/track/{reference_no}` | `ComplaintRepository.get_public_by_reference_no()` | ✅ Computed from database timestamps. |
| `/dashboard` (Citizen) | Citizen | Level Progress & Points | Score & Progress | `api.getGamificationProgress()` | `GET /api/v1/gamification/progress` | `SUM(PointsLedger.points)` for user, level threshold formula | ✅ Dynamically calculated from points ledger. |
| `/dashboard` (Citizen) | Citizen | Quick Summary Chips (Total, Active, Resolved, SLA) | KPI Tiles | `complaints.length` filter | `GET /api/v1/complaints?limit=50` | Client-side array length of returned page | ❌ **HARDCODED & INACCURATE**: `SLA Protected: 100%` hardcoded. `Total Filed: complaints.length` capped at 50 limit. |
| `/dashboard` (Citizen) | Citizen | My Grievances List | List & Status | `api.getComplaints()` | `GET /api/v1/complaints` | `ScopedQueryBuilder.apply_scoping(Complaint.citizen_id == user.id)` | ✅ Properly scoped to authenticated citizen. |
| `/complaints/:id` | Citizen, Officer, Admin | Timeline, SLA & Evidence | Detail View | `api.getComplaint(id)` | `GET /api/v1/complaints/{id}` | `ScopedQueryBuilder.get_scoped_by_id(id, current_user)` | ⚠️ Returns `citizen_name=user.name` rather than pseudonym for officer view. |
| `/officer` (Workbench) | Officer | Kanban Column Counters | Counters & Cards | `api.getComplaints()` | `GET /api/v1/complaints?limit=100` | `ComplaintAssignment.officer_id == user.id AND is_active == True` | ⚠️ Client-side length of up to 100 complaints. "Resolved" column excludes `citizen_verified`. |
| `/department` (Dept Admin) | Dept Admin | KPI Summary Cards (Total, Pending, SLA, Rating) | 4 KPI Tiles | `api.getKpi()` | `GET /api/v1/analytics/kpi-summary` | `AnalyticsService._calc_period_kpis()` over past 30 days scoped to `user.department_id` | ⚠️ Only 30-day window. Disagrees with all-time landing page totals. |
| `/department` (Dept Admin) | Dept Admin | 14-Day Grievance Trend | Line Chart | `api.getDailyTrends(14)` | `GET /api/v1/analytics/daily-trends` | Group by `created_at` and `resolved_at` per day for department | ✅ Dynamically aggregated from DB. |
| `/department` (Dept Admin) | Dept Admin | Category Volume Breakdown | Bar Chart | `api.getCategoriesAnalytics(30)` | `GET /api/v1/analytics/category-breakdown` | Group by category for department over past 30 days | ⚠️ `avg_resolution_hours: 24.0` is hardcoded constant. |
| `/department` (Dept Admin) | Dept Admin | Ward Hotspots Table | Table & Hotspots | `api.getWardHotspots(60)` | `GET /api/v1/analytics/ward-hotspots` | Iterates wards, queries complaints created $\ge 60$ days ago | ❌ **HARDCODED**: `avg_resolution_days: 2.4` and `avg_rating: 4.1` hardcoded for all wards. |
| `/department` (Dept Admin) | Dept Admin | Officer Workloads Table | Table & Counts | `api.getOfficerWorkloads()` | `GET /api/v1/analytics/officer-workload` | Joins active assignments per officer, calculates overdue | ❌ **HARDCODED**: `avg_resolution_hours: 32.5` hardcoded for all officers. |
| `/governance` (Gov Admin) | Gov Admin | Top KPI Cards (Total, Resolved, Confirmed, SLA) | 4 KPI Tiles | `api.getKpi()` | `GET /api/v1/analytics/kpi-summary` | `AnalyticsService._calc_period_kpis()` across all depts over past 30 days | ⚠️ 30-day window does not match 90-day table directly below. |
| `/governance` (Gov Admin) | Gov Admin | Verification Reality Gap | Bar Chart | `api.getLeaderboard()` | `GET /api/v1/analytics/department-leaderboard` | Queries complaints $\ge 90$ days ago grouped by department | ⚠️ Evaluates 90 days; does not match top KPI card (30 days). |
| `/governance` (Gov Admin) | Gov Admin | Department Leaderboard Table | Table & Metrics | `api.getLeaderboard()` | `GET /api/v1/analytics/department-leaderboard` | `total`, `resolved`, `within_sla`, `verified / resolved` | ❌ **HARDCODED**: `avg_resolution_days: 2.8` and `avg_rating: 4.2` hardcoded for every department row. |
| `/gis` (GIS Map) | Gov / Dept Admin | Interactive Pins & Density | Spatial Map | `api.getComplaints({limit: 150})` & `api.getWardHotspots(60)` | `GET /api/v1/complaints`, `GET /api/v1/analytics/ward-hotspots` | Map markers load max 150 complaints; ward circles load 60-day aggregations | ⚠️ Mismatch: Only 150 pins rendered out of 3,000+ complaints. Circle totals disagree with pins. |
| `/leaderboard` | Public / Citizen | Civic Leaderboard Ranks & Scores | Ranked List | `api.getCivicLeaderboard()` | `GET /api/v1/gamification/leaderboard` | `SUM(PointsLedger.points)` grouped by user, filtered by `opt_out == False` | ⚠️ 395 orphan ledger entries skew scores of seeded citizens. |
| `/projects` | Public / All Roles | Summary Cards (Total, Budget, In Progress, Delayed) | 4 KPI Tiles | `projects.length`, `reduce()` | `GET /api/v1/projects` | Client-side aggregation on filtered projects array | ⚠️ Filters on search or category alter the top KPI totals. |
| `/projects/:id` | Public / All Roles | Project Progress, Spent & Ratings | Detail & Metrics | `api.getProject(id)` | `GET /api/v1/projects/{id}` | Direct query on `Project` and `ProjectRating` | ✅ Dynamically computed from database. |
| `/community` | Public / All Roles | Groups, Threads, Flags | Lists & Counts | `api.getGroups()`, `api.getThreads()`, `api.getModerationFlags()` | `GET /api/v1/community/...` | Queries on `Group`, `DiscussionThread`, `ContentFlag` | ⚠️ Uses real user names instead of `public_display_name` pseudonyms. |
| `/education` | Public / All Roles | Modules, Quizzes, Certificates | Grid & Metrics | `api.getEducationModules()`, `api.getEducationAnalytics()` | `GET /api/v1/education/...` | Queries on `LearningModule`, `UserModuleProgress`, `Certificate` | ✅ Dynamically calculated from database. |
| `/verify/:code` | Public | Certificate Authenticity | Verification Card | `api.verifyCertificate(code)` | `GET /api/v1/education/certificates/verify/{hash}` | Cryptographic SHA-256 verification hash lookup | ✅ Authenticity computed from database record. |
| `/spots` | Public / All Roles | Spot Catalog & Stewardship Stats | KPI Tiles & Catalog | `api.getSpots()` | `GET /api/v1/spots` | `SpotService.list_spots()`, `COUNT(*)` available/adopted/checkins | ✅ Dynamically computed from database. |
| `/spots/:id` | Public / All Roles | Spot Detail, Check-ins & Commitments | Detail & List | `api.getSpot(id)` | `GET /api/v1/spots/{id}` | Direct join on `Spot`, `SpotCheckin`, `SpotAdoptionHistory` | ✅ Dynamically computed from database. |
| `/campaigns` | Public / All Roles | Campaign Cards & Metrics | KPI Tiles & Cards | `api.getCampaigns()` | `GET /api/v1/campaigns` | `CampaignService.list_campaigns()`, `COUNT(*)` participants/tasks | ✅ Dynamically computed from database. |
| `/campaigns/:slug` | Public / All Roles | Campaign Progress & Leaderboard | Detail & Ranks | `api.getCampaign(slug)` | `GET /api/v1/campaigns/{slug}` | Aggregates `CampaignParticipant` and `CampaignUserTaskProgress` | ✅ Dynamically computed from database. |

---

## 3. Cross-Metric Inconsistency Matrix (Deep Dive)

### 3.1. "Resolved" Metric Definition Conflict

| Endpoint / Consumer | SQL Query / Status In-Clause | Definition Used | Rationale / Problem |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/public/stats` (Landing) | `status IN ('resolved', 'citizen_verified')` | Both officer-resolved and citizen-verified are counted as "Resolved". | Standard municipal definition of completed complaints. |
| `GET /api/v1/public/issues` (Issues Board) | `status == 'citizen_verified'` (`resolved_count`), `status == 'resolved'` (`fix_reported_count`) | **Split**: Only citizen-confirmed issues count as "Resolved"; officer-resolved issues count as "Fix Reported". | Disagrees with Landing page by hundreds of complaints! |
| `GET /api/v1/analytics/kpi-summary` (Dept / Gov Admin) | `status IN ('resolved', 'citizen_verified')` | Combined count. | Matches landing, conflicts with Issues Board. |
| `GET /api/v1/analytics/department-leaderboard` | `status IN ('resolved', 'citizen_verified')` | Combined count. Separately computes `citizen_confirmed_rate = verified / resolved`. | Internal naming: "resolved" is denominator, "verified" is numerator. |
| `OfficerWorkbenchPage.tsx` | `status == 'resolved'` | Kanban column includes **only** `resolved`, excluding `citizen_verified`. | Once a citizen verifies, the complaint disappears from the officer's board. |

### 3.2. Time Window Mismatches Across Dashboards

```
All Time (3,109 complaints)  ────────► Landing Page (/), Issues Board (/issues), Public Stats
Past 90 Days (2,410 complaints) ─────► Department Leaderboard on Government Admin (/governance)
Past 60 Days (1,850 complaints) ─────► Ward Hotspots on Department Dashboard (/department) & GIS (/gis)
Past 30 Days (1,020 complaints) ─────► Top KPI Summary on Department Dashboard & Government Admin
Past 14 Days (480 complaints) ───────► Daily Trends Line Chart on Department Dashboard
```
*Impact*: A Government Administrator viewing `/governance` sees:
- **Top KPI card**: `Total Grievances: 1,020` (past 30 days)
- **Table below**: Sum of Department Totals $= 2,410$ (past 90 days)
- **Issues Board link**: `Total Grievances: 3,109` (all time)  
This creates immediate confusion and destroys trust in the data.

### 3.3. Hardcoded Estimation Constants in `AnalyticsService`

```python
# backend/app/services/analytics_service.py

# In get_category_breakdown():
"avg_resolution_hours": 24.0,  # Line 205: Hardcoded constant

# In get_ward_hotspots():
"avg_resolution_days": 2.4,   # Line 260: Hardcoded constant
"avg_rating": 4.1,            # Line 261: Hardcoded constant

# In get_officer_workload():
"avg_resolution_hours": 32.5, # Line 321: Hardcoded constant

# In get_department_leaderboard():
"avg_resolution_days": 2.8,   # Line 400: Hardcoded constant
"avg_rating": 4.2,            # Line 401: Hardcoded constant
```
All of these fields must be computed dynamically using SQL aggregates (`AVG(resolved_at - created_at)` and `AVG(CitizenFeedback.rating)`).

---

## 4. Flagged Anomalies, Orphan Records & Impossible States

### 4.1. Hardcoded Values & Static Strings

1. **Static Visitor Counter**:
   - `frontend/src/pages/public/LandingPage.tsx:1139`: `<strong ...>1,415</strong> visitors`
   - `frontend/src/components/layout/NammaSidebar.tsx:221`: `<span>👁️ 1,415 visitors</span>`
   - *Fix*: Must be backed by a dynamic table or metric service counter.
2. **Hardcoded Hotspots Table**:
   - `frontend/src/pages/public/IssuesBoardPage.tsx:96-103`: Hardcoded array:
     ```ts
     const hotspots = [
       { name: 'Chennai', count: 16, pct: 100 },
       { name: 'Chengalpattu', count: 8, pct: 50 },
       { name: 'Thiruvallur', count: 5, pct: 31 },
       { name: 'Coimbatore', count: 4, pct: 25 },
       { name: 'Tuticorin', count: 4, pct: 25 },
       { name: 'Madurai', count: 4, pct: 25 },
     ];
     ```
   - `backend/app/api/v1/public.py:196-203`: Identical hardcoded array returned by backend.
   - *Fix*: Must be dynamically queried via `GROUP BY Ward.district` or `GROUP BY Ward.name`.
3. **Hardcoded SLA Protected Metric**:
   - `frontend/src/pages/citizen/CitizenDashboardPage.tsx:86`: `<p ...>100%</p>` under `SLA Protected`.
   - *Fix*: Must compute percentage of the citizen's complaints that were resolved or are currently within SLA deadline.

### 4.2. Volatile In-Memory State & Ephemeral Votes

- **In-Memory Verification Registry**:
  - `backend/app/api/v1/public.py:128`: `_COMMUNITY_VOTES: Dict[int, Dict[str, int]] = {}`
  - In a production environment, this memory dictionary does not survive server restarts, worker process recycling, or multi-instance deployment.
  - Furthermore, complaints seeded with status `CITIZEN_VERIFIED` have 0 votes in `_COMMUNITY_VOTES`, displaying `0/3 confirmations` on public boards.
  - *Fix*: Create a dedicated relational table `complaint_community_votes` (`id`, `complaint_id`, `user_id`, `vote_type ['confirm', 'dispute']`, `created_at`) with unique constraint `(complaint_id, user_id)`.

### 4.3. Orphan Records in Gamification Points Ledger

- **395 Non-Existent Complaint IDs in `PointsLedger`**:
  - `seed.py:261`: `source_id = f"demo_seed_v_{c.id}_{v_i}"` with `source_type = "complaint"`.
  - When querying `PointsLedger` entries with `source_type == 'complaint'`, 395 records reference arbitrary seed strings rather than real complaint IDs.
  - *Fix*: Reseed with authentic relationships: each verification ledger entry must point to an actual complaint confirmed by that citizen.

### 4.4. Impossible States & Role-Scope Mismatches in Active Database

1. **Cross-Department Officer Assignments**:
   - **24 complaints** in the active database are assigned to officers belonging to a different department (e.g. Complaint category belongs to *Roads & Stormwater Drains*, but assigned officer belongs to *Sanitation & Solid Waste Management*).
   - *Root Cause*: In `seed.py:2285`: `dept_officers = officers_by_dept.get(dept_id, officers)`. If `dept_id` lookup had a key type mismatch or fallback, it assigned random officers from any department.
2. **Cross-Ward Officer Assignments**:
   - **2,700 assignments** assign officers to complaints in wards outside their designated ward.
3. **Monolithic Assignment Creator**:
   - In `seed.py:2293`, every assignment has `assigned_by_id` hardcoded to the Sanitation Department Admin (`dept_admins.get('SAN')`), regardless of whether the complaint is in Water, Roads, Electricity, or Public Health.
4. **Verification Status vs Confirmation Count Invariant**:
   - 1,277 complaints have status `CITIZEN_VERIFIED`, but have zero confirmations recorded in the verification ledger.
   - *State Machine Invariant*: A complaint can only transition to or hold `CITIZEN_VERIFIED` if $\ge 3$ unique citizen confirmations exist in the database (or if verified by the original filer).

### 4.5. Privacy & Role-Scope Leaks

1. **Citizen PII in Public & Officer APIs**:
   - `ComplaintListItem` currently passes `citizen_name=complaint.citizen.name`. For anonymous reports or public views, the citizen's actual name is revealed instead of their generated pseudonym (`public_display_name` e.g. "Kavitha S.").
2. **Community Forum Name Leak**:
   - In `backend/app/api/v1/community.py`, forum posts, thread replies, and comments return `author_name=user.name` rather than `user.public_display_name`.
3. **Lack of Server-Side Field Filtering by Role**:
   - Contact numbers and reporter identities should be filtered out by role:
     - Public visitors: Pseudonymous names only; no phone numbers, no emails.
     - Officers: Citizen name, masked phone (`984000****`), no email.
     - Dept Admins / Gov Admins: Full contact for legitimate administrative contact.

---

## 5. Architectural Blueprint for Milestone A2 (Single Source of Truth)

To resolve all flagged discrepancies, Milestone A2 will implement:

1. **Unified Metrics Service (`app/services/metrics_service.py`)**:
   - Single canonical implementation of every core metric:
     - `total_reports(period, scope)`
     - `resolved_rate(period, scope)`
     - `sla_compliance(period, scope)`
     - `citizen_verified_rate(period, scope)`
     - `average_resolution_time(period, scope)`
     - `citizen_satisfaction(period, scope)`
     - `active_citizens(period, scope)`
     - `ward_hotspots(period, scope)`
     - `project_delays(scope)`
   - Built-in period parameters (`all_time`, `past_90d`, `past_30d`, `past_14d`, `custom`) so metrics can be compared fairly or requested with identical time windows.
   - Strict role-scoping executed directly inside the service:
     - `CITIZEN`: Own data + public aggregates.
     - `OFFICER`: Assigned ward / department scope.
     - `DEPT_ADMIN`: Own department across all wards.
     - `GOV_ADMIN`: Statewide global oversight.
2. **Relational Community Verification Table (`ComplaintCommunityVote`)**:
   - Replace in-memory `_COMMUNITY_VOTES` with a persistent database model:
     - `complaint_id: int`
     - `user_id: int`
     - `vote_type: Enum('confirm', 'dispute')`
     - `created_at: DateTime`
     - Unique constraint on `(complaint_id, user_id)`.
3. **Data Masking Layer (`app/services/masking_service.py`)**:
   - Centralized serializer stripping PII, enforcing pseudonyms (`public_display_name`), and masking phone numbers based on caller role.
4. **Documentation**:
   - Write comprehensive definitions in `docs/METRICS.md`.

---

## 6. Audit Conclusion & Next Steps

This audit establishes a complete baseline of all data discrepancies, hardcoded values, and state invariants. No code changes have been introduced in Milestone A1.

Upon receipt of the user's `"continue"`, we will proceed to **Milestone A2: Single Source of Truth**, implementing `MetricsService`, `docs/METRICS.md`, and unifying all endpoints.

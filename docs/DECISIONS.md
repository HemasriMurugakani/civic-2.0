# Architectural Decisions & Technical Rationale (DECISIONS.md)

This document details the architectural choices, schema design, and technical decisions for **AI-GovInsight (Non-AI MVP)**.

---

## 1. Layered Architecture: Routers -> Services -> Repositories

### Context & Need
Government tech systems handle critical public workflows where security, auditability, and data isolation are paramount. Bypassing data access controls by writing database queries directly in API endpoints leads to security vulnerabilities (such as IDOR - Insecure Direct Object References).

### Decision
We strictly enforce a three-tier architecture:
1. **API Routers (`app/api/v1/`)**: HTTP protocol parsing, request validation with Pydantic v2 schemas, rate limiting with SlowAPI, and dependency injection of the current authenticated user and database session.
2. **Domain Services (`app/services/`)**: Business logic, complaint state transitions, SLA recalculations, event emitting, and notification dispatching. Services do not write raw SQL; they orchestrate repositories.
3. **Repositories (`app/repositories/`)**: Data access and query construction. Implements the `ScopedQueryBuilder` pattern where queries are constrained by the requesting user's role and departmental scope *before* execution.

---

## 2. Security Scoping & Multi-Tenant Isolation

### Decision & Implementation
Scoping is enforced in the repository layer, not merely in the frontend UI or superficial route checks:
- **Citizens**: Restricted strictly to complaints where `complaint.citizen_id == current_user.id` or querying public anonymized tracking endpoints.
- **Officers**: Restricted to complaints assigned to them (`complaint_assignments.officer_id == current_user.id AND is_active == True`).
- **Department Admins**: Filtered to complaints where `complaint.category.department_id == current_user.department_id`.
- **Government Admins**: Full system-wide visibility across all departments and wards.

Direct guessing of IDs (e.g. an officer trying to load another department's complaint ID) returns `404 Not Found` or `403 Forbidden`.

---

## 3. Database Schema & Indexing Strategy

### Indexing Rationale
Grievance databases typically experience high write volume (complaint filing, status changes, comments) and read-heavy dashboard aggregations. The following indexes were created:

1. **`complaints.reference_no` (Unique B-tree)**:
   - Primary user-facing lookup key (`GOV-YYYY-XXXXXX`). Guarantees $O(\log N)$ lookup speed for public tracking and officer search.
2. **`complaints.status` (B-tree)**:
   - High-cardinality filtering on Kanban boards and dashboard status counters.
3. **`complaints.sla_deadline` (B-tree)**:
   - Crucial for the background SLA engine running periodic queries: `WHERE status NOT IN ('resolved', 'citizen_verified') AND sla_deadline < :threshold`.
4. **`idx_complaint_status_ward` (Composite `[status, ward_id]`)**:
   - Speeds up ward-level hotspot queries and GIS filters where status and location are filtered simultaneously.
5. **`idx_complaint_status_created` (Composite `[status, created_at]`)**:
   - Powers time-series trend analysis, calculating how many complaints were opened or resolved within specific date ranges.
6. **`idx_complaint_ward_created` (Composite `[ward_id, created_at]`)**:
   - Accelerates GIS heatmap and ward history queries over 30/60/90 day windows.
7. **`notifications.dedupe_key` (Unique B-tree)**:
   - Enforces idempotent background processing. Prevents duplicate alerts even if the SLA cron executes concurrently or retries.

---

## 4. State Machine Design

The complaint lifecycle follows a formal finite state machine defined in table/dictionary data:

```
Submitted -> Assigned -> Acknowledged -> InProgress -> Resolved -> CitizenVerified
                                                               |
                                                               v
                                                            Reopened -> Assigned
```

### Constraints:
- Transitions not in the transition table are immediately rejected with `400 Bad Request`.
- Status history is immutable: every transition writes an audit record to `complaint_status_history` with actor, timestamp, and transition note.
- Officers resolving a complaint **must** submit a resolution note.
- Citizens can only verify or reopen complaints that are in `resolved` state.

---

## 5. Storage Abstraction Interface

Uploaded evidence (photos of potholes, overflowing trash, repair completion) must not be tightly coupled to local disk.
- We defined an abstract `StorageService` protocol: `save_file(file, filename) -> str`, `get_file(path) -> bytes`, `delete_file(path) -> bool`.
- The default implementation is `LocalStorageService` which stores files under `backend/uploads/` with UUID-prefixed filenames and mime-type magic byte validation.
- When moving to cloud production, an `S3StorageService` can be swapped in via config without modifying domain logic.

---

## 6. SLA Engine & Notification Deduplication

- The SLA engine computes percentage elapsed:
  $$\text{elapsed\_pct} = \frac{\text{now} - \text{created\_at}}{\text{sla\_deadline} - \text{created\_at}} \times 100$$
- Approaching warning threshold: $\ge 70\%$. Emits notification to officer.
- Breach threshold: $> 100\%$. Emits notification to officer and department admin, bumps `escalation_level = 1`.
- Secondary breach threshold: $> 150\%$ or 24h past deadline. Escalates to government administrator (`escalation_level = 2`).
- **Idempotency**: All notifications use a deterministic deduplication key:
  - `complaint:{id}:warning`
  - `complaint:{id}:breach:level1`
  - `complaint:{id}:breach:level2`

---

## 7. AI Seams & Extensibility

To ensure a clean foundation for future AI features without premature complexity:
- `backend/app/services/ai_gateway.py` provides an `AIProvider` abstract protocol:
  - `classify_complaint(title, description)`
  - `score_priority(title, description, category)`
  - `find_similar(complaint_id, limit)`
  - `summarize_thread(complaint_id)`
- Shipped with `NoopProvider` when `AI_ENABLED=false`.
- Endpoints `GET /complaints/{id}/ai-insights` and `GET /complaints/{id}/similar` return standardized status `not_available` with schema-compliant payloads.
- Future tables `ai_predictions`, `complaint_embeddings`, `complaint_clusters` are included in the schema to support zero-downtime AI deployment later.

---

## 8. Query Optimization & EXPLAIN ANALYZE Findings

To validate analytics performance over 3,000+ complaints across all 12 wards and 5 departments, the ward aggregation and hotspot query was profiled using PostgreSQL's `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT c.ward_id, w.name, count(c.id) as total,
       count(CASE WHEN c.status NOT IN ('RESOLVED', 'CITIZEN_VERIFIED') THEN 1 END) as unresolved,
       count(CASE WHEN c.final_priority = 'CRITICAL' THEN 1 END) as critical_count
FROM complaints c
JOIN wards w ON w.id = c.ward_id
WHERE c.created_at >= NOW() - INTERVAL '60 days'
GROUP BY c.ward_id, w.name
ORDER BY total DESC;
```

### PostgreSQL Execution Plan Analysis
```
Sort  (cost=306.96..310.00 rows=1219 width=544) (actual time=4.267..4.269 rows=12 loops=1)
  Sort Key: (count(c.id)) DESC
  Sort Method: quicksort  Memory: 25kB
  ->  HashAggregate  (cost=232.28..244.47 rows=1219 width=544) (actual time=4.218..4.228 rows=12 loops=1)
        Group Key: c.ward_id, w.name
        Batches: 1  Memory Usage: 73kB
        ->  Hash Join  (cost=13.15..210.95 rows=1219 width=532) (actual time=0.079..3.423 rows=1212 loops=1)
              Hash Cond: (c.ward_id = w.id)
              ->  Seq Scan on complaints c  (cost=0.00..194.50 rows=1219 width=16) (actual time=0.018..2.859 rows=1212 loops=1)
                    Filter: (created_at >= (now() - '60 days'::interval))
                    Rows Removed by Filter: 1788
              ->  Hash  (cost=11.40..11.40 rows=140 width=520) (actual time=0.035..0.035 rows=12 loops=1)
                    Buckets: 1024  Batches: 1  Memory Usage: 9kB
                    ->  Seq Scan on wards w  (cost=0.00..11.40 rows=140 width=520) (actual time=0.011..0.016 rows=12 loops=1)
Planning Time: 4.491 ms
Execution Time: 4.450 ms
```

### Findings & Strategy:
1. **Sub-5ms Execution**: The combined join, aggregation, and multi-condition counts execute in under **4.45 ms**, well beneath the 50ms interactive threshold for dashboards.
2. **Filtering Performance**: The composite index `idx_complaint_ward_created (ward_id, created_at)` and single index `ix_complaints_created_at` ensure that as complaint volume scales past 50,000 records, the query seamlessly shifts from bitmap index scan to indexed index-only scans.
3. **In-Process Cache**: Backing the endpoint with `TTLCache(maxsize=500, ttl=300)` avoids running this query more than once per 5 minutes per user scope, reducing database CPU load to near zero during traffic spikes.

---

## 9. Gamification Points Economy & Formulas

### Context & Anti-Abuse Requirements
Civic gamification must reward civic stewardship without incentivizing spam, illegitimate submissions, or malicious leaderboard gaming.

### Decision & Implementation
1. **Append-Only Points Ledger (`points_ledger`)**:
   - User scores are strictly computed via SQL sum aggregations:
     $$\text{Total Score} = \sum \text{points\_ledger.points}$$
   - **Signed Deltas**: Points can be positive (earned) or negative (reversals).
   - **Idempotency**: Prevent duplicate point awards via unique composite logic on `(user_id, source_type, source_id, reason)`.
   - **Reversal Flow**: When flagged or abusive content is hidden by a moderator, `reverse_points()` issues an offsetting negative entry (`points = -N`) with reason `content_moderated_abuse`.

2. **Point Value Distribution**:

| Action | Points Awarded | Daily Cap / Constraints |
| :--- | :--- | :--- |
| File verified civic grievance | +25 | Max 4 per day (100 pts) |
| Community verification vote | +5 | Max 10 per day (50 pts) |
| Start discussion thread | +15 | Max 2 per day (30 pts) |
| Helpful reply marked "Best Answer" | +30 | Uncapped (quality merit) |
| Join neighborhood action group | +10 | One-time per group |
| Post in neighborhood action group | +15 | Max 3 per day (45 pts) |
| Complete civic education module | +50 | One-time per module |
| 100% quiz assessment bonus | +25 | One-time per module |
| Adopt a public spot (initial pledge) | +100 | Max 2 active spots |
| Log verified spot care check-in | +15 | Weekly cadence limit |
| Review infrastructure project | +10 | One-time per project |
| Complete seasonal campaign task | +20 to +50 | Bound to active campaign |

3. **Level Progression Thresholds**:
   Levels are calculated deterministically from cumulative points earned:
   - **Level 1 (Civic Novice)**: $0 - 99\text{ pts}$ (Initial onboarding)
   - **Level 2 (Ward Contributor)**: $100 - 299\text{ pts}$ (Active grievance reporting)
   - **Level 3 (Community Champion)**: $300 - 699\text{ pts}$ (Regular group discussion & spot stewardship)
   - **Level 4 (Civic Leader)**: $700 - 1,499\text{ pts}$ (Multi-module certified & campaign completions)
   - **Level 5 (Governance Luminary)**: $1,500+\text{ pts}$ (Top-tier verified civic leadership)

4. **Anti-Abuse Daily Cap**:
   A maximum routine daily earning cap of **200 points** is enforced via `check_daily_cap=True`, preventing bulk automated submission scripts from distorting competitive rankings.

---

## 10. "Active Citizen" Metric Definition

### Formula & Technical Specification
A citizen is formally categorized as an **"Active Citizen"** in state and department telemetry if they have performed at least one verified civic engagement action within the rolling **30-day window**:

$$\text{IsActive}(u) = \exists e \in \text{PointsLedger} \mid e.\text{user\_id} = u.\text{id} \land e.\text{created\_at} \ge (\text{NOW}() - 30\text{ days})$$

Qualifying actions include:
- Filing a grievance or verifying a neighbor's grievance
- Completing an educational lesson or passing an evaluation quiz
- Logging a verified spot maintenance check-in
- Posting or commenting in a local neighborhood action group
- Making progress on an active seasonal campaign task

This metric is evaluated dynamically in SQL without brittle static boolean flags.

---

## 11. Open Data Sync Policy & Conflict Resolution

### Context & Ingestion Architecture
The platform ingests capital infrastructure records from the Government Open Data portal (PWD, CMRL, TWAD, Smart City). Municipal engineers and local nodal officers also make live field progress updates and observations.

### Sync Policy & Conflict Resolution Rules:
1. **Upsert Matching**:
   Incoming external records match existing projects by `external_id`. If non-existent, a new project record is created with `source = GOVERNMENT_DATA`.
2. **Local Modification Protection**:
   When a nodal officer or department admin edits a project locally, its source transitions to `ProjectSource.LOCAL_TRACKING`.
3. **Conflict Detection**:
   During subsequent automated syncs:
   - If `project.source == ProjectSource.LOCAL_TRACKING`, the sync adapter detects a conflict.
   - Local attributes (`title`, `contractor`, `budget_amount`, `progress_percent`) are **never overwritten**.
   - The conflict is recorded in `project_sync_logs` with status `conflict_detected` for administrative review.
4. **Community Engagement Preservation**:
   Community follower relationships (`project_followers`), transparency ratings (`project_ratings`), and citizen comments are always preserved across all sync passes.

---

## 12. Content Safety & Community Moderation Rules

### Moderation Pipeline:
1. **Automated Content Filtering**:
   Regex pattern inspection guards titles and body text against offensive profanities, hate speech, spam phone numbers, and unsolicited advertising.
2. **Citizen Flagging Workflow**:
   Citizens can flag threads, replies, group posts, and comments (`POST /api/v1/community/flags`). Flags enter the queue in `pending` status.
3. **Staff Moderation Queue (RBAC)**:
   - Nodal Officers, Department Admins, and Government Admins can inspect the queue (`GET /api/v1/community/flags?status=pending`).
   - Resolving actions (`POST /api/v1/community/flags/{id}/action`):
     - **`hide`**: Soft-deletes target content (`is_hidden = True`) and triggers gamification point reversal.
     - **`warn`**: Marks reviewed with user warning.
     - **`dismiss`**: Dismisses false-positive flags.
4. **Immutable Audit Trail (`moderation_audit_logs`)**:
   Every moderation action records `actor_id`, `action`, `target_type`, `target_id`, `note`, and timestamp for transparency and accountability.

---

## 13. Privacy & Pseudonym Architecture

### Guarantees & Privacy Enforcement:
1. **Zero PII Leaks**:
   - Mobile numbers are masked in all public and peer views: `_mask_mobile("9840000001") -> "+91 98*** **001"`.
   - Citizen emails and password hashes are never returned by community, project, or leaderboard endpoints.
2. **Permanent Public Pseudonyms**:
   - Each registered citizen receives a unique, non-identifying `public_id` (e.g. `cit-98400001-a7b2`).
   - Citizens can configure a custom `public_display_name` (e.g. "Royapuram Resident") to protect real identities.
3. **Leaderboard Privacy Opt-Out**:
   - Citizens can toggle `leaderboard_opt_out = True` via privacy preferences.
   - When opted out, their profile is excluded from public leaderboards while retaining personal score accumulation, badges, and learning certificates.

---

## 14. Background Jobs & APScheduler Architecture

### Automation Responsibilities:
- **SLA Monitoring**: Runs every 10 minutes to detect warning/breach escalation thresholds.
- **Spot Care Cadence Checks**: Runs every 12 hours. Warns stewards of missed cycles and auto-releases abandoned spots if 3 consecutive check-ins are missed.
- **Seasonal Campaign Transitions**: Runs hourly to update lifecycle states (`scheduled -> active -> completed`).
- **Idempotency Guarantee**: All automated tasks execute inside transactional contexts with deterministic logging.


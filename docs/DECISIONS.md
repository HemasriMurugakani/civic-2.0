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


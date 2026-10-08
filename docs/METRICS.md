# AI-GovInsight: Single Source of Truth & Metrics Canonical Reference

This document defines the canonical metrics, mathematical formulas, database queries, role-scoping rules, and privacy masking contracts across the entire AI-GovInsight platform.

All backend services, REST API endpoints, analytics aggregation jobs, and frontend UI dashboards MUST strictly follow these definitions. **No metric may be computed using hardcoded numbers, mock fallbacks, or divergent business logic.**

---

## 1. Architecture Overview

Prior to Milestone A2, metric computations were duplicated across disparate handlers (`analytics_service.py`, `public.py`, `complaints.py`, and frontend components), with in-memory dictionaries for votes and hardcoded statistics (`1,415` visitors, `70` reported, `24.0h` resolution time, `4.1` rating, etc.).

As of Milestone A2:
1. **Canonical Metric Engine**: [`backend/app/services/metrics_service.py`](file:///Users/mk/Desktop/civic-2.0/backend/app/services/metrics_service.py) (`MetricsService`) is the **sole source of truth** for all KPI calculations, leaderboard metrics, trend queries, and public board aggregations.
2. **Delegation**: [`backend/app/services/analytics_service.py`](file:///Users/mk/Desktop/civic-2.0/backend/app/services/analytics_service.py) and public routers directly delegate to `MetricsService`.
3. **Persistent Community Votes**: In-memory state was eliminated and replaced with the [`complaint_community_votes`](file:///Users/mk/Desktop/civic-2.0/backend/app/models/entities.py) table.
4. **Persistent Visitor Tracking**: Handled idempotently via the [`platform_visitors`](file:///Users/mk/Desktop/civic-2.0/backend/app/models/entities.py) table.
5. **Universal Privacy Masking**: [`backend/app/services/masking_service.py`](file:///Users/mk/Desktop/civic-2.0/backend/app/services/masking_service.py) (`MaskingService`) guarantees strict pseudonymization across all public and officer-facing endpoints.

---

## 2. Canonical Metric Definitions & SQL Formulas

### 2.1 Complaint Volume Metrics

| Metric Name | Display Label | Canonical Status Set | SQL Definition |
| :--- | :--- | :--- | :--- |
| **Total Grievances** | Total Complaints / Reported | All statuses | `SELECT COUNT(id) FROM complaints WHERE [role_scope]` |
| **Resolved Grievances** | Resolved | `resolved`, `citizen_verified` | `SELECT COUNT(id) FROM complaints WHERE status IN ('resolved', 'citizen_verified') AND [role_scope]` |
| **Pending Grievances** | Pending / Active | `submitted`, `assigned`, `acknowledged`, `in_progress`, `appealed` | `SELECT COUNT(id) FROM complaints WHERE status NOT IN ('resolved', 'citizen_verified', 'rejected') AND [role_scope]` |
| **Critical Grievances** | Critical Priority | All statuses with priority `critical` | `SELECT COUNT(id) FROM complaints WHERE final_priority = 'critical' AND [role_scope]` |
| **Fix Reported** | Fix Reported (Officer Resolved) | `resolved` | `SELECT COUNT(id) FROM complaints WHERE status = 'resolved' AND [role_scope]` |
| **Citizen Verified** | Resolved & Verified | `citizen_verified` | `SELECT COUNT(id) FROM complaints WHERE status = 'citizen_verified' AND [role_scope]` |
| **Unverified (Public)** | Unverified | `submitted`, `assigned` with `< 3` community confirmations | Evaluated dynamically against `complaint_community_votes` |
| **Community Verified** | Community Verified | `in_progress`, `acknowledged`, or `>= 3` community confirmations | Evaluated dynamically against `complaint_community_votes` |

### 2.2 Performance & SLA Metrics

#### SLA Compliance Rate (%)
Calculated across all scoped grievances as the percentage of grievances that were either:
1. Successfully resolved within their allocated SLA deadline (`resolved_at <= sla_deadline`), OR
2. Currently open and still within their SLA deadline (`sla_deadline >= NOW()`).

```sql
SELECT ROUND(
    (COUNT(CASE 
        WHEN status IN ('resolved', 'citizen_verified') AND resolved_at <= sla_deadline THEN 1
        WHEN status NOT IN ('resolved', 'citizen_verified') AND sla_deadline >= NOW() THEN 1
        ELSE NULL 
    END) * 100.0) / NULLIF(COUNT(id), 0),
    1
) AS sla_compliance_rate
FROM complaints
WHERE [role_scope];
```

#### Average Resolution Time (Hours / Days)
Computed strictly from the historical duration between grievance creation and resolution timestamp.
```sql
SELECT ROUND(
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600.0),
    1
) AS avg_resolution_hours
FROM complaints
WHERE resolved_at IS NOT NULL 
  AND status IN ('resolved', 'citizen_verified')
  AND resolved_at >= created_at
  AND [role_scope];
```
*(In days: `avg_resolution_hours / 24.0`)*

#### Resolution Rate (%)
```sql
SELECT ROUND(
    (COUNT(CASE WHEN status IN ('resolved', 'citizen_verified') THEN 1 END) * 100.0) / NULLIF(COUNT(id), 0),
    1
) AS resolution_rate_pct
FROM complaints
WHERE [role_scope];
```

#### Citizen Verified Rate (%)
Percentage of resolved issues that were explicitly confirmed by citizens.
```sql
SELECT ROUND(
    (COUNT(CASE WHEN status = 'citizen_verified' THEN 1 END) * 100.0) / 
    NULLIF(COUNT(CASE WHEN status IN ('resolved', 'citizen_verified') THEN 1 END), 0),
    1
) AS citizen_verified_rate
FROM complaints
WHERE [role_scope];
```

#### Citizen Satisfaction Rating (1.0–5.0)
Average rating from citizen feedback:
```sql
SELECT COALESCE(ROUND(AVG(rating), 1), 0.0)
FROM citizen_feedback cf
JOIN complaints c ON cf.complaint_id = c.id
WHERE [role_scope];
```

---

## 3. Time Windows & Trend Comparison

1. **Daily Trends (`get_daily_trends`)**:
   - Default window: **14 consecutive days** (`start_date = NOW() - 14 days`, `end_date = NOW()`).
   - Grouped by `DATE(created_at)` for received complaints and `DATE(resolved_at)` for resolved complaints.
2. **KPI Summary (`get_kpi_summary`)**:
   - Default window: **30 days** (`start_date = NOW() - 30 days`, `end_date = NOW()`).
   - **Prior Period**: Exactly matching duration immediately preceding current window (`prev_start = start_date - (end_date - start_date)`, `prev_end = start_date`).
   - Trend delta: `round(current_value - previous_value, 1)`.

---

## 4. Role-Scoping Matrix

Data scoping is enforced in `MetricsService.apply_role_scope` and all underlying repository queries:

| Role | Scope Rule | Notes |
| :--- | :--- | :--- |
| **Citizen** | `Complaint.citizen_id == current_user.id` | Citizen dashboards and personal tracking only show complaints filed by the citizen. Public boards show aggregate/pseudonymized community data. |
| **Officer** | `Complaint.assigned_officer_id == current_user.id` | Assigned complaints only. Escalation and department metrics viewable only if granted ward/dept supervisor scope. |
| **Department Admin** | `ComplaintCategory.department_id == current_user.department_id` | All grievances and officers within the administrator's department across all wards. |
| **Government Administrator** | Global (No filter) | Full statewide visibility across all departments, wards, and officers. |

---

## 5. Privacy & Data Masking Rules (`MaskingService`)

The platform implements strict privacy safeguards to protect citizen reporters from retaliation or harassment while preserving transparency.

### 5.1 Name Masking Matrix

| Viewer Role | Anonymous Report | Standard Citizen Report | Own Grievance |
| :--- | :--- | :--- | :--- |
| **Public Viewer (Unauthenticated)** | `"Anonymous Citizen"` | Pseudonym (e.g., `"Kavitha R."` or `"Citizen #0042"`) | N/A |
| **Other Citizen** | `"Anonymous Citizen"` | Pseudonym (e.g., `"Kavitha R."`) | Full Name (`"Kavitha Raman"`) |
| **Assigned Officer** | `"Anonymous Citizen"` | Pseudonym (e.g., `"Kavitha R."`) | Full Name |
| **Department Admin** | `"Anonymous Citizen"` | Full Name (`"Kavitha Raman"`) | Full Name |
| **Government Admin** | `"Anonymous Citizen"` | Full Name (`"Kavitha Raman"`) | Full Name |

> **Critical Rule**: For anonymous reports (`mobile == '9800000000'` or `is_anonymous == True`), the reporter name is **ALWAYS** `"Anonymous Citizen"`, even to Department and Government Administrators.

### 5.2 Contact Information Masking

| Viewer Role | Anonymous Report | Public Viewer | Officer | Department Admin / Gov Admin |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile Number** | Redacted (`None`) | Redacted (`None`) | Partially Masked (e.g., `"987654****"`) | Full Mobile (`"9876543210"`) |
| **Email Address** | Redacted (`None`) | Redacted (`None`) | Redacted (`None`) | Full Email |

---

## 6. Verification and Test Enforcement

The single source of truth contract is strictly tested and enforced by:
- [`tests/test_metrics_service.py`](file:///Users/mk/Desktop/civic-2.0/tests/test_metrics_service.py): Verifies KPI summaries, public stats, visitor tracking idempotency, persistent community voting, and role-based masking.
- [`tests/test_rbac.py`](file:///Users/mk/Desktop/civic-2.0/tests/test_rbac.py): Verifies database query scoping across all 4 roles.
- [`tests/test_sla_engine.py`](file:///Users/mk/Desktop/civic-2.0/tests/test_sla_engine.py): Verifies SLA calculation accuracy, escalation levels, and deadline compliance.
- E2E Playwright test suite in [`frontend/tests/`](file:///Users/mk/Desktop/civic-2.0/frontend/tests/): Verifies dynamic UI rendering across all pages.

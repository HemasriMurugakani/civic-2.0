# AI-GovInsight REST API Documentation

Base URL: `http://localhost:8000/api/v1`  
Interactive Swagger Docs: `http://localhost:8000/docs`  
OpenAPI Specification: `http://localhost:8000/openapi.json`

All requests expecting JSON should set `Content-Type: application/json`.  
Protected endpoints require: `Authorization: Bearer <access_token>`.

---

## 1. Authentication (`/auth`)

### `POST /auth/register`
Citizen registration with mobile number and password.
- **Rate Limit**: 10 requests / minute
- **Request Body**:
  ```json
  {
    "name": "Kavitha Sundaram",
    "mobile": "9840000001",
    "password": "Password@123",
    "email": "citizen1@tngov.in",
    "preferred_language": "ta",
    "ward_id": 51
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbG...",
    "refresh_token": "eyJhbG...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "name": "Kavitha Sundaram",
      "mobile": "9840000001",
      "email": "citizen1@tngov.in",
      "role": "citizen",
      "department_id": null,
      "ward_id": 51,
      "preferred_language": "ta",
      "is_active": true
    }
  }
  ```

### `POST /auth/login`
Authenticate via mobile number or email and password.
- **Rate Limit**: 20 requests / minute
- **Request Body**:
  ```json
  {
    "username": "9800000001",
    "password": "Civic@123"
  }
  ```
- **Response `200 OK`**: `TokenResponse` (access + refresh token)

### `POST /auth/send-otp`
Send mock verification code.
- **Request Body**: `{"mobile": "9840000001"}`

### `POST /auth/verify-otp`
Verify OTP (any 6 digits accepted in dev when `MOCK_OTP_ENABLED=true`).
- **Request Body**: `{"mobile": "9840000001", "otp": "123456"}`

### `POST /auth/refresh`
Rotate refresh token and issue new access token.
- **Request Body**: `{"refresh_token": "eyJhbG..."}`

### `GET /auth/me`
Retrieve profile of currently authenticated user.

---

## 2. Grievance Management (`/complaints`)

### `GET /complaints`
List complaints with repository-level role scoping and pagination.
- **Query Parameters**:
  - `status`: `submitted` | `assigned` | `acknowledged` | `in_progress` | `resolved` | `citizen_verified` | `reopened`
  - `priority`: `low` | `medium` | `high` | `critical`
  - `ward_id`: integer
  - `department_id`: integer (Gov Admin only)
  - `category_id`: integer
  - `search`: string (matches title, description, or reference_no)
  - `start_date`, `end_date`: ISO datetime
  - `limit`: default 50 (max 200)
  - `offset`: default 0

### `POST /complaints`
Submit a new grievance (Citizen or Staff).
- **Request Body**:
  ```json
  {
    "title": "Severe garbage accumulation near market",
    "description": "Vegetable waste overflowing onto road for 3 days.",
    "category_id": 1,
    "ward_id": 51,
    "latitude": 13.1137,
    "longitude": 80.2954,
    "address_text": "Market Road, Royapuram, Chennai - 600013",
    "channel": "web"
  }
  ```
- **Response `200 OK`**: `ComplaintListItem` with generated `reference_no` (e.g. `GOV-2026-003001`), SLA deadline, and auto-assigned officer.

### `GET /complaints/{id}`
Retrieve complete grievance details including status history, evidence attachments, comments thread, and citizen feedback. Scoped to authorized viewers.

### `PATCH /complaints/{id}/status`
Transition complaint through the formal state machine.
- **Request Body**:
  ```json
  {
    "status": "in_progress",
    "note": "Field crew arrived on site."
  }
  ```
- **Validation**: Enforces legal transitions in state machine. Moving to `resolved` requires a non-empty `note`.

### `POST /complaints/{id}/reassign`
Reassign grievance to a different officer (Department Admin & Government Admin).
- **Request Body**: `{"officer_id": 12, "note": "Reassigned due to leave"}`

### `POST /complaints/{id}/reopen`
Citizen reopens a complaint if dissatisfied with resolution.
- **Request Body**: `{"reason": "Pothole was only partially filled and sunk again."}`

### `POST /complaints/{reference_no}/escalate`
Escalate an overdue grievance to higher departmental authorities.
- **Request Body**: `{"reason": "SLA deadline exceeded with no progress."}`

### `POST /complaints/{id}/comments`
Post a comment to the grievance discussion thread.
- **Request Body**: `{"comment": "Inspection scheduled for 3 PM", "is_internal": false}`

### `POST /complaints/{id}/evidence`
Upload before/after repair evidence (multipart form data).
- **Form Data**:
  - `evidence_type`: `citizen` | `before` | `after`
  - `file`: binary file (JPG, PNG, WebP, PDF)

### `POST /complaints/{id}/feedback`
Citizen rating (1-5 stars) and resolution confirmation.
- **Request Body**:
  ```json
  {
    "rating": 5,
    "comment": "Prompt response and clean fix. Thank you!",
    "confirmed_resolved": true
  }
  ```

### `GET /complaints/{id}/similar`
Live Vector Semantic Duplicate Detection endpoint using 384-dimensional FastEmbed multilingual ONNX embeddings and spatio-temporal hybrid scoring.
- **Query Parameters**:
  - `limit`: integer (default: 5)
  - `threshold`: float (default: 0.60)
- **Response**: List of candidate matching grievances with semantic similarity, geodesic distance (meters), and composite duplicate scores.

### `POST /complaints/check-duplicate` & `POST /public/issues/check-duplicate`
Public and authenticated pre-submission duplicate detection seam. Evaluates title, description, and GPS coordinates against active neighborhood reports.
- **Specification**: See detailed documentation in [`docs/architecture/semantic-duplicate-detection.md`](./architecture/semantic-duplicate-detection.md).

### `POST /complaints/merge-cluster`
Merges multiple duplicate grievances under a Master Incident (`ComplaintCluster`). Restricted to Nodal Officers and Admins.

### `GET /complaints/{id}/ai-insights`
Live AI Risk and Severity Inspection endpoint. Returns predicted priority tier, urgency score (0.0 - 1.0), confidence level, detected hazard signals, and recommended SLA multiplier.

### `POST /complaints/predict-priority` & `POST /public/issues/predict-priority`
Bilingual AI Priority Prediction seam (Tamil, English, Tanglish). Uses multilingual vector embeddings and domain hazard rules to evaluate life-safety risks.
- **Specification**: See detailed documentation in [`docs/architecture/priority-prediction.md`](./architecture/priority-prediction.md).

### `GET /complaints/{id}/summary` & `GET /public/issues/{id}/summary`
Executive AI Briefing Engine for Ministers and Department Admins. Generates a strict 2-sentence summary (Sentence 1: problem origin; Sentence 2: operational milestone and active officer status), actionable next steps, and key entity metadata in English or Tamil (`?language=en|ta`).
- **Specification**: See detailed documentation in [`docs/architecture/grievance-summarization.md`](./architecture/grievance-summarization.md).

### `POST /complaints/{id}/summarize`
Customizable executive briefing endpoint with optional audit timeline and discussion comment inclusion parameters.

---

## 3. Public Endpoints (`/public`)

### `GET /public/track/{reference_no}`
Public, unauthenticated tracking for citizens. Returns anonymized progress timeline, SLA status, and current state without exposing private citizen information.

### `GET /public/stats`
Landing page live counter statistics: total grievances, resolved count, and average resolution time in days.

### `GET /public/master-data`
Returns active list of departments, wards, and categories for the public complaint submission form.

---

## 4. Analytics & Governance (`/analytics`)

### `GET /analytics/kpi`
KPI summary cards (total, resolved, pending, critical, SLA compliance rate, avg resolution hours, avg citizen rating, confirmed resolution rate) with trend deltas compared to the previous period. Role-scoped.

### `GET /analytics/categories`
Category-wise volume, resolved counts, and SLA breach rates.

### `GET /analytics/wards`
Ward-level hotspot data with coordinates, total grievances, unresolved count, critical count, and category split (for GIS map and mini donuts).

### `GET /analytics/officers`
Officer workload table (active, resolved, overdue complaints) for Department Admin and Gov Admin.

### `GET /analytics/trends`
Daily time series of opened vs resolved grievances.

### `GET /analytics/leaderboard`
Cross-department comparative leaderboard (Gov Admin only).

---

## 5. Notifications (`/notifications`)

### `GET /notifications`
User notifications list with unread filtering.

### `GET /notifications/unread-count`
Count of unread notifications for badge indicator.

### `POST /notifications/mark-read`
Mark specific notifications or all notifications as read.

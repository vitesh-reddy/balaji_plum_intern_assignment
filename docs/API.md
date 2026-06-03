# API Documentation

Base URL: `http://localhost:5000/api`

## Health Check

### `GET /health`
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "service": "Plum OPD Adjudication API",
  "timestamp": "2024-11-01T10:00:00.000Z",
  "gemini_configured": true
}
```

---

## Claims

### `POST /claims`
Submit a new claim for adjudication.

**Content-Type:** `multipart/form-data` (with files) or `application/json` (without files)

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| member_id | string | Yes | Member ID (e.g., "EMP001") |
| member_name | string | Yes | Member full name |
| treatment_date | string | Yes | Date in YYYY-MM-DD format |
| claim_amount | number | Yes | Total claim amount in ₹ |
| hospital | string | No | Hospital/clinic name |
| cashless_request | boolean | No | Whether cashless is requested |
| documents | file[] | No | Document images/PDFs |
| document_types | string | No | JSON array of doc types |
| documents_data | string | No | JSON string of manual document data |
| previous_claims_same_day | number | No | Count of same-day claims |

**Response (201):**
```json
{
  "success": true,
  "claim": {
    "claim_id": "CLM_00001",
    "decision": "APPROVED",
    "approved_amount": 1350,
    "rejection_reasons": [],
    "confidence_score": 0.95,
    "notes": "Claim approved. Co-pay: ₹150.",
    "adjudication_steps": [...]
  }
}
```

### `GET /claims`
List all claims with optional filters.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by decision (APPROVED/REJECTED/PARTIAL/MANUAL_REVIEW) |
| member_id | string | Filter by member |
| from_date | string | Start date filter |
| to_date | string | End date filter |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20) |

### `GET /claims/stats`
Get claims statistics for dashboard.

**Response:**
```json
{
  "total": 10,
  "approved": 3,
  "rejected": 5,
  "partial": 1,
  "manual_review": 1,
  "total_approved_amount": 12950,
  "total_claimed_amount": 62800,
  "approval_rate": "40.0"
}
```

### `GET /claims/:id`
Get full claim details including adjudication steps.

### `POST /claims/:id/appeal`
Appeal a rejected claim decision.

**Body:**
```json
{
  "reason": "Treatment was medically necessary as per specialist opinion"
}
```

### `DELETE /claims/:id`
Delete a claim and its uploaded files.

---

## Members

### `GET /members`
List all covered members.

### `GET /members/:id`
Get member details with claim history and summary.

### `GET /members/:id/lookup`
Quick member lookup (for autocomplete).

**Response:**
```json
{
  "found": true,
  "member_id": "EMP001",
  "name": "Rajesh Kumar",
  "policy_status": "active",
  "join_date": "2024-01-01"
}
```

### `POST /members`
Add a new member.

---

## Policy

### `GET /policy`
Get full policy terms configuration.

### `GET /policy/coverage`
Get coverage details with sub-limits.

### `GET /policy/exclusions`
Get exclusions list.

### `GET /policy/network-hospitals`
Get network hospitals list.

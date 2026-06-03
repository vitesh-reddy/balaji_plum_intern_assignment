# API Documentation

Base URL: `http://localhost:5000/api`

## Health

### `GET /health`

Checks whether the backend is running.

**Response**

```json
{
  "status": "ok",
  "service": "Plum OPD Adjudication API",
  "timestamp": "2026-06-03T17:00:00.000Z",
  "gemini_configured": true
}
```

## Claims

### `POST /claims`

Submits a claim and runs adjudication.

Supported content types:

- `application/json` for direct test/manual data
- `multipart/form-data` for uploaded documents

Supported uploaded document formats:

- Images: `jpg`, `jpeg`, `png`, `webp`, `gif`
- PDF: `pdf`
- JSON test documents: `json`

JSON uploaded documents are parsed directly and skip OCR/LLM extraction. Use `document_types` to map each uploaded file to `prescription`, `bill`, `report`, or `pharmacy_bill`.

**Form Fields**

| Field | Type | Required | Description |
|---|---|---:|---|
| `member_id` | string | Yes | Member ID, for example `EMP001` |
| `member_name` | string | Yes | Member full name |
| `treatment_date` | string | Yes | Date in `YYYY-MM-DD` format |
| `claim_amount` | number | Yes | Total claimed amount |
| `hospital` | string | No | Hospital or clinic name |
| `cashless_request` | boolean | No | Whether cashless processing is requested |
| `documents` | file[] | No | Uploaded image/PDF/JSON documents |
| `document_types` | JSON string | No | Example: `["prescription","bill"]` |
| `documents_data` | JSON string | No | Direct structured document payload |
| `previous_claims_same_day` | number | No | Used for fraud/manual-review checks |

**Example `documents_data`**

```json
{
  "prescription": {
    "doctor_name": "Dr. Sharma",
    "doctor_reg": "KA/45678/2015",
    "diagnosis": "Viral fever",
    "medicines_prescribed": ["Paracetamol 650mg", "Vitamin C"]
  },
  "bill": {
    "consultation_fee": 1000,
    "diagnostic_tests": 500,
    "test_names": ["CBC", "Dengue test"]
  }
}
```

**Response `201`**

```json
{
  "success": true,
  "claim": {
    "claim_id": "CLM_00001",
    "decision": "APPROVED",
    "approved_amount": 1350,
    "rejection_reasons": [],
    "rejected_items": [],
    "confidence_score": 0.95,
    "notes": "Claim approved...",
    "next_steps": "Reimbursement will be processed within 7-10 business days.",
    "adjudication_steps": []
  }
}
```

### `GET /claims`

Lists claims with optional filters.

| Query Param | Type | Description |
|---|---|---|
| `status` | string | Filter by `APPROVED`, `REJECTED`, `PARTIAL`, or `MANUAL_REVIEW` |
| `member_id` | string | Filter by member |
| `from_date` | string | Start date |
| `to_date` | string | End date |
| `page` | number | Page number, default `1` |
| `limit` | number | Page size, default `20` |

### `GET /claims/stats`

Returns dashboard metrics.

### `GET /claims/:id`

Returns full claim details by Mongo `_id` or generated `claim_id`.

### `POST /claims/:id/appeal`

Moves a rejected or partial claim into manual review.

**Body**

```json
{
  "reason": "Additional doctor justification is available."
}
```

### `DELETE /claims/:id`

Deletes a claim and removes uploaded files from local storage.

## Members

### `GET /members`

Lists covered members.

### `GET /members/:id`

Returns member details and claim history.

### `GET /members/:id/lookup`

Quick lookup for claim form autofill.

### `POST /members`

Creates a new member.

## Policy

### `GET /policy`

Returns complete policy terms.

### `GET /policy/coverage`

Returns coverage limits and sub-limits.

### `GET /policy/exclusions`

Returns exclusions.

### `GET /policy/network-hospitals`

Returns network hospitals.

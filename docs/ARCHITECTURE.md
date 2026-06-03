# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)           │
│                    Vite Dev Server                   │
│                   Port 5173                         │
│  ┌───────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │ Dashboard  │ │ New Claim │ │ Claim Detail     │  │
│  │           │ │ (Wizard)  │ │ (5-Step Review)  │  │
│  └───────────┘ └───────────┘ └──────────────────┘  │
│  ┌───────────┐ ┌───────────┐ ┌──────────────────┐  │
│  │Claims List│ │ Members   │ │ Policy Terms     │  │
│  └───────────┘ └───────────┘ └──────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │ REST API (axios)
                       ▼
┌─────────────────────────────────────────────────────┐
│            Backend (Node.js + Express)               │
│                    Port 5000                        │
│  ┌──────────────────────────────────────────────┐   │
│  │              REST API Routes                  │   │
│  │  /api/claims  /api/members  /api/policy      │   │
│  └───────┬───────────┬───────────────────────────┘  │
│          │           │                              │
│  ┌───────▼─────┐  ┌──▼──────────────┐             │
│  │  Document   │  │  Adjudication   │             │
│  │  Processor  │  │  Engine         │             │
│  │             │  │  (5-Step)       │             │
│  │ ┌─────────┐ │  │ ┌─────────────┐ │             │
│  │ │Tesseract│ │  │ │ Rule Engine │ │             │
│  │ │  OCR    │ │  │ │(Deterministic│ │             │
│  │ └────┬────┘ │  │ └──────┬──────┘ │             │
│  │      │      │  │        │        │             │
│  │ ┌────▼────┐ │  │ ┌──────▼──────┐ │             │
│  │ │ Gemini  │ │  │ │   Gemini    │ │             │
│  │ │  API    │ │  │ │ Medical     │ │             │
│  │ │(Extract)│ │  │ │ Assessment  │ │             │
│  │ └─────────┘ │  │ └─────────────┘ │             │
│  └─────────────┘  └─────────────────┘             │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────▼────────┐
              │    MongoDB      │
              │  (Mongoose)     │
              │                 │
              │ • members       │
              │ • claims        │
              └─────────────────┘
```

## Data Flow

1. **Claim Submission**: User fills multi-step wizard → uploads documents or enters data manually
2. **Document Processing**: OCR (Tesseract.js) extracts text → Gemini API extracts structured fields
3. **Adjudication Pipeline**: 5-step sequential validation:
   - Step 0: Fraud detection (same-day claims, suspicious patterns)
   - Step 1: Eligibility (policy active, waiting period, member exists)
   - Step 2: Document validation (prescription present, doctor reg valid)
   - Step 3: Coverage verification (service covered, not excluded, pre-auth)
   - Step 4: Limit validation (per-claim, sub-limits, annual, co-pay/discount)
   - Step 5: Medical necessity (LLM-assisted diagnosis-treatment alignment)
4. **Decision**: APPROVED / REJECTED / PARTIAL / MANUAL_REVIEW with confidence score
5. **Storage**: Claim + decision + step-by-step breakdown saved to MongoDB
6. **Display**: Result shown in UI with full reasoning

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend | React + TypeScript (Vite) | SPA with rich UI |
| Routing | React Router v6 | Client-side navigation |
| HTTP | Axios | API calls |
| Backend | Node.js + Express | REST API server |
| Database | MongoDB + Mongoose | Document storage |
| LLM | Google Gemini API | Document extraction, medical assessment |
| OCR | Tesseract.js | Text extraction from images |
| File Upload | Multer | Multipart form handling |

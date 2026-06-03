# Plum OPD Claim Adjudication Tool

AI-powered web application that automates the adjudication (approval/rejection) of Outpatient Department (OPD) insurance claims.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite) |
| Backend | Node.js + Express |
| AI/LLM | Google Gemini API |
| Database | MongoDB + Mongoose |
| OCR | Tesseract.js |

## 📋 Features

- **Document Processing**: Upload medical bills, prescriptions, and reports — OCR + Gemini AI extracts structured data
- **5-Step Adjudication Engine**: Automated eligibility → document → coverage → limits → medical necessity pipeline
- **Decision Types**: APPROVED, REJECTED, PARTIAL, MANUAL_REVIEW with confidence scores
- **Rule Engine**: Deterministic policy validation (co-pay, sub-limits, network discounts, exclusions, waiting periods)
- **Fraud Detection**: Flags suspicious patterns (same-day claims, unusual frequency)
- **Appeal Workflow**: File appeals on rejected claims for manual review
- **Dashboard**: Real-time stats, approval rates, amount summaries
- **Policy Viewer**: Full policy terms, coverage limits, exclusions, and network hospitals

## 🛠️ Setup & Installation

### Prerequisites

- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas) free tier)
- Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# In backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://localhost:27017/plum_opd
PORT=5000
```

### 3. Seed Database

```bash
cd backend
npm run seed
# Or start the server — it auto-seeds on first run
```

### 4. Start Development

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

## 🧪 Running Tests

```bash
cd backend
npm test
```

All 10 test cases from `test_cases.json` are covered (22 assertions, all passing).

## 📁 Project Structure

```
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── models/
│   │   ├── Claim.js              # Claim schema
│   │   └── Member.js             # Member schema
│   ├── routes/
│   │   ├── claims.js             # Claims CRUD + adjudication
│   │   ├── members.js            # Members API
│   │   └── policy.js             # Policy terms API
│   ├── services/
│   │   ├── adjudicationEngine.js # 5-step adjudication pipeline
│   │   ├── ruleEngine.js         # Deterministic business rules
│   │   ├── llmService.js         # Gemini API integration
│   │   └── ocrService.js         # Tesseract.js OCR
│   ├── tests/
│   │   └── adjudication.test.js  # All 10 test cases
│   ├── policyConfig.js           # Policy terms loader
│   ├── seedData.js               # Database seeder
│   └── server.js                 # Express entry point
├── frontend/
│   └── src/
│       ├── components/           # Reusable UI components
│       ├── pages/                # Route pages
│       ├── services/api.ts       # API client
│       └── index.css             # Design system
├── docs/
│   ├── ARCHITECTURE.md           # System architecture
│   ├── API.md                    # API documentation
│   ├── ASSUMPTIONS.md            # Implementation assumptions
│   └── DECISION_FLOWCHART.md     # Adjudication logic flowchart
└── policy_terms.json             # Policy configuration
```

## 📊 Test Cases Coverage

| ID | Scenario | Expected | Status |
|----|----------|----------|--------|
| TC001 | Simple consultation | APPROVED ₹1,350 | ✅ |
| TC002 | Dental + cosmetic | PARTIAL ₹8,000 | ✅ |
| TC003 | Over per-claim limit | REJECTED | ✅ |
| TC004 | Missing prescription | REJECTED | ✅ |
| TC005 | Diabetes waiting period | REJECTED | ✅ |
| TC006 | Ayurvedic treatment | APPROVED ₹4,000 | ✅ |
| TC007 | MRI no pre-auth | REJECTED | ✅ |
| TC008 | Fraud - same day claims | MANUAL_REVIEW | ✅ |
| TC009 | Weight loss excluded | REJECTED | ✅ |
| TC010 | Network hospital cashless | APPROVED ₹3,600 | ✅ |

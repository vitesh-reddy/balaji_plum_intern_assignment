# Decision Logic Flowchart

```mermaid
flowchart TD
    Start["Claim Submitted"] --> Input["Collect Claim Data<br/>manual fields, uploaded docs, or JSON test docs"]

    Input --> DocSource{"Document Source?"}
    DocSource -->|"JSON upload / documents_data"| ParseJson["Parse Structured JSON"]
    DocSource -->|"Image / PDF"| OCR["OCR with Tesseract"]
    OCR --> GeminiExtract["Gemini Extracts Structured Fields<br/>with RAG context"]
    ParseJson --> Fraud
    GeminiExtract --> Fraud

    Fraud{"Step 0: Fraud Check"}
    Fraud -->|"previous_claims_same_day >= 2"| ManualReview["MANUAL_REVIEW"]
    Fraud -->|"No fraud flags"| Eligibility{"Step 1: Eligibility"}

    Eligibility -->|"Member not found"| RejectMember["REJECTED<br/>MEMBER_NOT_COVERED"]
    Eligibility -->|"Policy inactive"| RejectPolicy["REJECTED<br/>POLICY_INACTIVE"]
    Eligibility -->|"Waiting period not met"| RejectWaiting["REJECTED<br/>WAITING_PERIOD"]
    Eligibility -->|"Eligible"| Documents{"Step 2: Document Validation"}

    Documents -->|"Prescription missing"| RejectDocs["REJECTED<br/>MISSING_DOCUMENTS"]
    Documents -->|"Doctor registration invalid"| RejectDoctor["REJECTED<br/>DOCTOR_REG_INVALID"]
    Documents -->|"Valid documents"| Coverage{"Step 3: Coverage Verification"}

    Coverage -->|"Excluded service / condition"| RejectCoverage["REJECTED<br/>SERVICE_NOT_COVERED"]
    Coverage -->|"MRI/CT without pre-auth"| RejectPreAuth["REJECTED<br/>PRE_AUTH_MISSING"]
    Coverage -->|"Some covered, some excluded"| PartialCalc["Calculate Partial Approval"]
    Coverage -->|"Covered"| Limits{"Step 4: Limit Validation"}

    PartialCalc --> Limits
    Limits -->|"Claim below minimum"| RejectMin["REJECTED<br/>BELOW_MIN_AMOUNT"]
    Limits -->|"Per-claim limit exceeded"| RejectLimit["REJECTED<br/>PER_CLAIM_EXCEEDED"]
    Limits -->|"Within limits"| Deductions["Apply Co-pay and Network Discount"]

    Deductions --> Rag["Retrieve RAG Context<br/>policy_terms + adjudication docs"]
    Rag --> Medical{"Step 5: Medical Necessity<br/>Gemini + Retrieved Context"}

    Medical -->|"Not medically necessary"| RejectMedical["REJECTED<br/>NOT_MEDICALLY_NECESSARY"]
    Medical -->|"Necessary"| Final{"Final Decision"}

    Final -->|"All checks passed"| Approved["APPROVED"]
    Final -->|"Partial coverage"| Partial["PARTIAL"]
    Final -->|"Manual risk remains"| ManualReview

    Approved --> Save["Save Claim + Decision in MongoDB"]
    Partial --> Save
    ManualReview --> Save
    RejectMember --> Save
    RejectPolicy --> Save
    RejectWaiting --> Save
    RejectDocs --> Save
    RejectDoctor --> Save
    RejectCoverage --> Save
    RejectPreAuth --> Save
    RejectMin --> Save
    RejectLimit --> Save
    RejectMedical --> Save

    Save --> Response["Return Decision to Frontend"]
```

## Decision Types

| Decision | Meaning |
|---|---|
| `APPROVED` | Claim passes all checks and is payable |
| `REJECTED` | Claim fails a hard policy or medical necessity rule |
| `PARTIAL` | Covered items are payable while excluded items are rejected |
| `MANUAL_REVIEW` | Fraud or ambiguity requires human review |

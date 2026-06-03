# Assumptions Made

## Business Assumptions

1. A member must exist and have an active policy for a claim to proceed.
2. The initial waiting period is 30 days for all new members.
3. Specific ailment waiting periods are detected by diagnosis keywords.
4. Diabetes and hypertension use a 90-day waiting period.
5. Pre-existing disease waiting period is treated as 365 days where applicable.
6. A valid prescription is mandatory for claim approval.
7. Doctor registration numbers are accepted in either `STATE/NUMBER/YEAR` or `TYPE/STATE/NUMBER/YEAR` format.
8. MRI and CT scans require pre-authorization.
9. Claims below the minimum claim amount are rejected.
10. Claims above the per-claim limit are rejected instead of being auto-capped.
11. Partial approval is used only when claim line items can be separated into covered and excluded items.
12. Teeth whitening and cosmetic procedures are treated as excluded items.
13. Root canal is treated as a covered dental procedure.
14. A claim with 2 or more previous same-day claims is sent to manual review.
15. Network hospital discount applies only when a matching network hospital is used with a cashless request.

## Technical Assumptions

1. MongoDB is available locally at `mongodb://localhost:27017/plum_opd`, unless `MONGODB_URI` is configured.
2. The backend runs on port `5000`.
3. The frontend runs on port `5173` in development and `4173` in preview mode.
4. The database auto-seeds test members when the members collection is empty.
5. Uploaded files are stored locally in `backend/uploads`.
6. JSON test documents are trusted structured inputs and skip OCR.
7. Image/PDF documents use OCR first; Gemini Vision is used as fallback when OCR text is unavailable.
8. Gemini is used for document extraction and medical necessity review.
9. If `GEMINI_API_KEY` is unavailable, the system falls back to mock/default AI responses.
10. RAG uses a lightweight local keyword retriever instead of a vector database.
11. RAG sources are local project files such as `policy_terms.json`, `adjudication_rules.md`, and files in `docs/`.
12. Deterministic rule checks are the primary source of final policy decisions.
13. Gemini medical necessity review assists the final step but does not replace hard policy checks.
14. Annual limit tracking is simplified for the MVP and would need policy-year aggregation for production.
15. Production deployment should replace local file storage with cloud object storage.

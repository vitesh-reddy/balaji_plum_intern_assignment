# Assumptions

## Business Logic

1. **Co-pay Calculation**: 10% co-pay is applied on the consultation fee component only. If no separate consultation fee is listed in the bill breakdown, 10% co-pay is applied on the total claim amount.

2. **Per-Claim Limit**: Claims exceeding the ₹5,000 per-claim limit are fully rejected (not partially approved up to the limit). This follows the test case TC003 expected behavior.

3. **Partial Approval**: Only applies when specific line items in a claim can be categorized as covered vs. excluded (e.g., root canal covered + teeth whitening excluded). General over-limit scenarios are rejected, not partially approved.

4. **Network Discount**: 20% discount is applied to the total claim amount for network hospitals with cashless requests, before co-pay calculation.

5. **Waiting Period**: 
   - Initial waiting period of 30 days applies to all new members
   - Specific ailment waiting periods (diabetes: 90 days, hypertension: 90 days) are triggered by keyword matching in the diagnosis
   - Pre-existing disease waiting period (365 days) applies when diagnosis matches pre-existing condition keywords

6. **MRI/CT Pre-Authorization**: MRI and CT scans always require pre-authorization regardless of the claim amount. The test case mentions ₹10,000 threshold, but the policy_terms.json doesn't specify one — we check for any MRI/CT regardless.

7. **Fraud Detection**: A claim is flagged for manual review if the member has 2 or more previous claims on the same day. This is based on a provided `previous_claims_same_day` field.

8. **Doctor Registration Format**: We accept two formats:
   - Standard: `STATE/NUMBER/YEAR` (e.g., KA/45678/2015)
   - Extended: `TYPE/STATE/NUMBER/YEAR` (e.g., AYUR/KL/2345/2019)

## Technical

9. **Document Processing**: When both OCR text and manual form input are provided, the manual form input takes precedence for adjudication. OCR/LLM results are stored but used as supplementary data.

10. **Gemini API Fallback**: When the Gemini API key is not configured, the system falls back to mock responses for LLM features. Medical necessity is defaulted to approved. This allows the core rule engine and adjudication flow to work without an API key.

11. **MongoDB Requirement**: MongoDB must be running locally on port 27017, or a MongoDB Atlas URI must be provided via the `MONGODB_URI` environment variable.

12. **Auto-Seeding**: The database is automatically seeded with 10 test members on first server start if the members collection is empty.

13. **File Storage**: Uploaded documents are stored on the local filesystem in `backend/uploads/`. For production, this should be replaced with cloud storage (S3, GCS).

14. **Claim ID Generation**: Claim IDs are auto-generated as `CLM_XXXXX` where XXXXX is a zero-padded sequential number.

15. **Annual Limit Tracking**: Not fully implemented in this MVP — would require aggregating all approved claims for the member in the current policy year. Currently only per-claim and sub-limits are enforced.

# Past Exam PDF Intake Runbook

## Purpose
Use past-exam PDFs only as private/reference grounding material.

## Workflow
1. Collect official/source PDF.
2. Store PDF in private storage or operator-only repository location.
3. Register source document metadata.
4. Extract text/OCR by page.
5. Split into question-level candidates.
6. Generate skeleton/checkpoint/gap candidate.
7. Human review.
8. Mark verified.
9. Allow Answer Review grounding to use verified candidate.

## Safety policy
- raw text is reference_only
- no public archive
- no raw PDF display to learners
- no official model answer claim
- no official grading claim
- no user uploaded raw answer used as global training data

## Pilot scope
- Start with 2023–2025 second-stage PDFs.
- Expand only after extraction quality is verified.

## Extraction candidate workflow
1. Upload/store PDF privately.
2. Register source document.
3. Create page-range extraction candidate.
4. Extract OCR/text.
5. Keep extracted text reference_only.
6. Create structured candidate.
7. Human review before verified.
8. Only verified references may be prioritized in Answer Review grounding.

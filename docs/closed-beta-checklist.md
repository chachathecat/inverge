# Inverge Closed Beta Manual QA Checklist

## A. New empty learner
- Log in with an invited learner account.
- Open `/app`.
- Confirm the user understands the first action within 5 seconds.
- Confirm empty state points to **오늘 한 것 올리기** or capture.

## B. Appraiser 1st-stage capture
- Open `/app/capture?mode=first`.
- Select or confirm **감정평가사 1차**.
- Enter a sample objective-question mistake.
- Confirm OCR/text field is editable.
- Save.
- Confirm one biggest gap and one next action appear.
- Confirm Review Queue receives a pending item.
- Confirm Today Plan reflects the saved note.

## C. Appraiser 2nd-stage capture
- Open `/app/capture?mode=second`.
- Enter a short answer/case note.
- Confirm missing issue / weak structure / rewrite language appears.
- Save.
- Confirm Review Queue shows rewrite-oriented item.
- Confirm Today Plan shows rewrite-oriented next action.

## D. Mobile check
- Open learner home on mobile viewport.
- Open capture on mobile viewport.
- Confirm no horizontal overflow.
- Confirm CTA and textarea are usable.
- Confirm empty and saved states are readable.

## E. Unauthorized access
- Try `/instructor/source-review` as non-admin.
- Try `/instructor/second-grading` as non-admin.
- Confirm learner is not exposed to instructor tools.

## F. Safety copy
- Confirm no official grading/pass-fail/model-answer claims.
- Confirm OCR copy says it is a draft and user must review.

## G. Build and tests
- Run the closed beta smoke test.
- Run beta readiness rubric test.
- Run `npm run build`.
- Confirm Vercel preview is success.

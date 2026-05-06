# Inverge Closed Beta QA Run

## A. QA status
- Target: closed beta
- Readiness target: 9.0/10
- Current status: pending manual verification
- Vercel preview: must be success before launch
- Launch decision: not approved until all required checks are marked pass

## B. Required manual checks

### 1. Empty learner check
- /app loads for invited learner.
- Empty user sees one clear next action.
- Empty state points to 오늘 한 것 올리기 or capture.
- Pass/Fail:
- Notes:

### 2. Appraiser 1st-stage capture check
- /app/capture?mode=first opens.
- Main textarea is editable.
- OCR draft copy is visible.
- User can save one objective-question mistake.
- Saved state shows:
  - 오늘 기록이 저장되었습니다.
  - 복습 큐에 들어갔습니다.
  - 오늘 계획에 반영되었습니다.
  - 가장 큰 간극:
  - 다음 행동:
- Review Queue receives item.
- Today Plan reflects item.
- Pass/Fail:
- Notes:

### 3. Appraiser 2nd-stage capture check
- /app/capture?mode=second opens.
- User can save one short answer/case note.
- Missing issue / weak structure / rewrite language appears.
- Review Queue shows rewrite-oriented item.
- Today Plan shows rewrite-oriented next action.
- Pass/Fail:
- Notes:

### 4. Mobile check
- /app mobile layout usable.
- /app/capture mobile layout usable.
- /app/review mobile layout usable.
- No obvious horizontal overflow.
- CTA and textarea are usable.
- Pass/Fail:
- Notes:

### 5. Unauthorized instructor access check
- Non-admin cannot access /instructor/source-review.
- Non-admin cannot access /instructor/second-grading.
- Learner navigation does not expose instructor tools.
- Pass/Fail:
- Notes:

### 6. Safety copy check
- No official grading claim.
- No pass/fail judgment claim.
- No official model-answer claim.
- OCR text is described as draft/review-required.
- Pass/Fail:
- Notes:

### 7. Build/deployment check
- Vercel preview success.
- Closed beta smoke test passes.
- Mobile empty-state polish test passes.
- Beta readiness final gate test passes.
- Pass/Fail:
- Notes:

## C. Launch blockers
- Vercel preview failure
- capture save failure
- Review Queue not updated after save
- Today Plan not updated after save
- mobile capture unusable
- instructor route exposed
- official grading/pass-fail claim appears
- raw user text appears in shared/reference data

## D. Launch decision template
- Decision: Pending / Approved / Blocked
- Approved beta scope:
  - invited users only
  - 감정평가사 1차
  - 감정평가사 2차
  - no payment
  - no broad public launch
- Known limitations:
  - OCR provider is still gated/stubbed unless explicitly enabled
  - generated notes are learning aids, not official grading
  - beta is for workflow validation, not final scoring

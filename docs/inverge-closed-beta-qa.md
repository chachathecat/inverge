# Inverge Closed Beta QA / Release Hardening v1

This checklist is the closed-beta release gate for the learner-facing Inverge app. It protects the existing learning operations loop only: **감정평가사 1차** and **감정평가사 2차**. It does not add payment, public archive browsing, instructor grading, or additional exam tracks.

## Release decision

- Decision: Pending / Approved / Blocked
- QA owner:
- Preview URL:
- Build SHA:
- Date:
- Known risks:

Block release if any critical learner route crashes, if a non-invited user can reach learner data, if raw learner text leaks into derived metadata/reference requests, if unsupported exam scope appears in learner UI, or if the app presents official score/pass/fail/final-grading claims.

## Automated gate

Run these commands before approving the closed beta:

```bash
npm run verify:learner-loop:ci
npm run check:taxonomy
npm run build
npm run check:closed-beta-readiness
```

`check:closed-beta-readiness` runs the learner-loop smoke contract, data-boundary tests, question-reference tests, route/source guard checks, and a production build. Playwright is not required for this PR. If a browser is unavailable, use the manual QA checklist below on the Vercel preview and record evidence.

## Manual QA checklist

### 1. Access / onboarding

- [ ] Non-invited account opens `/app` and sees a calm blocked state: “아직 초대 승인 전입니다.”
- [ ] Invited account opens `/app` and sees the learner operating screen, not marketing UI.
- [ ] Learner navigation has no admin, instructor, studio, payment, or public archive links.
- [ ] `/admin/*`, `/api/admin/*`, `/instructor`, `/instructor/second-grading`, and `/studio` do not expose public tools to a learner account.
- [ ] Onboarding remains limited to 감정평가사 1차 and 감정평가사 2차.

### 2. Capture-to-Note

- [ ] Mobile photo input is reachable at `/app/capture` and does not overflow at 360px.
- [ ] Multi-page image upload preserves page order and shows the editable OCR draft before save.
- [ ] PDF fallback does not crash; if OCR cannot run, the learner can enter/edit text manually.
- [ ] Low-confidence OCR shows a calm warning and asks for confirmation, not a hard failure.
- [ ] Saving creates one user-owned item and one safe learning signal/review entry.
- [ ] Raw OCR/problem/answer text is not copied into derived metadata, telemetry metadata, or reference requests.

### 3. Today Plan / Review Queue

- [ ] A saved capture appears in Today Plan.
- [ ] Today Plan defaults to at most 3 tasks.
- [ ] Details and reference hints are collapsed by default.
- [ ] The screen does not show pass/fail, official score, or score prediction copy.
- [ ] Complete, retry, rewrite, and scheduled-review paths can be executed without a route crash.

### 4. 1차 O/X

- [ ] Practice shows one statement at a time.
- [ ] O/X and certainty buttons work.
- [ ] Correct+certain produces no new learning signal flood.
- [ ] Wrong, confused, or unknown creates a safe learning signal.
- [ ] Concept popup appears only after learner friction.
- [ ] Smart cloze review renders safely and ends with a retry/review action.

### 5. Accounting/Economics Template

- [ ] Supported template calculates deterministically from extracted numeric inputs.
- [ ] Unsupported template degrades safely and stores classification/OCR review only.
- [ ] Invalid numeric input does not crash.
- [ ] LLM final-answer text is ignored as a calculation source.

### 6. 2차 Rewrite / CASIO

- [ ] Feedback shows one biggest gap and one rewrite action.
- [ ] Original answer summary and rewrite paragraph remain separate.
- [ ] Supported CASIO mapping shows deterministic keystrokes.
- [ ] Unsupported CASIO mapping shows fallback copy.
- [ ] No official grading, model-answer certainty, score, pass/fail, or final-judgment copy appears.

### 7. Reference Context / Question Archive

- [ ] Reference hints are optional and collapsed.
- [ ] No dense public archive dashboard is linked from learner flow.
- [ ] Question archive records are metadata-only.
- [ ] No raw/copyrighted problem text is required for hints.
- [ ] User raw text never enters the reference corpus.

### 8. 1차 → 2차 Mode Migration

- [ ] Migration is manual and requires explicit confirmation.
- [ ] 1차 history is archived, not deleted.
- [ ] Active mode becomes 2차 after migration.
- [ ] Today Plan emphasizes 2차 rewrite after migration.
- [ ] No pass/fail or official-result claim appears.

### 9. Data Boundary

- [ ] Telemetry sanitizer removes raw keys recursively.
- [ ] Derived metadata excludes raw OCR, user answer, problem, and rewrite paragraph fields.
- [ ] Reference requests strip raw fields before matching.
- [ ] Learning-signal metadata keeps safe derived fields only.

## UI guardrails

- [ ] Critical learner pages are mobile-first and have no horizontal overflow at 360px.
- [ ] One screen has one primary action.
- [ ] No raw JSON/debug/internal fields are learner-visible.
- [ ] No instructor UI, payment/paywall, official score, pass/fail, or public archive UI is exposed.
- [ ] Korean copy is calm, precise, and operational.

## Evidence log

| Flow | Result | Evidence / notes | Owner |
| --- | --- | --- | --- |
| Access / onboarding | Pending |  |  |
| Capture-to-Note | Pending |  |  |
| Today Plan / Review Queue | Pending |  |  |
| 1차 O/X | Pending |  |  |
| Accounting/Economics Template | Pending |  |  |
| 2차 Rewrite / CASIO | Pending |  |  |
| Reference Context / Question Archive | Pending |  |  |
| Mode Migration | Pending |  |  |
| Data Boundary | Pending |  |  |

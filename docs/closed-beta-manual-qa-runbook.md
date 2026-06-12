# Closed Beta Manual QA Runbook v1

## Purpose

This runbook defines the manual QA procedure required before a limited closed beta. It is not a full production launch checklist and does not change runtime product behavior.

The QA target is the learner OS loop:

Capture/OCR/text input -> learner-owned note -> biggest gap -> next action -> Today Plan max 3 -> Review Queue -> Notes.

Inverge must remain a learner operating system. It is not a problem bank, public archive UI, official grading app, model-answer product, score prediction product, or pass/fail judgment product.

## Preconditions

- Latest `main` pulled after the target PR is merged or branched.
- Clean `git status --short` before starting manual QA.
- Environment variables present where needed for the chosen preview or local run.
- No raw Q-Net/local official materials are required.
- no local_official_materials used.
- A test account or invited closed-beta account is ready.
- Browser ready with console visible.
- Dev server or preview deployment URL ready.
- Persistence mode to test is identified before the run:
  - durable account save if available.
  - browser local fallback if the account/durable path is unavailable.
- Use only short synthetic learner-created text. Do not use real user data, real official problem text, copied official answer text, copied OCR full text, or official answer body.

## Required Automated Validation Before Manual QA

Run these commands before manual browser QA:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```

If any command fails, mark the manual QA run `blocked` unless the failure is explicitly documented as unrelated and accepted by the owner.

## QA Scenarios

### A. Text-first Capture happy path

1. Open `/app/capture?mode=second` or the current capture route for the selected mode.
2. Enter short safe synthetic learner text.
3. Confirm OCR/AI output is framed as a draft if OCR/AI copy appears.
4. Save the learner-owned note.
5. Confirm one biggest gap exists.
6. Confirm one next action exists.
7. Confirm note reflection appears or can be reached through Notes, Review, or Today.
8. Confirm no official grading/model-answer/score/pass-fail copy appears.

Status guidance: mark `pass` only when the learner can complete the path without needing official materials or raw copied source text.

### B. Capture-to-Today Plan reflection

1. Start from a saved capture note.
2. Navigate to `/app?mode=second` or the current Today route.
3. Confirm Today Plan receives or can reason about a task from the saved note.
4. Confirm Today Plan max 3 is preserved.
5. Confirm each visible task has source/reason copy.
6. Confirm the page does not show a noisy task dump.

Status guidance: mark `partial` if source reasoning exists in tests but is not visible enough in the current runtime surface.

### C. Today Plan to Review Queue reflection

1. From Today Plan, follow the primary task or related review action.
2. Navigate to `/app/review?mode=second` or the current Review Queue route.
3. Confirm the task can appear as or map to a Review Queue item.
4. Confirm the review reason is learner-facing, calm, and safe.
5. Confirm due state is understandable.

Status guidance: mark `partial` if the mapping is visible only through local beta reflection or durable data is unavailable.

### D. Notes reflection

1. Navigate to `/app/notes?mode=second` or the current Notes route.
2. Confirm the saved learner-owned note appears in Notes/history.
3. Confirm the note does not look like an official source archive.
4. Confirm copy remains learner-owned and action-oriented.

Status guidance: mark `blocked` if Notes cannot be reached or saved learner content cannot be found after a valid save.

### E. Review completion loop

1. Complete one review action if the current UI supports completion.
2. Confirm review status changes or completion copy appears.
3. Confirm the completed item no longer behaves like an unstarted primary item.
4. Confirm no score prediction, pass/fail judgment, or official grading copy appears.

Status guidance: if runtime support is incomplete, mark `partial` and document the evidence still needed. If the current UI does not expose completion, mark `not_applicable` and add the follow-up PR.

### F. Durable persistence path

1. Sign in with a closed-beta account.
2. Save a capture note.
3. Refresh the page.
4. Confirm saved note/reflection remains if durable account save is expected.
5. Confirm copy distinguishes `durable_saved` from browser fallback where visible.
6. Navigate through Today, Review Queue, and Notes to confirm the durable path is stable.

Status guidance: if durable persistence cannot be tested in the current environment, mark `partial`.

### G. Browser local fallback path

1. Simulate unavailable durable/account path if possible, or use local no-server/no-durable mode.
2. Save a learner note locally.
3. Refresh the same browser.
4. Confirm fallback copy is clear.
5. Confirm copy does not overclaim account/durable save.
6. Confirm local beta reflection remains visible in Notes, Review, or Today on the same browser.

Status guidance: mark `pass` only when the browser-local copy is clear and the same-browser refresh survives.

### H. Save failed path

1. If current UI supports error simulation, force or simulate a failed save.
2. Confirm safe recovery copy appears.
3. Confirm the failed save does not appear as a durable Review Queue item.
4. Confirm the learner has a clear retry path.

Status guidance: if no safe simulation exists, mark `not_applicable` and add manual simulation needed as the follow-up evidence.

### I. Boundary safety sweep

Check learner-visible routes:

- `/app/capture`
- `/app`
- `/app/notes`
- `/app/review`
- `/app/items` if applicable

Confirm no:

- public archive UI
- official grading
- official model answer
- score prediction
- pass/fail judgment
- instructor console exposure
- raw Q-Net official material text
- raw PDF/HWP/HWPX/Word/ZIP/image exposure

Status guidance: any confirmed learner-visible boundary leak is `blocked`.

### J. OCR/PDF maturity smoke

1. If OCR/PDF upload exists, use a synthetic non-official file only.
2. Confirm draft framing.
3. Confirm editable output before save.
4. Confirm the path does not auto-grade or auto-save raw OCR.
5. Confirm no raw full text is stored in the committed repo.
6. If PDF/OCR flow is partial or unavailable, mark `partial`.

Status guidance: do not use Q-Net, local official materials, real official problem text, copied answer text, or copied OCR full text for this scenario.

## Evidence Template

| Scenario | Status: pass / partial / blocked / not_applicable | Route | Account mode | Persistence status | Evidence | Screenshot path or notes | Follow-up PR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Text-first Capture happy path |  |  |  | durable_saved / local_fallback_saved / save_failed / not_applicable |  |  |  |
| B. Capture-to-Today Plan reflection |  |  |  | durable_saved / local_fallback_saved / save_failed / not_applicable |  |  |  |
| C. Today Plan to Review Queue reflection |  |  |  | durable_saved / local_fallback_saved / save_failed / not_applicable |  |  |  |
| D. Notes reflection |  |  |  | durable_saved / local_fallback_saved / save_failed / not_applicable |  |  |  |
| E. Review completion loop |  |  |  | durable_saved / local_fallback_saved / save_failed / not_applicable |  |  |  |
| F. Durable persistence path |  |  |  | durable_saved |  |  |  |
| G. Browser local fallback path |  |  |  | local_fallback_saved |  |  |  |
| H. Save failed path |  |  |  | save_failed |  |  |  |
| I. Boundary safety sweep |  |  |  | not_applicable |  |  |  |
| J. OCR/PDF maturity smoke |  |  |  | durable_saved / local_fallback_saved / save_failed / not_applicable |  |  |  |

## Decision Template

### Go / Conditional Go / No-Go

Final decision:

- Go:
- Conditional Go:
- No-Go:

### No-Go Rules

Mark No-Go if any of these occur:

- raw official materials exposed or committed.
- qnet_manifest or local_official_materials committed.
- learner route exposes official grading/model-answer/score/pass-fail.
- Capture -> Note -> Today Plan -> Review Queue -> Notes cannot be demonstrated at all.
- persistence copy overclaims durable save.
- instructor console exposed to learner.

### Conditional Go Rules

Conditional Go is allowed only when:

- the core loop works but OCR/PDF, durable persistence, runtime telemetry, or manual QA evidence is partial.
- boundary safety passes.
- release remains limited to invited users only.

### Go Rules

Go requires:

- core loop pass.
- data boundary pass.
- persistence copy and durable evidence pass.
- UX copy pass.
- telemetry evidence pass.
- manual QA pass.

## Post-QA Report Template

- QA date:
- Tester:
- Build/commit SHA:
- Preview URL:
- Account mode:
- Browser/device:
- Automated validation results:
- Scenario table:
- Final decision:
- Top 3 follow-up PRs:
- Blockers:

Recommended top 3 follow-up PRs if the current scorecard risks remain:

1. OCR/PDF Capture Maturity Hardening v1
2. Durable Persistence Evidence v1
3. Learner Loop Runtime Telemetry Wiring v1

## Safety

This runbook is docs/tests only and preserves the data boundary:

- no local_official_materials
- no qnet_manifest.json
- no raw PDF/HWP/HWPX/Word/ZIP/images
- no raw official problem/answer/OCR/full text
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console exposure
- no raw Q-Net content

It does not add runtime product behavior, AI provider calls, analytics provider calls, payment, public archive UI, or instructor-console exposure to learner UI.

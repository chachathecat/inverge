# Closed Beta Manual QA Evidence Run - 2026-06-12

## Summary

- QA date: 2026-06-12 KST
- Tester: Codex local QA
- Commit SHA: `8176929c8bfbe78d6696aaa27490642eed118b8e`
- Target: latest `main` after PR #377, Learner Loop Runtime Telemetry Wiring v1
- Local URL: `http://127.0.0.1:3000`
- Preview URL: not used for this evidence run
- Browser/device: Playwright Chromium headless on Windows local machine
- Account mode: local auth-disabled demo mode
- Local persistence mode: no-Supabase local fallback
- Screenshots: not committed

This evidence run followed `docs/closed-beta-manual-qa-runbook.md` and used only short synthetic learner-created text. It did not use Q-Net official materials, raw official problem text, copied official answer text, official answer body, OCR full text, or local official material folders.

## Synthetic Learner Text

Text-first Capture used this synthetic learner-created note:

> Today I reviewed a synthetic second-exam compensation-law note about project approval and disposition criteria. I was unsure how to state the disposition criteria. Next I want to rewrite the criteria in one paragraph.

Save-failed simulation used this synthetic learner-created note:

> Today I reviewed a synthetic second-exam law note. I need to restate one issue criterion in a paragraph.

No official problem, answer, OCR, model answer, or Q-Net source text was used.

## Automated Validation

Baseline validation before manual browser QA:

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | passed |
| `npm.cmd run lint` | passed with existing warnings only |
| `npm.cmd run test -- --workers=1` | passed |
| `npm.cmd run check:closed-beta-readiness` | passed |
| `npm.cmd run verify:learner-loop:ci` | passed |
| `npm.cmd run build` | passed with the existing Turbopack NFT-list warning |

Post-report validation on the PR #378 branch:

| Command | Result |
| --- | --- |
| `npm.cmd run typecheck` | passed |
| `npm.cmd run lint` | passed with existing warnings only |
| `npm.cmd run test -- --workers=1` | passed |
| `npm.cmd run check:closed-beta-readiness` | passed |
| `npm.cmd run verify:learner-loop:ci` | passed |
| `npm.cmd run build` | passed with the existing Turbopack NFT-list warning |

## Environment Notes

- The first local attempt with Supabase auth enabled reached the closed-beta invite gate. That was expected and was not bypassed.
- The executed manual QA run used auth-disabled demo mode so no production or remote learner data was modified.
- `/api/os/items` returned `503` in no-Supabase local mode during capture save. This is expected for this local fallback run and is not a No-Go because the UI clearly showed browser-local temporary save copy and did not overclaim durable account persistence.
- No screenshots were committed. All observations below are text evidence from local browser inspection.

## Scenario Evidence

| Scenario | Status | Route tested | Account mode | Persistence status | Evidence summary | Screenshot path or notes | Follow-up PR |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Text-first Capture happy path | pass | `/app/capture?mode=second` | local auth-disabled demo | `local_fallback_saved` | Capture accepted synthetic text, selected second-exam law subject, saved to browser-local fallback, and showed one biggest gap plus one next action. Generated copy: Biggest gap `처분성 판단 기준 혼동`; Next action `처분성 판단 기준을 한 문단으로 다시 써보기`. | not committed | none |
| B. Capture-to-Today Plan reflection | pass | `/app?mode=second` | local auth-disabled demo | `local_fallback_saved` | Today showed a local beta reflection card for the saved note after navigation and after refresh. The page remained stable and did not show a noisy task dump. | not committed | none |
| C. Today Plan to Review Queue reflection | pass | `/app/review?mode=second` | local auth-disabled demo | `local_fallback_saved` | Review showed a browser-local closed beta review candidate for the saved note, including the same law-context weakness and next action. Refresh preserved the card. | not committed | none |
| D. Notes reflection | pass | `/app/notes?mode=second` | local auth-disabled demo | `local_fallback_saved` | Notes showed the browser-local closed beta note, with learner-owned framing, biggest gap, next action, subject, source type, and timestamp. Refresh preserved the card. | not committed | none |
| E. Review completion loop | partial | `/app/review?mode=second` | local auth-disabled demo | `local_fallback_saved` | Local beta reflection reached Review, but this local fallback card did not expose a completion action. Existing automated learner-loop tests cover review completion semantics; runtime completion proof remains partial. | not committed | Add focused Review completion runtime evidence for invited account and local fallback states. |
| F. Durable persistence path | partial | `/app/capture?mode=second`, `/app?mode=second`, `/app/review?mode=second`, `/app/notes?mode=second` | local auth-disabled demo | `durable_saved` not available | Durable account save was not exercised in this local no-Supabase run. The run avoided production data and therefore validated fallback clarity rather than account persistence. | not committed | Add invited beta account durable-save manual QA evidence. |
| G. Browser local fallback path | pass | `/app/capture?mode=second`, `/app/notes?mode=second`, `/app/review?mode=second`, `/app?mode=second` | local auth-disabled demo | `local_fallback_saved` | Save confirmation said the note was temporarily saved in this browser and could continue in Notes, Review, and Today. The same-browser refresh path preserved Notes, Review, Today, and Items reflections. | not committed | none |
| H. Save failed path | pass | `/app/capture?mode=second` | local auth-disabled demo with synthetic localStorage write failure | `save_failed` | Simulated local note storage failure after server persistence was unavailable. UI showed calm recovery copy: save was not completed, input remained on screen, and retry actions were visible. No local beta note was stored. | not committed | none |
| I. Boundary safety sweep | pass | `/app/capture`, `/app`, `/app/notes`, `/app/review`, `/app/items` | local auth-disabled demo | `not_applicable` | Visible learner pages had no official grading/model-answer/score/pass-fail copy, no public archive UI, no instructor-console learner exposure, no payment copy, and no raw Q-Net content. | not committed | none |
| J. OCR/PDF maturity smoke | partial | `/app/capture?mode=second` | local auth-disabled demo | `not_applicable` | Capture showed OCR/PDF entry controls and clear draft/editable framing: OCR result is a draft and must be checked before save. No synthetic file upload was executed because this run intentionally avoided provider calls; docs/tests cover metadata-only OCR/PDF maturity fixtures. | not committed | Add provider-disabled synthetic image/PDF upload smoke evidence. |
| K. Provider-free telemetry evidence check | pass | provider-free helper invocation | local Node helper | `local_fallback_saved` | `createLearnerLoopRuntimeTelemetryCollector` recorded synthetic metadata-only events and returned local beta loop evidence: `hasClosedLoop: true`, `hasDurableClosedLoop: false`, `hasLocalBetaLoopEvidence: true`, `readyReviewQueueEventCount: 1`. | not committed | none |

## Console and Refresh Evidence

- No `Hydration failed` console error was observed.
- No `Text content does not match server-rendered HTML` console error was observed.
- No `localStorage is not defined` or `window is not defined` render error was observed.
- No local-beta reflection `TypeError` or `ReferenceError` was observed.
- No blank page appeared after refresh on Notes, Review, Today, or Items.
- Expected local-only console/network observation: `/api/os/items` returned `503` in no-Supabase mode. The UI fell back to browser-local persistence and labeled that state clearly.

## Final Decision

Final decision: **Conditional Go** for limited invited closed beta.

Reason: the core text-first closed-beta learner loop was demonstrated locally through Capture, save confirmation, Notes reflection, Review reflection, Today reflection, refresh durability, save-failed recovery, boundary safety, and provider-free telemetry evidence. The decision is conditional because durable invited-account runtime persistence and full OCR/PDF upload smoke evidence remain partial.

This is not a full production readiness decision.

## Top 3 Follow-up PRs

1. Durable Account Persistence QA Evidence v1: run the same golden flow with an invited beta account and confirm `durable_saved` survives logout/refresh/account session boundaries.
2. OCR/PDF Synthetic Upload Smoke Evidence v1: use only synthetic non-official files and provider-disabled or explicitly controlled OCR conditions to prove editable draft behavior before save.
3. Review Completion Runtime Evidence v1: demonstrate a visible Review completion action changes state and remains closed-loop safe without score/pass-fail or official grading copy.

## Blockers

- No No-Go blocker was found in the local manual evidence run.
- Remaining gaps are partial-evidence items, not boundary leaks: durable account runtime proof, full OCR/PDF upload smoke proof, and Review completion runtime proof.

## Safety Boundary Confirmation

This PR is documentation/test-evidence only and preserves the closed-beta data boundary:

- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw PDF/HWP/HWPX/Word/ZIP/images
- no raw official problem text, answer text, OCR full text, or official answer body
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no payment
- no analytics provider calls
- no AI provider calls
- provider-free telemetry only

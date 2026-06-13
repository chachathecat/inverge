# Durable Invited Account Persistence Runtime Proof v1

## Purpose

This document records the focused runtime/manual evidence gate for durable invited-account persistence before Inverge expands closed beta beyond the smallest trusted cohort.

The current decision remains **Conditional Go, not full production readiness**. Durable invited-account persistence is still a partial evidence item until an approved invited beta account can complete the durable save path in a non-production or explicitly approved beta environment.

Inverge remains a learner-owned appraiser-exam study operating OS. This proof is not Q-Net ingestion, not a problem bank, not public archive UI, not official grading, not a model-answer product, not score prediction, and not pass/fail judgment.

## Persistence States

| Persistence state | Meaning | Evidence rule |
| --- | --- | --- |
| `durable_saved` | The invited-account path confirms the learner note or review completion was saved through account-backed persistence. | May count as durable closed-loop evidence when reflected into Today Plan, Review Queue, Notes, and provider-free telemetry. |
| `local_fallback_saved` | Account-backed persistence is unavailable, but the browser-local closed-beta fallback saves a temporary learner-owned record. | May count as same-browser local beta evidence only. It must not count as durable closed-loop evidence. |
| `save_failed` | Neither durable persistence nor browser-local fallback completed. | Must not count as closed-loop evidence and must not appear as ready Review Queue evidence. |

## No-overclaiming Persistence Rule

Learner-facing copy must accurately match the persistence state:

- `durable_saved` may say the account-backed save completed.
- `local_fallback_saved` must say the record is browser-local or temporary and must not imply account sync.
- `save_failed` must say save did not complete and should give calm retry guidance.

Never claim durable account save, cross-device availability, permanent storage, or closed-loop completion when only browser-local fallback or failed save evidence exists.

## Manual/Runtime Proof Scenarios

| Scenario | Status | Route | Account mode | Persistence status | Evidence summary | Follow-up needed |
| --- | --- | --- | --- | --- | --- | --- |
| A. Invited account sign-in state identified | blocked | `/login`, `/app` | invited beta account required | `not_applicable` | Not executed in this docs/test PR because no approved invited beta account credentials or non-production durable account target were available. The invite gate remains respected and auth is not bypassed. | Run with an approved invited beta account before expanding the cohort. |
| B. Capture note saved under invited account | blocked | `/app/capture?mode=second` | invited beta account required | `durable_saved` not proven | Durable account-backed capture save was not exercised. No production or remote learner data was modified. | Save a synthetic learner-owned note under an invited beta account and record durable save confirmation. |
| C. Refresh preserves saved note if durable account persistence is available | blocked | `/app/notes?mode=second`, `/app/review?mode=second`, `/app?mode=second` | invited beta account required | `durable_saved` not proven | Cross-refresh durable account persistence remains partial because the durable invited-account save was not run. | Refresh Notes, Review Queue, and Today Plan after durable save in the approved beta environment. |
| D. Today Plan reflects the saved note | blocked | `/app?mode=second` | invited beta account required | `durable_saved` not proven | Today Plan durable reflection remains unproven for invited accounts. Local fallback reflection is already covered as local evidence only. | Confirm the durable saved note can select or explain a Today Plan task. |
| E. Review Queue reflects the saved note | blocked | `/app/review?mode=second` | invited beta account required | `durable_saved` not proven | Review Queue durable reflection remains unproven for invited accounts. Contract evidence says `save_failed` must not enter ready Review Queue evidence. | Confirm a durable saved note appears as a ready Review Queue candidate. |
| F. Notes reflects the saved note | blocked | `/app/notes?mode=second` | invited beta account required | `durable_saved` not proven | Notes durable reflection remains unproven for invited accounts. Local fallback Notes reflection is already covered as same-browser local beta evidence. | Confirm Notes shows the durable account-backed learner note after refresh. |
| G. Browser local fallback copy is clear when durable path is unavailable | pass | `/app/capture?mode=second`, `/app/notes?mode=second`, `/app/review?mode=second`, `/app?mode=second` | local auth-disabled demo | `local_fallback_saved` | PR #378 manual QA and PR #376 fixtures show the browser-local fallback is labeled as temporary browser-local evidence and does not overclaim durable save. | None for smallest cohort; continue to keep local fallback distinct from durable evidence. |
| H. Save failed path does not appear as ready Review Queue evidence | pass | `/app/capture?mode=second`, Review Queue selector contract | local failure simulation and automated contract | `save_failed` | PR #378 save-failed simulation showed calm retry copy and no local beta note stored. PR #376 and Review Queue selector tests exclude `save_failed` from ready evidence. | None. |
| I. Provider-free telemetry distinguishes durable_saved, local_fallback_saved, and save_failed | pass | provider-free telemetry helper | local Node helper | all three states | PR #377 runtime telemetry helper keeps the three persistence states distinct. Durable loops can count only from `durable_saved`; local fallback counts only as local beta evidence; failed saves cannot close a loop. | None for contract evidence; durable invited-account runtime telemetry should be recorded during the approved account run. |

## Runtime Decision

Current runtime decision: **Conditional Go** for the smallest trusted invited cohort only.

Do not expand beyond the initial 3 to 5 trusted users until scenarios A through F pass with an approved invited beta account and synthetic or learner-owned notes. If those scenarios remain blocked, durable invited-account persistence must stay listed as partial in closed-beta decision records.

## Ready Review Queue and Closed-loop Rules

- `durable_saved` can count as durable closed-loop evidence.
- `local_fallback_saved` can count as local beta evidence, not durable closed-loop evidence.
- `save_failed` must not count as closed-loop evidence.
- `save_failed` must not appear as ready Review Queue evidence.
- save_failed must not appear as ready Review Queue evidence.
- Provider-free telemetry must not store raw learner text or forbidden fields.

## Safety Boundaries

This proof preserves the same closed-beta boundary:

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
- no instructor grading behavior changes

Only synthetic or learner-owned study notes may be used for future invited-account runtime proof.

## Follow-up Gate

Required follow-up before wider beta:

1. Run a durable invited-account manual QA session with an approved beta account.
2. Use only synthetic or learner-owned study notes.
3. Confirm `durable_saved` save confirmation appears.
4. Confirm Notes, Review Queue, and Today Plan still reflect the note after refresh.
5. Confirm provider-free telemetry records durable loop evidence without raw learner text.
6. Confirm `save_failed` remains excluded from ready Review Queue evidence.
7. Update this proof or add a dated evidence report with pass results.

## Validation

Required validation commands:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```

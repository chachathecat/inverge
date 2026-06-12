# Learner Loop Production Gap Audit v1

## Scope

- Audit date: 2026-06-12 KST
- Current branch: `codex/learner-loop-production-gap-audit-v1`
- Base: `origin/main` at `6df026b7e9305522d5d18357daf530d4b0ce89e5`
- PR target: #368 Learner Loop Production Gap Audit v1
- Change type: audit, documentation, and lightweight test coverage only

This audit checks whether Inverge's closed-beta learner loop is ready to be treated as the production baseline:

Capture -> learner-owned note -> biggest gap -> next action -> Today Plan max 3 -> Review Queue -> Notes reflection.

Inverge remains an appraiser-exam learning OS. It is not a problem bank, public archive UI, official grading product, model-answer product, score prediction product, pass-fail judgment product, payment-first flow, or instructor-console exposure.

## Audited Sources

Requested docs that exist:

- `docs/inverge-master-roadmap.md`
- `docs/inverge-data-boundary.md`
- `docs/qnet-historical-materials-batch-plan.md`

Requested docs that were not present, with nearest sources used instead:

- `docs/inverge-world-class-bar.md`: nearest current sources were `docs/inverge-product-brief.md`, `docs/inverge-learning-engine-spec.md`, `docs/inverge-design-system.md`, and `docs/inverge-audit-rubric.md`.
- `docs/inverge-golden-user-flows.md`: nearest current sources were `docs/closed-beta-qa-run.md`, `docs/closed-beta-owner-qa-pr-359.md`, `docs/closed-beta-readiness-gate.md`, and `docs/qa/closed-beta-learning-loop-qa-v2.md`.

Audited learner routes and components:

- `app/app/page.tsx`
- `app/app/capture/page.tsx`
- `app/app/notes/page.tsx`
- `app/app/items/page.tsx`
- `app/app/items/[itemId]/page.tsx`
- `app/app/review/page.tsx`
- `components/learner/learner-ui.tsx`
- `components/review-os/capture-form.tsx`
- `components/review-os/local-beta-note-reflection.tsx`
- `components/review-os/review-queue-client.tsx`

Audited learner-loop libraries:

- `lib/review-os/browser-storage.ts`
- `lib/review-os/capture-confirmation-copy.ts`
- `lib/review-os/capture-note-engine.ts`
- `lib/review-os/capture-save-persistence.ts`
- `lib/review-os/data-boundary.ts`
- `lib/review-os/service.ts`
- `lib/review-os/today-plan-engine.ts`
- `lib/review-os/today-plan-learner-route-integration.ts`
- `lib/review-os/today-plan-source-union.ts`
- `lib/review-os/qnet-official-materials-reference.ts`
- `lib/review-os/qnet-reference-today-plan-adapter.ts`

Audited test coverage:

- `tests/closed-beta-golden-flow-routes.test.mjs`
- `tests/closed-beta-learning-loop-guardrails.test.mjs`
- `tests/closed-beta-learning-loop-source-union.test.mjs`
- `tests/closed-beta-learner-loop-smoke.test.mjs`
- `tests/capture-loop-surfacing.test.mjs`
- `tests/capture-to-note-product-polish.test.mjs`
- `tests/capture-to-plan-bridge.test.mjs`
- `tests/today-plan-visible-action-cap.test.mjs`
- `tests/today-plan-source-union.test.mjs`
- `tests/answer-review-boundary.test.mjs`
- `tests/qnet-official-materials-reference.test.mjs`
- `tests/qnet-reference-intelligence-report.test.mjs`

## Loop Status Table

| Area | Status | Evidence notes |
| --- | --- | --- |
| Capture entry | pass | `app/app/capture/page.tsx` and `components/review-os/capture-form.tsx` keep the low-friction capture entry, text-first input, and the primary save CTA. `tests/closed-beta-golden-flow-routes.test.mjs` checks the canonical Capture route and CTA contract. |
| Editable OCR/text | partial | `components/review-os/capture-form.tsx` supports text, photo, PDF selection, editable OCR/text draft, and draft-warning copy. Production maturity remains partial because PDF capture currently records the file name and asks the learner to paste content, and OCR quality is not proven by a production provider smoke in this audit. |
| Learner-owned note | pass | `app/app/items/page.tsx`, `app/app/notes/page.tsx`, and `app/app/items/[itemId]/page.tsx` present saved learner records as notes/history. `lib/review-os/data-boundary.ts` and closed-beta tests keep raw learner artifacts separate from metadata/reference use. |
| Biggest gap | partial | `lib/review-os/capture-confirmation-copy.ts` and `lib/review-os/capture-note-engine.ts` produce one biggest gap candidate, and PR #359 added subject/text-aware fallback behavior. It remains partial for production because copy quality is deterministic fallback plus limited source-level tests, not a broad golden fixture set across first and second exam inputs. |
| Next action | partial | Capture confirmation, Notes, Review, and Today surfaces show one next action candidate. Production gap: not every next action is yet proven to map to an executable, measurable task completion path with telemetry. |
| Today Plan max 3 | pass | `app/app/page.tsx` caps visible Today Plan primary tasks with `visibleTodayPlanTasks = todayPlanTasks.slice(0, 3)` and `data-visible-primary-task-cap="3"`. `tests/today-plan-visible-action-cap.test.mjs` verifies the source and engine cap. |
| Review Queue reflection | partial | Durable queue items and local beta review candidates are both surfaced through `app/app/review/page.tsx`, `components/review-os/review-queue-client.tsx`, and `components/review-os/local-beta-note-reflection.tsx`. It remains partial because local no-Supabase fallback is intentionally browser-local and is not the same as durable server review-queue persistence. |
| Notes reflection | pass | `app/app/notes/page.tsx` delegates to the learner notes/items surface, and `components/review-os/local-beta-note-reflection.tsx` adds closed-beta browser-local records. PR #359 owner QA evidence in `docs/closed-beta-owner-qa-pr-359.md` records Capture -> Save -> Notes -> Review -> Today refresh durability. |
| Boundary safety | pass | `docs/inverge-data-boundary.md`, `docs/qnet-historical-materials-batch-plan.md`, `scripts/check-closed-beta-readiness.mjs`, and Q-Net/reference tests enforce no official grading/model-answer/score/pass-fail copy, no public archive UI, no raw Q-Net materials, no `local_official_materials`, and no `qnet_manifest.json` in committed outputs. Learner-route tests also check instructor route separation. |

## Evidence Notes

- Capture starts from the closed-beta learner app, not from public archive or instructor surfaces: `app/app/capture/page.tsx`, `components/learner/learner-ui.tsx`.
- Capture can accept text, photo, and PDF entry where applicable, with editable OCR/text before save: `components/review-os/capture-form.tsx`.
- OCR/AI output is explicitly framed as draft/candidate copy that the learner confirms: `components/review-os/capture-form.tsx`, `app/app/items/[itemId]/page.tsx`.
- Saved output is framed as learner-owned notes and local beta records, not official grading or model answers: `app/app/items/page.tsx`, `app/app/notes/page.tsx`, `components/review-os/local-beta-note-reflection.tsx`.
- The one-gap/one-action rule is represented in capture confirmation and local beta reflection: `lib/review-os/capture-confirmation-copy.ts`, `lib/review-os/capture-note-engine.ts`, `components/review-os/local-beta-note-reflection.tsx`.
- Today Plan is capped to three visible primary tasks, with overflow moved into a secondary details surface: `app/app/page.tsx`, `tests/today-plan-visible-action-cap.test.mjs`.
- Review Queue has a durable queue path and a local beta reflection path: `app/app/review/page.tsx`, `components/review-os/review-queue-client.tsx`, `components/review-os/local-beta-note-reflection.tsx`.
- Q-Net reference intelligence remains metadata-only and not public learner archive content: `docs/qnet-historical-materials-batch-plan.md`, `reference_corpus/official_materials/appraiser/qnet_appraiser_materials_index.json`, `tests/qnet-official-materials-reference.test.mjs`.

## Prioritized Gaps

1. Capture-to-note quality breadth is not production-grade yet. PR #359 fixed a concrete law-context fallback failure, but the current test set needs broader first/second exam fixtures for law, theory, practice, O/X, calculation, and rewrite inputs.
2. Today Plan source reasoning is visible but not complete enough for production confidence. The UI can show reasons, but it needs stronger traceability from captured note -> selected task -> why this task beat alternatives.
3. Review Queue reflection is functionally present but split between durable queue and browser-local beta fallback. Production readiness needs a clearer durable-path smoke and failure-mode evidence beyond local fallback.
4. Editable OCR/text is usable, but PDF and OCR reliability are not fully production-validated in this audit. PDF still relies on learner-pasted content after file selection.
5. Learner-loop telemetry exists in safe local form, but production loop metrics are not yet sufficient to prove task start, completion, retry/rewrite conversion, and delayed review completion.

## Explicit No-Go Issues

No boundary no-go issue was found in the audited learner loop sources.

The production release should still be blocked until the partial items above are hardened, because production readiness requires durable evidence that a real learner's saved study trace reliably becomes a good note, one biggest gap, one next action, Today Plan max 3, Review Queue behavior, and Notes reflection without relying only on local beta fallback.

## Next PR Recommendations

Recommended next 3 PRs:

1. Capture-to-Note Quality Hardening v1
2. Today Plan Source Reasoning v1
3. Review Queue Reflection Hardening v1

Additional backlog candidates:

- Learner Loop Telemetry v1
- Explanation Ladder Integration v1

### Capture-to-Note Quality Hardening v1

Add a metadata-safe golden fixture set for first and second exam learner-created inputs. Verify subject-aware biggest gap and next action copy across law, theory, practice, calculation, O/X, and rewrite contexts. Keep raw official problem text, answer text, OCR full text, and official answer body out of fixtures.

### Today Plan Source Reasoning v1

Make Today Plan source reasoning consistently visible and testable: captured note source, selected primary task, one biggest gap, one next action, priority reason, and why overflow tasks are secondary. Preserve Today Plan max 3.

### Review Queue Reflection Hardening v1

Add durable server-path smoke coverage for capture-created review queue items while preserving local beta browser fallback behavior. Verify that local fallback copy remains clear when durable persistence is unavailable.

## Release Decision Trail

- Current audit decision: partial production readiness.
- Closed-beta baseline remains accepted for local beta golden flow based on `docs/closed-beta-owner-qa-pr-359.md`.
- Production release should proceed only after the top three hardening PRs produce stronger evidence for quality, Today Plan reasoning, and durable Review Queue reflection.

## Safety Statement

This audit did not read `local_official_materials`. It does not add raw Q-Net materials, raw problem text, raw answer text, OCR full text, official answer body, public archive UI, payment copy, instructor grading changes, official grading/model-answer/score/pass-fail learner copy, or `qnet_manifest.json`.

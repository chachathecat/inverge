# Learner Loop Runtime Telemetry Wiring v1

## Purpose

This note documents the provider-free runtime telemetry wiring for limited closed beta. It lets QA evaluate whether the learner-owned golden loop can be observed with safe metadata-only events:

Capture -> learner-owned note -> biggest gap -> next action -> Today Plan task -> Review Queue item -> Notes reflection.

This wiring is an internal helper and in-memory collector. It does not add an external analytics provider, AI provider, payment flow, public archive UI, or learner-facing instructor console exposure.

## Runtime Shape

The runtime helper builds and records metadata-only learner-loop events through pure functions:

- `buildLearnerLoopTelemetryEvent`
- `createLearnerLoopRuntimeTelemetryCollector`
- `evaluateLearnerLoopTelemetryClosure`
- `selectReadyLearnerLoopTelemetryReviewQueueEvents`

The collector stores events only in memory for the current runtime process. It does not send events over the network, write to a provider SDK, create a database migration, or persist raw learner text.

## Event Names

Required golden-loop events:

- `capture_note_created`
- `biggest_gap_identified`
- `next_action_created`
- `today_plan_task_selected`
- `review_queue_item_created`
- `notes_reflected`

Optional supporting events:

- `capture_submitted`
- `today_plan_generated`
- `review_queue_item_due`
- `review_completed`
- `loop_closed`

## Safe Event Fields

Each event is metadata-only and may include only safe fields such as:

- `eventName`
- `eventId`
- `occurredAt`
- `userScope: anonymous_local | invited_beta_account`
- `examMode`
- `subject`
- `sourceType`
- `persistenceStatus: durable_saved | local_fallback_saved | save_failed | not_applicable`
- `taskType`
- `reasonCode`
- `reviewReasonCode`
- `loopId`
- `safeUse`

Every event must include:

- `metadataOnly: true`
- `learnerOwned: true`
- `safeUse: closed_beta_learner_loop_telemetry`

## Loop Closure Rule

A closed loop requires at least one safe non-`save_failed` event for all required golden-loop events:

- `capture_note_created`
- `biggest_gap_identified`
- `next_action_created`
- `today_plan_task_selected`
- `review_queue_item_created`
- `notes_reflected`

The evaluation is grouped by `loopId` so one partial loop cannot borrow missing stages from another loop.

## Durability Rule

- `durable_saved` can count as durable closed-loop evidence.
- `local_fallback_saved` can count as local beta loop evidence only.
- `local_fallback_saved` must not count as durable closed-loop evidence.
- `save_failed` must not count as closed-loop evidence.
- `save_failed` must not produce ready Review Queue evidence.
- Exact QA rule: `save_failed` must not produce ready Review Queue evidence.
Plain-text QA rule: save_failed must not produce ready Review Queue evidence.

## Forbidden Event Fields

Telemetry input and output must reject raw, official, grading, path, and instructor fields recursively, including:

- `rawText`
- `rawOcrText`
- `rawQuestionText`
- `rawAnswerText`
- `copiedProblemText`
- `copiedAnswerText`
- `officialAnswer`
- `modelAnswer`
- `officialGrade`
- `score`
- `passFail`
- `instructorComment`
- `qnetRawPath`
- `localOfficialMaterialsPath`
- `officialAnswerBody`

## Safety Boundary

- no external analytics provider call
- no AI provider call
- no payment
- no public archive UI
- no instructor-console learner exposure
- no raw Q-Net files
- no raw official text
- no raw learner OCR, answer, or problem text in telemetry
- no Q-Net manifest file dependency
- no local official material folder dependency

This PR wires provider-free runtime helpers only. It does not overclaim account persistence when the current evidence is browser-local fallback.

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

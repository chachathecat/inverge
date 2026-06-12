# Learner Loop Telemetry v1

## Purpose

This contract defines a deterministic, metadata-only telemetry layer for the closed-beta learner loop:

Capture input -> learner-owned note -> biggest gap -> next action -> Today Plan max 3 -> Review Queue -> Notes reflection.

It lets Inverge measure whether the learning loop is closing without adding analytics provider integration, public archive UI, official grading, model answers, score prediction, pass/fail judgment, payment, or instructor-console exposure.

Contract keywords: metadata-only, loop closure definition, Today Plan max 3 telemetry rule, no analytics provider integration.

## Why Telemetry Is Metadata-Only

Learner-loop telemetry should answer operational questions such as whether a learner-created note produced one gap, one action, a selected Today Plan task, a Review Queue item, and a Notes reflection. It does not need raw learner answer text, raw OCR text, raw problem text, official material text, local filenames, or local paths.

Every event must include:

- `metadataOnly: true`
- `learnerOwned: true`
- `safeUse: closed_beta_learner_loop_telemetry`

## Event Name List

Allowed `eventName` values:

- `capture_submitted`
- `capture_note_created`
- `biggest_gap_identified`
- `next_action_created`
- `today_plan_generated`
- `today_plan_task_selected`
- `review_queue_item_created`
- `review_queue_item_due`
- `review_completed`
- `notes_reflected`

## Loop Stage List

Allowed `loopStage` values:

- `capture`
- `note`
- `gap`
- `next_action`
- `today_plan`
- `review_queue`
- `review`
- `notes`

## Source Type List

Allowed `sourceType` values:

- `capture_note`
- `today_plan_task`
- `review_queue`
- `notes`
- `local_beta_signal`
- `synthetic_fixture`

## Persistence Status List

Allowed `persistenceStatus` values:

- `durable_saved`
- `local_fallback_saved`
- `save_failed`
- `not_applicable`

`durable_saved` and `local_fallback_saved` must remain distinct. `save_failed` can be measured as a failure state, but it does not count toward loop closure.

## Task Type List

Allowed `taskType` values:

- `ox`
- `cloze`
- `calculation_template`
- `rewrite`
- `issue_recall`
- `review_note`
- `not_applicable`

## Forbidden Fields

Telemetry input and output must reject these fields recursively:

- `rawText`
- `rawAnswerText`
- `rawProblemText`
- `rawOcrText`
- `ocrFullText`
- `officialAnswer`
- `officialAnswerBody`
- `modelAnswer`
- `score`
- `passFail`
- `officialGrade`
- `instructorComment`
- `localFileName`
- `sourceFileName`
- `localFilePath`
- `sourceFilePath`
- `rawFilePath`
- `qnetRawText`
- `archiveUrl`
- `userAnswerBody`

The contract also rejects unsafe strings that look like raw file paths, filenames, official answer copy, model answer copy, score/pass-fail copy, public archive copy, `local_official_materials`, or `qnet_manifest.json`.

## Loop Closure Definition

The loop closure definition is metadata-only. A loop is considered closed when there is at least one safe, non-`save_failed` event for each of:

- `capture_note_created`
- `biggest_gap_identified`
- `next_action_created`
- `today_plan_task_selected`
- `review_queue_item_created`
- `notes_reflected`

The summary helper returns:

- `captureCount`
- `noteCreatedCount`
- `biggestGapCount`
- `nextActionCount`
- `todayPlanGeneratedCount`
- `todayPlanTaskSelectedCount`
- `reviewQueueItemCreatedCount`
- `reviewCompletedCount`
- `notesReflectedCount`
- `loopClosureCount`
- `hasClosedLoop`

## Today Plan Max 3 Telemetry Rule

Today Plan telemetry must preserve the product rule that the primary Today Plan is capped at three selected tasks. `todayPlanTaskCount` must not exceed `3` for `today_plan_generated` or `today_plan` stage telemetry.

## Safe Examples

Safe examples:

- `capture_note_created` with `hasBiggestGap: true`, `hasNextAction: true`, and `persistenceStatus: durable_saved`
- `today_plan_generated` with `todayPlanTaskCount: 3`
- `review_queue_item_created` with `reviewReasonCode: issue_recall_review`
- `review_completed` with `completed: true`
- `notes_reflected` with `hasReviewReflection: true`
- `review_queue_item_created` with `persistenceStatus: local_fallback_saved`

## Forbidden Examples

Blocked examples:

- telemetry containing a raw answer body
- telemetry containing a local upload filename or path
- telemetry containing official grading result
- telemetry containing model answer comparison
- telemetry containing score prediction
- telemetry containing pass/fail judgment
- telemetry containing public archive UI or problem bank copy
- telemetry containing instructor comment copy
- telemetry sent to Segment, PostHog, GA, Vercel Analytics, or another provider in this PR

These examples are listed only as blocked patterns. They must not appear in learner-facing telemetry output.

## Safety Boundary

Do not add official grading/model-answer/score/pass-fail copy. The shorthand rule is: no official grading/model-answer/score/pass-fail.

Do not add public archive UI, payment flow, raw Q-Net content, raw official problem text, raw official answer text, OCR full text from official materials, official answer body, `local_official_materials`, `qnet_manifest.json`, raw PDFs/HWP/HWPX/Word/ZIP/images, or instructor-console exposure.

Explicit shorthand: no public archive UI, no raw Q-Net content, no local official materials, no instructor-console exposure, no analytics provider integration in this PR.

Learner-loop telemetry may use only learner-owned notes and safe derived learning metadata.

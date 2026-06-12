# Review Queue Reflection Hardening v1

## Purpose

This contract hardens how safe learner-owned signals become Review Queue reflection candidates. It protects the closed-beta learner loop:

Capture input -> learner-owned note -> biggest gap -> next action -> Today Plan max 3 -> Review Queue -> Notes reflection.

This is metadata-only contract work. It does not add an AI provider call, a public archive UI, payment, instructor-console exposure, official grading, model answers, score prediction, or pass/fail judgment.

Contract keywords: source-to-review contract, reviewReasonCode, sourceType, persistenceStatus, dueAt default rule, ready review queue selector.

## Source-To-Review Contract

Each input candidate may come from a capture note, Today Plan task, existing review queue signal, notes surface, local beta signal, or synthetic fixture. Inputs may include safe metadata fields such as:

- `sourceId`
- `sourceType`
- `examMode`
- `subject`
- `biggestGap`
- `nextAction`
- `nextActionTaskType`
- `reasonCode`
- `oneLineReason`
- `actionText`
- `estimatedMinutes`
- `createdAt`
- `dueAt`
- `persistenceStatus`

Each Review Queue reflection output includes:

- `reviewItemId`
- `sourceId`
- `sourceType`
- `examMode`
- `subject`
- `reviewReasonCode`
- `reviewPrompt`
- `actionText`
- `dueAt`
- `estimatedMinutes`
- `persistenceStatus`
- `sourceTrace`
- `learnerOwned: true`
- `metadataOnly: true`
- `safeUse: closed_beta_review_queue_reflection`

`sourceTrace` may include only safe metadata such as `sourceId`, `sourceType`, `biggestGap`, `sourceReasonCode`, `nextActionTaskType`, and `persistenceStatus`. It must not include raw learner answer text, raw OCR text, raw Q-Net content, local file paths, official answer body, or instructor-only fields.

## ReviewReasonCode List

Allowed `reviewReasonCode` values:

- `capture_gap_review`
- `due_review`
- `recent_wrong_review`
- `confidence_gap_review`
- `weak_structure_review`
- `calculation_template_review`
- `rewrite_review`
- `issue_recall_review`
- `local_fallback_review`

## SourceType List

Allowed `sourceType` values:

- `capture_note`
- `today_plan_task`
- `review_queue`
- `notes`
- `local_beta_signal`
- `synthetic_fixture`

## PersistenceStatus Distinction

Allowed `persistenceStatus` values:

- `durable_saved`: account-backed or durable learner save. Review Queue copy may simply say the record is saved and ready to review.
- `local_fallback_saved`: closed-beta browser-local fallback. Copy must not overclaim account durability and should explain that the record continues on this browser.
- `save_failed`: not ready for the durable Review Queue. The helper may create a safe recovery warning, but the ready review queue selector excludes it.

## DueAt Default Rule

If a valid `dueAt` is provided, the helper preserves it as an ISO timestamp. If it is missing:

- `due_review`: today
- `capture_gap_review`: +1 day
- `calculation_template_review`: +1 day
- `confidence_gap_review`: +1 day
- `local_fallback_review`: +1 day
- `recent_wrong_review`: +1 day
- `rewrite_review`: +3 days
- `issue_recall_review`: +3 days
- `weak_structure_review`: +3 days

Tests use deterministic ISO dates.

## Ready Review Queue Selector Rule

The ready review queue selector builds safe reflections, excludes unsupported or unsafe inputs, and excludes every `save_failed` item. Ready items must include learner-owned metadata, `metadataOnly: true`, `safeUse: closed_beta_review_queue_reflection`, a non-empty prompt, a non-empty action, a valid ISO `dueAt`, and a source trace.

## Safe Learner-Facing Copy Examples

Good examples:

- 복습 시점이 된 기록입니다. 오늘 먼저 짧게 회수합니다.
- 최근 저장한 약점 기록을 다시 확인할 차례입니다.
- 계산 조건, 산식, 단위 흐름을 다시 확인합니다.
- 답안 문단을 다시 써서 약점 하나를 줄입니다.
- closed beta 브라우저 임시 기록입니다. 같은 브라우저에서 복습 후보로 이어갑니다.

The copy should be short, calm, and operational. It should point the learner to retry, recall, calculate, rewrite, or review one small unit.

## Forbidden Copy Examples

Blocked examples:

- official grading result
- model answer comparison
- score prediction
- pass/fail judgment
- public archive UI
- problem bank
- instructor comment

These examples are listed only as blocked copy patterns. They must not appear in learner-facing Review Queue reflection.

## Safety Boundary

Do not add official grading/model-answer/score/pass-fail copy. The shorthand rule is: no official grading/model-answer/score/pass-fail.

Do not add public archive UI, payment flow, raw Q-Net content, raw official problem text, raw official answer text, OCR full text from official materials, official answer body, `local_official_materials`, `qnet_manifest.json`, raw PDFs/HWP/HWPX/Word/ZIP/images, or instructor-console exposure.

Explicit shorthand: no public archive UI, no raw Q-Net content, no local official materials, no instructor-console exposure.

Review Queue reflection may use only learner-owned notes and safe derived learning metadata.

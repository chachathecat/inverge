# Today Plan Source Reasoning v1

## Purpose

This source-to-reason contract makes Today Plan selection traceable without turning Inverge into a problem bank, public archive, grading product, model-answer product, score prediction product, or pass/fail judgment product.

The protected learner loop is:

Capture / note / review signal -> biggest gap -> next action -> Today Plan task -> reason label -> one-line learner-facing explanation -> Today Plan max 3.

This is a deterministic reasoning contract. It does not add an AI provider call, public archive UI, payment flow, or instructor-console exposure.

## Source-To-Reason Contract

Each input candidate should be a metadata-safe learner-loop signal with fields such as:

- `sourceId`
- `sourceType`
- `examMode`
- `subject`
- `biggestGap`
- `nextAction`
- `nextActionTaskType`
- `dueAt`
- `isDue`
- `confidence`
- `recentWrong`
- `weakStructurePoint`
- `createdAt`
- `estimatedMinutes`

Each selected Today Plan reasoning output includes:

- `taskId`
- `sourceType`
- `examMode`
- `subject`
- `reasonCode`
- `priorityScore`
- `oneLineReason`
- `actionText`
- `estimatedMinutes`
- `sourceTrace`
- `metadataOnly: true`
- `learnerOwned: true`

`sourceTrace` may include only safe metadata such as `sourceId`, `sourceType`, `biggestGap`, and `nextActionTaskType`. It must not include raw learner answer text, raw OCR text, raw Q-Net text, or local file paths.

## Today Plan Max 3

The selector ranks deterministic source reasoning by priority score and returns at most three tasks. It excludes unsupported source types and unsupported task types. Tie-breaking stays stable by preserving input order after priority and source ranking.

Selected tasks must always include a non-empty reason, action text, source type, reason code, and source trace.

## Reason Codes

Allowed `reasonCode` values:

- `due_review`
- `recent_capture_gap`
- `recent_wrong`
- `confidence_gap`
- `weak_structure`
- `exam_risk`
- `missed_recently`
- `review_queue_due`

## Source Types

Allowed `sourceType` values:

- `capture_note`
- `review_queue`
- `notes`
- `local_beta_signal`
- `synthetic_fixture`

## Task Types

Allowed learner task types align with the Capture-to-Note quality contract:

- `ox`
- `cloze`
- `calculation_template`
- `rewrite`
- `issue_recall`
- `review_note`

First-exam Today Plan reasoning should stay in O/X, cloze, calculation-template, or review-note tasks unless a future product contract explicitly maps another safe action. Second-exam reasoning may use calculation-template, rewrite, issue-recall, or review-note tasks.

## Safe Learner-Facing Copy Examples

Good examples:

- 최근 캡처에서 가장 큰 약점으로 남은 부분입니다.
- 복습 기한이 가까운 기록이라 오늘 먼저 확인합니다.
- 정답 신호보다 확신이 낮아 먼저 고정할 항목입니다.
- 2차 답안 구조에서 반복적으로 약한 부분입니다.

Reason copy should be short, calm, and operational. It should explain why this task is useful today, not judge the learner.

## Forbidden Copy Examples

Blocked examples:

- 공식 채점 결과입니다.
- 합격 가능성을 예측했습니다.
- 모범답안과 비교한 점수입니다.
- 불합격 판정 위험입니다.

These examples are listed only as blocked copy patterns. They must not appear in learner-facing Today Plan reasoning.

## Safety Boundary

Do not add official grading/model-answer/score/pass-fail copy. The shorthand rule is: no official grading/model-answer/score/pass-fail.

Do not add public archive UI, payment flow, raw Q-Net content, raw official problem text, raw official answer text, OCR full text from official materials, official answer body, `local_official_materials`, `qnet_manifest.json`, raw PDFs/HWP/HWPX/Word/ZIP/images, or instructor-console exposure.

Explicit shorthand: no public archive UI, no raw Q-Net content, no local official materials, no instructor-console exposure.

Today Plan source reasoning may use only learner-owned notes and safe derived learning metadata.

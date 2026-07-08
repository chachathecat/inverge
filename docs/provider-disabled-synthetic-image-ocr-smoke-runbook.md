# Provider-Disabled Synthetic Image OCR Smoke Runbook v1

## Purpose

This runbook defines a safe provider-disabled synthetic image OCR smoke test for the closed beta learner capture path.

Purpose:

- Close the #381 image OCR runtime partial safely.
- Prove image capture UX can be tested without OCR provider calls.
- Preserve learner-owned, draft, editable-before-save behavior.
- Preserve Conditional Go if provider-disabled execution cannot be verified.

This is a docs/tests runbook. It must not add OCR provider integrations, AI provider calls, analytics provider calls, runtime behavior changes, raw uploads, screenshots, OCR full text, raw learner content, or official material.

## Allowed Test Input

Allowed input is limited to a synthetic learner-created image selected locally for smoke testing.

Rules:

- Use synthetic learner-created image only.
- Use no Q-Net material.
- Use no official material.
- Use no copied problem text.
- Use no copied answer text.
- Do not commit the image to the repo.
- Do not commit OCR full text to the repo.
- Evidence must be metadata-only.
- Reports may include route names, source type, provider mode, provider request count, persistence status, and short summaries.

The synthetic image should contain only short learner-created study-note style content. Do not use raw learner OCR, answer, or problem text as committed evidence.

## Provider-disabled Requirement

The smoke test must run in one of these modes:

- provider mode: disabled
- provider mode: mock
- provider mode: manual-no-submit

Required provider conditions:

- Expected OCR provider request count: 0.
- `/api/inverge/ocr` or equivalent provider endpoint must not be called.
- No external OCR provider request may be sent.
- No AI provider call may be sent.
- No analytics provider call may be sent.

If the current app cannot disable provider calls safely, mark proof as partial and create a follow-up implementation PR. Do not run the smoke test by sending a provider request.

## Draft And Editability Requirements

The learner-facing UX must preserve this framing:

- OCR result is a draft.
- The learner must confirm or edit before save.
- Output text area is editable before save.
- The learner can replace the draft manually when OCR is disabled.
- Saving must create a learner-owned note from edited draft or manual replacement text.

Expected learner copy or equivalent:

- `OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.`
- `공식 채점이나 모범답안이 아니라, 내 공부 기록을 정리하는 기능입니다.`

The smoke proof must not behave like official grading, model-answer generation, score prediction, or pass/fail judgment.

## Manual Smoke Scenarios

| ID | Scenario | Expected evidence |
| --- | --- | --- |
| A | Image upload/camera control is reachable. | Capture route exposes image source control without requiring provider submission. |
| B | Synthetic learner-created image can be selected locally without committing the file. | Evidence records source type `image` and confirms no file artifact is committed. |
| C | Provider-disabled mode is confirmed before execution. | Provider mode is `disabled`, `mock`, or `manual-no-submit`. |
| D | OCR provider request count remains 0. | Provider request count is exactly `0`. |
| E | Draft framing is visible. | Copy states OCR output is a draft and must be checked before save. |
| F | Output text area is editable before save. | Learner can edit or replace the draft before save. |
| G | Learner can replace draft with synthetic text manually if OCR is disabled. | Manual replacement path works without provider calls. |
| H | Save path can create learner-owned note from edited draft or manual replacement. | Saved record remains learner-owned and metadata-safe. |
| I | one biggestGap exists or is required by contract. | Capture-to-note contract yields or requires exactly one biggest gap. |
| J | one nextAction exists or is required by contract. | Capture-to-note contract yields or requires exactly one next action. |
| K | Today Plan / Review Queue linkage semantics remain safe. | Today and Review linkage use metadata-only learner signals. |
| L | No official grading/model-answer/score/pass-fail copy appears. | Boundary copy remains learner-owned and action-oriented. |
| M | No raw official material, local official path, or OCR full text is exposed or committed. | Evidence stays metadata-only. |
| N | Provider-free telemetry can record metadata-only capture event. | Event contains safe metadata only and no provider call. |
| O | If provider-disabled execution is unavailable, mark partial honestly and preserve Conditional Go. | Report records partial or blocked status plus follow-up PR. |

## Evidence Table Fields

Use this table for each smoke run:

- scenario
- status: pass / partial / blocked / not_applicable
- route
- source type: image
- provider mode: disabled / mock / manual-no-submit / unavailable
- provider request count
- persistence status: `durable_saved` / `local_fallback_saved` / `save_failed` / `not_applicable`
- evidence summary
- follow-up needed

Evidence summaries must be metadata-only. Do not paste raw synthetic image content, OCR full text, raw learner OCR text, answer text, problem text, official text, screenshots, uploads, or local paths.

## Stop Rules

Stop or mark blocked if:

- OCR provider call occurs unexpectedly.
- Raw image or OCR full text is committed.
- Q-Net/local official material is used.
- official grading/model-answer/score/pass-fail appears.
- image output is not editable before save.
- provider-disabled mode cannot be verified.
- `/api/inverge/ocr` or equivalent provider endpoint is called during the disabled smoke.

If a stop rule occurs, preserve Conditional Go and document a follow-up PR before any wider beta expansion.

## Follow-up Implementation Criteria

If provider-disabled smoke cannot run, document a follow-up PR that:

- adds a safe test-double or mock OCR mode
- ensures provider request count remains zero
- prevents raw test uploads from being committed
- keeps learner-facing draft/editable copy intact
- keeps capture-to-note output learner-owned and metadata-only
- verifies one biggestGap and one nextAction are produced or required by contract
- keeps Today Plan and Review Queue linkage semantics safe

The follow-up must not introduce provider integrations, raw upload storage, public archive UI, payment, instructor-console learner exposure, official grading, model answers, score prediction, or pass/fail judgment.

## Safety Boundaries

Every provider-disabled synthetic image OCR smoke run must preserve:

- no OCR provider calls
- no AI provider calls
- no analytics provider calls
- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw official text
- no OCR full text
- no uploaded images committed
- no screenshots committed
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no payment
- no raw learner text in reports
- no raw learner OCR/answer/problem text in reports
- no instructor grading behavior changes

## Validation

Before opening or updating the PR, run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```

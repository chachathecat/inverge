# OCR/PDF Capture Maturity Hardening v1

## Purpose

This checklist hardens the closed-beta OCR/PDF capture path for learner-owned study records. It reduces the OCR/PDF maturity risk from the production readiness scorecard by documenting and testing that capture output stays draft, editable before save, metadata-safe in fixtures, and connected to Capture-to-Note quality without official grading or raw official content.

This is not a Q-Net ingestion PR. It does not add an AI provider call, analytics provider call, payment flow, public archive UI, instructor-console learner exposure, official grading, model-answer copy, score prediction, or pass/fail judgment.

## Protected Loop

OCR/PDF/text capture -> editable draft -> learner-owned note -> biggest gap -> next action -> Today Plan max 3 -> Review Queue -> Notes reflection.

## Maturity Checklist

| Area | Required behavior | Evidence |
| --- | --- | --- |
| Draft framing | OCR/PDF output must be described as a learning-support draft. | Capture route and form include: `OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.` |
| Editable before save | OCR/PDF text must be editable before the learner saves. | Capture form binds `value={form.rawQuestionText}` and `update("rawQuestionText", value)` to the editable textarea. |
| Learner-owned note | Saved output must represent the learner's study record, not official source content. | Synthetic fixtures validate through the Capture-to-Note quality contract. |
| One biggest gap | Each fixture must contain exactly one `biggestGap`. | Fixture contract test rejects empty or multi-line candidates. |
| One next action | Each fixture must contain exactly one `nextAction`. | Fixture contract test rejects empty or multi-line candidates. |
| Source type coverage | Fixtures must cover image, pdf, and text capture inputs. | Five safe synthetic fixtures cover first/second exam image, pdf, and text paths. |
| Metadata safety | Fixtures must be `metadataOnly: true` and `learnerOwned: true`. | Fixture contract test verifies both flags. |
| Forbidden fields | Raw official and grading fields must be absent. | Fixture and doc tests reject forbidden keys and unsafe strings. |
| Today Plan semantics | Capture output must preserve Today Plan max 3 semantics. | This PR does not change Today Plan selection logic. Existing tests keep max 3 coverage. |
| Review Queue semantics | Capture output must preserve Review Queue linkage semantics. | This PR does not change Review Queue selection logic. Existing tests keep reflection coverage. |

## Safe Synthetic Fixture Set

Fixtures live under `tests/fixtures/learner-loop/ocr-pdf-capture-maturity/`.

They are synthetic learner-created summaries only. They do not contain real user data, Q-Net source text, copied problem text, copied answer text, OCR full text, official answer body, or raw file paths.

Required fixture fields:

- `fixtureId`
- `examMode`
- `subject`
- `sourceType: image | pdf | text`
- `syntheticInputSummary`
- `ocrDraftStatus: draft`
- `editableBeforeSave: true`
- `learnerOwned: true`
- `metadataOnly: true`
- `biggestGap`
- `nextAction`
- `expectedTaskType`
- `forbiddenFieldsAbsent: true`
- `safeUse: closed_beta_ocr_pdf_capture_maturity`

Required fixture coverage:

- first exam O/X style learner note
- first exam accounting calculation learner note
- second exam practice calculation learner note
- second exam theory outline learner note
- second exam law issue recall learner note

## Runtime Evidence

The current capture path already includes the required learner-facing framing:

- `OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.`
- `사진/PDF 인식이 불안정하면 텍스트로 붙여넣어도 됩니다.`
- `현재 PDF는 파일명만 기록됩니다. 내용은 직접 붙여넣어 주세요.`
- `OCR 결과 확인 (편집 가능 · 자동 저장)`

The editable draft is controlled by `form.rawQuestionText`, and edits are saved through `update("rawQuestionText", value)`. This PR verifies those hooks through tests and does not change runtime product behavior.

## Acceptance Criteria

- OCR/PDF output is treated as draft.
- OCR/PDF text is editable before save.
- Learner-owned note candidates can be created from safe OCR/PDF/text draft summaries.
- Every fixture has exactly one biggest gap and exactly one next action.
- Every fixture remains `metadataOnly: true` and `learnerOwned: true`.
- Unsafe official/raw fields are rejected or absent.
- No local official paths or Q-Net raw materials are referenced.
- No official grading/model-answer/score/pass-fail copy is introduced.
- Today Plan max 3 and Review Queue linkage semantics are preserved.

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

## Safety Boundary

- no local_official_materials
- no qnet_manifest.json
- no raw PDF/HWP/HWPX/Word/ZIP/images
- no raw official problem/answer/OCR/full text
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console exposure
- no raw Q-Net content

Only synthetic learner-created fixture summaries are allowed. Do not use Q-Net files, local official materials, raw official question text, copied answer text, copied OCR full text, official answer body, real learner data, or raw local file paths.

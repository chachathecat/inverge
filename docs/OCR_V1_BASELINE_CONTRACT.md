# OCR v1 Baseline Contract

Status: frozen for Milestone 5 closed-alpha validation.

## Product boundary

OCR v1 is an input pipeline assist for 감정평가사 1차 and 감정평가사 2차 only. It is not a full OCR product, not an AI grader, and not an authoritative correctness engine. The user remains the final confirmer before saving.

## Supported inputs

| Input | Contract |
| --- | --- |
| Text paste | Deterministically normalized into an extraction draft. |
| Image upload | Transcribed only through the configured image OCR path. If OCR is unavailable or weak, the result must stay review-needed. |
| PDF upload | Boundary input for now. The API must not imply PDF OCR support until a real PDF extractor is implemented. |

## Stable API response shape

`POST /api/inverge/ocr` returns:

- `ok`: boolean.
- `text`: raw text used for normalization when successful.
- `mode`: `first` or `second`.
- `raw_ocr_text`: raw OCR/transcription text or pasted text.
- `raw_extraction_json`: structured AI output when explicitly enabled; otherwise `{}`.
- `normalized_draft`: one of the mode-specific draft shapes below.

## 1차 normalized draft

Required keys:

- `subject_guess`: one of `민법`, `경제학원론`, `부동산학원론`, `감정평가관계법규`, `회계학`, or `unknown`.
- `problem_title`
- `source_label`
- `question_summary`
- `correct_answer`
- `user_answer`
- `wrong_reason_candidate`
- `key_concepts`
- `core_formula`
- `comparison_point`
- `review_date_suggestion`
- `needs_review`

Conservative rule: `needs_review` is `true` when subject, correct answer, user answer, or wrong reason is missing or weak.

## 2차 normalized draft

Required keys:

- `subject_guess`: one of `감정평가실무`, `감정평가이론`, `감정평가 및 보상법규`, or `unknown`.
- `case_title`
- `case_summary`
- `reference_outline`
- `user_answer_summary`
- `missing_issue`
- `weak_sentence`
- `weak_structure_point`
- `rewrite_instruction`
- `review_date_suggestion`
- `needs_review`

Conservative rule: `needs_review` is `true` when subject, user answer summary, missing issue, reference outline, or structure judgment is missing or weak.

## Unknown and review rules

- Use `unknown` for values that are not visible or weakly supported.
- Do not infer exam scope outside 감정평가사 1차 or 감정평가사 2차.
- Do not fabricate OCR text, PDF text, answers, scores, or grading judgments.
- A useful draft can still have `needs_review: true`; this is expected when the user must confirm extracted values.

## Eval scoring fields

Each real-sample fixture scores:

- `subject_guess_accuracy`: whether the mode-specific subject guess is correct or conservatively `unknown`.
- `needs_review_appropriateness`: whether review is required in the right cases.
- `first_note_usefulness`: 1차 draft usefulness for creating an 오답노트.
- `second_correction_usefulness`: 2차 draft usefulness for creating a 교정노트.

Scores are evidence fields for alpha readiness. They do not change the user-facing save path.

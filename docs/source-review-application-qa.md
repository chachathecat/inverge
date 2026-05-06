# Source Review Application QA

## Purpose

Review records can safely produce **reviewed copies** from source text pilot candidates without mutating the original `needs_review` candidates.

## Non-purpose

This QA coverage does **not** include:

- OCR implementation
- Upload implementation
- Learner-facing source viewer
- Archive UI
- Official answer/scoring/pass-fail judgment

## Manual checklist

- [ ] Extraction candidate starts with `needs_review`.
- [ ] Structured candidate starts with `needs_review`.
- [ ] Approve review record exists for each candidate type.
- [ ] Apply helper returns a reviewed copy (`reviewed`).
- [ ] Original extraction candidate remains `needs_review` after apply.
- [ ] Original structured candidate remains `needs_review` after apply.
- [ ] `request_changes` / `reject` decisions do not mark reviewed.
- [ ] Mismatched `candidate_id` does not mark reviewed.
- [ ] Mismatched `source_document_id` does not mark reviewed.
- [ ] No OCR/upload/archive UI or routes are introduced.

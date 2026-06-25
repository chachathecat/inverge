# Product Decision — 감정평가사 2차 전과목 완성형 범위

- Date: 2026-06-25
- Decision owner: repository owner
- Issue: #431
- Implementation PR: #432
- Status: accepted product direction; effective after merge

## Decision

Inverge learner scope is fixed to all three 감정평가사 2차 subjects: 감정평가실무, 감정평가이론, and 감정평가 및 보상법규.

All three subject engines, historical-question coverage, generated reference-answer quality gates, grading/feedback, rewrite/regrade, automatic error notes, core-concept tracking, billing/privacy/cost controls, and integrated runtime acceptance must pass before public paid launch.

감정평가사 1차 runtime code is retained but frozen from new learner-facing and commercial work.

The detailed implementation source of truth is `docs/inverge-second-round-final-product-spec.md`.

## Commercial decision

- Free: one lifetime full review
- Core and Intensive: paid learner plans
- No human expert-review consumer product
- Separate academy answer-operations console

## Reference-answer decision

Where official answers do not exist, the product may provide an `Inverge 검증형 기준답안` only after the documented multi-candidate, source, subject-validator, critic, consensus, and release gates. It must never be framed as an official model answer.

# 답안길 2차 합격관제 OS Premium Alignment

- 문서 상태: S200R product constitution companion
- 적용 범위: learner-facing product strategy, catalog taxonomy, roadmap source of truth, future factory prompts
- 내부 codename: `Inverge`
- Learner-facing brand: **답안길**
- Premium product: **답안길 2차 합격관제 OS**
- Linked roadmap item: `S200R`
- Source provenance: GitHub issue #437, S201 official syllabus registry, S202 source/rights registry, `docs/inverge-second-round-final-product-spec.md`

This document is policy and source-of-truth alignment only. It does not implement runtime features, billing, OCR, question ingestion, learner UI, or academy routes.

## Product Decision

답안길 is a 감정평가사 2차-only premium answer operating system for:

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

Preferred learner-facing positioning:

> 감평 2차 실무·이론·법규 답안을 시험일까지 운영해주는 합격관제 OS

The term `합격관제` means study-operation support through evidence, rewrite, recalculation, review queue, weakness map, and Today Plan. It must never be used as a pass guarantee.

## What 답안길 Is

답안길 is:

- a premium second-exam answer operating system;
- an Evidence Review and rewrite/recalculation system;
- a GIII practical-routine system;
- a theory paragraph-production system;
- a law issue/application-production system;
- a learning-record, weakness-map, Review Queue, and Today Plan system.

답안길 is not:

- an official grader;
- an official model-answer provider;
- a pass-probability product;
- a guaranteed-score product;
- a human expert-review B2C service;
- a public historical-question archive.

## Learner Value Order

Every learner-facing review or note should prioritize:

1. one biggest gap;
2. one next action;
3. Evidence Review / 답안 검토 리포트;
4. rewrite or recalculation task;
5. automatic error note;
6. core concept tracking;
7. weekly weakness report for paid tiers;
8. GIII practical routine when relevant;
9. Deep Review Unit for paid high-cost second-exam review;
10. Today Plan max three.

Score-like ranges are secondary. They may appear only as evidence-backed, non-official practice estimates with confidence and must point to the issue gap and next action.

## Evidence Review Language

Preferred learner-facing terms:

- Evidence Review
- 답안 검토 리포트
- 합격관제 리포트
- 가장 큰 간극 1개
- 다음 행동 1개
- 재작성
- 다시 계산
- GIII 실무 루틴

Avoid learner-facing terms that imply official authority:

- 공식 채점
- 공식 모범답안
- 확정 점수
- 합격 가능성 / 합격 확률
- 합격 보장
- AI 최종 판정
- 정답 보장
- 전문가 첨삭, unless clearly academy/instructor-approved and not a B2C human service

## Final Target Catalog

The final target learner plan taxonomy is:

| Catalog ID | Pricing hypothesis | Status | Notes |
|---|---:|---|---|
| `free` | 0 KRW | active target | One lifetime full-value review experience. |
| `second_os_basic` | 59,000~69,000 KRW/month | active target | Primary operating loop, review queue, rewrite/recalculation, and GIII routine where relevant. |
| `second_os_pro` | 119,000~149,000 KRW/month | active target | Higher review capacity, weekly weakness report, deeper evidence review, and version comparison. |
| `second_control_premium` | 249,000~299,000 KRW/month | active target | High-cost premium control layer with Deep Review Unit access and stronger operations reporting. |

One-off SKUs:

| SKU | Pricing hypothesis | Definition |
|---|---:|---|
| `deep_review_5` | 49,000 KRW | Five Deep Review Units. |
| `deep_review_15` | 129,000 KRW | Fifteen Deep Review Units. |
| `deep_review_40` | 299,000 KRW | Forty Deep Review Units. |

Optional or later-only SKUs:

| SKU | Pricing hypothesis | Status |
|---|---:|---|
| `managed_cohort` | 690,000~990,000 KRW / 8 weeks | later-only disabled until real operators/reviewers and capacity limits exist. |
| `season_pass` | not priced | later-only disabled. |

Legacy labels `Core` and `Intensive` are not the final target taxonomy. They may appear only in migration or historical compatibility notes until runtime catalog work replaces old literals.

Rules:

- Prices remain configurable and versioned.
- Do not hard-code scattered UI/API price literals.
- Founding/beta prices may be lower but must not replace the final target taxonomy.
- Managed cohort remains disabled until real operational capacity exists.
- No unlimited second-exam precision review.
- No B2C human expert-review product.

## Deep Review Unit

Deep Review Unit policy is defined in `docs/dabangil-deep-review-unit-policy.md`.

Summary:

- 1 unit = one 25~50 point sub-question or up to 5 answer pages.
- 2 units = one 100-minute full answer.
- Units must be consumed only through a future usage ledger.
- Failed generation must not consume units.
- Expensive provider work should reserve first and commit only after a usable result in a later implementation PR.

This PR documents policy only and does not implement ledger behavior.

## GIII Practical Routine

The practical calculator model is fixed as `casio_fx_9860giii`.

Routine policy is defined in `docs/dabangil-giii-practical-routine.md`.

Required principle:

> 시험장 리셋 후에도 손으로 재현 가능한 fx-9860GIII 타건 루틴만 훈련한다.

Do not teach calculator program storage as an exam strategy.

## Academy Boundary

The academy console remains separate B2B scope.

- It may provide AI grading/feedback drafts for instructor approval.
- Learner UI must not expose academy routes or tools.
- 답안길 must not sell human expert review as a B2C product.
- If an academy publishes a final grade to a learner, academy approval is required.

## Source And Data Boundary

Preserve S201/S202 metadata-only boundaries:

- official facts and rules stay metadata/versioned/source-backed;
- source and rights registry stays metadata-only;
- rights, extraction, problem-text verification, and reference-answer verification remain separate states.

Forbidden in this constitution alignment:

- raw learner answer/OCR/problem text;
- raw official question body or official answer body;
- raw official PDF/HWP/image bytes;
- third-party academy problems, answers, textbooks, or feedback;
- secrets, provider payloads, cookies, or account IDs.

## Rollout

S200R should merge before S203, S204, S205, S210, and S219 implementation work starts. Future factory issues must read this document, the final product spec, and `roadmap/active-program.yml` before implementation.

Rollback is a focused revert of the S200R PR. No DB/API/provider/billing/runtime rollback should be required.

## Remaining Risks

- Final price hypotheses require paid-beta evidence.
- `합격관제` must continue to mean study-operation support, not pass guarantee.
- Score-like summaries must stay secondary to evidence, issue gaps, and next actions.
- CASIO fx-9860GIII routines need later validation against actual calculator behavior and current exam rules.

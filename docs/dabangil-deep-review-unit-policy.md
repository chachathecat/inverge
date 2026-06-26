# 답안길 Deep Review Unit Policy

- 문서 상태: S200R catalog policy
- 적용 범위: future product catalog, entitlement, usage-ledger, provider-cost guardrails
- Source provenance: GitHub issue #437, `docs/dabangil-second-exam-premium-os.md`, `docs/inverge-business-model.md`

This document is policy only. It does not implement billing, checkout, subscriptions, credit grants, debit logic, provider reservation, or usage ledger behavior.

## Unit Definition

Deep Review Unit sizing:

```text
1 unit = one 25~50 point sub-question or up to 5 answer pages
2 units = one 100-minute full answer
```

Deep Review is for high-cost second-exam review where the learner deliberately requests deeper Evidence Review, rewrite guidance, recalculation support, or premium control reporting. It is not an official grade, official model answer, pass-probability result, or B2C human expert review.

## SKU Policy

One-off SKU hypotheses:

| SKU | Pricing hypothesis | Included units |
|---|---:|---:|
| `deep_review_5` | 49,000 KRW | 5 |
| `deep_review_15` | 129,000 KRW | 15 |
| `deep_review_40` | 299,000 KRW | 40 |

The SKU IDs are source-of-truth catalog identifiers for later S219/S220 implementation. They must remain configurable and versioned. Do not hard-code scattered UI/API price literals.

## Ledger Rules For Later Implementation

Later runtime work must follow these rules:

- Units must be consumed only through a future usage ledger.
- Failed generation must not consume units.
- Expensive provider work should reserve first and commit only after a usable result.
- Duplicate submission, retry, storage failure, timeout, or provider failure must not double-consume units.
- Ledger entries must be server-side and idempotent.
- Learners must be able to see remaining units and the reason for consumption before paid launch.

## Boundary Rules

Deep Review Unit accounting must stay separate from:

- raw learner answers and raw OCR text;
- raw official question or answer bodies;
- official-source and rights registries;
- academy tenant usage pools;
- provider payload logs.

No unlimited second-exam precision review is allowed. Managed cohort and season pass remain later-only disabled catalog ideas until explicit future approval and operational capacity exist.

## Remaining Risks

- Price hypotheses need paid-beta evidence.
- Provider cost must be measured against real second-exam answer length and subject complexity.
- Usage-ledger implementation must be tested for idempotency before any paid launch.

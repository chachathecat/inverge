# Durable Persistence Evidence v1

## Purpose

This evidence note reduces the closed-beta durable persistence risk before limited beta. It documents and tests how the learner loop distinguishes a confirmed durable save, a browser-local fallback save, and a failed save without changing runtime behavior.

Inverge remains a learner-owned study operating OS. This PR is not Q-Net ingestion, not a public archive, not official grading, not a model-answer product, not score prediction, and not pass/fail judgment.

## Evidence States

| State | Meaning | Closed-loop evidence rule |
| --- | --- | --- |
| `durable_saved` | The learner record or review completion was saved through the account-backed path. | May count as durable closed-loop evidence when reflected into Today Plan, Review Queue, Notes, or completion history. |
| `local_fallback_saved` | The account-backed path was unavailable, but the closed-beta browser-local fallback retained a temporary learner record. | May count as local same-browser evidence only. It must not count as durable closed-loop evidence. |
| `save_failed` | Neither durable save nor browser-local fallback completed. | Must not count as durable closed-loop evidence and must not appear in the ready Review Queue selector. |

## Evidence Fixtures

Synthetic fixtures live under `tests/fixtures/learner-loop/durable-persistence/`.

The fixture set covers:

- `durable_saved` capture note reflected into Today Plan, Review Queue, and Notes.
- `local_fallback_saved` capture note reflected only as browser-local beta evidence.
- `save_failed` capture note excluded from ready Review Queue selection.
- `durable_saved` review completion reflected as a closed loop.
- `save_failed` retry path with calm recovery copy.

Each fixture must include:

- `fixtureId`
- `scenario`
- `persistenceStatus`
- `learnerOwned: true`
- `metadataOnly: true`
- `shouldAppearInReadyQueue`
- `shouldCountAsDurableClosedLoop`
- `learnerFacingCopy`
- `expectedRecoveryAction`
- `forbiddenFieldsAbsent: true`
- `safeUse: closed_beta_durable_persistence_evidence`

## State Rules

- Durable saved evidence may count as a durable closed loop.
- Browser-local fallback evidence may appear in closed-beta local reflection surfaces, but it does not prove durable account persistence.
- Save failed evidence is recovery-only evidence.
- Save failed evidence must be excluded from durable closed-loop metrics.
- Save failed evidence must be excluded from ready Review Queue selection.
- Learner-facing persistence copy must not overclaim account sync, cross-device availability, permanent storage, or a completed durable save when only local fallback or failure occurred.
- Recovery copy must remain calm and action-oriented.

## Current Runtime Alignment

The current learner capture flow already models the persistence statuses as `durable_saved`, `local_fallback_saved`, and `save_failed`. The Review Queue reflection contract already excludes failed saves from ready selection. This PR adds documentation and synthetic fixture tests to preserve that distinction as closed-beta evidence.

This evidence does not claim that every local environment can prove account-backed durability. If the environment only supports browser-local fallback, mark durable account evidence as partial in manual QA and avoid claiming durable account persistence.

## Acceptance Criteria

- Durable persistence risk is documented and test-covered.
- The learner loop distinguishes `durable_saved`, `local_fallback_saved`, and `save_failed`.
- `local_fallback_saved` remains browser-local closed-beta evidence only.
- `save_failed` is excluded from durable closed-loop evidence and ready Review Queue evidence.
- No raw official content or local official material dependency is introduced.
- No official grading/model-answer/score/pass-fail copy is introduced.
- No payment, public archive UI, analytics provider call, AI provider call, or learner-exposed instructor console is introduced.

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

- no raw Q-Net files
- no raw official problem text
- no raw official answer text
- no OCR full text
- no official answer body
- no copied problem text
- no copied answer text
- no official grading/model-answer/score/pass-fail
- no payment
- no public archive UI
- no analytics provider calls
- no AI provider calls
- no instructor-console learner exposure

Use only synthetic learner-created metadata in this evidence layer.

# Closed Beta Production Readiness Scorecard v1

## Executive Summary

Current readiness score: **78 / 100**

Decision: **Conditional Go** for a limited closed beta. This is not a full production launch decision.

Reason: The core learner loop and data-boundary guardrails are in place, but OCR/PDF maturity, durable persistence evidence, runtime telemetry wiring, and final manual QA remain partial.

Top 3 blockers or risks:

1. OCR/PDF capture maturity remains partial. The closed-beta path is strongest for text-first capture and learner-edited OCR drafts, while PDF/provider-quality evidence still needs hardening.
2. Durable persistence evidence remains partial. The UI distinguishes `durable_saved`, `local_fallback_saved`, and `save_failed`, but account-level durable-save proof still needs focused QA.
3. Learner-loop telemetry is contract-only. The metadata-safe event contract exists, but runtime telemetry wiring and evidence are intentionally not yet provider-integrated.

Top 3 next PRs:

1. Closed Beta Manual QA Runbook v1
2. OCR/PDF Capture Maturity Hardening v1
3. Durable Persistence Evidence v1

Additional recommended PRs:

- Learner Loop Runtime Telemetry Wiring v1
- Today Plan UI Copy Polish v1

## Score Categories

### A. Core learner loop readiness - 22 / 30

Status: **partial**

| Item | Status | Evidence |
| --- | --- | --- |
| Capture entry | pass | Learner capture starts at the closed-beta capture route with text-first input. |
| learner-owned note | pass | Capture saves learner-owned note metadata into the learner loop. |
| biggest gap | partial | One biggest gap is generated, but quality remains dependent on deterministic fallback and input clarity. |
| next action | partial | One next action is generated, but wording and runtime evidence still need final closed-beta QA. |
| Today Plan max 3 | pass | Today Plan keeps a max-3 primary task cap and source reasoning contract. |
| Review Queue reflection | partial | Review Queue supports local and durable reflection states, but durable-path evidence is still partial. |
| Notes reflection | pass | Notes reflection is covered by local beta and closed-beta golden-flow tests. |
| loop closure telemetry | partial | Metadata-safe learner-loop telemetry contract exists, but runtime/provider wiring is not complete. |

### B. Data boundary and safety - 19 / 20

Status: **pass**

| Item | Status | Evidence |
| --- | --- | --- |
| no raw Q-Net official materials | pass | Q-Net reference intelligence is metadata-only. |
| no raw problem/answer/OCR/full text | pass | Tests and docs require no raw official problem text, answer text, OCR full text, or official answer body. |
| no qnet_manifest | pass | `qnet_manifest.json` must not be committed. |
| no local_official_materials | pass | `local_official_materials` must not be committed or read by docs/tests. |
| no official grading/model-answer/score/pass-fail | pass | Learner routes must not expose official grading/model-answer/score/pass-fail copy. |
| no public archive UI | pass | Inverge remains a learner OS, not a public archive UI. |
| no instructor-console exposure to learner | pass | Instructor-console behavior remains separated from learner surfaces. |

### C. Persistence and fallback clarity - 10 / 15

Status: **partial**

| Item | Status | Evidence |
| --- | --- | --- |
| `durable_saved` | partial | Durable-save state is modeled, but final account-persistence evidence remains incomplete. |
| `local_fallback_saved` | pass | Browser-local fallback is explicitly labeled for closed beta. |
| `save_failed` | pass | Failed save state has retry-oriented copy. |
| user-facing copy clarity | pass | Local fallback copy avoids overclaiming durable account persistence. |
| review queue readiness behavior | partial | Review Queue reflection handles source states, but closed-beta runtime QA should recheck it. |
| no overclaiming local fallback as durable account save | pass | Browser-local fallback is described as temporary and browser-local. |

### D. Closed beta UX clarity - 11 / 15

Status: **partial**

| Item | Status | Evidence |
| --- | --- | --- |
| capture CTA clarity | pass | Primary capture CTA remains low-friction and learner-friendly. |
| OCR/AI draft copy | partial | OCR draft copy is safe, but PDF/provider maturity evidence is still partial. |
| note/reflection copy | pass | Notes and reflection copy remain closed-beta scoped and metadata-safe. |
| Today Plan reason copy | partial | Source reasoning exists, but runtime learner comprehension still needs manual QA. |
| Review Queue copy | partial | Review Queue copy distinguishes source states, but durable-path evidence is partial. |
| no noisy UI | pass | Closed-beta surfaces keep one primary learner action. |
| no public archive framing | pass | Learner UX does not frame Inverge as a public archive. |

### E. Measurement and QA evidence - 7 / 10

Status: **partial**

| Item | Status | Evidence |
| --- | --- | --- |
| learner-loop telemetry contract | pass | Contract defines metadata-safe event names and fields. |
| test coverage | pass | Node tests cover loop contracts, Q-Net boundary, and scorecard evidence. |
| local validation commands | pass | Required validation commands are documented below. |
| CI status expectations | partial | CI should run docs/tests, but final release still needs browser-level evidence. |
| manual QA still needed | partial | Manual QA runbook and owner evidence remain recommended before broader release. |

### F. Q-Net reference intelligence boundary - 9 / 10

Status: **pass**

| Item | Status | Evidence |
| --- | --- | --- |
| metadata-only Q-Net corpus | pass | Q-Net materials are represented only as metadata/reference intelligence. |
| historical batch plan | pass | Historical batch plan requires local source confirmation and metadata-only records. |
| 2020/2021+ source coverage handling | pass | Partial coverage is explicit and missing papers are not invented. |
| partial coverage rules | pass | `partial_source_coverage` remains an accepted source-status outcome. |
| no raw official content | pass | No raw Q-Net content is stored in the reference intelligence layer. |

## Status Values

- `pass`: Evidence is present and current tests or docs support the claim.
- `partial`: The capability exists but still needs stronger runtime, manual QA, provider, or durable-path evidence.
- `blocked`: A required safety or learner-loop condition is missing.
- `not_applicable`: The item is outside the current learner-facing closed-beta scope.

## Go / Conditional Go / No-Go Rules

- No-Go if any data-boundary hard blocker is present.
- No-Go if a learner route exposes official grading/model-answer/score/pass-fail.
- No-Go if raw official materials, `qnet_manifest.json`, or `local_official_materials` are committed.
- No-Go if Capture -> Note -> Today Plan -> Review Queue -> Notes cannot be demonstrated.
- Conditional Go if the core loop is present but OCR/PDF maturity, telemetry runtime wiring, or durable persistence evidence is partial.
- Go only if core loop, data safety, persistence clarity, UX copy, telemetry evidence, and manual QA all pass.

## Current Honest Decision

Decision: **Conditional Go** for limited closed beta.

This decision is acceptable only because the learner-facing loop is present and the data-boundary tests are strong. It should not be treated as full production readiness.

Current evidence:

- Core closed-beta learner loop: partial, with Capture, learner-owned note, biggest gap, next action, Today Plan, Review Queue, and Notes reflection covered by docs/tests.
- Boundary safety: pass, including no local_official_materials, no qnet_manifest.json, no raw Q-Net, and no official grading/model-answer/score/pass-fail.
- OCR/PDF maturity: partial.
- Telemetry: contract-only, with no analytics provider calls in this PR.
- Durable persistence: partial, with clear fallback states but more account-level save evidence needed.
- Manual QA: still needed before a broader closed-beta rollout.

## Recommended Next PRs

Immediate top 3:

1. Closed Beta Manual QA Runbook v1
2. OCR/PDF Capture Maturity Hardening v1
3. Durable Persistence Evidence v1

Follow-up PRs:

4. Learner Loop Runtime Telemetry Wiring v1
5. Today Plan UI Copy Polish v1

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

## Safety

This scorecard is docs/tests only and preserves the data boundary:

- no local_official_materials
- no qnet_manifest.json
- no raw PDF/HWP/HWPX/Word/ZIP/images
- no raw official problem/answer/OCR/full text
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console exposure
- no raw Q-Net content

It does not add runtime product behavior, AI provider calls, analytics provider calls, payment, public archive UI, or instructor-console exposure to the learner UI.

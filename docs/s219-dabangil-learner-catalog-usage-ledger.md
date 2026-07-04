# S219 Dabangil Learner Catalog and Future Usage Ledger

S219 adds the source-level commercial catalog contract for the learner product and the future usage-ledger semantics for Deep Review Units. It does not activate billing, payment collection, production pricing UI, learner UI, entitlement enforcement, provider calls, OCR calls, routes, auth, Supabase migrations, workflows, or paid launch behavior.

## Goal

- Define the Dabangil learner catalog ids, price-version metadata, feature keys, sale status, rollout state, and usage-grant metadata.
- Define future usage-ledger units and reserve/commit semantics at source level only.
- Fail closed for unknown, disabled, expired, unlimited, or ambiguous catalog and ledger entries.
- Preserve learner/instructor separation and the academy tenant boundary.

## Catalog

Catalog version: `s219.dabangil_learner_catalog.v1`

Price version: `s200r.price_hypothesis.2026-06-25`

Learner plans:

- `free`: 0 KRW, one lifetime full-value review experience.
- `second_os_basic`: 59,000~69,000 KRW/month hypothesis.
- `second_os_pro`: 119,000~149,000 KRW/month hypothesis.
- `second_control_premium`: 249,000~299,000 KRW/month hypothesis.

Deep Review SKUs:

- `deep_review_5`: 49,000 KRW hypothesis, five Deep Review Units.
- `deep_review_15`: 129,000 KRW hypothesis, fifteen Deep Review Units.
- `deep_review_40`: 299,000 KRW hypothesis, forty Deep Review Units.

Later-only disabled SKUs:

- `managed_cohort`: disabled/later-only.
- `season_pass`: disabled/later-only.

Every catalog entry includes feature keys, finite usage-grant metadata, sale status, rollout state, source effective dates, learner-only scope, runtime boundary flags, academy-boundary flags, and metadata-only data-boundary flags.

## Usage Ledger

Ledger contract version: `s219.future_usage_ledger.v1`

Supported source-level unit types:

- `full_value_review_experience`
- `deep_review_unit`

Reservation and commit semantics:

- Reserve units before expensive work.
- Commit units only after a usable result exists.
- Failed generation releases the reservation without consumption.
- Abandoned work releases the reservation without consumption.
- Expired reservations fail closed.
- Unlimited second-exam precision review is forbidden.

S219 records the contract only. It does not persist ledger rows, call providers, enforce entitlements, or consume paid units in production.

## Boundaries

S219 fixtures and source records are metadata-only. They must not include learner answers, OCR material, official question material, official answer material, generated answer prose, source excerpts, provider payloads, billing records, credentials, PDFs, HWPs, images, or asset bytes.

S219 is learner-catalog scope only. It does not add academy routes, instructor tools, tenant-scoped academy data access, or learner/instructor data merging.

## Rollout

Rollout is source contract only. S220 is responsible for any later billing, entitlement, credit-pack, and idempotent usage implementation. S219 can be rolled back by reverting the source module, fixture, docs, tests, and roadmap status change.

## Validation

Focused validation is `tests/s219-learner-catalog-usage-ledger.test.mjs`.

The default node test runner includes the focused S219 test so full `npm.cmd run test -- --workers=1` covers this contract.

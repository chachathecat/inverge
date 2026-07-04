# S220 Billing Entitlement Credit Packs and Idempotent Usage

S220 adds the source-level billing entitlement, credit-pack, reservation, commit, release, refund/reversal, duplicate-prevention, and idempotent usage contract for the Dabangil second-round learner product.

This is not a paid-runtime activation. It does not add checkout, payment webhooks, billing provider calls, production routes, Supabase migrations, auth changes, learner UI, academy routes, provider runtime calls, OCR runtime calls, workflow changes, production pricing UI, or entitlement enforcement.

## Goal

- Consume the S219 learner catalog, plan ids, SKU ids, usage grants, and future ledger metadata.
- Model server-side entitlement states for subscription grants and Deep Review Unit credit-pack grants.
- Reserve units before expensive work.
- Commit units only after a usable result is available.
- Release failed generation or abandoned work without consuming units.
- Record refund/reversal semantics without payment-provider calls.
- Prevent duplicate reservations, duplicate commits, conflicting idempotency keys, and double consumption.

## Contract Versions

- S220 entitlement contract: `s220.billing_entitlement_credit_usage.v1`
- S220 idempotent usage contract: `s220.idempotent_usage.v1`
- Upstream catalog: `s219.dabangil_learner_catalog.v1`
- Upstream ledger: `s219.future_usage_ledger.v1`
- Upstream price version: `s200r.price_hypothesis.2026-06-25`

## Entitlement Grants

Subscription grants come from S219 learner-plan entries:

- `free`
- `second_os_basic`
- `second_os_pro`
- `second_control_premium`

Credit-pack grants come from S219 Deep Review SKUs:

- `deep_review_5`
- `deep_review_15`
- `deep_review_40`

Later-only disabled entries such as `managed_cohort` and `season_pass` fail closed. Client-asserted entitlement evidence also fails closed. The contract accepts only server-side catalog-contract metadata or future operator-approved metadata; it does not call or trust a payment runtime.

## Usage Semantics

Reservation:

- The server reserves finite units against an active learner-owned grant.
- The reservation records an idempotency key, unit type, quantity, reason, and expiration.
- Replaying the same reservation idempotency key with the same semantic request returns the existing reservation.
- Reusing the same idempotency key with different semantics fails closed.

Commit:

- Commit requires an existing fresh reservation and a usable result.
- A failed generation, abandoned run, timeout, storage failure, or missing usable result must not be committed.
- A second commit attempt with a new idempotency key fails closed as a duplicate commit.
- Replaying the same commit idempotency key with the same semantic request returns the prior committed reservation without double consumption.

Release:

- Failed generation and abandoned work release the reservation without consumption.
- Released reservations keep `unitsConsumed` at zero.
- Stale reservations fail closed.

Refund/reversal:

- Refund, chargeback, or operator reversal marks the grant as reversed.
- Pending reservations on the grant are released without consumption.
- Remaining unconsumed units are no longer available.
- No billing provider call, webhook, checkout, or refund API call is performed by this source contract.

## Fail-Closed Cases

S220 fails closed for:

- unknown SKU;
- disabled SKU;
- expired grant;
- duplicate commit;
- stale reservation;
- insufficient credits;
- client-asserted entitlement;
- ambiguous catalog entry;
- unsupported usage unit;
- conflicting idempotency key;
- learner/instructor or academy tenant boundary violation.

## Boundaries

S220 records metadata only. Fixtures and reports must not contain learner answers, OCR text, official question text, official answer text, generated answer prose, source excerpts, provider payloads, credentials, PDFs, HWPs, images, or asset bytes.

Learner and academy boundaries remain separate. S220 does not add academy routes, instructor tools, tenant data access, learner/instructor data merging, API authorization changes, or production entitlement enforcement.

## Rollout and Rollback

Rollout is source contract only. Paid launch remains blocked until later work implements privacy export/delete, cost guardrails, billing configuration, entitlement enforcement, refund policy, runtime evidence, and launch readiness gates.

Rollback is a focused revert of:

- `lib/review-os/s220-billing-entitlement-credit-usage.ts`
- `tests/s220-billing-entitlement-credit-usage.test.mjs`
- `tests/fixtures/s220-billing-entitlement/metadata-only-s220-entitlement.json`
- this document
- runner, safe-key, and roadmap/example-target wiring

No database, provider, webhook, route, workflow, auth, or UI rollback is required because none are added.

## Validation

Focused validation is:

```powershell
npm.cmd run test -- tests/s220-billing-entitlement-credit-usage.test.mjs --workers=1
```

The default node test runner includes the focused S220 test so full `npm.cmd run test -- --workers=1` covers the contract.

# S221 Paid Trust Privacy Export Delete and Cost Guardrails

S221 adds source-level paid-launch trust, privacy, export/delete request, usage visibility, support/refund/cancel, and cost guardrail contracts for the Dabangil second-round learner product.

This is guardrail-first work. It does not activate checkout, payment webhooks, billing provider calls, production billing, production entitlement enforcement, production pricing UI, provider runtime expansion, OCR runtime expansion, academy routes, instructor routes, public archive UI, auth changes, workflow changes, Supabase migrations, or raw corpus expansion.

## Goal

- Define the learner trust surfaces required before paid launch: export, deletion request, support, refund/cancel, subscription or pack history, remaining usage or credit, and AI/source trust labels.
- Define source-level cost guardrails for OCR pages, model input tokens, model output tokens, total request tokens, timeout budget, retry budget, feature kill switches, provider kill switches, and warning states.
- Define metadata-only commercial/cost telemetry and reject raw service content, provider payloads, source excerpts, credentials, and payment or billing secrets.
- Reuse S219/S220 catalog, entitlement, and usage metadata for learner-safe remaining credit/usage visibility without enabling real enforcement.

## Contract Versions

- S221 paid trust contract: `s221.paid_trust_privacy_cost_guardrails.v1`
- S221 cost guardrail contract: `s221.cost_guardrails.v1`
- Upstream S219 learner catalog: `s219.dabangil_learner_catalog.v1`
- Upstream S219 ledger contract: `s219.future_usage_ledger.v1`
- Upstream S220 entitlement contract: `s220.billing_entitlement_credit_usage.v1`
- Upstream S220 idempotent usage contract: `s220.idempotent_usage.v1`

## Trust Surfaces

The source contract requires these learner-visible surfaces before paid launch:

- `data_export`
- `account_data_deletion_request`
- `support_contact`
- `refund_cancel_policy`
- `subscription_pack_history`
- `remaining_usage_credit`
- `ai_official_source_labels`

The contract records safe copy and scope for each surface. Export and deletion request scope covers user-owned service records and safe derived learning signals, while excluding reference corpus data, aggregate metrics, academy tenant data, provider payloads, credentials, and payment secrets.

The support and refund/cancel surfaces are policy/copy contracts only. They do not create a support backend, refund API, checkout flow, payment webhook, or billing provider integration.

## Usage And Credit Visibility

S221 exposes the source-level visibility shape for:

- subscription history metadata;
- credit-pack history metadata;
- remaining finite units;
- pending reservations;
- committed or released usage;
- S219 catalog entries and S220 entitlement state when present.

This visibility is metadata-only and learner-owned. It does not activate real billing, unit consumption, production entitlement enforcement, or payment-backed access.

## Cost Guardrails

The S221 cost guardrail config records:

- OCR page budget;
- model input token budget;
- model output token budget;
- total per-request token budget;
- timeout budget;
- retry budget;
- feature kill switches;
- provider kill switches;
- warning and anomaly states.

The feature/provider kill switches are source-contract declarations in this PR. They are not wired into runtime provider selection or checkout behavior here.

## Metadata-Only Telemetry

S221 commercial/cost telemetry may include only metadata such as:

- event id and event kind;
- route id;
- learner id hash;
- catalog entry id;
- unit type and finite counts;
- OCR page count;
- token counts;
- duration, timeout budget, retry count;
- cost warning, anomaly, feature-kill, and provider-kill states.

It must not include learner answers, OCR material, problem material, generated answer prose, source excerpts, PDFs, HWPs, images, provider payloads, credentials, payment secrets, or billing secrets.

## Authority-Copy Boundary

S221 trust copy must remain action-first and honest. It must not claim authority, certainty, pass prediction, or guarantee. AI/OCR outputs remain learning-support drafts with verification and uncertainty labels.

## Rollout And Rollback

Rollout is source contract only. Paid launch remains blocked until later runtime work separately implements and verifies billing configuration, entitlement enforcement, privacy operations, support operations, refund/cancel operations, live cost monitoring, runtime kill switches, and full launch acceptance.

Rollback is a focused revert of:

- `lib/review-os/s221-paid-trust-privacy-cost-guardrails.ts`
- `tests/s221-paid-trust-privacy-cost-guardrails.test.mjs`
- this document
- safe-key, runner, roadmap, and Agent Factory ready-target wiring

No database, provider, webhook, route, auth, workflow, environment, or production rollback is required because none are added.

## Remaining Risks

- Production export/delete still needs operator or self-serve runtime implementation with auth, retention, and deletion safety evidence.
- Runtime feature/provider kill switches still need later integration and staging evidence.
- Billing, refund, cancellation, and support operations still need final policy and operational proof before paid launch.
- Cost limits are source-level starting values and need paid-beta evidence before enforcement.

## Validation

Focused validation is:

```powershell
npm.cmd run test -- tests/s221-paid-trust-privacy-cost-guardrails.test.mjs --workers=1
```

The default node test runner includes the focused S221 test so full `npm.cmd run test -- --workers=1` covers this contract.

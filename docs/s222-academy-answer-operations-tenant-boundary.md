# S222 Academy Answer Operations Tenant Boundary

S222 adds a source-level academy answer operations boundary for later B2B workflows.

This is not a live console launch. It does not add academy routes, academy API routes, auth changes, database migrations, checkout, payment webhooks, billing calls, entitlement enforcement, production pricing UI, provider runtime expansion, OCR runtime expansion, public archive UI, or raw corpus expansion.

## Goal

- Define tenant-scoped metadata contracts for academy answer operations.
- Define allowed academy operator roles and blocked learner or unscoped actor roles.
- Define answer review queue visibility using metadata references only.
- Define assignment, review, evidence, handoff, and audit status metadata.
- Preserve learner app separation and S221 paid-trust boundaries.

## Contract Versions

- S222 academy operations contract: `s222.academy_answer_operations_tenant_boundary.v1`
- Upstream S211 law review engine: `s211.law_answer_review_engine.v1`
- Upstream S212 theory review engine: `s212.theory_answer_review.v1`
- Upstream S213 practice review engine: `s213.practice_answer_review.v1`
- Upstream S220 entitlement and idempotent usage contracts
- Upstream S221 paid trust and cost guardrail contracts

## Tenant And Operator Boundary

Academy operation state is tenant scoped and metadata only.

Required boundary rules:

- `academyTenantId` is required on operation state, queue items, and audit events.
- Cross-tenant reads and writes are blocked.
- Operator ids are hash identifiers, not account details.
- Learner actors are not allowed to run academy operations.
- Academy operation contracts are not imported into learner capture or answer-review surfaces.
- Learner-owned service records remain private references. Raw answer, OCR, problem, reference, provider, asset, credential, payment, and billing material is not copied into academy metadata.

Allowed S222 source-level roles:

- `academy_owner`
- `academy_operator`
- `academy_instructor`
- `academy_reviewer`
- `inverge_ops_auditor`

## Queue And Status Metadata

S222 defines source-level metadata for:

- tenant queue visibility;
- assigned operator queue visibility;
- instructor approval queue visibility;
- learner handoff queue visibility;
- assignment and review status;
- evidence status;
- learner-safe handoff status;
- audit event status.

Queue rows contain identifiers and status labels only. They may reference a learner answer submission id, review request id, learner id hash, or question reference id, but must not contain raw service content or source excerpts.

## Authority Boundary

Academy review output is operational review metadata and instructor-approved handoff state. It is not an exam authority claim. Any learner handoff from academy operations requires academy approval and must keep the learning-support framing already required by the learner product.

## Rollout And Rollback

Rollout is source contract only:

- add the contract module;
- add focused tests;
- add this document;
- update metadata-safe keys, roadmap status, and default test runner wiring.

Rollback is a focused revert of those files. No database, auth, route, provider, OCR, billing, payment, entitlement, workflow, or runtime rollback is required.

## Remaining Risks

- Live academy routes, APIs, RLS, consent, retention, exports, and tenant enforcement still need later implementation and runtime evidence.
- Instructor approval workflow is metadata only in S222.
- Academy billing remains disabled and separate from learner paid-launch guardrails.
- Runtime tenant isolation cannot be proven by this source-only PR.

## Validation

Focused validation is:

```powershell
npm.cmd run test -- tests/s222-academy-answer-operations-tenant-boundary.test.mjs --workers=1
```

The default node test runner includes the focused S222 test so full `npm.cmd run test -- --workers=1` covers this contract.

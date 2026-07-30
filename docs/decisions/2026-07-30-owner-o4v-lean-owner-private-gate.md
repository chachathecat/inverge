# Owner O4V Decision — Lean Owner-Private Gate

- Decision date: 2026-07-30 KST
- Decision recorded at: `2026-07-30T10:41:24+09:00`
- Decision owner: repository owner
- Base commit: `a49b51acef38a9901789b9e2037c5cbbb31605fe`
- Base tree: `59aa044b3975165e3e612bd9e1d2bb128cd3b7bb`
- Decision status: approved for the lean Owner-private gate below only
- Legacy packet status: rejected and superseded
- Activation status: S236P may be started only by a separate manual Work;
  S236P is not started by this decision

## Decision

The Owner rejects the enterprise-scale 88-field provider-binding proposal for
the current one-Owner dogfood stage and replaces it with the lean
Owner-private gate in this record.

The milestone names and dependency chain remain:

`O4V → S236P → S236A`

O4V is completed only as this exact-scope Owner decision. It authorizes a
future S236P Work to provision and verify the lean gate with synthetic data.
It does not execute S236P, start S236A, authorize real content, or activate a
runtime.

## Rejected and superseded packet

The rejected proposal is
`o4v-s234r-owner-private-plane-binding-v1`.

At the base authority it had:

- status `pending_exact_binding_and_owner_decision`;
- `ownerApproved: false`;
- 88 provider-binding fields, all `null`;
- proposal digest
  `59c6762c2dbe6519cefeef864b8d8f5f14402c3256d23ed8708ca18bb6fc4236`;
- all-null provider-template digest
  `d161f4f52c1f155e383246edd36dec6f1d56fd89aaf272f5087c2d4ba3105ee3`;
  and
- expiry `2026-08-09T14:59:59.000Z`.

The proposal becomes `superseded_rejected`. Its normalized proposal digest
and all-null template remain historical integrity values only. The packet was
never approved or materially bound, so this decision does not fabricate a
DSSE rejection receipt, independent verifier, KMS/HSM binding, or final
approved-binding digest. The dated Owner decision is the disposition
authority.

The rejected packet cannot authorize provisioning, S236P, S236A, real
content, or later external use. It is not revived automatically if the lean
gate is later replaced.

## Lean O4V contract

The active gate is
`dabangil.o4v.lean_owner_private_gate.v1`.

| Boundary | Exact Owner-pilot rule |
| --- | --- |
| Cloud plane | Reuse existing Supabase Pro project `inverge-beta`; no new cloud account or dedicated private plane |
| Object storage | One Owner-only private bucket; public access is forbidden |
| Metadata | Owner-only Postgres metadata with RLS |
| Isolation | Both Owner A→B and Owner B→A object and metadata access must be denied |
| Signed access | If a signed URL is used, TTL is at most 300 seconds |
| Content processing | OCR/AI content-provider mode is exactly `none` |
| Raw emissions | Raw content in logs, analytics, telemetry, APM, exceptions, queues, or CI artifacts is exactly zero |
| S236P data | Synthetic fixtures only; real content remains off |
| Private-content retention | At most 365 days |
| Metadata-log retention | At most 7 days |
| Temporary copies | TTL at most 300 seconds |
| Application cache | TTL exactly 0 |
| Export/delete | Owner export or delete request SLA at most 7 days |
| Rollback | Automatic object-version rollback is not guaranteed in this Owner pilot |
| Recovery | Owner restores lost source content by re-uploading the original retained by the Owner |
| Dedicated keys | Customer-managed or dedicated KMS/HSM is not required before external users, payment, or regulated customers |

Provider-default encryption at rest and transport protection may be used, but
this decision makes no customer-managed-key, independent-verifier,
object-version rollback, backup-restore, or immediate-deletion-propagation
claim.

## Authorized next operation

This decision authorizes only a later manually started
`S236P` Work for:

1. lean private bucket and metadata-RLS provisioning in `inverge-beta`; and
2. synthetic-only verification of the exact lean boundaries above.

S236P must fail closed if public access is possible, either cross-account
direction succeeds, signed URL TTL exceeds 300 seconds, raw content reaches a
forbidden surface, content-provider mode is not `none`, a retention/TTL/SLA
limit is exceeded, or real content is enabled.

S236P acceptance remains evidence for this exact Owner-private lean
configuration only. It cannot establish Production, external-user,
commercial, regulated-customer, backup-restore, or dedicated-key readiness.

## Explicit exclusions

This decision does not authorize:

- any Supabase, Vercel, AWS, Azure, database, storage, schema, RLS, function,
  key, environment, secret, deployment, or provider-setting mutation in this
  Work;
- S236P or S236A execution in this Work;
- real question, answer, OCR, reference-answer, Law, AI, or learner content;
- Production, external users, invitations, payment, public access, Academy,
  Shared Signal, telemetry, or model training;
- AWS/Azure private-plane creation, a new provider account, long-lived
  credentials, customer-managed KMS/HSM, a separate DSSE store, or an
  independent infrastructure verifier;
- automatic object-version rollback or provider backup-restore guarantees;
  or
- mutation, Ready transition, review, or merge of PR #660 or PR #672.

The following values remain mandatory:

- `automaticProvisioningAllowed: false`;
- `automaticS236PStartAllowed: false`;
- `automaticS236AStartAllowed: false`;
- `s236pStarted: false`;
- `s236aStarted: false`;
- `realContentAuthorized: false`;
- `productionAuthorized: false`; and
- `externalUsersAuthorized: false`.

## Canonical and roadmap effect

The canonical unified contract, private-plane machine mirror, and active
roadmap record this decision. O4V becomes completed for this lean scope.
S236P remains queued, synthetic-only, and unstarted behind O4V. S236A remains
queued and unstarted behind O3A and S236P.

Selection or readiness is metadata-only. It does not create resources or
start S236P.

## Rollback and later expansion

This decision changes source authority only and creates no cloud or data
state. Before S236P starts, reverting this decision and its canonical mirrors
returns O4V to unmet without infrastructure rollback.

Before external users, payment, or regulated customers, a separate dated
Owner decision must define the expanded isolation, key management,
backup/restore, verification, retention, deletion, and Production evidence.
That later gate may adopt a dedicated KMS/HSM or private plane, but it cannot
silently reuse the rejected 88-field proposal.

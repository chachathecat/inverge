# Owner O1R Decision — Owner Dogfood, Private Plane, and Schedule Amendment

- Decision date: 2026-07-26 KST
- Decision owner: repository owner
- Base commit: `f28ef275d918c3b6ee2afcd0a393959fd4763fb3`
- Base tree: `95d1efcf5e3eed12516fbd58da2dcc81bf604064`
- Decision status: approved for this one source-only program amendment
- Activation status: not authorized
- Linked issue: `#661`
- Held pull request: `#660` at
  `4c5694e4c65a110aede39762421abb49afd653f5`
- Execution boundary: one global-exclusive PR, mutation WIP one, root/owner
  as the sole writer, and additional agents as read-only auditors

## Decision

The dated 2026-07-23 Owner decision and canonical unified contract remain
authoritative for unaffected scope; this source-only amendment supersedes
only the exact clauses below. The attached v3/v4 documents are inputs, not
repository authority.

1. Owner-private dogfood replaces Wave A/B/C as the current prerequisite for
   Owner-private second-round authenticated acceptance.
2. External learners, invitation cohorts, payment, price, refund, capacity,
   commercial validation, and public self-serve move to a separate deferred
   commercial track. They are not completed or deleted.
3. S225 remains queued and deferred.
4. A Private Authoring/Review Plane, O4V, and S236P are mandatory before real
   Golden authoring or execution.
5. Native Full-Day planning is the required path. Google OR-Tools CP-SAT is
   only a proposed, optional, metadata-only ExecutionBlock placement adapter.
6. Owner dogfood may establish Owner-private readiness only. It cannot
   establish commercial readiness, external usability, observed efficacy, or
   causal claims.

This decision does not approve O3A, O4V, O4A, O4T, O2O, O4P, O4F, a Golden
execution, provisioning, schema, migration, secrets, providers, real content,
telemetry, OR-Tools installation, billing, external learners, or Production.

## Authority and scoped supersession

For the exact scope above, this decision supersedes the 2026-07-23 Owner O1
decision and unified-contract text that made Founding Beta waves mandatory
before Owner-private acceptance. The 2026-07-23 decision remains authoritative
for all unaffected first-round, Academy, rights, source, readiness, consent,
public-launch, billing, and safety boundaries.

The attached v3 and v4 plans remain inputs. Their live snapshots and embedded
prompts are historical. In particular, v4's single linear sequence is not
canonical because it accidentally makes OR-Tools mandatory and omits O4A and
the native S240A acceptance.

## Canonical dependency graph

```text
S234R
├─ O3A rights/source/version/purpose decision
└─ O4V exact vault/key/provider/environment decision
   └─ S236P synthetic-only private-plane acceptance

O3A + S236P
→ S236A Owner-Private Golden 3
→ S237A Owner-Private Second-Round Study OS Core
→ S237P Full-Day Native Planning Contract
→ O4A Owner-Private Runtime and Dogfood Activation Approval
→ S238A Owner Dogfood Baseline — Native Planner
→ S240A Owner Dogfood Extended Acceptance — Native Planner
→ S241A Owner-Private Authenticated Acceptance
```

S236A requires both O3A and S236P; neither may substitute for the other.

The optional optimizer branch begins after S237P:

```text
S237P
→ S237O isolated benchmark
→ O4T exact threshold decision
→ O2O exact Owner-private comparison measurement/retention decision
→ S238OH Owner-hidden shadow
→ S238OV Owner-visible comparison
→ O4P limited-activation approval
→ S239O Owner-only limited activation
→ S240O optimizer dogfood acceptance
```

There is no dependency from the optimizer branch to S241A.

## Private-plane amendment

The canonical private-plane contract is
`docs/dabangil-private-authoring-review-plane-contract.md` with the machine
mirror in
`config/dabangil-private-authoring-review-plane-contract.json`.

Private plaintext SHA-256 is vault-local integrity metadata only. It never
becomes an exported identifier or equality oracle. External references are
random and opaque. Private deduplication, if any, is vault- and
environment-scoped, keyed, and non-exported.

S236P must complete the exact synthetic receipt set before S236A. Real content
remains off during provisioning acceptance.

O4V also binds external ETag/checksum suppression, transport/storage/
metadata/backup encryption with a distinct non-exportable storage key, and
either no content processor or one exact immutable OCR/AI/model provider set.
S236P receipts carry operation-specific assertion evidence and independent
signed-attestation digests; aggregate `passed` without those bindings is
invalid. The exact 15-receipt set is canonically digested, and a distinct
verifier must cryptographically validate a fresh DSSE envelope against the
O4V-bound key/trust root before S236P can complete. The verifier identity,
key/root, algorithm, issue/expiry, and revocation fields are inside the signed
payload and acceptance independently rechecks the trust path and revocation.
O4V itself also requires a closed DSSE Owner decision receipt. Every receipt,
assertion set, and independent attestation binds the final immutable O4V
approved-packet digest, not merely its proposal/provider digests. Completed
S236P is a resolvable content-addressed artifact over those exact receipt and
attestation sets; S236A must recompute it and revalidate current signatures.

## Schedule amendment

The machine contract is
`config/dabangil-full-day-scheduler-contract.json`.

The native policy owns what to study, priority, CoreOutcome selection, and
mastery meaning. The optional adapter may only place already selected
metadata-only candidates into ExecutionBlocks. `OPTIMAL` and `FEASIBLE`
outputs remain candidates until the native validator accepts them. Every
failure status uses native fallback; an invalid fallback returns
`blocked_manual_plan_required`.

Request and result objects use exact top-level and nested allowlists.
Candidates, windows, fixed/execution blocks, unassigned reasons, fallback,
versions, objectives, and violations are closed metadata schemas. Stable
identity, calendar title/location, body, filename, free text, and unknown
fields fail closed.

Owner-hidden shadow and Owner-visible comparison are separate. Exact
thresholds are versioned after S237O through O4T, have an effective date and
evaluation window, and cannot be weakened retroactively. Before O2O,
comparison is ephemeral and writes no measurement. Exact O2O may authorize
only closed, no-free-text Owner-private comparison metadata with its own
retention/deletion values. It does not authorize Shared Signal, telemetry,
external-learner, or Academy measurement, which still require generic O2.
O4P also requires completed native S240A and remains a separate exact
Owner-only limited-activation decision.

The pending O4T packet is
`o4t-s237o-owner-private-schedule-thresholds-v1`. It contains no approved
threshold values and cannot be approved until exact S237O evidence/head/tree,
adapter/optimizer/config, every value/unit/comparator, effective date,
evaluation window, normalized canonical digest, and exact private Owner
decision store/scope/actor/key/trust/revocation bindings are complete. A
closed DSSE Owner receipt and final approved threshold-binding digest are
required at O2O/S238OH use. The immutable approved packet must first be stored
under that final digest in the exact private O4T packet store bound by its
Owner-decision store reference and policy digest. O2O and S238OH resolve and
canonically rehash that packet at start and acceptance, then revalidate its
exact approval record, DSSE receipt, and revocation state. Missing, ambiguous,
duplicate, store/policy-mismatched, digest-mismatched, or invalid-receipt
resolution fails closed. It starts neither O2O nor shadow automatically.
The store coordinates are bootstrapped from a separately authenticated,
current, unrevoked, replay-protected signed O4T control-plane resolver binding,
never from the unresolved packet itself; resolved packet coordinates must
match it exactly. A final-digest key maps to one immutable, append-only
canonical packet with no alias, redirect, or mutable overwrite. Start and
acceptance both reject a wrong resolver binding, a stale or expired packet, or
any approval-state, receipt-equality, signature/trust, expiry, or revocation
failure.
The resolver is a closed DSSE artifact whose signed payload fixes exact
Owner-private scope, O2O/S238OH audience and purpose, store coordinates, final
digest, externally anchored registry/key/root versions and algorithm, time
window, single-use nonce, monotonic generation, and revocation evidence.
Authenticated Owner-approved O4T control-plane configuration supplies the
trust-anchor registry before resolver verification; packet or artifact values
cannot introduce a key/root. Every start and acceptance re-resolves and
recomputes outer/signed equality, payload/envelope/artifact digests, signature,
scope, replay state, expiry, and revocation. Unknown-key, untrusted-root,
unsigned, payload- or scope-mismatched, replayed, expired, or stale-revocation
bindings fail closed.

S237O evidence is likewise closed and attested: exact dependency/license/
SBOM, isolation/no-network, deterministic config, fixture/result, native
fallback, rollback, metadata-only, and six exact receipt outcomes are bound
into the evidence and receipt-set digests that O4T must reference.
The six-receipt set has exact ordering and normalization, and a distinct
signed verifier binds the receipt set plus the otherwise-complete evidence
preimage before the final evidence digest is accepted. Each receipt has an
exact operation-specific assertion policy; deterministic replay is
single-worker with three cold and three warm byte-identical canonical results
inside one six-process projection session. The result reference resolves an
exact content-addressed compound bundle whose replay/config/failure/rollback/
metadata children are independently schema-validated and rehashed. S237O
authorization itself uses a canonical proposal, a separate
immutable signed Owner decision, and then a final authorization digest; the
decision receipt is not placed in its own signed preimage. Materialized
ready/decided packets live outside the Git head/tree they bind.
Canonical receipt projections bind every assertion-evidence and
primary-attestor-provenance digest, while a closed benchmark-result artifact
binds the exact replay, failure-status, fallback, rollback, metadata-boundary,
and time results. The Owner decision receipt is re-resolved and
cryptographically revalidated at benchmark start and acceptance; the final
authorization digest is not a bearer token.

A prior accepted schedule is eligible for churn/replan input only when a
fresh signed server lookup proves it is the latest non-superseded lineage.
If an accepted schedule exists, omission or use of an older snapshot fails
closed; `null` requires a signed authoritative absence result. Separate
closed signed native-validator and authenticated Owner receipts plus the
provenance bundle bind the exact schedule and lineage, approved O4V/completed
S236P, and separate exact O4A authorization. Replan rechecks revocation
evidence within 300 seconds and uses the Asia/Seoul minute ceiling cutoff to
freeze elapsed and in-progress blocks.
The lookup also signs a single-use nonce, monotonic non-reusable scope
generation, acceptance high-water mark, and latest signed rollback-resistant
state-checkpoint ref/digest. Absence requires verified genesis and high-water
zero; a restored historical genesis is invalid. Supersession requires atomic
sequence+1 acceptance and deletion preserves a signed tombstone/checkpoint.
Immediately before projection the server atomically rechecks the entire
checkpoint-bearing tuple, consumes the nonce, and rejects any mismatch or use
after 300 seconds.
The trusted native gateway then strips every durable
store/scope/lineage/receipt/bundle/authorization reference and digest.
OR-Tools may receive only freshly remapped ephemeral windows, candidates,
fixed blocks, cutoff, immutable elapsed/in-progress placements, and soft
future-placement preferences; it cannot access the authoritative or identity
planes. Exact top-level/nested schemas and one-request ID bijections preserve
all non-ID values and referential integrity across windows, prerequisites,
fixed blocks, and prior placements.

The D0-to-D+1 freeze continues to cover Notebook, Full-Day, learning and
assistance policies, model, prompt, rubric, and source version. A necessary
security repair invalidates paired evidence and restarts at D0.

## Regenerated O3A packet

The previous packet
`o3a-s235a-appraiser-second-2026-q1-owner-private-golden-3` is structurally
stale because it predates S236P and still records S235B as queued.

This amendment regenerates a pending packet with a new identity, digest, and
expiry. It remains unapproved and cannot start authoring or S236A. Its allowed
operations require completed S236P.

## PR #660

PR #660 remains Draft and blocked. Its exploratory OCR result and green CI do
not establish S236B. This Work does not edit, rebase, close, merge, replace,
or mark it ready. Any continuation must reconcile onto amended main and
regenerate exact-head evidence.

## Exact owned-file manifest

This amendment owns exactly the 30 paths recorded in issue #661. No app, API,
component, database, migration, Supabase project, workflow, package,
lockfile, environment, secret, content body, Golden input, deployment, or
PR #660 path is owned.

## Safe state after merge

- S234R, S234, S235A, and S235B are completed as source/contract history.
- O3A, O4V, and S236B are queued; none starts automatically.
- S236P and S236A remain queued behind unmet dependencies.
- public, commercial, external-learner, first-round runtime, Academy,
  optimizer, billing, telemetry, and Production work remains off.

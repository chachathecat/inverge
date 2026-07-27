# 답안길 Private Authoring/Review Plane Contract

- Contract version:
  `dabangil.private_authoring_review_plane.v1`
- Machine-readable mirror:
  `config/dabangil-private-authoring-review-plane-contract.json`
- Owner decision:
  `docs/decisions/2026-07-26-owner-dogfood-private-plane-schedule-amendment.md`
- Status: contract only; O4V, provisioning, and real content are not approved

## Purpose

This contract is the missing prerequisite between second-round Golden rights
readiness and any private question, answer, OCR, reference-answer, Law, or AI
body authoring. A conceptual Personal Raw Vault is not proof that a durable
private plane exists.

The approval scopes do not substitute for one another:

- O3A owns the exact Golden selections, rights, sources, effective versions,
  and Owner-private purpose;
- O4V owns the exact vault, key, provider, environment, logging, retention,
  backup, cache, and rollback bindings;
- S236P proves the O4V-approved stack with synthetic data only; and
- S236A requires both a valid, unexpired O3A decision and the exact completed
  S236P receipt set.

O3A does not provision storage. O4V does not approve content rights. S236P
does not authorize real content.

## Private identity and equality-oracle boundary

External object, document, and revision references are random, opaque, and
vault-scoped. They are never derived from a filename, body, plaintext digest,
or keyed commitment.

Plaintext SHA-256 of private raw content may exist only inside the authorized
vault for local integrity verification. It must not become an object key,
API identifier, idempotency key, receipt field, export field, log field,
telemetry value, PR or issue field, Shared Signal value, or cross-plane
identifier.

Any private deduplication uses a vault- and environment-scoped keyed
commitment with a versioned canonicalization domain and a managed KMS/HSM MAC
key whose material is not readable by the application. The commitment is not
returned to clients, receipts, logs, exports, or analytics, and no lookup
endpoint may act as an equality or membership oracle. Identical content in
Owner A and Owner B vaults must not produce externally linkable identifiers
or signals.

Provider-generated ETag, MD5, checksum, content-digest, or dedup validators
are subject to the same rule. Unkeyed content-derived validators are
suppressed or kept vault-local and may not appear in clients, signed
responses, receipts, logs, telemetry, caches, exports, or cross-vault
signals. External cache validation uses only opaque object versions.

Rotation, retirement, destruction, migration, rollback, and restore behavior
are exact O4V bindings. A retired epoch cannot authorize new writes, and a
restore cannot re-enable a retired or destroyed key epoch.

Public provenance hashes remain valid only for rights-cleared material in
the Cleared Content Bank. They are not private-content identities.

### Answer Pack 2.0 compatibility blocker

Direct private-body use of `answer_pack.2.0` is blocked because its current
required plaintext content-hash field would cross the vault boundary and
create a reusable equality handle. S235A therefore does not claim that the
private packages are schema-ready.

Before real package generation, S236P must accept a versioned vault-safe
adapter or replacement schema that keeps plaintext integrity values
vault-local and emits no plaintext hash or keyed commitment externally. This
amendment defines that prerequisite only; it does not change the existing
Answer Pack implementation or authorize schema/runtime mutation.

## Original and revision lineage

The original is immutable. OCR correction, Owner edits, reference work, and
AI output create explicit append-only revisions instead of overwriting the
original. Each revision binds only opaque parent identity, actor class,
timestamp, content class, source version, and applicable model/prompt
versions. Raw bodies remain in the vault.

## Isolation and access

Database and object storage enforce the same Owner boundary. S236P must prove
Owner A success, Owner B success, A-to-B and B-to-A read/write/list denial,
uniform non-oracular errors, and no existence-dependent timing or status
signal.

Every access uses least-privilege signed authorization. The approved mode is
either authenticated RLS with a short-lived signed session or a short-lived
object capability scoped to method, exact opaque object version, audience,
type, and size. O4V must bind the exact access mode, TTL, method/object
version/audience/content-type/content-length scope, replay and single-use behavior,
provider revocation/expiry/deletion propagation, and signed-access log
redaction/retention. A pre-signed object URL is optional. A signed URL, token,
or session never appears in evidence. The contract may not claim revocation
that the exact provider cannot prove; disabling access must use the
provider's verified mechanism and deletion/expiry semantics.

Transport, raw-object, metadata, and backup encryption are separate from the
commitment key. O4V binds private-bucket/no-public-ACL policy, minimum TLS,
storage/metadata/backup encryption policy, storage-key class/opaque
reference/region/rotation/destruction, and immutable policy digests. The
non-exportable storage-encryption key must be distinct from the commitment
MAC key.

## Provider, retention, export, delete, and rollback

O4V is not approvable until it binds the exact environment, vault and metadata
providers, region, bucket/schema equivalents, commitment-key provider/class,
logging/training/retention behavior, backup window, cache/index behavior, and
rollback/restore behavior.

Provider processing is service-only. Raw private bodies may not be used for
provider training, research, or secondary purposes, and provider retention
may not exceed the exact O4V window. Evidence is mandatory; an unresolved or
noncompliant logging, training, research, secondary-use, or retention policy
makes O4V unapprovable.

O4V also binds the exact content-processing provider mode: either `none` or
an immutable approved provider-set digest with exact provider count, config,
model registry, prompt registry, logging, training, research/secondary-use,
and retention policy digests. `none` binds canonical empty manifests. S236P
may exercise only that exact set; a raw body may never reach an unbound OCR,
AI, model, or other processing plane.

Raw bodies are prohibited from Git, CI artifacts, screenshots, traces,
analytics, APM, cost logs, exception logs, issue/PR bodies, queues, and
provider logs. An unresolved provider logging, training, retention, or region
fact fails closed.

Owner export contains exactly one vault and excludes secrets and commitments.
Delete covers raw objects, OCR/answer/reference/Law/AI revisions, vault-local
integrity metadata, keyed commitments, private dedup indexes, key-epoch
references, indexes, caches, temporary and queue copies, and approved
provider copies. Primary deletion is not `delete_complete` while backups
remain; it is `backup_expiry_pending`. Restore must never resurrect a
deletion tombstone or retired/destroyed key epoch.

Partial failures do not record success, mastery, or usage. Orphans enter
quarantine and cleanup is idempotent. A provider, environment, region, key,
schema, policy, or deployed-head change makes the S236P receipts stale.

## S236P synthetic receipt set

External receipts are metadata-only. Every required receipt must contain
exactly the closed field set in the machine contract: contract version, exact
head and tree, opaque environment and vault references, policy/key/provider
versions, synthetic fixture and operation IDs, observation time, assertion
result, cleanup state, O4V proposal provenance, the final immutable
`o4v_approved_binding_digest_sha256`, provider/assertion-policy digests, and
a closed assertion count/evidence digest plus run, attestor, provenance, and
canonical receipt-set and independent-verifier attestation digests. A
proposal or provider digest cannot substitute for the final approved
binding. The primary attestor also has an opaque ID distinct from the
independent verifier. It must not include a body,
content-derived attestation input, plaintext digest, keyed commitment,
secret, token, signed URL, provider payload, private locator, free text, an
unknown field, or an omitted binding field.

S236P requires all of:

1. synthetic write and read-after-write;
2. Owner A own-vault success;
3. Owner B own-vault success;
4. bidirectional cross-owner read/write denial;
5. cross-owner list, revision, export, deletion, and receipt denial;
6. approved access-mode tamper, replay, expiry, and wrong-method denial;
7. immutable original and append-only revision proof;
8. a vault-safe Answer Pack adapter/replacement with no external plaintext
   hash;
9. timeout and partial-failure false-success zero;
10. orphan quarantine and idempotent cleanup;
11. one-vault export without secret or commitment;
12. delete across every approved surface and content-derived private handle;
13. `backup_expiry_pending` distinct from `delete_complete`;
14. rollback/restore without deleted-content or retired-key resurrection; and
15. a synthetic canary absent from Git, CI, telemetry, provider logs,
    analytics, and support surfaces outside the authorized vault.

Receipt values use closed enums, formats, lengths, and opaque references.
Every one of the 15 required operation receipts and every bound subassertion
must be `passed`; a `failed` or `blocked` receipt cannot complete S236P. Free
text and additional fields are forbidden. The real-content flag remains off
throughout S236P. Passing this source contract is not a provisioning or
runtime result.

Each operation has an exact fixture, required subassertions, and permitted
cleanup state. The assertion-policy digest binds that map. Receipts are
fresh, exact-head, exactly once, non-reusable across environments, vaults,
providers, or policies, and share the O4V proposal, final approved binding,
and provider digests. Each assertion-evidence digest content-addresses one
closed result per subassertion plus head/tree/run/config/final-binding
provenance in the exact O4V-approved attestation store; unresolved or
digest-mismatched evidence fails closed. An independent verification
attestation is mandatory. The receipt-set digest sorts the exact 15 receipts
by operation ID and canonicalizes every closed receipt field after normalizing
only the receipt-set and independent-attestation digest slots to `null`.
Every receipt carries that computed digest.

The independent result is a closed, metadata-only DSSE signed-attestation
artifact, not an unchecked 64-character claim. Its canonical signed payload
binds the exact head/tree, environment/vault, policy/key/provider, O4V
proposal, final immutable approved binding, provider binding, assertion
policy, run, receipt set, primary
attestor, verifier class/version/identity, verification key/trust-root
identity/version, signature algorithm, issue/expiry time, revocation policy,
fresh revocation evidence/status, provenance set, and assertion-evidence set.
Those identity, credential, time, and revocation values are inside the signed
payload and must exactly equal the outer artifact. Acceptance retrieves
the envelope through an opaque reference, verifies its Ed25519 or
ECDSA-P256-SHA256 signature against the exact O4V-approved verification key
and trust root, confirms that the verifier differs from the primary attestor
by class and opaque identity, and requires `signature_verified=true` and
`revoked=false`. It independently recomputes the signature/trust path and
checks a fresh cryptographically authenticated revocation proof rather than
trusting editable outer booleans. Expired, stale, replayed, revoked,
unknown-key, untrusted-root, or unverified artifacts fail closed. Neither the
signed payload nor any artifact digest may derive from raw content.

Completion is also an exact artifact, not a status string or bare digest.
The canonical `completedS236PAcceptanceContract` binds the 15-receipt set,
assertion/provenance sets, verified independent attestation, current final
O4V approved binding, provider binding, exact head/tree/environment/vault,
and completion time. Its digest is the content-address lookup key in the
O4V-approved metadata-only attestation store. S236A and scheduler consumers
must resolve that artifact, recompute its RFC 8785 digest, and revalidate the
O4V Owner decision and independent-attestation signatures at use time.

## Pending O4V packet

The pending packet is
`o4v-s234r-owner-private-plane-binding-v1`. It proposes the existing Supabase
private Storage/Postgres architecture as the default vault and metadata
candidate, plus a managed KMS/HSM vault-scoped MAC key whose material is not
readable outside its cryptographic boundary. A server secret is not eligible.
It is deliberately
`pending_exact_binding_and_owner_decision`: provider identifiers, region,
retention, backup, logging, cache, key lifecycle, rollback, exact signed-access
lifecycle, independent-attestation store/verifier/key/trust-root/signature/
revocation policy and opaque evidence-store bindings, canonical proposal
digest, exact head/tree, and provider-binding digest must be materialized
before the Owner can approve it.

The proposal, provider-binding, and final approved-binding digests are
distinct. The proposal digest binds every proposal and exact-binding field
after normalizing only
`status`, `ownerApproved`, `approvalBinding.proposalDigestSha256`, and the
separate `approvalRecord` to `null`. The later Owner approval record must
reference that unchanged proposal digest, so recording the decision does not
invalidate what was approved.

The provider digest separately binds the exact closed, non-secret provider
object: opaque environment/vault/metadata/key references; provider classes;
region; bucket/schema/key epoch; access; logging/training/research/retention;
backup; cache/index; rollback/restore; signed access; provider content
validators; transport/storage/metadata/backup encryption; exact content
processors; and their policy versions, values, and document digests.
Every field must be non-null before binding is complete. Every S236P receipt
carries and matches the proposal, final approved binding, and provider
digests.
The current all-null provider template digest is
`d161f4f52c1f155e383246edd36dec6f1d56fd89aaf272f5087c2d4ba3105ee3`;
it is a template integrity value, never an approvable binding.

The current pending proposal digest is
`59c6762c2dbe6519cefeef864b8d8f5f14402c3256d23ed8708ca18bb6fc4236`.
Approval is valid only when the immutable approval record says `approved`,
references the same proposal digest, supplies decision time and Owner
decision-receipt reference and digest, occurs before expiry, and all exact
bindings are complete. The receipt is a closed DSSE artifact whose signed
payload binds the proposal/provider digests, exact head/tree, decision,
packet expiry, authenticated Owner-private scope and opaque Owner actor,
decision store/policy, verification key, trust root, algorithm, expiry, and
revocation evidence. It must be resolved and cryptographically revalidated
before provisioning, every synthetic receipt, S236P completion, and S236A.
The final approved packet digest includes that immutable record and is
content-addressed in the exact private decision store; it is not a bearer
token. Flipping status or `ownerApproved`, or presenting only a proposal or
provider digest, never constitutes approval.

The commitment binding additionally fixes MAC algorithm, canonicalization,
vault/environment domain separation, opaque domain reference, encoding,
truncation, key epoch, and rotation/migration policy version and document
digest. Those fields cannot be inferred from key class alone.

The packet expires at `2026-08-09T14:59:59.000Z`. It authorizes no automatic
provisioning, S236P start, S236A start, or real content.

# QF-0A Rights-Time and Deterministic Identity Core V1

QF-0A is an inert, source-only trust substrate. It defines bounded canonical
JSON, SHA-256 digests, UTF-8 bytewise ordering, exact rights and source-decision
identities, exact model-execution identities, and one temporal at-use gate.

It creates no question candidate or scarcity event and has no release, bank,
learner, provider, network, database, API, UI, or runtime capability.

## Temporal rights boundary

A source decision binds one exact rights-manifest snapshot and one exact policy
version, digest, and validity window. An eligible interval exists only when the
decision is current, the source class is eligible, the rights snapshot is
active, every class/purpose/policy binding agrees, and evaluation occurs inside
both the rights and policy windows.

The interval starts at the latest of decision evaluation, rights validity, and
policy validity. It ends at the earliest of rights expiry and policy expiry.
The at-use gate receives an explicit rights snapshot and use time. It rejects a
use before evaluation, after either interval expires, on a non-active rights
state, or on any source, purpose, policy, identity, version, or digest drift.

This is exact source-only temporal validation. It cannot prove that an old
snapshot is still authoritative, and it does not claim to detect later
revocation without a fresh authority snapshot supplied by a future caller.

## Host-independent identity

Canonical object keys are ordered by their UTF-8 bytes. Locale APIs, process
language settings, filesystem order, and object insertion order are not
authority. Canonical work is bounded by byte, depth, and entry limits;
unsupported, cyclic, malformed-time, and non-finite values fail closed.

Model identity records role, provider, exact model/version/artifact,
execution/artifact/configuration identities, canonical time, and deterministic
identity digest. QF-0A executes no model.

QF-0B remains blocked until QF-0A has an approved, validated resulting-main
receipt.

# QF-0B opaque registry references and bodyless scarcity core v1

QF-0B is an inert source-only metadata utility. It installs closed opaque
registry references and deterministic bodyless Bank Scarcity Events. It does
not construct a question, blueprint, answer, candidate, audit chronology, or
release state.

## Dependency boundary

The implementation consumes the merged QF-0A1 canonicalization, UTF-8 byte
comparison, canonical digest, and source-only receipt. It also binds the exact
merged QF-0A2 trust-core export surfaces and source-only boundary without
reimplementing rights-time decisions or model-execution identity.

- QF-0A1 resulting main/tree:
  `62268861dcc6a60126700c5259c662c55bd1a4ee` /
  `996b1e7ea30f31f21782e765be644798aad8d548`;
- QF-0A1 five-path identity:
  `sha256:d3919726b908cfd9146335173907c06c2a3ebcdfd3a892b84485d21fbc14e618`;
- QF-0A2 resulting main/tree:
  `daebb7d2b58ad464ed43ff06a75fe36f2ac8765a` /
  `628660cac8c4afc0b2fe50b555177eabd5787a96`;
- QF-0A2 six-path identity:
  `sha256:3432a751f40dda4563463920359545ab6f3348b69f3759e622d8229914fb4bd0`.

Any dependency export or boundary-receipt drift fails closed. Repository file
digests and Git object identities are additionally pinned by the machine
contract and focused tests.

## OpaqueRegistryRefV1

An opaque registry reference has exactly seven fields: its contract version,
one of ten closed reference kinds, fixed-length registry and object IDs, one
bounded positive integer version, an object digest, and its QF-0A1-derived
reference digest.

The IDs are machine-only `reg_` and `obj_` hexadecimal tokens. A reference
cannot carry a display name, label, URL, locator, file path, source excerpt,
learner identifier, provider payload, extension object, or arbitrary note.

An opaque reference does **not** prove that its target exists, is current, is
authorized, or is releasable. A future trusted registry resolver must establish
those properties.

## BodylessBankScarcityEventV1

A scarcity event contains exactly seven independently validated references in
fixed slots:

- exam package → `EXAM_PACKAGE`;
- subject → `SUBJECT`;
- skill concept → `SKILL_CONCEPT`;
- problem family → `PROBLEM_FAMILY`;
- difficulty band → `DIFFICULTY_BAND`;
- task profile → `TASK_PROFILE`;
- policy → `POLICY`.

It also carries only a bounded positive shortage count, a canonical UTC
millisecond timestamp, and deterministic `bse_`/SHA-256 identities derived by
QF-0A1. Wrong kinds, altered material, noncanonical time, unknown fields,
proxies, accessors, symbols, and unsupported objects fail closed.

The event is only a metadata demand signal. It does not reserve capacity,
assign a learner or bank, authorize generation or provider use, establish
availability or correctness, or create any lifecycle/release state.

## Closed public surface

- `QF0B_CONTRACT_VERSION`
- `QF0B_REGISTRY_REF_KINDS`
- `QF0B_LIMITS`
- `QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT`
- `createOpaqueRegistryRefV1`
- `assertOpaqueRegistryRefV1`
- `createBodylessBankScarcityEventV1`
- `assertBodylessBankScarcityEventV1`

There is no generic parser, serializer, metadata bag, registry resolver, or
runtime entrypoint.

## Source-only receipt

All work is in-memory. Runtime activation, provider execution, network,
database/persistence, remote mutation, and Production mutation remain off or
zero. Question-candidate, generation, release, learner-assignment, and
bank-assignment authority are absent. QF-0I remains blocked pending a validated
QF-0B resulting-main receipt.

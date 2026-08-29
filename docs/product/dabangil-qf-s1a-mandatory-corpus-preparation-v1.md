# QF-S1A mandatory similarity corpus preparation v1

QF-S1A is the source-only mandatory-preparation half of the QF-S1 safety
firewall. It accepts one validated QF-0 quarantined candidate, its ephemeral
candidate parts, and one closed ephemeral reference corpus. It validates,
hashes, normalizes, tokenizes, and accounts for every declared legal body
before returning one immutable in-memory prepared corpus.

It creates no lexical windows, comparisons, alignments, containment search,
matches, review artifact, or `CLEAR`, `BLOCKED`, or `REVIEW_REQUIRED` outcome.
QF-S1B remains blocked until a validated QF-S1A resulting-main receipt exists.

## Exact dependency

Preparation first validates the candidate with merged QF-0I. The frozen QF-0
receipt binds the QF-0 resulting-main SHA/tree, QF-0A1 and QF-0I config and
implementation digests, their exact five/six-path Git identities, their
source-only boundary receipt digests, and their exact runtime export surfaces.
Dependency export or boundary drift fails closed.

QF-S1A directly consumes QF-0A1 bounded canonical JSON, canonical SHA-256
digesting, and UTF-8 byte ordering. It does not implement a second canonical
serializer, Unicode identity rule, digest rule, or locale-dependent ordering.

## Closed input and complete preparation

The input has exactly `contractVersion`, `candidate`, `candidateParts`, and
`corpus`. Candidate body parts retain the six closed QF-S1 body-part kinds.
References retain the four protective comparison purposes and the eight closed
source classes. Opaque reference and corpus IDs, exact versions, body digests,
reference identities, per-reference manifests, and the complete corpus
manifest are mandatory. Unknown fields, arbitrary metadata, URLs, paths,
learner/account identities, provider payloads, proxies, accessors, symbols,
sparse arrays, and unsupported prototypes fail closed.

Every candidate/reference array count is closed before any body string is
traversed. The implementation then orders parts and references with QF-0A1
UTF-8 byte ordering, verifies every body digest and manifest binding,
validates Unicode, applies NFKC normalization and locale-independent case
folding, and tokenizes every legal body. A partial corpus is never returned.

## Mandatory limits and accounting

QF-S1A owns only mandatory limits: 16 candidate parts, 64 references, 16 parts
per reference, 32,768 original and normalized characters per body, 262,144
aggregate original and normalized characters, 256 retained tokens per body,
1,048,576 total work units, and 64 fixed work units for every reference.
Caller override is false.

Mandatory total work is exactly fixed reference overhead plus original
characters plus normalized characters plus observed tokens plus retained
tokens. The remaining optional capacity is exactly 1,048,576 minus that
mandatory total. No body or reference may reset either counter. A mandatory
overflow throws and creates no `REVIEW_REQUIRED` substitute.

## Prepared corpus boundary

`PreparedSimilarityCorpusV1` contains exact candidate/corpus identities,
counts, deterministic prepared body sequences, bounded lexical/number tokens,
body and manifest digests, exact accounting, and one preparation digest. Each
body exposes a normalized-content sequence digest independent of part,
reference, and body-digest provenance. The candidate and every reference also
expose a structured aggregate digest over explicit sequence indices in the
canonical prepared-part order. This preserves part-order distinctions: moving
content between canonical part positions changes the aggregate digest and
cannot be mistaken for an exact structured copy. These digests let QF-S1B
perform its exact-copy prepass without rescanning bodies or reimplementing
normalization/tokenization. The preparation digest separately binds all
identities, provenance, sequence digests, token counts, and work.

Raw `bodyText` and excerpt fields never enter the output. Token sequences are
sensitive ephemeral derived material: in-memory only, deeply immutable, not
an audit artifact, not a learner or bank record, not loggable, not persistable,
not releasable, and discarded after a future QF-S1B call. QF-S1A exposes no
rehydration, parser, serializer, persistence, matching, or outcome API.

## Authority boundary

Source rights are not granted by source class or preparation. Runtime,
provider, network, database, persistence, remote mutation, Production
mutation, release, learner assignment, and bank assignment remain absent.
This PR closes only QF-S1A child Issue #871. QF-S1 umbrella #867, Question
Foundry #811, and cognitive/product reference #714 remain open.

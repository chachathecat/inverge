# QF-0A1 bounded canonical JSON and byte order v1

QF-0A1 is an inert source-only utility. It provides one bounded canonical JSON traversal, deterministic SHA-256 identity, and host-independent UTF-8 byte ordering. It installs no domain decision or runtime authority.

## Closed limits

- canonical output: 262,144 bytes;
- inspected UTF-16 code units: 262,144, including surrogate look-ahead;
- entries: 10,000;
- depth: 32;
- cached-byte comparison steps: 524,288.

Every key and string value in one canonicalization consumes the same inspection and output counters. Nested containers cannot lower or reset them. Object keys are inspected once, their validated UTF-8 bytes are retained, and a stable merge order compares only those cached bytes.

The explicit inspection limit governs QF-0A1 userland character scanning. The entry limit governs subsequent per-property work. The contract does not claim to control JavaScript-engine-internal key enumeration work.

## Canonical domain

The accepted domain is limited to null, finite numbers, booleans, well-formed strings, dense ordinary arrays, and plain objects containing enumerable data properties. Negative zero is emitted as zero. Input is never normalized, coerced, or truncated.

Cycles, unsupported values, malformed surrogates, accessors, symbol keys, sparse or extended arrays, hostile prototypes, and every limit overflow fail closed.

## Boundary

QF-0A1 has no learner, bank, content-lifecycle, provider, network, database, remote-mutation, payment, or Production behavior. Runtime and public activation remain off. QF-0A2 stays blocked until a validated QF-0A1 resulting-main receipt. Merging QF-0A1 may close only Issue #861; Issues #859, #857, #811, and #714 remain open.

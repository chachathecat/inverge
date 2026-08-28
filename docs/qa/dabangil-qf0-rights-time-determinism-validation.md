# QF-0A Rights-Time and Deterministic Identity Validation

The machine contract is
`config/dabangil-qf0-rights-time-determinism-v1.json`. Executable contracts
and pure helpers live only in the two `lib/question-foundry/quarantine/trust-*`
files.

## Fixed checklist

- ACTIVE rights and policy windows produce an exact derived eligibility
  interval; use before evaluation or after either expiry fails.
- Stale, disputed, blocked, revoked, and expired rights fail closed.
- Manifest, decision, source, purpose, policy, time, version, and digest drift
  fail closed at construction or use.
- A supplied at-use rights snapshot must be active and byte-identical to the
  decision binding. Snapshot freshness remains future authority responsibility.
- Canonical object keys use UTF-8 byte ordering and remain identical across
  locale settings and insertion-order permutations.
- Canonical work rejects malformed time, non-finite values, unpaired
  surrogates, prototype-key collisions, sparse arrays, symbol keys, accessors,
  non-enumerable properties, unsupported JSON, cycles, and early
  byte/depth/entry overflow.
- Model execution identities bind every declared immutable field, while no
  model execution occurs.
- No candidate, scarcity, release, learner/bank assignment, provider, network,
  database, remote, or runtime contract exists.
- The changed-path manifest is exactly six paths and does not touch the shared
  test runner.
- QF-0B and QF-0I each require a validated QF-0A resulting-main receipt and
  cannot start automatically.

## Focused evidence

`node scripts/run-node-tests.mjs tests/qf0-rights-time-determinism.test.mjs`

Completed-candidate adjacent evidence:

`node scripts/run-node-tests.mjs tests/rights-safe-adaptive-variant-foundry-contract.test.mjs`

The remaining checks are JSON/config identity, the exact six-path manifest,
typecheck, changed-file lint, applicable production build, and
`git diff --check`. PostgreSQL, browser, remote Supabase, provider, and
Production evidence do not apply.

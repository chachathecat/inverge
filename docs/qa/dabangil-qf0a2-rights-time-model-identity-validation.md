# QF-0A2 rights-time and model-identity validation

## Candidate identity

- base SHA/tree: `62268861dcc6a60126700c5259c662c55bd1a4ee` / `996b1e7ea30f31f21782e765be644798aad8d548`;
- tracking and closing issue: #859;
- branch: `codex/qf0a2-rights-time-model-identity-v1`;
- exact path count: six;
- QF-0A1 config SHA-256: `0a4a4f54ecf6ebf6d19be209811aaf688abe7172932548f5ae8784fa02a8fe53`;
- QF-0A1 implementation SHA-256: `cccc4dc8da9163d982a252633e3160f1ba5ad2138d0fda0f152f21b2c01e8d9e`;
- QF-0A1 five-path identity: `sha256:d3919726b908cfd9146335173907c06c2a3ebcdfd3a892b84485d21fbc14e618`;
- QF-0A2 config SHA-256: `45bbdcd1c7d9858bd4a0a9be86c4df2e556ca4aa0953ff5ff25da89e1458ccda`;
- remote and Production mutation: zero.

## Focused commands

```text
node scripts/run-node-tests.mjs tests/qf0a2-rights-time-model-identity.test.mjs
node scripts/run-node-tests.mjs tests/qf0a1-bounded-canonical-json.test.mjs
node scripts/run-node-tests.mjs tests/rights-safe-adaptive-variant-foundry-contract.test.mjs
```

The QF-0A2 suite covers the exact QF-0A1 dependency receipt, all source classes and rights/decision statuses, deterministic denial derivation, interval intersection, exact at-use expiry and replay failures, immutable execution identities, generator/independent separation, hostile proxies and accessors, digest tampering, field closure, locale and key-order stability, and the inert source-only boundary.

## Candidate gates

- focused QF-0A2 suite: pass, 28/28;
- merged QF-0A1 focused suite: pass, 21/21 on exact merged tree `996b1e7ea30f31f21782e765be644798aad8d548`;
- adjacent rights-safe suite: pass, 9/9;
- JSON/config identity: pass, pinned SHA-256;
- exact six-path manifest: pass;
- typecheck: pass;
- changed-file lint: pass;
- `git diff --check`: pass;
- production build: delegated to repository-required exact-head Full CI if required;
- repository-required exact-head CI: pending;
- fresh formal review P0/P1/P2: pending;
- unresolved actionable threads: pending.

No PostgreSQL, migration, browser-to-database, inherited durable runtime, remote Supabase, provider, network, or Production validation belongs to this Work.

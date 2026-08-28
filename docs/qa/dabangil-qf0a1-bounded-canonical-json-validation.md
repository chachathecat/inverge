# QF-0A1 bounded canonical JSON validation

## Candidate identity

- base: protected main `fd8d0039bbeb2981935fdb671094e37d73a34400`;
- child issue: #861;
- branch: `codex/qf0a1-bounded-canonical-json-v1`;
- exact path count: five;
- config SHA-256: `sha256:0a4a4f54ecf6ebf6d19be209811aaf688abe7172932548f5ae8784fa02a8fe53`;
- remote and Production mutation: zero.

## Focused command

```text
node scripts/run-node-tests.mjs tests/qf0a1-bounded-canonical-json.test.mjs
```

The focused suite proves one cumulative key/value inspection counter, early rejection of the 461,939-character hostile class, exact output-byte boundaries, cached-byte sorting without original-string rescans, malformed-surrogate rejection, deterministic locale-independent order and digest, comparison-step overflow, trap-free proxy rejection before governed reflection, the closed JSON domain, the exact five-path manifest, and the inert source-only boundary.

## Candidate gates

- focused QF-0A1 suite: pass, 21/21;
- JSON/config identity: pass, pinned SHA-256;
- exact five-path manifest: pass;
- typecheck: pass;
- changed-file lint: pass;
- `git diff --check`: pass;
- production build: delegated to repository-required exact-head Full CI;
- repository-required exact-head CI: pending;
- fresh formal review P0/P1/P2: pending;
- unresolved actionable threads: pending.

No PostgreSQL, migration, browser-to-database, inherited durable runtime, remote Supabase, or Production validation belongs to this source-only Work.

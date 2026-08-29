# QF-0B opaque registry and bodyless scarcity validation

## Candidate identity

- tracking issue: #864;
- base SHA/tree: `daebb7d2b58ad464ed43ff06a75fe36f2ac8765a` /
  `628660cac8c4afc0b2fe50b555177eabd5787a96`;
- branch: `codex/qf0b-opaque-registry-bodyless-scarcity-v1`;
- exact changed-path maximum: six.

## Frozen dependency identities

- QF-0A1 config SHA-256:
  `0a4a4f54ecf6ebf6d19be209811aaf688abe7172932548f5ae8784fa02a8fe53`;
- QF-0A1 implementation SHA-256:
  `cccc4dc8da9163d982a252633e3160f1ba5ad2138d0fda0f152f21b2c01e8d9e`;
- QF-0A1 five-path identity:
  `sha256:d3919726b908cfd9146335173907c06c2a3ebcdfd3a892b84485d21fbc14e618`;
- QF-0A1 boundary receipt:
  `sha256:bf9f1223fd788696294261995a9a09b05e1db0bfa4d8bc803359cdf98fa9853a`;
- QF-0A2 config SHA-256:
  `45bbdcd1c7d9858bd4a0a9be86c4df2e556ca4aa0953ff5ff25da89e1458ccda`;
- QF-0A2 contract implementation SHA-256:
  `4f9963cb989e4776355e8601a7c690c011857e4197b73494db14c7e71f599527`;
- QF-0A2 core implementation SHA-256:
  `4843278ff1e0af3550a851f60678d80d42ce9221e7e12caef906b1d0d757679a`;
- QF-0A2 six-path identity:
  `sha256:3432a751f40dda4563463920359545ab6f3348b69f3759e622d8229914fb4bd0`;
- QF-0A2 boundary receipt:
  `sha256:09ed5b0f3385cef65ec674af5e3b047df81df5ae53a6e17c023eb8be05a25f97`;
- QF-0B machine-contract SHA-256:
  `90b29227472b7d6337ebef9c651a9e9a3e5b2ae222dabe4dc9f5533081cb7156`.

## Focused coverage

The QF-0B suite covers deterministic opaque references, every fixed event
slot, field-order and locale invariance, digest/identity tampering, bounded
counts, canonical time, and proxy/accessor/symbol/prototype rejection without
executing hostile traps. It rejects raw question/answer/OCR/learner/source/
textbook/provider material, arbitrary human-readable identifiers, URLs, paths,
locators, generic metadata, and extension objects.

The source-boundary regression allows only the local QF-0A dependencies and
`node:util`; it proves no application route, package/lock change, environment
read, filesystem persistence, network/provider/database client, or remote
mutation path is introduced.

## Commands and final candidate results

Run QF-0B from this candidate worktree:

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf0b-opaque-registry-bodyless-scarcity.test.mjs
```

Run QF-0A1 and QF-0A2 in their byte-identical reviewed/merged worktrees. Their
own manifest regressions intentionally bind their original stage diffs and are
not rewritten for a successor stage:

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf0a1-bounded-canonical-json.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf0a2-rights-time-model-identity.test.mjs
```

Completed source-only candidate evidence:

- QF-0B deterministic/hostile suite: 27/27 passed;
- byte-identical merged QF-0A1 suite: 21/21 passed;
- byte-identical merged QF-0A2 suite: 28/28 passed;
- JSON parsing and pinned QF-0B config identity: passed;
- exact six-path manifest: passed;
- TypeScript typecheck: passed;
- changed-file ESLint: passed with zero warnings;
- `git diff --check`: passed.

The repository-required exact-head CI remains the authority for the candidate
commit's production build and broader unchanged-suite coverage.

No PostgreSQL, migration, browser runtime, Supabase, provider, network, or
Production validation belongs to this inert source-only Work.

# QF-0I quarantine core validation

## Candidate identity

- tracking and closing issue: #857;
- base SHA/tree: `e42899b4c157511a71f1d8fff0fd0226a71cb0a7` /
  `b4a7d5295f02bb2454b8637b8f42cbdbfc0d1844`;
- branch: `codex/qf0-quarantine-candidate-integration-v1`;
- exact changed-path count: six.

## Frozen dependencies

- QF-0A1 config/implementation:
  `0a4a4f54ecf6ebf6d19be209811aaf688abe7172932548f5ae8784fa02a8fe53` /
  `cccc4dc8da9163d982a252633e3160f1ba5ad2138d0fda0f152f21b2c01e8d9e`;
- QF-0A1 five-path/boundary:
  `sha256:d3919726b908cfd9146335173907c06c2a3ebcdfd3a892b84485d21fbc14e618` /
  `sha256:bf9f1223fd788696294261995a9a09b05e1db0bfa4d8bc803359cdf98fa9853a`;
- QF-0A2 config/six-path/boundary:
  `45bbdcd1c7d9858bd4a0a9be86c4df2e556ca4aa0953ff5ff25da89e1458ccda` /
  `sha256:3432a751f40dda4563463920359545ab6f3348b69f3759e622d8229914fb4bd0` /
  `sha256:09ed5b0f3385cef65ec674af5e3b047df81df5ae53a6e17c023eb8be05a25f97`;
- QF-0B config/six-path/boundary:
  `90b29227472b7d6337ebef9c651a9e9a3e5b2ae222dabe4dc9f5533081cb7156` /
  `sha256:eca7fc8cec509b4d3756b7560601357aeea996ac2b200cab50a3976357b1db1f` /
  `sha256:397d051c5bd1fc158f0444563c402b8e792e414c88a3f6df44717caaae1ee9f8`.
- QF-0I/QF-0 aggregate machine-contract SHA-256:
  `34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993`.

## Focused commands

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/question-foundry-quarantine-core.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf0a1-bounded-canonical-json.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf0a2-rights-time-model-identity.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf0b-opaque-registry-bodyless-scarcity.test.mjs
```

Inherited suites run from their byte-identical reviewed worktrees because each
predecessor manifest test intentionally binds its own original stage diff.

The finished candidate also requires JSON/config identity, the exact six-path
manifest, typecheck, changed-file lint and `git diff --check`. Repository CI is
the authority for the exact-head production build and broader unchanged suite.

No PostgreSQL, migration, browser runtime, provider, remote Supabase or
Production validation belongs to this source-only work.

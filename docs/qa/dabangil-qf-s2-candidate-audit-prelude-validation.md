# QF-S2 candidate audit prelude validation

## Exact scope

- Base: `7b21551b0ec2a6b78286fb861b9acd0d1f8ca8c2`
- Base tree: `9ad60b9ece4931d7172cdc0462e079ed8d9a53fa`
- Changed paths: the six paths declared by the QF-S2 config, with no seventh
  path
- Tracking: closes only #868; #857 is the completed prerequisite; #811 and
  #714 remain open references

## Dependency recomputation

The focused suite independently recomputes from repository bytes:

- QF-0 aggregate config SHA-256;
- QF-0 candidate-contract and candidate-core SHA-256 values;
- QF-0 six-path Git object identity;
- QF-0I source-only boundary digest; and
- exact QF-0I contract/core/public export surfaces.

The expected aggregate config observation is
`34722851960a8818876a95ce189d8074727337efed0d9d8040f034a119935993`;
the test treats it as an observation to recompute, not trusted input.

## Hostile focused evidence

The focused suite covers deterministic zero- and multiple-independent
candidates, candidate-specific generator times, absence of a wall-clock audit
time, equal-time causal ordering, every required chronology rejection,
missing/extra/cyclic/dependency-output failures, duplicate actor/step identity,
actor version and artifact drift, candidate identity drift, evidence drift,
input permutation, raw-field rejection, forbidden authority kinds, and the
absence of provider/network/database/remote mutation paths.

The prelude is always asserted again against the exact QF-0 candidate. An
internally re-labeled artifact cannot substitute for that candidate binding.

## Exact-head commands

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf-s2-candidate-audit-prelude.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test --test-skip-pattern='QF0A1-CONTRACT-001|QF0A2-CONTRACT-001|QF0B-CONTRACT-001|QF0B-SOURCE-026|QF0I-CONTRACT-001|QF0I-SOURCE-042' tests/qf0a1-bounded-canonical-json.test.mjs tests/qf0a2-rights-time-model-identity.test.mjs tests/qf0b-opaque-registry-bodyless-scarcity.test.mjs tests/question-foundry-quarantine-core.test.mjs
npm run typecheck
npx eslint lib/question-foundry/audit/prelude-contracts.ts lib/question-foundry/audit/prelude-core.ts tests/qf-s2-candidate-audit-prelude.test.mjs
git diff --check
```

The six skipped historical cases reassert that a later successor branch still
contains only each predecessor stage's own original five/six changed paths, so
they are not successor-compatible. QF-S2's dependency test replaces only that
stale branch-envelope assertion by recomputing the exact merged QF-0 six-path
Git identity, byte digests, boundary digest, and export surfaces. All 112
inherited behavioral and boundary assertions execute unchanged.

Production build runs only if repository CI requires it. Required exact-head
CI, one fresh formal exact-head review with actionable P0/P1/P2 `0/0/0`, and
zero unresolved actionable threads remain publication evidence rather than
source-file claims.

Remote, Supabase, and Production mutation: zero.

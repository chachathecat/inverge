# QF-S1A mandatory corpus preparation validation

## Exact scope

- Base: `4503afc74cf782c18437d6c5031541ef9786eed9`
- Base tree: `b5d3596ebebc50142b01a63d731a4951288d1499`
- Tracking: closes only child Issue #871; #867, #811, and #714 remain open
- Changed paths: the exact six paths declared by the machine contract
- PR #870 is closed-unmerged read-only donor/failure evidence; no ancestry is
  imported

## Dependency recomputation

The focused suite independently recomputes the merged QF-0A1 and QF-0I config
and implementation SHA-256 values, five/six-path Git identities, source-only
boundary digests, result SHA/tree, and exact export surfaces. The source core
also fails closed on runtime export or boundary drift.

## Mandatory hostile evidence

The suite covers complete preparation of every declared body; candidate,
part, and reference order invariance; the exact 262,144 original and
normalized character boundaries and their +1 failures; bounded and charged
NFKC expansion; per-body character and token overflow; malformed high/low
surrogates; body, candidate-content, reference-manifest, reference-identity,
and corpus-manifest drift; fixed overhead for all 64 short references;
proxy/accessor/symbol/sparse-array/hostile-prototype rejection without hostile
trap execution; deep immutability; exact field closure; opaque identifiers;
stable preparation identity; and the absence of optional matching and remote
authority.

One explicit QF-S1B-consumer regression proves that NFKC/case-equivalent
normalized content under different candidate/reference and part IDs produces
the same per-body and aggregate comparable digest, while changed content
produces a different digest. The preparation digest separately retains all
identity and provenance bindings.

A structured-order regression moves the same two bodies between canonical
part positions and proves the aggregate digest changes even though the set of
per-body content digests is unchanged. QF-S1B can therefore distinguish exact
structured equality from order perturbation.

## Exact-head commands

```text
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/qf-s1a-mandatory-corpus-preparation.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test --test-skip-pattern='QF0A1-CONTRACT-001|QF0A2-CONTRACT-001|QF0B-CONTRACT-001|QF0B-SOURCE-026|QF0I-CONTRACT-001|QF0I-SOURCE-042' tests/qf0a1-bounded-canonical-json.test.mjs tests/qf0a2-rights-time-model-identity.test.mjs tests/qf0b-opaque-registry-bodyless-scarcity.test.mjs tests/question-foundry-quarantine-core.test.mjs
npm run typecheck
npx eslint lib/question-foundry/similarity/preparation-contracts.ts lib/question-foundry/similarity/preparation-core.ts tests/qf-s1a-mandatory-corpus-preparation.test.mjs
git diff --check
```

The six skipped historical cases assert predecessor-only branch manifests and
are not successor-compatible. All inherited behavioral and source-boundary
tests run unchanged; this suite recomputes the exact merged predecessor
identities in their place.

Production build runs only if required by repository CI. Exact-head CI, fresh
formal review with actionable P0/P1/P2 `0/0/0`, and zero unresolved actionable
threads remain publication evidence rather than source claims.

Remote, Supabase, and Production mutation: zero.

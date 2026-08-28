# Semantic Risk Classifier V2 validation

## Exact scope

The candidate owns only the machine contract, standalone classifier, Owner
decision, this validation note, focused test, and required shared test
registration. It does not modify workflows or current routing.

## Required evidence

- Parse full exact base/head blobs with the installed TypeScript Compiler API.
- Detect static imports, exports, import-equals, dynamic import, global require,
  `module.require`, and the closed direct network-call families.
- Preserve executable template interpolation and import options.
- Compare deterministic semantic-fact multisets so unrelated edits and harmless
  movement do not reclassify existing behavior, while a materially changed
  unsafe fact remains new.
- Fail closed on unsafe dynamic specifiers, parse failure, blob failure,
  incomplete comparison, and machine-owned source, fact, Git-time, and
  Git-output limits.
- Reject strings, comments, prose, unrelated properties, local modules, and
  near-prefix packages as semantic network facts.
- Prove semantic HIGH cannot be lowered by a future LOW or MEDIUM route.

## Candidate commands

```text
node --test tests/semantic-risk-classifier-v2.test.mjs
node scripts/run-node-tests.mjs tests/semantic-risk-classifier-v2.test.mjs
npm run typecheck
npx eslint scripts/automation/semantic-risk-classifier-v2.mjs tests/semantic-risk-classifier-v2.test.mjs
npm run build
git diff --check
```

Repository-required exact-head CI and both independent reviews remain GitHub
gates. No PostgreSQL, migration, browser-to-database, durable subject runtime,
remote Supabase, provider, or Production evidence applies to this source-only
foundation.

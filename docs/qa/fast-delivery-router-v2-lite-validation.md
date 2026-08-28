# Fast Delivery Router V2 Lite validation

Date: 2026-08-28

Candidate branch: `codex/fast-delivery-router-v2-lite`

Base: `fd8d0039bbeb2981935fdb671094e37d73a34400`

Base tree: `1d338b7be92cfc98c00611b4ff3f2b75dea1784d`

## Bounded validation contract

The candidate is limited to the ten paths declared in
`config/dabangil-fast-delivery-router-v2-lite.json`. The workflow inventory is
48 before and 48 after. The focused suite covers:

- exact LOW prefix-and-extension admission and hostile LOW escapes;
- executable source/test MEDIUM floors;
- workflow, authority, dependency, active-program, API/server/worker,
  database/auth/RLS, provider/payment/Production and unknown HIGH floors;
- lane declarations that can only raise a computed floor;
- an empty installed `MEDIUM_SOURCE_ONLY` registry plus hostile synthetic
  registration/evidence cases;
- required-check completeness, exact-head binding, current-main ancestry,
  trusted formal review, unresolved-thread and Ready/squash gates;
- trusted-main checkout and the absence of PR #737's action-version upgrades;
- unchanged stable required-check names and unchanged workflow count.

## Completed candidate evidence

The completed pre-push candidate produced:

- Router/classifier/Parallel Execution focused suites: 64 passing tests and
  zero source failures. The S233 fixture was first invoked without its
  repository TypeScript loader, failed before test collection, and then passed
  21/21 with the required loader.
- TypeScript no-emit check: passed.
- changed-file ESLint for both scripts and both focused test files: passed.
- production build: passed. The existing Next.js NFT whole-project trace
  warning remained non-blocking and unchanged by this Work.
- workflow YAML parse for both changed workflows and policy YAML parse: passed.
- Router JSON parse and schema guard: passed.
- exact changed-path manifest: 10/10, with no undeclared path.
- workflow count: 48 before and 48 after.
- candidate self-classification: `HIGH`; automatic merge candidate false;
  Owner approval required true; runtime evidence required false.
- protected-main ruleset: active `main-pr-only` #20903914, default-branch
  target, zero bypass actors, strict required checks, squash only and required
  review-thread resolution. All nine required contexts bind their live
  integration IDs (`15368` for GitHub Actions and `8329` for Vercel).
- `git diff --check`: passed.
- remote/Supabase/Production mutation: zero.

The machine contract SHA-256 at this candidate is
`fa85010885ca747d806d9a71a5a5b51a9eb0614015ff3012e9ad975134ae3278`.

The commands were:

```text
node --test tests/agent-factory-risk-classification.test.mjs tests/fast-delivery-router-v2-lite.test.mjs tests/parallel-execution-v1.test.mjs
node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/s233-parallel-execution-contract.test.mjs
node scripts/automation/classify-risk.mjs --validate-route
npm run typecheck
npm run lint -- scripts/automation/classify-risk.mjs scripts/automation/automatic-merge-v2-lite.mjs tests/agent-factory-risk-classification.test.mjs tests/fast-delivery-router-v2-lite.test.mjs
npm run build
git diff --check
```

Workflow YAML was parsed independently without executing it. The machine JSON
was parsed, and the exact changed-path set was compared with
`changedPathsExactly` before the one ordinary commit.

Exact command outcomes, final head/tree, required exact-head CI, independent
adversarial review, fresh formal review, post-Ready review and unresolved
thread count are recorded in the immutable Owner merge packet rather than
invented in this pre-merge source record.

No PostgreSQL, migration replay, browser-to-database, durable learning runtime,
remote Supabase or Production validation belongs to this source-only Work.

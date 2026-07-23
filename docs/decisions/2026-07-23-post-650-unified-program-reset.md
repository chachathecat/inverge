# Owner O1 Decision — Post-#650 Unified Program Reset

- Decision date: 2026-07-23 KST
- Decision owner: repository owner
- Base commit: `5fcc2f4ad8c44eadc0d31ed40c1c046550bb0035`
- Base tree: `8a47c441f3cea2e89e5678bc10684d960f802a9a`
- Decision status: approved for this one docs/contracts/roadmap reset
- Activation status: not authorized
- Execution boundary: one global-exclusive PR, mutation WIP 1, root/owner as
  the sole writer, and additional agents as read-only auditors
- Enforcement truth: global exclusivity is manually Owner-enforced for this
  reset; the flat roadmap runner does not enforce it automatically

## Decision

The 2026-06-25 hard freeze on all new first-round work is superseded only to
allow a bounded, metadata-only Adaptive MCQ Foundation lane.

This decision does not authorize:

- first-round learner runtime mutation or activation;
- first-round navigation, onboarding, pricing, or public product claims;
- Owner Alpha, Preview, Production, flag, secret, or allowlist changes;
- Golden content import, D0, D+1, D+7, or real learner execution;
- schema, migration, persistence, RLS, provider, model, prompt, or dependency
  activation;
- billing, entitlement, checkout, refund, pricing, or telemetry Production
  activation;
- Academy runtime or both-track runtime;
- Mineral Cobalt, Figma, or home implementation.

The second-round invitation-only Founding Beta remains the critical release
path. It is a predecessor of, and is not equivalent to, S225 public
self-serve launch acceptance.

## Scoped supersession

The following prior statements are historical after this decision:

- the first-round hard-freeze clauses dated 2026-06-25;
- the July 16 control-plane and execution prompt pack;
- the July 22 #644 handoff;
- any plan that makes S225 ready before private Founding Beta evidence;
- any statement that treats S222 source-contract completion as Academy
  runtime readiness;
- any statement that aliases `usable_review_unit_v1` to a Deep Review Unit;
- any statement that allows private raw content to promote automatically into
  a shared corpus.

All other second-round safety, source, rights, quality, authority, privacy,
learner/Academy separation, and public-launch safeguards remain in force.

## S233 coordinated override

The frozen S233 lane contract lists `AGENTS.md` and
`roadmap/active-program.yml` as shared files that ordinary S233 lane work must
not edit. This Owner O1 decision is the explicit coordinated override for this
one global reset. It does not reopen either S233 lane, change its executable
contracts, or authorize any runtime or content work.

## Exact owned-file manifest

This reset owns exactly these paths:

1. `AGENTS.md`
2. `config/dabangil-unified-program-contract.json`
3. `docs/dabangil-unified-program-contract.md`
4. `docs/decisions/2026-07-23-post-650-unified-program-reset.md`
5. `docs/inverge-second-round-final-product-spec.md`
6. `docs/dabangil-second-exam-premium-os.md`
7. `docs/inverge-master-roadmap.md`
8. `docs/inverge-product-brief.md`
9. `docs/inverge-product-constitution.md`
10. `docs/inverge-data-boundary.md`
11. `docs/inverge-data-governance.md`
12. `docs/inverge-business-model.md`
13. `docs/dabangil-deep-review-unit-policy.md`
14. `docs/inverge-curriculum-system.md`
15. `docs/inverge-study-schedule-system.md`
16. `roadmap/active-program.yml`
17. `tests/agent-factory-roadmap-runner.test.mjs`
18. `tests/dabangil-premium-alignment.test.mjs`
19. `tests/inverge-product-constitution.test.mjs`
20. `tests/inverge-roadmap-curriculum-docs.test.mjs`
21. `tests/practice-answer-review-engine.test.mjs`
22. `tests/theory-answer-review-engine.test.mjs`
23. `tests/s214-reference-answer-pipeline.test.mjs`
24. `tests/s215-reference-answer-release-gate.test.mjs`
25. `tests/s216-error-notebook-gap-taxonomy.test.mjs`
26. `tests/s217-personal-core-concept-graph.test.mjs`
27. `tests/s218-similar-question-review-scheduler.test.mjs`
28. `tests/s219-learner-catalog-usage-ledger.test.mjs`
29. `tests/s220-billing-entitlement-credit-usage.test.mjs`
30. `tests/s221-paid-trust-privacy-cost-guardrails.test.mjs`
31. `tests/s222-academy-answer-operations-tenant-boundary.test.mjs`
32. `tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs`
33. `tests/s224-three-subject-learner-runtime-acceptance.test.mjs`
34. `docs/agent-factory-github-actions-button.md`
35. `tests/agent-factory-github-actions-button.test.mjs`

No app, API, component, database, migration, workflow, package, lockfile,
environment, content fixture, Golden input, or deployment path is owned.

## Safe state after merge

After this reset merges:

- exactly the second-round Golden 3 readiness slice and first-round Foundation
  slice are runner-ready;
- neither slice is automatically started or reserved;
- every execution, activation, public, commercial, both-track, Academy, brand,
  and shared-model item remains queued behind unmet dependencies;
- the post-merge orchestrator remains metadata-only and cannot dispatch,
  branch, commit, push, open, merge, or activate work.

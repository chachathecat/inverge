# QF-S3 validation

## Scope

- Tracking issue: #875
- Final branch base: `761b7f6b7648d19845ab3385665e92046165dddd`
- Final branch base tree: `c6c6a8ad876c2f40b5276a26485b088656addf49`
- Changed paths: exactly the six QF-S3 paths recorded in the machine contract
- APP-1 terminal receipt: blocked Draft PR #876, exact head
  `0685ae1266c842e7a3d03bef20ce4ba2369bf961`, actionable P0/P1/P2 `0/1/0`
- Reconstruction: final protected-main branch with no imported scratch ancestry

Final exact-head CI and formal review remain required after publication.

## Deterministic and hostile evidence

The focused suite covers:

- deterministic one-variant and multi-variant chronology construction;
- input-order and process-locale independence;
- equal-time topological ordering;
- final-validator, judge, critic, variant-aggregate, transfer-aggregate, and
  meta-audit causal gates;
- missing declared validator and missing independent validation as
  `INCOMPLETE`, never `COMPLETE`;
- solver/judge execution reuse, judge/critic execution-artifact reuse, and
  model-version relabeling failure;
- predecessor output drift and candidate/QF-S1/QF-S2 binding drift;
- cycles, duplicates, missing predecessors, and child-before-parent time;
- exact field closure, proxy rejection, body exclusion, and lifecycle/authority
  exclusion;
- provider/network/database/persistence/remote/Production absence.

The suite also confirms discovery of the inherited focused QF-0A1, QF-0A2,
QF-0B, QF-0I, QF-S1A, QF-S1B, and QF-S2 tests. Final evidence must actually
rerun those suites on the refreshed final head.

## Required final-head gates

After APP-1 reaches a terminal receipt and QF-S3 is reconstructed on refreshed
protected main, run once:

1. complete QF-S3 focused suite;
2. inherited QF-0/QF-S1/QF-S2 focused suites;
3. JSON and dependency identity checks;
4. exact six-path manifest;
5. typecheck and changed-file lint;
6. `git diff --check`;
7. production build only if the current repository policy requires it;
8. repository-required exact-head CI;
9. one fresh exact-head formal review with actionable P0/P1/P2 `0/0/0` and
   zero unresolved actionable threads.

Do not run PostgreSQL, migrations, remote Supabase, Production, provider, or
runtime validation for this source-only foundation.

## Final local candidate result

- QF-S3 focused: 26/26 passed.
- Inherited behavioral assertions: 200/200 applicable assertions passed; nine
  predecessor-only branch/aggregate-manifest assertions are intentionally not
  descendant-branch behavior evidence.
- Typecheck, changed-file lint, JSON identity, exact six-path manifest, and
  `git diff --check`: passed.
- Independent local adversarial audit: actionable P0/P1/P2 `0/0/0`.

This document records no exact-head CI or formal-review pass before those
GitHub gates complete. QF-I1 remains unstarted.

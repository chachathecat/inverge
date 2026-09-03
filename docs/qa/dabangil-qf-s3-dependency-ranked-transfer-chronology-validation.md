# QF-S3 validation

## Scope

- Tracking issue: #875
- Final branch base: `4aa0d84e0d8d9255e74a7b6428aca99e25a4218e`
- Final branch base tree: `03aba98a8b47957dc0fd9f3dc4d8e45d40b1df33`
- Changed paths: exactly the six QF-S3 paths recorded in the machine contract
- APP-1 terminal receipt: merged PR #876, approved head
  `2ef4a127fb17d29dbd709a3b101a1daa09212388`, resulting main
  `4aa0d84e0d8d9255e74a7b6428aca99e25a4218e`, resulting tree
  `03aba98a8b47957dc0fd9f3dc4d8e45d40b1df33`, actionable P0/P1/P2
  `0/0/0`
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

The capacity fixture constructs the complete advertised maximum: 8 variants,
4 declared validators per variant, 76 receipts, 76 used actors, and a transfer
aggregate with 9 predecessors. Creation, assertion, canonicalization, and
canonical digesting all succeed. The canonical closed snapshot is 154,625
UTF-8 bytes, below QF-0A1's unchanged 262,144-byte ceiling. A ninth variant,
fifth validator, seventy-seventh receipt, actor overflow, orphan actor, and
unknown receipt actor all fail closed. Reversed input order produces the same
chronology, and the existing locale test remains green.

The suite also confirms discovery of the inherited focused QF-0A1, QF-0A2,
QF-0B, QF-0I, QF-S1A, QF-S1B, and QF-S2 tests. Final evidence must actually
rerun those suites on the refreshed final head.

## Required final-head gates

On the clean replacement reconstructed from the validated APP-1 resulting
main, run once:

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

- QF-S3 focused: 31/31 passed.
- Inherited behavioral assertions: 200/200 applicable assertions passed; nine
  predecessor-only branch/aggregate-manifest assertions are intentionally not
  descendant-branch behavior evidence.
- Typecheck and changed-file lint: passed.
- JSON identity (20 dependency file identities), exact six-path manifest, and
  `git diff --check`: passed.
- QF-S3 config SHA-256:
  `3067a43771ccbb2df3e85a7f4f65f6bbf348255a31173539ce42963aab2c0db0`.
- QF-S3 contract implementation SHA-256:
  `d6ebd98d3807dcc3a5d8fe3d0afca4eaeeb803ee45b56b3ea04ec0692c5feedd`.
- QF-S3 core implementation SHA-256:
  `8a672200a20504aa497f87a4cda15eea10a8e71c24426acdc3986ebb7cd8c115`.
- QF-S3 source-only boundary receipt digest:
  `sha256:59d1f6122332905ef60776e5cf11f0276e14d2f61650306d5013e90fb8cf9076`.

This document records no exact-head CI or formal-review pass before those
GitHub gates complete. QF-I1 remains unstarted.

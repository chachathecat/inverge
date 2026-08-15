# C2R-B Typed Subject Proof Validation

## Executable source-contract command

```bash
node scripts/run-node-tests.mjs tests/c2r-b-typed-subject-proof-contract.test.mjs tests/rights-safe-adaptive-variant-foundry-contract.test.mjs tests/wcv-c2r-structural-recovery-authority.test.mjs tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs tests/dabangil-unified-product-multisurface-launch-authority.test.mjs
```

## Required assertions

| ID | Assertion |
|---|---|
| C2RB-UNION-001 | `RepairAnchorV1` has exactly the Practice, Theory and Law members and discriminator kinds. |
| C2RB-REF-002 | Every stable/version identity is unique, every declared edge resolves exactly once, anchor ID/version/subject resolve as one composite target, and the graph has no cycle. |
| C2RB-PRACTICE-003 | Roles/operator/order/result/unit/sign/rounding/transformation validate deterministically; disconnected numbers, substrings and overflow cannot pass. |
| C2RB-THEORY-004 | Evidence stays inside the selected target; mismatch, same-target mixed polarity, unscoped anaphora and overflow fail closed while alternatives remain target-scoped. |
| C2RB-LAW-005 | Source, source version, anchor, anchor version, locator, effective window, applicable date, currentness and zero blockers resolve as one exact binding; label-only, stale or unresolved input cannot pass. |
| C2RB-GENERIC-006 | Token presence is candidate evidence only and cannot create verification, proof, transfer or mastery. |
| C2RB-TUTOR-007 | Prediction/self-diagnosis precede help, private input modes and three continuation commands are exact, and shortcuts create no verified evidence. |
| C2RB-ALLOC-008 | Only #714 allocation C2 is complete; #714 remains open and C3/C4/C6 stay preserved. |
| C2RB-STAGE-009 | One format-invariant machine/prose tuple points to `WCV-C2/C2/#717/C2R-C-P/#703`, authorized and unstarted, only after terminal A+B evidence. |
| C2RB-FREEZE-010 | Three successor stages remain complete subject runtime outcomes; no horizontal runtime foundation or activation is introduced. |
| C2RB-PRECEDENCE-011 | The later B decision precedes A and structural decisions only for its exact scope; dated predecessor records remain unchanged. |
| C2RB-MANIFEST-012 | The Git diff is exactly the frozen 18-path manifest and includes no runtime path. |

## Hostile fixture matrix

- Practice: disconnected exact numbers, colliding numeric substrings, swapped
  noncommutative operands, incompatible units, wrong sign, wrong rounding,
  unsupported transformation and overflow all remain unverified.
- Theory: cross-target support, same-target positive/negative conflict,
  forbidden mixed polarity, unresolved pronoun, unscoped assertion and
  occurrence overflow fail closed; alternatives cannot migrate to another
  target.
- Law: label-only currentness, unresolved ID, duplicate target, stale source
  version, wrong anchor version, locator drift, version drift, date outside the
  effective window and an open blocker all remain unverified.
- Reference graph: independently resolvable but mismatched anchor ID/version
  pairs and cross-subject obligation bindings fail closed.

## Full validation

Run the focused command, affected Agent Factory suite, default Node suite,
JSON/YAML parse, typecheck, lint, production build and `git diff --check`.
Lint warnings in untouched files and the known repository-external sandbox RSS
compatibility requirement must be reported honestly; neither is converted
into runtime evidence.

This validation uses synthetic metadata only. It performs no runtime,
database, provider, learner, payment, deployment or Production action.

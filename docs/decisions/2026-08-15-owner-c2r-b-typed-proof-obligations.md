---
document_title: "Owner Decision — C2R-B Typed Subject Proof Obligations"
status: "owner-decision/approved-source-contract-only"
decision_id: "owner_c2r_b_typed_proof_obligations_2026_08_15"
dated: "2026-08-15 KST"
repository: "chachathecat/inverge"
stage_id: "C2R-B"
stage_issue: 714
recovery_tracker_issue: 717
replacement_tracking_issue: 725
predecessor_decision: "docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md"
structural_chain_decision: "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md"
repository_authority_effective_on: "expected_head_pinned_squash_merge_and_validated_receipt"
completed_issue_714_allocation: "C2"
issue_714_closure_allowed: false
remaining_issue_714_allocations: ["C3", "C4", "C6"]
post_merge_current_replacement_stage: "C2R-C-P"
post_merge_current_replacement_stage_issue: 703
automatic_start_allowed: false
runtime_authorization: "none"
application_authorization: "none"
api_authorization: "none"
database_authorization: "none"
provider_authorization: "none"
learner_activation_authorization: "none"
payment_authorization: "none"
deployment_authorization: "none"
production_authorization: "none"
---

# Owner Decision — C2R-B Typed Subject Proof Obligations

## 1. Exact authority and precedence

Install the typed subject proof-obligation architecture as the independently
complete C2R-B source outcome. This later decision supersedes the 2026-08-15
C2R-A decision only for the repository state after C2R-B succeeds: C2R-B is
complete source-only, Issue #714's C2 allocation is complete, and C2R-C-P/#703
is the next authorized but unstarted stage.

The C2R-A decision remains controlling for its rights-safe foundry, manifest
binding and terminal A evidence. The 2026-08-14 structural-recovery decision
still controls PR #716, Tracker #717, the five-stage serial chain, complete
subject runtime-vertical boundaries, one writer, no automatic start, and the
21-row carry-forward matrix. The 2026-08-11 decision controls unaffected
campaign scope. Dated decisions remain immutable historical evidence.

Repository authority becomes effective only after an expected-head-pinned
squash merge and a live-validated `MergeCoverageReceiptV1` on #717. An issue
state, issue closure, candidate commit, CI result or tracker comment alone
cannot substitute for that terminal stage merge and receipt.

V13 remains the sole active master. WCV `1.0.8`, WCV-C2 and ULC-0 remain
subordinate. This decision creates no runtime, application, API, persistence,
migration, RLS, Storage, provider, learner-data, real-content, payment, store,
deployment or Production authority.

## 2. Typed repair-anchor union

The exact union is:

```ts
type RepairAnchorV1 =
  | CalculationRelationAnchorV1
  | ScopedPredicateAnchorV1
  | LawApplicabilityAnchorV1;
```

There are exactly three discriminator values. A fourth generic anchor, an
untyped fallback, a subject alias or a status-only proof is prohibited.

Every proof obligation, anchor, policy, Tutor episode interface, subject
vertical freeze, Law source, Law anchor, Law anchor version and Law binding
has a stable identity. Semantic changes create a new version identity. The
machine contract lists every internal edge. Missing, duplicate, unresolved,
multi-target, cross-subject or cyclic references fail closed.
The proof obligation's `anchorId`, `anchorVersionId` and subject are one
correlated binding to one anchor record and discriminator subject; resolving
the two scalar identities independently is insufficient.

## 3. Practice calculation-relation proof

`CalculationRelationAnchorV1` binds unique operand roles, an operator, exact
operand order, result, compatible units, sign, rounding mode and scale, one
supported transformation and a deterministic validator identity.

The validator proves the relation, not the presence of its numbers. It rejects
substring collisions, disconnected values, missing roles, duplicated roles,
order drift, unit mismatch, sign mismatch, unsupported transformations and
overflow. Commutative reorder is allowed only for the explicitly listed ADD
or MULTIPLY transformation. SUBTRACT and DIVIDE remain ordered.

## 4. Theory target-scoped predicate proof

`ScopedPredicateAnchorV1` binds one exact target scope, aliases scoped to that
target, required and forbidden predicates, target-scoped acceptable
alternatives, distinct counterexample scopes, explicit polarity, anaphora
resolution and bounded occurrence limits.

Evidence about a different target cannot satisfy the selected target. A
same-target positive and negative assertion is `AMBIGUOUS`, not satisfied.
Negated required support is partial; an asserted forbidden predicate blocks
release, including mixed-polarity assertive ambiguity. Unresolved anaphora,
unscoped assertions and overflow fail closed. A clean statement about an
explicitly distinct counterexample cannot erase a conflict on the selected
target.

## 5. Law exact applicability proof

`LawApplicabilityAnchorV1` binds the exact source ID and version, Law anchor ID
and anchor-version ID, locator, version identity, effective-from/effective-to
window, applicable-as-of date, current-law applicability and active blocker
state through one exact `LawSourceBindingV1`.

Every binding reference resolves exactly once. The selected date lies inside
the effective window, the source and anchor versions match the binding, the
locator and version identity match exact registry bytes, the binding is
current for that date, and the unique open blocking-reference count is zero.
Status labels such as `CURRENT`, `verified` or `applicable` alone prove
nothing. Unresolved or ambiguous bindings block; version drift is stale;
locator, date or blocker mismatch blocks release.

## 6. Universal fail-closed proof boundary

Generic string or token presence is candidate evidence only. It cannot alone
create satisfied, verified, a calculation relation, target-scoped support,
current-law applicability, transfer qualification or mastery.

The evaluation states are `PASS`, `PARTIAL`, `AMBIGUOUS`, `UNSUPPORTED`,
`BLOCKED` and `STALE`. Only a subject validator may emit `PASS`; every other
state is unverified. Required-claim ambiguity is unsatisfied. Assertive
ambiguity around a forbidden claim is release-blocking. Unsupported input and
bounded-evaluation overflow fail closed.

## 7. Future shared Tutor episode interface

The source contract freezes a future interface, not runtime. Its ordered
phases are independent commit, prediction, learner self-diagnosis, server
diagnosis, bounded path selection, smallest scaffold, independent
reconstruction, same-session application, typed validation and continuation.
Prediction and learner diagnosis precede server diagnosis or help.

Private artifacts accept only the future typed, photo, PDF, voice and
structured-selection modes. The continuation commands are
`VERIFY_AND_CONTINUE`, `DEFER_FOR_NOW` and `SWITCH_TO_GUIDED`. Save, upload,
view, skip, defer or guided exit cannot create verified evidence. Assistance
starts at zero, the first scaffold is level one, and level three is an honest
guided exit. A same-session episode establishes neither mastery, transfer nor
stability.

This closes only the eight Issue #714 requirements allocated to C2:

- adaptive expertise controller;
- cognitive-load budget;
- concept-repair need decision;
- private typed/photo/PDF/voice/structured artifact modes;
- progression gate and three continuation semantics;
- episode prediction and self-diagnosis;
- initial fading and control transfer; and
- same-session reconstruction/application with no shortcuts.

## 8. Complete subject-runtime architecture freeze

The successor stages remain complete outcomes:

| Stage | Subject proof | Runtime boundary |
|---|---|---|
| C2R-C-P | calculation relation | first shared Tutor substrate plus every changed fixture/persistence/RLS/server/CAS/API/UI/evidence/safe-deferred/rollback layer |
| C2R-C-T | target-scoped predicate | complete Theory delta and rollback independent of Practice |
| C2R-C-L | exact Law applicability | complete Law delta and rollback independent of Practice and Theory; terminal WCV-C2 closeout |

No shared foundation, validator-only, fixture-only, persistence-only, API-only
or UI-only runtime PR is allowed. The common runtime substrate may first land
inside C2R-C-P. The C2R-B merge and validated receipt authorize C2R-C-P as
unstarted; they do not start or activate it.

## 9. Issue #714 allocation boundary and resulting state

After the terminal B merge and receipt:

- only #714 allocation C2 is complete;
- Issue #714 remains open and cannot be closed by C2R-B;
- C3, C4 and C6 allocations remain intact;
- C2R-C-P requires validated terminal A and B stage evidence;
- issue state cannot substitute for either merge;
- C2R-C-P/#703 is authorized but unstarted;
- #703, #704, #705, #706 and #717 remain open;
- all 21 donor matrix rows remain uncovered; and
- runtime and every activation flag remain false.

The canonical current-stage tuple is
`WCV-C2 / C2 / #717 / C2R-C-P / #703 / authorized_unstarted`.

## 10. Exact owned-path manifest

This source-contract stage owns exactly:

1. `AGENTS.md`
2. `roadmap/active-program.yml`
3. `config/dabangil-unified-program-contract.json`
4. `config/dabangil-unified-product-multisurface-launch-v1.json`
5. `docs/dabangil-unified-program-contract.md`
6. `docs/inverge-master-roadmap.md`
7. `docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md`
8. `docs/strategy/dabangil-c2r-b-typed-subject-proof-architecture-v1.md`
9. `config/dabangil-c2r-b-typed-subject-proof-architecture-v1.json`
10. `docs/qa/c2r-b-typed-subject-proof-validation.md`
11. `tests/c2r-b-typed-subject-proof-contract.test.mjs`
12. `tests/rights-safe-adaptive-variant-foundry-contract.test.mjs`
13. `tests/wcv-c2r-structural-recovery-authority.test.mjs`
14. `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
15. `tests/dabangil-unified-product-multisurface-launch-authority.test.mjs`
16. `scripts/run-node-tests.mjs`
17. `docs/strategy/ACTIVE-MASTER-PLAN.md`
18. `docs/strategy/dabangil-unified-product-multisurface-launch-v1-2026-08-14.md`

No runtime path or other file is authorized.

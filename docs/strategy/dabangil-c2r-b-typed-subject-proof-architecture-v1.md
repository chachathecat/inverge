---
document_title: "Dabangil C2R-B Typed Subject Proof Architecture v1"
status: "source-contract/frozen-no-runtime"
contract_id: "dabangil.c2r_b.typed_subject_proof_architecture.v1"
version: "1.0.0"
stage: "C2R-B"
issue: 714
tracking_issue: 725
runtime_authorization: "none"
activation_authorization: "none"
---

# Dabangil C2R-B Typed Subject Proof Architecture v1

## Contract boundary

This is the source-only contract consumed by the future Practice, Theory and
Law complete runtime verticals. It defines what constitutes proof; it does not
implement an evaluator, Tutor, API, database, UI, fixture bank or activation.

The canonical machine mirror is
`config/dabangil-c2r-b-typed-subject-proof-architecture-v1.json`. If this prose
and that mirror diverge, validation fails closed. The canonical post-merge
tuple is `WCV-C2 / C2 / #717 / C2R-C-P / #703 / authorized_unstarted`.

## Exact union and stable graph

```ts
type RepairAnchorV1 =
  | CalculationRelationAnchorV1
  | ScopedPredicateAnchorV1
  | LawApplicabilityAnchorV1;
```

Exactly three anchor kinds exist. Each anchor has `anchorId` and
`anchorVersionId`. Each proof obligation has stable and version identities and
references exactly one anchor ID/version, evaluation policy and shared Tutor
episode interface. Subject freeze records reference exactly one proof
obligation. Law bindings additionally resolve exact source, source version,
Law anchor and anchor version. Every edge is listed in the machine graph;
missing, duplicated, unresolved, ambiguous, cross-subject or cyclic references
are blocking.

## Practice — calculation relation

A Practice proof is a typed relation:

```text
ordered operand roles + operator
→ unit-compatible signed result
→ declared rounding
→ supported transformation
→ deterministic validator
```

Operand roles are unique and the ordered role list covers them exactly once.
SUBTRACT and DIVIDE cannot commute. ADD and MULTIPLY commute only under their
named transformations. Results must match unit, sign, rounding mode and scale.
The occurrence of all expected numbers in unrelated clauses is
`UNSUPPORTED`; substring numeric matching and overflow are also unsupported.

## Theory — target-scoped predicate

A Theory proof resolves one target scope exactly. Aliases and acceptable
alternatives never escape that target. Required and forbidden predicates keep
explicit polarity. Evidence about another target is unsupported; same-target
mixed polarity is ambiguous; a forbidden positive occurrence blocks even if a
negative occurrence is also present. Required negation is partial. Unresolved
anaphora, unscoped assertions and bounded-parser overflow cannot pass. A
distinct explicit counterexample remains separate and cannot erase a target
conflict.

## Law — exact applicability

A Law proof resolves this complete tuple exactly:

```text
sourceId + sourceVersionId
+ lawAnchorId + lawAnchorVersionId
+ exactLocator + exactVersionIdentity
+ effectiveFrom/effectiveTo + applicableAsOf
+ current-law applicability + zero active blockers
```

The binding, source and anchor registries must agree byte-for-byte on their
identities, locator, version and effective window. Missing or ambiguous
bindings are blocked. Drift is stale. A date outside the effective window,
locator/version mismatch or any unique referenced open blocking item is
blocked. Labels such as `CURRENT`, `verified` or `applicable` are candidate
metadata only and cannot establish applicability.

## Universal evaluation

The only states are `PASS`, `PARTIAL`, `AMBIGUOUS`, `UNSUPPORTED`, `BLOCKED`
and `STALE`; only `PASS` is verified and only the subject validator may emit
it. Token/string presence is candidate evidence only. It cannot establish
satisfied, verified, relation, scoped support, applicable current Law,
transfer or mastery. Required ambiguity is unsatisfied; assertive ambiguity
around forbidden content is release-blocking; unsupported input and overflow
fail closed.

## Future Tutor interface and C2 allocation

The future shared interface orders independent commit, learner prediction,
self-diagnosis, server diagnosis, adaptive path selection, the smallest
scaffold, independent reconstruction, same-session application, typed
validation and one of the three continuation commands. It accepts future
private typed/photo/PDF/voice/structured artifacts. Save, upload, view, skip,
defer and guided exit create no verified evidence. Assistance begins at zero;
level one is the first scaffold; level three is an honest guided exit.

These rules complete only #714's C2 allocation. #714 stays open. Its C3, C4
and C6 allocations remain untouched.

## Frozen successor architecture

C2R-C-P, C2R-C-T and C2R-C-L remain complete Practice, Theory and Law runtime
outcomes. Each owns its matching typed validator and fixtures plus every
changed persistence/RLS/server/CAS/API/UI/runtime-evidence/safe-deferred and
rollback layer. The common Tutor substrate first lands within C2R-C-P. No
horizontal runtime foundation is allowed.

The terminal B merge and receipt authorize C2R-C-P as unstarted. An Issue #714
state cannot replace the stage merge. This contract starts nothing and all
runtime, learner, provider, payment, deployment and Production flags remain
false.

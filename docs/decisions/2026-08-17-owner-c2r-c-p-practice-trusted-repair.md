---
document_title: "Owner Decision — C2R-C-P Complete Practice Trusted Repair"
status: "owner-decision/approved-candidate-runtime-stage"
decision_id: "owner_c2r_c_p_complete_practice_trusted_repair_2026_08_17"
dated: "2026-08-17 KST"
repository: "chachathecat/inverge"
roadmap_item_id: "WCV-C2"
campaign_id: "C2"
recovery_tracker_issue: 717
stage_id: "C2R-C-P"
stage_issue: 703
acceptance_contribution_issues: [704, 705]
predecessor_decision: "docs/decisions/2026-08-15-owner-c2r-b-typed-proof-obligations.md"
structural_chain_decision: "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md"
delivery_control_decision: "docs/decisions/2026-08-16-owner-github-native-delivery-control.md"
repository_authority_effective_on: "expected_head_pinned_squash_merge_and_validated_github_receipt"
post_merge_current_replacement_stage: "C2R-C-T"
post_merge_current_replacement_stage_issue: 703
post_merge_stage_state: "authorized_unstarted"
issue_703_closure_allowed: false
issue_704_closure_allowed: false
issue_705_closure_allowed: false
runtime_authorization: "owner_only_nonproduction_default_disabled"
remote_database_apply_authorization: "none"
provider_authorization: "none"
real_learner_authorization: "none"
payment_authorization: "none"
deployment_authorization: "none"
production_authorization: "none"
---

# Owner Decision — C2R-C-P Complete Practice Trusted Repair

## 1. Exact authority and effective state

This decision installs the first complete learner-visible runtime stage in the
WCV-C2 replacement chain. It implements only the Practice outcome authorized
by C2R-C-P: one typed calculation-relation proof, the shared Tutor episode
substrate needed by that outcome, matching synthetic Golden and Owner-Gold
fixtures, forced-RLS persistence, service-only CAS/idempotent transitions,
the API, the Owner-only learner UI, hostile tests, disposable browser-to-
Postgres evidence, a default-off boundary and an independent kill switch.

The C2R-A rights firewall and C2R-B typed proof architecture remain controlling
for their exact contracts. The structural-recovery decision continues to own
the five-stage chain, issue closure and regression-row allocation. The
GitHub-native delivery decision controls writer count, checks, exact-head
review, correction/re-plan budgets, expected-head squash merge and automatic
continuation of the next dependency-ready non-Production stage.

This candidate becomes repository authority only after all native required
checks are green on the current head, all actionable review threads are
resolved, a fresh exact-head review is clean, GitHub performs the expected-
head-pinned squash merge, main is validated, and Tracker #717 receives one
live-state-validated merge receipt. Repository summaries are not independent
trust roots.

After that receipt, C2R-C-P is complete and C2R-C-T/#703 is the current
authorized but unstarted stage. The automatic non-Production continuation
policy may start C2R-C-T without routine Owner confirmation. Issues #703,
#704 and #705 remain open; only C2R-C-L may close them or complete WCV-C2.

## 2. Exact Practice proof

The only implemented subject is `appraisal_practical`. The sole proof anchor
is `repair-anchor:practice:synthetic-net-income@1`, a
`CalculationRelationAnchorV1` that requires:

- gross income `120,000,000 KRW/year` as the first operand;
- operating expense `20,000,000 KRW/year` as the second operand;
- ordered `SUBTRACT`;
- result `100,000,000 KRW/year`;
- a positive sign stated without an unresolved negative conflict;
- `HALF_UP`, scale zero, expressed as no rounding; and
- deterministic validator `validator:practice-calculation-relation@1`.

Only `PASS` creates same-session `verified`. Missing relations are `PARTIAL`;
disconnected numeric presence is `UNSUPPORTED`; conflicting relations are
`AMBIGUOUS`. Substring collisions, a currency substring inside `원인`, missing
operand roles, wrong order/operator/result/unit/sign/rounding, and unsupported
relations cannot verify. Generic token or number presence creates no proof,
transfer, mastery, stability, score or pass claim.

## 3. Rights-safe fixture and content boundary

The stage contains exactly seven Inverge-original synthetic Practice fixtures:
Learning canonical/near-miss/counterexample/flip-condition assets, two sealed
Transfer variants and one Measurement asset. Only the canonical Learning
fixture is runtime-supported. Bank gaps produce a bodyless scarcity event and
cannot self-publish or self-promote.

There are exactly two adjudicated synthetic proof samples: one `GOLDEN` PASS
and one `OWNER_GOLD` disconnected-numbers negative fixture. Every fixture use
revalidates the exact active `RightsManifestV1` and source-decision identity,
version, class, Owner-test-only purpose, KR territory and validity window.
User-private, academy/commercial-textbook, unknown-rights and blocked classes
fail closed. No learner body, third-party body or fixture body is authorized
for training, sharing or provider use.

## 4. Complete Tutor and persistence outcome

The learner order is capture revision, prediction, independent attempt,
self-diagnosis, server diagnosis, smallest-scaffold exposure, independent
reconstruction, typed verification and one of the three frozen continuation
commands. Exposure is committed atomically before help bytes are returned.
Guided mode is assistance level three and creates no independent credit.
Partial remains in the same durable session with at most one immediate retry.

Canonical session metadata is bodyless. Learner bodies are append-only in the
service-role-only private-artifact table. All five stage tables use forced RLS.
Authenticated learners may read only their own bodyless session metadata and
cannot directly mutate it, read private bodies, call stage RPCs, or cross a
tenant boundary. Service transitions require exact user, state and record
version, write one idempotency receipt, and atomically commit artifacts or
exposure before the state change.

The required native `runtime-gate` owns an exact closed adapter for this
migration and proves forced RLS, Practice-only constraints, anonymous and
cross-user denial, private-body denial, service-only RPCs, idempotent replay,
stale CAS rejection, atomic exposure/state writes and typed proof persistence
inside a disposable network-isolated Postgres container. A separate exact-head
workflow proves the complete local Auth → browser → Next → PostgREST/Postgres
path across two synthetic users, three responsive widths and five input modes.

## 5. Regression-row candidate allocation

This stage may move only rows 1, 2, 4, 6, 8, 9, 10, 11, 12, 14 and 19 from
`uncovered` to `candidate_coverage_pending_exact_merge`. Their exact assertion
IDs are `C2R-C-P-R01`, `R02`, `R04`, `R06`, `R08`, `R09`, `R10`, `R11`,
`R12`, `R14` and `R19`. The live PR number is recorded in the matrix after the
focused PR exists. Candidate coverage becomes effective only after the exact
merge and validated Tracker #717 receipt. Common rows 1, 4, 6, 8, 11 and 14
remain mandatory inherited regressions in C2R-C-T and C2R-C-L.

## 6. Safe-deferred and rollback boundary

The feature flag is `WCV_C2R_C_P_PRACTICE_ENABLED`; its repository default is
false. Access additionally requires an authenticated email in the existing
admin allowlist. The API checks the flag and identity before parsing a request
body and returns only a no-store not-found shape when inaccessible.

Rollback is forward-only and non-destructive: set or keep the flag false,
remove the Owner-only navigation path in a later PR if needed, and leave the
append-only migration unapplied outside disposable CI. This stage authorizes
no remote Supabase migration/RLS/Storage apply, Production change, deployment,
provider call, real learner/instructor, payment, public release or destructive
data operation. Theory and Law runtime, fixtures and activation remain absent
and independently owned by C2R-C-T and C2R-C-L.

## 7. Owned-path manifest

The stage candidate owns only its dated decision and machine contract, the
Practice trusted-repair contract/fixtures/engine/source binding, repository and
service, migration, API/page/components and gated shell integration, exact
runtime workflow/verifier/local fixture/e2e files, required runtime-gate
adapter and tests, regression matrix, authority mirrors and test registration.
It does not alter dependencies, lockfiles, Production configuration or any
remote runtime state.

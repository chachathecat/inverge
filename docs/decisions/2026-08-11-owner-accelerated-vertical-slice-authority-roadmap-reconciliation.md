---
document_title: "Owner Decision — Accelerated Vertical-Slice Authority and Roadmap Reconciliation"
status: "owner-decision/approved-source-only"
decision_id: "owner_wcv_campaign_c1_vertical_slice_reconciliation_2026_08_11"
dated: "2026-08-11 KST"
repository: "chachathecat/inverge"
lead_issue: 713
active_master_plan: "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md"
subordinate_execution_standard: "config/dabangil-appraiser-second-world-class-vertical-v1.json@1.0.8"
unified_program_contract: "dabangil.unified_program.v3"
runtime_authorization: "none"
application_authorization: "none"
real_content_authorization: "none"
learner_activation_authorization: "none"
commercial_activation_authorization: "none"
production_authorization: "none"
---

# Owner Decision — Accelerated Vertical-Slice Authority and Roadmap Reconciliation

## 1. Decision

V13 remains the sole active master plan. No V14, V13.1, second active master,
or competing mastery authority is created.

The merged Appraiser Second World-Class Vertical Execution Standard `1.0.8`
is recognized only as a subordinate V13 execution standard. Its learning,
rights, evidence, exposure, independence, D+1, D+7, timed-recurrence, privacy,
rollback and activation gates remain controlling. This decision changes its
delivery model and campaign graph; it does not change its learner behavior
contract or version.

The delivery model is now:

> one merge-producing Work, one writing branch, one writing PR, and one writer;
> each runtime PR delivers one complete learner-visible vertical across every
> layer required by that outcome.

Read-only research and non-overlapping inspection may run concurrently inside
the one Work. They may not mutate shared authority, implementation state,
GitHub issue metadata, the writing branch, or the writing PR.

## 2. Exact supersession

This dated Owner decision explicitly supersedes the following operating rules
for future WCV delivery:

- `AGENTS.md` clauses requiring one issue per PR and exactly one closing issue;
- any interpretation of roadmap WIP 2 as permission for two merge-producing
  writers;
- contract/API/storage/runtime/UI/QA layer-by-layer PR sequencing for behavior
  promised by one learner-visible vertical;
- contract-only precursor PRs for behavior implemented by the same vertical;
- the standalone sequence `#702 source-only → #714 source-only → #703`;
- Issue #701 comment `5237524452` where it is read as a separate-PR child map;
- Issue #701 comment `5247765033` requiring #714 as a separate architecture-
  freeze PR;
- Issue #702 comment `5247768383` requiring #714 after a standalone #702 PR;
- Issue #703 comment `5247767476` requiring a terminal standalone #714 merge;
- Issue #713 comment `5247766274` preserving the old standalone sequence; and
- the standalone-prerequisite and architecture-freeze language in Issue #714.

Those records remain historical evidence. They are not deleted and do not
control after this decision. Source-only completion never becomes runtime,
content, privacy, commercial, efficacy or Production readiness.

The V13 statement that the whole program must not be one large runtime PR is
preserved as an outcome-size boundary. It does not authorize horizontal layer
splits. If a learner outcome is too large, reduce the outcome while keeping its
required layers together.

## 3. Single-writer delivery rule

At every point in time, the maximum is:

```text
merge-producing Work: 1
writing branch:        1
writing PR:            1
mutation writer:       1
```

The roadmap runner still counts `blocked` items as occupied WIP. CPF-1 and
S236P are both factually blocked, so the runner capacity is reconciled as:

```text
program.wipLimit = 3
= 2 truthful blocked control-plane reservations
+ 1 merge-producing delivery slot
```

`wipLimit: 3` is not permission for three writers. The global merge-producing
writer limit remains exactly one. The WCV campaign items share one flat
`lockGroup` and are dependency-ordered. Both executable selectors additionally
treat `program.globalMergeProducingWriterLimit` as fail-closed executable
authority. They count raw `active`, `in_progress`, `in_review` and `pr_open`
aliases as writers even when their dependencies are invalid; `blocked` and
`human_decision` items reserve WIP but do not consume writer capacity. Distinct
lock groups cannot bypass the cap.

This is per-plan selection enforcement, not a cross-process distributed writer
lease. The Owner prohibition on concurrent merge-producing Work remains
controlling across independently launched Work windows.

## 4. Vertical closure rule

One PR may close multiple adjacent child issues only when all included issues
jointly form:

1. one learner-visible outcome;
2. one independently testable acceptance story;
3. one deployment and rollback unit; and
4. one coherent data and privacy boundary.

Every included issue must be listed in the PR body with its exact acceptance
mapping and completion evidence. The PR has one lead issue. No issue may be
silently included, partially closed, or declared complete from source-only
evidence when runtime acceptance is required.

An authority-only reconciliation such as C1 closes only its lead Issue #713.

## 5. Complete runtime vertical rule

Every later runtime vertical must contain all layers required for its promised
outcome in the same PR and rollback unit:

- relevant contract and machine validation;
- API and storage/persistence behavior;
- runtime logic;
- learner UI;
- focused, hostile and applicable runtime tests/evidence;
- feature flag and safe-deferred behavior; and
- rollback evidence and instructions.

Do not create a mandatory contract-only precursor for behavior implemented by
that vertical. Existing factual gates such as rights, source currentness,
CPF-1, S236P, RLS, refund, exposure, independence, deterministic Practice and
Law currentness remain gates; they are not horizontal implementation PRs and
are not bypassed by this rule.

## 6. Bounded review convergence

For each later runtime vertical:

1. finish the complete vertical;
2. pass focused tests and required runtime evidence;
3. request one exact-head full-vertical review;
4. batch every blocking finding into at most one corrective pass; and
5. perform at most one bounded exact-head correction verification.

P0 and P1 always block. A P2 blocks only when it violates an explicitly named
core safety, rights, privacy, evidence, learner-outcome or rollback invariant.
Other P2 and P3 findings go to the mapped backlog and do not extend the review
loop.

If a core blocker remains after the bounded correction verification, return
the PR to Draft and stop. Resize or structurally recover the vertical under a
new exact Owner authorization. Do not recursively increase cycle numbers,
reopen exploratory review, or copy the same diff into a replacement PR.

## 7. Canonical campaign graph

### C1 — Authority reconciliation

- Lead: #713
- Included issues: #713 only
- Runtime/application mutation: none
- Completion scope: source-only authority and roadmap reconciliation
- Exit: reconciliation PR merged and #713 closed

### C2 — First Trusted Repair Vertical

- Lead: #702
- Included implementation issues: #702, #703, #704 and #705
- Cross-vertical acceptance source: allocated #714 requirements
- State after C1: sole next implementation campaign

Required learner outcome:

```text
rights-safe fixture
→ Capture/OCR confirmation
→ exact answer anchor
→ independent attempt
→ biggest gap
→ bounded scaffold
→ learner repair
→ verification
→ durable reopen/resume
```

C2 includes the necessary contract, API/storage, runtime, UI, tests, feature
flag, safe-deferred behavior and rollback. It may close #702–#705 only when
every mapped acceptance condition is complete. No standalone #702 or #714
source PR precedes it.

### C3 — Durable Learning and Daily Command Vertical

- Lead: #706
- Included issues: #706, #707 and #708
- Depends on: C2
- State: queued
- Outcome: frozen D+1, sealed D+7, timed recurrence/reopening, Personal Study
  Ledger and recurring-deduction projection, and evidence-driven Today/Full-Day

### C4 — Owner Proof and Commercial Readiness

- Lead: #709
- Included issues: #709 and #710
- Depends on: C3
- State: queued
- Outcome: Owner Gold calibration, dogfood, red-team, realistic baseline and
  invitation-only commercial readiness
- Activation boundary: no learner or payment activation without separate exact
  Owner gates

### C5 — Frozen Paid Cohort

- Lead and only included issue: #711
- Depends on: C4 and O4W, the separate exact frozen-cohort manifest
  authorization
- State: queued
- O4W state in C1: queued, unapproved and non-activating
- Real-time boundary: D+7, four-week and repurchase windows are not simulated

O4W is an auxiliary Owner gate, not a seventh implementation campaign. It
depends on C4 and may become the sole selected authorization Work only after C4
completes. C5 remains dependency-blocked until a later exact Owner decision
completes O4W. C1 grants no learner, payment, delayed-evidence, cohort or
Production authority.

### C6 — Verified-Bank and Calibration Flywheel

- Lead and only included issue: #712
- Depends on: C5
- State: queued
- Outcome: growing verified bank, bodyless calibration and continuous quality
- Data boundary: no raw learner-body reuse or training

Issue #701 remains the open parent program until terminal program completion.

## 8. #714 allocation tracker

Issue #714 remains open as a non-merge-producing cross-vertical acceptance
tracker. It is not a standalone prerequisite PR, is not closed by C1, and no
#714 behavior is claimed implemented by this reconciliation.

Every #714 requirement is allocated exactly as follows.

### C2 implementation allocation

- `adaptive_expertise_controller`
- `cognitive_load_budget`
- `concept_repair_need_decision`
- `concept_repair_input_modes_and_private_artifact_boundary`
- `concept_progression_gate_and_three_continue_semantics`
- `episode_metacognitive_prediction_and_self_diagnosis`
- `initial_scaffold_fading_and_control_transfer`
- `same_session_reconstruction_application_and_no_shortcut_invariants`

### C3 durable-evidence allocation

- `metacognitive_calibration_over_time`
- `transfer_distance_and_practice_sequence`
- `motivation_volition_recovery_and_minimum_maintenance`
- `durable_control_transfer_and_assistance_fading`
- `concept_artifact_revision_deferral_export_delete_lineage`
- `today_full_day_defer_reduce_drop_and_equivalent_task_semantics`

### C4 proof allocation

- `owner_proof_of_instructional_mode_and_routing_quality`
- `red_team_over_scaffolding_under_scaffolding_and_shortcuts`
- `baseline_metacognitive_and_autonomy_comparison`

### C6 continuous calibration allocation

- `continuous_instructional_mode_effectiveness`
- `continuous_scaffold_fading_and_transfer_distance_calibration`
- `continuous_concept_repair_routing_error_monitoring`
- `continuous_metacognitive_and_control_transfer_monitoring`

The union of these allocations is the durable #714 requirement inventory.
Requirements may be verified again later, but none may disappear or become an
unmapped standalone gate.

## 9. Preserved factual gates

This decision does not mark, bypass or reinterpret:

- CPF-1: `blocked_unknown_reachable_sinks`, `cpf1Complete: false`;
- S236P: `acceptance_blocked`, `acceptanceCompleted: false`,
  `terminalPass: false`, `nextLiveAttemptAuthorized: false`;
- current O3/O4 rights, provider, private-plane, activation, commercial and
  public-launch gates;
- RLS and signed-access denial;
- rights/source/currentness and raw-body boundaries;
- refund, false-charge and entitlement controls;
- assistance exposure and independent-evidence requirements;
- deterministic Practice and Law currentness fail-closed behavior; or
- the current WCV `1.0.8` behavior baseline.

A future vertical may build synthetic or disabled runtime surfaces within its
exact authority. Real content, learners, payment and Production remain off
until their exact current gates pass.

## 10. C1 authorization and non-claims

C1 may modify only authority, strategy pointer, roadmap, control-plane
contract/mirror, validation and focused-test surfaces. It authorizes no
runtime/application code, schema, migration, RLS, Storage, provider,
dependency, deployment, content, learner, payment or Production mutation.

C1 completion proves only that the source authority and executable roadmap
oracle agree. It does not prove C2 behavior, content rights readiness, runtime
correctness, learning efficacy, commercial readiness or Production readiness.

After C1 merges, exactly one next implementation lead is authorized: #702 as
lead of C2. C2 does not begin inside C1.

## 11. C1 changed-path manifest

The source reconciliation is limited to these paths:

1. `AGENTS.md`
2. `roadmap/active-program.yml`
3. `docs/strategy/ACTIVE-MASTER-PLAN.md`
4. `docs/dabangil-unified-program-contract.md`
5. `config/dabangil-unified-program-contract.json`
6. `docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md`
7. `docs/qa/wcv-campaign-c1-authority-roadmap-reconciliation-validation.md`
8. `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
9. `scripts/run-node-tests.mjs`
10. `tests/dabangil-premium-alignment.test.mjs`
11. `tests/agent-factory-roadmap-runner.test.mjs`
12. `tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs`
13. `tests/inverge-product-constitution.test.mjs`
14. `tests/practice-answer-review-engine.test.mjs`
15. `tests/s214-reference-answer-pipeline.test.mjs`
16. `tests/s215-reference-answer-release-gate.test.mjs`
17. `tests/s216-error-notebook-gap-taxonomy.test.mjs`
18. `tests/s217-personal-core-concept-graph.test.mjs`
19. `tests/s218-similar-question-review-scheduler.test.mjs`
20. `tests/s219-learner-catalog-usage-ledger.test.mjs`
21. `tests/s220-billing-entitlement-credit-usage.test.mjs`
22. `tests/s221-paid-trust-privacy-cost-guardrails.test.mjs`
23. `tests/s222-academy-answer-operations-tenant-boundary.test.mjs`
24. `tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs`
25. `tests/s224-three-subject-learner-runtime-acceptance.test.mjs`
26. `tests/theory-answer-review-engine.test.mjs`
27. `tests/inverge-roadmap-curriculum-docs.test.mjs`
28. `lib/agent-factory/roadmap-runner.ts`
29. `scripts/automation/determine-next-task.mjs`

The last fifteen paths are assertion-only conformance updates required when
the repository-wide default and Learner Loop suites encountered the new
truthful three-slot roadmap, sole selected WCV-C2 campaign and current blocked
S236P state. Paths 28 and 29 are the only executable-selector additions to the
cumulative manifest; they mechanically enforce the explicit per-plan global
writer cap and do not implement learner behavior. No other
runtime/application/lib path is in scope, and no path outside this manifest
may change.

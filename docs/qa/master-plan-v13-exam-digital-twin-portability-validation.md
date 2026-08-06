# Master Plan v13 — Exam Digital Twin and Portability Validation

## Scope

This record validates the source-only V13 strategy aggregate that adds:

- Exam World Twin;
- multidimensional Learner Capability Twin;
- robust native curriculum control;
- proof-carrying assessment release;
- calibrated scoring disagreement;
- pre-registered post-exam audit;
- internal-only Portable Professional Exam Core;
- proposed open-source validation adapters.

The #690 change set under validation contains exactly two groups.

### Core V13 artifacts (seven)

- `docs/strategy/ACTIVE-MASTER-PLAN.md`
- `docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md`
- `docs/strategy/dabangil-exam-digital-twin-and-robust-curriculum-control-v1-2026-08-06.md`
- `docs/strategy/dabangil-portable-professional-exam-core-and-profile-contract-v1-2026-08-06.md`
- `docs/decisions/2026-08-06-owner-v13-exam-digital-twin-and-portable-professional-exam-core.md`
- `config/dabangil-exam-digital-twin-portable-core-v1.json`
- this validation record.

### Inherited CPF/control-plane reconciliation artifacts (four)

- `config/dabangil-ephemeral-source-safety-contract-v1.json`
- `docs/qa/v12-t0-cpf1-persistence-sink-inventory-2026-08-06.md`
- `roadmap/active-program.yml`
- `tests/v12-t0-cpf1-persistence-sink-inventory.test.mjs`

The exact authorized roadmap pointer transition is **V12 activeMasterPlan → V13 activeMasterPlan**:

- from `docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md`;
- to `docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md`.

No other roadmap change is authorized. All non-pointer roadmap status, dependency,
priority, lock-group, WIP and CPF fields remain unchanged from #690's base.
CPF-1 remains `cpf1Complete=false`, `confirmedViolationCount=16`,
`unresolvedUnknownCount=7` and `blocked_unknown_reachable_sinks`. Every V13
authorization-boundary flag remains `false`.

No implementation, application, runtime, API, UI, live-service, schema, migration,
RLS, Storage, provider, dependency, package-lock, environment, deployment,
historical-question ingest, real source, learner model fitting, other exam profile,
external learner, payment or Production change is included or authorized.

## Baseline preservation

V13 must preserve the following existing authorities and artifacts:

- V12 Appraiser coverage/source-safe baseline;
- VESG official scope, target-date norm, historical-unit and build-order contracts;
- Appraiser Coverage Compiler and Original Question Engine;
- V11 source-safety and legal-operation contracts;
- V8 reasoning/evidence/Full-Day contracts;
- V9 adaptive-understanding and ethical progression contracts;
- current `AGENTS.md` product and optimizer boundaries;
- current learner-facing runtime: Appraiser Second Practice, Theory and Law only;
- Today Plan maximum of three primary tasks.

V13 supersedes V12 only as the single active strategy entry point.

## Static strategy assertions

The aggregate must preserve all assertions below.

### Authority and scope

1. `ACTIVE-MASTER-PLAN.md` names V13 as the only active strategy entry point.
2. V12 remains a mandatory coverage/source-safe baseline.
3. V11 source-safety remains mandatory and is not weakened.
4. VESG's exact first corpus build order remains unchanged.
5. Strategy coverage remains Appraiser First five and Second three subjects.
6. Learner-facing runtime remains Appraiser Second three subjects only.
7. First-stage learner runtime remains unauthorized.
8. No other real exam profile is created or authorized.
9. No generic multi-exam learner surface, marketing, pricing or navigation is authorized.
10. No document or config grants runtime, schema, dependency, provider, Production,
    Ready or merge authority.

### Decision-axis separation

11. `CorpusPriority`, `BlueprintDemand`, `LearnerNeed` and `AllocationUtility` are
    separate values.
12. Official scope is not derived from frequency.
13. Historical frequency is not a future probability.
14. Expert or academy signal has zero current-answer authority.
15. Learner allocation is not a pass probability or official predicted score.
16. Low priority cannot silently remove an official scope leaf.

### Exam intelligence

17. Exam World Twin uses multiple reviewed scenarios, not one canonical predicted paper.
18. Each world binds an exact profile, graph, norm, rights snapshot and blueprint.
19. World slots must reconcile total marks and feasible time.
20. Official-unobserved nodes must still be inside official scope.
21. Same-origin expert/academy signals are deduplicated.
22. Expert signals are independently submitted, frozen and later calibrated.
23. Public academy signals are metadata-only and exclude paid/private bodies.
24. `SUSPICIOUS_NONPUBLIC_CURRENT_EXAM` is quarantined and cannot enter graph,
    world, generator or learner output.
25. Scenario weights may not be shown as exam probabilities.

### Learner Capability Twin

26. Learner state is not a single scalar mastery value.
27. Knowledge, retrieval, method selection, execution, explanation, verification,
    speed, transfer, delayed recovery and confidence calibration remain separate.
28. Unobserved capability is `null`/unknown, not automatically zero.
29. Assistance, exposure and independent mastery are separate.
30. Answer reveal, guided success or AI co-writing cannot qualify as independent mastery.
31. Same-representation retry cannot qualify as far transfer.
32. Stable candidacy requires D+7 unseen transfer.
33. Unresolved scoring cannot advance mastery.
34. Every error event identifies a causal error class and next independent gate.

### Curriculum control

35. Native policy remains the only authority that selects `CoreOutcome` and learning
    value.
36. Today primary tasks remain at most three.
37. Official-scope floor, prerequisite order, currentness and rights are hard constraints.
38. Soft objectives cannot override hard constraints.
39. Optimizer or constraint solver cannot change official answers, mastery, Law status,
    pass risk, feedback or learner-visible priority.
40. Shadow output cannot directly mutate Today, Queue or product state.
41. Infeasibility is reported; hard constraints are not silently weakened.
42. Native fallback remains mandatory.

### Proof-carrying assessment

43. Every released generated assessment binds exact profile, graph, norm and rights.
44. Every released generated assessment has a profile-specific solver or rubric.
45. Numeric assessment has unit, precision and rounding policy where applicable.
46. Structured response has command/rubric completeness and accepted alternatives.
47. Current-norm case analysis has effective-date and decisive-fact validation.
48. Metamorphic/property and adversarial evidence is profile-specific.
49. Rights/non-reconstruction review is distinct from answer correctness.
50. Generated references remain learning references, not official answers or grading criteria.
51. Frozen full-GS packets cannot mutate after attempt start.
52. Same GS packet retry is not unseen transfer.

### Scoring and audit

53. Scoring combines deterministic, rubric, adversarial, alternative-answer and sampled
    human-anchor components.
54. One model cannot be final scoring authority.
55. Score disagreement is visible.
56. Held score cannot advance mastery.
57. Exam intelligence, worlds, curriculum, GS packets, scoring policy and denominator
    freeze before the exam.
58. Domain, issue, task, combination, mark-role and transfer-defense matches are distinct.
59. Hit claims include the full pre-exam denominator.
60. Missed actual marks and false-positive study hours are reported.
61. Exam-year-grouped walk-forward is required.
62. Random subquestion train/test split is prohibited.
63. Future-data leakage and post-exam backfill are prohibited.

### Private source safety

64. Book Tutor remains one problem per ephemeral job.
65. Raw problem, OCR, publisher expression and source-bound full output remain non-persistent.
66. Book Tutor source does not enter shared VESG, world, generator, analytics or Portable Core.
67. Private capability evidence contains scrubbed closed signals, not source bodies.
68. Official availability is not treated as redistribution permission.

### Portability

69. Portable Core is internal architecture only.
70. `appraiser_kr` is the only real profile.
71. Shared kernel owns interfaces/lifecycle, not exam truth.
72. ExamProfile owns issuer, source precedence, scope, norms, corpus, question grammar,
    blueprint, solvers, rubrics, rights, calibration and activation.
73. Profile IDs scope nodes, norms, questions, worlds, proof policies, scoring and capability.
74. A same-named concept does not establish cross-profile equivalence.
75. Cross-profile answer, question body, norm, calibration, mastery and activation transfer
    are prohibited.
76. A future real profile independently clears PROFILE-0 through PROFILE-8.
77. The first portability test uses an author-created fictional profile only.
78. Fictional portability success cannot be claimed as real exam support.
79. No actual second-exam source or learner surface is included.

### Open-source and standards

80. Ajv, Graphology, decimal.js and fast-check are proposed build-time candidates only.
81. DuckDB, Z3 and Inspect AI are proposed isolated benchmark candidates only.
82. This change installs no package or dependency.
83. Every future benchmark requires exact version, license, transitive dependency, SBOM,
    isolation, closed schemas, fallback and rollback.
84. OSS components have zero official-answer, mastery, CoreOutcome and product-decision authority.
85. OSS components may not receive raw user/source bodies under this contract.
86. Evaluation logging cannot persist raw learner/source data.
87. QTI, W3C PROV, Caliper and xAPI are compatibility/reference targets only.
88. No certification or conformance claim is made.
89. Standard import/export cannot bypass source rights or profile admission.

## Machine-contract assertions

`config/dabangil-exam-digital-twin-portable-core-v1.json` must:

- parse as strict JSON;
- reference the exact V13 master plan, decision, two specifications and validation record;
- set every authorization boundary to `false`;
- preserve the current Appraiser strategy and runtime scope;
- list no other real profile;
- enumerate all four decision axes;
- enumerate signal kinds and quarantine behavior;
- enumerate seven world scenario classes and world validity rules;
- enumerate ten capability axes and eleven error codes;
- preserve Today maximum three and native-policy authority;
- prohibit optimizer CoreOutcome selection and direct product mutation;
- define proof-policy kinds and required proof-bundle fields;
- define Appraiser Practice, Theory, Law and First-stage proof policies;
- define Full GS freeze and scoring council;
- define pre-exam freeze, match levels and grouped walk-forward requirements;
- define the Portable Core shared/profile-owned split and PROFILE-0 through PROFILE-8;
- prohibit all cross-profile truth, mastery and activation transfer;
- define fictional-profile-only first portability proof;
- list all seven OSS candidates as `proposed` with no raw source or decision authority;
- define proposed lifecycle and benchmark-entry requirements;
- mark QTI, PROV, Caliper and xAPI as non-certified, non-runtime targets;
- set every hard-gate defect ceiling to zero;
- preserve V11, V12, VESG, Full-Day and current runtime compatibility.

## Hostile review expectations

### Forecast and signal abuse

- frequency relabeled probability;
- academy consensus counted from one common origin;
- expert prior changes official scope;
- paid GS or private chat content enters a signal;
- suspicious current-exam leak enters a world;
- failed scenarios deleted after the exam.

### World and planning defects

- marks do not total;
- time is infeasible;
- world uses future law;
- official floor is dropped to fit time;
- optimizer selects learner priority;
- Today exceeds three tasks;
- conflict is silently relaxed.

### Capability and scoring defects

- one scalar mastery hides unknown axes;
- answer exposure raises independent mastery;
- near-identical retry counted as far transfer;
- grader disagreement hidden;
- held score advances mastery;
- official grading label appears.

### Assessment defects

- question has no profile proof policy;
- exact calculation changes under unit conversion or early rounding;
- two or zero correct options;
- theory rubric ignores the command;
- law question applies a future norm early;
- reference answer is labelled official;
- source-similar distinctive expression is released.

### Portability defects

- Appraiser node or answer resolves inside fictional profile;
- generic profile defaults to Appraiser marks or question grammar;
- mastery crosses profile;
- fictional fixture enters real profile registry;
- other-exam selector appears in learner product;
- one profile approval activates another.

### OSS and data defects

- package silently installed;
- unpinned benchmark;
- transitive license omitted;
- raw user body enters DuckDB or Inspect logs;
- Z3 changes `CoreOutcome`;
- Graphology centrality becomes learning authority;
- QTI import bypasses rights;
- external event includes free text or source body.

## Static validation procedure

1. Parse the V13 machine contract with a strict JSON parser.
2. Confirm all generated paths exist in the proposed tree.
3. Confirm the active pointer references V13 and V13 references both mandatory specs.
4. Confirm every authorization-boundary boolean is `false`.
5. Confirm `otherRealProfiles` is an empty array.
6. Confirm current learner subjects are exactly Practice, Theory and Law.
7. Confirm all OSS candidates are `proposed`, `rawUserSourceAllowed=false` and
   `productDecisionAuthority=false`.
8. Confirm every hard-gate value is zero.
9. Confirm Markdown code fences are balanced.
10. Confirm the #690 change set contains the seven core V13 artifacts and the four
    inherited CPF/control-plane reconciliation artifacts named above.
11. Confirm `roadmap/active-program.yml` contains only the exact authorized V12
    `activeMasterPlan` → V13 `activeMasterPlan` pointer transition.
12. Confirm every non-pointer roadmap status, dependency, priority, lock-group, WIP
    and CPF field remains unchanged from #690's base.
13. Confirm no implementation, application, runtime, API, UI, live-service, schema,
    migration, RLS, Storage, provider, dependency, package-lock, environment,
    deployment or Production path changed or became authorized.

## Runtime evidence

Not required and not claimed.

Repository CI may validate source compatibility only. It does not prove:

- exam-content correctness;
- legal/currentness correctness;
- paper-world validity;
- solver/rubric quality;
- scoring calibration;
- optimizer benefit;
- portability to a real exam;
- source-safety runtime;
- learner or Production readiness.

## Rollout and rollback

Rollout is one source-only Draft PR from exact current `main`.

Rollback is:

- revert the single V13 commit;
- restore `ACTIVE-MASTER-PLAN.md` to V12;
- remove only the additive V13 documents/config;
- perform no data, schema, provider or deployment rollback.

## Merge posture

Human approval required. Keep the PR Draft.

Automated checks do not authorize Ready, merge, implementation, dependency installation,
historical corpus ingest, another profile, learner activation or Production.

---
document_title: "Owner Decision — WCV-C3 Structural Recovery and Migration-History Compatibility"
status: "owner-decision/approved-candidate-source-contract-only"
decision_id: "owner_wcv_c3r_structural_recovery_2026_08_20"
dated: "2026-08-20 KST"
repository: "chachathecat/inverge"
roadmap_item_id: "WCV-C3"
campaign_id: "C3"
recovery_tracker_issue: 781
lead_implementation_issue: 706
included_issues: [706, 707, 708]
cross_vertical_acceptance_tracker_issue: 714
terminal_donor_prs: [770, 780, 782]
current_replacement_stage: "C3R-P"
current_replacement_stage_issue: 706
current_replacement_stage_state: "authorized_unstarted"
repository_authority_effective_on: "expected-head-pinned squash merge and validated GitHub receipt"
runtime_authorization: "none"
remote_database_authorization: "none"
learner_activation_authorization: "none"
payment_authorization: "none"
production_authorization: "none"
automatic_runtime_start: false
---

# Owner Decision — WCV-C3 Structural Recovery and Migration-History Compatibility

## 1. Decision

PR #782 correctly exhausted its second source correction and closed unmerged
after its second exact-head review reported actionable P0/P1/P2 `0/0/1`.
It is a read-only source-authority donor alongside terminal runtime donors
PR #770 and PR #780. The full-sized WCV-C3 delivery shape remains replaced by
the structurally smaller, strictly serial chain:

```text
C3R-P → C3R-T → C3R-L
```

This is the required structural reduction after two clean replans, not a third
clean replan. It preserves every learner, evidence, privacy, rights, migration,
runtime and rollback invariant. V13 remains the sole active master and WCV
`1.0.8` remains subordinate.

Tracker #781 is the single WCV-C3R recovery tracker. The identifiers are not
aliases: `WCV-C3` is the roadmap item, `C3` is the campaign, #781 is the
recovery tracker, #706 is the first implementation lead, and `C3R-P` is the
only current replacement stage. The post-merge tuple is:

```text
WCV-C3 / C3 / #781 / C3R-P / #706 / authorized_unstarted
```

The 2026-08-16 GitHub-native continuation decision remains authoritative for
unaffected dependency-ready non-Production work. For this exact structural
recovery, however, merging the source-only authority does not start C3R-P.
No runtime stage, migration, application, remote project or successor starts
inside this Work.

## 2. Reconciled live start gate

The read-only gate observed:

| Field | Exact live value |
|---|---|
| `main` | `ffdd3dcc2398dd27b991eee0be34f832da0a65b5` |
| main tree | `178e8d2e80236030805441344064f30af68b0a94` |
| #706 / #707 / #708 | open / open / open |
| #714 | open; C3/C4/C6 allocations preserved |
| open WCV-C3 successor | none |
| overlapping WCV-C3 merge-producing writer | none |
| Production / remote Supabase / payment / external learner | zero |

The live `main-pr-only` ruleset requires a pull request, resolved review
threads, strict latest-base checks, squash-only merge, and the native checks
`pr-contract`, `risk-classifier`, `runtime-gate`, `fast-ci`, `full-ci`,
`full-ci-windows`, `Learner Loop Health`, `security-audit-sbom`, and `Vercel`.

## 3. Terminal donors

| Field | PR #770 | PR #780 | PR #782 |
|---|---|---|---|
| State | closed, Draft, unmerged | closed, Draft, unmerged | closed, unmerged |
| Head | `41fbc60cbebf5463ead483462e5bd92b797c82c4` | `a28c1983a5264f21ed35ab48a465cd9198a46e5b` | `e3609843850ba1f2ce64c291d9b4daae964d2f65` |
| Tree | `e7d035d5735e600bf970054666da0b57f05f1abb` | `e589b0e55f93d70df4ef5c0d335d74e4242f91ce` | `20e0f9235b71c3427ee184bf7e02f22f46633ef6` |
| Base | `ffdd3dcc2398dd27b991eee0be34f832da0a65b5` | `ffdd3dcc2398dd27b991eee0be34f832da0a65b5` | `ffdd3dcc2398dd27b991eee0be34f832da0a65b5` |
| Corrections | `2/2` | `2/2` | `2/2` |
| Formal reviews | `2/3` | `0/3` | `2/3` |
| Merge | none | none | none |

PR #780's final central Runtime Gate run `32358691451` failed because no
closed adapter covered its expanded migration-sensitive path set. Its final
dedicated WCV-C3 run `32358691469` failed on the first fresh-history start at
`202606232130_personal_concept_graph_rpc_only_write_boundary.sql`, SQLSTATE
`42883`, before any artifact could be produced. Both runs have artifact count
zero and successful cleanup.

PR #782's final exact-head review `PRR_kwDOSMHn8M8AAAABKP5z9g`
(REST ID `4982731766`) preserved the corrected `auth.uid` SQL-derived external
function coverage but found that the manifest still omitted executable
`CREATE EXTENSION` dependencies. Review comment `3821578964` specifically
identified `pgcrypto` and `vector` in `20260615_legal_grounding.sql` and
`pgcrypto` in
`20260623_personal_concept_graph_atomic_transition.sql`. This clean
replacement corrects that root class with a deterministic SQL analyzer rather
than a manual two-string patch.

The donor branches, commits, reviews, threads, checks and runtime evidence are
read-only history. They are not reopened, amended, pushed, cherry-picked,
resolved, promoted or copied. A later stage may reconstruct reviewed-safe
behavior only from then-refreshed `main` and must independently prove every
donor finding.

## 4. Preserved terminal findings

The replacement stages must carry every known blocker:

1. eight nested JSONB `-> ... - array[...]` grouping defects;
2. one `IS DISTINCT FROM CASE ... END` grouping defect;
3. the multiple-recursive-term CTE in
   `20260608_create_personal_learning_states.sql`;
4. four duplicate `20260615` migration versions;
5. mixed 8-, 12- and 14-digit migration versions;
6. the legal `legal_article_chunks` consumer before its producer;
7. the concept-graph RPC boundary before
   `transition_personal_concept_node_v1` is defined;
8. SQL-derived external-function comparison, including `auth.uid`, which is a
   preserved regression obligation from PR #782;
9. deterministic `CREATE EXTENSION`, extension-schema, required-use and
   producer-order closure for every live-main migration;
10. the central Runtime Gate's missing closed adapter for the expanded path
   set; and
11. the absence of a successful two-cycle fresh Supabase reset/replay proof.

The JSONB and `CASE` defects were corrected only in the terminal donor and are
regression obligations, not merged fixes. The recursive CTE, duplicate and
mixed-width versions, legal ordering and concept ordering remain present on
live `main`.

## 5. Serial complete-outcome chain

### C3R-P — Practice and common durable substrate

C3R-P starts only after this source authority has an expected-head-pinned
squash merge and validated GitHub receipt. It must deliver one independently
complete Practice learner outcome and every common layer required by later
subjects:

- exact migration-history reconciliation and fresh-history Supabase
  reproducibility;
- common forced-RLS persistence and service-only RPC/repository;
- complete durable Practice review;
- bodyless learning-gap and concept-state evidence signals;
- one source-bound learner-private failure note;
- planner/review state separation;
- frozen D0, D+1 reproduction, sealed D+7 transfer, timed recurrence and
  reopen;
- Ledger, Review Queue, Today and Full-Day common behavior;
- restore, export and delete;
- exact Practice browser-to-Postgres evidence;
- two fresh isolated reset/replay cycles through its closed adapter; and
- independent rollback.

C3R-P may record acceptance contributions to #706, #707, #708 and Issue #714
allocation C3. It may not close them, claim Theory or Law, or complete WCV-C3.

### C3R-T — complete Theory durable-learning delta

C3R-T depends on the validated terminal C3R-P merge and receipt. Issue state
or closure cannot satisfy that dependency. It must add exact target-scoped
Theory proof, D+1/D+7/timed behavior, review outputs, restore/export/delete,
two fresh isolated reset/replay cycles, exact Theory browser-to-Postgres
evidence, and rollback independent of Practice.

C3R-T may record acceptance contributions to #706, #707, #708 and Issue #714
allocation C3. It may not close them, claim Law, or complete WCV-C3.

### C3R-L — complete Law delta and terminal WCV-C3 closeout

C3R-L depends on validated terminal merges and receipts for both C3R-P and
C3R-T. Issue state or closure cannot satisfy either dependency. It must add
the complete Law durable outcome with exact source, source version, anchor,
effective window and applicable date, D+1/D+7/timed behavior, review outputs,
restore/export/delete, two fresh isolated reset/replay cycles, exact Law
browser-to-Postgres evidence, and rollback independent of Practice and Theory.

Only C3R-L may:

- establish terminal WCV-C3 completion;
- close Tracker #781;
- close or recommend closure of #706, #707 and #708;
- complete Issue #714 allocation C3 while preserving C4 and C6 and keeping
  #714 open;
- advance the next program selector; and
- publish the terminal WCV-C3 receipt.

## 6. Issue allocation

Every stage carries its subject-complete contribution across the same three
issues:

- #706 owns frozen D0, D+1, sealed D+7, timed recurrence and reopen;
- #707 owns the forced-RLS Personal Study Ledger, bodyless evidence
  projections, source-bound failure note, restore, export and delete; and
- #708 owns deterministic Today/Full-Day, Review Queue, planner/review
  separation, at most three `CoreOutcome` values, and evidence-neutral
  accept/edit/reject.

C3R-P owns the common substrate and Practice slice, C3R-T adds Theory, and
C3R-L adds Law and alone establishes terminal closure.

## 7. MigrationHistoryCompatibilityManifestV1

`config/dabangil-wcv-c3-structural-recovery-v1.json` contains the closed
`MigrationHistoryCompatibilityManifestV1`. It inventories all 25 live-main
migrations plus the donor-only WCV migration. Every record binds its current
filename and version, canonical proposed version, exact predecessors,
consumed and produced objects, fresh-history order, conservative remote
status, filename-mutation eligibility, repair/Owner-gate requirement, and
rollback or forward-compatibility strategy.

`MigrationDependencyClosureV1` is implemented by
`scripts/automation/wcv-c3r-migration-dependency-closure.mjs`. It fingerprints
the canonical UTF-8/LF SQL for all 25 live-main migrations, tokenizes
executable SQL, ignores comments and ordinary string examples, recognizes
quoted identifiers, mixed keyword casing, multiple declarations, `IF NOT
EXISTS`, `SCHEMA` and `WITH SCHEMA`, and fails closed on an unknown or
ambiguous declaration. SQL-derived created extensions, required extension
uses, exact schemas and exact producers must equal the manifest in both
directions. Unqualified `digest` is a `pgcrypto` dependency and a qualified
`extensions.digest` call is counted only in its qualified dependency bucket.
The same analyzer derives every reference to the closed set of prior
repository objects and external database objects, independently derives each
record's exact dependency predecessors from object provenance, and compares
those results in both directions. The only two policy-ordering overrides are
closed by exact migration, policy identity, current policy SQL and prior
policy-operation SQL evidence. An undeclared or unregistered qualified dependency fails
closed rather than disappearing from comparison.

The live SQL contains six executable declarations across five migrations.
The exact canonical names are `pgcrypto` and `vector`; `pgvector` is not a
valid alias. `20260615_legal_grounding.sql` creates and uses both `pgcrypto`
and `vector`. `20260623_personal_concept_graph_atomic_transition.sql` creates
`pgcrypto` with explicit schema `extensions` and uses both unqualified
`gen_random_uuid` and `extensions.digest`. Every other `CREATE EXTENSION`
statement and every predecessor-satisfied extension use is derived and
compared by the same mechanism.

Consumed objects include exact typed external schema dependencies. Every
live-main call to `auth.uid`, `storage.allow_any_operation` or
`storage.allow_only_operation` must appear as a function in that migration's
`consumes` list; checking only previously declared objects is not closure.

Current live-main history is intentionally recorded as defective: 16
eight-digit versions, one twelve-digit version, eight fourteen-digit versions,
and a four-way collision at `20260615`. The canonical proposal is a planning
contract, not mutation authority. Its target versions are unique, fourteen
digits wide and dependency-ordered.

Repository evidence classifies the concept-graph set, the mobile-PWA
migration and the four S236P versions as `KNOWN_APPLIED`; the merged C2
Practice/Theory/Law versions and donor-only WCV version as `LOCAL_ONLY`; and
all remaining records as `UNKNOWN`. Stale evidence that a migration was
unapplied in June does not create current `KNOWN_UNAPPLIED` truth. No fresh
remote ledger read occurred, and no record is currently classified
`KNOWN_UNAPPLIED`.

`UNKNOWN` blocks silent rename and repair. An already-applied version cannot
be rewritten, renamed or history-repaired without a separate explicit Owner
gate and exact reconciliation plan. This Work authorizes no `migration
repair`, `db push`, `db reset --linked`, remote SQL, remote schema mutation or
linked project access. Embedded PostgreSQL compilation is diagnostic only and
cannot replace the exact Supabase reset gate. Every runtime stage must pass
two fresh isolated reset/replay cycles.

## 8. Runtime-evidence adapter authority

C3R-P must install one closed runtime-evidence adapter covering exactly the
migration-history recovery set plus the common Practice substrate. Every
stage-owned protected path is enumerated without a glob before the stage
starts. The adapter fails closed on:

- any unregistered migration-sensitive path;
- incomplete path closure;
- a missing first or second fresh reset/replay cycle;
- an absent metadata-only artifact;
- exact-head mismatch;
- any remote Supabase use; or
- cleanup failure.

C3R-T and C3R-L may extend the validated adapter only with their exact
subject-specific protected paths.

## 9. Delivery control and conditional merge

There is exactly one merge-producing Work, branch, PR and writer. Each PR uses
an ordinary non-force push. Auto-merge is off. Per-PR budgets remain two
source corrections and three exact-head formal reviews.

This source-only PR may merge if and only if all live ruleset-required checks
pass on the exact current head against the latest required base, every
actionable finding is corrected, every new-PR review thread is resolved after
independent verification, mergeability is clean, and one fresh exact-head
Codex review reports actionable P0/P1/P2 `0/0/0`. The merge is squash-only and
pinned to the reviewed expected head.

The source-authority PR links Tracker #781 with `Refs #781` and the exact
machine-validated disposition `- Tracker disposition: remains open; closure
authority: C3R-L`. It contains no `Closes` or `Fixes` keyword. The PR Contract
validator permits this exact contract-backed reference-only form and no broad
exception: a missing exact reference, a missing exact disposition, or any
GitHub closing keyword fails closed. The exception is also bound to repository
`chachathecat/inverge`, base `main` at
`ffdd3dcc2398dd27b991eee0be34f832da0a65b5`, head
`codex/wcv-c3r-sql-dependency-clean-replacement` in the same repository, and
title `[WCV-C3R] Install serial structural recovery authority — clean
replacement`; an unrelated or
same-named fork PR cannot claim it, and a later PR cannot replay it after the
base advances. Same-repository, qualified-repository,
full-URL, colon and case-insensitive closing-reference syntax all fail closed.
This narrow rule preserves the required open tracker after the source-authority
merge; only terminal C3R-L may close #781.

If this source-only recovery PR exhausts either budget, it closes unmerged,
remains read-only, starts no C3R-P runtime, and reports the exact conflict. No
stage boundary or migration-history gate may be weakened.

## 10. Non-authorizations and resulting state

This Work changes source authority only. It authorizes no application, API,
component, runtime workflow, migration, database behavior, package,
dependency, lockfile, remote Supabase operation, Production change, payment,
provider, secret/environment mutation, external or real learner, public
release, rights-unclear content operation, or destructive data action.

After its protected merge and validated receipt:

- WCV-C3 remains incomplete;
- #706, #707, #708, #714 and #781 remain open;
- PR #770, PR #780 and PR #782 remain closed, unmerged and read-only;
- C3R-P is `authorized_unstarted`;
- C3R-T and C3R-L remain dependency-blocked and unstarted;
- Production, remote Supabase, payment and learner state remain zero; and
- successor runtime started remains `0`.

## 11. Exact owned-path manifest

This source authority owns exactly these paths:

1. `AGENTS.md`
2. `roadmap/active-program.yml`
3. `config/dabangil-unified-program-contract.json`
4. `docs/dabangil-unified-program-contract.md`
5. `docs/inverge-master-roadmap.md`
6. `config/dabangil-unified-product-multisurface-launch-v1.json`
7. `docs/strategy/ACTIVE-MASTER-PLAN.md`
8. `docs/strategy/dabangil-unified-product-multisurface-launch-v1-2026-08-14.md`
9. `docs/decisions/2026-08-20-owner-wcv-c3-structural-recovery.md`
10. `config/dabangil-wcv-c3-structural-recovery-v1.json`
11. `docs/qa/wcv-c3-structural-recovery-validation.md`
12. `tests/wcv-c3-structural-recovery-authority.test.mjs`
13. `scripts/automation/wcv-c3r-migration-dependency-closure.mjs`
14. `scripts/run-node-tests.mjs`
15. `tests/c2r-c-l-law-authority.test.mjs`
16. `tests/c2r-c-p-practice-authority.test.mjs`
17. `tests/c2r-c-t-theory-authority.test.mjs`
18. `tests/dabangil-unified-product-multisurface-launch-authority.test.mjs`
19. `tests/github-native-delivery-control.test.mjs`
20. `tests/rights-safe-adaptive-variant-foundry-contract.test.mjs`
21. `tests/wcv-c2r-structural-recovery-authority.test.mjs`
22. `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
23. `scripts/automation/validate-pr-contract.mjs`
24. `tests/agent-factory-contract-validation.test.mjs`

No path outside this manifest may change. In particular, no `app/`,
`components/`, `lib/review-os/`, `supabase/`, `.github/workflows/`, package or
lockfile path is owned.

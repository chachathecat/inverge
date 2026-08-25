---
decision_id: owner_parallel_execution_v1_2026_08_25
document_title: "Owner Decision — PARALLEL_EXECUTION_V1"
decision_date_kst: 2026-08-25
status: candidate_effective_only_after_expected_head_pinned_squash_merge_and_validated_github_receipt
authority_kind: source_only_operating_amendment
---

# Owner Decision — PARALLEL_EXECUTION_V1

## Decision

`PARALLEL_EXECUTION_V1` is the sole narrow exception to the repository's
default one-merge-producing-writer rule for the initial
`INVERGE_OWNER_STUDY_OS` program. It is an operating amendment only. It is not
a product stage, master plan, control-plane family, runtime feature, selector
change or learning claim.

The prerequisite is the terminal PR #807 receipt: reviewed head
`eae0cfc27d6c44f244cd368882fdbdeae7282a0c`, resulting protected-main SHA
`c269d8fa489dc1ac77ef77d203dadffc0e4e73e5` and tree
`90c725a3f82665d8533a20254f1088de86fef18c`. Those identities were re-fetched,
and the seven-file Study Capacity contribution is present and unreverted.

This amendment becomes repository authority only after its own exact-head
checks, fresh actionable P0/P1/P2 `0/0/0` review, zero unresolved actionable
threads, expected-head-pinned squash merge and validated GitHub receipt. Until
then the default one-writer rule remains controlling.

## Exact permission

After that receipt, at most three initial merge-producing lanes may be open:

1. `LANE_A_SECOND_STAGE`: C3R-T, then C3R-L, then the WCV-C3 Foundation
   Freeze;
2. `LANE_B_FIRST_STAGE_KERNEL`: the First-Stage common MCQ Kernel and frozen
   `SubjectAdapter`, then the Study Capacity runtime bridge; and
3. `LANE_C_QUESTION_FOUNDRY`: the source-only offline Question Foundry.

All three initial lane branches and isolated worktrees must start from the
same amendment resulting-main receipt. Their declared integration and merge
order is C3R-T, C3R-L, Foundation Freeze, Kernel, Study Capacity runtime
bridge, then Question Foundry. C3R-L still requires the validated C3R-T
receipt; this amendment does not weaken the canonical
`C3R-P → C3R-T → C3R-L` order or omit M3/M5 from the active program.

After each declared merge, every remaining lane refreshes to that validated
resulting main, regenerates its Git evidence and reruns exact-head checks and
review before it may merge. A stale earlier base or review cannot authorize the
next integration.

After the Kernel and `SubjectAdapter` have merged and frozen with a validated
resulting-main receipt, at most six subject-adapter/eval lanes may be open:
Accounting, Economics, Civil Law, Appraisal-related Laws, Real Estate
Principles, and Golden/eval/meta-audit. The one machine integration order is
C3R-T, C3R-L, Foundation Freeze, Kernel, Study Capacity runtime bridge,
Question Foundry, then those six subject/eval outcomes in their listed order.
A subject lane may not change the common Kernel without one exact integration
gate naming its sole lane and exact paths.

The initial-lane and post-freeze subject/eval caps are independently enforced;
neither changes the general roadmap writer limit of one for every other work
or authorizes an unrelated queued item.

## Isolation and fail-closed ownership

Every lane requires one unique isolated Git worktree, one unique ordinary
`codex/` branch, and an exact repo-relative file manifest without globs. Every
changed path must be owned by exactly one lane. Missing ownership, undeclared
changes, duplicate worktrees or branches, path traversal, globs, overlapping
owned paths or overlapping changed paths fail closed.

Candidate validation derives each clean worktree's exact head, branch,
base ancestry, merge base, Git modes, blob identities, content digests and
changed paths from Git. Handwritten declarations must equal that observed diff;
they cannot substitute for it. Rename/delete/type/submodule evidence, a stale
base, a dirty worktree, amendment-artifact drift or missing Git evidence fails
closed.

Every amendment and completed integration receipt must be marked
live-GitHub-validated, exact-head-pinned, squash-merged,
required-checks-passed, actionable `0/0/0` and zero-thread. Git must
independently resolve every reviewed-head and resulting-main tree, prove each
squash result has the prior integration result as its sole parent and the
reviewed tree as its tree, and prove the frozen decision, contract and
validator blobs exist byte-identically throughout the chain, at the latest
integration base and at every lane head.

Migrations, shared auth or RLS, package and lockfiles, the common durable
substrate, global authority/program mirrors, and shared test registration may
have at most one concurrent owning lane. A second lane owning any path in one
of those protected classes fails closed even when the filenames differ.

`config/dabangil-parallel-execution-v1.json` is the closed policy source, and
`scripts/automation/parallel-execution-v1.mjs` validates both that authority
and each exact lane plan. Historical one-writer contracts remain unchanged;
this decision supersedes them only for the exact program and conditions above.

## Preserved boundaries

All work remains Owner-only and default-off. Public activation, payment,
external learner activation, remote Supabase mutation and Production mutation
remain false. This amendment grants no migration apply, secret/environment
change, release, invitation, rights-unclear content use, destructive action or
security weakening.

It installs no runtime and makes no claim of learning efficacy, transfer
validation, measurement calibration or calibrated exam-item quality.

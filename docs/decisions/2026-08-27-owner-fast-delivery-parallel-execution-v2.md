---
decision_id: owner_fast_delivery_parallel_execution_v2_2026_08_27
document_title: "Owner Decision — Fast Delivery / Parallel Execution V2"
decision_date_kst: 2026-08-27
status: candidate_effective_only_after_exact_head_owner_approved_squash_merge_and_validated_github_receipt
authority_kind: source_only_operating_amendment
---

# Owner Decision — Fast Delivery / Parallel Execution V2

## Decision

`FAST_DELIVERY_AND_PARALLEL_EXECUTION_V2` is a bounded operating amendment for
`INVERGE_OWNER_STUDY_OS`. It is not a product stage, master plan, runtime,
provider integration, release, or learning claim. It becomes authority only
after its HIGH-risk candidate passes the exact applicable checks and one fresh
exact-head formal review, receives exact Owner approval, is squash-merged at
that reviewed head, and has a validated resulting-main GitHub receipt.

The candidate starts at protected main
`fd8d0039bbeb2981935fdb671094e37d73a34400`, tree
`1d338b7be92cfc98c00611b4ff3f2b75dea1784d`. PR #850 is closed unmerged at
head `b6a2bab8ce2c3f074526080afb60a1fbd9741985`, tree
`6c8221df4d649929c1cf71502c909337f91c4a51`, with disposition
`QUESTION_FOUNDRY_R5_CLOSED_UNMERGED_SCOPE_SPLIT_DONOR`. PRs #849 and #850
are read-only donor evidence. Neither has merge authority; their ancestry may
not be cherry-picked into a replacement.

Until this amendment's receipt exists, no Question Foundry product mutation
authorized below may begin.

## Risk-routed validation

Every pull request runs one changed-path classifier. HIGH wins over MEDIUM,
MEDIUM wins over LOW, and an unknown path is HIGH. Its metadata-only result
selects exactly one final validation profile while implementation loops use
focused tests only.

The sole downgrade exception is a registered split-lane branch whose complete
live diff fits its frozen exact path manifest plus the serial program-log
integration path. That branch uses the profile frozen for its lane. Any extra
path or HIGH signal removes the exception and fails to the ordinary highest
profile. HIGH semantic signals are derived from the exact changed-file patch
in both CI and the merge-time reclassification; an unavailable or incomplete
patch is HIGH, and a registered-lane profile can never suppress that result.

- LOW covers docs, schema, pure helpers, bounded algorithm modules and
  Golden/hostile fixtures. It requires focused deterministic tests, applicable
  schema parsing, typecheck, changed-file lint, `git diff --check`, and one
  final exact-head review. PostgreSQL replay, browser-to-database, inherited
  Practice/Theory/Law runtimes, the Windows full suite and repeated broad
  review are forbidden.
- MEDIUM covers source-only integration, adapters and ordinary API/UI work. It
  requires focused tests, the affected regression family, a production build,
  one representative E2E only when applicable, `git diff --check`, and one
  final exact-head review.
- HIGH covers workflow/rules authority, migrations, RLS/auth, durable release
  authority and remote/Production/payment scope. It requires every applicable
  security/runtime proof, the applicable full or exact bounded release suite,
  a production build, `git diff --check`, one final exact-head review and
  exact Owner approval. The V2 workflow-authority candidate itself uses the
  full Linux and Windows route. Registered QF-I1 instead uses only its frozen
  bounded HIGH validation and does not inherit Windows or durable-runtime
  work.

The stable required-check names are `pr-contract`, `risk-classifier`,
`runtime-gate`, `fast-ci`, `full-ci`, `full-ci-windows`, and
`Learner Loop Health`. Each stable check reaches a terminal result. Expensive
reusable Linux or Windows work runs only when its profile is eligible; a
stable aggregator verifies a policy-authorized not-applicable result instead
of skipping a required check. Same-PR stale runs are cancelled and npm
dependencies use the repository cache.

## Ready and merge gate

LOW and MEDIUM may use the V2 automatic gate only on a trusted same-repository
branch registered by exact lane authority. It re-fetches the pull request and
exact head, reclassifies every live changed path, requires the exact isolated
worktree declaration, proves every changed path is inside that lane's exact
manifest, and fetches the live validated resulting-main receipts for the V2
start gate and every prior milestone in the declared merge order. It also
revalidates the sole QF-S1/QF-S2 parallel pair and the two-lane cap. The gate
verifies every stable check at that head, requires one clean
formal review bound to the exact head and submitted after the applicable
checks, requires actionable P0/P1/P2 `0/0/0`, zero unresolved non-outdated
review threads and zero blocking labels, then marks Ready and performs an
expected-head-pinned squash merge. After Ready it rebuilds and re-evaluates
that complete live snapshot, including labels, reviews, threads, checks,
semantic risk, dependency receipts, order and concurrency. Any missing,
stale, malformed, ambiguous or changed evidence fails closed. HIGH is rejected
by this automatic path and requires a separate exact-head Owner approval.

The one machine-readable clean-review marker is
`FAST_DELIVERY_V2_FINAL_REVIEW head=<40_hex_sha> actionable=0/0/0`; the review
submission itself must bind that commit and come from a trusted repository
reviewer. A PR-body string or untrusted comment is not review authority.

Direct main pushes, force pushes, rebases, amends and history rewrites remain
prohibited.

## Isolated lanes and ownership

Every merge-producing lane has one unique isolated worktree, one unique
ordinary `codex/` branch and an exact repo-relative path manifest without
globs. Each changed path has exactly one owner. Missing or undeclared paths,
path traversal, duplicate worktrees or branches, and owned-path or changed-path
overlap fail closed. One declared integration and merge order is mandatory.

The V1 three-lane and post-Kernel subject/eval grants remain historical for
completed or independently authorized work. V2 supersedes only the monolithic
Question Foundry lane with the split campaign below; it does not increase any
unrelated writer cap.

## Question Foundry split campaign

After the validated V2 receipt, the sole order is:

1. `QF_0_QUARANTINE_CORE` (MEDIUM);
2. `QF_S1_BOUNDED_SIMILARITY_CORPUS_V1` (LOW);
3. `QF_S2_CANDIDATE_TIME_AWARE_AUDIT_PRELUDE_V1` (LOW);
4. `QF_S3_DEPENDENCY_RANKED_TRANSFER_CHRONOLOGY_V1` (LOW); and
5. `QF_I1_RELEASE_INTEGRATION` (HIGH).

QF-S1 and QF-S2 are the only parallel pair and may open only after the
validated QF-0 receipt. QF-S3 starts only after QF-S2 merges. QF-I1 starts only
after validated receipts for QF-0, QF-S1, QF-S2 and QF-S3. The exact path
manifests and dependencies are closed in
`config/dabangil-fast-delivery-parallel-execution-v2.json`; no lane may modify
another lane's module. The program log and shared test registration are held
by a single serial integration coordinator, never by the parallel
implementation lanes.

QF-0 is independently safe with all candidates permanently `QUARANTINED` and
no release state, bank assignment, learner runtime, provider, network or
database. QF-S1 owns only bounded similarity; QF-S2 owns only candidate-time
audit prelude; QF-S3 owns only dependency-ranked transfer chronology. Only
QF-I1 may connect the frozen modules and make `PERSONAL_LEARNING_USABLE` or the
stronger closed-bundle `TRANSFER_VERIFIED` available. AI-only evidence cannot
exceed `PERSONAL_LEARNING_USABLE`; `MEASUREMENT_CALIBRATED` remains unavailable
without actual Owner response evidence.

Each split milestone receives one original candidate and at most one clean
replacement. There is no third replacement and no unchanged-head rerun to seek
a different review. A blocked lane does not invalidate or rerun an unrelated
merged lane.

## Preserved boundary

This amendment installs no Question Foundry product code, learner runtime,
provider/network access, database or RLS change, payment, public or external
learner activation, remote Supabase mutation or Production mutation. All such
states remain off. It makes no claim of actual learning efficacy or calibrated
exam-item quality.

---
document_title: "Owner Decision — C3R-A1 Independent Serial Program Authority"
status: "owner-decision/approved-candidate-source-contract-only"
decision_id: "owner_wcv_c3r_a1_serial_program_authority_2026_08_21"
dated: "2026-08-21 KST"
repository: "chachathecat/inverge"
roadmap_item_id: "WCV-C3"
campaign_id: "C3"
lead_issue: 706
recovery_tracker_issue: 781
authority_stage: "C3R-A1"
repository_authority_effective_on: "expected-head-pinned squash merge and validated GitHub receipt"
runtime_authorization: "none"
remote_database_authorization: "none"
production_authorization: "none"
payment_authorization: "none"
learner_activation_authorization: "none"
automatic_successor_start: false
---

# Owner Decision — C3R-A1 Independent Serial Program Authority

## Decision

PR #785 cleanly installed C3R-A0, the independently complete PostgreSQL
migration-dependency authority. C3R-A1 consumes that exact validated upstream
receipt and installs the strict source-only WCV-C3 recovery program:

```text
C3R-P → C3R-T → C3R-L
```

Only after this decision's expected-head-pinned squash merge and validated
GitHub receipt does C3R-P become `authorized_unstarted`. C3R-T remains blocked
on a validated C3R-P merge receipt. C3R-L remains blocked on validated C3R-P
and C3R-T merge receipts. WCV-C3 remains incomplete and no runtime starts in
this Work.

This decision owns C3R-A1 only. It authorizes no C3R-P/T/L implementation,
migration-file change, Supabase apply, RLS, Storage, API, learner UI,
Production, payment, provider, learner activation, first-round, mobile,
instructor or Issue #776 productization work. It closes no issue and starts no
successor.

## Reconciled start gate

The candidate starts from live `main`
`3a7047cf4c7fc68247137bafbca2434abdadbc7f`, tree
`543f8dfb5fdd026c1361e1a502376945912e6c5c`. PR #785 is merged and
unreverted with reviewed head
`f7f959368525f8a5895026f1361f6e13fd6226e0`, reviewed tree
`543f8dfb5fdd026c1361e1a502376945912e6c5c`, and squash merge SHA
`3a7047cf4c7fc68247137bafbca2434abdadbc7f`. Its ruleset-required checks
passed, final actionable P0/P1/P2 is `0/0/0`, and unresolved actionable thread
count is zero.

Issues #706, #707, #708, #714 and #781 are open. No open C3R-A1, C3R-P,
C3R-T or C3R-L PR or overlapping WCV-C3 writer exists. The only current WCV
item is the queued, selected and unstarted WCV-C3 envelope; it is not a
running writer. Remote Supabase mutation, Production, payment and learner
activation remain zero.

The package identities remain Git blobs
`33a8d29b52ac225c6e957c71fce1f28f2eaba16d` for `package.json` and
`70f85fb69c39aa73cf572082c4d38eb426c0b398` for
`package-lock.json`. Neither file may change.

## Exact C3R-A0 receipt and immutable boundary

The machine contract stores one `C3RA0ValidatedReceiptV1` binding PR #785,
its reviewed head/tree, squash merge, resulting main SHA/tree, passed required
checks, final actionable `0/0/0`, and zero unresolved actionable threads. It
also binds these immutable upstream objects:

| A0 object | Git blob | SHA-256 |
|---|---|---|
| Owner decision | `8996f6c61f6cf0c5f7c908e97437a2f24bc65f8f` | `f3be7b829539fa51c9037a58f05ed5a7c3fccbfcae28b3bb7b716330865b2ba6` |
| Machine manifest | `49916703d0a144647d6abce8cc98971042a35e1c` | `e6e6d741d47732137860c0efc5c0dddc6b75e54fbd0ed6f2b1bcbe88e9f9d8e9` |
| Analyzer | `23ba3b9f2af452b250cea0cbbbc5f135e8643b2d` | `85751e62c300465b205f5e6d19357261af892a0072e06de2c4322258290fa6ec` |
| Focused A0 test | `04c5e3254ac03712a0fde27ef068329299305c40` | `fa7e388a0f785b41661ac4fff342de7afe9dc05e03dee0e7afb0d3548bc6daaa` |

A reverted or mismatched A0 merge or any manifest/analyzer digest drift
invalidates A1. Candidate PR state, Issue #781 state and historical donor CI
cannot replace the receipt. A1 references A0 and does not copy or reinterpret
its 25-file migration manifest or analyzer.

The unchanged A0 suite independently proves exact filename closure,
occurrence/role-specific dependency evidence, extensions, external functions,
predecessors, and the fail-closed UNKNOWN/KNOWN_APPLIED remote-history gate.

## Closed runtime-stage merge receipt

Every runtime stage must later supply one live-GitHub-validated
`C3RStageMergeReceiptV1`. Its exact fields are stage, PR, base SHA, reviewed
head/tree, squash merge SHA, resulting main SHA/tree, passed exact-head
checks, formal review ID, actionable counts, unresolved actionable threads,
runtime evidence refs, metadata-only artifact refs, default-off state and
remote mutation count.

A valid receipt requires the reviewed head to be the pinned squash input; all
base/head/tree/resulting-main identities to match; exact-head checks to pass;
the formal review to be anchored to that head; actionable counts to be
`0/0/0`; unresolved actionable threads and remote mutations to be zero;
runtime evidence to be present; metadata artifacts to contain no raw learner
body; the feature to remain default-off; and the merge to remain unreverted on
main.

Issue state or closure, branch existence, a closed-unmerged PR, candidate-head
tests, donor CI or tracker text alone never satisfies a dependency.

## Serial stage authority

### C3R-P — Practice and common durable substrate

C3R-P is selected as `authorized_unstarted` only after the validated A1
merge. It owns migration-history reconciliation under A0; local and fresh
history compatibility; two fresh isolated Supabase reset/replay cycles; the
closed C3R-P runtime-evidence adapter; common durable persistence; forced RLS
and service-only RPC/repository; the complete Practice review outcome;
bodyless learning-gap and concept-state evidence signals; source-bound
learner-private failure notes; planner/review state separation; D+1, sealed
D+7 transfer, timed recurrence and later-failure reopen; Personal Study
Ledger, Review Queue and Today/Full-Day common substrates; restore/export/
delete; and exact Practice browser-to-Postgres evidence.

C3R-P may contribute evidence to #706, #707, #708 and Issue #714 allocation
C3. It may close none of them, claim no Theory or Law outcome, complete no
WCV-C3 terminal state, advance no later program and activate no learner or
Production system.

### C3R-T — complete Theory delta

C3R-T remains blocked until a validated C3R-P merge receipt exists. It owns
the complete Theory target/scope proof; exact contradiction and polarity
handling; D+1, sealed D+7 and timed recurrence; durable review outputs;
planner/review preservation; restore/export/delete; exact Theory browser-to-
Postgres evidence; and two fresh isolated reset/replay cycles through the
validated adapter.

C3R-T may contribute governed-issue evidence. It may not start from issue
state, claim Law completion, close a governed issue or complete WCV-C3.

### C3R-L — complete Law delta and terminal closeout

C3R-L remains blocked until validated terminal receipts exist for both C3R-P
and C3R-T. It owns exact statute/source/version/anchor/locator binding;
effective-window and applicable-date proof; currentness and conflict handling;
D+1, sealed D+7 and timed recurrence; durable review outputs; restore/export/
delete; exact Law browser-to-Postgres evidence; two fresh isolated reset/
replay cycles through the validated adapter; and terminal WCV-C3 closeout.

Only C3R-L may complete WCV-C3, complete Issue #714 allocation C3 while
preserving C4 and C6, close or recommend closure of #706/#707/#708, close
Tracker #781, advance the active-program selector, or publish the terminal
WCV-C3 receipt.

## Governed issue allocation

Each subject independently proves for #706: frozen D0, D+1 unaided
reconstruction, sealed non-same-surface D+7 transfer, timed recurrence and
later-failure reopen.

Each subject independently proves for #707: learner-private forced-RLS
ledger, exact source/attempt/artifact/item binding, bodyless recurring-
deduction/evidence projection, source-bound failure notes and restore/export/
delete.

Each subject independently proves for #708: deterministic Review Queue, Today
and Full-Day, CoreOutcome maximum three, planner/review state separation,
accept/edit/reject without evidence mutation, and stale-plan rejection plus
eligibility refresh.

One subject or one passing path never closes an issue. Issue #714 remains open:
C3 completes only with the C3R-L terminal receipt, while C4 and C6 remain
unaffected and open.

## Delivery and post-merge state

This Work uses one branch, one Draft PR, ordinary non-force pushes and no
auto-merge. It receives at most two source corrections and three exact-head
formal reviews. Merge requires every live ruleset check on the exact current
head against the latest base, clean mergeability, a fresh exact-head Codex
review with actionable P0/P1/P2 `0/0/0`, zero unresolved actionable threads,
and a squash merge pinned to the reviewed head.

After a validated merge: C3R-A0 and C3R-A1 are installed; C3R-P is
`authorized_unstarted`; C3R-T is blocked on the C3R-P receipt; C3R-L is
blocked on the C3R-P and C3R-T receipts; WCV-C3 is incomplete; all five
governed issues remain open; remote Supabase mutation, Production, payment,
learner activation and successor-runtime-start counts remain zero.

## Exact owned paths

Every changed path has one A1-only reason:

1. `AGENTS.md` — install the higher-priority A1 authority summary.
2. `roadmap/active-program.yml` — mirror the post-merge C3R-P selector without starting it.
3. `config/dabangil-unified-program-contract.json` — machine-mirror the C3 recovery graph and gates.
4. `docs/dabangil-unified-program-contract.md` — human-mirror the same graph and allocation.
5. `docs/inverge-master-roadmap.md` — reconcile historical roadmap detail with the new current delivery stage.
6. `docs/decisions/2026-08-21-owner-wcv-c3r-a1-serial-program-authority.md` — record this exact Owner decision.
7. `config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json` — install the closed machine authority.
8. `docs/qa/wcv-c3r-a1-serial-program-authority-validation.md` — record start-gate and validation evidence.
9. `scripts/automation/validate-pr-contract.mjs` — add the exact A1-only reference-link exception required to keep all issues open.
10. `tests/wcv-c3r-a1-serial-program-authority.test.mjs` — enforce focused and hostile authority invariants.
11. `scripts/run-node-tests.mjs` — register the focused A1 suite exactly once.

No A0 authority file, migration, application, component, review runtime,
workflow, package, lockfile, environment, provider or deployment path is
owned.

---
document_title: "Owner Decision — Bounded Terminal-Delivery Delegation"
status: "owner-decision/approved-control-plane-only"
decision_id: "owner_bounded_terminal_delivery_delegation_2026_08_16"
dated: "2026-08-16 KST"
repository: "chachathecat/inverge"
foundation_phase: "F"
delivery_issue: 736
repository_authority_effective_on: "expected_head_pinned_squash_merge_and_validated_736_receipt"
expected_first_stage: "C2R-C-P"
expected_first_stage_issue: 703
automatic_non_production_continuation: "bounded_live_authority_selector"
general_automatic_start_flag_mutation: false
runtime_authorization: "stage_owned_only_after_dependency_ready_selection"
production_authorization: "none"
payment_authorization: "none"
public_release_authorization: "none"
destructive_operation_authorization: "none"
---

# Owner Decision — Bounded Terminal-Delivery Delegation

## 1. Exact authority and effective boundary

This decision installs the fifth and terminal outcome of the one-time
foundation campaign authorized before C2R-C-P implementation. Its exact
machine mirror is
`config/foundation-bounded-terminal-delivery-delegation-v1.json`.

The decision is candidate evidence until its expected-head-pinned squash merge
and a live-validated #736 delegation receipt. Neither this document, Issue
#736, a candidate commit, passing CI nor a review comment alone activates the
delegation. The receipt must prove the reviewed remote head, squash parent and
tree, protected merge, issue result and synchronized next-stage selector.

The four predecessor outcomes are terminal and ordered:

| Outcome | Issue | PR | Merge commit |
|---|---:|---:|---|
| Windows/Linux parity | #728 | #729 | `a8fd49ba2a31ea88b50a45e4ac218903f3ab0409` |
| production dependency security | #730 | #731 | `d3e48a8d2ad956d48faabad2c112e95a9ab1150b` |
| development-toolchain security | #732 | #733 | `54827475893a4884de9a9192f11b38bcba33f429` |
| continuous security automation | #734 | #735 | `82cfbf73dbe7b94120c551f6e5459c41f96ee831` |

Their exact base/head/merge chain is frozen in the machine contract. A closed
issue or prose assertion cannot substitute for any merge receipt.

## 2. One writer and protected repository path

There is exactly one merge-producing writer across the repository. A delivery
uses one feature branch and one pull request. The writer may create a branch,
commit intentionally, push by ordinary non-force update and synchronize the
PR body, issue, roadmap and current-stage record inside the authorized stage
scope.

Direct push to main, force push, amend, rebase, reset, history rewrite,
auto-merge and bypass are prohibited. The `main-pr-only` ruleset must remain
active with an empty bypass list, a pull request requirement, review-thread
resolution, squash-only merge, and non-fast-forward/deletion protection.

## 3. Exact-head delivery cycle

Every PR performs the following bounded cycle:

1. refresh live GitHub, main, authority, dependencies and writer state;
2. select only one dependency-ready non-Production stage;
3. create and synchronize one feature branch, commit series, push and PR;
4. run scoped local validation and the repository baseline;
5. obtain successful fresh remote checks on the exact head for PR contract,
   risk, runtime, fast CI, Ubuntu full CI, Windows full CI, learner-loop
   health, security audit/SBOM and Vercel;
6. request fresh hostile review of that exact head;
7. apply at most two source corrections across the PR;
8. after each correction, rerun local/remote evidence and fresh review;
9. reply to and resolve a thread only after the correction is verified;
10. require actionable P0/P1/P2 `0/0/0` and all threads resolved;
11. re-fetch base/head/ruleset immediately before merge;
12. squash merge only with the reviewed head as the expected head;
13. validate parent/tree/head/check/review/issue/roadmap receipt fields; and
14. only then release the writer slot and select the next authorized stage.

PR-body-only metadata correction does not consume the source-correction
budget. A commit that changes repository source after actionable review does.
No failing or skipped test may be weakened, deleted or bypassed to make the
cycle pass.

If P0 or P1 remains unresolved after two source corrections, stop at the Owner
gate with the PR open and unmerged. A remaining P2 also blocks merge and must
be safely deferred or replaced without creating Production or bypass
authority.

## 4. Receipt and synchronization

The delegation receipt is metadata-only. It binds repository, issue, PR,
base, expected/reviewed/remote head, merge commit and parent, candidate and
merge trees, squash method, exact-head check results and their all-successful
verdict, review counts, thread state, effective ruleset types and exact pull-
request parameters, issue state, roadmap/current-stage state and the next
authorized tuple. Candidate and merge trees must match. The merge parent must
equal the re-fetched base, and reviewed/remote/expected heads must be the same
commit. A missing, pending, skipped, cancelled or unsuccessful required check
blocks the receipt.

Raw diffs, source bodies, audit reports, learner answers, OCR, private content,
credentials and secrets are not receipt fields or uploaded delivery evidence.
Every PR retains an explicit protected rollback path.

## 5. Bounded automatic continuation

After this decision's own receipt validates, the writer does not request the
next routine Owner prompt. It re-reads live repository authority and begins
only the next dependency-ready non-Production stage. The expected first tuple
is:

`WCV-C2 / C2 / #717 / C2R-C-P / #703 / authorized_unstarted`.

C2R-C-P still requires the validated terminal C2R-A and C2R-B merges and
receipts: PR #724 merged as `2f0638469119e4f43578c0c96b11c8097a924bee`
for C2R-A/#702, and PR #726 merged as
`cc3cfcc1c2f20f89633e5f5c1efe5ac68081f903` for only C2R-B's Issue #714 C2
allocation. Issue #714 remains open with C3, C4 and C6 preserved. Issue state
cannot substitute. The stage remains one complete
Practice learner-visible vertical: any changed fixture, persistence/RLS,
server/CAS/idempotency, API, runtime, UI, evidence, safe-deferred and rollback
layer stays inside it. The delegation changes no product architecture,
subject allocation, donor row, rights status or stage closure rule.

Historical and stage-owned `automaticStartAllowed: false` values remain
unchanged. The bounded continuation is the Owner's direct instruction to this
delivery controller after a validated receipt; it is not a general queue
runner, auto-merge facility, issue-triggered start or permission for an
otherwise unauthorized stage.

## 6. Owner gates retained exactly

Owner approval remains required only for:

1. Production migration, RLS or Storage apply;
2. Production secret or environment mutation;
3. actual charge, price, refund or checkout activation;
4. real learner or instructor invitation;
5. rights-unclear content;
6. public release or domain promotion;
7. destructive or irreversible data operation;
8. material product-scope change; and
9. unresolved P0/P1 after the two-source-correction budget.

These gates cannot be inferred from a successful non-Production stage,
receipt, issue closure, preview, CI result or Owner-private evidence.

## 7. Preserved fail-closed boundaries

One writer, exact-head evidence, source/right/currentness/effective-version
checks, private learner-data boundaries, no raw learner body in logs,
analytics or artifacts, rollback per PR, branch protection and all existing
tests remain mandatory. The delegation grants no Production, payment, real-
user, public-release, secret, rights-unclear, destructive or material-scope
authority.

V13 remains the sole active master. WCV 1.0.8, WCV-C2 and ULC-0 remain
subordinate. The live product tuple is unchanged by this control-plane PR.

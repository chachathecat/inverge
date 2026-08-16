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
replacement_owner_gate: "any_actionable_p0_or_p1_requires_owner_classification_and_action"
structural_simplification_authorization_record: "https://github.com/chachathecat/inverge/issues/736#issuecomment-5307469181"
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
uses one active feature branch and pull request at a time. The writer may
create a branch,
commit intentionally, push by ordinary non-force update and synchronize the
PR body, issue, roadmap and current-stage record inside the authorized stage
scope.

Direct push to main, force push, amend, rebase, reset, history rewrite,
GitHub auto-merge and bypass are prohibited. After every gate is clean, the
active writer must automatically perform the expected-head-pinned squash
merge; that controller action is not GitHub auto-merge. The `main-pr-only`
ruleset must remain active with an empty bypass list, a pull request
requirement, review-thread
resolution, squash-only merge, and non-fast-forward/deletion protection.

## 3. Exact-head delivery cycle

Every PR performs the following bounded cycle:

1. refresh live GitHub, main, authority, dependencies and writer state;
2. select only one dependency-ready non-Production stage;
3. create one feature branch and complete the focused candidate;
4. exhaustively audit the whole same-root change and batch findings;
5. commit intentionally, then run scoped local validation and the repository
   baseline on that exact committed head;
6. push by ordinary non-force update and create or synchronize the PR body to
   that pushed head;
7. obtain successful fresh remote checks on the exact head for PR contract,
   risk, runtime, fast CI, Ubuntu full CI, Windows full CI, learner-loop
   health, security audit/SBOM and Vercel;
8. request fresh hostile review of that exact head;
9. use at most three exact-head review cycles per PR, with at most one batched
   source correction between consecutive review cycles;
10. after each correction, rerun local/remote evidence and fresh review;
11. reply to and resolve a thread only after the correction is verified;
12. when the third review cycle is not clean, close the PR unmerged and
    automatically transfer the still-valid candidate into at most one clean
    replacement PR;
13. if the clean replacement contains any actionable P0 or P1, stop for one
    explicit Owner `same_root`/`distinct_root` classification and
    `repair`/`replan`/`close` action; do not infer semantic identity from a
    title, prose, punctuation, case, hash or writer-selected label;
14. repair a P2-only replacement batch automatically within its remaining
    correction budget;
15. require actionable P0/P1/P2 `0/0/0` and all threads resolved;
16. re-fetch base/head/ruleset and one-writer state immediately before merge;
17. squash merge only with the reviewed head as the expected head;
18. validate parent/tree/head/check/review/local-validation/replacement/issue/
    roadmap receipt fields; and
19. only then release the writer slot and select the next authorized stage.

PR-body-only metadata correction does not consume the source-correction
budget. A commit that changes repository source after actionable review does.
No failing or skipped test may be weakened, deleted or bypassed to make the
cycle pass. Correction-budget exhaustion is an internal control and never a
routine Owner interruption: it triggers automatic clean replacement or safe
replanning. Any actionable P0 or P1 on the one clean replacement requires an
Owner classification and action before further source mutation. The gate is
existential and cannot be bypassed by rewording. A remaining P2 blocks merge
but requires autonomous repair or safe replanning rather than an Owner prompt.

For PR #743, the resolved Owner record is
`https://github.com/chachathecat/inverge/issues/736#issuecomment-5307469181`.
It classifies PR #742 `discussion_r3791617114` and PR #743
`discussion_r3791696198` as `same_root`, authorizes
`structural_simplification_repair` across the existing five-file Foundation
5/5 scope, keeps `merge_authorized` false until a fresh exact-head `0/0/0`,
and grants no Production authority.

## 4. Receipt and synchronization

The delegation receipt is a metadata-only audit summary, not an independent
trust root. It records repository, issue, PR, base/head/tree/merge identity,
one-writer state, bounded corrections and reviews, local preflight, remote
checks, review/thread evidence, ruleset state, issue/roadmap synchronization
and the next tuple only after those values have been resolved from live state.
Receipt-authored booleans or counts cannot authorize merge or continuation.

Every local validation name is pinned to its exact Windows or POSIX command,
zero exit and exact committed head. These records are mandatory development
preflight before push/review but are writer-authored diagnostics only. They are
not trusted execution provenance and cannot independently satisfy a merge or
continuation gate. Every merge-authorizing test, build and security result must
instead resolve from an immutable exact-head GitHub check-run or commit status
in `chachathecat/inverge`, binding database/API identity, name, head, successful
conclusion, details URL and completion time. Missing, pending, skipped,
cancelled, fabricated or mismatched remote evidence blocks.

For every exact-head review cycle, resolve the immutable GitHub review database
ID, node/API/HTML identity, reviewer login and database ID, `commit_id`,
`submitted_at` and body. Retrieve the complete paginated comment set belonging
to that exact review. Each actionable comment must resolve its immutable
comment/review/author/path/head/time identity and carry exactly one P0/P1/P2
badge. The complete resolved comment set derives counts and the terminal result;
a missing page, badge-less comment, wrong review/head, mismatch, receipt-authored
count or self-reported `clean` result cannot substitute. The final review must
resolve to the expected head and derive `0/0/0`.

Superseded and replacement PR evidence remains separate and symmetric. The
receipt keeps each PR's live identity, head, correction history, review records
and complete comment sets; it computes no semantic identity between findings.
Any P0/P1 on the clean replacement triggers the Owner gate regardless of title,
case, punctuation or wording. The required Issue #736 Owner record must resolve
and preserve in the receipt its exact GitHub URL and immutable database ID,
normalized exact-body digest, author `chachathecat`/database ID `128282020`,
unchanged creation/update times, Owner-authorized time, repository, issue,
superseded/replacement PRs, finding URLs, classification and authorized action.
The record postdates the triggering review and authorizes only bounded
repair/replan/close; it never authorizes merge before a fresh exact-head
`0/0/0`. P2-only replacement findings do not falsely trigger the Owner gate.

Each corrected actionable thread binds its live thread node ID, top-level
comment ID and finding head, correction head and resolved GitHub commit time,
one reply by `chachathecat`, current `isResolved=true`, `resolvedBy` and the
later clean review on that correction head. The complete required exact-head
check set must resolve successful for that correction head first; the reply
must postdate every resolved check completion time and the clean review
submission time, and its exact body binds the corrected head. Resolved state
without the reply, reply before completed verification, reply without
resolution, or reply/resolution without the later clean review blocks. GitHub
supplies no resolution time, so the receipt records none.

Candidate and merge trees must match. The merge parent must equal the re-fetched
base, and reviewed/remote/expected heads must be the same commit. Each
correction head has the preceding reviewed/correction head as parent; more than
two source corrections or three review cycles blocks that PR. Immediately
before and after merge, independently re-fetch PR/base/head/state/mergeability,
reviews and complete comments, required checks, threads, ruleset/effective
rules, writer state, Issue #736, live main and roadmap authority. Stale, absent
or receipt-only state blocks merge or continuation.

Immediately before merge, the receipt independently resolves repository
ruleset ID `20903914` and the effective rules for `main`. RFC 8785 JCS digests
bind both exact API records, including the ruleset update time, active
`main-pr-only` identity, branch target, exact `~DEFAULT_BRANCH` condition,
empty bypass array, exact pull-request/non-fast-forward/deletion rules and
exact squash/review-thread parameters. That observation must postdate the
final checks and review, precede the merge request and be no older than 300
seconds when the expected-head-pinned merge is requested. Its time is the later
of the two resolved GitHub `Date` response headers; both `Date` and `ETag`
headers are receipt-bound and the responses must be within 30 seconds. The
calls use authenticated HTTPS, the pinned GitHub API version,
`Cache-Control: no-cache`, response 200 rather than 304, and receipt-bound
`X-GitHub-Request-Id` values. Post-merge validation also binds the resolved PR
`merged_at` and requires it to be zero to 300 seconds after the observation.
Stale, unresolved,
disabled, bypassed or mismatched protection blocks the receipt and merge.

Every delivery has exactly one issue association. A closing reference is used
only when live stage authority permits that issue to close; a nonterminal stage
uses a non-closing association. In particular, C2R-C-P and C2R-C-T cannot close
#703, #704 or #705; only terminal C2R-C-L may close them.

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
5. rights-unclear content or unresolved privacy/legal authority;
6. public release or domain promotion;
7. destructive or irreversible data operation;
8. material product-scope change; and
9. classification and action whenever any actionable P0/P1 exists on the one
   clean replacement PR.

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

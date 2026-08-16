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
13. autonomously repair new or distinct replacement findings; if that
    replacement itself exhausts its cycles on new or distinct findings, replan
    them into a new focused delivery rather than interrupting the Owner;
14. require actionable P0/P1/P2 `0/0/0` and all threads resolved;
15. re-fetch base/head/ruleset and one-writer state immediately before merge;
16. squash merge only with the reviewed head as the expected head;
17. validate parent/tree/head/check/review/local-validation/replacement/issue/
    roadmap receipt fields; and
18. only then release the writer slot and select the next authorized stage.

PR-body-only metadata correction does not consume the source-correction
budget. A commit that changes repository source after actionable review does.
No failing or skipped test may be weakened, deleted or bypassed to make the
cycle pass. Correction-budget exhaustion is an internal control and never a
routine Owner interruption: it triggers automatic clean replacement or safe
replanning. Owner intervention is allowed only when the same actionable P0 or
P1 survives one clean replacement PR. A remaining P2 blocks merge but requires
autonomous repair, replacement or safe replanning rather than an Owner prompt.

## 4. Receipt and synchronization

The delegation receipt is metadata-only. It binds repository, issue, PR,
base, expected/reviewed/remote head, merge commit and parent, candidate and
merge trees, squash method, exact-head check results and their all-successful
verdict, exact-head local-validation results and their all-successful verdict,
the single writer identity/count, replacement lineage, the initial reviewed
head, ordered source-correction heads, exact source-correction count and budget
verdict, independently verifiable review run/reference/reviewer/cycle-head/
remote-head/reviewed-head/time/terminal-result/count evidence for every cycle,
plus successful local-validation and remote-check evidence keyed to that exact
cycle head. Each local-validation name is pinned to its exact Windows or POSIX
canonical command, zero exit, exact head and independently resolvable,
SHA-256-bound execution evidence. A validation label cannot attest to a
different or no-op command. Each remote-check entry must also resolve an
immutable GitHub check-run or commit-status database identity and API record
in `chachathecat/inverge`. The resolved object, not receipt-authored values,
binds its exact name, head, successful conclusion, details URL and completion
time; fabricated, unresolved or mismatched evidence blocks. Top-level check
and local-validation evidence uses
`expected_head_sha` as its binding context, while evidence nested in a review
cycle uses that exact `cycle_head_sha`; the two contexts cannot be substituted
or compared to each other's head. For every superseded PR, the receipt separately
binds closed-unmerged state, the complete review-cycle and source-correction
history, and every actionable finding through a stable SHA-256 identity over
repository, delivery issue, root invariant and path. That identity uses the
versioned `finding-identity-rfc8785-jcs-sha256-v1` encoding: strings are first
Unicode NFC normalized with no surrounding whitespace, the exact four-member
JSON object is serialized as UTF-8 RFC 8785 JCS bytes, and the lowercase
SHA-256 is recomputed. Repository and issue are fixed. The root invariant is
not a writer-selected label: its lowercase SHA-256 is recomputed from the
version-normalized finding title extracted from the independently resolved
digest-bound, unedited GitHub review comment. Its database ID, author, exact
body digest and identical creation/update time remain in the receipt alongside
the normalized title. Its P0/P1/P2 priority badge is mandatory, is extracted
from the same resolved heading and must equal receipt severity; badge-less or
unstructured actionable review evidence blocks. The resolved review run and
each actionable comment must be authored by
`chatgpt-codex-connector[bot]`, immutable GitHub database ID `199175422`, not
the merge-producing writer. Paths are case-sensitive normalized repository-relative
forward-slash paths with no empty or dot segments. Replacement lineage
accounts for each such identity exactly once and uses independently verifiable
review URLs to prove whether the same P0/P1 survived and therefore requires
the Owner gate. A triggered gate must include a later, independently
resolvable Owner authorization record, its exact content digest, decision and
time. Both its payload actor and the immutable GitHub hosting-author identity
resolved from the record URL must be `chachathecat`; the resolved database
identity, Owner user database ID `128282020` and host creation time must also
match the receipt. The record must
postdate the matching replacement finding and bind repository, replacement PR,
stable finding identity and review URL. Every replacement finding is compared against every
superseded stable identity; a matching P0/P1 cannot be labeled distinct.
Acknowledgment that approval is required is not approval and blocks the
receipt. It also binds thread state, effective ruleset
types and exact pull-request parameters, the authority-dependent issue
association kind and closure permission, issue state, roadmap/current-stage
state and the next authorized tuple. Candidate and merge trees must match. The
merge parent must equal the re-fetched base, and reviewed/remote/expected heads
must be the same commit. Each correction head
must have the preceding reviewed/correction head as its parent; the final
reviewed head is the last correction head, or the initial reviewed head when
the count is zero. More than two source corrections or three review cycles
blocks that PR from merging and triggers replacement or replanning. A missing,
pending, skipped, cancelled or unsuccessful required check, review or local
validation on any reviewed cycle head also blocks it.

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
9. the same actionable P0/P1 persisting after one clean replacement PR.

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

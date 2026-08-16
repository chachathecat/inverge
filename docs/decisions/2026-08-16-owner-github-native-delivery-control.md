# Owner decision: GitHub-native delivery control

Date: 2026-08-16

## Decision owned

PR #743 is terminally closed unmerged. Its branch remains a read-only donor,
its review threads remain unresolved, and its executable-receipt design must
not be copied into a successor.

GitHub is the sole delivery trust boundary. The live repository ruleset,
current pull-request head, native required checks and configured producers,
review submissions, review threads, mergeability and merge result control
delivery. A repository document may summarize a completed merge after the
fact; it cannot independently establish or reproduce GitHub state.

This decision becomes repository authority only after the focused successor
PR containing it passes the live gates and is squash-merged with its expected
head pinned. Until then, Issue #736 remains open and C2R-C-P remains
authorized but unstarted.

## Delivery policy

- Exactly one merge-producing writer is permitted.
- Every change uses a feature branch, ordinary non-force push and pull request.
- The live ruleset-required native checks must be successful for the current
  PR head and the latest base required by the ruleset.
- Actionable findings are corrected, every review thread is resolved, and a
  fresh exact-head Codex review must report actionable P0/P1/P2 as `0/0/0`.
- Merge is squash-only and pinned to the reviewed expected head.
- Direct `main` push, force push, rebase, amend and history rewrite are
  prohibited.

The repository must not maintain an alternate delivery receipt, prior-check
history, self-authored check result, review counter, timestamp authority or
cryptographic proof. GitHub-native state is inspected live at the decision
point.

## Bounded repair, replacement and replanning

One PR receives at most two source corrections and three exact-head review
cycles. If exhausted, it closes unmerged and a clean replacement starts from
refreshed `main`. If that replacement is not clean, reduce the outcome and
create a smaller replacement rather than copying the failed design.

The same root blocker receives at most two clean replans. Budget exhaustion by
itself does not require an Owner prompt. Stop only when the same actionable
P0/P1 persists after both clean replans or an Owner gate below applies.

An actionable P2 cannot be waived for merge. It must be corrected or its
affected optional scope removed before final review. If it alone persists
through the second clean replan, close that candidate unmerged, record the P2
in backlog, defer the affected optional scope, and continue independent
authorized non-Production work. This is a terminal disposition for that
candidate, not a third replan or an Owner interruption. If removing the scope
would require an Owner-gated change, the applicable Owner gate controls.

If the persistent P2 affects mandatory scope, close the candidate unmerged and
structurally reduce it to a smaller independently complete outcome from
refreshed `main`. This is the explicit post-replan terminal disposition, not a
third clean replan. Structural reduction may not remove a core safety, rights,
privacy, evidence, learner-outcome or rollback invariant. If no smaller
complete outcome preserves those invariants, continuing would require a
material product-scope or learner-promise change and that Owner gate applies.

## Continuation and Owner gates

After this decision's protected merge is validated, close Issue #736, re-read
live repository authority, and begin the dependency-ready non-Production
stage. Continue subsequent dependency-ready non-Production stages without
routine Owner interruption, using the same branch, check, review and merge
policy for each focused PR.

Stop for Owner authority before any:

- Production migration, RLS or Storage apply;
- Production secret or environment mutation;
- actual charge, price, refund, checkout or payment activation;
- real learner or instructor invitation;
- rights-unclear content operation;
- unresolved privacy or legal operation;
- public release or domain promotion;
- destructive or irreversible data operation; or
- material product-scope change.

This decision authorizes no such operation and makes no product, runtime,
dependency, lockfile, roadmap, Production or external-service change.

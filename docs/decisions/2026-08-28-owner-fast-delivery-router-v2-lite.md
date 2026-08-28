# Owner decision: Conservative Fast Delivery Router V2 Lite

Date: 2026-08-28

Status: candidate authority; effective only after an exact-head-pinned squash
merge and a validated resulting-main receipt.

## Exact scope

This decision installs a conservative path-risk validation router. It is the
only Fast Delivery control-plane Work permitted before Question Foundry QF-0.
It does not install a semantic JavaScript analyzer, change product behavior,
or activate public, payment, external-learner, remote Supabase or Production
behavior.

The candidate starts from protected main
`fd8d0039bbeb2981935fdb671094e37d73a34400` with tree
`1d338b7be92cfc98c00611b4ff3f2b75dea1784d` and is tracked by Issue #855.
Workflow count remains exactly 48 before and after this Work.

## Closed donor evidence

- Dependabot PR #737 is closed unmerged at
  `caf29c3121f147560d3d677f96f61eb331d254f1` under
  `DEPENDABOT_PR737_CLOSED_UNMERGED_DEFERRED_WORKFLOW_DEPENDENCY_MAINTENANCE`.
  Its checkout, setup-node and upload-artifact major upgrades are deferred and
  are not copied here.
- Semantic Risk Classifier PR #854 is closed unmerged and preserved as donor
  evidence under
  `SEMANTIC_RISK_CLASSIFIER_V2_CLOSED_UNMERGED_DEFERRED_STATIC_ANALYSIS_DONOR`.
  Issue #853 is closed as not planned. No semantic classifier is installed.
- Issue #714 remains open and unchanged.

## Closed profiles

The public profiles are exactly `LOW`, `MEDIUM` and `HIGH`.

- `LOW` is available only to exact prefix-and-extension allowlisted,
  non-executable, non-authoritative paths. A root Markdown file, an executable
  file hidden in a LOW prefix, or any path outside the closed allowlist is not
  LOW.
- `MEDIUM` is the minimum for executable source and test files not already
  HIGH. Ordinary MEDIUM automatic merge is off.
- `HIGH` covers workflows, PR/risk/merge authority, packages and lockfiles,
  Owner and active-program authority, API/server/worker entrypoints,
  migration/RLS/auth, provider/network/payment/Production boundaries and
  every unknown, malformed or unclassified path.

A declared lane can raise but never lower the computed floor. Unknown signals
also fail closed as HIGH.

`MEDIUM_SOURCE_ONLY` is not a fourth profile. It is a conditional automatic-
merge eligibility subtype of MEDIUM. It requires an exact lane registration
already present on trusted main, exact branch and path ownership, isolated and
disjoint worktree evidence, default-off and no-runtime-reference evidence,
zero dependency/environment/database/API/provider/Production scope, focused
and affected regression evidence, and zero remote mutation. The initial
registry is empty.

## Trusted automatic merge boundary

Only LOW and a fully proven `MEDIUM_SOURCE_ONLY` candidate can enter automatic
Ready-and-squash evaluation. HIGH, unknown and ordinary MEDIUM cannot.

The merge actor always runs the router from trusted `main`; it never checks
out or executes pull-request code. Before mutation it re-fetches the exact
head, current main ancestry, bounded changed paths, mergeability, blocking
labels, every live ruleset-required exact-head check, a trusted exact-head
formal review with actionable counts `0/0/0`, current changes-requested state,
and unresolved non-outdated review threads. It re-fetches the complete gate
after the single Ready transition and pins squash merge to the reviewed head.
Any missing, stale, paginated, unknown or non-green evidence fails closed.

The risk-classifier required check remains named `risk-classifier`. It runs
the conservative path router, deterministic JSON/diff validation and focused
Router regressions. Existing required-check names remain unchanged; no broad
suite is duplicated.

## Non-authority and continuation

This candidate does not merge itself and requires exact-head Owner approval.
It changes no GitHub ruleset, Dependabot configuration, dependency version,
database, authentication policy or product code. It grants no Question
Foundry or product-wave mutation. After its validated resulting-main receipt,
the Owner's separately authorized continuation may resume; until then it is
inert source authority.

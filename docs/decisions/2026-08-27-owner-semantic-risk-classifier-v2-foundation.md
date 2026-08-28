# Owner decision: standalone Semantic Risk Classifier V2 foundation

Date: 2026-08-27

## Decision

Install one inert, source-only `SEMANTIC_RISK_CLASSIFIER_V2` foundation. It is
the first half of the Fast Delivery V2 scope split and is not another combined
delivery-control amendment.

PR #852 is closed unmerged as
`SEMANTIC_RISK_CLASSIFIER_V2_PR852_CLOSED_UNMERGED_PR_CONTRACT_SCOPE_SPLIT_DONOR`. Its branch and
exact head remain read-only evidence; its commit ancestry is not reused.

The classifier reads exact local Git base/head blobs, parses complete active
JavaScript and TypeScript family files with the already installed TypeScript
Compiler API, extracts closed semantic facts, and compares deterministic fact
multisets. Source locations, comments, whitespace, line wrapping, and harmless
movement do not create capability. New facts, increased multiplicity, unsafe
dynamic module loads, materially changed unsafe facts, incomplete comparison,
blocking parse diagnostics, blob failures, AST-analysis failures, and
machine-limit overflow fail closed.

## Boundary

This foundation changes no workflow, current risk route, Ready decision,
automatic merge authority, risk-policy authority, application behavior,
Question Foundry product code, dependency, lockfile, database, RLS, auth,
provider, Supabase, Production, payment, public, or external-learner state.
It performs no GitHub or network operation.

The later Workflow Router / Automatic Merge Authority V2 may consume the
classifier only after this foundation has an exact-head Owner-approved squash
merge and validated resulting-main receipt. That later stage is not started by
this decision.

## Delivery gate

The candidate is HIGH because it establishes a future security primitive.
It stays Draft and unmerged until repository-required exact-head CI, one blind
adversarial audit, one fresh formal exact-head review, actionable P0/P1/P2
`0/0/0`, zero unresolved actionable threads, and exact Owner approval.

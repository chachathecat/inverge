# WCV Campaign C1 Authority and Roadmap Reconciliation Validation

- date: 2026-08-11 KST
- state: source-only validation
- lead issue: #713
- start main: `2b75e1687bba711692769ad0f6558b0e552da772`
- start main tree: `eaebb2a6029e843e675741bb93bd62bbc7f2cb55`
- active master: V13 only
- WCV behavior baseline: `1.0.8` unchanged
- runtime evidence: none
- runtime/application mutation: none
- C2 implementation: not started
- real content, learner, payment and Production activation: none

## 1. Read-only start audit

The exact start was reverified before mutation:

- main equaled `2b75e1687bba711692769ad0f6558b0e552da772`;
- main tree equaled `eaebb2a6029e843e675741bb93bd62bbc7f2cb55`;
- PR #700 was merged/closed at merge commit `2b75e1687bba711692769ad0f6558b0e552da772`;
- Issue #699 was closed with reason `completed`;
- Issue #713 was open and not started;
- Issues #701–#714 were read with all current comments;
- the six other open PRs were stale historical PRs, not concurrent active writers;
- V13 was the sole active master; and
- no remote branch named `agent/wcv-a0-713-vertical-slice-reconciliation` existed.

The attached v2–v7 plans, prompts and handoffs were inspected only as
historical inputs. Live GitHub, current main and the dated 2026-08-11 Owner
authorization controlled.

## 2. Conflicting clauses found

The audit found these controlling conflicts:

1. `AGENTS.md` required one issue per PR and exactly one closing issue.
2. `roadmap/active-program.yml` had no WCV campaign mapping and WIP 2 was
   completely occupied by the factually blocked CPF-1 and S236P items.
3. The unified program contract allowed per-lock-group writers and WIP 2 but
   did not impose one global merge-producing writer for all delivery.
4. The V13 bounded-deliverable language could be misread as horizontal layer
   PR sequencing rather than learner-outcome sizing.
5. The WCV decision deferred delivery-graph reconciliation to #713.
6. Issue #701 comments `5237524452` and `5247765033` described separate child
   and #714 architecture-freeze PRs.
7. Issue #702 comment `5247768383`, Issue #703 comment `5247767476`, Issue
   #713 comment `5247766274`, and the Issue #714 body required the standalone
   `#702 → #714 → #703` merge sequence.

The dated decision names and supersedes each conflict without deleting its
historical GitHub evidence.

## 3. Changed-path snapshot

The initial pre-edit manifest was fixed at 12 source/control-plane/test paths:

1. `AGENTS.md`
2. `roadmap/active-program.yml`
3. `docs/strategy/ACTIVE-MASTER-PLAN.md`
4. `docs/dabangil-unified-program-contract.md`
5. `config/dabangil-unified-program-contract.json`
6. `docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md`
7. this validation record
8. `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
9. `scripts/run-node-tests.mjs`
10. `tests/dabangil-premium-alignment.test.mjs`
11. `tests/agent-factory-roadmap-runner.test.mjs`
12. `tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs`

Before publication, the repository-wide default suite demonstrated that its
legacy live-roadmap assertions also had to recognize the truthful third slot
and sole WCV-C2 selection. The initial exact-head Learner Loop gate then
identified one more assertion that still described S236P as queued. The
bounded corrective manifest was therefore frozen at 27 paths by adding these
assertion-only conformance surfaces:

13. `tests/inverge-product-constitution.test.mjs`
14. `tests/practice-answer-review-engine.test.mjs`
15. `tests/s214-reference-answer-pipeline.test.mjs`
16. `tests/s215-reference-answer-release-gate.test.mjs`
17. `tests/s216-error-notebook-gap-taxonomy.test.mjs`
18. `tests/s217-personal-core-concept-graph.test.mjs`
19. `tests/s218-similar-question-review-scheduler.test.mjs`
20. `tests/s219-learner-catalog-usage-ledger.test.mjs`
21. `tests/s220-billing-entitlement-credit-usage.test.mjs`
22. `tests/s221-paid-trust-privacy-cost-guardrails.test.mjs`
23. `tests/s222-academy-answer-operations-tenant-boundary.test.mjs`
24. `tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs`
25. `tests/s224-three-subject-learner-runtime-acceptance.test.mjs`
26. `tests/theory-answer-review-engine.test.mjs`
27. `tests/inverge-roadmap-curriculum-docs.test.mjs`

No runtime/application, schema, migration, RLS, Storage, provider, dependency,
content, deployment or Production path is in the final manifest.

## 4. Reconciled delivery model

The authority and machine mirror now require:

- one merge-producing Work, branch, PR and writer;
- explicit multi-issue vertical closure only for one outcome/test/deploy-
  rollback/privacy boundary;
- contract, API/storage, runtime, UI, tests/evidence, feature flag/safe deferred
  and rollback in one runtime vertical;
- no mandatory contract-only precursor for the same behavior;
- complete vertical and focused/runtime evidence before review;
- one exact-head review, at most one blocking correction and at most one
  correction verification; and
- stop-and-resize when a core blocker remains.

The unified machine contract advances from
`dabangil.unified_program.v2` to `dabangil.unified_program.v3` because the
campaign and delivery schema genuinely changes. The WCV learner-behavior
contract remains exactly `1.0.8`.

## 5. Runner-compatible WIP reconciliation

The roadmap runner supports only flat items and one exact-string lock group.
The campaign is therefore represented by actual `WCV-0` and `WCV-C1` through
`WCV-C6` items, not an unsupported nested YAML overlay.

```text
wipLimit: 3
occupied blocked reservations: CPF-1 + S236P = 2
available merge-producing slots: 1
global merge-producing writer limit: 1
campaign lock group: wcv-vertical-campaign
selected next item after C1: WCV-C2
```

CPF-1 remains `blocked_unknown_reachable_sinks` with `cpf1Complete: false`.
S236P remains `acceptance_blocked` with `acceptanceCompleted: false`,
`terminalPass: false` and `nextLiveAttemptAuthorized: false`.

## 6. Final campaign map

| Campaign | Lead | Included issues | Dependency | State after C1 |
|---|---:|---|---|---|
| C1 | #713 | #713 | WCV-0 | completed source-only on merge |
| C2 | #702 | #702–#705 | C1 | sole next implementation campaign |
| C3 | #706 | #706–#708 | C2 | queued |
| C4 | #709 | #709–#710 | C3 | queued; no activation |
| C5 | #711 | #711 | C4 plus exact cohort gate | queued |
| C6 | #712 | #712 | C5 | queued |

Issue #701 remains the parent. Issue #714 remains an open non-merge-producing
acceptance tracker. The historical standalone `#702 → #714 → #703` PR sequence
is non-operative.

## 7. #714 allocation proof

The machine mirror contains one closed `requirementInventory`. Its allocations
are disjoint and their union equals the inventory:

- C2: adaptive expertise, cognitive load, concept-repair decision and private
  artifact modes, progression/continue semantics, episode metacognition,
  initial fading/control transfer and no-shortcut invariants;
- C3: longitudinal calibration, transfer distance, volition/recovery, durable
  fading/control transfer, artifact/deferral/export/delete lineage and
  Today/Full-Day recovery semantics;
- C4: Owner proof, over/under-scaffolding red-team and baseline autonomy/
  metacognitive comparison; and
- C6: continuous instructional-mode, fading, transfer-distance, routing-error,
  metacognitive and control-transfer calibration.

C1 claims none of this behavior implemented.

## 8. Focused hostile assertions

The focused test fails when:

- V13 is not the sole active master;
- WCV `1.0.8` is promoted or bumped;
- more than one merge-producing writer or slot is authorized;
- one-issue-only PR language remains controlling;
- a complete vertical omits a required layer;
- a contract-only precursor or horizontal split is permitted;
- #702 or #714 becomes a standalone prerequisite before C2;
- any #714 requirement is missing or duplicated;
- CPF-1 or S236P is completed or bypassed;
- C1 source evidence claims runtime readiness;
- more than one next implementation campaign is designated;
- review starts before completion/validation;
- correction/review recursion is permitted; or
- the focused test drops out of the default runner.

## 9. Exact commands and results

The candidate tree was frozen before Ready with `WCV_C1_TMP` bound to one
workspace-local temporary directory. No dependency installation occurred.

```text
node scripts/run-node-tests.mjs tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs --workers=1
PASS — 16/16

TMPDIR="$WCV_C1_TMP" node scripts/run-node-tests.mjs tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs tests/agent-factory-roadmap-runner.test.mjs tests/dabangil-premium-alignment.test.mjs tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs tests/appraiser-second-world-class-vertical-contract.test.mjs --workers=1
PASS — 112/112

TMPDIR="$WCV_C1_TMP" node scripts/run-node-tests.mjs tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs tests/inverge-product-constitution.test.mjs tests/practice-answer-review-engine.test.mjs tests/s214-reference-answer-pipeline.test.mjs tests/s215-reference-answer-release-gate.test.mjs tests/s216-error-notebook-gap-taxonomy.test.mjs tests/s217-personal-core-concept-graph.test.mjs tests/s218-similar-question-review-scheduler.test.mjs tests/s219-learner-catalog-usage-ledger.test.mjs tests/s220-billing-entitlement-credit-usage.test.mjs tests/s221-paid-trust-privacy-cost-guardrails.test.mjs tests/s222-academy-answer-operations-tenant-boundary.test.mjs tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs tests/s224-three-subject-learner-runtime-acceptance.test.mjs tests/theory-answer-review-engine.test.mjs --workers=1
PASS — 120/120

TMPDIR="$WCV_C1_TMP" node scripts/run-node-tests.mjs --workers=1
DEPENDENCY-ABSENT LOCAL DIAGNOSTIC — 1,253/1,256 passed; the only three load failures were ERR_MODULE_NOT_FOUND for @supabase/supabase-js, fast-xml-parser and typescript because node_modules was absent

rg -o '"tests/[^"]+\\.test\\.mjs"' scripts/run-node-tests.mjs | tr -d '"' | rg -v 'tests/(legal-concept-anchor-seed|legal-source-ingest|postgrest-timestamps-normalization)\\.test\\.mjs' | xargs env TMPDIR="$WCV_C1_TMP" node scripts/run-node-tests.mjs --workers=1 --test-reporter=dot
PASS — all 1,253 dependency-free default tests

git diff --check
PASS

node -e "JSON.parse(require('node:fs').readFileSync('config/dabangil-unified-program-contract.json','utf8')); console.log('json-ok')"
PASS — json-ok

git diff --name-only --diff-filter=ACM -- '*.mjs' | xargs -r -n1 node --check
PASS

npm run typecheck
LOCAL DEPENDENCY BLOCK — node_modules/typescript/bin/tsc absent

npm run lint
LOCAL DEPENDENCY BLOCK — eslint absent

npm run build
LOCAL DEPENDENCY BLOCK — next absent

Initial exact-head 1879d57b51dd8f8653685a065f0e8519a74f3dbd
PR Contract / Risk Gate / Runtime Gate / Vercel: PASS
Full default Node suite in Full CI: PASS — 1,272/1,272
Fast CI typecheck / lint / focused tests: PASS
Learner Loop in Fast CI / Full CI / Learner Loop Health: 707/708 — one stale roadmap-doc assertion expected S236P queued and an exact legacy line wrap
Bounded correction: update the existing roadmap-doc assertion to S236P factually blocked and preserve the compatible dynamic-ready-list wording; no behavior change
```

GitHub exact-head CI is authoritative for dependency-backed typecheck, lint,
build and the complete default Node suite because this C1 Work installs no
dependencies. Its exact head and result are appended to the PR evidence.

## 10. Rollback

Rollback is a focused revert of the C1 source-only reconciliation commit. It
restores unified-program v2 and roadmap WIP 2 but does not delete learner data,
reverse a migration, change a provider or require deployment cleanup because
C1 performs none of those actions.

## 11. Non-claims

Passing C1 source validation establishes only coherent authority, campaign
mapping and runner selection. It does not establish:

- C2 implementation or runtime readiness;
- rights-cleared content availability;
- CPF-1 or S236P completion;
- learner outcome, efficacy or external usability;
- commercial, payment or Production readiness.

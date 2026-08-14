# 답안길 Multisurface Launch Authority Validation

- Authority: ULC-0
- Lead issue: #719
- Base commit: `2a6c5c051a90d8e9f58bee817562666f2252e2d9`
- Base tree: `77947b10d762996d7e15a9683b33b44a6bd3dedb`
- Scope: docs/contracts/tests only
- Runtime evidence: not applicable and not claimed
- Current activation: zero

## Start-gate record

The authority Work began only after read-only verification of:

- main commit and tree exactly matching the values above;
- PR #718 merged from reviewed head
  `fd0e82672375e359d7e64af922ed3f3ef6efbbfe`;
- PR #716 closed, Draft, and unmerged;
- Tracker #717 open;
- WCV-C2 incomplete;
- campaign `C2`;
- current replacement stage `C2R-A` for Issue #702, authorized and unstarted;
- exact replacement sequence
  `C2R-A → C2R-B → C2R-C-P → C2R-C-T → C2R-C-L`;
- one merge-producing writer;
- no automatic start; and
- no first-round, mobile, instructor, provider, payment, public, or
  Production activation.

## Immutable WCV-C2R baseline

The focused authority test verifies these base snapshots without modifying
their owned source:

| Baseline | SHA-256 |
|---|---|
| canonical `wcvCampaignOverlay.c2StructuralRecovery` object | `2dd43160bbb71aa11de0dcd593949200291c5bb52a0b21ee8f3bc961f3682fe6` |
| exact `WCV-C2` roadmap block | `a3e2b591ee6efe88b2e99a2f9a37f25e0691519b6f0041e46f8045ce3d44fccf` |
| complete 21-row regression matrix | `b92d4ad88a44e10a7eb61670509c288cf871916a2570253f3f25cef211ebffeb` |

## Bounded dependency-graph correction history

The sole automated review of exact head
`208e87e9cd494454f132266a2ee5c6c4605b41d3` was
`PRR_kwDOSMHn8M8AAAABJjst-w`. It reported actionable
`P0/P1/P2 = 0/2/0` in exactly these unresolved threads:

- `PRRT_kwDOSMHn8M6ZPhNr`: WCV-C4 could become ready before ULC-I1; and
- `PRRT_kwDOSMHn8M6ZPhN4`: O4W could become ready before ULC-L1.

The first corrective commit installed those two inherited sequence edges.
The sole automated review of exact corrected head
`cf8a803cb48dde8394dac4d4dd822ff4c577c8b5` was
`PRR_kwDOSMHn8M8AAAABJkJxfw`. It reported actionable
`P0/P1/P2 = 0/1/0` in exactly one new unresolved thread:

- `PRRT_kwDOSMHn8M6ZQk2n`: ULC-F1 could become ready after ULC-K1 while
  S238B, First-Round Authenticated Acceptance, remained queued.

The complete operational-prerequisite audit establishes the canonical model:

- S241A is the second-round authenticated-acceptance roadmap item consumed by
  ULC-M1;
- S238B is the first-round authenticated-acceptance roadmap item independently
  consumed by ULC-F1;
- both gates are required for both-track work;
- acceptance substitution is prohibited in both directions; and
- mastery transfer is prohibited in both directions.

The second and absolutely final corrective commit preserves the exact
13-stage order and makes the active roadmap, machine contracts, prose,
validation, parity and focused tests agree on these final direct dependencies:

```yaml
WCV-C3: [WCV-C2]
ULC-M1: [WCV-C3, S241A]
ULC-M2: [ULC-M1]
ULC-K1: [ULC-M2]
ULC-F1: [ULC-K1, S238B]
ULC-F2: [ULC-F1]
ULC-F3: [ULC-F2]
ULC-F4: [ULC-F3]
ULC-F5: [ULC-F4]
ULC-I1: [ULC-F5]
WCV-C4: [ULC-I1]
ULC-R1: [WCV-C4]
ULC-L1: [ULC-R1]
O4W: [ULC-L1]
WCV-C5: [WCV-C4, O4W]
WCV-C6: [WCV-C5]
```

Both corrections remain inside the same 17-path docs/contracts/tests-only
authority boundary. They start no stage and change no product, runtime,
dependency package, workflow, database, provider, learner, payment, store,
deployment or Production state.

## Required validation commands

```bash
git diff --name-only 2a6c5c051a90d8e9f58bee817562666f2252e2d9...HEAD
node -e "JSON.parse(require('node:fs').readFileSync('config/dabangil-unified-product-multisurface-launch-v1.json','utf8')); JSON.parse(require('node:fs').readFileSync('config/dabangil-unified-program-contract.json','utf8'))"
node scripts/run-node-tests.mjs tests/dabangil-unified-product-multisurface-launch-authority.test.mjs
node scripts/run-node-tests.mjs tests/dabangil-unified-product-multisurface-launch-authority.test.mjs tests/wcv-c2r-structural-recovery-authority.test.mjs tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs tests/dabangil-premium-alignment.test.mjs tests/s234r-owner-dogfood-private-plane-schedule-amendment.test.mjs
node scripts/run-node-tests.mjs tests/agent-factory-contract-validation.test.mjs tests/agent-factory-risk-classification.test.mjs tests/agent-factory-glob-match.test.mjs tests/agent-factory-runtime-gate.test.mjs tests/agent-factory-roadmap-runner.test.mjs tests/agent-factory-ci-watcher.test.mjs tests/agent-factory-pr-contract-doctor.test.mjs tests/agent-factory-safe-repair-loop.test.mjs tests/agent-factory-rebase-merge-orchestrator.test.mjs tests/agent-factory-github-actions-button.test.mjs tests/agent-factory-live-github-readonly.test.mjs tests/agent-factory-admin-dashboard.test.mjs tests/agent-factory-safe-mutation-gate.test.mjs tests/agent-factory-codex-invocation-adapter.test.mjs tests/agent-factory-run-history.test.mjs tests/agent-factory-orchestrator.test.mjs tests/agent-factory-planner-notes.test.mjs tests/agent-factory-patch-artifact-adapter.test.mjs tests/agent-factory-patch-artifact-runtime-verification.test.mjs tests/agent-factory-branch-commit-pr-adapter.test.mjs tests/agent-factory-approved-draft-pr-creator.test.mjs tests/agent-factory-ci-repair-loop.test.mjs tests/agent-factory-ci-repair-runtime-verification.test.mjs tests/agent-factory-roadmap-autopilot.test.mjs tests/agent-factory-end-to-end-dogfood.test.mjs
node scripts/run-node-tests.mjs
npm run typecheck
npm run lint
npm run build
NODE_OPTIONS='--require ../next-memory-usage-shim.cjs' CI=1 NEXT_TELEMETRY_DISABLED=1 npm run build
git diff --check
```

## Machine assertions

The focused test must prove:

1. V13 remains the sole active master.
2. ULC-0 is subordinate and has one exact lead Issue #719.
3. WCV-C2R baseline hashes and the 21-row count remain exact.
4. WCV-C2/C2/C2R-A/#702 remains the sole implementation selection.
5. Every future sequence ID is unique and every dependency resolves.
6. All 16 active-roadmap direct edges exactly match the correction table.
7. The ULC and legacy-WCV machine mirrors encode the same WCV-C4 and O4W gates.
8. No future ULC item is selected, started, or automatically started.
9. Free ULC-L1 has no O4W/WCV-C5/WCV-C6 dependency.
10. The paid route retains O4W, WCV-C5, WCV-C6, and a separate authorization.
11. Public/student surfaces are exactly Web/iOS/Android.
12. One authoritative learner state serves every surface.
13. The final WebView/static-export shapes are prohibited.
14. First-round, mobile, instructor, public-release, and payment runtime are
    future-gated.
15. Account deletion includes both in-app and external Web paths.
16. The coordinated availability window is at most 24 hours.
17. The exact 17-path ownership boundary contains no runtime, dependency,
    workflow, database, or native-project path.

## Hostile read-only audit checklist

The audit fails closed on any of these counterexamples:

- ULC-0 becomes an active master or changes the active master pointer.
- C2R-A, its issue, its state, the replacement chain, matrix, or writer limit
  changes.
- Any ULC item is marked active, selected, started, or automatically started.
- WCV-C4 has any direct dependency other than ULC-I1.
- ULC-R1 has any direct dependency other than WCV-C4.
- O4W has any direct dependency other than ULC-L1.
- a legacy-WCV machine or test mirror retains either pre-ULC edge.
- ULC-L1 gains an O4W/C5/C6 dependency or a paid/efficacy claim.
- O4W/C5/C6 is removed from the later paid path.
- a fourth public surface appears or one of Web/iOS/Android disappears.
- native/Web clients obtain separate mastery authority.
- a WebView wrapper or static export is accepted as the final native app.
- private content is allowed in a push payload.
- account deletion omits either an in-app or external Web path.
- the release window exceeds 24 hours.
- any package, lockfile, runtime, workflow, database, `apps/mobile`, provider,
  payment, store, deployment, or Production mutation appears.

## Initial local result on reviewed head `208e87e9...`

Before the automated review, the complete local validation set produced:

- exact owned-path equality: passed, 14/14 paths and no package, lockfile,
  runtime, workflow, database, provider, native-project, payment, deployment,
  or Production path;
- strict launch/unified JSON parse and active-program YAML parse: passed;
- focused launch-authority suite: 18/18 passed;
- affected roadmap/authority suites: 84/84 passed;
- Agent Factory suites: 403/403 passed, including the separately invoked
  connected-GitHub contract test;
- default Node suite after `npm ci`: 1,312/1,312 passed;
- typecheck: passed;
- lint: passed with 0 errors and 11 pre-existing warnings, all outside the 14
  owned paths;
- plain production build: environment-blocked before source compilation by
  this sandbox's unavailable `/proc` RSS counter
  (`ENOENT: uv_resident_set_memory`);
- production build with the repository-external, untracked RSS compatibility
  preload: passed with Next.js 16.2.4 compilation, TypeScript, 54/54 static
  pages, and final optimization; one existing NFT dynamic-trace warning
  remained outside the 14 owned paths;
- `git diff --check`: passed; and
- independent hostile read-only audit: passed across owned paths, preserved
  WCV-C2R hashes, graph order and dependency resolution, activation denial,
  free/paid separation, surface parity, deletion coverage, launch window, and
  newline/fence integrity.

The initial local hostile audit reported `P0/P1/P2 = 0/0/0`, but it did not
catch the two active-roadmap mirror defects and does not supersede review
`PRR_kwDOSMHn8M8AAAABJjst-w`.

After the one-time correction, fresh exact-head GitHub CI and Vercel must all
succeed, and the final exact-head review must report actionable
`P0/P1/P2 = 0/0/0`. No local source check substitutes for those gates.

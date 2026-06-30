# AF013B-V Patch Artifact Runtime Verification

Date: 2026-06-30
Verification type: local Windows PowerShell dogfood evidence
Risk: low

## Purpose

Record post-merge AF013B Patch Artifact Adapter runtime evidence as a docs-only verification note.

AF013B is metadata-only and report-only. It prepares local patch artifact plan metadata for human review, appends AF011 run history, and does not apply patches or mutate source, Git, GitHub, learner, runtime, provider, billing, auth, payment, OCR, production, or instructor state.

This document commits only high-level evidence. It does not commit generated `.agent-factory` artifacts.

## Relationship to AF010, AF011, AF012, AF013A, and AF013B

- AF010 produces a dry-run Codex invocation plan. In this verification, AF010 reported `Codex invoked: no`.
- AF011 records metadata-only run history in local JSONL and Markdown artifacts. In this verification, AF011 appended an `agent-factory-patch-artifact` record after AF013B ran.
- AF012 produces an optional report-only orchestrator plan. In this verification, AF012 reported `Commands executed: no` and `Codex invoked: no`.
- AF013A produces the required planner note for AF013B. In this verification, AF013A reported `Report-only: yes`, `Dry-run: true`, `Codex invoked: no`, `Commands executed: no`, `Patches applied: no`, and `GitHub mutated: no`.
- AF013B consumes the AF010 and AF013A artifacts, may inspect optional AF011 and AF012 artifacts, and writes patch artifact plan metadata only.

## Runtime Verification Setup

- Workspace: `C:\Users\jmg91\exam-coach-af013b-v`
- Branch: `feat/af013b-v-patch-artifact-runtime-verification`
- Base: fetched `origin/main` at `4bc045193210bf17505fdd350ecc2ad0964d29e4`
- Shell: Windows PowerShell
- Node execution: repository npm scripts via `npm.cmd`
- Generated local artifact directory: `.agent-factory/`
- Selected local task package: `S209`

Observed setup sequence:

```text
AF006 plan_only
-> AF010 dry-run invocation plan
-> AF012 report-only orchestrator plan
-> AF013A planner note
-> AF013B patch artifact plan
-> AF011 run-history append
```

The usual Node loader warnings were observed:

- `ExperimentalWarning: --experimental-loader may be removed in the future`
- `[MODULE_TYPELESS_PACKAGE_JSON] Warning`

These warnings match the existing repository script pattern. This verification does not add `"type": "module"` to `package.json`.

## Required Local Input Artifacts

- `.agent-factory/codex-task-packages.json`
- `.agent-factory/codex-invocation-plan.json`
- `.agent-factory/factory-planner-note.json`

Observed status:

- AF001 task packages: available.
- AF010 Codex invocation plan: available.
- AF013A planner note: available.

## Optional Local Input Artifacts

- `.agent-factory/factory-orchestrator-plan.json`
- `.agent-factory/run-history.jsonl`

Observed status:

- AF012 orchestrator plan: available.
- AF011 run history: available.

## AF013B Command Used

```powershell
npm.cmd run agent-factory:patch-artifact -- --artifact-dir .agent-factory --stdout markdown
```

Observed AF013B result:

```text
Status: planned
Report-only: yes
Dry-run: true
Patches applied: no
Working tree edited: no
GitHub mutated: no
Approval gate: not_requested
```

## Expected Generated Local Artifacts

AF013B generated these ignored local artifacts:

- `.agent-factory/factory-patch-artifact-plan.json`
- `.agent-factory/factory-patch-artifact-plan.md`
- `.agent-factory/agent-factory-patch-artifact-summary.md`

AF011 also maintained these ignored local run-history artifacts:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/run-history.md`

Generated `.agent-factory` artifacts are ignored by Git and are not committed.

## AF011 Run-History Append Evidence

The local `.agent-factory/run-history.jsonl` summary showed these metadata-only records:

1. `agent-factory-run`, mode `plan_only`, status `success`, dry-run `true`, approval gate `not_required`.
2. `agent-factory-codex-invocation`, mode `dry_run_plan_only`, status `success`, dry-run `true`, approval gate `dry_run_not_required`.
3. `agent-factory-orchestrator`, mode `orchestrate`, status `success`, dry-run `true`, approval gate `not_required`.
4. `agent-factory-planner-notes`, mode `planner_note`, status `success`, dry-run `true`, approval gate `dry_run_not_required`.
5. `agent-factory-patch-artifact`, mode `patch_artifact_plan`, status `success`, dry-run `true`, approval gate `dry_run_not_required`.

Interpretation:

- AF013B appended the AF011 run-history record.
- AF011 stored artifact paths, status labels, guardrail flags, hashes, and counts only.
- AF011 did not store raw patch text, raw diff text, raw prompt text, raw task-package prompt, raw PR body, raw comments, learner answers, OCR payload, provider payload, or secrets.

## Metadata-Only Boundary Evidence

The generated AF013B plan reported:

```text
metadataOnly: true
omittedRawPayloads: true
hashesOnlyForPayloads: true
```

The proposed patch artifacts were metadata entries only:

- `.agent-factory/patch-artifact-review.patch`: not_created, no hash.
- `.agent-factory/patch-artifact-review.diff`: not_created, no hash.
- `.agent-factory/patch-artifact-review.md`: not_created, no hash.

No source patch file was created or applied.

## Safety Evidence

- Codex executed: no
- shell commands from plan executed: no
- patches applied: no
- source files edited by AF013B: no
- branch created: no
- commit created by AF013B: no
- push performed by AF013B: no
- PR created/updated by AF013B: no
- workflow rerun by AF013B: no
- merge/rebase by AF013B: no
- branch/commit/push/PR/workflow/merge/rebase mutation: no
- learner/runtime/provider/billing/auth/payment/OCR/production/instructor state touched: no

The generated AF013B action flags were all false:

```text
willRunCodex: false
willRunShellCommands: false
willApplyPatch: false
willEditWorkingTree: false
willCreateBranch: false
willCreateCommit: false
willPush: false
willCreateOrUpdatePr: false
willRerunWorkflow: false
willMergeOrRebase: false
```

## Data Boundary

This verification stores only high-level metadata evidence.

- no raw patch text
- no raw diff text
- no raw prompt text
- no raw task-package prompt
- no raw PR body
- no raw comments
- no learner answers
- no OCR payload
- no provider payload
- no credentials/secrets
- no secrets

Allowed evidence in this document:

- command names;
- status labels;
- selected task id;
- artifact paths;
- zero-execution and zero-mutation flags;
- metadata-only data-boundary flags;
- AF011 source, mode, status, dry-run, and approval-gate labels.

Disallowed evidence in this document:

- raw patch or diff content;
- raw task-package prompts;
- raw PR bodies;
- raw comments;
- learner answers;
- OCR text or payloads;
- provider payloads;
- billing, auth, payment, production, or instructor data;
- credentials, tokens, cookies, service-role keys, private keys, or private user content.

## Rollback

This PR is docs and tests only. Rollback is a focused revert of:

- `docs/agent-factory-patch-artifact-runtime-verification.md`
- the AF011 documentation note that points to this evidence;
- `tests/agent-factory-patch-artifact-runtime-verification.test.mjs`;
- the default node-test runner entry.

To clean local generated runtime artifacts:

```powershell
Remove-Item .agent-factory/factory-patch-artifact-plan.json, .agent-factory/factory-patch-artifact-plan.md, .agent-factory/agent-factory-patch-artifact-summary.md, .agent-factory/run-history.jsonl, .agent-factory/run-history.md -ErrorAction SilentlyContinue
```

No external-state rollback is required because AF013B did not mutate source, Git, GitHub, workflows, learner/runtime/provider/billing/auth/payment/OCR/production, or instructor state.

## Remaining Risks

- This verification is local Windows dogfood evidence, not proof of every future operator environment.
- AF013B remains a review boundary only. Any future patch application, branch creation, commit, push, PR, workflow, merge, or rebase path must be implemented separately and approval-gated.
- Generated `.agent-factory` artifacts remain local runtime evidence and are intentionally not committed.

## Next Step

AF013C approval-gated branch/commit/PR adapter.

AF013C must be a separate issue and PR with explicit human approval gates before any branch, commit, push, PR creation/update, workflow rerun, merge, rebase, or patch application behavior is enabled.

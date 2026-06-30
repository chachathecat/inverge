# Agent Factory Branch Commit PR Adapter

AF013C adds the first branch/commit/PR adapter boundary after AF013B.

The branch-commit-PR command reads local `.agent-factory/` metadata artifacts, records hashes and allowlisted metadata, and writes a human-review plan for possible branch, commit, push, or pull request operations. It does not perform those operations.

## Purpose

AF013C v1 is metadata-only and report-only.

It is also a metadata-first and safety-first adapter boundary.

It can prepare:

- target branch, commit-title, issue, PR, and base-branch metadata;
- approval-gate status;
- requested mutation class metadata;
- inert local review instructions;
- proposed GitHub operation previews.

It cannot execute any branch, commit, push, PR, workflow, merge, rebase, Codex, shell, patch, or source-mutation behavior.

## Relationship to Previous Layers

- AF010 creates a dry-run Codex invocation plan. AF013C requires this artifact.
- AF011 records metadata-only run history. AF013C appends a local run-history record.
- AF012 recommends the next safe factory step. AF013C may inspect this optional artifact.
- AF013A creates report-only planner notes and isolated workspace/path boundary metadata. AF013C requires this artifact.
- AF013B creates metadata-only patch artifact plans and fails closed on missing required upstream artifacts. AF013C requires this artifact.
- AF013B-V verified AF013B runtime evidence without Codex execution, patch application, source mutation, branch/commit/push/PR/workflow mutation, merge, or rebase.

AF013C is the next boundary after that verification. It remains report-only.

## Why AF013C Is Approval-Gated

Branch, commit, push, and PR operations can change repository and review state. AF013C therefore records an explicit approval gate and requested mutation class before any future adapter can consider those operations.

Default behavior:

- `approvalGate: not_requested`
- `requestedMutationClass: none`
- `status: planned` only when required upstream metadata exists
- no approved operation
- all action flags remain false

If a mutation class other than `none` is requested without `approvalGate: approved`, AF013C fails closed.

## Why v1 Still Does Not Mutate GitHub

AF013C v1 does not call GitHub mutation APIs and does not run local mutation commands, even when the approval gate is `approved`.

An approved gate may only mark proposed operations as planned metadata. It does not make those operations executable. A later adapter must add a strict approved mutation primitive comparable to AF009 before any real branch, commit, push, PR, review, workflow, merge, or rebase behavior is allowed.

## Artifacts

AF013C writes local generated artifacts:

- `.agent-factory/branch-commit-pr-plan.json`
- `.agent-factory/branch-commit-pr-plan.md`
- `.agent-factory/agent-factory-branch-commit-pr-summary.md`

AF011 also maintains:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/run-history.md`

Generated `.agent-factory` artifacts are local runtime artifacts and must not be committed.

## Input Requirements

Required:

- `.agent-factory/codex-task-packages.json`
- `.agent-factory/codex-invocation-plan.json`
- `.agent-factory/factory-planner-note.json`
- `.agent-factory/factory-patch-artifact-plan.json`

Optional:

- `.agent-factory/factory-orchestrator-plan.json`
- `.agent-factory/run-history.jsonl`

AF013C fails closed when:

- AF013A planner note is missing: `missing_planner_note`
- AF013A planner note is blocked: `planner_note_blocked`
- AF010 invocation plan is missing: `missing_codex_invocation_plan`
- task package artifact is missing: `missing_task_package`
- AF013B patch artifact plan is missing: `missing_patch_artifact_plan`
- AF013B patch artifact plan is blocked: `patch_artifact_plan_blocked`
- any inspected local artifact is invalid: `invalid_artifact`

## Approval Gate Behavior

Supported approval gates:

- `not_requested`
- `missing`
- `approved`
- `failed_closed`

Supported requested mutation classes:

- `none`
- `branch_only`
- `commit_only`
- `pr_metadata_only`
- `branch_commit_pr`

Failure behavior:

- `approvalGate: missing` blocks with `missing_human_approval`.
- `approvalGate: failed_closed` blocks with `approval_failed_closed`.
- any requested mutation class other than `none` without `approvalGate: approved` blocks with `missing_human_approval`.

Approved behavior:

- `approvalGate: approved` records the requested mutation class as approved metadata.
- proposed operations may show `planned`.
- each proposed operation still has `approved: false` for execution in v1.
- all mutation action flags remain false.

## Mutation Boundary

AF013C emits:

- `metadataOnlyPlan: true`
- `requiresHumanApproval: true`
- `willMutateWithoutApproval: false`
- `maxChangedFiles`
- `maxPatchBytes`
- allowed and forbidden path prefixes
- false action flags for Codex, shell, patch, working-tree edit, branch, commit, push, PR, workflow, merge, and rebase behavior

The proposed operation list is a preview only.

## Data Boundary

AF013C output is metadata-only.

Allowed output:

- artifact presence, status, hashes, counts, task ids, issue numbers, PR numbers, branch names, titles, path-prefix boundaries, reason codes, and operation status labels;
- inert command preview text;
- human-review instructions;
- AF011 history summary metadata.

Not allowed output:

- raw PR body text;
- raw comments;
- raw patch or diff text;
- raw task-package prompts;
- learner answers or OCR text;
- provider payloads;
- credentials, tokens, cookies, service-role keys, private keys, or secrets;
- billing, auth, payment, production, academy, or instructor records;
- private user content.

## Local Command

```powershell
npm.cmd run agent-factory:branch-commit-pr -- --artifact-dir .agent-factory --stdout markdown
```

Example metadata-only approved preview:

```powershell
npm.cmd run agent-factory:branch-commit-pr -- --artifact-dir .agent-factory --approval-gate approved --mutation-class branch_commit_pr --issue-number 491 --base-branch main --proposed-branch feat/af013c-branch-commit-pr-adapter --commit-title "Add AF013C branch commit PR adapter" --pr-title "[AF013C] Approval-Gated Branch Commit PR Adapter v1"
```

The command above still writes local metadata artifacts only.

## Rollout

Roll out AF013C as an Agent Factory boundary only:

- add the library, CLI, docs, tests, and npm script;
- keep generated `.agent-factory` artifacts untracked;
- use focused node tests before full validation;
- do not add workflow permissions;
- do not connect this layer to any real mutation primitive.

## Rollback

Rollback is a focused revert of:

- `lib/agent-factory/branch-commit-pr-adapter.ts`
- `scripts/agent-factory-branch-commit-pr.mjs`
- `docs/agent-factory-branch-commit-pr-adapter.md`
- `tests/agent-factory-branch-commit-pr-adapter.test.mjs`
- npm script and default node-test runner wiring
- the AF011 docs note for AF013C

To clean generated local artifacts:

```powershell
Remove-Item .agent-factory/branch-commit-pr-plan.json, .agent-factory/branch-commit-pr-plan.md, .agent-factory/agent-factory-branch-commit-pr-summary.md -ErrorAction SilentlyContinue
```

No external-state rollback is required because AF013C v1 does not mutate GitHub, Git, workflows, source files, learner runtime, OCR, provider, billing, auth, payment, production, academy, or instructor state.

## Remaining Risks

- AF013C is not evidence that future mutation adapters are safe.
- A future mutation implementation must still prove approval-gate, path-boundary, data-boundary, rollback, and runtime behavior.
- This layer can preview operation metadata, but human operators must not treat the preview as executable approval.

## Next Step

AF014 CI repair loop.

AF014 must remain separately approved and must not weaken AF009, AF010, AF011, AF012, AF013A, AF013B, or AF013C guardrails.

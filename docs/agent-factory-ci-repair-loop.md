# Agent Factory CI Repair Loop

AF014 adds a metadata-only CI repair loop boundary after AF013C.

The CI repair command inspects local `.agent-factory/` CI metadata artifacts, classifies failures into bounded reason codes, and writes a repair plan for human review. It does not execute the repair.

## Purpose

AF014 v1 helps an operator answer:

- what CI appears to be failing;
- which safe failure class applies;
- which reason code explains the failure;
- what kind of repair handoff could be reviewed next.

It remains report-only by default. The output is a local plan, not an execution request.

## Relationship to Previous Layers

- AF010 creates a dry-run Codex invocation plan.
- AF011 records metadata-only run history. AF014 appends an `agent-factory-ci-repair` record.
- AF012 recommends the next safe factory action.
- AF013A creates report-only planner notes and workspace/path boundary metadata.
- AF013B creates metadata-only patch artifact plans.
- AF013C creates approval-gated branch/commit/PR mutation plans, but still does not execute mutation in v1.

AF014 reads those local artifacts when present and then adds CI failure classification metadata. It does not weaken AF009, AF010, AF011, AF012, AF013A, AF013B, or AF013C guardrails.

## Why AF014 Is Report-Only

CI repair can quickly cross into source edits, branch mutation, PR updates, workflow reruns, or operational policy decisions. AF014 therefore only produces metadata for review:

- `reportOnly: true`
- `dryRun: true`
- all action flags remain `false`
- proposed repair steps require approval and are never approved for execution in v1

Even with `--approval-gate approved`, AF014 only marks proposed repair steps as planned metadata. Actual repair execution belongs to a later approval-gated layer.

## No Workflow or GitHub Mutation

AF014 v1 does not:

- rerun workflows;
- run Codex;
- run shell repair commands;
- apply patches;
- edit the working tree;
- create branches;
- create commits;
- push;
- create or update PRs;
- request reviews;
- merge or rebase.

The command has no live GitHub API requirement. It can classify synthetic or locally exported CI metadata.

## Artifacts

AF014 writes local generated artifacts:

- `.agent-factory/ci-repair-plan.json`
- `.agent-factory/ci-repair-plan.md`
- `.agent-factory/agent-factory-ci-repair-summary.md`

AF011 also maintains:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/run-history.md`

Generated `.agent-factory` artifacts are local runtime artifacts and must not be committed.

## Input Metadata

AF014 inspects these local artifacts when present:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/branch-commit-pr-plan.json`
- `.agent-factory/factory-patch-artifact-plan.json`
- `.agent-factory/factory-planner-note.json`
- `.agent-factory/codex-invocation-plan.json`
- `.agent-factory/ci-workflow-runs.json`
- `.agent-factory/ci-job-steps.json`
- `.agent-factory/ci-log-summary.json`

The CI metadata artifacts should contain status, conclusion, workflow/job/step names, failure classes, or reason codes. They must not contain raw logs, raw PR bodies, raw comments, raw patches or diffs, raw task-package prompts, learner answers, OCR text, provider payloads, billing/auth/payment data, credentials, or secrets.

Unsafe or invalid input artifacts fail closed.

## Failure Classes

AF014 v1 classifies deterministic metadata into:

- `pr_contract`
- `typecheck`
- `lint`
- `focused_tests`
- `full_tests`
- `build`
- `learner_loop`
- `risk_gate`
- `runtime_gate`
- `closed_beta_readiness`
- `workflow_infra`
- `unknown`

Supported reason codes include:

- `pr_contract_missing_required_section`
- `pr_contract_missing_risk_line`
- `pr_contract_missing_merge_recommendation`
- `pr_contract_invalid_closing_reference`
- `typecheck_failed`
- `lint_failed`
- `focused_tests_failed`
- `full_tests_failed`
- `build_failed`
- `learner_loop_failed`
- `risk_gate_failed`
- `runtime_gate_failed`
- `closed_beta_readiness_failed`
- `workflow_infra_failed`
- `unknown_ci_failure`

PR Contract classification is based on metadata such as missing required sections, missing risk line, missing merge recommendation checkboxes, or invalid closing-reference counts. AF014 does not require or store the raw PR body.

## Approval Gate Behavior

Supported approval gates:

- `not_requested`
- `missing`
- `approved`
- `failed_closed`

Default behavior:

- `approvalGate: not_requested`
- `status: planned` when local metadata is safe
- proposed repair steps are `not_requested`
- no mutation action is enabled

Blocked behavior:

- `approvalGate: missing` blocks with `missing_human_approval`
- `approvalGate: failed_closed` blocks with `approval_failed_closed`
- invalid or unsafe artifacts block with `invalid_artifact` or `unsafe_input_artifact`

Approved behavior:

- `approvalGate: approved` may mark proposed repair steps as planned metadata
- proposed repair steps still have `approved: false`
- no execution, workflow rerun, GitHub mutation, or source mutation occurs in v1

## Data Boundary

AF014 output is metadata-only.

Allowed output:

- artifact path, status, hash, and count metadata;
- workflow, job, and step labels after safety filtering;
- failure classes and reason codes;
- bounded path-prefix and size limits;
- inert command previews and human-review instructions.

Not allowed output:

- raw CI logs;
- raw PR body text;
- raw comments;
- raw patch or diff text;
- raw task-package prompts;
- learner answers or OCR text;
- provider payloads;
- billing, auth, payment, production, academy, or instructor records;
- credentials, tokens, cookies, service-role keys, private keys, or secrets.

## Local Command

```powershell
npm.cmd run agent-factory:ci-repair -- --artifact-dir .agent-factory --stdout markdown
```

Example approved metadata preview:

```powershell
npm.cmd run agent-factory:ci-repair -- --artifact-dir .agent-factory --approval-gate approved --pr-number 493 --branch feat/af014-ci-repair-loop --base-branch main --task-id AF014
```

The command above still writes local metadata artifacts only.

## Rollout

Roll out AF014 as an Agent Factory boundary only:

- add the library, CLI, docs, tests, and npm script;
- keep generated `.agent-factory` artifacts untracked;
- use focused node tests before full validation;
- do not add workflow permissions;
- do not connect this layer to any real repair executor.

## Rollback

Rollback is a focused revert of:

- `lib/agent-factory/ci-repair-loop.ts`
- `scripts/agent-factory-ci-repair.mjs`
- `docs/agent-factory-ci-repair-loop.md`
- `tests/agent-factory-ci-repair-loop.test.mjs`
- npm script and default node-test runner wiring
- the AF011 docs note for AF014

To clean generated local output:

```powershell
Remove-Item .agent-factory/ci-repair-plan.json, .agent-factory/ci-repair-plan.md, .agent-factory/agent-factory-ci-repair-summary.md -ErrorAction SilentlyContinue
```

No external-state rollback is required because AF014 v1 does not mutate GitHub, Git, workflows, source files, learner runtime, OCR, provider, billing, auth, payment, production, academy, or instructor state.

## Remaining Risks

- AF014 depends on the quality of local CI metadata; ambiguous metadata remains `unknown`.
- AF014 is not evidence that future repair execution is safe.
- A future execution layer must separately prove approval-gate, path-boundary, data-boundary, rollback, and runtime behavior.
- Operators must not treat planned metadata as permission to rerun workflows or mutate branches, commits, PRs, or source.

## Next Step

AF015 Roadmap Autopilot.

AF015 must remain separately approved and must not bypass AF014 report-only behavior, AF013C approval gates, or AF009 mutation safety rules.

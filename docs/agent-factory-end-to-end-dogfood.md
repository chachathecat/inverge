# Agent Factory End-to-End Dogfood

AF016 adds the first end-to-end Agent Factory dogfood evidence layer after AF015.

AF016 remains metadata-only and report-only by default. It assembles a complete local/synthetic planning-chain report from AF010 through AF015 without executing Codex, applying patches, mutating GitHub, running workflow reruns, or touching learner/runtime/provider/billing/auth/payment/OCR/instructor/production state.

## Purpose

AF016 v1 proves that the Agent Factory can safely inspect local metadata artifacts from the prior planning layers and produce one bounded evidence report for a future work item.

It answers:

- are the required AF010 through AF015 local planning artifacts present;
- did any upstream plan block;
- does the proposed next work remain metadata-only;
- did AF016 append AF011 run-history evidence;
- are all execution, source-edit, Git, GitHub, workflow, learner, provider, billing, auth, payment, OCR, instructor, academy, official-source, corpus, commercial, and production action flags still false.

AF016 output is evidence for human review. It is not approval to execute future work.

## Relationship to AF010, AF011, AF012, AF013A, AF013B, AF013C, AF014, AF015

- AF010 creates dry-run Codex invocation plans. AF016 inspects AF010 metadata and confirms Codex remains unexecuted.
- AF011 records metadata-only run history. AF016 appends an `agent-factory-end-to-end-dogfood` record with hashes/counts and artifact paths only.
- AF012 recommends the next safe factory action. AF016 inspects the local orchestrator plan without running its recommendation.
- AF013A creates report-only planner notes and isolated workspace/path boundary metadata. AF016 requires the planner note and blocks if it is blocked.
- AF013B creates metadata-only patch artifact plans. AF016 requires the patch plan and blocks if it is blocked.
- AF013C creates approval-gated branch/commit/PR mutation plans without executing mutation in v1. AF016 requires the plan and blocks if it is blocked.
- AF014 classifies CI failures and writes metadata-only repair plans. AF016 requires the CI repair plan and blocks if it is blocked.
- AF015 ranks roadmap candidates and proposes next work metadata without executing it. AF016 requires the roadmap autopilot plan and blocks if it is blocked.

AF016 does not weaken AF009, AF010, AF011, AF012, AF013A, AF013B, AF013C, AF014, or AF015 guardrails.

## End-to-end synthetic/local setup

The intended setup is local and synthetic:

```powershell
npm.cmd run agent-factory:end-to-end-dogfood -- --artifact-dir .agent-factory --stdout markdown
```

The command reads only local `.agent-factory/` metadata artifacts. It can be run against synthetic fixtures or against local artifacts produced by prior report-only Agent Factory commands.

Generated `.agent-factory` artifacts are runtime evidence and must not be committed.

## Required local artifacts

AF016 requires:

- `.agent-factory/codex-task-packages.json`
- `.agent-factory/codex-invocation-plan.json`
- `.agent-factory/factory-orchestrator-plan.json`
- `.agent-factory/factory-planner-note.json`
- `.agent-factory/factory-patch-artifact-plan.json`
- `.agent-factory/branch-commit-pr-plan.json`
- `.agent-factory/ci-repair-plan.json`
- `.agent-factory/roadmap-autopilot-plan.json`

AF016 may also inspect:

- `.agent-factory/run-history.jsonl`

Run history is optional as an input because the AF016 CLI appends it when the plan is generated. If a run-history file is present but unsafe or invalid, AF016 blocks with `unsafe_metadata_artifact`.

## Expected local output artifacts

AF016 writes:

- `.agent-factory/end-to-end-factory-dogfood-plan.json`
- `.agent-factory/end-to-end-factory-dogfood-plan.md`
- `.agent-factory/agent-factory-end-to-end-dogfood-summary.md`

AF011 also maintains:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/run-history.md`

Generated `.agent-factory` files are ignored local runtime evidence and are not committed.

## AF011 run-history append evidence

The AF016 CLI appends an AF011 record with:

- source `agent-factory-end-to-end-dogfood`;
- mode `end_to_end_factory_dogfood_plan`;
- mutation intent `end_to_end_factory_dogfood_report_only`;
- status `success` when the complete local metadata chain is planned;
- status `rejected` when missing, blocked, unsafe, or invalid metadata blocks the dogfood run;
- dry-run `true`;
- approval gate `dry_run_not_required`;
- target task and PR metadata when available;
- artifact paths for the AF016 JSON, Markdown, and summary files;
- payload digest metadata for the generated plan;
- blocked reason codes only;
- guardrail flags showing no Codex execution, code mutation, branch mutation, PR metadata mutation, workflow rerun, learner runtime, OCR, provider, billing, auth, payment, or production API touch.

AF011 stores artifact paths, status labels, hashes, counts, and reason codes only. It does not store raw issue bodies, raw PR bodies, raw comments, raw prompts, raw task-package prompts, raw patches, raw diffs, learner answers, OCR payloads, provider payloads, billing/auth/payment records, credentials, or secrets.

## Metadata-only boundary evidence

AF016 output contains:

- artifact paths;
- availability status;
- SHA-256 hashes;
- counts;
- selected next-work labels;
- reason codes;
- readiness summary;
- false action flags;
- data-boundary flags.

AF016 output does not contain raw source payloads. Upstream preview payloads from AF015 are represented only by hashes.

## Safety evidence

- Codex executed: no
- shell commands from plan executed: no
- patches applied: no
- source files edited by AF016: no
- issue created by AF016: no
- workflow rerun by AF016: no
- branch created by AF016: no
- commit created by AF016: no
- push performed by AF016: no
- PR created/updated by AF016: no
- merge/rebase by AF016: no
- learner/runtime/provider/billing/auth/payment/OCR/production/instructor state touched: no

The generated AF016 action flags must remain false:

```text
willRunCodex: false
willRunShellCommands: false
willApplyPatch: false
willEditWorkingTree: false
willCreateIssue: false
willCreateBranch: false
willCreateCommit: false
willPush: false
willCreateOrUpdatePr: false
willRerunWorkflow: false
willMergeOrRebase: false
```

## Data boundary

AF016 must emit only metadata and hash/count evidence.

- no raw issue body
- no raw PR body
- no raw comments
- no raw prompt text
- no raw task-package prompt
- no raw patch text
- no raw diff text
- no learner answers
- no OCR payload
- no provider payload
- no credentials/secrets

AF016 also does not store provider, billing, auth, payment, production, academy, instructor, official-source, corpus, or commercial payloads.

## Blocking behavior

AF016 fails closed when required local metadata is absent or an upstream boundary is blocked:

- `missing_task_package`
- `missing_codex_invocation_plan`
- `missing_orchestrator_plan`
- `missing_planner_note`
- `planner_note_blocked`
- `missing_patch_artifact_plan`
- `patch_artifact_plan_blocked`
- `missing_branch_commit_pr_plan`
- `branch_commit_pr_plan_blocked`
- `missing_ci_repair_plan`
- `ci_repair_plan_blocked`
- `missing_roadmap_autopilot_plan`
- `roadmap_autopilot_plan_blocked`
- `unsafe_metadata_artifact`

The CLI exits nonzero when the plan status is `blocked`.

## Rollout

Roll out AF016 as an Agent Factory evidence boundary only:

- add the AF016 library, CLI, docs, npm script, and focused tests;
- keep generated `.agent-factory` artifacts untracked;
- use focused node tests before full validation;
- do not add workflow permissions;
- do not connect AF016 to issue creation, Codex execution, shell execution, patch application, source edits, branch creation, commits, pushes, PR creation/update, review requests, workflow reruns, merges, rebases, or production/runtime/provider/billing/auth/payment/OCR/instructor/academy systems.

## Rollback

Rollback is a focused revert of:

- `lib/agent-factory/end-to-end-dogfood.ts`
- `scripts/agent-factory-end-to-end-dogfood.mjs`
- `docs/agent-factory-end-to-end-dogfood.md`
- `tests/agent-factory-end-to-end-dogfood.test.mjs`
- npm script and default node-test runner wiring
- the AF011 documentation note for AF016

To clean generated local output:

```powershell
Remove-Item .agent-factory/end-to-end-factory-dogfood-plan.json, .agent-factory/end-to-end-factory-dogfood-plan.md, .agent-factory/agent-factory-end-to-end-dogfood-summary.md -ErrorAction SilentlyContinue
```

No external-state rollback is required because AF016 v1 does not mutate GitHub, Git, workflows, source files, learner runtime, OCR, provider, billing, auth, payment, production, academy, official-source, corpus, commercial, or instructor state.

## Remaining risks

- AF016 depends on the safety and completeness of local metadata artifacts.
- AF016 does not prove that a future execution layer is safe.
- Synthetic evidence can miss operator-environment differences.
- Any future execution layer must separately prove approval-gate, path-boundary, data-boundary, rollback, runtime behavior, and external mutation controls.
- Human operators must not treat AF016 planned metadata as approval to execute work.

## Next step options

- AF017 Approved Execution Adapter
- or product roadmap transition after AF016 evidence

# Agent Factory Roadmap Autopilot

AF015 adds a metadata-only roadmap autopilot boundary after AF014-V.

The roadmap autopilot reads local Agent Factory metadata and proposes the next safe work item for human review. It does not execute the work.

## Purpose

AF015 v1 helps an operator answer:

- what local roadmap, PR, issue, CI, planner, patch, branch/commit/PR, CI repair, Codex invocation, and AF011 run-history metadata says;
- which bounded candidate should be reviewed next;
- why product backlog work remains deferred until Agent Factory dogfood evidence reaches AF016.

The output is a local report-only plan. It is not an execution request.

## Relationship to Previous Layers

- AF010 creates dry-run Codex invocation plans.
- AF011 records metadata-only run history. AF015 appends an `agent-factory-roadmap-autopilot` record.
- AF012 recommends the next safe factory action.
- AF013A creates report-only planner notes and isolated workspace/path boundary metadata.
- AF013B creates metadata-only patch artifact plans.
- AF013C creates approval-gated branch/commit/PR mutation plans, but does not execute mutation in v1.
- AF014 classifies CI failures and writes metadata-only repair plans.
- AF014-V verified AF014 PR Contract failure classification and repair-plan evidence.

AF015 packages the next roadmap step after those layers. It does not weaken AF009, AF010, AF011, AF012, AF013A, AF013B, AF013C, or AF014 guardrails.

## Why AF015 Is Report-Only

Roadmap autopilot output can lead to issue creation, Codex execution, branch creation, commits, pushes, PR updates, workflow reruns, merges, rebases, or product backlog work. AF015 therefore only emits bounded metadata:

- `reportOnly: true`
- `dryRun: true`
- all action flags remain `false`
- proposed work requires human review
- previews are generated internally and safety checked

Even with `--approval-gate approved`, AF015 v1 only marks the roadmap plan as approved metadata. Actual execution belongs to a future approval-gated layer.

## No Mutation or Execution

AF015 v1 does not:

- create issues;
- run Codex;
- run shell commands;
- apply patches;
- edit source files or the working tree;
- create branches;
- create commits;
- push;
- create or update PRs;
- request reviews;
- rerun workflows;
- merge or rebase;
- touch learner runtime, OCR, provider, billing, auth, payment, production, instructor, academy, official-source, corpus, or commercial systems.

The command has no live GitHub API requirement. It can rank candidates from synthetic or locally exported metadata artifacts.

## Artifacts

AF015 writes local generated artifacts:

- `.agent-factory/roadmap-autopilot-plan.json`
- `.agent-factory/roadmap-autopilot-plan.md`
- `.agent-factory/agent-factory-roadmap-autopilot-summary.md`

AF011 also maintains:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/run-history.md`

Generated `.agent-factory` artifacts are local runtime artifacts and must not be committed.

## Input Metadata

AF015 inspects these local artifacts when present:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/ci-repair-plan.json`
- `.agent-factory/branch-commit-pr-plan.json`
- `.agent-factory/factory-patch-artifact-plan.json`
- `.agent-factory/factory-planner-note.json`
- `.agent-factory/factory-orchestrator-plan.json`
- `.agent-factory/codex-invocation-plan.json`
- `.agent-factory/roadmap-state.json`
- `.agent-factory/github-issue-snapshot.json`
- `.agent-factory/github-pr-snapshot.json`
- `.agent-factory/ci-workflow-runs.json`

The input artifacts should contain metadata such as phase labels, last completed Agent Factory step, next recommended step, open issue/PR counts, CI conclusion, statuses, reason codes, hashes, and counts.

They must not contain raw issue bodies, raw PR bodies, raw comments, raw prompts, raw patches, raw diffs, raw learner answers, OCR text, provider payloads, billing/auth/payment records, production payloads, credentials, or secrets. Unsafe artifacts fail closed.

## Candidate Ranking

AF015 ranks deterministic metadata candidates:

- If a CI repair plan exists with blocked or failed status, `ci_repair_follow_up` is ranked first with `unresolved_ci_repair`.
- If the last completed Agent Factory step is `AF014-V`, AF015 recommends `AF015 Roadmap Autopilot v1`.
- If AF015 is current and no CI blockers are present, AF015 recommends `AF016 End-to-End Factory Dogfood`.
- Product backlog, constitution, curriculum, runtime acceptance, and commercial readiness candidates remain deferred before AF016 with `finish_agent_factory_before_product_backlog`.
- Unknown or unsafe roadmap state blocks or defers instead of inventing a product task.

Common reason codes include:

- `next_agent_factory_layer`
- `verification_before_next_layer`
- `unresolved_ci_repair`
- `finish_agent_factory_before_product_backlog`
- `ready_for_af016_dogfood`
- `product_backlog_deferred`
- `missing_roadmap_state`
- `unsafe_metadata_artifact`
- `unknown_roadmap_state`

## Approval Gate Behavior

Supported approval gates:

- `not_requested`
- `missing`
- `approved`
- `failed_closed`

Default behavior:

- `approvalGate: not_requested`
- `status: planned` when local metadata is safe and roadmap state is known
- all mutation and execution action flags remain false

Blocked behavior:

- `approvalGate: missing` blocks with `missing_human_approval`
- `approvalGate: failed_closed` blocks with `approval_failed_closed`
- invalid or unsafe artifacts block with `unsafe_metadata_artifact`
- missing or unknown roadmap state blocks with `missing_roadmap_state` or `unknown_roadmap_state`

Approved behavior:

- `approvalGate: approved` may mark the metadata roadmap plan as planned
- AF015 v1 still does not create issues, run Codex, run shell commands, create branches, create commits, push, create/update PRs, rerun workflows, merge, rebase, apply patches, or edit source

## Data Boundary

AF015 output is metadata-only.

Allowed output:

- artifact path, status, hash, count, and allowlisted metadata;
- candidate id, kind, status, risk, reason codes, and bounded metadata;
- generated-safe issue, PR, and Codex prompt preview hashes in Markdown;
- generated-safe preview fields in JSON;
- validation command previews;
- human-review instructions.

Not allowed output:

- raw issue bodies;
- raw PR bodies;
- raw comments;
- raw prompts;
- raw patches or diffs;
- learner answers or OCR text;
- provider payloads;
- billing, auth, payment, production, academy, or instructor records;
- credentials, tokens, cookies, service-role keys, private keys, or secrets.

## Local Command

```powershell
npm.cmd run agent-factory:roadmap-autopilot -- --artifact-dir .agent-factory --stdout markdown
```

Example with explicit current phase metadata:

```powershell
npm.cmd run agent-factory:roadmap-autopilot -- --artifact-dir .agent-factory --current-phase AF015 --last-completed-step AF015 --latest-ci-conclusion success --stdout markdown
```

The command above still writes local metadata artifacts only.

## Rollout

Roll out AF015 as an Agent Factory boundary only:

- add the library, CLI, docs, tests, and npm script;
- keep generated `.agent-factory` artifacts untracked;
- use focused node tests before full validation;
- do not add workflow permissions;
- do not connect this layer to issue creation, Codex execution, Git/GitHub mutation, workflow rerun, merge, rebase, patch, or source-edit primitives.

## Rollback

Rollback is a focused revert of:

- `lib/agent-factory/roadmap-autopilot.ts`
- `scripts/agent-factory-roadmap-autopilot.mjs`
- `docs/agent-factory-roadmap-autopilot.md`
- `tests/agent-factory-roadmap-autopilot.test.mjs`
- npm script and default node-test runner wiring
- the AF011 docs note for AF015

To clean generated local output:

```powershell
Remove-Item .agent-factory/roadmap-autopilot-plan.json, .agent-factory/roadmap-autopilot-plan.md, .agent-factory/agent-factory-roadmap-autopilot-summary.md -ErrorAction SilentlyContinue
```

No external-state rollback is required because AF015 v1 does not mutate GitHub, Git, workflows, source files, learner runtime, OCR, provider, billing, auth, payment, production, academy, official-source, corpus, commercial, or instructor state.

## Remaining Risks

- AF015 depends on local metadata quality; stale or incomplete snapshots can produce conservative blocks.
- AF015 does not prove that AF016 execution is safe.
- Any future execution layer must separately prove approval-gate, path-boundary, data-boundary, rollback, and runtime behavior.
- Human operators must not treat planned metadata as permission to mutate repository or product state.

## Next Step

AF016 End-to-End Factory Dogfood.

Product backlog remains deferred until Agent Factory reaches AF016 evidence.

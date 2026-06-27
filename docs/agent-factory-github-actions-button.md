# Agent Factory GitHub Actions Button

AF006 adds a manual GitHub Actions button for the existing Agent Factory planner/report modes.

Operator path:

```text
GitHub -> Actions -> Agent Factory Run -> Run workflow
```

AF006 v1 is read-only/report-only. It writes local `.agent-factory/` report artifacts in the Actions workspace and uploads those generated artifacts for human review. It does not create branches, push commits, open or update PRs, mark PRs ready, rerun workflows, rebase branches, merge PRs, invoke Codex, call provider APIs, or mutate learner/runtime/billing/auth state.

## Inputs

- `mode`: `plan_only`, `watch_snapshot`, `doctor_pr_body`, `repair_plan`, or `merge_plan`.
- `target`: `auto`, a roadmap item id such as `S209`, a PR number such as `461`, or a sanitized fixture path.
- `max_tasks`: `1` or `2`; applies to `plan_only`.
- `stdout`: `markdown`, `json`, or `none`.
- `allow_mutation`: `false` only. Any true value fails closed in the dispatcher.

## Modes

`plan_only` runs the AF001 roadmap planner against `roadmap/active-program.yml`.

Outputs:

- `.agent-factory/codex-task-packages.json`
- `.agent-factory/codex-task-packages.md`

When `target` is a roadmap item id, the item must exist and be ready. Otherwise the run fails safely with the blocked reason.

`watch_snapshot` runs AF002 against a saved PR/check metadata snapshot.

Outputs:

- `.agent-factory/ci-watcher-report.json`
- `.agent-factory/ci-watcher-report.md`

Default local input:

- `.agent-factory/pr-ci-snapshot.json`

For a PR-number target such as `461`, the dispatcher also checks `.agent-factory/pr-461-ci-snapshot.json`.

`doctor_pr_body` runs AF003 against a saved PR body fixture.

Outputs:

- `.agent-factory/pr-contract-doctor-report.json`
- `.agent-factory/pr-contract-doctor-report.md`
- `.agent-factory/repaired-pr-body.md`

Default local input:

- `.agent-factory/pr-body.md`

For a PR-number target such as `461`, the dispatcher also checks `.agent-factory/pr-461-body.md`.

`repair_plan` runs AF004 against an AF002 report or equivalent PR/check snapshot.

Outputs:

- `.agent-factory/safe-repair-plan.json`
- `.agent-factory/safe-repair-plan.md`

Default local inputs:

- `.agent-factory/ci-watcher-report.json`
- fallback: `.agent-factory/pr-ci-snapshot.json`

`merge_plan` runs AF005 against AF002/AF004-style report fixtures and forces report-only context.

Outputs:

- `.agent-factory/merge-plan.json`
- `.agent-factory/merge-plan.md`

AF006 v1 never recommends auto-merge from the workflow output. Any real merge, branch update, PR mutation, or workflow rerun remains a separate human-approved action.

## Fixture Guidance

Live GitHub fetching is out of scope for AF006 v1. Snapshot modes require sanitized local fixtures or fail safely with instructions.

Useful AF002 metadata fixture command for local operator preparation:

```powershell
gh pr view <number> --json number,title,state,isDraft,baseRefOid,headRefOid,mergeable,mergeStateStatus,labels,files,statusCheckRollup > .agent-factory/pr-ci-snapshot.json
```

For GitHub Actions, prefer passing `target` as a committed sanitized fixture path outside `.agent-factory/`, because `.agent-factory/` is gitignored and local files are not available after checkout.

Do not put learner answers, OCR text, official question or answer bodies, source excerpts, provider payloads, billing data, credentials, private user content, or raw PR body secrets in fixtures. The workflow upload step only uploads generated AF006 artifacts, not raw input fixture files.

## Summary Artifact

Every dispatcher run writes:

- `.agent-factory/agent-factory-run-summary.md`

The workflow always appends that Markdown summary to the GitHub job summary. Failure summaries state that AF006 v1 is report-only and explain the missing or invalid input.

## Local Command

```powershell
npm.cmd run agent-factory:run -- --mode plan_only --target auto --max-tasks 1 --stdout markdown --allow-mutation false
```

Snapshot example:

```powershell
npm.cmd run agent-factory:run -- --mode watch_snapshot --target .agent-factory/pr-ci-snapshot.json --stdout markdown --allow-mutation false
```

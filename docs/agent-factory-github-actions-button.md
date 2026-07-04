# Agent Factory GitHub Actions Button

AF006 adds a manual GitHub Actions button for the existing Agent Factory planner/report modes.

Operator path:

```text
GitHub -> Actions -> Agent Factory Run -> Run workflow
```

AF006 v1 is read-only/report-only. AF007 adds live read-only GitHub metadata modes for PR/CI inspection. The workflow writes local `.agent-factory/` report artifacts in the Actions workspace and uploads those generated artifacts for human review. It does not create branches, push commits, open or update PRs, mark PRs ready, rerun workflows, rebase branches, merge PRs, invoke Codex, call provider APIs, or mutate learner/runtime/billing/auth state.

AF009 metadata mutation is intentionally separate in `Agent Factory Mutate` and documented in `docs/agent-factory-safe-mutation-gate.md`. This AF006/AF007 workflow still requires `allow_mutation=false`.

## Inputs

- `mode`: `plan_only`, `watch_snapshot`, `watch_live`, `doctor_pr_body`, `doctor_pr_body_live`, `repair_plan`, `repair_plan_live`, `merge_plan`, or `merge_plan_live`.
- `target`: `auto`, a roadmap item id such as `S219`, a PR number such as `461`, or a sanitized fixture path.
- `pr_number`: required for `watch_live`, `doctor_pr_body_live`, `repair_plan_live`, and `merge_plan_live`; leave empty for non-live modes.
- `max_tasks`: `1` or `2`; applies to `plan_only`.
- `stdout`: `markdown`, `json`, or `none`.
- `allow_mutation`: `false` only. Any true value fails closed in the dispatcher.

S218 completion makes S219 the next queued/ready example target for plan-only dispatch examples until the active roadmap advances again.

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

`watch_live` fetches live read-only GitHub PR, changed-file, workflow-run, job, step, artifact, compare, and closing-reference metadata, normalizes it into the AF002 snapshot contract, and runs the CI watcher.

Required input:

- `pr_number`

Outputs:

- `.agent-factory/github-live-snapshot.json`
- `.agent-factory/github-live-snapshot.md`
- `.agent-factory/ci-watcher-report.json`
- `.agent-factory/ci-watcher-report.md`

`doctor_pr_body` runs AF003 against a saved PR body fixture.

Outputs:

- `.agent-factory/pr-contract-doctor-report.json`
- `.agent-factory/pr-contract-doctor-report.md`
- `.agent-factory/repaired-pr-body.md`

Default local input:

- `.agent-factory/pr-body.md`

For a PR-number target such as `461`, the dispatcher also checks `.agent-factory/pr-461-body.md`.

`doctor_pr_body_live` fetches the live PR body in memory and runs the AF003 doctor in report-only mode. The raw PR body is not written to the live snapshot artifact. The repaired output is still local review material only; AF007 does not update the PR body.

Required input:

- `pr_number`

`repair_plan` runs AF004 against an AF002 report or equivalent PR/check snapshot.

Outputs:

- `.agent-factory/safe-repair-plan.json`
- `.agent-factory/safe-repair-plan.md`

Default local inputs:

- `.agent-factory/ci-watcher-report.json`
- fallback: `.agent-factory/pr-ci-snapshot.json`

`repair_plan_live` fetches live PR/CI metadata, emits the AF002 watcher report, runs AF003 against the live PR body in memory for context, and emits an AF004 safe repair plan. It remains report-only and does not invoke Codex.

`merge_plan` runs AF005 against AF002/AF004-style report fixtures and forces report-only context.

Outputs:

- `.agent-factory/merge-plan.json`
- `.agent-factory/merge-plan.md`

AF006 v1 never recommends auto-merge from the workflow output. Any real merge, branch update, PR mutation, or workflow rerun remains a separate human-approved action.

`merge_plan_live` fetches live PR/CI metadata, emits AF002 and AF004 context, then emits an AF005 merge-readiness report. The workflow output never performs or recommends automatic merge execution; any real merge remains human-approved outside AF006/AF007.

See `docs/agent-factory-live-github-readonly.md` for live-mode details.

## Fixture Guidance

Snapshot modes require sanitized local fixtures or fail safely with instructions. Use the explicit `*_live` modes when the operator wants AF007 to fetch live GitHub metadata in read-only mode.

Useful AF002 metadata fixture command for local operator preparation:

```powershell
gh pr view <number> --json number,title,state,isDraft,baseRefOid,headRefOid,mergeable,mergeStateStatus,labels,files,statusCheckRollup > .agent-factory/pr-ci-snapshot.json
```

For GitHub Actions, prefer passing `target` as a committed sanitized fixture path outside `.agent-factory/`, because `.agent-factory/` is gitignored and local files are not available after checkout.

Do not put learner answers, OCR text, official question or answer bodies, source excerpts, provider payloads, billing data, credentials, private user content, or raw PR body secrets in fixtures. The workflow upload step only uploads generated AF006 artifacts, not raw input fixture files.

## Summary Artifact

Every dispatcher run writes:

- `.agent-factory/agent-factory-run-summary.md`

The workflow always appends that Markdown summary to the GitHub job summary. Failure summaries state that AF006/AF007 is report-only and explain the missing or invalid input.

## Local Command

```powershell
npm.cmd run agent-factory:run -- --mode plan_only --target auto --max-tasks 1 --stdout markdown --allow-mutation false
```

Snapshot example:

```powershell
npm.cmd run agent-factory:run -- --mode watch_snapshot --target .agent-factory/pr-ci-snapshot.json --stdout markdown --allow-mutation false
```

Live example:

```powershell
npm.cmd run agent-factory:run -- --mode watch_live --pr-number 462 --stdout markdown --allow-mutation false
```

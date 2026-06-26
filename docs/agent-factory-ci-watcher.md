# Agent Factory CI Watcher

`npm run agent-factory:watch` reads a saved PR/check metadata snapshot and emits a deterministic CI recommendation as JSON and Markdown.

This is AF002 development automation. It is read-only and metadata-only. It does not rerun workflows, mark PRs ready, merge PRs, push commits, invoke Codex, call learner runtime, call providers, touch payment/auth/runtime state, or use secrets.

## Command

```powershell
npm.cmd run agent-factory:watch
```

Default input:

- `.agent-factory/pr-ci-snapshot.json`

Default artifacts:

- `.agent-factory/ci-watcher-report.json`
- `.agent-factory/ci-watcher-report.md`

Optional arguments:

```powershell
npm.cmd run agent-factory:watch -- --snapshot .agent-factory/pr-ci-snapshot.json --stdout json
```

The script can also read stdin:

```powershell
Get-Content .agent-factory/pr-ci-snapshot.json | npm.cmd run agent-factory:watch -- --stdin
```

## Snapshot Source

AF002 accepts metadata fixtures and GitHub CLI/API-style PR snapshots. A useful GitHub CLI snapshot is:

```powershell
gh pr view <number> --json number,title,state,isDraft,baseRefOid,headRefOid,mergeable,mergeStateStatus,labels,files,statusCheckRollup > .agent-factory/pr-ci-snapshot.json
```

The watcher only reads the saved JSON file. It does not call `gh` itself.

Recognized PR fields include:

- `number`, `title`, `state`, `isDraft`, `merged`
- `baseRefOid`, `headRefOid`, `baseSha`, `headSha`
- `mergeable`, `mergeStateStatus`, `behindBy`, `commitsBehind`
- `labels`, `files`, `changedFiles`
- `statusCheckRollup`, `checks`, `workflowRuns`, `checkRuns`, `jobs`

## Report Contract

The JSON report includes:

- `repo`
- `prNumber`
- `prTitle`
- `prState`
- `draft`
- `baseSha`
- `headSha`
- `mergeability`
- `workflowSummary`
- `failedDomains`
- `pendingDomains`
- `skippedDomains`
- `recommendedNextActions`
- `humanApprovalRequired`
- `mergeCandidate`
- `blockedReasons`
- `repairPromptHint`
- `markdownSummary`

`humanApprovalRequired` is always true in v1. AF002 can identify a low-risk merge candidate, but it never recommends auto-merge.

## Classification Rules

PR state values:

- `draft`
- `open_ready`
- `closed_merged`
- `closed_unmerged`

Mergeability values:

- `mergeable`
- `conflict`
- `unknown`
- `behind_main`
- `diverged`

Workflow state values:

- `all_green`
- `pending`
- `failed`
- `skipped_only`
- `mixed`

Failure domains:

- `pr_contract_failure`
- `risk_gate_failure`
- `runtime_gate_failure`
- `fast_ci_failure`
- `full_ci_failure`
- `learner_loop_failure`
- `typecheck_failure`
- `lint_failure`
- `focused_test_failure`
- `unit_test_failure`
- `build_failure`
- `e2e_failure`
- `unknown_ci_failure`

PR Contract failures are intentionally classified before generic Fast CI failures so body repair is recommended before code repair.

## Recommendations

AF002 emits one or more recommended next actions:

- `wait_for_ci`
- `fix_pr_contract`
- `rerun_failed_jobs`
- `request_rebase`
- `request_codex_repair`
- `mark_ready_for_review`
- `human_approval_required`
- `merge_candidate`
- `blocked`

Important guardrails:

- Pending, missing, or ambiguous workflow data never becomes a merge candidate.
- Failed required CI never becomes a merge candidate.
- Draft PRs with clear checks recommend `mark_ready_for_review`, not merge.
- Behind, diverged, or conflicting branches recommend `request_rebase`.
- High-risk labels or paths require human approval and are not merge candidates in AF002.
- Runtime, payment, auth, database, security, provider, tenant, or user-data signals never get auto-merge recommendations.
- Skipped E2E alone does not block source-level planner/docs/tests PRs.

## Data Boundary

Generated artifacts must stay metadata-only:

- no learner answers;
- no OCR output;
- no official question or answer bodies;
- no source excerpts;
- no provider payloads;
- no billing records;
- no credentials or private user content.

The report safety assertion rejects secret-looking and raw-content-looking output keys.

## Failure Behavior

Missing workflow data fails closed with `wait_for_ci`, `blocked`, and an actionable blocked reason. Check entries with no deterministic status or conclusion are treated as pending and block merge-candidate output.

The command is source-level. Runtime evidence is not required for the watcher itself, but downstream repair or merge work must follow the risk and runtime evidence gates for that PR.

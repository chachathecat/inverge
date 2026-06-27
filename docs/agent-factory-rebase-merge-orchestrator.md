# Agent Factory Rebase/Merge Orchestrator

`npm run agent-factory:merge-plan` reads saved AF002/AF004 and PR metadata snapshots, then emits a deterministic rebase, merge-readiness, and approval-gate report as JSON and Markdown.

This is AF005 development automation. It is read-only and metadata-only. It does not update GitHub, mark PRs ready, merge PRs, rebase branches, rerun workflows, push commits, invoke Codex, call learner runtime, call providers, touch payment/auth/runtime state, or use secrets.

## Command

```powershell
npm.cmd run agent-factory:merge-plan
```

Default input:

- `.agent-factory/ci-watcher-report.json`
- fallback, when the default report is absent: `.agent-factory/pr-ci-snapshot.json`
- optional enrichment when present: `.agent-factory/pr-ci-snapshot.json`
- optional AF004 context when present: `.agent-factory/safe-repair-plan.json`

Default artifacts:

- `.agent-factory/rebase-merge-plan.json`
- `.agent-factory/rebase-merge-plan.md`

Optional arguments:

```powershell
npm.cmd run agent-factory:merge-plan -- --input .agent-factory/ci-watcher-report.json --snapshot .agent-factory/pr-ci-snapshot.json --repair-plan .agent-factory/safe-repair-plan.json --stdout json
npm.cmd run agent-factory:merge-plan -- --previous-snapshot .agent-factory/pr-ci-snapshot.before.json --siblings .agent-factory/sibling-prs.json
```

The script can also read stdin:

```powershell
Get-Content .agent-factory/ci-watcher-report.json | npm.cmd run agent-factory:merge-plan -- --stdin
```

## Report Contract

The JSON report includes:

- `repo`
- `prNumber`
- `prTitle`
- `headSha`
- `baseSha`
- `mergeReadiness`
- `approvalGate`
- `mergeCandidate`
- `humanApprovalRequired`
- `blockedReasons[]`
- `readyForReviewRecommended`
- `rebaseRequired`
- `rebaseCommands[]`
- `mergeMethodRecommendation`
- `mergeOrderNotes[]`
- `riskNotes[]`
- `validationSummary`
- `markdownSummary`

## Merge Readiness

AF005 classifies one readiness value:

- `not_ready_draft`
- `waiting_for_ci`
- `repair_required`
- `rebase_required`
- `human_approval_required`
- `merge_candidate`
- `blocked`
- `already_merged`
- `closed_unmerged`

It never recommends merge when required CI is pending, failed, cancelled, unknown, missing, or ambiguous. Draft PRs with clear checks can recommend `mark_ready_for_review`, but not merge. Behind-main, diverged, and conflicted branches require branch update or human conflict resolution before merge review.

## Approval Gates

AF005 classifies one approval gate:

- `none_required_for_report_only`
- `human_review_required`
- `owner_approval_required`
- `production_environment_approval_required`
- `blocked_no_auto_path`

Human approval is required by default in v1. High-risk domains, including payment, billing, auth, RLS, production DB, migrations, secrets, user-data deletion/export, provider-cost explosion, official-source verification, public launch, and production runtime behavior, never become automatic merge candidates even when CI is green.

## AF002 and AF004 Handoff

AF005 consumes AF002 CI Watcher reports directly. If only a PR/check snapshot is supplied, AF005 first normalizes it through the AF002 report creator in memory.

AF004 repair-plan input is used as context for failed current CI. PR Contract failures route to AF003/AF004 and produce `repair_required`, not a merge recommendation. Stale AF004 context does not override a current all-green AF002 report, but the report notes that AF004 context was present.

## Merge Order Notes

When sibling PR snapshots are supplied, AF005 emits merge-order notes for shared hot paths:

- `roadmap/active-program.yml`
- `package.json` and `package-lock.json`
- `scripts/run-node-tests.mjs`
- workflow files
- migrations
- billing/auth/runtime paths

Roadmap overlap notes explicitly remind operators to preserve every completed roadmap status when resolving conflicts.

## Data Boundary

Generated artifacts must stay metadata-only:

- no learner answers;
- no OCR output;
- no official question or answer bodies;
- no source excerpts;
- no provider payloads;
- no billing records;
- no credentials or private user content.

The safety assertion rejects secret-looking and raw-content-looking output keys and secret-looking string values.

## Failure Behavior

Invalid JSON fails before artifacts are written. Missing or ambiguous workflow data fails closed as `waiting_for_ci` or `blocked`. Conflicts are blocked for human conflict resolution. High-risk gates produce owner, production-environment, or blocked approval requirements instead of merge-candidate output.

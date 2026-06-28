# Agent Factory Live GitHub Read-only Integration

AF007 lets the manual Agent Factory workflow inspect live GitHub repository, PR, workflow-run, job, step, artifact, compare, and PR-body metadata in read-only/report-only mode.

AF009's Safe PR Metadata Gate is a separate manual workflow. AF007 live modes remain read-only/report-only and do not inherit AF009 write permissions.

Operator path:

```text
GitHub -> Actions -> Agent Factory Run -> Run workflow
```

Example:

```text
mode: watch_live
pr_number: 462
allow_mutation: false
```

or:

```text
mode: merge_plan_live
pr_number: 462
allow_mutation: false
```

## Modes

- `watch_live`: fetches live PR/CI metadata, writes a sanitized live snapshot artifact, and runs AF002.
- `doctor_pr_body_live`: fetches the PR body in memory and runs AF003 report-only analysis.
- `repair_plan_live`: fetches live watcher and doctor context, then runs AF004 report-only repair planning.
- `merge_plan_live`: fetches live watcher and repair context, then runs AF005 report-only merge planning.

Snapshot modes still work and still require sanitized local fixtures.

## Read-only Boundary

AF007 uses GitHub REST `GET` requests only. It does not update PRs, rerun workflows, mark PRs ready, rebase branches, push commits, merge PRs, invoke Codex, or call learner runtime, OCR, provider, billing, auth, production, or instructor APIs.

`allow_mutation=true` fails closed before live GitHub work starts.

The workflow uses the default Actions token when available with read-only permissions:

```yaml
permissions:
  contents: read
  actions: read
  pull-requests: read
  checks: read
```

No custom secret is required for v1.

## Normalized Metadata

The live client fetches:

- repository metadata;
- PR metadata by number;
- changed filenames;
- compare state for base/head SHA when available;
- workflow runs for the PR head commit;
- jobs and failed-step metadata for relevant runs;
- workflow artifact metadata;
- PR-body closing references parsed as issue numbers when available.

The normalized `.agent-factory/github-live-snapshot.json` artifact excludes raw PR body text. It records only metadata such as PR number, changed filenames, check states, artifact names, closing issue references, and endpoint error summaries.

AF003 live mode reads the PR body in memory and writes the normal doctor artifacts. Secret-looking or raw-content-looking lines are redacted by the existing AF003 safety path before any repaired body artifact is written.

## Failure Behavior

Missing permissions, rate limits, missing workflow runs, unknown workflow names, unknown job names, and ambiguous job states never become green.

When optional GitHub metadata is unavailable, AF007 injects a synthetic unknown required check into the AF002-compatible snapshot. AF002 then reports pending/blocked state with an actionable reason instead of allowing merge-candidate output.

If required PR metadata itself cannot be fetched, the dispatcher fails safely and still writes `.agent-factory/agent-factory-run-summary.md` with the GitHub read-permission or rate-limit instruction.

## Artifacts

Live modes can produce:

- `.agent-factory/github-live-snapshot.json`
- `.agent-factory/github-live-snapshot.md`
- `.agent-factory/ci-watcher-report.json`
- `.agent-factory/ci-watcher-report.md`
- `.agent-factory/pr-contract-doctor-report.json`
- `.agent-factory/pr-contract-doctor-report.md`
- `.agent-factory/repaired-pr-body.md`
- `.agent-factory/safe-repair-plan.json`
- `.agent-factory/safe-repair-plan.md`
- `.agent-factory/merge-plan.json`
- `.agent-factory/merge-plan.md`
- `.agent-factory/agent-factory-run-summary.md`

Generated artifacts must remain metadata-only except for the AF003 repaired body artifact, which is sanitized by the doctor before upload.

# Agent Factory Admin Dashboard

AF008 adds an internal admin report shell at:

```text
/admin/factory
```

The dashboard summarizes generated Agent Factory artifacts for AF001 through AF007. It is read-only/report-only and does not call GitHub, Codex, learner runtime, OCR, providers, billing, auth mutation paths, or production mutation APIs.

## Access Model

The route uses the existing admin page access helper:

- authenticated session required;
- email must pass the admin allowlist helper;
- normal learner navigation must not link to this route.

Dashboard v1 does not make sensitive live data visible. It reads local generated `.agent-factory` artifacts only after the admin page gate passes. Missing artifacts render an actionable empty state.

## Artifact Inputs

The loader reads these generated files when present:

- `.agent-factory/codex-task-packages.json`
- `.agent-factory/ci-watcher-report.json`
- `.agent-factory/pr-contract-doctor-report.json`
- `.agent-factory/repaired-pr-body.md`
- `.agent-factory/safe-repair-plan.json`
- `.agent-factory/merge-plan.json`
- `.agent-factory/rebase-merge-plan.json` as a legacy fallback
- `.agent-factory/github-live-snapshot.json`
- `.agent-factory/agent-factory-run-summary.md`

The dashboard allowlists metadata fields from those contracts. It summarizes PR body repair status without rendering raw PR body dumps.

## Dashboard Sections

- Header: Agent Factory, read-only/report-only state, last updated timestamp, and safety status.
- Next work package: selected AF001 item, branch suggestion, worktree command, and Codex prompt availability.
- PR/CI watcher: PR state, workflow summary, failed/pending/skipped domains, recommended next actions, and blocked reasons.
- PR body contract: AF003 validity and sanitized repaired artifact availability.
- Repair plan: repair domain, repair allowed/blocked state, human approval requirement, validation commands, and blocked reasons.
- Merge plan: merge readiness, approval gate, rebase requirement, merge candidate state, and blocked reasons.
- Actions button instructions: `GitHub -> Actions -> Agent Factory Run -> Run workflow`.
- Safety panel: explicit no-mutation boundary.

Recommended modes:

- `plan_only`: `pr_number` may be empty.
- `watch_live`: requires `pr_number`.
- `doctor_pr_body_live`: requires `pr_number`.
- `repair_plan_live`: requires `pr_number`.
- `merge_plan_live`: requires `pr_number`.

## Safety Boundary

Dashboard v1 performs none of these actions:

- mutation;
- Codex invocation;
- branch creation;
- PR creation or PR update;
- workflow rerun;
- rebase;
- merge;
- learner runtime call;
- OCR call;
- provider call;
- billing or payment action;
- auth mutation;
- production API mutation.

Human approval is required for risky work outside this dashboard.

## Data Boundary

Allowed:

- metadata-only Agent Factory reports;
- generated status, domains, commands, artifact names, timestamps, and blocked reasons.

Not displayed or persisted by the dashboard:

- learner answers;
- OCR text;
- official question or answer bodies;
- source excerpts;
- provider payloads;
- billing data;
- credentials;
- private user content.

If an artifact is missing, invalid, or unavailable in the local environment, the dashboard shows a missing-artifact state and the matching Agent Factory mode to run. It does not invent AF semantics and does not fetch live data as a fallback.

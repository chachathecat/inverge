# Agent Factory Audit Log / Run History

AF011 adds a local metadata-only audit layer for Agent Factory runs. It lets operators inspect recent factory activity after the fact without exposing raw payloads.

## Scope

AF011 v1 records metadata for:

- AF006/AF007 read-only/report-only runs from `agent-factory:run`;
- AF009 Safe PR Metadata Gate runs from `agent-factory:mutate`;
- AF010 Codex Invocation Adapter dry-run plans from `agent-factory:codex-invocation`;
- AF013A Factory Planner Notes from `agent-factory:planner-notes`;
- AF013B Patch Artifact Adapter plans from `agent-factory:patch-artifact`;
- AF013C Branch Commit PR Adapter plans from `agent-factory:branch-commit-pr`;
- AF014 CI Repair Loop plans from `agent-factory:ci-repair`;
- AF015 Roadmap Autopilot plans from `agent-factory:roadmap-autopilot`.

## AF013B-V Runtime Verification Evidence

`docs/agent-factory-patch-artifact-runtime-verification.md` records docs-only dogfood evidence that AF013B appends an AF011 `agent-factory-patch-artifact` run-history record while remaining metadata-only and report-only.

This evidence does not change the AF011 schema or behavior. It confirms that the AF013B run-history append stores artifact paths, status labels, guardrail flags, hashes, and counts only, without raw patch text, raw diff text, raw prompt text, raw PR bodies, learner answers, OCR payloads, provider payloads, or secrets.

## AF013C Run-History Append

AF013C appends an `agent-factory-branch-commit-pr` record while remaining metadata-only and report-only.

The AF013C record stores artifact paths, status labels, approval-gate outcome, requested mutation class, guardrail flags, hashes, and counts only. It does not store raw PR bodies, raw comments, raw patch text, raw diff text, raw task-package prompts, learner answers, OCR payloads, provider payloads, billing/auth/payment records, credentials, or secrets.

Each record captures:

- run id;
- timestamp;
- actor and source;
- mode or mutation intent;
- target PR number or task id;
- status;
- dry-run flag;
- approval gate outcome;
- artifact paths;
- blocked reason codes;
- guardrail summary;
- payload hashes and counts.

## AF014 Run-History Append

AF014 appends an `agent-factory-ci-repair` record while remaining metadata-only and report-only.

The AF014 record stores artifact paths, status labels, CI failure classes, reason-code counts, approval-gate outcome, guardrail flags, hashes, and counts only. It does not store raw CI logs, raw PR bodies, raw comments, raw patch text, raw diff text, raw task-package prompts, learner answers, OCR payloads, provider payloads, billing/auth/payment records, credentials, or secrets.

AF014 run-history records do not indicate that a repair was executed. They only show that a local CI repair plan artifact was generated for human review.

## AF014-V Runtime Verification Evidence

`docs/agent-factory-ci-repair-runtime-verification.md` records docs-only/runtime verification evidence that AF014 classifies a PR Contract failure, writes metadata-only repair-plan artifacts, and appends an AF011 `agent-factory-ci-repair` run-history record without exposing raw CI logs or raw PR body text.

This evidence does not change the AF011 schema or behavior. It confirms that the AF014 run-history append stores artifact paths, status labels, failure-class and reason-code metadata, guardrail flags, hashes, and counts only.

## AF015 Run-History Append

AF015 appends an `agent-factory-roadmap-autopilot` record while remaining metadata-only and report-only.

The AF015 record stores artifact paths, status labels, candidate and reason-code metadata, approval-gate outcome, guardrail flags, hashes, and counts only. It does not store raw issue bodies, raw PR bodies, raw comments, raw prompts, raw patch text, raw diff text, learner answers, OCR payloads, provider payloads, billing/auth/payment records, credentials, or secrets.

AF015 run-history records do not indicate that roadmap work was executed. They only show that a local roadmap autopilot plan artifact was generated for human review.

## Non-goals

AF011 v1 does not:

- create a production database table;
- add learner-facing UI;
- execute Codex;
- create branches, commits, pushes, merges, rebases, or workflow reruns;
- mutate code, PR metadata, learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs;
- replace AF009 approval gates or AF010 dry-run-only behavior;
- store raw PR bodies, raw task packages, comment bodies, learner content, OCR text, provider payloads, secrets, billing/auth/payment records, or private content.

## Data Boundary

The run-history artifact is metadata-only.

Allowed:

- IDs, timestamps, source labels, mode labels, mutation intent labels, target identifiers, status labels, dry-run booleans, approval-gate labels, artifact paths, reason codes, and boolean guardrail flags.
- SHA-256 hashes and counts for payload-bearing inputs or generated plans.

Not allowed:

- raw PR body text;
- raw task-package text or prompt text;
- raw comment payloads;
- learner answers or OCR text;
- provider, billing, auth, payment, or production payloads;
- secrets, tokens, cookies, service-role keys, private keys, or credentials;
- private user content.

Rejected or fail-closed runs still receive history records, but those records store reason codes and hashes/counts only.

## Artifact Format

Default artifacts:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/run-history.md`

`run-history.jsonl` is append-only. Each line is one JSON record:

```json
{
  "version": 1,
  "runId": "af011-20260629120000-abc123def456",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "source": "agent-factory-run",
  "actor": {
    "name": "operator",
    "repository": "owner/repo",
    "workflowName": "Agent Factory Run",
    "workflowRunId": "123456"
  },
  "mode": "watch_live",
  "mutationIntent": null,
  "target": {
    "prNumber": 477,
    "taskId": null
  },
  "status": "success",
  "dryRun": true,
  "approvalGateOutcome": "not_required",
  "artifactPaths": [
    ".agent-factory/ci-watcher-report.json",
    ".agent-factory/agent-factory-run-summary.md"
  ],
  "payloadDigests": [
    {
      "label": "run_output",
      "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      "charCount": 1200,
      "lineCount": 1,
      "fieldCount": 42
    }
  ],
  "blockedReasonCodes": [],
  "blockedReasonCount": 0,
  "guardrailSummary": {
    "metadataOnly": true,
    "artifactBacked": true,
    "storesPayloadDigestsOnly": true,
    "codexExecuted": false,
    "codeMutationAttempted": false,
    "branchMutationAttempted": false,
    "prMetadataMutationAttempted": false,
    "workflowRerunAttempted": false,
    "learnerRuntimeTouched": false,
    "ocrTouched": false,
    "providerTouched": false,
    "billingTouched": false,
    "authTouched": false,
    "paymentTouched": false,
    "productionApiTouched": false
  }
}
```

`run-history.md` is regenerated from recent JSONL records. It is a convenience summary only; the JSONL file is the local artifact-backed source of truth.

## Rollback

AF011 v1 only writes local `.agent-factory/` artifacts. Rollback is a focused revert of the AF011 library, script wiring, workflow artifact-list additions, docs, and tests.

To clean local generated output, delete:

```powershell
Remove-Item .agent-factory/run-history.jsonl, .agent-factory/run-history.md -ErrorAction SilentlyContinue
```

No external state rollback is required because AF011 does not create database rows or call mutation APIs.

## Future Database Path

A future version may add a production audit table only after a separate issue defines:

- schema and migrations;
- retention and deletion policy;
- tenant and role boundaries;
- service-role access controls;
- export behavior;
- privacy review;
- rollback and disable path.

Until then, `.agent-factory/run-history.jsonl` remains the only run-history store.

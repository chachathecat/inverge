# Agent Factory Audit Log / Run History

AF011 adds a local metadata-only audit layer for Agent Factory runs. It lets operators inspect recent factory activity after the fact without exposing raw payloads.

## Scope

AF011 v1 records metadata for:

- AF006/AF007 read-only/report-only runs from `agent-factory:run`;
- AF009 Safe PR Metadata Gate runs from `agent-factory:mutate`;
- AF010 Codex Invocation Adapter dry-run plans from `agent-factory:codex-invocation`;
- AF013A Factory Planner Notes from `agent-factory:planner-notes`;
- AF013B Patch Artifact Adapter plans from `agent-factory:patch-artifact`.

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

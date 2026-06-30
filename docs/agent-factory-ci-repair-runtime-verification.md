# AF014-V CI Repair Loop Runtime Verification

Date: 2026-06-30
Verification type: local Windows PowerShell dogfood evidence
Risk: low

## Purpose

Record docs-only/runtime verification evidence that AF014 CI Repair Loop safely classifies a known PR Contract failure and writes bounded metadata-only repair plans.

AF014 remains metadata-only and report-only. It reads local CI metadata and log-summary artifacts, classifies failures into bounded reason codes, writes local repair-plan artifacts for human review, and appends AF011 run history. It does not execute repair.

This document commits only high-level evidence. It does not commit generated `.agent-factory` artifacts.

## Relationship to AF010, AF011, AF012, AF013A, AF013B, AF013C, and AF014

- AF010 produces a dry-run Codex invocation plan. In this verification, AF010 metadata remained dry-run only and did not invoke Codex.
- AF011 records metadata-only run history in local JSONL and Markdown artifacts. In this verification, AF011 appended an `agent-factory-ci-repair` record after AF014 ran.
- AF012 produces optional report-only orchestration metadata. AF014 may inspect the local run history and upstream artifacts without executing the orchestration plan.
- AF013A produces report-only planner notes and workspace/path boundary metadata. AF014 may inspect this local metadata when present.
- AF013B produces metadata-only patch artifact plans. AF014 may inspect this local metadata when present and must not apply patches.
- AF013C produces approval-gated branch/commit/PR mutation plans. AF014 may inspect this local metadata when present and must not create branches, commits, pushes, PR updates, workflow reruns, merges, or rebases.
- AF014 consumes local CI metadata, classifies the failure, writes CI repair plan metadata, and appends AF011 run history.

AF014-V does not weaken AF010, AF011, AF012, AF013A, AF013B, AF013C, or AF014 guardrails.

## Runtime Verification Setup

- Workspace: `C:\Users\jmg91\exam-coach-af014-v`
- Branch: `feat/af014-v-ci-repair-runtime-verification`
- Base: latest fetched `origin/main` containing AF014 CI Repair Loop v1
- Shell: Windows PowerShell
- Node execution: repository npm scripts via `npm.cmd`
- Generated local artifact directory: `.agent-factory/`
- Verification pattern: synthetic/local CI metadata for a PR Contract failure

Observed safe setup sequence:

```text
AF010 dry-run invocation metadata
-> AF013A planner-note metadata
-> AF013B patch-artifact metadata
-> AF013C branch/commit/PR metadata
-> local CI log-summary metadata
-> AF014 CI repair plan
-> AF011 run-history append
```

The usual Node loader warnings may appear in this repository script path:

- `ExperimentalWarning: --experimental-loader may be removed in the future`
- `[MODULE_TYPELESS_PACKAGE_JSON] Warning`

This verification does not add `"type": "module"` to `package.json`.

## Synthetic/Local CI Metadata Fixture Shape

The local fixture uses derived metadata only. It records no raw CI logs and no raw PR body.

```json
{
  "generatedAt": "2026-06-30T00:00:00.000Z",
  "failures": [
    {
      "workflowName": "PR Contract",
      "jobName": "validate-pr-contract",
      "stepName": "Required sections",
      "conclusion": "failure",
      "failureClass": "pr_contract",
      "closingReferenceCount": 1,
      "missingRequiredSections": [
        "Goal",
        "Non-goals",
        "Risk classification",
        "Data boundary",
        "Tests and evidence",
        "Runtime evidence",
        "Rollout and rollback",
        "Remaining risks",
        "Merge recommendation"
      ]
    },
    {
      "workflowName": "PR Contract",
      "jobName": "validate-pr-contract",
      "stepName": "Risk line",
      "conclusion": "failure",
      "failureClass": "pr_contract",
      "closingReferenceCount": 1,
      "missingRiskLine": true
    },
    {
      "workflowName": "PR Contract",
      "jobName": "validate-pr-contract",
      "stepName": "Merge recommendation",
      "conclusion": "failure",
      "failureClass": "pr_contract",
      "closingReferenceCount": 1,
      "missingMergeRecommendation": true
    }
  ]
}
```

The fixture represents a PR body that contains only one closing reference. The local CI summary emits one derived metadata record per missing PR Contract predicate, so AF014 can preserve distinct reason codes. AF014 receives the count and missing-field metadata, not the raw PR body text.

## Known PR Contract Failure Example

The known safe failure pattern is:

- missing required PR body sections
- missing risk line
- missing merge recommendation checkboxes
- one valid closing-reference count

AF014 must produce a pr_contract classification from metadata and propose PR body repair metadata. AF014 must not surface raw PR body text in JSON, Markdown, summary, or run-history output.

## Expected AF014 Classifications

The AF014 plan is expected to include:

- `failureClass: pr_contract`
- `reasonCode: pr_contract_missing_required_section`
- `reasonCode: pr_contract_missing_risk_line`
- `reasonCode: pr_contract_missing_merge_recommendation`
- `repairClass: pr_body_repair`

The expected repair step is a human-review handoff only. It is not approved for execution in AF014 v1.

## Expected Generated Local Artifacts

AF014 writes these ignored local artifacts:

- `.agent-factory/ci-repair-plan.json`
- `.agent-factory/ci-repair-plan.md`
- `.agent-factory/agent-factory-ci-repair-summary.md`

AF011 also maintains these ignored local run-history artifacts:

- `.agent-factory/run-history.jsonl`
- `.agent-factory/run-history.md`

Generated `.agent-factory` artifacts are ignored by Git and are not committed.

## AF011 Run-History Append Evidence

The local `.agent-factory/run-history.jsonl` append is expected to include an `agent-factory-ci-repair` record with:

- mode `ci_repair_plan`
- mutation intent `ci_repair_report_only`
- status `success` when the local metadata is safe
- dry-run `true`
- approval gate `dry_run_not_required`
- artifact paths for the AF014 JSON, Markdown, and summary files
- payload digest metadata for the generated plan
- guardrail flags showing no Codex execution, no code mutation, no branch mutation, no PR metadata mutation, and no workflow rerun

The local `.agent-factory/run-history.md` summary is expected to reflect the same metadata-only record.

AF011 stores artifact paths, status labels, guardrail flags, hashes, and counts only. It does not store raw CI logs, raw PR body, raw comments, raw patch text, raw diff text, raw prompt text, raw task-package prompt, learner answers, OCR payload, provider payload, credentials/secrets, or secrets.

## Safety Evidence

- Codex executed: no
- shell commands from plan executed: no
- patches applied: no
- source files edited by AF014: no
- workflow rerun by AF014: no
- branch created: no
- commit created by AF014: no
- push performed by AF014: no
- PR created/updated by AF014: no
- merge/rebase by AF014: no
- branch/commit/push/PR/merge/rebase mutation: no
- learner/runtime/provider/billing/auth/payment/OCR/production/instructor state touched: no

The generated AF014 action flags must remain:

```text
willRunCodex: false
willRunShellCommands: false
willApplyPatch: false
willEditWorkingTree: false
willCreateBranch: false
willCreateCommit: false
willPush: false
willCreateOrUpdatePr: false
willRerunWorkflow: false
willMergeOrRebase: false
```

## Data Boundary

This verification stores only high-level metadata evidence.

- no raw CI logs
- no raw PR body
- no raw comments
- no raw patch text
- no raw diff text
- no raw prompt text
- no raw task-package prompt
- no learner answers
- no OCR payload
- no provider payload
- no credentials/secrets
- no secrets

Allowed evidence in this document:

- command names;
- status labels;
- artifact paths;
- reason codes;
- classification labels;
- zero-execution and zero-mutation flags;
- metadata-only data-boundary flags;
- AF011 source, mode, status, dry-run, approval-gate, artifact-path, hash, and count labels.

Disallowed evidence in this document:

- raw CI log lines;
- raw PR bodies;
- raw comments;
- raw patch or diff content;
- raw prompt text or task-package prompts;
- learner answers;
- OCR text or payloads;
- provider payloads;
- billing, auth, payment, production, academy, or instructor data;
- credentials, tokens, cookies, service-role keys, private keys, or private user content.

## Rollback

This PR is docs and tests only. Rollback is a focused revert of:

- `docs/agent-factory-ci-repair-runtime-verification.md`
- the AF011 documentation note that points to this evidence
- `tests/agent-factory-ci-repair-runtime-verification.test.mjs`
- the default node-test runner entry

To clean local generated runtime artifacts:

```powershell
Remove-Item .agent-factory/ci-repair-plan.json, .agent-factory/ci-repair-plan.md, .agent-factory/agent-factory-ci-repair-summary.md, .agent-factory/run-history.jsonl, .agent-factory/run-history.md -ErrorAction SilentlyContinue
```

No external-state rollback is required because AF014 did not mutate source, Git, GitHub, workflows, learner/runtime/provider/billing/auth/payment/OCR/production, academy, or instructor state.

## Remaining Risks

- This verification is local Windows dogfood evidence, not proof of every future operator environment.
- AF014 remains a review boundary only. Any future repair execution, workflow rerun, branch creation, commit, push, PR update, merge, rebase, Codex invocation, shell execution, or patch application path must be implemented separately and approval-gated.
- Generated `.agent-factory` artifacts remain local runtime evidence and are intentionally not committed.
- PR Contract repair metadata does not prove that a future generated PR body is correct; a human must review any future body mutation layer.

## Next Step

AF015 Roadmap Autopilot.

AF015 must be a separate issue and PR. It must not bypass AF014 metadata-only behavior, AF013C approval gates, AF009 mutation safety rules, or AF011 data-boundary constraints.

# Agent Factory Orchestrator

AF012 adds a report-only Factory Orchestrator for local Agent Factory artifacts.

The orchestrator reads generated `.agent-factory/` metadata artifacts, summarizes their state, and recommends one next Agent Factory step. It does not run the recommended command.

## Scope

AF012 v1 can inspect:

- AF001 task packages;
- AF002 CI watcher reports;
- AF004 safe repair plans;
- AF009 mutation plans;
- AF010 Codex invocation plans;
- AF011 run-history JSONL.

AF012 v1 writes:

- `.agent-factory/factory-orchestrator-plan.json`
- `.agent-factory/factory-orchestrator-plan.md`
- `.agent-factory/agent-factory-orchestrator-summary.md`

It also appends a metadata-only AF011 run-history record.

## Non-goals

AF012 v1 does not:

- execute Codex;
- run shell commands from the plan;
- edit source files;
- create branches, commits, pushes, merges, rebases, PRs, comments, workflow reruns, or GitHub metadata mutations;
- call learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs;
- replace AF009 approval gates;
- change AF010 dry-run-only behavior;
- create a production database table;
- add learner-facing UI.

## Data Boundary

The orchestrator stores metadata only.

Allowed output:

- artifact presence, status, hashes, timestamps, counts, safe status labels, and reason codes;
- one recommended next Agent Factory command as text;
- AF011 history summary metadata.

Not allowed output:

- raw PR body text;
- raw task-package prompts;
- raw comments;
- learner answers or OCR text;
- provider payloads;
- credentials, tokens, cookies, service-role keys, private keys, or secrets;
- billing, auth, payment, or production records;
- private user content.

If an artifact is unsafe or unparsable, AF012 fails closed with an invalid-artifact state and does not surface raw artifact content.

## Decision Order

AF012 v1 recommends at most one next action:

1. If task packages are missing, run `agent-factory:run` in `plan_only`.
2. If task packages exist but no AF010 plan exists, prepare an AF010 Codex invocation dry-run.
3. If the AF010 plan is rejected, stop for human review.
4. If no CI watcher report exists, inspect PR/CI metadata with AF007 read-only live mode.
5. If CI is pending, wait.
6. If CI failed and no repair plan exists, generate an AF004 repair plan.
7. If a repair plan exists, review it manually.
8. Otherwise review run history and generated artifacts.

## Local Command

```powershell
npm.cmd run agent-factory:orchestrate -- --artifact-dir .agent-factory --stdout markdown
```

AF012 v1 is intentionally a coordinator report. It never starts Codex, never calls GitHub mutation APIs, and never runs the recommended command.

## Rollback

AF012 only writes local `.agent-factory/` artifacts and appends AF011 history.

Rollback is a focused revert of the AF012 library, CLI, npm script, docs, and tests. To clean generated local output:

```powershell
Remove-Item .agent-factory/factory-orchestrator-plan.json, .agent-factory/factory-orchestrator-plan.md, .agent-factory/agent-factory-orchestrator-summary.md -ErrorAction SilentlyContinue
```

No external-state rollback is required.

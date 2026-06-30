# Agent Factory Patch Artifact Adapter

AF013B adds a report-only patch artifact boundary after AF013A planner notes.

The patch-artifact command reads local `.agent-factory/` metadata artifacts, records hashes and allowlisted metadata, and writes a human-review plan for local patch or diff review artifacts. It does not apply a patch or change source files.

## Scope

AF013B v1 can inspect:

- AF001 task packages;
- AF010 Codex invocation plans;
- AF012 orchestrator plans;
- AF013A planner notes;
- AF011 run-history JSONL;
- optional local patch or diff review artifacts by path, represented only by hash, line count, and byte count.

AF013B v1 writes:

- `.agent-factory/patch-artifact-plan.json`
- `.agent-factory/patch-artifact-plan.md`
- `.agent-factory/agent-factory-patch-artifact-summary.md`

It also appends a metadata-only AF011 run-history record.

## Non-goals

AF013B v1 does not:

- execute Codex;
- run shell commands from the plan;
- apply patches;
- edit source files or the working tree;
- create branches, commits, pushes, merges, rebases, PRs, comments, workflow reruns, or GitHub metadata mutations;
- call learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs;
- bypass AF009 mutation approval gates;
- bypass AF010 dry-run-only behavior;
- replace human review;
- create a production database table;
- add learner-facing UI.

## Data Boundary

The patch artifact plan stores metadata only.

Allowed output:

- artifact presence, status, hashes, counts, task ids, PR numbers, branch names, path-prefix boundaries, status labels, reason codes, and patch artifact byte/line counts;
- one inert command preview as text;
- human-review instructions;
- AF011 history summary metadata.

Not allowed output:

- raw patch or diff text;
- raw task-package prompts;
- raw PR body text;
- raw comments;
- learner answers or OCR text;
- provider payloads;
- credentials, tokens, cookies, service-role keys, private keys, or secrets;
- billing, auth, payment, production, or instructor records;
- private user content.

If an inspected local artifact is unparsable, not a file, outside the artifact boundary, or fails the metadata-only safety scan, AF013B fails closed without surfacing raw artifact content.

## Boundary Defaults

AF013B defaults to a narrow future-work boundary:

- patch artifact only;
- no patch application to the working tree;
- isolated workspace required;
- human approval required;
- approval gate defaults to `not_requested`;
- maximum changed files defaults to `8`;
- maximum patch bytes defaults to `60000`;
- proposed patch artifact paths default under the selected local artifact directory;
- allowed path prefixes default to Agent Factory libraries, scripts, docs, tests, `package.json`, and `scripts/run-node-tests.mjs`;
- forbidden path prefixes include learner app surfaces, auth, billing, OCR, payment, provider, instructor, academy, migrations, Supabase, and workflow files.

These defaults are only metadata in AF013B v1. The command does not enforce them by changing files because it never changes files.

## Local Command

```powershell
npm.cmd run agent-factory:patch-artifact -- --artifact-dir .agent-factory --stdout markdown
```

AF013B v1 is intentionally a patch review boundary. It never starts Codex, never calls GitHub mutation APIs, never applies a patch, and never runs an inert command preview.

## Rollback

AF013B only writes local `.agent-factory/` artifacts and appends AF011 history.

Rollback is a focused revert of the AF013B library, CLI, npm script, docs, and tests. To clean generated local output:

```powershell
Remove-Item .agent-factory/patch-artifact-plan.json, .agent-factory/patch-artifact-plan.md, .agent-factory/agent-factory-patch-artifact-summary.md -ErrorAction SilentlyContinue
```

No external-state rollback is required.

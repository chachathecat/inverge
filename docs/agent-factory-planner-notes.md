# Agent Factory Planner Notes

AF013A adds a report-only local planning boundary before any future code-changing Agent Factory adapter exists.

The planner-note command reads local `.agent-factory/` metadata artifacts, records hashes and allowlisted metadata, and writes a human-review note that defines the isolated workspace and path boundary for possible future work. It does not execute the future work.

## Scope

AF013A v1 can inspect:

- AF001 task packages;
- AF010 Codex invocation plans;
- AF012 orchestrator plans;
- AF011 run-history JSONL.

AF013A v1 writes:

- `.agent-factory/factory-planner-note.json`
- `.agent-factory/factory-planner-note.md`
- `.agent-factory/agent-factory-planner-note-summary.md`

It also appends a metadata-only AF011 run-history record.

## Non-goals

AF013A v1 does not:

- execute Codex;
- run shell commands from the note;
- apply patches or edit source files;
- create branches, commits, pushes, merges, rebases, PRs, comments, workflow reruns, or GitHub metadata mutations;
- call learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs;
- bypass AF009 mutation approval gates;
- bypass AF010 dry-run-only behavior;
- replace human review;
- create a production database table;
- add learner-facing UI.

## Data Boundary

The planner note stores metadata only.

Allowed output:

- artifact presence, status, hashes, counts, task ids, PR numbers, branch names, path-prefix boundaries, status labels, and reason codes;
- one inert command preview as text;
- human-review instructions;
- AF011 history summary metadata.

Not allowed output:

- raw task-package prompts;
- raw PR body text;
- raw comments;
- learner answers or OCR text;
- provider payloads;
- credentials, tokens, cookies, service-role keys, private keys, or secrets;
- billing, auth, payment, production, or instructor records;
- private user content.

If an inspected local artifact is unparsable or not a file, AF013A fails closed with an invalid-artifact state and does not surface raw artifact content.

## Boundary Defaults

AF013A defaults to a narrow future-work boundary:

- isolated workspace required;
- human approval required;
- approval gate defaults to `not_requested`;
- maximum changed files defaults to `8`;
- maximum diff bytes defaults to `60000`;
- allowed path prefixes default to Agent Factory libraries, scripts, docs, tests, `package.json`, and `scripts/run-node-tests.mjs`;
- forbidden path prefixes include learner app surfaces, auth, billing, OCR, payment, provider, instructor, academy, migrations, Supabase, and workflow files.

These defaults are only metadata in AF013A v1. The command does not enforce them by changing files because it never changes files.

## Local Command

```powershell
npm.cmd run agent-factory:planner-notes -- --artifact-dir .agent-factory --stdout markdown
```

AF013A v1 is intentionally a planning boundary. It never starts Codex, never calls GitHub mutation APIs, and never runs an inert command preview.

## Rollback

AF013A only writes local `.agent-factory/` artifacts and appends AF011 history.

Rollback is a focused revert of the AF013A library, CLI, npm script, docs, and tests. To clean generated local output:

```powershell
Remove-Item .agent-factory/factory-planner-note.json, .agent-factory/factory-planner-note.md, .agent-factory/agent-factory-planner-note-summary.md -ErrorAction SilentlyContinue
```

No external-state rollback is required.

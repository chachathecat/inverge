# Agent Factory Codex Invocation Adapter

AF010 adds the first Codex Invocation Adapter. It prepares and validates a metadata-safe Codex invocation plan from a sanitized task package, then stops. AF010 v1 does not execute Codex and does not mutate code.

## Scope

AF010 v1 can:

- read one sanitized task package JSON object, or select one package from a `packages` array;
- validate task-package text and field names against the Agent Factory data boundary;
- produce a dry-run invocation plan;
- write JSON and Markdown plan artifacts;
- fail closed for unsafe task packages;
- fail closed for every non-dry-run request, even with approval.

Command:

```powershell
npm.cmd run agent-factory:codex-invocation -- --input .agent-factory/sanitized-codex-task-package.json --stdout markdown
```

When the input is the AF001 task-package collection, select a package explicitly:

```powershell
npm.cmd run agent-factory:codex-invocation -- --input .agent-factory/codex-task-packages.json --item-id S209 --stdout markdown
```

## Non-goals

AF010 v1 does not:

- execute Codex;
- write source files;
- create branches, commits, pushes, merges, rebases, or workflow reruns;
- call GitHub mutation APIs;
- call learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs;
- change AF009 Safe PR Metadata Gate behavior;
- expand learner-facing product scope.

## Data Boundary

The task package must be metadata-only.

AF010 rejects text or fields that look like:

- raw learner content or learner answers;
- OCR text, OCR output, or OCR payloads;
- provider payloads;
- billing, auth, or payment data;
- credentials, secrets, tokens, API keys, service-role keys, cookies, sessions, or private keys;
- private user content;
- raw PR body payloads.

The adapter reports violation categories and counts, not raw unsafe values. Rejected artifacts keep hashes and generic reasons only.

## Approval Model

Dry-run is the only supported mode in v1.

Default:

```powershell
--dry-run true
```

Future non-dry-run paths must require this exact phrase:

```text
I approve AF010 Codex invocation
```

In AF010 v1, `--dry-run false` always fails closed. The exact approval phrase only records that the future approval gate was satisfied; it still does not permit execution.

## Artifacts

Default artifacts:

- `.agent-factory/codex-invocation-plan.json`
- `.agent-factory/codex-invocation-plan.md`
- `.agent-factory/agent-factory-codex-invocation-summary.md`

Artifacts include:

- selected package source and index;
- input and prompt hashes;
- prompt line and character counts;
- validation command counts;
- safe item, branch, worktree, and repository metadata when the package passes validation;
- blocked reason codes;
- data-boundary violation counts and categories;
- explicit `codexWillBeInvoked: false`.

Artifacts omit raw task-package payloads, raw PR bodies, unsafe values, secrets, and learner content.

## Rollback

AF010 v1 has no runtime or external-state rollback because it only writes local `.agent-factory/` artifacts.

Rollback is a focused revert of the AF010 docs, library, script, npm script, and tests. Delete generated `.agent-factory/codex-invocation-*` artifacts if an operator wants a clean workspace.

AF009 rollback remains unchanged and separate: correct AF009 metadata mutations manually through normal GitHub PR body or comment history when needed.

# Agent Factory Roadmap Runner

`npm run agent-factory:plan` reads `roadmap/active-program.yml` and emits the next safe Codex work packages as deterministic JSON and Markdown.

This is a metadata-only development automation layer. It does not invoke Codex, create branches, push commits, open PRs, merge PRs, call GitHub mutation APIs, call providers, touch learner runtime state, change billing, or use secrets.

## Command

```powershell
npm.cmd run agent-factory:plan
```

Default artifacts:

- `.agent-factory/codex-task-packages.json`
- `.agent-factory/codex-task-packages.md`

Optional arguments:

```powershell
npm.cmd run agent-factory:plan -- --roadmap roadmap/active-program.yml --stdout json
```

## Selection Rules

The runner:

- parses `program.wipLimit`;
- classifies completed, active, queued, blocked, unknown, and ready items;
- treats active and blocked roadmap items as WIP occupants;
- requires every dependency to be completed before an item becomes ready;
- blocks queued items when their lock group is already occupied;
- sorts ready work by numeric priority and then source order;
- selects at most two ready packages and never more than the available WIP slots.

When two selected packages both require roadmap status edits, the generated packages include merge-order and rebase notes for `roadmap/active-program.yml`.

## Package Contract

Each generated package includes:

- `itemId`
- `itemTitle`
- `readinessStatus`
- `blockedReasons`
- `dependencies`
- `branchName`
- `worktreePathSuggestion`
- `powershellCommands`
- `codexPrompt`
- `prBodyTemplate`
- `validationCommands`
- `mergeOrderNotes`
- `dataBoundaryNotes`
- `riskNotes`

The generated PR body template uses exactly the repository PR Contract headings and includes one valid risk line:

```markdown
- Risk: [low|medium|high]
```

The merge recommendation always defaults to:

```markdown
- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
```

High-risk, runtime, payment, auth, persistence, and source/corpus-sensitive work must not be marked as an auto-merge candidate without explicit human approval.

## Data Boundary

Generated artifacts must stay metadata-only:

- no learner answers;
- no OCR output;
- no official question or answer bodies;
- no source excerpts;
- no provider payloads;
- no billing records;
- no credentials or private user content.

The generated prompt also repeats the product non-goals: no first-round expansion, no unsupported exam scope, no official grading/model-answer/pass-probability/pass-guarantee claims, and no unrelated billing/auth/privacy changes.

## Failure Behavior

Invalid roadmap YAML fails closed with a line-numbered error. Unknown dependencies, duplicate IDs, invalid WIP limits, invalid risk values, and dependency cycles also fail before any artifact is written.

The command is intentionally source-level. Runtime evidence is not required for the planner itself, but downstream packages must follow their own risk classification and runtime evidence requirements.

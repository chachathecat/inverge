# AF012V Post-merge Factory Orchestrator Verification

Date: 2026-06-30
Branch verified from: latest `main` after PR #480 (`[AF012] Factory Orchestrator v1`) was merged
Verification type: local Windows PowerShell dogfood evidence
Risk: low

## Goal

Dogfood AF012 after merge and record that the Factory Orchestrator can inspect local `.agent-factory` metadata artifacts, recommend the next safe Agent Factory step, and append AF011 run history without executing commands, invoking Codex, mutating GitHub, creating branches or commits, rerunning workflows, or touching learner/runtime/provider/billing/auth/payment/instructor state.

This document is evidence-only. It does not introduce product behavior, workflow permissions, runtime changes, provider calls, or learner-facing UI.

## Environment

- Workspace: `C:\Users\jmg91\exam-coach-af012`
- Shell: Windows PowerShell
- Node execution: repository npm scripts via `npm.cmd`
- Generated local artifact directory: `.agent-factory/`

The usual Node loader warnings were observed:

- `ExperimentalWarning: --experimental-loader may be removed in the future`
- `[MODULE_TYPELESS_PACKAGE_JSON] Warning`

These warnings are non-blocking for the existing repository script pattern. This verification does not add `"type": "module"` to `package.json`.

## Step 0 — local Git state cleanup

A local merge attempt was aborted before verification continued:

```powershell
git merge --abort
git status --short
```

Result:

- `git status --short` returned no tracked changes.
- The local worktree was clean before runtime artifact generation continued.

## Step 1 — first AF012 orchestrator run

Command:

```powershell
npm.cmd run agent-factory:orchestrate -- --artifact-dir .agent-factory --stdout markdown
```

Observed result:

```text
# AF012 Factory Orchestrator

Status: planned
Next action: run_plan_only
Codex invoked: no
Commands executed: no
```

Interpretation:

- AF012 inspected the local `.agent-factory` directory.
- No task-package artifact was available yet.
- The orchestrator recommended the safe next step: run AF006/AF007 `plan_only`.
- AF012 did not execute the recommended command.
- AF012 did not invoke Codex.

## Step 2 — generated AF012 and AF011 artifacts

The first orchestrator run generated local artifacts:

```text
.agent-factory/agent-factory-orchestrator-summary.md
.agent-factory/factory-orchestrator-plan.json
.agent-factory/factory-orchestrator-plan.md
.agent-factory/run-history.jsonl
.agent-factory/run-history.md
```

Important: these generated `.agent-factory` artifacts are local runtime evidence and are not committed to Git.

## Step 3 — verified zero-execution flags

Command:

```powershell
Select-String -Path .agent-factory\factory-orchestrator-plan.json -Pattern '"reportOnly": true','"dryRun": true','"willExecuteCommands": false','"codexWillBeInvoked": false','"mutatesCode": false','"mutatesGitHub": false'
```

Observed flags:

```text
"reportOnly": true
"dryRun": true
"willExecuteCommands": false
"codexWillBeInvoked": false
"mutatesCode": false
"mutatesGitHub": false
```

Interpretation:

- AF012 remained report-only.
- AF012 remained dry-run.
- AF012 did not execute commands.
- AF012 did not invoke Codex.
- AF012 did not mutate code.
- AF012 did not mutate GitHub.

## Step 4 — verified AF011 run-history append

Command:

```powershell
type .agent-factory\run-history.md
```

Observed AF012 run-history record included:

```text
Source: agent-factory-orchestrator
Mode or intent: orchestrate
Status: success
Dry-run: true
Approval gate: not_required
Artifact count: 3
Blocked reason codes: none
Payload digests: factory_orchestrator_plan:<hash> (<count> chars)
```

The run-history summary also stated that no PR bodies, task-package text, comment bodies, learner answers, OCR text, provider payloads, credentials, billing/auth/payment records, or private user content are stored, and payload references are represented only by SHA-256 hashes and counts.

Interpretation:

- AF012 appended an AF011-compatible history record.
- The history record used metadata, artifact paths, hashes, and counts.
- No raw task-package text, raw PR body, raw comment, learner answer, OCR text, provider payload, billing/auth/payment data, token, secret, or private content was intentionally written.

## Step 5 — AF006 plan-only dogfood

Command:

```powershell
npm.cmd run agent-factory:run -- --mode plan_only --target auto --max-tasks 1 --stdout markdown --allow-mutation false
```

Observed result:

```text
# AF006 Agent Factory Run

Status: success
Mode: plan_only
Target: auto
Mutation: disabled (allow_mutation=false)
AF006 v1: read-only/report-only
AF007 live GitHub modes: read-only/report-only

## Result

AF001 planner task packages generated.
Selected task packages: S209.
```

Interpretation:

- AF006/AF007 generated the next local task package metadata artifact.
- The selected task package was `S209`.
- The run remained read-only/report-only.
- No GitHub mutation API, learner runtime, OCR, provider, billing, auth, production API, or Codex invocation was used by AF006.

## Step 6 — second AF012 orchestrator run

Command:

```powershell
npm.cmd run agent-factory:orchestrate -- --artifact-dir .agent-factory --stdout markdown
```

Observed result:

```text
# AF012 Factory Orchestrator

Status: planned
Next action: run_codex_invocation_dry_run
Codex invoked: no
Commands executed: no
```

Interpretation:

- AF012 detected that a task package artifact now existed.
- No AF010 invocation plan existed yet.
- AF012 recommended the next safe step: create an AF010 Codex invocation dry-run plan.
- AF012 still did not execute commands or invoke Codex.

## Step 7 — AF010 dry-run dogfood

Command:

```powershell
npm.cmd run agent-factory:codex-invocation -- --input .agent-factory/codex-task-packages.json --item-id S209 --stdout markdown
```

Observed result:

```text
# AF010 Codex Invocation Adapter

Status: planned
Dry-run: true
Codex invoked: no
Data boundary safe: yes
Violation count: 0

## Result

AF010 dry-run produced a metadata-safe Codex invocation plan; no Codex process will be started.
```

Interpretation:

- AF010 accepted the selected `S209` task package metadata as safe.
- AF010 produced a dry-run invocation plan.
- No Codex process was started.
- No source files, branches, commits, pushes, merges, rebases, workflow reruns, GitHub metadata, learner runtime, OCR, provider, billing, auth, production, instructor, or payment APIs were mutated.

## Step 8 — third AF012 orchestrator run

Command:

```powershell
npm.cmd run agent-factory:orchestrate -- --artifact-dir .agent-factory --stdout markdown
```

Observed result:

```text
# AF012 Factory Orchestrator

Status: planned
Next action: run_watch_live
Codex invoked: no
Commands executed: no
```

Interpretation:

- AF012 detected that both the task package artifact and AF010 dry-run plan artifact existed.
- The next safe recommended step became AF007 read-only live PR/CI inspection when a PR exists.
- No PR number was available in this dogfood run, so no `watch_live` command was executed.
- AF012 remained report-only and did not run the recommendation.

## Data boundary review

This verification intentionally commits only this Markdown evidence document. It does not commit generated `.agent-factory` artifacts.

Allowed evidence in this document:

- command names;
- status labels;
- selected action labels;
- artifact paths;
- high-level result summaries;
- zero-execution and zero-mutation flags;
- metadata-only run-history behavior.

Disallowed evidence in this document:

- raw task-package payloads;
- raw Codex prompt text;
- raw PR bodies;
- raw comments;
- learner answers;
- OCR text;
- provider payloads;
- billing/auth/payment data;
- secrets, tokens, cookies, service-role keys, private keys, or private user content.

## Verification conclusion

AF012V passed its post-merge dogfood goal.

The observed safe factory cycle was:

```text
AF012 orchestrate
→ recommends run_plan_only
→ AF006 plan_only creates task package S209
→ AF012 orchestrate
→ recommends run_codex_invocation_dry_run
→ AF010 dry-run creates metadata-safe invocation plan
→ AF012 orchestrate
→ recommends run_watch_live when a PR exists
```

At every AF012 step:

- Codex was not invoked.
- Recommended commands were not executed by AF012.
- GitHub was not mutated by AF012.
- Code, branches, commits, pushes, merges, rebases, workflow runs, learner runtime, OCR, provider, billing, auth, production, instructor, and payment APIs were not touched by AF012.
- AF011 run-history remained metadata-only.

## Next recommended factory work

AF012 is now verified as the report-only factory foreman.

The next factory milestone should be AF013, but it should start conservatively:

```text
AF013A — Approval-gated Codex execution request / isolated worktree boundary
```

AF013A should still default to dry-run and fail closed without an exact approval phrase. It should prepare execution request artifacts and isolated-worktree boundaries before enabling any real Codex execution, patch application, branch push, PR creation, or CI repair loop.

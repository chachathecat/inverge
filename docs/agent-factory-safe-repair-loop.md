# Agent Factory Safe Repair Loop

`npm run agent-factory:repair-plan` reads an AF002 CI Watcher report, or an equivalent PR/check snapshot, and emits a deterministic bounded repair plan plus a Codex-ready repair prompt.

This is AF004 development automation. It is read-only and metadata-only. It does not modify source files, push commits, open PRs, merge PRs, mark PRs ready, rerun workflows, call GitHub mutation APIs, invoke Codex, call learner runtime, call OCR, call providers, touch payment/auth/runtime state, or use secrets.

## Command

```powershell
npm.cmd run agent-factory:repair-plan
```

Default input:

- `.agent-factory/ci-watcher-report.json`
- fallback, when the default report is absent: `.agent-factory/pr-ci-snapshot.json`

Default artifacts:

- `.agent-factory/safe-repair-plan.json`
- `.agent-factory/safe-repair-plan.md`

Optional arguments:

```powershell
npm.cmd run agent-factory:repair-plan -- --input .agent-factory/ci-watcher-report.json --stdout json
npm.cmd run agent-factory:repair-plan -- --snapshot .agent-factory/pr-ci-snapshot.json --stdout prompt
npm.cmd run agent-factory:repair-plan -- --doctor .agent-factory/pr-contract-doctor-report.json
```

The script can also read stdin:

```powershell
Get-Content .agent-factory/ci-watcher-report.json | npm.cmd run agent-factory:repair-plan -- --stdin
```

## Report Contract

The JSON report includes:

- `repo`
- `prNumber`
- `repairDomain`
- `repairAllowed`
- `blockedReasons`
- `humanApprovalRequired`
- `scopeLimits`
- `filesLikelyRelevant`
- `filesForbidden`
- `repairPrompt`
- `validationCommands`
- `rollbackSteps`
- `markdownSummary`

`humanApprovalRequired` is always true in v1. `repairAllowed` only means the plan may describe a bounded follow-up repair prompt; AF004 itself still does not edit code or GitHub state.

## Repair Domains

AF004 selects one repair domain:

- `pr_body_repair`
- `typecheck_repair`
- `lint_repair`
- `focused_test_repair`
- `unit_test_repair`
- `build_repair`
- `closed_beta_readiness_repair`
- `learner_loop_repair`
- `rebase_required`
- `human_review_required`
- `blocked`

PR Contract failures route to AF003:

```powershell
npm.cmd run agent-factory:doctor-pr-body -- --body .agent-factory/pr-body.md --issue <issue-number>
```

Rebase, behind-main, diverged, and conflict states route to branch-update guidance, not source-code repair. Unknown, ambiguous, pending, transient, E2E, runtime-gate, and sensitive-label failures default to human review.

## Safety Rules

AF004 refuses automatic repair planning for high-risk paths or policy domains, including:

- auth, authorization, RLS, tenant, payment, billing, entitlement, provider, privacy, user-data, migration, production, public-launch, official-source, and source-rights risks;
- `.github/workflows/**`, `supabase/migrations/**`, auth/payment/billing/entitlement API paths, `middleware.ts`, `proxy.ts`, `vercel.json`, `next.config.*`, `config/paid-launch-readiness.json`, `reference_corpus/**`, and legal/source ingestion paths;
- blocking labels such as `blocked`, `do-not-merge`, and `human-decision`.

Generated prompts must preserve existing tests and validation gates. They must not ask Codex to weaken tests, lower quality/eval thresholds, bypass runtime evidence, or broaden product scope.

## Data Boundary

Generated artifacts must stay metadata-only:

- no learner answers;
- no OCR output;
- no official question or answer bodies;
- no source excerpts;
- no provider payloads;
- no billing records;
- no credentials or private user content.

The safety assertion rejects secret-looking and raw-content-looking output keys and secret-looking string values.

## Validation Order

AF004 puts focused validation first and then appends broader validation:

- typecheck repairs start with `npm.cmd run typecheck`;
- lint repairs start with `npm.cmd run lint`;
- focused test repairs start with the detected focused test command, or an explicit `--focused-test-command`;
- unit test repairs start with `npm.cmd run test -- --workers=1`;
- build repairs start with `npm.cmd run build`;
- learner-loop and closed-beta repairs start with their quality/readiness checks.

The standard broad validation tail is:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run verify:learner-loop:ci
npm.cmd run check:closed-beta-readiness
npm.cmd run build
git diff --check
git diff --cached --check
```

## Failure Behavior

Invalid JSON fails before artifacts are written. Inputs with missing, pending, or ambiguous workflow data generate a `human_review_required` plan unless AF002 has already supplied a more specific safe route. High-risk path hints produce `blocked` or human-review output instead of a Codex repair prompt.

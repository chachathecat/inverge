# Agent Factory PR Contract Doctor

`npm run agent-factory:doctor-pr-body` reads a draft PR body and emits a deterministic repair report plus a ready-to-paste PR body that follows the repository PR Contract.

This is AF003 development automation. It is source-level text transformation only. It does not update GitHub PRs, call GitHub mutation APIs, rerun workflows, mark PRs ready, merge PRs, invoke Codex, call learner runtime, call providers, touch payment/auth/runtime state, or use secrets.

## Command

```powershell
npm.cmd run agent-factory:doctor-pr-body -- --body .agent-factory/pr-body.md
```

Default artifacts:

- `.agent-factory/pr-contract-doctor-report.json`
- `.agent-factory/pr-contract-doctor-report.md`
- `.agent-factory/pr-body.repaired.md`

Optional arguments:

```powershell
npm.cmd run agent-factory:doctor-pr-body -- --body .agent-factory/pr-body.md --issue 455 --source-level-only --stdout body
```

The script can also read stdin:

```powershell
Get-Content .agent-factory/pr-body.md | npm.cmd run agent-factory:doctor-pr-body -- --stdin --issue 455
```

## Contract Rules

The repaired body uses these exact headings in this order:

```markdown
## Goal
## Non-goals
## Risk classification
## Data boundary
## Schema / API / environment changes
## Tests and evidence
## Runtime evidence
## Rollout and rollback
## Remaining risks
## Merge recommendation
```

The body must include exactly one issue-closing reference:

```markdown
Closes #<issue>
```

or:

```markdown
Fixes #<issue>
```

The body must include exactly one risk line:

```markdown
- Risk: [low|medium|high]
```

The merge recommendation section always contains all three checkboxes and exactly one checked item:

```markdown
- [ ] Auto-merge candidate
- [x] Human approval required
- [ ] Blocked
```

AF003 defaults missing merge recommendations to `Human approval required`. If the body or changed-file options contain runtime, payment, auth, database, security, provider, tenant, or user-data hints, the repaired body never checks `Auto-merge candidate`.

## Repairs

The doctor repairs common PR body mistakes deterministically:

- missing required headings;
- duplicate required headings;
- misnamed `Summary`, `Validation`, and `Notes` style sections;
- missing blank lines after headings;
- `Closes #123.` trailing punctuation;
- `[low]` or `Risk: low` risk shorthand;
- missing merge recommendation checkboxes;
- merge recommendation text written as plain text;
- duplicate checked merge recommendation boxes.

When no issue-closing reference exists, AF003 does not invent one unless `--issue <number>` is supplied. When risk is missing, AF003 defaults to medium, or to low only when `--source-level-only` is supplied and no sensitive hints are present.

## Report Contract

The JSON report includes:

- `validBefore`
- `validAfter`
- `issueReferenceStatus`
- `riskLineStatus`
- `headingFindings[]`
- `mergeRecommendationFindings[]`
- `repairActions[]`
- `remainingWarnings[]`
- `repairedBody`
- `markdownSummary`

The Markdown report mirrors the JSON report and embeds the repaired body for review.

## AF002 Handoff

AF002 classifies failed PR checks. When `failedDomains` includes `pr_contract_failure` and `recommendedNextActions` includes `fix_pr_contract`, the likely next operator action is:

```powershell
npm.cmd run agent-factory:doctor-pr-body -- --body .agent-factory/pr-body.md --issue <issue-number>
```

AF003 only produces local artifacts. The operator remains responsible for reviewing the repaired body, pasting it into GitHub, and rerunning or observing checks through normal review procedures.

## Data Boundary

Generated artifacts must stay metadata-only:

- no learner answers;
- no OCR output;
- no official question or answer bodies;
- no source excerpts;
- no provider payloads;
- no billing records;
- no credentials or private user content.

Secret-looking and raw-content-looking lines are redacted from repaired output with a warning. Redactions require manual review before pasting the repaired body.

## Failure Behavior

Invalid or incomplete Markdown fails safely. The command still emits a scaffolded repaired body and actionable warnings, but `validAfter` remains false when a required issue-closing reference is missing and no issue number is supplied.

The command is source-level. Runtime evidence is not required for the doctor itself, but repaired PR bodies must still accurately describe the target PR's runtime evidence requirements.

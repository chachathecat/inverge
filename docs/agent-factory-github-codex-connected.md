# AF017/AF018 GitHub-Codex Connected Factory

- Status: implementation contract
- AF017 linked issue: `#505`
- AF018 linked issue: `#507`
- Runtime impact: manual workflow only

This workflow connects Agent Factory output to Codex from GitHub Actions. AF017 stays read-only. AF018 adds one narrow, approval-gated path that can create a draft PR after Codex changes pass local gates.

## Operator Path

```text
GitHub -> Actions -> Agent Factory Codex Connected -> Run workflow
```

## Modes

### `package_issue`

Generates a read-only Agent Factory task package for the selected roadmap item and uploads generated `.agent-factory/` artifacts.

Inputs are intentionally separate:

- `target_issue`: the GitHub issue that a future PR body may close.
- `target_roadmap_item`: the roadmap item used to select the task package.

The package generator consumes `target_roadmap_item`; it does not infer the closing issue from the roadmap id.

### `codex_review_pr`

Runs `openai/codex-action@v1` against a PR merge ref in read-only mode and uploads the Codex report as an artifact.

This mode requires:

- `dry_run=false`;
- exact approval phrase: `I approve AF017 Codex connected run`;
- OpenAI API key configured as a repository secret;
- a PR number.

AF017 review mode does not create branches, commits, pushes, PRs, workflow reruns, merges, or rebases.

### `approved_draft_pr`

AF018 creates an approved write-capable draft PR path.

Dry-run behavior:

- `dry_run=true` writes only AF018 plan, PR body, and validation summary artifacts.
- Codex is not invoked.
- No branch, commit, push, PR, workflow, merge, or rebase action is attempted.

Approved behavior:

- `dry_run=false` requires exact approval phrase: `I approve AF018 draft PR creation`.
- The actor must be allowlisted.
- The workflow generates a package for `target_roadmap_item`.
- Codex runs with `sandbox: workspace-write`, `safety-strategy: drop-sudo`, `model: gpt-5.5`, and `effort: medium`.
- The workflow validates changed files against a path allowlist, forbidden paths, and max changed file count.
- Validation summary artifacts record command names and pass/fail state only, not logs.
- The workflow creates a branch, commits selected changed files, pushes, and opens a draft PR.
- The PR body contains exactly one closing reference for `target_issue`.
- The PR is draft only and is never merged automatically.

## AF018 Safety Boundary

Required gates:

- actor allowlist;
- exact approval phrase;
- dry-run first;
- path allowlist;
- forbidden-path checks;
- max changed file count;
- generated PR Contract body;
- exactly one issue closing reference;
- draft PR only;
- no auto-merge;
- rollback and cleanup instructions;
- validation summary artifact;
- Codex model and effort pinning.

AF018 does not run on fork PR events. It is `workflow_dispatch` only, checks out `main`, and uses write permissions only in the approved draft PR job.

The workflow does not grant workflow-write, actions-write, merge, rebase, update-branch, or workflow-rerun permissions.

## Path Boundary

AF018 allows only narrow source, docs, tests, script, package, and Codex prompt paths needed for Agent Factory work.

Forbidden paths include:

- `.github/workflows/`
- auth, billing, payment, provider, OCR adapter, instructor, academy, and production-data paths
- local official-material and raw-download paths
- Supabase and migration paths
- environment and secret-bearing paths

Any changed file outside the allowlist or inside a forbidden path fails closed before branch creation.

## PR Body Contract

AF018 generates the PR body from target metadata. It keeps these fields separate:

- target issue: used only for `Closes #<issue>`;
- roadmap item: used for package selection and metadata;
- task package item: validated against the roadmap item;
- generated branch, commit title, and PR title: operation metadata.

The generated body uses the repository PR Contract sections and defaults merge recommendation to human approval required.

## Data Boundary

Generated artifacts and PR bodies must remain metadata-only. They must not include raw learner answers, OCR text, problem or answer bodies, source excerpts, provider payloads, billing data, auth data, payment data, private user content, credentials, tokens, secrets, diffs, raw logs, raw prompts, raw Codex transcripts, or raw comments.

AF018 does not upload the Codex transcript. Validation summaries record command names and status only.

## Cost Note

AF018 can consume OpenAI Codex/API tokens only after `dry_run=false`, the exact AF018 approval phrase, and actor allowlist validation. Repeated failed approved runs may incur additional model cost.

## Rollback and Cleanup

If an AF018 generated draft PR is unacceptable:

- close the draft PR;
- delete the generated branch from `origin`;
- rerun in dry-run mode before attempting another approved run;
- revert a later human merge if the draft PR was subsequently merged outside AF018.

No AF018 path performs merge, rebase, workflow rerun, or ready-for-review transition.

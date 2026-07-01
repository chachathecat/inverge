# AF017 GitHub-Codex Connected Factory v1

- Status: implementation contract
- Linked issue: `#505`
- Runtime impact: none by default

AF017 adds a GitHub-native path for connecting Agent Factory output to Codex without requiring the operator to write long handoff prompts for every task.

## Operator path

```text
GitHub -> Actions -> Agent Factory Codex Connected -> Run workflow
```

## Modes

### `package_issue`

Generates a read-only Agent Factory task package for the selected roadmap item and uploads generated `.agent-factory/` artifacts.

Default target after S209 completion is `S210`.

### `codex_review_pr`

Runs `openai/codex-action@v1` against a PR merge ref in read-only mode and uploads the Codex report as an artifact.

This mode requires:

- `dry_run=false`;
- exact approval phrase: `I approve AF017 Codex connected run`;
- OpenAI API key configured as a repository secret;
- a PR number.

## Safety boundary

AF017 v1 does not create branches, commits, pushes, PRs, workflow reruns, merges, or rebases. It does not call learner-runtime or production mutation APIs.

The workflow uses read-only repository permissions. Codex review mode uses `sandbox: read-only` and the default Linux runner safety strategy that removes sudo.

## Data boundary

Generated artifacts and Codex reports must remain metadata-only. They must not include raw learner answers, OCR text, problem or answer bodies, provider payloads, billing data, auth data, private user content, credentials, or secret-like values.

## Future work

A later issue may add approval-gated draft PR creation. That future work must separately prove actor authorization, prompt sanitization, path allowlists, validation execution, rollback, and no unattended merge.

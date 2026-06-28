# Agent Factory Safe PR Metadata Gate

AF009 adds a separate manual workflow for approval-gated PR metadata actions.

Operator path:

```text
GitHub -> Actions -> Agent Factory Mutate -> Run workflow
```

## What AF009 Can Do

- Replace only the content inside `## Runtime evidence` in a PR body.
- Create or update one metadata-only Agent Factory summary comment.
- Mark a draft PR ready for review after explicit approval and guardrail checks.

## What AF009 Cannot Do

AF009 does not edit code, create branches, create commits, push, merge, rebase, rerun workflows, invoke Codex, call learner runtime, call OCR, call providers, mutate billing/auth/payment state, call production mutation APIs, or call instructor runtime APIs.

It is not a merge bot. It never merges a PR.

## Inputs

- `mutation_intent`: `update_pr_runtime_evidence`, `add_safe_pr_comment`, or `mark_ready_for_review`.
- `pr_number`: required positive PR number.
- `dry_run`: defaults to `true`; real metadata action requires `false`.
- `approval_phrase`: required for `dry_run=false`.
- `evidence_text`: metadata-only text for Runtime evidence or the safe summary comment.
- `evidence_source_path`: optional committed metadata-only text file path.
- `stdout`: `markdown`, `json`, or `none`.

Exact approval phrase:

```text
I approve AF009 safe metadata mutation
```

## Dry-run-first Process

1. Run with `dry_run=true`.
2. Review `.agent-factory/mutation-plan.md` and the job summary.
3. Confirm the plan is metadata-only and the intended action is narrow.
4. Rerun with `dry_run=false` and the exact approval phrase only when the plan is acceptable.

Dry-run writes a plan and summary but does not call mutation adapters.

## Runtime Evidence Procedure

For `update_pr_runtime_evidence`, AF009:

- fetches the live PR body in memory;
- verifies the PR Contract headings appear exactly once and in order;
- rejects missing or duplicate `## Runtime evidence`;
- rejects replacement text containing level-two headings;
- replaces only the content between `## Runtime evidence` and the next `## ` heading;
- preserves every other section exactly;
- writes only line counts, hashes, and status to artifacts.

The full PR body is not written to AF009 artifacts.

## Safe Comment Procedure

For `add_safe_pr_comment`, AF009:

- wraps operator text in a fixed metadata-only comment shell;
- uses the stable marker `<!-- agent-factory:af009-safe-comment -->`;
- updates the existing marker comment when exactly one exists;
- creates a marker comment when none exists;
- fails closed when multiple marker comments exist.

## Ready-for-review Procedure

For `mark_ready_for_review`, AF009 requires:

- `dry_run=false`;
- the exact approval phrase;
- a valid positive PR number;
- the PR is still draft, or it returns an already-ready no-op;
- valid PR Contract headings;
- meaningful Runtime evidence;
- Merge recommendation is not `Blocked`;
- check metadata is present and safely acceptable.

AF009 never merges, rebases, pushes, or reruns workflows.

## Data Boundary

Allowed payloads are metadata-only.

AF009 rejects payloads that look like:

- raw learner content;
- learner answer text;
- OCR text;
- problem, question, or answer bodies;
- official answer bodies;
- source excerpts;
- provider payloads;
- billing data;
- private user content;
- credentials;
- secret-like, token-like, API-key-like, or private-key-like values.

## Artifacts

AF009 writes:

- `.agent-factory/mutation-plan.json`
- `.agent-factory/mutation-plan.md`
- `.agent-factory/mutation-result.json` when an action is attempted
- `.agent-factory/agent-factory-mutation-summary.md`

Artifacts are metadata-only and omit raw PR body/comment payloads.

## Rollback and Manual Correction

- Runtime evidence update: use PR body history or a manual PR body edit to restore the prior Runtime evidence text.
- Metadata comment create/update: delete or manually edit the marker comment.
- Ready-for-review: GitHub does not provide a normal ready-to-draft rollback through AF009; manually convert the PR back to draft if the repository permits it.

AF009 records enough metadata in the plan/result artifacts to identify what was attempted without storing raw sensitive payloads.

## AF006 and AF007 Boundary

AF006/AF007 remain in `.github/workflows/agent-factory-run.yml` and continue to require `allow_mutation=false`.

AF009 lives in `.github/workflows/agent-factory-mutate.yml`. It is the only Agent Factory workflow with PR/comment write permissions, and it is limited to the three allowed metadata intents above.

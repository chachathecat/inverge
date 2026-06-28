# AF009 Post-merge Runtime Verification

Status: post-merge dogfood verification note.

This note was refreshed after the PR body was expanded to the full PR Contract, so GitHub Actions can validate the current contract state on a new commit.

## Goal

Verify that the real main-branch AF009 Agent Factory Mutate workflow can be used on an open pull request after PR #472 merged AF009 into `main`.

This document intentionally creates a tiny metadata-only PR so AF009 can dogfood its own guardrails on a low-risk change before the factory proceeds to AF010.

## Scope

The verification covers these manual `workflow_dispatch` runs:

1. Agent Factory Run `watch_live` against this PR.
2. Agent Factory Mutate `update_pr_runtime_evidence` with `dry_run=true`.
3. Agent Factory Mutate `update_pr_runtime_evidence` with `dry_run=false` after the exact approval phrase.
4. Agent Factory Mutate `add_safe_pr_comment` with `dry_run=false` after the exact approval phrase.
5. Agent Factory Mutate `mark_ready_for_review` with `dry_run=false` after the exact approval phrase and acceptable checks.

## Non-goals

- Do not change AF009 implementation.
- Do not change AF006 or AF007 behavior.
- Do not add workflow permissions.
- Do not add app or learner-facing product behavior.
- Do not call learner runtime, OCR, provider, billing, auth, production, instructor, or payment mutation APIs.
- Do not create commits, push branches, merge, rebase, rerun workflows, or invoke Codex from AF009.

## Data boundary

Metadata-only. Verification text must not include raw learner content, OCR text, problem or answer bodies, official answer bodies, source excerpts, provider payloads, billing data, private user content, credentials, secret-looking values, token-looking values, API-key-looking values, or private-key markers.

## Expected evidence

The PR Runtime evidence section should be updated by AF009, not by manual editing, after dry-run evidence passes.

Expected evidence entries:

- `watch_live` completed with `allow_mutation=false`.
- AF009 dry-run completed with no mutation attempted.
- AF009 Runtime evidence update completed with `dry_run=false` after exact approval.
- AF009 safe metadata comment create/update completed with `dry_run=false` after exact approval.
- AF009 ready-for-review transition completed or failed closed with an explicit safe reason.

## Guardrails to confirm

- Runtime evidence update changes only the `## Runtime evidence` section.
- Safe comment is metadata-only and uses the stable AF009 marker.
- Ready-for-review never merges, rebases, pushes, commits, or reruns workflows.
- Artifacts omit raw PR body and raw comment payloads.
- Failure modes are fail-closed and explain the required human action.

## Rollback

Revert this docs-only PR if the verification note is no longer useful. Any AF009 metadata mutation can be manually corrected through normal GitHub PR body or comment history.

# Account-backed Review Completion Setup Runbook v1

## Purpose

This runbook defines the safe setup path for proving account-backed Review Queue completion under an invited learner account.

Purpose:

- Close the account-backed Review completion partial from #382.
- Prove a durable learner-owned Review Queue item can be completed and stay completed after refresh.
- Preserve **Conditional Go until account-backed Review completion proof is executed**.

This is a docs/tests runbook. It must not add credentials, secrets, runtime product behavior, persistence architecture changes, production data access, provider calls, raw uploads, screenshots, OCR full text, raw learner content, or official material.

## Preconditions

Before running account-backed Review completion proof:

- Approved non-production durable target is ready.
- Learner-only invited beta account exists.
- No instructor/admin account is used.
- No production data is used.
- No Q-Net/raw official material is used.
- No raw learner text is committed.
- Support and stop-rule process from closed beta docs is available.
- Durable persistence copy has been checked so local fallback is not mislabeled as account-backed durable save.
- Account isolation can be checked with at least two learner-only aliases.

If any precondition is unavailable, mark proof partial or blocked and preserve Conditional Go.

## Safe Data Requirements

Use only metadata-safe learner-owned data:

- Use only synthetic learner-owned study note.
- Use no official problem text.
- Use no official answer text.
- Commit no OCR full text.
- Commit no screenshots.
- Commit no raw upload.
- Evidence must be metadata-only.
- Use aliases instead of real personal data.
- Use route names, state labels, booleans, persistence states, and short summaries.

Do not paste raw learner OCR text, raw learner answer text, raw learner problem text, raw official text, official answer text, screenshots, uploads, or local file paths into the repo.

## Setup Scenarios

| ID | Scenario | Expected evidence |
| --- | --- | --- |
| A | invited learner signs in. | Learner-only account session is identified without exposing credentials. |
| B | learner creates or has a durable_saved capture note. | Capture note is associated with invited learner account and `durable_saved`. |
| C | note produces or maps to a Review Queue item. | Review candidate is learner-owned and metadata-only. |
| D | Review Queue item appears under learner account. | Item is visible only for that account. |
| E | Review item shows due/reason copy. | Due/reason copy is learner-owned and action-oriented. |
| F | learner completes Review action. | Completion action is available and can be triggered. |
| G | completion state is visible. | Item visibly changes to completed, done, or equivalent learner-owned state. |
| H | completed item no longer behaves like an unstarted primary item. | Item is not presented as the same unstarted primary action. |
| I | refresh preserves completion state if durable path supports it. | Refresh keeps completion state or marks unsupported durable proof partial. |
| J | provider-free telemetry records review_completed. | `review_completed` is metadata-only and provider-free. |
| K | Account A cannot see Account B review item. | Account isolation is preserved. |
| L | save_failed item does not appear as ready Review Queue evidence. | Failed save is excluded from ready queue proof. |
| M | learner does not see instructor/admin console. | Learner routes do not expose instructor/admin surfaces. |
| N | no official grading/model-answer/score/pass-fail appears. | Completion copy avoids official judgment claims. |

## Evidence Table Fields

Use this table for each setup/proof run:

- scenario
- status: pass / partial / blocked / not_applicable
- route
- account alias
- account mode
- persistence status: `durable_saved` / `local_fallback_saved` / `save_failed` / `not_applicable`
- review item state
- telemetry status
- evidence summary
- follow-up needed

Evidence summaries must stay metadata-only. Do not include raw learner text, raw official text, screenshots, uploads, OCR full text, credentials, secrets, or local paths.

## Completion Rules

- `durable_saved` review completion can count as account-backed Review completion evidence.
- `local_fallback_saved` can count as local beta evidence only.
- `save_failed` cannot count as Review completion evidence.
- Completed item must not be shown as the same unstarted primary action.
- Completion copy must not imply score/pass/fail or official grading.
- Completion must remain learner-owned and action-oriented.
- Review completion must not expose instructor/admin console or instructor-only behavior to learners.
- Provider-free telemetry may record `review_completed` only as metadata.

## Stop Rules

Stop or mark blocked if:

- learner sees official grading/model-answer/score/pass-fail.
- learner sees instructor/admin console.
- Account A sees Account B review item.
- `save_failed` appears as ready Review Queue evidence.
- persistence copy overclaims durable save.
- raw official text, raw learner text, screenshot, upload, or OCR full text is committed.
- credentials or secrets are exposed.
- production data is used for proof.
- Q-Net raw official material or local official material is required for proof.

If a stop rule occurs, preserve Conditional Go and document a follow-up PR before any wider beta expansion.

## Follow-up Implementation Criteria

If account-backed Review completion cannot be executed, document whether the blocker is:

- missing durable target
- missing learner-only invited account
- missing durable Review Queue item creation
- missing completion UI
- missing refresh persistence
- missing telemetry reflection
- account isolation issue

The follow-up PR must keep learner-owned boundaries, avoid raw data, avoid provider calls, and avoid official grading/model-answer/score/pass-fail copy.

## Evidence Report Template

- date:
- tester:
- target label:
- account alias:
- route:
- capture/note source:
- Review Queue item id or safe alias:
- before completion state:
- after completion state:
- refresh result:
- telemetry result:
- account isolation result:
- final status: pass / partial / blocked
- follow-up PR:

Evidence report rules:

- Use aliases and state labels.
- Keep route and telemetry evidence metadata-only.
- If proof remains unavailable, preserve Conditional Go and identify the exact blocker.
- Do not include raw learner text, raw learner OCR text, raw learner answer text, raw learner problem text, raw official text, screenshots, uploads, OCR full text, credentials, secrets, or local paths.

## Safety Boundaries

Every setup run and report must preserve:

- no credentials committed
- no secrets committed
- no `.env` committed
- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw official text
- no raw learner text
- no OCR full text
- no screenshots committed
- no raw uploads committed
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no payment
- no analytics provider calls
- no AI provider calls
- no runtime behavior changes
- no production data access
- no instructor grading behavior changes

## Validation

Before opening or updating the PR, run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```

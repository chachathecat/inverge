# WCV-C3 durable learning and daily-command validation

This packet validates the single complete, default-off, Owner-only and non-Production WCV-C3 vertical jointly allocated to Issues #706, #707 and #708.

The candidate represents completion only after its exact-head protected merge
and validated receipt. That receipt completes Issue #714 allocation C3 while
preserving C4/C6. It selects no successor product stage: ULC-M1 remains
blocked on S241A. Queued S236B remains report-only and cannot start from
nonqualifying Draft PR #660.

## Acceptance boundary

- A terminal verified C2 Practice, Theory or Law session is the only D0 source.
- The D0 configuration and source record version are frozen before C3 evidence begins.
- The server persists the rights-checked assignment and trusted start time before releasing each prompt.
- Released prompts contain only the problem scenario. The attempt projection separately exposes the non-answer problem/source context needed to answer: trusted Practice operands, the Theory target scope plus unmarked semantic choices, and the exact Law source/version/anchor/locator/effective-window/applicable-date/blocker evidence. It never identifies the expected Theory choice or expected subject judgment.
- The learner request contains answer fields only. The server binds the active attempt's trusted anchor, scope, operands and Law source identities after parsing an exact closed response; client-supplied context fields are rejected. The browser journey uses the rendered learner controls and does not import or inject the server-side expected fixture.
- D+1, D+7, timed and later-recurrence evidence use separate eligible item families and separate changed typed commitments. D+7, timed and recurrence evidence must be unseen before commit; a commitment from another stage fails.
- A failed D+7, timed or later-recurrence attempt consumes that synthetic variant. The next attempt deterministically receives a new rights-safe synthetic item, family, prompt and typed commitment; a consumed item can never strand the case or become unseen again.
- Free text, generic token presence, an omitted Boolean, or an omitted zero-valued answer field never creates proof. Every learner-controlled answer field must be explicitly supplied, server-bound to the active context and pass the complete typed commitment.
- `CURRENTLY_CLEAR` is reopenable, not permanent mastery. A later qualifying independent failure produces `REOPENED`.
- A successful untimed follow-up is recorded as `RECURRENCE_RECONFIRMED`, never as timed evidence.
- Private answer bodies remain in the private artifact table. Projection events contain `containsBody: false` and no answer body.
- Every terminal D1, D7, timed, or recurrence submission atomically records a closed latest review outcome plus bodyless safe learning-gap and concept-state evidence signals. These signals are evidence contributions only and cannot create verified, mastery, currently-clear, readiness, or score effects.
- Every non-success terminal submission records exactly one learner-private, source-bound `s216.error_notebook_gap_taxonomy.v1` failure note with why-wrong, correct-principle, immediate-fix, recurrence, and next-review fields. Success records no failure note.
- The pre-existing S216 builder depends on the older S206/released-review contract, while the S217 graph mutates through a separate RPC; neither can join the WCV-C3 transition atomically. WCV-C3 therefore owns the smallest closed compatible note/signal projections, preserves their semantic versions, and explicitly leaves canonical S217 concept state unchanged rather than creating a second weakness, graph, or mastery authority.
- The review outcome binds the exact source session and confirmed revision, source primary gap, case and review-time record version, user, subject, attempt, private artifact, stage, item/revision/family, evidence event, proof anchor, policy, validator, contract, fixture, and source versions.
- Review feedback is separate from planner status. Plan proposal, accept, edit, reject, automatic eligibility refresh, reload, export, and process/browser restore cannot replace the latest review outcome, failure note, biggest gap, or next action.
- Artifact, evidence event, case transition, recurring signature, review outcome, two safe signals, and any required failure note share the existing fail-closed `wcv_c3_apply_transition_v1` transaction. A missing or mismatched downstream output aborts the whole transition; command receipts and CAS prevent replay and duplicate-tab duplication.
- Today/Full-Day accepts 30–720 available minutes, preserves fixed commitments, emits at most three CoreOutcomes, supports minimum maintenance, and records accept/edit/reject without changing mastery. `EDITED` atomically rebuilds from the learner-visible availability, recovery mode and fixed commitments before recording the decision.

## Migration recovery boundary

- The closed donor's two exact-head runs reported only a generic migration-apply/start failure because both runtime producers discarded the underlying PostgreSQL diagnostics. They did not establish a filename, statement, function, or SQLSTATE.
- Static PostgreSQL precedence analysis identified eight JSONB extraction-then-delete expressions inside `public.wcv_c3_apply_transition_v1`. Each extraction is explicitly parenthesized before the JSONB `- text[]` operator so PostgreSQL never attempts to subtract a text array from the field-name literal.
- The dedicated exact-head lane copies the complete current local migration history, starts and resets it once, removes the bounded local Supabase volume, recreates the workdir, then starts and resets the complete history again on a new volume. It finally replays the target migration against the surviving fresh local database.
- Any migration failure emits only `migrationFilename`, `statementIdentifier`, `sqlstate`, `errorClass`, and a closed bounded message. Raw SQL, stack output, synthetic private bodies, credentials, tokens, and repository secrets are never included.
- Runtime proof must also show that a failed output transition leaves the case state, version, state data, recurring signature, timestamp, artifacts, events, command receipts, and deletion receipts unchanged.

## Required automated evidence

Run with `npm.cmd` on Windows:

```text
npm.cmd run test -- tests/wcv-c3-durable-learning-contract.test.mjs tests/wcv-c3-durable-learning-authority.test.mjs
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
git diff --check
```

The exact-head remote acceptance lane must additionally prove both complete-history fresh migration cycles and target-migration replay, then exercise 390, 768 and 1440 pixel journeys for all three subjects, cross-user denial, restart restoration, export/delete, a later-failure reopen, preservation of failed-review feedback across plan proposal/decisions, an actual automatic eligibility-boundary crossing, and a second browser, required output source bindings, and deterministic plan fixtures without remote Supabase or repository secrets.
The serial three-subject browser journey remains bounded to ten minutes per Playwright test. A failed journey emits only a redacted bounded diagnostic tail; generated learner-body text, synthetic credentials and tokens are removed before GitHub logging.

## Activation and rollback

`WCV_C3_DURABLE_LEARNING_ENABLED` is false by default and requires the authenticated email in both `ALPHA_ADMIN_EMAILS` and `WCV_C3_OWNER_EMAILS`. The access gate independently denies `VERCEL_ENV=production` and non-Vercel `NODE_ENV=production`, so a flag or allowlist mistake cannot activate WCV-C3 in Production. `WCV_C3_SYNTHETIC_RUNTIME` is honored only with `CI=true` and never when `VERCEL_ENV=production`. No remote migration application, Production activation, real learner, provider, payment or destructive rollback is authorized. Disable the C3 flag for forward-only rollback; WCV-C2 remains intact.

Human source-change authority for this non-Production migration is the complete-runtime-vertical rule in `docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md` together with the dependency-ready continuation authority in `docs/decisions/2026-08-16-owner-github-native-delivery-control.md`. The latter keeps Production migration, RLS or Storage application behind an explicit Owner stop gate. This PR creates source only and performs no remote or Production apply.

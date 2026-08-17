# WCV-C3 durable learning and daily-command validation

This packet validates the single complete, default-off, Owner-only and non-Production WCV-C3 vertical jointly allocated to Issues #706, #707 and #708.

The candidate represents completion only after its exact-head protected merge
and validated receipt. That receipt completes Issue #714 allocation C3 while
preserving C4/C6. It selects no successor: ULC-M1 remains blocked on S241A.

## Acceptance boundary

- A terminal verified C2 Practice, Theory or Law session is the only D0 source.
- The D0 configuration and source record version are frozen before C3 evidence begins.
- The server persists the rights-checked assignment and trusted start time before releasing each prompt.
- D+1, D+7, timed and later-recurrence evidence use separate eligible item families and separate changed typed commitments. D+7, timed and recurrence evidence must be unseen before commit; a commitment from another stage fails.
- A failed D+7, timed or later-recurrence attempt consumes that synthetic variant. The next attempt deterministically receives a new rights-safe synthetic item, family, prompt and typed commitment; a consumed item can never strand the case or become unseen again.
- Free text, generic token presence, an omitted Boolean, or an omitted zero-valued field never creates proof. Every exact subject commitment field must be explicitly supplied and pass.
- `CURRENTLY_CLEAR` is reopenable, not permanent mastery. A later qualifying independent failure produces `REOPENED`.
- A successful untimed follow-up is recorded as `RECURRENCE_RECONFIRMED`, never as timed evidence.
- Private answer bodies remain in the private artifact table. Projection events contain `containsBody: false` and no answer body.
- Today/Full-Day accepts 30–720 available minutes, preserves fixed commitments, emits at most three CoreOutcomes, supports minimum maintenance, and records accept/edit/reject without changing mastery. `EDITED` atomically rebuilds from the learner-visible availability, recovery mode and fixed commitments before recording the decision.

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

The exact-head remote acceptance lane must additionally exercise 390, 768 and 1440 pixel journeys for all three subjects, cross-user denial, restart restoration, export/delete, a later-failure reopen, and deterministic plan fixtures without remote Supabase or repository secrets.

## Activation and rollback

`WCV_C3_DURABLE_LEARNING_ENABLED` is false by default and requires the authenticated email in both `ALPHA_ADMIN_EMAILS` and `WCV_C3_OWNER_EMAILS`. The access gate independently denies `VERCEL_ENV=production` and non-Vercel `NODE_ENV=production`, so a flag or allowlist mistake cannot activate WCV-C3 in Production. `WCV_C3_SYNTHETIC_RUNTIME` is honored only with `CI=true` and never when `VERCEL_ENV=production`. No remote migration application, Production activation, real learner, provider, payment or destructive rollback is authorized. Disable the C3 flag for forward-only rollback; WCV-C2 remains intact.

Human source-change authority for this non-Production migration is the complete-runtime-vertical rule in `docs/decisions/2026-08-11-owner-accelerated-vertical-slice-authority-roadmap-reconciliation.md` together with the dependency-ready continuation authority in `docs/decisions/2026-08-16-owner-github-native-delivery-control.md`. The latter keeps Production migration, RLS or Storage application behind an explicit Owner stop gate. This PR creates source only and performs no remote or Production apply.

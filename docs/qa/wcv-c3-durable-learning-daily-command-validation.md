# WCV-C3 durable learning and daily-command validation

This packet validates the single complete, default-off, Owner-only and non-Production WCV-C3 vertical jointly allocated to Issues #706, #707 and #708.

The candidate represents completion only after its exact-head protected merge
and validated receipt. That receipt completes Issue #714 allocation C3 while
preserving C4/C6. It selects no successor: ULC-M1 remains blocked on S241A.

## Acceptance boundary

- A terminal verified C2 Practice, Theory or Law session is the only D0 source.
- The D0 configuration and source record version are frozen before C3 evidence begins.
- The server persists the rights-checked assignment and trusted start time before releasing each prompt.
- D+1, D+7 and timed evidence use separate eligible item families. D+7 and timed evidence must be unseen before commit.
- Free text and generic token presence never create proof. The exact subject commitment must pass.
- `CURRENTLY_CLEAR` is reopenable, not permanent mastery. A later qualifying independent failure produces `REOPENED`.
- Private answer bodies remain in the private artifact table. Projection events contain `containsBody: false` and no answer body.
- Today/Full-Day accepts 30–720 available minutes, preserves fixed commitments, emits at most three CoreOutcomes, supports minimum maintenance, and records accept/edit/reject without changing mastery.

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

`WCV_C3_DURABLE_LEARNING_ENABLED` is false by default and requires the authenticated email in both `ALPHA_ADMIN_EMAILS` and `WCV_C3_OWNER_EMAILS`. `WCV_C3_SYNTHETIC_RUNTIME` is honored only with `CI=true` and never when `VERCEL_ENV=production`. No remote migration application, Production activation, real learner, provider, payment or destructive rollback is authorized. Disable the C3 flag for forward-only rollback; WCV-C2 remains intact.

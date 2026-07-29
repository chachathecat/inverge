# Owner Decision — Fast Owner Preview

- Decision date: 2026-07-29 KST
- Decision recorded at: `2026-07-29T18:08:54+09:00`
- Decision owner: repository owner
- Base commit: `a49b51acef38a9901789b9e2037c5cbbb31605fe`
- Base tree: `59aa044b3975165e3e612bd9e1d2bb128cd3b7bb`
- Linked issue: `#671`
- Dedicated branch: `agent/fast-owner-preview`
- Deployment target: Vercel Preview only
- Merge status: not authorized

## Decision

The Owner explicitly authorized:

> FAST OWNER PREVIEW 승인 — 나만 사용하는 Preview를 먼저 열고, 외부
> 사용자·결제·Production은 OFF로 유지하며 O4V/v7 정식 승인은 별도로 진행.

This decision authorizes one temporary Owner-only Preview of the already
implemented Owner Alpha universal-practice loop. It permits the dedicated
branch above to enable that loop only when both of these provider facts are
exact:

1. `VERCEL_ENV=preview`; and
2. `VERCEL_GIT_COMMIT_REF=agent/fast-owner-preview`.

The existing application gate remains mandatory after the deployment gate:
the request must have an authenticated Supabase user and that user's exact
email must be in `ALPHA_ADMIN_EMAILS`. Access failures remain masked as `404`.
The Preview URL must also be covered by Vercel deployment protection before it
is handed to the Owner.

## Allowed scope

- deploy the dedicated branch to Vercel Preview;
- sign in with the Owner's existing account;
- use the hidden Owner Alpha entry point;
- run the existing capture, confirmation, independent-attempt, assistance,
  rewrite/recalculation, D+1, Queue, Today, and Records flow;
- persist only the Owner's rows through the existing authenticated RLS path;
- send Owner-selected practice input to the already configured Preview AI
  provider for the existing assistance step; and
- collect bounded operational evidence needed to fix this Preview.

## Mandatory safe state

- external user onboarding is off: the Preview rejects the sign-up mutation;
- payment is off: the Preview rejects checkout creation and subscription
  mutation before request parsing, authentication, provider, repository, or
  event writes;
- Production deployment, alias, environment variables, flags, and data are
  unchanged;
- no public or share URL bypass is created;
- no database schema, migration, RLS, policy, storage, function, or secret is
  created or changed;
- no real learner account or content is used;
- no PR is merged and auto-merge remains disabled; and
- PR #660 and every O4V/S236P/S236A artifact remain unchanged.

## Data and assurance boundary

This fast Preview reuses the current Supabase project and its per-user RLS
tables. Owner problem, attempt, rewrite, queue, action-seed, and usage data may
be stored there. Inputs used for AI assistance may be sent to the configured
Preview model provider under the current provider behavior.

This is not the dedicated Owner-private plane required by O4V. It establishes
no O4V binding, S236P receipt, S236A start, O4A activation, v7 acceptance,
retention proof, key-management proof, independent attestation, efficacy
claim, commercial readiness, or Production readiness.

## Validation and stop gates

The Preview may be handed to the Owner only after all of the following are
observed on the exact branch head:

- source CI and the dedicated `FAST OWNER PREVIEW Runtime` acceptance are
  successful;
- GitHub reports an exact-head Vercel Preview deployment;
- an unauthenticated request is blocked by Vercel deployment protection;
- `/api/runtime/version` reports the exact deployment SHA through an authorized
  verification path;
- `ALPHA_ADMIN_EMAILS` contains exactly one non-empty Preview entry without
  exposing that value;
- the Owner Alpha page/API still fail closed without valid Owner auth;
- sign-up, checkout, and subscription POST paths return `404` in the Preview;
- the Owner's existing profile is invited or active; and
- the seven Owner Alpha persistence tables and exact per-user RLS remain live.

If any condition is unobservable or false, do not call the Preview open.

Automation does not enter or retain the Owner's credentials. The positive
Owner session begins only when the Owner uses the verified login handoff; a
failed allowlist match remains a masked `404` and stops first use.

The repository-wide `Runtime Gate` intentionally remains fail-closed because
its only closed adapter is the S233A migration adapter; it cannot consume this
auth-sensitive Preview evidence. That red gate keeps this Draft PR
non-mergeable. It must not be weakened, bypassed, or reinterpreted as O4V
evidence.

## Rollback

Close the draft PR and remove the dedicated branch deployment. If immediate
code rollback is needed, remove the exact-branch activation path and the three
deny guards in one focused revert. No schema or data rollback is required for
the activation itself. Existing Owner-created study rows are not silently
deleted; any later deletion requires a separate explicit data-deletion
decision.

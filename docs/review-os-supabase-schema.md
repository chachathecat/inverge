# Review OS Supabase schema contract

## Table ownership

`public.profiles` is the account-level profile table. Review OS stores closed-alpha access and billing-plan-like state here:

- `invite_status`
- `entitlement_tier`

`public.study_profiles` is the Review OS study-preference table. It stores exam setup only:

- `exam_name`
- `exam_date`
- `preferred_subjects`

Do not move `invite_status` or `entitlement_tier` to `study_profiles`. `ReviewOsRepository.ensureAccess()` must be able to decide access before a user has completed Review OS onboarding, so the fields belong on the always-created account profile row.

## Required migrations

Apply migrations in lexical order:

1. `supabase/migrations/20260422_inverge_service_core.sql`
2. `supabase/migrations/20260423_inverge_service_role_grants.sql`
3. `supabase/migrations/20260424_review_os_alpha.sql`
4. `supabase/migrations/20260424_review_os_profile_access_columns.sql`

The final migration is intentionally idempotent. It repairs environments where Review OS code was deployed before the profile access columns reached the connected Supabase project, and it sends a PostgREST schema reload notification.

## Manual SQL repair

If production is already failing with a PostgREST missing-column error, run this in the Supabase SQL Editor:

```sql
alter table public.profiles
  add column if not exists invite_status text not null default 'pending';

alter table public.profiles
  add column if not exists entitlement_tier text not null default 'free_trial';

notify pgrst, 'reload schema';
```

If `/rest/v1/study_profiles` is also missing, the full `20260424_review_os_alpha.sql` migration was not applied. Apply the full migration, then run:

```sql
notify pgrst, 'reload schema';
```

Supabase's troubleshooting docs recommend refreshing PostgREST schema cache with `NOTIFY pgrst, 'reload schema';` from SQL Editor. If errors persist after a successful migration and notify, also run:

```sql
select pg_notification_queue_usage();
```

## Local and remote apply paths

Local Supabase CLI:

```bash
supabase db reset
```

or, for a linked project:

```bash
supabase db push
```

Remote Supabase Dashboard:

1. Open SQL Editor for the target project.
2. Run unapplied migration files in lexical order.
3. Run `notify pgrst, 'reload schema';`.
4. Verify with `npm run verify:review-os-schema`.

This repository currently has a `supabase.exe` on PATH that is not executable on this OS, so remote application from this workspace must be done through SQL Editor or a working Supabase CLI installation.

## Verification

Run:

```bash
npm run verify:review-os-schema
```

Expected result:

- `profiles` accepts `select=user_id,email,invite_status,entitlement_tier`
- `study_profiles` accepts `select=user_id,exam_name`

Failure meanings:

- `PGRST204` or `42703` for `profiles.invite_status`/`profiles.entitlement_tier`: profile access columns are missing or PostgREST cache is stale.
- `PGRST205` for `study_profiles`: `20260424_review_os_alpha.sql` was not applied or PostgREST cache is stale.

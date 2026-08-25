# C3R-T migration recovery instructions

These instructions apply to the exact forward-only migrations below and do not authorize applying either migration:

- `supabase/migrations/20260825054823_c3r_t_theory_durable_learning_delta.sql`
- `supabase/migrations/20260825055252_c3r_t_theory_common_substrate_integration.sql`

The current remote Supabase and Production mutation count is zero. Keep `WCV_C3R_T_THEORY_ENABLED=false`; public, payment, and external-learner activation remain off. Never edit, replay, or replace either historical migration in place.

## Recovery decision

1. **Neither migration applied.** Stop. Leave both pending and preserve the default-off boundary.
2. **Only the enum migration applied.** Stop before the integration migration. PostgreSQL cannot remove the `THEORY` label safely through this delivery. Leave the inert label in `public.c3r_p_subject`; do not edit or replay migration history. Keep the feature off while deciding whether to resume through a newly authorized deployment.
3. **Integration migration partially or fully applied.** Halt the rollout and keep the feature off. Capture migration logs and the read-only catalog evidence below without secrets or learner-private data. Do not retry the historical file.

There are only two recovery routes:

- Restore a verified pre-apply database backup only under a separate, explicit remote/Production and destructive-recovery Owner gate.
- Otherwise, after an exact catalog diff and separate Owner migration authority, create a **new forward-only repair migration** that restores the approved constraints, functions, argument names, policies, and grants. Validate that new migration through two disposable PostgreSQL 15.8 reset/replay cycles before any separately authorized remote operation.

This runbook authorizes no destructive SQL, linked Supabase command, remote schema/history repair, or Production operation.

## Read-only evidence

Capture these catalog checks before choosing a recovery route:

```sql
select e.enumlabel, e.enumsortorder
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typnamespace = 'public'::regnamespace
  and t.typname = 'c3r_p_subject'
order by e.enumsortorder;

select c.conname, c.conrelid::regclass as relation, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
where c.connamespace = 'public'::regnamespace
  and (c.conname like 'c3r_%subject%' or c.conname like 'c3r_%evidence_ref%')
order by c.conrelid::regclass::text, c.conname;

select p.proname, p.proargnames, pg_get_function_identity_arguments(p.oid) as identity_arguments,
       p.proacl
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and (p.proname like 'c3r_t_%' or p.proname like 'c3r_p_%')
order by p.proname, identity_arguments;

select c.relname, c.relrowsecurity, c.relforcerowsecurity, c.relacl
from pg_class c
where c.relnamespace = 'public'::regnamespace
  and c.relname like 'c3r_p_%'
order by c.relname;
```

The evidence must show the expected `PRACTICE`/`THEORY` enum labels, exact closed Practice/Theory constraints, forced RLS, service-only mutation grants, revoked public execution, and unchanged `c3r_t_*` and Practice-wrapper `proargnames`. In an isolated local database, also run the existing Practice and Theory owner/isolation, restore/export/delete, cleanup, and default-off checks. Use PostgreSQL 15.8 and the full repository migration history twice; use no linked or remote Supabase project.

Stop and return to the Owner if a backup restore, remote/Production action, destructive recovery, security weakening, migration-authority expansion, catalog ambiguity, private-data exposure, or any change to the accepted Practice/Theory contract would be required.

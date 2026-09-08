-- PREPARATION ONLY. Not a migration; never run against remote databases.
-- Owner 2026-09-08 also permits the explicitly distinct human-unreviewed r3
-- personal PC trial. Reviewed stock still requires genuine content approval.
-- Keep first-stage-private-sessions.sql's synthetic-only guard unchanged.
-- The operator must first verify a separate loopback-only Supabase instance,
-- its dedicated persistent volume, genuine local Auth and the exact content lane.
-- This SQL marker is an accidental-use guard, NOT proof of location or approval.
-- No learner records may be passed to synthetic test cleanup or reset scripts.
-- Rollback: disable the local feature/stop the app; PRESERVE database and volume.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
do $$ begin
  if current_setting('inverge.local_first_stage_personal_use', true) is distinct from 'owner_approved_persistent_local'
    or nullif(current_setting('inverge.local_first_stage_design', true), '') is not null then
    raise exception 'dedicated persistent owner-local context required';
  end if;
end $$;

create table if not exists public.first_stage_private_sessions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null check (session_id ~ '^first-session-[0-9a-f]{40}$'),
  revision integer not null check (revision between 1 and 512),
  payload jsonb not null,
  primary key (owner_id, session_id),
  check ((jsonb_typeof(payload) = 'object') is true),
  check ((octet_length(payload::text) <= 2097152) is true),
  check ((payload - array['schemaVersion','ownerId','sessionId','catalogDigest','state','commands'] = '{}'::jsonb) is true),
  check ((payload ?& array['schemaVersion','ownerId','sessionId','catalogDigest','state','commands']) is true),
  check ((payload->>'schemaVersion' in ('first_stage.private_session.v1', 'first_stage.owner_local_trial_session.v1')) is true),
  check ((payload->>'ownerId' = owner_id::text) is true),
  check ((payload->>'sessionId' = session_id) is true),
  check ((payload->>'catalogDigest' ~ '^[0-9a-f]{64}$') is true),
  check ((payload->'state'->>'schemaVersion' = 'dabangil.first_stage.common_mcq_kernel.v1') is true),
  check ((payload->'state'->'examCycle'->>'ownerId' = owner_id::text) is true),
  check ((payload->'state'->'examCycle'->>'examCycleId' = session_id) is true),
  check (((payload->'state'->>'revision')::integer = revision) is true),
  check ((jsonb_typeof(payload->'commands') = 'array') is true),
  check ((jsonb_array_length(payload->'commands') = revision) is true)
);

-- CREATE IF NOT EXISTS preserves an old table's checks. Upgrade only the exact
-- prior personal schema-version check, atomically and without rewriting rows.
-- Unknown/missing/custom checks fail closed; no catch-all constraint removal.
do $owner_local_upgrade$
declare
  existing_definition text;
begin
  lock table public.first_stage_private_sessions in access exclusive mode;
  select pg_get_constraintdef(oid) into existing_definition
  from pg_constraint
  where conrelid = 'public.first_stage_private_sessions'::regclass
    and conname = 'first_stage_private_sessions_payload_check4' and contype = 'c';
  if existing_definition = $legacy$CHECK ((((payload ->> 'schemaVersion'::text) = 'first_stage.private_session.v1'::text) IS TRUE))$legacy$ then
    alter table public.first_stage_private_sessions
      drop constraint first_stage_private_sessions_payload_check4,
      add constraint first_stage_private_sessions_payload_check4
        check ((payload->>'schemaVersion' in ('first_stage.private_session.v1', 'first_stage.owner_local_trial_session.v1')) is true);
  elsif existing_definition is distinct from $current$CHECK ((((payload ->> 'schemaVersion'::text) = ANY (ARRAY['first_stage.private_session.v1'::text, 'first_stage.owner_local_trial_session.v1'::text])) IS TRUE))$current$ then
    raise exception 'unknown personal session schema constraint; preserve and inspect';
  end if;
end $owner_local_upgrade$;

alter table public.first_stage_private_sessions enable row level security;
alter table public.first_stage_private_sessions force row level security;
-- No learner-supplied write or public Data API access. No existing policy changes.
revoke all on public.first_stage_private_sessions from public, anon, authenticated;
grant select, insert, update on public.first_stage_private_sessions to service_role;
comment on table public.first_stage_private_sessions is
  'Dedicated persistent Owner-local bodyless MCQ state; server-only CAS, no public activation';
commit;

-- LOCAL DESIGN ONLY. Not a migration and never part of remote apply history.
-- Owner 2026-09-06 permits isolated synthetic schema design, not remote apply.
-- Existing exam_sessions permits user-authored updates; do not treat those
-- writes as server-sealed evaluation, chronology or reviewed-content authority.
-- Reuse the existing transport and the frozen kernel aggregate in one private
-- row; do not create a second Review Queue or second-stage truth store.
-- Rollback: keep the feature OFF and the table untouched. Destroy only the
-- disposable test container after proving synthetic-user cascade cleanup.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
do $$ begin
  if current_setting('inverge.local_first_stage_design', true) is distinct from 'synthetic_only' then
    raise exception 'isolated synthetic design context required';
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
  check ((payload->>'schemaVersion' = 'first_stage.private_session.v1') is true),
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

alter table public.first_stage_private_sessions enable row level security;
alter table public.first_stage_private_sessions force row level security;
-- No learner-supplied write or public Data API access. No existing policy changes.
revoke all on public.first_stage_private_sessions from public, anon, authenticated;
grant select, insert, update on public.first_stage_private_sessions to service_role;
comment on table public.first_stage_private_sessions is
  'Local-design Owner-private bodyless MCQ state; server-only CAS, no public activation';
commit;

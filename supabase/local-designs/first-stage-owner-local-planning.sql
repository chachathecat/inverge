-- Owner-approved post-#903 PC-trial planning ONLY; never a remote migration.
-- Apply only after dedicated-container identity AND loopback-listener checks.
-- Row-preserving: no session updates/deletes, no historical due-time changes.
-- Rollback: stop the planning consumer, retain this additive schema and records.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
do $$ begin
  if current_setting('inverge.local_first_stage_personal_use',true) is distinct from 'owner_approved_persistent_local'
    or nullif(current_setting('inverge.local_first_stage_design',true),'') is not null then
    raise exception 'dedicated persistent owner-local context required';
  end if;
end $$;

create table if not exists public.first_stage_owner_local_planning (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision integer not null check(revision between 1 and 1000000),
  payload jsonb not null,
  check((jsonb_typeof(payload)='object') is true),
  check((octet_length(payload::text)<=262144) is true),
  check((payload - array['schemaVersion','ownerId','revision','date','preferences','requestId','requestDigest','completedAtDeclaration','dispatches']='{}'::jsonb) is true),
  check((payload ?& array['schemaVersion','ownerId','revision','date','preferences','requestId','requestDigest','completedAtDeclaration','dispatches']) is true),
  check((payload->>'schemaVersion'='first_stage.owner_local_planning.v1') is true),
  check((payload->>'ownerId'=owner_id::text) is true),
  check(((payload->>'revision')::integer=revision) is true),
  check((jsonb_typeof(payload->'dispatches')='array' and jsonb_array_length(payload->'dispatches')<=256) is true),
  check((jsonb_typeof(payload->'completedAtDeclaration')='array' and jsonb_array_length(payload->'completedAtDeclaration')<=1024) is true)
);
-- Null historical rows retain their settings/history and ask for an explicit
-- declaration; never invent their past planning timestamp or rewrite sessions.
alter table public.first_stage_owner_local_planning add column if not exists declared_at timestamptz;
alter table public.first_stage_owner_local_planning enable row level security;
alter table public.first_stage_owner_local_planning force row level security;
revoke all on public.first_stage_owner_local_planning from public,anon,authenticated;
grant select,insert,update on public.first_stage_owner_local_planning to service_role;

-- All trial inserts, including the unchanged manual create path, coordinate
-- with planner first-original insert. Historical duplicate sessions remain valid.
create or replace function public.inverge_owner_local_original_insert_lock()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare question_id text;
begin
  if new.payload->>'schemaVersion'='first_stage.owner_local_trial_session.v1' then
    question_id:=new.payload->'state'->'examCycle'->'questionReferences'->0->>'questionId';
    if question_id is null or length(question_id)>128 then raise exception 'invalid local original'; end if;
    perform pg_advisory_xact_lock(hashtextextended('owner-local-original:' || new.owner_id::text || ':' || question_id,0));
    -- The lock serializes writers but does not itself reject a manual insert
    -- that waited behind the planner. Recheck AFTER acquiring it. This INSERT
    -- guard neither rewrites old duplicates nor changes reviewed-session rules.
    if exists(select 1 from public.first_stage_private_sessions where owner_id=new.owner_id and
      payload->>'schemaVersion'='first_stage.owner_local_trial_session.v1' and
      payload->'state'->'examCycle'->'questionReferences'->0->>'questionId'=question_id) then
      raise unique_violation using message='owner-local original already exists';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.inverge_owner_local_original_insert_lock() from public,anon,authenticated;
create or replace trigger inverge_owner_local_original_insert_lock
before insert on public.first_stage_private_sessions for each row
execute function public.inverge_owner_local_original_insert_lock();

create or replace function public.inverge_owner_local_reserve_original(p_owner uuid,p_session text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare question_id text; existing jsonb;
begin
  if (p_payload->>'schemaVersion'='first_stage.owner_local_trial_session.v1' and
    p_payload->>'ownerId'=p_owner::text and p_payload->>'sessionId'=p_session and
    (p_payload->'state'->>'revision')::integer=1) is not true then
    raise exception 'invalid local original binding';
  end if;
  question_id:=p_payload->'state'->'examCycle'->'questionReferences'->0->>'questionId';
  if question_id is null or length(question_id)>128 then raise exception 'invalid local original'; end if;
  perform pg_advisory_xact_lock(hashtextextended('owner-local-original:' || p_owner::text || ':' || question_id,0));
  select payload into existing from public.first_stage_private_sessions where owner_id=p_owner and session_id=p_session;
  if found then return existing; end if;
  if exists(select 1 from public.first_stage_private_sessions where owner_id=p_owner and
    payload->>'schemaVersion'='first_stage.owner_local_trial_session.v1' and
    payload->'state'->'examCycle'->'questionReferences'->0->>'questionId'=question_id) then return null; end if;
  insert into public.first_stage_private_sessions(owner_id,session_id,revision,payload) values(p_owner,p_session,1,p_payload);
  return p_payload;
end $$;
revoke all on function public.inverge_owner_local_reserve_original(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.inverge_owner_local_reserve_original(uuid,text,jsonb) to service_role;
create index if not exists first_stage_owner_local_original_lookup on public.first_stage_private_sessions
  (owner_id, (payload->'state'->'examCycle'->'questionReferences'->0->>'questionId'))
  where payload->>'schemaVersion'='first_stage.owner_local_trial_session.v1';
notify pgrst, 'reload schema';
commit;

-- SOURCE / DISPOSABLE SYNTHETIC DB ONLY under the 2026-09-09 post909 decision.
-- Never apply to the personal Owner-PC DB or a remote project under this Work.
-- Reuses one canonical session row; no assignment table or second Queue.
-- Rollback: disable INVERGE_OWNER_REVIEWED_BANK_ENABLED; preserve rows/column.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '10s';
do $$ begin
  if current_setting('inverge.local_first_stage_design',true) is distinct from 'synthetic_only'
    or nullif(current_setting('inverge.local_first_stage_personal_use',true),'') is not null then
    raise exception 'isolated synthetic design context required';
  end if;
end $$;

alter table public.first_stage_private_sessions add column if not exists reviewed_bank_assignment jsonb;
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.first_stage_private_sessions'::regclass
    and conname='first_stage_reviewed_bank_binding') then
    alter table public.first_stage_private_sessions add constraint first_stage_reviewed_bank_binding check (
      reviewed_bank_assignment is null or (
        jsonb_typeof(reviewed_bank_assignment)='object' and octet_length(reviewed_bank_assignment::text)<=8192 and
        payload->>'schemaVersion'='first_stage.private_session.v1' and
        payload->'state'->'examCycle'->'questionReferences'->0->>'subjectId'='economics_principles' and
        reviewed_bank_assignment->>'contractVersion'='QFI1BankFirstAssignmentV1' and
        reviewed_bank_assignment->>'status'='ASSIGNED' and
        reviewed_bank_assignment->>'purpose'='LEARNING_PRACTICE' and
        reviewed_bank_assignment->>'bankClass'='LEARNING_PRACTICE' and
        reviewed_bank_assignment->>'contentAuthority'='LEARNING_ONLY' and
        reviewed_bank_assignment->>'learnerUse'='LEARNING_ONLY' and
        reviewed_bank_assignment->>'origin'='BANK_STOCK' and
        reviewed_bank_assignment->>'learnerScopeId'=session_id and
        reviewed_bank_assignment->>'candidateId'=payload->'state'->'examCycle'->'questionReferences'->0->>'questionId' and
        reviewed_bank_assignment->'transferClaimAllowed'='false'::jsonb and
        reviewed_bank_assignment->'measurementClaimAllowed'='false'::jsonb and
        reviewed_bank_assignment->'generationAuthorized'='false'::jsonb and
        reviewed_bank_assignment->'chronologyDigest'='null'::jsonb and
        reviewed_bank_assignment ?& array['assignedAt','assignmentId','assignmentDigest','candidateDigest','familyId','surfaceId'] and
        reviewed_bank_assignment - array['contractVersion','purpose','learnerScopeId','candidateId','candidateDigest',
          'familyId','surfaceId','bankClass','origin','contentAuthority','chronologyDigest','assignedAt','status',
          'assignmentId','assignmentDigest','learnerUse','transferClaimAllowed','measurementClaimAllowed','generationAuthorized']='{}'::jsonb and
        reviewed_bank_assignment->>'assignmentId' ~ '^qfa_[0-9a-f]{64}$' and
        reviewed_bank_assignment->>'assignmentDigest' ~ '^sha256:[0-9a-f]{64}$' and
        reviewed_bank_assignment->>'candidateDigest' ~ '^sha256:[0-9a-f]{64}$' and
        length(reviewed_bank_assignment->>'familyId') between 1 and 160 and
        length(reviewed_bank_assignment->>'surfaceId') between 1 and 160 and
        reviewed_bank_assignment->>'assignedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
      ) is true
    );
  end if;
end $$;

create or replace function public.inverge_reviewed_bank_insert_guard()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare question_id text;
begin
  if tg_op='UPDATE' then
    if new.reviewed_bank_assignment is distinct from old.reviewed_bank_assignment then
      raise exception 'immutable reviewed bank assignment';
    end if;
    if old.reviewed_bank_assignment is not null and
      (new.owner_id is distinct from old.owner_id or new.session_id is distinct from old.session_id or
       new.payload->'state'->'examCycle'->'questionReferences' is distinct from old.payload->'state'->'examCycle'->'questionReferences') then
      raise exception 'immutable reviewed bank identity';
    end if;
    return new;
  end if;
  if new.payload->>'schemaVersion'='first_stage.private_session.v1' and
    new.payload->'state'->'examCycle'->'questionReferences'->0->>'subjectId'='economics_principles' then
    question_id:=new.payload->'state'->'examCycle'->'questionReferences'->0->>'questionId';
    if question_id is null or length(question_id)>160 then raise exception 'invalid reviewed original'; end if;
    -- One transaction lock shared by manual insert and bank reserve. Manual
    -- historical repeat semantics remain unless an automatic reservation exists.
    perform pg_advisory_xact_lock(hashtextextended('reviewed-bank:' || new.owner_id::text || ':' || question_id,0));
    if exists(select 1 from public.first_stage_private_sessions s where s.owner_id=new.owner_id and
      s.payload->>'schemaVersion'='first_stage.private_session.v1' and
      s.payload->'state'->'examCycle'->'questionReferences'->0->>'questionId'=question_id and
      (new.reviewed_bank_assignment is not null or s.reviewed_bank_assignment is not null)) then
      raise unique_violation using message='reviewed original already reserved';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.inverge_reviewed_bank_insert_guard() from public,anon,authenticated;
create or replace trigger inverge_reviewed_bank_guard before insert or update
on public.first_stage_private_sessions for each row execute function public.inverge_reviewed_bank_insert_guard();

create or replace function public.inverge_reviewed_bank_reserve(p_owner uuid,p_session text,p_payload jsonb,p_assignment jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare question_id text; existing public.first_stage_private_sessions%rowtype;
begin
  if (p_payload->>'schemaVersion'='first_stage.private_session.v1' and
      p_payload->>'ownerId'=p_owner::text and p_payload->>'sessionId'=p_session and
      (p_payload->'state'->>'revision')::integer=1 and p_assignment is not null) is not true then
    raise exception 'invalid reviewed bank binding';
  end if;
  -- Consistent lock order: request identity, then selected original. Same-request
  -- concurrent selection sees the first committed assignment, never a new clock.
  perform pg_advisory_xact_lock(hashtextextended('reviewed-bank-session:' || p_owner::text || ':' || p_session,0));
  select * into existing from public.first_stage_private_sessions where owner_id=p_owner and session_id=p_session;
  if found then
    if existing.reviewed_bank_assignment is null then return null; end if;
    return jsonb_build_object('session',existing.payload,'assignment',existing.reviewed_bank_assignment);
  end if;
  question_id:=p_payload->'state'->'examCycle'->'questionReferences'->0->>'questionId';
  if question_id is null or length(question_id)>160 then raise exception 'invalid reviewed original'; end if;
  perform pg_advisory_xact_lock(hashtextextended('reviewed-bank:' || p_owner::text || ':' || question_id,0));
  if exists(select 1 from public.first_stage_private_sessions where owner_id=p_owner and
      payload->>'schemaVersion'='first_stage.private_session.v1' and
      payload->'state'->'examCycle'->'questionReferences'->0->>'questionId'=question_id) then return null; end if;
  insert into public.first_stage_private_sessions(owner_id,session_id,revision,payload,reviewed_bank_assignment)
    values(p_owner,p_session,1,p_payload,p_assignment);
  return jsonb_build_object('session',p_payload,'assignment',p_assignment);
end $$;
revoke all on function public.inverge_reviewed_bank_reserve(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.inverge_reviewed_bank_reserve(uuid,text,jsonb,jsonb) to service_role;
create index if not exists first_stage_reviewed_original_lookup on public.first_stage_private_sessions
  (owner_id, (payload->'state'->'examCycle'->'questionReferences'->0->>'questionId'))
  where payload->>'schemaVersion'='first_stage.private_session.v1';
commit;

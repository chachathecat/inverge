-- WCV-C3 durable learning and daily command vertical.
-- Forward-only rollback: disable WCV_C3_DURABLE_LEARNING_ENABLED. No remote
-- database application is authorized by the 2026-08-16 continuation decision.

create table if not exists public.wcv_c3_gap_closure_cases (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_session_id uuid not null,
  subject text not null check (
    subject in ('appraisal_practical', 'appraisal_theory', 'appraisal_law')
  ),
  state text not null check (
    state in (
      'REPAIR_VERIFIED_SAME_SESSION',
      'D1_REPRODUCED',
      'D7_TRANSFER_OBSERVED',
      'TIMED_RECURRENCE_CONFIRMED',
      'CURRENTLY_CLEAR',
      'REOPENED',
      'STALE',
      'DEFERRED',
      'BLOCKED'
    )
  ),
  record_version bigint not null default 1 check (record_version >= 1),
  contract_version text not null check (
    contract_version = 'dabangil.wcv_c3.durable_learning_daily_command.v1'
  ),
  policy_version text not null check (
    policy_version = 'dabangil.wcv_c3.evidence_qualification.v1'
  ),
  state_data jsonb not null check (
    jsonb_typeof(state_data) = 'object'
    and state_data - array[
      'frozenD0',
      'sourcePrimaryGapId',
      'nextEligibleAt',
      'activeAttempt',
      'recurringSignature',
      'latestPlan',
      'planDecisionHistory',
      'resultReasonCodes'
    ] = '{}'::jsonb
    and state_data::text !~* '"(rawBody|learnerText|answerBody|ocrBody|noteBody|credential|token|secret|password)"[[:space:]]*:'
  ),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  foreign key (source_session_id, user_id)
    references public.wcv_c2_trusted_repair_sessions(id, user_id)
    on delete cascade,
  unique (id, user_id),
  unique (source_session_id, user_id)
);

create index if not exists wcv_c3_gap_closure_cases_user_updated_idx
  on public.wcv_c3_gap_closure_cases (user_id, updated_at desc);
create index if not exists wcv_c3_gap_closure_cases_state_idx
  on public.wcv_c3_gap_closure_cases (user_id, state, subject);

create table if not exists public.wcv_c3_private_attempt_artifacts (
  id uuid primary key,
  case_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null,
  stage text not null check (stage in ('D1', 'D7', 'TIMED', 'RECURRENCE')),
  body text not null check (char_length(body) between 1 and 12000),
  immutable boolean not null default true check (immutable = true),
  created_at timestamptz not null default statement_timestamp(),
  foreign key (case_id, user_id)
    references public.wcv_c3_gap_closure_cases(id, user_id)
    on delete cascade,
  unique (id, case_id, user_id),
  unique (attempt_id, case_id, user_id)
);

create index if not exists wcv_c3_private_attempt_artifacts_case_idx
  on public.wcv_c3_private_attempt_artifacts (case_id, user_id, created_at);

create table if not exists public.wcv_c3_evidence_events (
  id uuid primary key,
  case_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'D0_FROZEN',
      'ATTEMPT_PREPARED',
      'D1_REPRODUCED',
      'D7_TRANSFER_OBSERVED',
      'TIMED_RECURRENCE_CONFIRMED',
      'RECURRENCE_RECONFIRMED',
      'CURRENTLY_CLEAR_PROMOTED',
      'INDEPENDENT_FAILURE_RECORDED',
      'CONFIGURATION_STALE',
      'PLAN_PROPOSED',
      'PLAN_DECISION_RECORDED'
    )
  ),
  attempt_id uuid,
  artifact_id uuid,
  item_id text,
  item_family_id text,
  transfer_distance text check (
    transfer_distance is null or transfer_distance in (
      'SAME_ITEM',
      'SAME_SURFACE',
      'NEAR_TRANSFER',
      'BOUNDARY_TRANSFER',
      'REPRESENTATION_TRANSFER',
      'FAR_TRANSFER',
      'TIMED_INTEGRATION'
    )
  ),
  outcome text check (
    outcome is null or outcome in ('SUCCESS', 'PARTIAL', 'BLANK', 'TIMEOUT', 'FAILURE')
  ),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and payload @> '{"containsBody":false}'::jsonb
    and payload::text !~* '"(rawBody|learnerText|answerBody|ocrBody|noteBody|credential|token|secret|password)"[[:space:]]*:'
  ),
  occurred_at timestamptz not null default statement_timestamp(),
  foreign key (case_id, user_id)
    references public.wcv_c3_gap_closure_cases(id, user_id)
    on delete cascade,
  foreign key (artifact_id, case_id, user_id)
    references public.wcv_c3_private_attempt_artifacts(id, case_id, user_id)
    on delete cascade,
  unique (attempt_id, event_type, case_id, user_id)
);

create index if not exists wcv_c3_evidence_events_case_idx
  on public.wcv_c3_evidence_events (case_id, user_id, occurred_at);
create index if not exists wcv_c3_evidence_events_projection_idx
  on public.wcv_c3_evidence_events (
    user_id,
    item_family_id,
    event_type,
    occurred_at
  );

create table if not exists public.wcv_c3_command_receipts (
  command_id uuid not null,
  case_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  resulting_record_version bigint not null check (resulting_record_version >= 1),
  resulting_state text not null,
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id, command_id),
  foreign key (case_id, user_id)
    references public.wcv_c3_gap_closure_cases(id, user_id)
    on delete cascade
);

create table if not exists public.wcv_c3_deletion_receipts (
  command_id uuid not null,
  case_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default statement_timestamp(),
  primary key (user_id, command_id),
  unique (user_id, case_id)
);

alter table public.wcv_c3_gap_closure_cases enable row level security;
alter table public.wcv_c3_gap_closure_cases force row level security;
alter table public.wcv_c3_private_attempt_artifacts enable row level security;
alter table public.wcv_c3_private_attempt_artifacts force row level security;
alter table public.wcv_c3_evidence_events enable row level security;
alter table public.wcv_c3_evidence_events force row level security;
alter table public.wcv_c3_command_receipts enable row level security;
alter table public.wcv_c3_command_receipts force row level security;
alter table public.wcv_c3_deletion_receipts enable row level security;
alter table public.wcv_c3_deletion_receipts force row level security;

revoke all on table public.wcv_c3_gap_closure_cases from public, anon, authenticated;
revoke all on table public.wcv_c3_private_attempt_artifacts from public, anon, authenticated;
revoke all on table public.wcv_c3_evidence_events from public, anon, authenticated;
revoke all on table public.wcv_c3_command_receipts from public, anon, authenticated;
revoke all on table public.wcv_c3_deletion_receipts from public, anon, authenticated;

grant select, insert, update, delete
  on table public.wcv_c3_gap_closure_cases to service_role;
grant select, insert, delete
  on table public.wcv_c3_private_attempt_artifacts to service_role;
grant select, insert, delete
  on table public.wcv_c3_evidence_events to service_role;
grant select, insert, delete
  on table public.wcv_c3_command_receipts to service_role;
grant select, insert
  on table public.wcv_c3_deletion_receipts to service_role;

create or replace function public.wcv_c3_create_gap_closure_case_v1(
  p_case jsonb,
  p_event jsonb,
  p_command_id uuid
)
returns table (
  out_case_id uuid,
  out_record_version bigint,
  out_state text,
  replayed boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_case_id uuid;
  v_user_id uuid;
  v_source_session_id uuid;
  v_record_version bigint;
  v_state text;
begin
  if jsonb_typeof(p_case) <> 'object'
    or p_case - array[
      'caseId', 'userId', 'sourceSessionId', 'subject', 'state',
      'recordVersion', 'contractVersion', 'policyVersion', 'stateData',
      'createdAt', 'updatedAt'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C3_INVALID_CASE_SHAPE';
  end if;
  if jsonb_typeof(p_event) <> 'object'
    or p_event - array[
      'eventId', 'eventType', 'attemptId', 'artifactId', 'itemId',
      'itemFamilyId', 'transferDistance', 'outcome', 'payload', 'occurredAt'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C3_INVALID_EVENT_SHAPE';
  end if;

  v_case_id := (p_case ->> 'caseId')::uuid;
  v_user_id := (p_case ->> 'userId')::uuid;
  v_source_session_id := (p_case ->> 'sourceSessionId')::uuid;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text || ':' || v_source_session_id::text, 0)
  );

  select receipt.case_id, receipt.resulting_record_version, receipt.resulting_state
  into v_case_id, v_record_version, v_state
  from public.wcv_c3_command_receipts as receipt
  where receipt.user_id = v_user_id and receipt.command_id = p_command_id;

  if found then
    return query select v_case_id, v_record_version, v_state, true;
    return;
  end if;

  select candidate.id, candidate.record_version, candidate.state
  into v_case_id, v_record_version, v_state
  from public.wcv_c3_gap_closure_cases as candidate
  where candidate.user_id = v_user_id
    and candidate.source_session_id = v_source_session_id;

  if found then
    insert into public.wcv_c3_command_receipts (
      command_id, case_id, user_id, resulting_record_version, resulting_state
    ) values (p_command_id, v_case_id, v_user_id, v_record_version, v_state);
    return query select v_case_id, v_record_version, v_state, true;
    return;
  end if;

  if not exists (
    select 1
    from public.wcv_c2_trusted_repair_sessions as source
    where source.id = v_source_session_id
      and source.user_id = v_user_id
      and source.subject = p_case ->> 'subject'
      and source.state = 'verified'
      and source.outcome = 'verified'
      and (source.state_data -> 'proofEvaluation' ->> 'verified')::boolean is true
  ) then
    raise exception 'WCV_C3_VERIFIED_D0_REQUIRED';
  end if;

  insert into public.wcv_c3_gap_closure_cases (
    id, user_id, source_session_id, subject, state, record_version,
    contract_version, policy_version, state_data, created_at, updated_at
  ) values (
    (p_case ->> 'caseId')::uuid,
    v_user_id,
    v_source_session_id,
    p_case ->> 'subject',
    p_case ->> 'state',
    (p_case ->> 'recordVersion')::bigint,
    p_case ->> 'contractVersion',
    p_case ->> 'policyVersion',
    p_case -> 'stateData',
    (p_case ->> 'createdAt')::timestamptz,
    (p_case ->> 'updatedAt')::timestamptz
  );

  insert into public.wcv_c3_evidence_events (
    id, case_id, user_id, event_type, attempt_id, artifact_id, item_id,
    item_family_id, transfer_distance, outcome, payload, occurred_at
  ) values (
    (p_event ->> 'eventId')::uuid,
    (p_case ->> 'caseId')::uuid,
    v_user_id,
    p_event ->> 'eventType',
    nullif(p_event ->> 'attemptId', '')::uuid,
    nullif(p_event ->> 'artifactId', '')::uuid,
    nullif(p_event ->> 'itemId', ''),
    nullif(p_event ->> 'itemFamilyId', ''),
    nullif(p_event ->> 'transferDistance', ''),
    nullif(p_event ->> 'outcome', ''),
    p_event -> 'payload',
    (p_event ->> 'occurredAt')::timestamptz
  );

  v_record_version := (p_case ->> 'recordVersion')::bigint;
  v_state := p_case ->> 'state';
  insert into public.wcv_c3_command_receipts (
    command_id, case_id, user_id, resulting_record_version, resulting_state
  ) values (p_command_id, (p_case ->> 'caseId')::uuid, v_user_id, v_record_version, v_state);

  return query select (p_case ->> 'caseId')::uuid, v_record_version, v_state, false;
end;
$$;

create or replace function public.wcv_c3_apply_transition_v1(
  p_case_id uuid,
  p_user_id uuid,
  p_command_id uuid,
  p_expected_version bigint,
  p_expected_state text,
  p_next_state text,
  p_state_data jsonb,
  p_artifact jsonb,
  p_event jsonb
)
returns table (
  out_record_version bigint,
  out_state text,
  replayed boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_version bigint;
  v_current_state text;
  v_next_version bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_case_id::text || ':' || p_command_id::text,
      0
    )
  );

  select receipt.resulting_record_version, receipt.resulting_state
  into v_next_version, v_current_state
  from public.wcv_c3_command_receipts as receipt
  where receipt.user_id = p_user_id
    and receipt.case_id = p_case_id
    and receipt.command_id = p_command_id;

  if found then
    return query select v_next_version, v_current_state, true;
    return;
  end if;

  select candidate.record_version, candidate.state
  into v_current_version, v_current_state
  from public.wcv_c3_gap_closure_cases as candidate
  where candidate.id = p_case_id and candidate.user_id = p_user_id
  for update;

  if not found then raise exception 'WCV_C3_NOT_FOUND'; end if;
  if v_current_version <> p_expected_version or v_current_state <> p_expected_state then
    raise exception 'WCV_C3_CAS_CONFLICT';
  end if;
  if jsonb_typeof(p_state_data) <> 'object'
    or p_state_data - array[
      'frozenD0', 'sourcePrimaryGapId', 'nextEligibleAt',
      'activeAttempt',
      'recurringSignature', 'latestPlan', 'planDecisionHistory',
      'resultReasonCodes'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C3_INVALID_STATE_DATA';
  end if;
  if jsonb_typeof(p_event) <> 'object'
    or p_event - array[
      'eventId', 'eventType', 'attemptId', 'artifactId', 'itemId',
      'itemFamilyId', 'transferDistance', 'outcome', 'payload', 'occurredAt'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C3_INVALID_EVENT_SHAPE';
  end if;

  if p_artifact is not null then
    if jsonb_typeof(p_artifact) <> 'object'
      or p_artifact - array[
        'artifactId', 'attemptId', 'stage', 'body', 'createdAt'
      ] <> '{}'::jsonb
    then
      raise exception 'WCV_C3_INVALID_ARTIFACT_SHAPE';
    end if;
    insert into public.wcv_c3_private_attempt_artifacts (
      id, case_id, user_id, attempt_id, stage, body, created_at
    ) values (
      (p_artifact ->> 'artifactId')::uuid,
      p_case_id,
      p_user_id,
      (p_artifact ->> 'attemptId')::uuid,
      p_artifact ->> 'stage',
      p_artifact ->> 'body',
      (p_artifact ->> 'createdAt')::timestamptz
    );
  end if;

  insert into public.wcv_c3_evidence_events (
    id, case_id, user_id, event_type, attempt_id, artifact_id, item_id,
    item_family_id, transfer_distance, outcome, payload, occurred_at
  ) values (
    (p_event ->> 'eventId')::uuid,
    p_case_id,
    p_user_id,
    p_event ->> 'eventType',
    nullif(p_event ->> 'attemptId', '')::uuid,
    nullif(p_event ->> 'artifactId', '')::uuid,
    nullif(p_event ->> 'itemId', ''),
    nullif(p_event ->> 'itemFamilyId', ''),
    nullif(p_event ->> 'transferDistance', ''),
    nullif(p_event ->> 'outcome', ''),
    p_event -> 'payload',
    (p_event ->> 'occurredAt')::timestamptz
  );

  v_next_version := v_current_version + 1;
  update public.wcv_c3_gap_closure_cases
  set state = p_next_state,
      record_version = v_next_version,
      state_data = p_state_data,
      updated_at = statement_timestamp()
  where id = p_case_id and user_id = p_user_id;

  insert into public.wcv_c3_command_receipts (
    command_id, case_id, user_id, resulting_record_version, resulting_state
  ) values (p_command_id, p_case_id, p_user_id, v_next_version, p_next_state);

  return query select v_next_version, p_next_state, false;
end;
$$;

create or replace function public.wcv_c3_delete_owned_case_v1(
  p_case_id uuid,
  p_user_id uuid,
  p_command_id uuid,
  p_expected_version bigint
)
returns table (deleted boolean, replayed boolean)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current_version bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_user_id::text || ':' || p_case_id::text, 0)
  );
  if exists (
    select 1 from public.wcv_c3_deletion_receipts
    where user_id = p_user_id and command_id = p_command_id and case_id = p_case_id
  ) then
    return query select true, true;
    return;
  end if;
  select record_version into v_current_version
  from public.wcv_c3_gap_closure_cases
  where id = p_case_id and user_id = p_user_id
  for update;
  if not found then raise exception 'WCV_C3_NOT_FOUND'; end if;
  if v_current_version <> p_expected_version then raise exception 'WCV_C3_CAS_CONFLICT'; end if;

  insert into public.wcv_c3_deletion_receipts (command_id, case_id, user_id)
  values (p_command_id, p_case_id, p_user_id);
  delete from public.wcv_c3_gap_closure_cases
  where id = p_case_id and user_id = p_user_id;
  return query select true, false;
end;
$$;

revoke all on function public.wcv_c3_create_gap_closure_case_v1(jsonb, jsonb, uuid)
  from public, anon, authenticated;
revoke all on function public.wcv_c3_apply_transition_v1(uuid, uuid, uuid, bigint, text, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.wcv_c3_delete_owned_case_v1(uuid, uuid, uuid, bigint)
  from public, anon, authenticated;

grant execute on function public.wcv_c3_create_gap_closure_case_v1(jsonb, jsonb, uuid)
  to service_role;
grant execute on function public.wcv_c3_apply_transition_v1(uuid, uuid, uuid, bigint, text, text, jsonb, jsonb, jsonb)
  to service_role;
grant execute on function public.wcv_c3_delete_owned_case_v1(uuid, uuid, uuid, bigint)
  to service_role;

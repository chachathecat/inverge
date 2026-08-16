-- C2R-C-P Practice trusted repair vertical.
-- Forward-only rollback: disable WCV_C2R_C_P_PRACTICE_ENABLED first, then
-- revert this migration in a fresh isolated environment. No remote application
-- is authorized by the 2026-08-17 C2R-C-P stage decision.

create table if not exists public.wcv_c2_trusted_repair_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_kind text not null default 'wcv_c2_trusted_repair'
    check (session_kind = 'wcv_c2_trusted_repair'),
  fixture_id text not null check (fixture_id ~ '^wcv-c2-[a-z0-9_-]+$'),
  subject text not null check (subject = 'appraisal_practical'),
  state text not null check (
    state in (
      'editable_capture_draft',
      'revision_confirmed',
      'prediction_committed',
      'independent_attempt_committed',
      'self_diagnosis_committed',
      'diagnosed',
      'exposure_committed',
      'repair_submitted',
      'verified',
      'partial',
      'guided',
      'deferred',
      'blocked',
      'uncertain',
      'stale'
    )
  ),
  record_version bigint not null default 1 check (record_version >= 1),
  confirmed_revision_id uuid,
  primary_gap_id text,
  outcome text check (
    outcome is null or outcome in (
      'verified',
      'partial',
      'guided',
      'deferred',
      'blocked',
      'uncertain',
      'stale'
    )
  ),
  assistance_level smallint not null default 0
    check (assistance_level between 0 and 3),
  independent_attempt_before_help boolean not null default false,
  contract_version text not null check (
    contract_version = 'wcv_c2r_c_p_practice_trusted_repair.v1'
  ),
  fixture_version text not null check (
    fixture_version = 'wcv_c2r_c_p_practice_rights_safe_fixtures.2026-08-17.v1'
  ),
  source_version text not null,
  rubric_version text not null check (
    rubric_version = 'wcv_c2r_c_p_practice_relation_rubric.v1'
  ),
  policy_version text not null check (
    policy_version = 'wcv_c2r_c_p_exposure_and_independence_policy.v1'
  ),
  validator_version text not null check (
    validator_version = 'validator:practice-calculation-relation@1'
  ),
  state_data jsonb not null default '{}'::jsonb check (
    jsonb_typeof(state_data) = 'object'
    and state_data - array[
      'inputMode',
      'revisionNumber',
      'prediction',
      'predictionConfidence',
      'selfDiagnosisCode',
      'gapCandidates',
      'repairNeed',
      'repairPath',
      'continuation',
      'proofEvaluation',
      'resultReasonCodes'
    ] = '{}'::jsonb
    and not (state_data ?| array[
      'rawBody',
      'learnerText',
      'fixtureBody',
      'referenceBody',
      'scaffoldBody',
      'credential',
      'token',
      'secret',
      'checksum'
    ])
  ),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  unique (id, user_id)
);

create index if not exists wcv_c2_trusted_repair_sessions_user_updated_idx
  on public.wcv_c2_trusted_repair_sessions (user_id, updated_at desc);
create index if not exists wcv_c2_trusted_repair_sessions_fixture_idx
  on public.wcv_c2_trusted_repair_sessions (fixture_id, subject);

create table if not exists public.wcv_c2_trusted_repair_private_artifacts (
  id uuid primary key,
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_number integer not null check (revision_number >= 0),
  artifact_kind text not null check (
    artifact_kind in (
      'capture_draft',
      'confirmed_revision',
      'independent_attempt',
      'repair_submission'
    )
  ),
  input_mode text not null check (
    input_mode in (
      'TYPED_TEXT',
      'EDITABLE_PHOTO_OCR',
      'EDITABLE_PDF_OCR',
      'EDITABLE_VOICE_TRANSCRIPTION',
      'STRUCTURED_SELECTION'
    )
  ),
  body text not null check (char_length(body) between 1 and 12000),
  immutable boolean not null default true check (immutable = true),
  created_at timestamptz not null default statement_timestamp(),
  foreign key (session_id, user_id)
    references public.wcv_c2_trusted_repair_sessions(id, user_id)
    on delete cascade,
  unique (id, session_id, user_id),
  unique (session_id, user_id, artifact_kind, revision_number, id)
);

create index if not exists wcv_c2_trusted_repair_artifacts_session_idx
  on public.wcv_c2_trusted_repair_private_artifacts (
    session_id,
    user_id,
    revision_number,
    created_at
  );

create table if not exists public.wcv_c2_trusted_repair_exposure_events (
  id uuid primary key,
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_id uuid not null,
  gap_id text not null,
  assistance_level smallint not null check (assistance_level between 1 and 3),
  scaffold_kind text not null check (
    scaffold_kind in ('smallest_eligible_scaffold', 'guided_solution')
  ),
  occurred_at timestamptz not null default statement_timestamp(),
  foreign key (session_id, user_id)
    references public.wcv_c2_trusted_repair_sessions(id, user_id)
    on delete cascade,
  foreign key (revision_id, session_id, user_id)
    references public.wcv_c2_trusted_repair_private_artifacts(
      id,
      session_id,
      user_id
    )
    on delete restrict
);

create index if not exists wcv_c2_trusted_repair_exposure_session_idx
  on public.wcv_c2_trusted_repair_exposure_events (
    session_id,
    user_id,
    occurred_at
  );

create table if not exists public.wcv_c2_trusted_repair_command_receipts (
  command_id uuid primary key,
  session_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  resulting_record_version bigint not null check (resulting_record_version >= 1),
  resulting_state text not null,
  created_at timestamptz not null default statement_timestamp(),
  foreign key (session_id, user_id)
    references public.wcv_c2_trusted_repair_sessions(id, user_id)
    on delete cascade
);

create index if not exists wcv_c2_trusted_repair_receipts_session_idx
  on public.wcv_c2_trusted_repair_command_receipts (
    session_id,
    user_id,
    created_at
  );

create table if not exists public.wcv_c2_trusted_repair_scarcity_events (
  id uuid primary key,
  subject text not null check (subject = 'appraisal_practical'),
  bank text not null check (bank in ('LEARNING', 'TRANSFER', 'MEASUREMENT')),
  reason_code text not null check (reason_code = 'eligible_bank_gap'),
  contains_body boolean not null default false check (contains_body = false),
  occurred_at timestamptz not null default statement_timestamp()
);

alter table public.wcv_c2_trusted_repair_sessions enable row level security;
alter table public.wcv_c2_trusted_repair_sessions force row level security;
alter table public.wcv_c2_trusted_repair_private_artifacts enable row level security;
alter table public.wcv_c2_trusted_repair_private_artifacts force row level security;
alter table public.wcv_c2_trusted_repair_exposure_events enable row level security;
alter table public.wcv_c2_trusted_repair_exposure_events force row level security;
alter table public.wcv_c2_trusted_repair_command_receipts enable row level security;
alter table public.wcv_c2_trusted_repair_command_receipts force row level security;
alter table public.wcv_c2_trusted_repair_scarcity_events enable row level security;
alter table public.wcv_c2_trusted_repair_scarcity_events force row level security;

drop policy if exists "wcv c2 own bodyless session read"
  on public.wcv_c2_trusted_repair_sessions;
create policy "wcv c2 own bodyless session read"
  on public.wcv_c2_trusted_repair_sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.wcv_c2_trusted_repair_sessions
  from public, anon, authenticated;
revoke all on table public.wcv_c2_trusted_repair_private_artifacts
  from public, anon, authenticated;
revoke all on table public.wcv_c2_trusted_repair_exposure_events
  from public, anon, authenticated;
revoke all on table public.wcv_c2_trusted_repair_command_receipts
  from public, anon, authenticated;
revoke all on table public.wcv_c2_trusted_repair_scarcity_events
  from public, anon, authenticated;

grant select on table public.wcv_c2_trusted_repair_sessions to authenticated;
grant select, insert, update
  on table public.wcv_c2_trusted_repair_sessions to service_role;
grant select, insert
  on table public.wcv_c2_trusted_repair_private_artifacts to service_role;
grant select, insert
  on table public.wcv_c2_trusted_repair_exposure_events to service_role;
grant select, insert
  on table public.wcv_c2_trusted_repair_command_receipts to service_role;
grant select, insert
  on table public.wcv_c2_trusted_repair_scarcity_events to service_role;

create or replace function public.wcv_c2_create_trusted_repair_session_v1(
  p_session jsonb,
  p_artifact jsonb,
  p_command_id uuid
)
returns table (
  out_session_id uuid,
  out_record_version bigint,
  out_state text,
  replayed boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session_id uuid;
  v_requested_session_id uuid;
  v_user_id uuid;
  v_record_version bigint;
  v_state text;
begin
  if jsonb_typeof(p_session) <> 'object'
    or p_session - array[
      'sessionId',
      'userId',
      'fixtureId',
      'subject',
      'state',
      'recordVersion',
      'confirmedRevisionId',
      'primaryGapId',
      'outcome',
      'assistanceLevel',
      'independentAttemptBeforeHelp',
      'contractVersion',
      'fixtureVersion',
      'sourceVersion',
      'rubricVersion',
      'policyVersion',
      'validatorVersion',
      'stateData',
      'createdAt',
      'updatedAt'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C2_INVALID_SESSION_SHAPE';
  end if;

  if jsonb_typeof(p_artifact) <> 'object'
    or p_artifact - array[
      'artifactId',
      'revisionNumber',
      'kind',
      'inputMode',
      'body',
      'createdAt'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C2_INVALID_ARTIFACT_SHAPE';
  end if;

  v_requested_session_id := (p_session ->> 'sessionId')::uuid;
  v_user_id := (p_session ->> 'userId')::uuid;

  select
    receipt.session_id,
    receipt.resulting_record_version,
    receipt.resulting_state
  into v_session_id, v_record_version, v_state
  from public.wcv_c2_trusted_repair_command_receipts as receipt
  where receipt.command_id = p_command_id
    and receipt.user_id = v_user_id;

  if found then
    return query select v_session_id, v_record_version, v_state, true;
    return;
  end if;

  v_session_id := v_requested_session_id;

  insert into public.wcv_c2_trusted_repair_sessions (
    id,
    user_id,
    fixture_id,
    subject,
    state,
    record_version,
    confirmed_revision_id,
    primary_gap_id,
    outcome,
    assistance_level,
    independent_attempt_before_help,
    contract_version,
    fixture_version,
    source_version,
    rubric_version,
    policy_version,
    validator_version,
    state_data,
    created_at,
    updated_at
  ) values (
    v_session_id,
    v_user_id,
    p_session ->> 'fixtureId',
    p_session ->> 'subject',
    p_session ->> 'state',
    (p_session ->> 'recordVersion')::bigint,
    nullif(p_session ->> 'confirmedRevisionId', '')::uuid,
    nullif(p_session ->> 'primaryGapId', ''),
    nullif(p_session ->> 'outcome', ''),
    (p_session ->> 'assistanceLevel')::smallint,
    (p_session ->> 'independentAttemptBeforeHelp')::boolean,
    p_session ->> 'contractVersion',
    p_session ->> 'fixtureVersion',
    p_session ->> 'sourceVersion',
    p_session ->> 'rubricVersion',
    p_session ->> 'policyVersion',
    p_session ->> 'validatorVersion',
    p_session -> 'stateData',
    (p_session ->> 'createdAt')::timestamptz,
    (p_session ->> 'updatedAt')::timestamptz
  );

  insert into public.wcv_c2_trusted_repair_private_artifacts (
    id,
    session_id,
    user_id,
    revision_number,
    artifact_kind,
    input_mode,
    body,
    created_at
  ) values (
    (p_artifact ->> 'artifactId')::uuid,
    v_session_id,
    v_user_id,
    (p_artifact ->> 'revisionNumber')::integer,
    p_artifact ->> 'kind',
    p_artifact ->> 'inputMode',
    p_artifact ->> 'body',
    (p_artifact ->> 'createdAt')::timestamptz
  );

  v_record_version := (p_session ->> 'recordVersion')::bigint;
  v_state := p_session ->> 'state';
  insert into public.wcv_c2_trusted_repair_command_receipts (
    command_id,
    session_id,
    user_id,
    resulting_record_version,
    resulting_state
  ) values (
    p_command_id,
    v_session_id,
    v_user_id,
    v_record_version,
    v_state
  );

  return query select v_session_id, v_record_version, v_state, false;
end;
$$;

create or replace function public.wcv_c2_apply_trusted_repair_transition_v1(
  p_session_id uuid,
  p_user_id uuid,
  p_command_id uuid,
  p_expected_version bigint,
  p_expected_state text,
  p_next_state text,
  p_state_data jsonb,
  p_confirmed_revision_id uuid,
  p_primary_gap_id text,
  p_outcome text,
  p_assistance_level smallint,
  p_independent_attempt_before_help boolean,
  p_artifact jsonb,
  p_exposure jsonb
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
  -- Serialize one logical command before its receipt lookup. A concurrent
  -- retry then observes and replays the first committed receipt instead of
  -- reaching the session CAS check with a stale expected version.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_session_id::text || ':' || p_command_id::text,
      0
    )
  );

  select
    receipt.resulting_record_version,
    receipt.resulting_state
  into v_next_version, v_current_state
  from public.wcv_c2_trusted_repair_command_receipts as receipt
  where receipt.command_id = p_command_id
    and receipt.session_id = p_session_id
    and receipt.user_id = p_user_id;

  if found then
    return query select v_next_version, v_current_state, true;
    return;
  end if;

  select session.record_version, session.state
  into v_current_version, v_current_state
  from public.wcv_c2_trusted_repair_sessions as session
  where session.id = p_session_id
    and session.user_id = p_user_id
    and session.session_kind = 'wcv_c2_trusted_repair'
  for update;

  if not found then
    raise exception 'WCV_C2_NOT_FOUND';
  end if;
  if v_current_version <> p_expected_version
    or v_current_state <> p_expected_state
  then
    raise exception 'WCV_C2_CAS_CONFLICT';
  end if;
  if jsonb_typeof(p_state_data) <> 'object'
    or p_state_data - array[
      'inputMode',
      'revisionNumber',
      'prediction',
      'predictionConfidence',
      'selfDiagnosisCode',
      'gapCandidates',
      'repairNeed',
      'repairPath',
      'continuation',
      'proofEvaluation',
      'resultReasonCodes'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C2_INVALID_STATE_DATA';
  end if;

  if p_artifact is not null then
    if jsonb_typeof(p_artifact) <> 'object'
      or p_artifact - array[
        'artifactId',
        'revisionNumber',
        'kind',
        'inputMode',
        'body',
        'createdAt'
      ] <> '{}'::jsonb
    then
      raise exception 'WCV_C2_INVALID_ARTIFACT_SHAPE';
    end if;
    insert into public.wcv_c2_trusted_repair_private_artifacts (
      id,
      session_id,
      user_id,
      revision_number,
      artifact_kind,
      input_mode,
      body,
      created_at
    ) values (
      (p_artifact ->> 'artifactId')::uuid,
      p_session_id,
      p_user_id,
      (p_artifact ->> 'revisionNumber')::integer,
      p_artifact ->> 'kind',
      p_artifact ->> 'inputMode',
      p_artifact ->> 'body',
      (p_artifact ->> 'createdAt')::timestamptz
    );
  end if;

  if p_exposure is not null then
    if jsonb_typeof(p_exposure) <> 'object'
      or p_exposure - array[
        'exposureId',
        'revisionId',
        'gapId',
        'assistanceLevel',
        'scaffoldKind',
        'occurredAt'
      ] <> '{}'::jsonb
    then
      raise exception 'WCV_C2_INVALID_EXPOSURE_SHAPE';
    end if;
    insert into public.wcv_c2_trusted_repair_exposure_events (
      id,
      session_id,
      user_id,
      revision_id,
      gap_id,
      assistance_level,
      scaffold_kind,
      occurred_at
    ) values (
      (p_exposure ->> 'exposureId')::uuid,
      p_session_id,
      p_user_id,
      (p_exposure ->> 'revisionId')::uuid,
      p_exposure ->> 'gapId',
      (p_exposure ->> 'assistanceLevel')::smallint,
      p_exposure ->> 'scaffoldKind',
      (p_exposure ->> 'occurredAt')::timestamptz
    );
  end if;

  if p_confirmed_revision_id is not null and not exists (
    select 1
    from public.wcv_c2_trusted_repair_private_artifacts as artifact
    where artifact.id = p_confirmed_revision_id
      and artifact.session_id = p_session_id
      and artifact.user_id = p_user_id
      and artifact.artifact_kind = 'confirmed_revision'
  ) then
    raise exception 'WCV_C2_INVALID_CONFIRMED_REVISION';
  end if;

  v_next_version := v_current_version + 1;
  update public.wcv_c2_trusted_repair_sessions as session
  set
    state = p_next_state,
    record_version = v_next_version,
    confirmed_revision_id = p_confirmed_revision_id,
    primary_gap_id = p_primary_gap_id,
    outcome = p_outcome,
    assistance_level = p_assistance_level,
    independent_attempt_before_help = p_independent_attempt_before_help,
    state_data = p_state_data,
    updated_at = statement_timestamp()
  where session.id = p_session_id
    and session.user_id = p_user_id
    and session.session_kind = 'wcv_c2_trusted_repair'
    and session.record_version = v_current_version
    and session.state = v_current_state;

  if not found then
    raise exception 'WCV_C2_CAS_CONFLICT';
  end if;

  insert into public.wcv_c2_trusted_repair_command_receipts (
    command_id,
    session_id,
    user_id,
    resulting_record_version,
    resulting_state
  ) values (
    p_command_id,
    p_session_id,
    p_user_id,
    v_next_version,
    p_next_state
  );

  return query select v_next_version, p_next_state, false;
end;
$$;

revoke all on function public.wcv_c2_create_trusted_repair_session_v1(
  jsonb,
  jsonb,
  uuid
) from public, anon, authenticated;
revoke all on function public.wcv_c2_apply_trusted_repair_transition_v1(
  uuid,
  uuid,
  uuid,
  bigint,
  text,
  text,
  jsonb,
  uuid,
  text,
  text,
  smallint,
  boolean,
  jsonb,
  jsonb
) from public, anon, authenticated;
grant execute on function public.wcv_c2_create_trusted_repair_session_v1(
  jsonb,
  jsonb,
  uuid
) to service_role;
grant execute on function public.wcv_c2_apply_trusted_repair_transition_v1(
  uuid,
  uuid,
  uuid,
  bigint,
  text,
  text,
  jsonb,
  uuid,
  text,
  text,
  smallint,
  boolean,
  jsonb,
  jsonb
) to service_role;

comment on table public.wcv_c2_trusted_repair_sessions is
  'Bodyless canonical C2R-C-P Practice session metadata and exact typed-relation version bindings.';
comment on table public.wcv_c2_trusted_repair_private_artifacts is
  'Append-only learner-private draft, revision, attempt and repair bodies; service role only.';
comment on table public.wcv_c2_trusted_repair_exposure_events is
  'Append-only bodyless assistance exposure ledger committed before any help bytes are returned.';
comment on function public.wcv_c2_apply_trusted_repair_transition_v1 is
  'Service-only exact-user CAS transition with atomic private-artifact/exposure commit and replay receipt.';

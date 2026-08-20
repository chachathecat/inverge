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
      'latestReviewOutcome',
      'failureNotes',
      'plannerStatus',
      'resultReasonCodes'
    ] = '{}'::jsonb
    and state_data ?& array[
      'frozenD0',
      'sourcePrimaryGapId',
      'nextEligibleAt',
      'activeAttempt',
      'recurringSignature',
      'latestPlan',
      'planDecisionHistory',
      'latestReviewOutcome',
      'failureNotes',
      'plannerStatus',
      'resultReasonCodes'
    ]
    and pg_catalog.jsonb_typeof(state_data -> 'failureNotes') = 'array'
    and pg_catalog.jsonb_typeof(state_data -> 'plannerStatus') = 'object'
    and pg_catalog.jsonb_typeof(state_data -> 'latestReviewOutcome') in ('object', 'null')
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
create index if not exists wcv_c3_private_attempt_artifacts_user_idx
  on public.wcv_c3_private_attempt_artifacts (user_id, created_at);

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

create index if not exists wcv_c3_command_receipts_case_idx
  on public.wcv_c3_command_receipts (case_id, user_id, created_at);

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

create or replace function public.wcv_c3_load_gap_closure_case_v1(
  p_case_id uuid,
  p_user_id uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'case', pg_catalog.to_jsonb(candidate),
    'artifacts', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.to_jsonb(artifact)
          order by artifact.created_at, artifact.id
        )
        from public.wcv_c3_private_attempt_artifacts as artifact
        where artifact.case_id = candidate.id
          and artifact.user_id = candidate.user_id
      ),
      '[]'::jsonb
    ),
    'events', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.to_jsonb(event)
          order by event.occurred_at, event.id
        )
        from public.wcv_c3_evidence_events as event
        where event.case_id = candidate.id
          and event.user_id = candidate.user_id
      ),
      '[]'::jsonb
    )
  )
  from public.wcv_c3_gap_closure_cases as candidate
  where candidate.id = p_case_id
    and candidate.user_id = p_user_id;
$$;

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
  v_current_state_data jsonb;
  v_source_session_id uuid;
  v_subject text;
  v_next_version bigint;
  v_event_type text;
  v_outcome text;
  v_event_id uuid;
  v_review_output jsonb;
  v_review_outcome jsonb;
  v_gap_signal jsonb;
  v_concept_signal jsonb;
  v_failure_note_id text;
  v_matching_failure_note_count integer;
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

  select
    candidate.record_version,
    candidate.state,
    candidate.state_data,
    candidate.source_session_id,
    candidate.subject
  into
    v_current_version,
    v_current_state,
    v_current_state_data,
    v_source_session_id,
    v_subject
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
      'latestReviewOutcome', 'failureNotes', 'plannerStatus',
      'resultReasonCodes'
    ] <> '{}'::jsonb
    or not p_state_data ?& array[
      'frozenD0', 'sourcePrimaryGapId', 'nextEligibleAt',
      'activeAttempt', 'recurringSignature', 'latestPlan',
      'planDecisionHistory', 'latestReviewOutcome', 'failureNotes',
      'plannerStatus', 'resultReasonCodes'
    ]
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

  v_event_type := p_event ->> 'eventType';
  v_outcome := p_event ->> 'outcome';
  v_event_id := (p_event ->> 'eventId')::uuid;

  if v_event_type not in (
    'D1_REPRODUCED',
    'D7_TRANSFER_OBSERVED',
    'TIMED_RECURRENCE_CONFIRMED',
    'RECURRENCE_RECONFIRMED',
    'INDEPENDENT_FAILURE_RECORDED'
  ) and (
    p_state_data -> 'latestReviewOutcome' is distinct from v_current_state_data -> 'latestReviewOutcome'
    or p_state_data -> 'failureNotes' is distinct from v_current_state_data -> 'failureNotes'
  ) then
    raise exception 'WCV_C3_REVIEW_STATE_CHANGE_REQUIRES_TERMINAL_EVENT';
  end if;

  if v_event_type in ('PLAN_PROPOSED', 'PLAN_DECISION_RECORDED') then
    if p_artifact is not null
      or p_next_state <> v_current_state
      or p_state_data -> 'frozenD0' is distinct from v_current_state_data -> 'frozenD0'
      or p_state_data -> 'sourcePrimaryGapId' is distinct from v_current_state_data -> 'sourcePrimaryGapId'
      or p_state_data -> 'latestReviewOutcome' is distinct from v_current_state_data -> 'latestReviewOutcome'
      or p_state_data -> 'failureNotes' is distinct from v_current_state_data -> 'failureNotes'
      or p_state_data -> 'resultReasonCodes' is distinct from v_current_state_data -> 'resultReasonCodes'
      or p_state_data -> 'recurringSignature' is distinct from v_current_state_data -> 'recurringSignature'
      or p_state_data -> 'nextEligibleAt' is distinct from v_current_state_data -> 'nextEligibleAt'
      or p_state_data -> 'activeAttempt' is distinct from v_current_state_data -> 'activeAttempt'
      or (
        v_event_type = 'PLAN_PROPOSED'
        and p_state_data -> 'planDecisionHistory'
          is distinct from v_current_state_data -> 'planDecisionHistory'
      )
    then
      raise exception 'WCV_C3_PLAN_REVIEW_STATE_SEPARATION_REQUIRED';
    end if;
  end if;

  if v_event_type in (
    'D1_REPRODUCED',
    'D7_TRANSFER_OBSERVED',
    'TIMED_RECURRENCE_CONFIRMED',
    'RECURRENCE_RECONFIRMED',
    'INDEPENDENT_FAILURE_RECORDED'
  ) then
    v_review_output := p_event -> 'payload' -> 'reviewOutput';
    v_review_outcome := p_state_data -> 'latestReviewOutcome';
    v_gap_signal := v_review_output -> 'learningGapSignal';
    v_concept_signal := v_review_output -> 'conceptStateSignal';
    v_failure_note_id := v_review_outcome ->> 'failureNoteId';

    if p_artifact is null
      or pg_catalog.jsonb_typeof(v_review_output) <> 'object'
      or pg_catalog.jsonb_typeof(v_review_outcome) <> 'object'
      or pg_catalog.jsonb_typeof(v_gap_signal) <> 'object'
      or pg_catalog.jsonb_typeof(v_concept_signal) <> 'object'
      or pg_catalog.jsonb_typeof(p_state_data -> 'failureNotes') <> 'array'
      or v_review_output - array[
        'reviewOutcomeId', 'learningGapSignal', 'conceptStateSignal',
        'failureNoteId', 'containsFailureNoteBody'
      ] <> '{}'::jsonb
      or not coalesce(v_review_output ?& array[
        'reviewOutcomeId', 'learningGapSignal', 'conceptStateSignal',
        'failureNoteId', 'containsFailureNoteBody'
      ], false)
      or v_review_outcome - array[
        'reviewOutcomeId', 'version', 'binding', 'outcome', 'reasonCodes',
        'biggestGap', 'nextAction', 'failureNoteId', 'learningGapSignalId',
        'conceptStateSignalId', 'occurredAt', 'containsBody',
        'sharedSignalsBodyless', 'failureNotePrivate'
      ] <> '{}'::jsonb
      or not coalesce(v_review_outcome ?& array[
        'reviewOutcomeId', 'version', 'binding', 'outcome', 'reasonCodes',
        'biggestGap', 'nextAction', 'failureNoteId', 'learningGapSignalId',
        'conceptStateSignalId', 'occurredAt', 'containsBody',
        'sharedSignalsBodyless', 'failureNotePrivate'
      ], false)
      or v_gap_signal - array[
        'signalId', 'version', 'binding', 'outcome', 'reasonCodes', 'gapCode',
        'evidenceContributionOnly', 'createsVerified', 'createsMastery',
        'createsCurrentlyClear', 'createsReadiness', 'changesScore',
        'containsBody', 'reconstructive', 'failureNoteBodyIncluded', 'occurredAt'
      ] <> '{}'::jsonb
      or not coalesce(v_gap_signal ?& array[
        'signalId', 'version', 'binding', 'outcome', 'reasonCodes', 'gapCode',
        'evidenceContributionOnly', 'createsVerified', 'createsMastery',
        'createsCurrentlyClear', 'createsReadiness', 'changesScore',
        'containsBody', 'reconstructive', 'failureNoteBodyIncluded', 'occurredAt'
      ], false)
      or v_concept_signal - array[
        'signalId', 'version', 'binding', 'learningGapSignalId', 'failureNoteId',
        'candidateState', 'evidenceKind', 'evidenceContributionOnly',
        'canonicalConceptStateChanged', 'createsVerified', 'createsMastery',
        'createsCurrentlyClear', 'createsReadiness', 'changesScore',
        'containsBody', 'reconstructive', 'failureNoteBodyIncluded', 'occurredAt'
      ] <> '{}'::jsonb
      or not coalesce(v_concept_signal ?& array[
        'signalId', 'version', 'binding', 'learningGapSignalId', 'failureNoteId',
        'candidateState', 'evidenceKind', 'evidenceContributionOnly',
        'canonicalConceptStateChanged', 'createsVerified', 'createsMastery',
        'createsCurrentlyClear', 'createsReadiness', 'changesScore',
        'containsBody', 'reconstructive', 'failureNoteBodyIncluded', 'occurredAt'
      ], false)
      or (v_review_outcome -> 'binding') - array[
        'caseId', 'caseRecordVersion', 'userId', 'subject', 'sourceSessionId',
        'sourceSessionRecordVersion', 'sourceConfirmedRevisionId',
        'sourcePrimaryGapId', 'stage', 'attemptId', 'privateArtifactId',
        'itemId', 'itemRevisionId', 'itemFamilyId', 'evidenceEventId',
        'proofAnchorId', 'contractVersion', 'policyVersion', 'validatorVersion',
        'sourceVersion', 'fixtureVersion'
      ] <> '{}'::jsonb
      or not coalesce((v_review_outcome -> 'binding') ?& array[
        'caseId', 'caseRecordVersion', 'userId', 'subject', 'sourceSessionId',
        'sourceSessionRecordVersion', 'sourceConfirmedRevisionId',
        'sourcePrimaryGapId', 'stage', 'attemptId', 'privateArtifactId',
        'itemId', 'itemRevisionId', 'itemFamilyId', 'evidenceEventId',
        'proofAnchorId', 'contractVersion', 'policyVersion', 'validatorVersion',
        'sourceVersion', 'fixtureVersion'
      ], false)
      or pg_catalog.jsonb_typeof(v_review_outcome -> 'biggestGap') is distinct from 'object'
      or (v_review_outcome -> 'biggestGap') - array[
        'gapId', 'sourceSessionId', 'sourceConfirmedRevisionId',
        'summaryCode', 'learnerFacingSummaryKo'
      ] <> '{}'::jsonb
      or not coalesce((v_review_outcome -> 'biggestGap') ?& array[
        'gapId', 'sourceSessionId', 'sourceConfirmedRevisionId',
        'summaryCode', 'learnerFacingSummaryKo'
      ], false)
      or v_review_outcome -> 'biggestGap' ->> 'gapId'
        is distinct from v_review_outcome -> 'binding' ->> 'sourcePrimaryGapId'
      or v_review_outcome -> 'biggestGap' ->> 'sourceSessionId'
        is distinct from v_review_outcome -> 'binding' ->> 'sourceSessionId'
      or v_review_outcome -> 'biggestGap' ->> 'sourceConfirmedRevisionId'
        is distinct from v_review_outcome -> 'binding' ->> 'sourceConfirmedRevisionId'
      or nullif(v_review_outcome -> 'biggestGap' ->> 'summaryCode', '') is null
      or nullif(v_review_outcome -> 'biggestGap' ->> 'learnerFacingSummaryKo', '') is null
      or pg_catalog.jsonb_typeof(v_review_outcome -> 'nextAction') is distinct from 'object'
      or (v_review_outcome -> 'nextAction') - array['action', 'instructionKo'] <> '{}'::jsonb
      or not coalesce(
        (v_review_outcome -> 'nextAction') ?& array['action', 'instructionKo'],
        false
      )
      or not coalesce(v_review_outcome -> 'nextAction' ->> 'action' in (
        'PREPARE_INDEPENDENT_RETRY', 'WAIT_FOR_NEXT_REVIEW', 'EVALUATE_CURRENTLY_CLEAR'
      ), false)
      or (
        v_outcome = 'SUCCESS'
        and v_review_outcome -> 'nextAction' ->> 'action' = 'PREPARE_INDEPENDENT_RETRY'
      )
      or (
        v_outcome <> 'SUCCESS'
        and v_review_outcome -> 'nextAction' ->> 'action'
          is distinct from 'PREPARE_INDEPENDENT_RETRY'
      )
      or nullif(v_review_outcome -> 'nextAction' ->> 'instructionKo', '') is null
      or nullif(v_review_output ->> 'reviewOutcomeId', '') is null
      or nullif(v_review_outcome ->> 'reviewOutcomeId', '') is null
      or nullif(v_review_outcome ->> 'learningGapSignalId', '') is null
      or nullif(v_review_outcome ->> 'conceptStateSignalId', '') is null
      or nullif(v_review_outcome ->> 'occurredAt', '') is null
      or nullif(v_gap_signal ->> 'signalId', '') is null
      or nullif(v_concept_signal ->> 'signalId', '') is null
      or not coalesce(v_outcome in ('SUCCESS', 'PARTIAL', 'BLANK', 'TIMEOUT', 'FAILURE'), false)
      or v_review_output ->> 'reviewOutcomeId' is distinct from v_review_outcome ->> 'reviewOutcomeId'
      or v_review_output ->> 'failureNoteId' is distinct from v_failure_note_id
      or (v_review_output ->> 'containsFailureNoteBody')::boolean is distinct from false
      or v_review_outcome ->> 'version' is distinct from 'dabangil.wcv_c3.durable_review_outcome.v1'
      or (v_review_outcome ->> 'containsBody')::boolean is distinct from false
      or (v_review_outcome ->> 'sharedSignalsBodyless')::boolean is distinct from true
      or (v_review_outcome ->> 'failureNotePrivate')::boolean is distinct from true
      or v_review_outcome ->> 'outcome' is distinct from v_outcome
      or pg_catalog.jsonb_typeof(v_review_outcome -> 'reasonCodes') is distinct from 'array'
      or pg_catalog.jsonb_array_length(v_review_outcome -> 'reasonCodes') is distinct from 1
      or v_review_outcome -> 'reasonCodes' is distinct from v_gap_signal -> 'reasonCodes'
      or not coalesce(v_review_outcome -> 'reasonCodes' ->> 0 in (
        'd1_qualified_independent_success',
        'd7_qualified_independent_success',
        'timed_qualified_independent_success',
        'recurrence_qualified_independent_success',
        'trusted_timer_timeout_preserved',
        'typed_proof_rejected'
      ), false)
      or (
        v_outcome = 'SUCCESS'
        and v_review_outcome -> 'reasonCodes' ->> 0 is distinct from
          pg_catalog.lower(p_artifact ->> 'stage') || '_qualified_independent_success'
      )
      or (
        v_outcome = 'TIMEOUT'
        and v_review_outcome -> 'reasonCodes' ->> 0 is distinct from 'trusted_timer_timeout_preserved'
      )
      or (
        v_outcome not in ('SUCCESS', 'TIMEOUT')
        and v_review_outcome -> 'reasonCodes' ->> 0 is distinct from 'typed_proof_rejected'
      )
      or v_review_outcome ->> 'learningGapSignalId' is distinct from v_gap_signal ->> 'signalId'
      or v_review_outcome ->> 'conceptStateSignalId' is distinct from v_concept_signal ->> 'signalId'
      or v_review_outcome ->> 'occurredAt' is distinct from p_event ->> 'occurredAt'
      or v_gap_signal ->> 'occurredAt' is distinct from p_event ->> 'occurredAt'
      or v_concept_signal ->> 'occurredAt' is distinct from p_event ->> 'occurredAt'
      or v_gap_signal ->> 'version' is distinct from 'dabangil.wcv_c3.safe_learning_gap_signal.v1'
      or v_concept_signal ->> 'version' is distinct from 's217.personal_core_concept_graph.v1'
      or v_gap_signal ->> 'outcome' is distinct from v_outcome
      or v_gap_signal ->> 'gapCode' is distinct from 'C2_PRIMARY_GAP'
      or v_concept_signal ->> 'learningGapSignalId' is distinct from v_gap_signal ->> 'signalId'
      or v_concept_signal ->> 'failureNoteId' is distinct from v_failure_note_id
      or v_concept_signal ->> 'evidenceKind' is distinct from
        case when v_outcome = 'SUCCESS' then 'RECOVERY_EVIDENCE' else 'FAILURE_EVIDENCE' end
      or (v_outcome = 'SUCCESS' and v_concept_signal ->> 'candidateState' is distinct from 'recovering')
      or (
        v_outcome <> 'SUCCESS'
        and not coalesce(v_concept_signal ->> 'candidateState' in ('wrong', 'recurring'), false)
      )
      or (v_gap_signal ->> 'evidenceContributionOnly')::boolean is distinct from true
      or (v_concept_signal ->> 'evidenceContributionOnly')::boolean is distinct from true
      or (v_gap_signal ->> 'createsVerified')::boolean is distinct from false
      or (v_gap_signal ->> 'createsMastery')::boolean is distinct from false
      or (v_gap_signal ->> 'createsCurrentlyClear')::boolean is distinct from false
      or (v_gap_signal ->> 'createsReadiness')::boolean is distinct from false
      or (v_gap_signal ->> 'changesScore')::boolean is distinct from false
      or (v_gap_signal ->> 'containsBody')::boolean is distinct from false
      or (v_gap_signal ->> 'reconstructive')::boolean is distinct from false
      or (v_gap_signal ->> 'failureNoteBodyIncluded')::boolean is distinct from false
      or (v_concept_signal ->> 'canonicalConceptStateChanged')::boolean is distinct from false
      or (v_concept_signal ->> 'createsVerified')::boolean is distinct from false
      or (v_concept_signal ->> 'createsMastery')::boolean is distinct from false
      or (v_concept_signal ->> 'createsCurrentlyClear')::boolean is distinct from false
      or (v_concept_signal ->> 'createsReadiness')::boolean is distinct from false
      or (v_concept_signal ->> 'changesScore')::boolean is distinct from false
      or (v_concept_signal ->> 'containsBody')::boolean is distinct from false
      or (v_concept_signal ->> 'reconstructive')::boolean is distinct from false
      or (v_concept_signal ->> 'failureNoteBodyIncluded')::boolean is distinct from false
    then
      raise exception 'WCV_C3_REQUIRED_REVIEW_OUTPUT_INVALID';
    end if;

    if v_review_outcome -> 'binding' is distinct from v_gap_signal -> 'binding'
      or v_review_outcome -> 'binding' is distinct from v_concept_signal -> 'binding'
      or v_review_outcome -> 'binding' ->> 'caseId' is distinct from p_case_id::text
      or v_review_outcome -> 'binding' ->> 'userId' is distinct from p_user_id::text
      or (v_review_outcome -> 'binding' ->> 'caseRecordVersion')::bigint is distinct from v_current_version + 1
      or v_review_outcome -> 'binding' ->> 'subject' is distinct from v_subject
      or v_review_outcome -> 'binding' ->> 'sourceSessionId' is distinct from v_source_session_id::text
      or v_review_outcome -> 'binding' ->> 'sourceSessionRecordVersion'
        is distinct from p_state_data -> 'frozenD0' ->> 'sourceSessionRecordVersion'
      or v_review_outcome -> 'binding' ->> 'sourceConfirmedRevisionId'
        is distinct from p_state_data -> 'frozenD0' ->> 'sourceRevisionId'
      or v_review_outcome -> 'binding' ->> 'sourcePrimaryGapId'
        is distinct from p_state_data ->> 'sourcePrimaryGapId'
      or v_review_outcome -> 'binding' ->> 'stage' is distinct from p_artifact ->> 'stage'
      or v_review_outcome -> 'binding' ->> 'attemptId' is distinct from p_event ->> 'attemptId'
      or v_review_outcome -> 'binding' ->> 'privateArtifactId' is distinct from p_event ->> 'artifactId'
      or v_review_outcome -> 'binding' ->> 'itemId' is distinct from p_event ->> 'itemId'
      or v_review_outcome -> 'binding' ->> 'itemRevisionId'
        is distinct from p_event -> 'payload' -> 'assignment' ->> 'itemRevisionId'
      or v_review_outcome -> 'binding' ->> 'itemFamilyId' is distinct from p_event ->> 'itemFamilyId'
      or v_review_outcome -> 'binding' ->> 'evidenceEventId' is distinct from v_event_id::text
      or v_review_outcome -> 'binding' ->> 'proofAnchorId'
        is distinct from p_event -> 'payload' ->> 'proofAnchorId'
      or v_review_outcome -> 'binding' ->> 'contractVersion'
        is distinct from 'dabangil.wcv_c3.durable_learning_daily_command.v1'
      or v_review_outcome -> 'binding' ->> 'policyVersion'
        is distinct from 'dabangil.wcv_c3.evidence_qualification.v1'
      or v_review_outcome -> 'binding' ->> 'validatorVersion'
        is distinct from p_state_data -> 'frozenD0' ->> 'validatorVersion'
      or v_review_outcome -> 'binding' ->> 'sourceVersion'
        is distinct from p_state_data -> 'frozenD0' ->> 'problemSourceVersion'
      or v_review_outcome -> 'binding' ->> 'fixtureVersion'
        is distinct from p_state_data -> 'frozenD0' ->> 'contentReleaseVersion'
    then
      raise exception 'WCV_C3_REVIEW_SOURCE_BINDING_MISMATCH';
    end if;

    if v_outcome = 'SUCCESS' then
      if v_failure_note_id is not null
        or p_state_data -> 'failureNotes' is distinct from v_current_state_data -> 'failureNotes'
      then
        raise exception 'WCV_C3_SUCCESS_MUST_NOT_CREATE_FAILURE_NOTE';
      end if;
    else
      select pg_catalog.count(*)::integer
      into v_matching_failure_note_count
      from pg_catalog.jsonb_array_elements(p_state_data -> 'failureNotes') as note(value)
      where note.value ->> 'noteId' = v_failure_note_id
        and note.value - array[
          'noteId', 'version', 'binding', 'outcome', 'reasonCodes', 'status',
          'visibility', 'whyWrong', 'correctPrinciple', 'immediateFix',
          'recurrence', 'nextReview', 'sourceMaterialInEntry',
          'containsAttemptBody', 'createdAt'
        ] = '{}'::jsonb
        and note.value ?& array[
          'noteId', 'version', 'binding', 'outcome', 'reasonCodes', 'status',
          'visibility', 'whyWrong', 'correctPrinciple', 'immediateFix',
          'recurrence', 'nextReview', 'sourceMaterialInEntry',
          'containsAttemptBody', 'createdAt'
        ]
        and note.value ->> 'version' = 's216.error_notebook_gap_taxonomy.v1'
        and note.value ->> 'outcome' = v_outcome
        and note.value -> 'reasonCodes' = v_review_outcome -> 'reasonCodes'
        and note.value -> 'binding' = v_review_outcome -> 'binding'
        and note.value ->> 'status' = 'ready'
        and note.value ->> 'visibility' = 'LEARNER_PRIVATE_DERIVED'
        and note.value ->> 'createdAt' = p_event ->> 'occurredAt'
        and (note.value -> 'whyWrong') - array['reasonCode', 'explanationKo'] = '{}'::jsonb
        and note.value -> 'whyWrong' ?& array['reasonCode', 'explanationKo']
        and nullif(note.value -> 'whyWrong' ->> 'reasonCode', '') is not null
        and nullif(note.value -> 'whyWrong' ->> 'explanationKo', '') is not null
        and (note.value -> 'correctPrinciple') - array['principleCode', 'explanationKo'] = '{}'::jsonb
        and note.value -> 'correctPrinciple' ?& array['principleCode', 'explanationKo']
        and nullif(note.value -> 'correctPrinciple' ->> 'principleCode', '') is not null
        and nullif(note.value -> 'correctPrinciple' ->> 'explanationKo', '') is not null
        and (note.value -> 'immediateFix') - array['action', 'instructionKo'] = '{}'::jsonb
        and note.value -> 'immediateFix' ?& array['action', 'instructionKo']
        and note.value -> 'immediateFix' ->> 'action' in ('retry', 'rewrite', 'recalculate')
        and nullif(note.value -> 'immediateFix' ->> 'instructionKo', '') is not null
        and (note.value -> 'recurrence') - array[
          'status', 'eligibleFailureCount', 'distinctFailureFamilyCount'
        ] = '{}'::jsonb
        and note.value -> 'recurrence' ?& array[
          'status', 'eligibleFailureCount', 'distinctFailureFamilyCount'
        ]
        and (note.value -> 'nextReview') - array['scheduledAt', 'instructionKo'] = '{}'::jsonb
        and note.value -> 'nextReview' ?& array['scheduledAt', 'instructionKo']
        and nullif(note.value -> 'nextReview' ->> 'instructionKo', '') is not null
        and (note.value ->> 'sourceMaterialInEntry')::boolean is false
        and (note.value ->> 'containsAttemptBody')::boolean is false;
      if v_failure_note_id is null
        or v_matching_failure_note_count <> 1
        or pg_catalog.jsonb_array_length(p_state_data -> 'failureNotes')
          <> pg_catalog.jsonb_array_length(v_current_state_data -> 'failureNotes') + 1
        or (p_state_data -> 'failureNotes') - (
          pg_catalog.jsonb_array_length(p_state_data -> 'failureNotes') - 1
        ) is distinct from v_current_state_data -> 'failureNotes'
      then
        raise exception 'WCV_C3_FAILURE_NOTE_REQUIRED';
      end if;
    end if;
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
revoke all on function public.wcv_c3_load_gap_closure_case_v1(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.wcv_c3_apply_transition_v1(uuid, uuid, uuid, bigint, text, text, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
revoke all on function public.wcv_c3_delete_owned_case_v1(uuid, uuid, uuid, bigint)
  from public, anon, authenticated;

grant execute on function public.wcv_c3_create_gap_closure_case_v1(jsonb, jsonb, uuid)
  to service_role;
grant execute on function public.wcv_c3_load_gap_closure_case_v1(uuid, uuid)
  to service_role;
grant execute on function public.wcv_c3_apply_transition_v1(uuid, uuid, uuid, bigint, text, text, jsonb, jsonb, jsonb)
  to service_role;
grant execute on function public.wcv_c3_delete_owned_case_v1(uuid, uuid, uuid, bigint)
  to service_role;

-- C3R-P Practice and common durable-learning substrate v1.
-- Forward-only, default-off application runtime. This migration performs no
-- remote operation and creates no non-Practice subject outcome.

do $$
begin
  create type public.c3r_p_subject as enum ('PRACTICE');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.c3r_p_record_state as enum (
    'D0_OPEN',
    'FEEDBACK_COMMITTED',
    'REPAIRED',
    'D1_COMPLETE',
    'D7_COMPLETE',
    'CLOSED',
    'REOPENED'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.c3r_p_review_phase as enum (
    'D0',
    'D1',
    'D7_TRANSFER',
    'RECURRENCE',
    'REOPENED_REVIEW'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.c3r_p_attempt_outcome as enum (
    'FAILURE',
    'ASSISTED_SUCCESS',
    'INDEPENDENT_SUCCESS'
  );
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.c3r_p_gap_state as enum ('OPEN', 'CLOSED', 'REOPENED');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.c3r_p_plan_kind as enum ('TODAY', 'FULL_DAY');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.c3r_p_plan_state as enum (
    'PROPOSED',
    'ACCEPTED',
    'EDITED',
    'REJECTED',
    'STALE'
  );
exception
  when duplicate_object then null;
end;
$$;

create table if not exists public.c3r_p_learning_records (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject public.c3r_p_subject not null default 'PRACTICE',
  source_id text not null,
  problem_id text not null,
  revision_id text not null,
  item_id text not null,
  artifact_id text not null,
  initial_surface_id text not null,
  prediction text not null check (prediction in ('likely_success', 'likely_partial', 'likely_blocked')),
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  configuration_snapshot jsonb not null,
  configuration_digest text not null check (configuration_digest ~ '^[0-9a-f]{64}$'),
  d0_basis jsonb not null,
  state public.c3r_p_record_state not null default 'D0_OPEN',
  record_version bigint not null default 1 check (record_version > 0),
  assistance_committed boolean not null default false,
  primary_gap_id uuid,
  d1_due_at timestamptz,
  d7_due_at timestamptz,
  recurrence_due_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint c3r_p_learning_records_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  constraint c3r_p_learning_records_d0_exact check (
    d0_basis = jsonb_build_object(
      'artifactId', artifact_id,
      'confidence', confidence,
      'configurationDigest', configuration_digest,
      'configurationSnapshot', configuration_snapshot,
      'itemId', item_id,
      'prediction', prediction,
      'problemId', problem_id,
      'revisionId', revision_id,
      'sourceId', source_id,
      'subject', 'PRACTICE',
      'surfaceId', initial_surface_id
    )
  ),
  unique (user_id, id),
  unique (user_id, id, source_id, problem_id, revision_id, artifact_id),
  unique (user_id, id, source_id, problem_id, revision_id, item_id, artifact_id),
  unique (user_id, source_id, problem_id, revision_id, item_id, artifact_id)
);

create table if not exists public.c3r_p_attempts (
  id uuid primary key,
  record_id uuid not null,
  user_id uuid not null,
  subject public.c3r_p_subject not null default 'PRACTICE',
  source_id text not null,
  problem_id text not null,
  revision_id text not null,
  item_id text not null,
  artifact_id text not null,
  surface_id text not null,
  phase public.c3r_p_review_phase not null,
  outcome public.c3r_p_attempt_outcome not null,
  assistance_level smallint not null default 0 check (assistance_level between 0 and 3),
  transfer_task_id uuid,
  body text not null check (length(body) between 1 and 20000),
  validator_id text,
  proof_state text check (proof_state is null or proof_state in ('PASS', 'PARTIAL', 'BLOCKED', 'UNSUPPORTED')),
  proof_digest text check (proof_digest is null or proof_digest ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint c3r_p_attempts_record_binding_fk foreign key (
    user_id, record_id, source_id, problem_id, revision_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, source_id, problem_id, revision_id, artifact_id
  ) on delete cascade,
  constraint c3r_p_attempts_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  constraint c3r_p_attempts_independence check (
    (outcome = 'ASSISTED_SUCCESS'::public.c3r_p_attempt_outcome and assistance_level > 0)
    or (outcome <> 'ASSISTED_SUCCESS'::public.c3r_p_attempt_outcome and assistance_level = 0)
  ),
  constraint c3r_p_attempts_transfer_task_phase check (
    (phase = 'D7_TRANSFER'::public.c3r_p_review_phase) = (transfer_task_id is not null)
  ),
  unique (user_id, record_id, id)
);

create table if not exists public.c3r_p_learning_gaps (
  id uuid primary key,
  record_id uuid not null unique,
  user_id uuid not null,
  subject public.c3r_p_subject not null default 'PRACTICE',
  source_id text not null,
  problem_id text not null,
  revision_id text not null,
  item_id text not null,
  artifact_id text not null,
  concept_id text not null,
  evidence_ref text not null,
  state public.c3r_p_gap_state not null default 'OPEN',
  reopen_count integer not null default 0 check (reopen_count >= 0),
  d1_due_at timestamptz not null,
  d7_due_at timestamptz not null,
  recurrence_due_at timestamptz not null,
  closed_at timestamptz,
  reopened_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  constraint c3r_p_learning_gaps_record_binding_fk foreign key (
    user_id, record_id, source_id, problem_id, revision_id, item_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, source_id, problem_id, revision_id, item_id, artifact_id
  ) on delete cascade,
  constraint c3r_p_learning_gaps_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  constraint c3r_p_learning_gaps_evidence_ref check (
    evidence_ref like 'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#%'
  ),
  unique (user_id, record_id, id)
);

create table if not exists public.c3r_p_transfer_tasks (
  id uuid primary key,
  record_id uuid not null,
  user_id uuid not null,
  subject public.c3r_p_subject not null default 'PRACTICE',
  source_id text not null,
  problem_id text not null,
  revision_id text not null,
  item_id text not null,
  artifact_id text not null,
  surface_id text not null,
  prompt text not null check (length(prompt) between 1 and 2000),
  eligible_at timestamptz not null,
  presented_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null,
  constraint c3r_p_transfer_tasks_record_binding_fk foreign key (
    user_id, record_id, source_id, problem_id, revision_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, source_id, problem_id, revision_id, artifact_id
  ) on delete cascade,
  constraint c3r_p_transfer_tasks_practice_only check (
    subject = 'PRACTICE'::public.c3r_p_subject
  ),
  constraint c3r_p_transfer_tasks_distinct_identity check (
    item_id = 'c3r-p:practice:annual-net-income:d7-transfer-v1'
    and surface_id = 'server:practice-transfer-v1'
  ),
  constraint c3r_p_transfer_tasks_time_order check (
    (presented_at is null or presented_at >= eligible_at)
    and (completed_at is null or (presented_at is not null and completed_at >= presented_at))
  ),
  unique (user_id, record_id, id),
  unique (user_id, record_id)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.c3r_p_attempts'::regclass
      and conname = 'c3r_p_attempts_transfer_task_owner_fk'
  ) then
    alter table public.c3r_p_attempts
      add constraint c3r_p_attempts_transfer_task_owner_fk foreign key (
        user_id, record_id, transfer_task_id
      ) references public.c3r_p_transfer_tasks(user_id, record_id, id) on delete cascade;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.c3r_p_learning_records'::regclass
      and conname = 'c3r_p_learning_records_primary_gap_fk'
  ) then
    alter table public.c3r_p_learning_records
      add constraint c3r_p_learning_records_primary_gap_fk
      foreign key (user_id, id, primary_gap_id)
      references public.c3r_p_learning_gaps(user_id, record_id, id)
      deferrable initially deferred;
  end if;
end;
$$;

create table if not exists public.c3r_p_failure_notes (
  id uuid primary key,
  record_id uuid not null,
  gap_id uuid not null,
  user_id uuid not null,
  subject public.c3r_p_subject not null default 'PRACTICE',
  source_id text not null,
  problem_id text not null,
  revision_id text not null,
  item_id text not null,
  artifact_id text not null,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null,
  constraint c3r_p_failure_notes_record_binding_fk foreign key (
    user_id, record_id, source_id, problem_id, revision_id, item_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, source_id, problem_id, revision_id, item_id, artifact_id
  ) on delete cascade,
  constraint c3r_p_failure_notes_gap_owner_fk foreign key (user_id, record_id, gap_id)
    references public.c3r_p_learning_gaps(user_id, record_id, id) on delete cascade,
  constraint c3r_p_failure_notes_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  unique (record_id, gap_id)
);

create table if not exists public.c3r_p_assistance_events (
  id uuid primary key,
  record_id uuid not null,
  gap_id uuid not null,
  attempt_id uuid,
  user_id uuid not null,
  subject public.c3r_p_subject not null default 'PRACTICE',
  source_id text not null,
  problem_id text not null,
  revision_id text not null,
  item_id text not null,
  artifact_id text not null,
  assistance_kind text not null check (assistance_kind in ('BIGGEST_GAP', 'SMALLEST_SCAFFOLD')),
  assistance_level smallint not null check (assistance_level between 1 and 3),
  committed_at timestamptz not null,
  constraint c3r_p_assistance_events_record_owner_fk foreign key (
    user_id, record_id, source_id, problem_id, revision_id, item_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, source_id, problem_id, revision_id, item_id, artifact_id
  ) on delete cascade,
  constraint c3r_p_assistance_events_gap_owner_fk foreign key (user_id, record_id, gap_id)
    references public.c3r_p_learning_gaps(user_id, record_id, id) on delete cascade,
  constraint c3r_p_assistance_events_attempt_owner_fk foreign key (user_id, record_id, attempt_id)
    references public.c3r_p_attempts(user_id, record_id, id) on delete cascade,
  constraint c3r_p_assistance_events_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject)
);

create table if not exists public.c3r_p_ledger_entries (
  id uuid primary key,
  record_id uuid not null,
  gap_id uuid,
  attempt_id uuid,
  user_id uuid not null,
  subject public.c3r_p_subject not null default 'PRACTICE',
  entry_kind text not null check (entry_kind in (
    'D0_FROZEN', 'GAP_OPENED', 'REPAIR_RECORDED', 'D1_RECONSTRUCTED',
    'D1_ASSISTED', 'D7_TRANSFERRED', 'RECURRENCE_COMPLETED', 'GAP_REOPENED',
    'REOPENED_COMPLETED'
  )),
  evidence_ref text not null,
  projection jsonb not null,
  contains_body boolean not null default false check (contains_body is false),
  occurred_at timestamptz not null,
  constraint c3r_p_ledger_entries_record_owner_fk foreign key (user_id, record_id)
    references public.c3r_p_learning_records(user_id, id) on delete cascade,
  constraint c3r_p_ledger_entries_gap_owner_fk foreign key (user_id, record_id, gap_id)
    references public.c3r_p_learning_gaps(user_id, record_id, id) on delete cascade,
  constraint c3r_p_ledger_entries_attempt_owner_fk foreign key (user_id, record_id, attempt_id)
    references public.c3r_p_attempts(user_id, record_id, id) on delete cascade,
  constraint c3r_p_ledger_entries_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  constraint c3r_p_ledger_entries_bodyless check (
    not (projection ?| array['body', 'attemptBody', 'failureNote', 'rawText', 'ocrText'])
  )
);

create table if not exists public.c3r_p_plans (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject public.c3r_p_subject not null default 'PRACTICE',
  plan_kind public.c3r_p_plan_kind not null,
  state public.c3r_p_plan_state not null default 'PROPOSED',
  record_version bigint not null default 1 check (record_version > 0),
  available_minutes integer not null check (available_minutes between 30 and 720),
  eligibility_digest text not null check (eligibility_digest ~ '^[0-9a-f]{64}$'),
  review_state_digest text not null check (review_state_digest ~ '^[0-9a-f]{64}$'),
  generated_at timestamptz not null,
  updated_at timestamptz not null,
  constraint c3r_p_plans_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  unique (user_id, id)
);

create table if not exists public.c3r_p_plan_blocks (
  id uuid primary key,
  plan_id uuid not null,
  user_id uuid not null,
  subject public.c3r_p_subject not null default 'PRACTICE',
  record_id uuid not null,
  gap_id uuid not null,
  review_phase public.c3r_p_review_phase not null,
  block_kind text not null check (block_kind in ('CORE_OUTCOME', 'SUPPORT')),
  ordinal integer not null check (ordinal > 0),
  minutes integer not null check (minutes between 1 and 1440),
  execution_state text not null default 'PENDING' check (execution_state in ('PENDING', 'COMPLETE')),
  constraint c3r_p_plan_blocks_plan_owner_fk foreign key (user_id, plan_id)
    references public.c3r_p_plans(user_id, id) on delete cascade,
  constraint c3r_p_plan_blocks_record_owner_fk foreign key (user_id, record_id)
    references public.c3r_p_learning_records(user_id, id) on delete cascade,
  constraint c3r_p_plan_blocks_gap_owner_fk foreign key (user_id, record_id, gap_id)
    references public.c3r_p_learning_gaps(user_id, record_id, id) on delete cascade,
  constraint c3r_p_plan_blocks_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  unique (plan_id, ordinal),
  unique (plan_id, record_id, gap_id, review_phase)
);

create table if not exists public.c3r_p_command_receipts (
  command_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject public.c3r_p_subject not null default 'PRACTICE',
  action text not null,
  request_sha256 text not null check (request_sha256 ~ '^[0-9a-f]{64}$'),
  aggregate_id uuid,
  resulting_version bigint not null check (resulting_version >= 0),
  response_metadata jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint c3r_p_command_receipts_practice_only check (subject = 'PRACTICE'::public.c3r_p_subject),
  constraint c3r_p_command_receipts_metadata_bodyless check (
    not (response_metadata ?| array['body', 'attemptBody', 'failureNote', 'rawText', 'ocrText'])
  ),
  primary key (user_id, command_id)
);

create index if not exists c3r_p_learning_records_user_idx
  on public.c3r_p_learning_records(user_id, updated_at desc);
create index if not exists c3r_p_attempts_user_record_idx
  on public.c3r_p_attempts(user_id, record_id, occurred_at);
create index if not exists c3r_p_learning_gaps_queue_idx
  on public.c3r_p_learning_gaps(user_id, state, d1_due_at, d7_due_at, recurrence_due_at);
create index if not exists c3r_p_failure_notes_user_record_idx
  on public.c3r_p_failure_notes(user_id, record_id);
create index if not exists c3r_p_assistance_events_user_record_idx
  on public.c3r_p_assistance_events(user_id, record_id, committed_at);
create index if not exists c3r_p_ledger_entries_user_time_idx
  on public.c3r_p_ledger_entries(user_id, occurred_at desc);
create index if not exists c3r_p_transfer_tasks_user_record_idx
  on public.c3r_p_transfer_tasks(user_id, record_id, eligible_at);
create index if not exists c3r_p_plans_user_time_idx
  on public.c3r_p_plans(user_id, generated_at desc);
create index if not exists c3r_p_plan_blocks_user_plan_idx
  on public.c3r_p_plan_blocks(user_id, plan_id, ordinal);
create index if not exists c3r_p_command_receipts_aggregate_idx
  on public.c3r_p_command_receipts(user_id, aggregate_id, created_at);

create or replace function public.c3r_p_preserve_immutable_d0_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.user_id <> old.user_id
    or new.subject <> old.subject
    or new.source_id <> old.source_id
    or new.problem_id <> old.problem_id
    or new.revision_id <> old.revision_id
    or new.item_id <> old.item_id
    or new.artifact_id <> old.artifact_id
    or new.initial_surface_id <> old.initial_surface_id
    or new.prediction <> old.prediction
    or new.confidence <> old.confidence
    or new.configuration_snapshot <> old.configuration_snapshot
    or new.configuration_digest <> old.configuration_digest
    or new.d0_basis <> old.d0_basis then
    raise exception 'C3R_P_IMMUTABLE_D0' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists c3r_p_preserve_immutable_d0_v1 on public.c3r_p_learning_records;
create trigger c3r_p_preserve_immutable_d0_v1
before update on public.c3r_p_learning_records
for each row execute function public.c3r_p_preserve_immutable_d0_v1();

create or replace function public.c3r_p_require_exact_keys_v1(
  p_value jsonb,
  p_keys text[]
)
returns void
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  v_actual text[];
  v_expected text[];
begin
  if jsonb_typeof(p_value) <> 'object' then
    raise exception 'C3R_P_INVALID_INPUT' using errcode = '22023';
  end if;
  select coalesce(array_agg(key order by key), array[]::text[])
    into v_actual from jsonb_object_keys(p_value) as key;
  select coalesce(array_agg(key order by key), array[]::text[])
    into v_expected from unnest(p_keys) as key;
  if v_actual <> v_expected then
    raise exception 'C3R_P_INVALID_INPUT' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.c3r_p_eligibility_digest_v1(
  p_user_id uuid,
  p_as_of timestamptz
)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(coalesce(string_agg(
    concat_ws(':', g.id::text, g.state::text, g.reopen_count::text,
      case r.state
        when 'REPAIRED' then 'D1'
        when 'D1_COMPLETE' then 'D7_TRANSFER'
        when 'D7_COMPLETE' then 'RECURRENCE'
        when 'REOPENED' then 'REOPENED_REVIEW'
        else 'INELIGIBLE'
      end,
      case
        when r.state = 'REPAIRED' then g.d1_due_at::text
        when r.state = 'D1_COMPLETE' then g.d7_due_at::text
        else g.recurrence_due_at::text
      end),
    ',' order by g.id), ''), 'UTF8'), 'sha256'), 'hex')
  from public.c3r_p_learning_gaps g
  join public.c3r_p_learning_records r
    on r.id = g.record_id and r.user_id = g.user_id
  where g.user_id = p_user_id
    and g.state in ('OPEN', 'REOPENED')
    and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')
    and case
      when r.state = 'REPAIRED' then g.d1_due_at <= p_as_of
      when r.state = 'D1_COMPLETE' then g.d7_due_at <= p_as_of
      else g.recurrence_due_at <= p_as_of
    end;
$$;

create or replace function public.c3r_p_review_state_digest_v1(p_user_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(coalesce(string_agg(
    concat_ws(':', r.id::text, r.record_version::text, r.state::text,
      coalesce(g.state::text, 'NONE'), coalesce(g.reopen_count::text, '0'),
      (select count(*)::text from public.c3r_p_attempts a
        where a.user_id = r.user_id and a.record_id = r.id)),
    ',' order by r.id), ''), 'UTF8'), 'sha256'), 'hex')
  from public.c3r_p_learning_records r
  left join public.c3r_p_learning_gaps g
    on g.record_id = r.id and g.user_id = r.user_id
  where r.user_id = p_user_id;
$$;

create or replace function public.c3r_p_apply_learning_command_v1(
  p_user_id uuid,
  p_command_id uuid,
  p_expected_version bigint,
  p_action text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt public.c3r_p_command_receipts%rowtype;
  v_record public.c3r_p_learning_records%rowtype;
  v_plan public.c3r_p_plans%rowtype;
  v_transfer_task public.c3r_p_transfer_tasks%rowtype;
  v_record_id uuid;
  v_attempt_id uuid;
  v_gap_id uuid;
  v_now timestamptz;
  v_request_sha text;
  v_response jsonb;
  v_phase public.c3r_p_review_phase;
  v_outcome public.c3r_p_attempt_outcome;
  v_entry_kind text;
  v_completed_plan_blocks integer;
  v_candidate_plan_blocks integer;
  v_resolved_plan_block_id uuid;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null or p_command_id is null or p_expected_version < 0
    or p_action is null or p_action = '' then
    raise exception 'C3R_P_INVALID_INPUT' using errcode = '22023';
  end if;
  v_request_sha := encode(extensions.digest(
    convert_to(p_action || chr(31) || p_payload::text, 'UTF8'), 'sha256'
  ), 'hex');
  select * into v_receipt
  from public.c3r_p_command_receipts
  where user_id = p_user_id and command_id = p_command_id;
  if found then
    if v_receipt.action <> p_action or v_receipt.request_sha256 <> v_request_sha then
      raise exception 'C3R_P_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return v_receipt.response_metadata;
  end if;

  if p_action = 'start' then
    perform public.c3r_p_require_exact_keys_v1(p_payload, array[
      'artifactId', 'attemptBody', 'attemptId', 'confidence', 'itemId',
      'configurationDigest', 'configurationSnapshot', 'occurredAt', 'prediction',
      'problemId', 'recordId', 'revisionId', 'sourceId', 'surfaceId'
    ]);
    if p_expected_version <> 0 then
      raise exception 'C3R_P_CAS_CONFLICT' using errcode = '40001';
    end if;
    v_record_id := (p_payload ->> 'recordId')::uuid;
    v_attempt_id := (p_payload ->> 'attemptId')::uuid;
    v_now := (p_payload ->> 'occurredAt')::timestamptz;
    insert into public.c3r_p_learning_records (
      id, user_id, source_id, problem_id, revision_id, item_id, artifact_id,
      initial_surface_id, prediction, confidence, configuration_snapshot,
      configuration_digest, d0_basis, created_at, updated_at
    ) values (
      v_record_id, p_user_id, p_payload ->> 'sourceId', p_payload ->> 'problemId',
      p_payload ->> 'revisionId', p_payload ->> 'itemId', p_payload ->> 'artifactId',
      p_payload ->> 'surfaceId', p_payload ->> 'prediction', p_payload ->> 'confidence',
      p_payload -> 'configurationSnapshot', p_payload ->> 'configurationDigest',
      jsonb_build_object(
        'artifactId', p_payload ->> 'artifactId',
        'confidence', p_payload ->> 'confidence',
        'configurationDigest', p_payload ->> 'configurationDigest',
        'configurationSnapshot', p_payload -> 'configurationSnapshot',
        'itemId', p_payload ->> 'itemId',
        'prediction', p_payload ->> 'prediction',
        'problemId', p_payload ->> 'problemId',
        'revisionId', p_payload ->> 'revisionId',
        'sourceId', p_payload ->> 'sourceId',
        'subject', 'PRACTICE',
        'surfaceId', p_payload ->> 'surfaceId'
      ),
      v_now, v_now
    ) returning * into v_record;
    insert into public.c3r_p_attempts (
      id, record_id, user_id, source_id, problem_id, revision_id, item_id,
      artifact_id, surface_id, phase, outcome, body, occurred_at
    ) values (
      v_attempt_id, v_record.id, p_user_id, v_record.source_id, v_record.problem_id,
      v_record.revision_id, v_record.item_id, v_record.artifact_id,
      v_record.initial_surface_id, 'D0', 'FAILURE', p_payload ->> 'attemptBody', v_now
    );
    insert into public.c3r_p_ledger_entries (
      id, record_id, attempt_id, user_id, entry_kind, evidence_ref, projection, occurred_at
    ) values (
      gen_random_uuid(), v_record.id, v_attempt_id, p_user_id, 'D0_FROZEN',
      'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#706:FROZEN_D0',
      jsonb_build_object('phase', 'D0', 'sourceId', v_record.source_id,
        'revisionId', v_record.revision_id, 'itemId', v_record.item_id,
        'artifactId', v_record.artifact_id), v_now
    );
    v_response := jsonb_build_object('recordId', v_record.id, 'recordVersion', 1,
      'state', v_record.state, 'status', 'applied');
  else
    v_record_id := (p_payload ->> 'recordId')::uuid;
    select * into v_record from public.c3r_p_learning_records
      where id = v_record_id and user_id = p_user_id for update;
    if not found then
      raise exception 'C3R_P_NOT_FOUND' using errcode = 'P0002';
    end if;
    if v_record.record_version <> p_expected_version then
      raise exception 'C3R_P_CAS_CONFLICT' using errcode = '40001';
    end if;
    if p_payload ->> 'configurationDigest' <> v_record.configuration_digest then
      raise exception 'C3R_P_FROZEN_CONFIGURATION_MISMATCH' using errcode = '23514';
    end if;

    if p_action = 'present_d7_transfer_task' then
      perform public.c3r_p_require_exact_keys_v1(p_payload, array[
        'configurationDigest', 'occurredAt', 'recordId', 'transferTaskId'
      ]);
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      if v_record.state <> 'D1_COMPLETE' or v_now < v_record.d7_due_at then
        raise exception 'C3R_P_TRANSFER_NOT_ELIGIBLE' using errcode = '23514';
      end if;
      select * into v_transfer_task from public.c3r_p_transfer_tasks
      where id = (p_payload ->> 'transferTaskId')::uuid
        and user_id = p_user_id
        and record_id = v_record.id
        and source_id = v_record.source_id
        and problem_id = v_record.problem_id
        and revision_id = v_record.revision_id
        and artifact_id = v_record.artifact_id
        and item_id <> v_record.item_id
        and surface_id <> v_record.initial_surface_id
        and presented_at is null
        and completed_at is null
      for update;
      if not found then
        raise exception 'C3R_P_TRANSFER_TASK_NOT_CURRENT' using errcode = '23514';
      end if;
      update public.c3r_p_transfer_tasks set presented_at = v_now
      where id = v_transfer_task.id and user_id = p_user_id
      returning * into v_transfer_task;
      v_response := jsonb_build_object('recordId', v_record.id,
        'recordVersion', v_record.record_version, 'state', v_record.state,
        'status', 'applied');
    elsif p_action = 'commit_feedback' then
      perform public.c3r_p_require_exact_keys_v1(p_payload, array[
        'assistanceEventId', 'assistanceKind', 'conceptId', 'configurationDigest',
        'd1DueAt', 'd7DueAt', 'evidenceRef', 'failureNote', 'failureNoteId',
        'gapId', 'occurredAt', 'recordId', 'recurrenceDueAt'
      ]);
      if v_record.state <> 'D0_OPEN' or v_record.assistance_committed then
        raise exception 'C3R_P_INVALID_TRANSITION' using errcode = '23514';
      end if;
      v_gap_id := (p_payload ->> 'gapId')::uuid;
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      insert into public.c3r_p_learning_gaps (
        id, record_id, user_id, source_id, problem_id, revision_id, item_id, artifact_id,
        concept_id, evidence_ref, d1_due_at, d7_due_at, recurrence_due_at,
        created_at, updated_at
      ) values (
        v_gap_id, v_record.id, p_user_id, v_record.source_id,
        v_record.problem_id, v_record.revision_id, v_record.item_id, v_record.artifact_id,
        p_payload ->> 'conceptId',
        p_payload ->> 'evidenceRef', (p_payload ->> 'd1DueAt')::timestamptz,
        (p_payload ->> 'd7DueAt')::timestamptz,
        (p_payload ->> 'recurrenceDueAt')::timestamptz, v_now, v_now
      );
      insert into public.c3r_p_failure_notes (
        id, record_id, gap_id, user_id, source_id, problem_id, revision_id,
        item_id, artifact_id, body, created_at
      ) values (
        (p_payload ->> 'failureNoteId')::uuid, v_record.id, v_gap_id, p_user_id,
        v_record.source_id, v_record.problem_id, v_record.revision_id,
        v_record.item_id, v_record.artifact_id, p_payload ->> 'failureNote', v_now
      );
      insert into public.c3r_p_assistance_events (
        id, record_id, gap_id, user_id, source_id, problem_id, revision_id,
        item_id, artifact_id, assistance_kind, assistance_level, committed_at
      ) values (
        (p_payload ->> 'assistanceEventId')::uuid, v_record.id, v_gap_id, p_user_id,
        v_record.source_id, v_record.problem_id, v_record.revision_id,
        v_record.item_id, v_record.artifact_id, p_payload ->> 'assistanceKind', 1, v_now
      );
      update public.c3r_p_learning_records set
        state = 'FEEDBACK_COMMITTED', record_version = record_version + 1,
        assistance_committed = true, primary_gap_id = v_gap_id,
        d1_due_at = (p_payload ->> 'd1DueAt')::timestamptz,
        d7_due_at = (p_payload ->> 'd7DueAt')::timestamptz,
        recurrence_due_at = (p_payload ->> 'recurrenceDueAt')::timestamptz,
        updated_at = v_now
      where id = v_record.id returning * into v_record;
      insert into public.c3r_p_ledger_entries (
        id, record_id, gap_id, user_id, entry_kind, evidence_ref, projection, occurred_at
      ) values (
        gen_random_uuid(), v_record.id, v_gap_id, p_user_id, 'GAP_OPENED',
        p_payload ->> 'evidenceRef',
        jsonb_build_object('conceptId', p_payload ->> 'conceptId', 'state', 'OPEN'), v_now
      );
    elsif p_action = 'submit_repair' then
      perform public.c3r_p_require_exact_keys_v1(p_payload, array[
        'attemptBody', 'attemptId', 'configurationDigest', 'occurredAt',
        'proofDigest', 'recordId', 'validatorId'
      ]);
      if v_record.state <> 'FEEDBACK_COMMITTED'
        or p_payload ->> 'validatorId' <> 'validator:practice-calculation-claim@2' then
        raise exception 'C3R_P_STRUCTURED_PROOF_REQUIRED' using errcode = '23514';
      end if;
      v_attempt_id := (p_payload ->> 'attemptId')::uuid;
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      insert into public.c3r_p_attempts (
        id, record_id, user_id, source_id, problem_id, revision_id, item_id,
        artifact_id, surface_id, phase, outcome, assistance_level, body,
        validator_id, proof_state, proof_digest, occurred_at
      ) values (
        v_attempt_id, v_record.id, p_user_id, v_record.source_id, v_record.problem_id,
        v_record.revision_id, v_record.item_id, v_record.artifact_id,
        v_record.initial_surface_id, 'D0', 'ASSISTED_SUCCESS', 1,
        p_payload ->> 'attemptBody', p_payload ->> 'validatorId', 'PASS',
        p_payload ->> 'proofDigest', v_now
      );
      update public.c3r_p_learning_records set state = 'REPAIRED',
        record_version = record_version + 1, updated_at = v_now
      where id = v_record.id returning * into v_record;
      insert into public.c3r_p_ledger_entries (
        id, record_id, gap_id, attempt_id, user_id, entry_kind,
        evidence_ref, projection, occurred_at
      ) values (
        gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id, p_user_id,
        'REPAIR_RECORDED',
        'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#707:EXACT_SOURCE_ATTEMPT_ARTIFACT_ITEM_BINDING',
        jsonb_build_object('outcome', 'ASSISTED_SUCCESS', 'validatorId', p_payload ->> 'validatorId'), v_now
      );
    elsif p_action in (
      'record_assisted_review', 'complete_d1', 'complete_d7_transfer',
      'complete_recurrence', 'complete_reopened_review', 'record_later_failure'
    ) then
      if p_action = 'complete_d1' then
        perform public.c3r_p_require_exact_keys_v1(p_payload, array[
          'attemptBody', 'attemptId', 'configurationDigest', 'itemId', 'occurredAt',
          'planBlockId', 'planId', 'planVersion', 'proofDigest', 'recordId',
          'surfaceId', 'transferTaskId', 'validatorId'
        ]);
      elsif p_action = 'complete_d7_transfer' then
        perform public.c3r_p_require_exact_keys_v1(p_payload, array[
          'attemptBody', 'attemptId', 'configurationDigest', 'itemId', 'occurredAt',
          'planBlockId', 'planId', 'planVersion', 'proofDigest', 'recordId',
          'surfaceId', 'transferTaskId', 'validatorId'
        ]);
      elsif p_action in (
        'complete_recurrence', 'complete_reopened_review') then
        perform public.c3r_p_require_exact_keys_v1(p_payload, array[
          'attemptBody', 'attemptId', 'configurationDigest', 'itemId', 'occurredAt',
          'planBlockId', 'planId', 'planVersion', 'proofDigest', 'recordId',
          'surfaceId', 'validatorId'
        ]);
      else
        perform public.c3r_p_require_exact_keys_v1(p_payload, array[
          'attemptBody', 'attemptId', 'configurationDigest', 'itemId', 'occurredAt',
          'proofDigest', 'recordId', 'surfaceId', 'validatorId'
        ]);
      end if;
      if p_payload ->> 'validatorId' <> 'validator:practice-calculation-claim@2' then
        raise exception 'C3R_P_STRUCTURED_PROOF_REQUIRED' using errcode = '23514';
      end if;
      v_attempt_id := (p_payload ->> 'attemptId')::uuid;
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      if p_action = 'record_assisted_review' then
        v_phase := 'D1'; v_outcome := 'ASSISTED_SUCCESS';
        if v_record.state <> 'REPAIRED' then
          raise exception 'C3R_P_INVALID_TRANSITION' using errcode = '23514';
        end if;
      elsif p_action = 'complete_d1' then
        v_phase := 'D1'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'D1_RECONSTRUCTED';
        if v_record.state <> 'REPAIRED' or v_now < v_record.d1_due_at then
          raise exception 'C3R_P_D1_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      elsif p_action = 'complete_d7_transfer' then
        v_phase := 'D7_TRANSFER'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'D7_TRANSFERRED';
        if v_record.state <> 'D1_COMPLETE' or v_now < v_record.d7_due_at
          or p_payload ->> 'itemId' = v_record.item_id
          or p_payload ->> 'surfaceId' = v_record.initial_surface_id then
          raise exception 'C3R_P_TRANSFER_NOT_ELIGIBLE' using errcode = '23514';
        end if;
        select * into v_transfer_task from public.c3r_p_transfer_tasks
        where id = (p_payload ->> 'transferTaskId')::uuid
          and user_id = p_user_id
          and record_id = v_record.id
          and source_id = v_record.source_id
          and problem_id = v_record.problem_id
          and revision_id = v_record.revision_id
          and artifact_id = v_record.artifact_id
          and item_id = p_payload ->> 'itemId'
          and surface_id = p_payload ->> 'surfaceId'
          and item_id <> v_record.item_id
          and surface_id <> v_record.initial_surface_id
          and eligible_at <= v_now
          and presented_at is not null
          and presented_at <= v_now
          and completed_at is null
        for update;
        if not found then
          raise exception 'C3R_P_TRANSFER_TASK_NOT_CURRENT' using errcode = '23514';
        end if;
      elsif p_action = 'complete_recurrence' then
        v_phase := 'RECURRENCE'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'RECURRENCE_COMPLETED';
        if v_record.state <> 'D7_COMPLETE' or v_now < v_record.recurrence_due_at then
          raise exception 'C3R_P_RECURRENCE_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      elsif p_action = 'complete_reopened_review' then
        v_phase := 'REOPENED_REVIEW'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'REOPENED_COMPLETED';
        if v_record.state <> 'REOPENED' then
          raise exception 'C3R_P_REOPENED_COMPLETION_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      else
        v_phase := 'RECURRENCE'; v_outcome := 'FAILURE'; v_entry_kind := 'GAP_REOPENED';
        if v_record.state <> 'CLOSED' then
          raise exception 'C3R_P_REOPEN_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      end if;
      if p_action <> 'complete_d7_transfer'
        and p_payload ->> 'itemId' <> v_record.item_id then
        raise exception 'C3R_P_ATTEMPT_ITEM_MISMATCH' using errcode = '23514';
      end if;
      if p_action in ('complete_d1', 'complete_d7_transfer',
        'complete_recurrence', 'complete_reopened_review') then
        select p.* into v_plan
        from public.c3r_p_plans p
        where p.user_id = p_user_id
          and p.state in ('ACCEPTED', 'EDITED')
          and exists (
            select 1 from public.c3r_p_plan_blocks relevant
            where relevant.user_id = p_user_id
              and relevant.plan_id = p.id
              and relevant.record_id = v_record.id
              and relevant.gap_id = v_record.primary_gap_id
              and relevant.review_phase = v_phase
          )
        order by p.generated_at desc, p.id
        limit 1
        for update;
        if found then
          if v_plan.eligibility_digest <>
              public.c3r_p_eligibility_digest_v1(p_user_id, v_now)
            or v_plan.review_state_digest <>
              public.c3r_p_review_state_digest_v1(p_user_id) then
            raise exception 'C3R_P_PLAN_BLOCK_STALE' using errcode = '23514';
          end if;
          if p_payload ->> 'planId' is null
            or (p_payload ->> 'planId')::uuid <> v_plan.id
            or p_payload ->> 'planVersion' is null
            or (p_payload ->> 'planVersion')::bigint <> v_plan.record_version then
            raise exception 'C3R_P_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
          end if;
          select count(*), min(b.id::text)::uuid
          into v_candidate_plan_blocks, v_resolved_plan_block_id
          from public.c3r_p_plan_blocks b
          where b.user_id = p_user_id
            and b.plan_id = v_plan.id
            and b.record_id = v_record.id
            and b.gap_id = v_record.primary_gap_id
            and b.review_phase = v_phase
            and b.execution_state = 'PENDING';
          if v_candidate_plan_blocks <> 1
            or p_payload ->> 'planBlockId' is null
            or (p_payload ->> 'planBlockId')::uuid <> v_resolved_plan_block_id then
            raise exception 'C3R_P_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
          end if;
        elsif p_payload ->> 'planBlockId' is not null
          or p_payload ->> 'planId' is not null
          or p_payload ->> 'planVersion' is not null then
          raise exception 'C3R_P_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
        end if;
      end if;
      insert into public.c3r_p_attempts (
        id, record_id, user_id, source_id, problem_id, revision_id, item_id,
        artifact_id, surface_id, phase, outcome, assistance_level, transfer_task_id, body,
        validator_id, proof_state, proof_digest, occurred_at
      ) values (
        v_attempt_id, v_record.id, p_user_id, v_record.source_id, v_record.problem_id,
        v_record.revision_id, p_payload ->> 'itemId', v_record.artifact_id,
        p_payload ->> 'surfaceId', v_phase, v_outcome,
        case when v_outcome = 'ASSISTED_SUCCESS' then 1 else 0 end,
        case when p_action = 'complete_d7_transfer'
          then (p_payload ->> 'transferTaskId')::uuid else null end,
        p_payload ->> 'attemptBody', p_payload ->> 'validatorId',
        case when v_outcome = 'FAILURE' then 'PARTIAL' else 'PASS' end,
        p_payload ->> 'proofDigest', v_now
      );
      if p_action = 'record_assisted_review' then
        insert into public.c3r_p_assistance_events (
          id, record_id, gap_id, attempt_id, user_id, source_id, problem_id,
          revision_id, item_id, artifact_id, assistance_kind, assistance_level,
          committed_at
        ) values (
          gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id,
          p_user_id, v_record.source_id, v_record.problem_id, v_record.revision_id,
          v_record.item_id, v_record.artifact_id, 'SMALLEST_SCAFFOLD', 1, v_now
        );
        insert into public.c3r_p_ledger_entries (
          id, record_id, gap_id, attempt_id, user_id, entry_kind,
          evidence_ref, projection, occurred_at
        ) values (
          gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id,
          p_user_id, 'D1_ASSISTED',
          'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#707:COMPLETE_ASSISTANCE_PLAN_BLOCK_EXPORT',
          jsonb_build_object(
            'phase', 'D1', 'outcome', 'ASSISTED_SUCCESS',
            'assistanceKind', 'SMALLEST_SCAFFOLD', 'assistanceLevel', 1,
            'sourceId', v_record.source_id, 'revisionId', v_record.revision_id,
            'itemId', v_record.item_id
          ), v_now
        );
        v_response := jsonb_build_object('recordId', v_record.id,
          'recordVersion', v_record.record_version, 'state', v_record.state,
          'status', 'assisted_not_independent');
      else
        update public.c3r_p_learning_records set
          state = case p_action
            when 'complete_d1' then 'D1_COMPLETE'::public.c3r_p_record_state
            when 'complete_d7_transfer' then 'D7_COMPLETE'::public.c3r_p_record_state
            when 'complete_recurrence' then 'CLOSED'::public.c3r_p_record_state
            when 'complete_reopened_review' then 'CLOSED'::public.c3r_p_record_state
            else 'REOPENED'::public.c3r_p_record_state end,
          record_version = record_version + 1,
          updated_at = v_now
        where id = v_record.id returning * into v_record;
        if p_action = 'complete_d1' then
          insert into public.c3r_p_transfer_tasks (
            id, record_id, user_id, source_id, problem_id, revision_id, item_id,
            artifact_id, surface_id, prompt, eligible_at, created_at
          ) values (
            (p_payload ->> 'transferTaskId')::uuid, v_record.id, p_user_id,
            v_record.source_id, v_record.problem_id, v_record.revision_id,
            'c3r-p:practice:annual-net-income:d7-transfer-v1', v_record.artifact_id,
            'server:practice-transfer-v1',
            '별도 전이 과업: 연간 총수익 150,000,000원과 연간 운영비 30,000,000원을 사용해 연간 순수익을 직접 계산하세요. 결과와 단위를 제출하기 전에는 정답을 공개하지 않습니다.',
            v_record.d7_due_at, v_now
          );
        elsif p_action = 'complete_d7_transfer' then
          update public.c3r_p_transfer_tasks set completed_at = v_now
          where id = v_transfer_task.id and user_id = p_user_id;
        end if;
        if p_action in ('complete_recurrence', 'complete_reopened_review') then
          update public.c3r_p_learning_gaps set state = 'CLOSED', closed_at = v_now,
            updated_at = v_now
          where id = v_record.primary_gap_id
            and user_id = p_user_id
            and record_id = v_record.id;
        elsif p_action = 'record_later_failure' then
          update public.c3r_p_learning_gaps set state = 'REOPENED',
            reopen_count = reopen_count + 1, reopened_at = v_now,
            recurrence_due_at = v_now, updated_at = v_now
          where id = v_record.primary_gap_id;
        else
          update public.c3r_p_learning_gaps set updated_at = v_now
          where id = v_record.primary_gap_id
            and user_id = p_user_id
            and record_id = v_record.id;
        end if;
        if v_plan.id is not null then
          update public.c3r_p_plan_blocks set execution_state = 'COMPLETE'
          where id = v_resolved_plan_block_id
            and user_id = p_user_id
            and plan_id = v_plan.id
            and execution_state = 'PENDING';
          get diagnostics v_completed_plan_blocks = row_count;
          if v_completed_plan_blocks <> 1 then
            raise exception 'C3R_P_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
          end if;
          update public.c3r_p_plans set
            eligibility_digest = public.c3r_p_eligibility_digest_v1(p_user_id, v_now),
            review_state_digest = public.c3r_p_review_state_digest_v1(p_user_id),
            record_version = record_version + 1,
            updated_at = v_now
          where id = v_plan.id and user_id = p_user_id;
        end if;
        insert into public.c3r_p_ledger_entries (
          id, record_id, gap_id, attempt_id, user_id, entry_kind,
          evidence_ref, projection, occurred_at
        ) values (
          gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id, p_user_id,
          v_entry_kind,
          case v_entry_kind
            when 'D1_RECONSTRUCTED' then 'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#706:D_PLUS_1_UNAIDED_RECONSTRUCTION'
            when 'D7_TRANSFERRED' then 'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#706:SEALED_NON_SAME_SURFACE_D_PLUS_7_TRANSFER'
            when 'RECURRENCE_COMPLETED' then 'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#706:TIMED_RECURRENCE'
            when 'REOPENED_COMPLETED' then 'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#706:POST_REOPEN_INDEPENDENT_COMPLETION'
            else 'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#706:LATER_FAILURE_REOPEN'
          end,
          jsonb_build_object('phase', v_phase, 'outcome', v_outcome,
            'itemId', p_payload ->> 'itemId', 'surfaceId', p_payload ->> 'surfaceId',
            'planBlockId', p_payload ->> 'planBlockId',
            'planId', p_payload ->> 'planId',
            'planVersion', p_payload ->> 'planVersion',
            'transferTaskId', p_payload ->> 'transferTaskId'), v_now
        );
      end if;
    else
      raise exception 'C3R_P_INVALID_ACTION' using errcode = '22023';
    end if;
    if v_response is null then
      v_response := jsonb_build_object('recordId', v_record.id,
        'recordVersion', v_record.record_version, 'state', v_record.state,
        'status', 'applied');
    end if;
  end if;

  insert into public.c3r_p_command_receipts (
    command_id, user_id, action, request_sha256, aggregate_id,
    resulting_version, response_metadata
  ) values (
    p_command_id, p_user_id, p_action, v_request_sha, v_record_id,
    coalesce((v_response ->> 'recordVersion')::bigint, 0), v_response
  );
  return v_response;
exception
  when invalid_text_representation or null_value_not_allowed or string_data_right_truncation then
    raise exception 'C3R_P_INVALID_INPUT' using errcode = '22023';
end;
$$;

create or replace function public.c3r_p_create_plan_v1(
  p_user_id uuid,
  p_command_id uuid,
  p_plan_id uuid,
  p_plan_kind public.c3r_p_plan_kind,
  p_available_minutes integer,
  p_as_of timestamptz,
  p_blocks jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt public.c3r_p_command_receipts%rowtype;
  v_eligibility text;
  v_review text;
  v_block jsonb;
  v_core_count integer;
  v_minutes integer;
  v_request_sha text;
  v_response jsonb;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) = 0
    or p_available_minutes not between 30 and 720 then
    raise exception 'C3R_P_INVALID_PLAN' using errcode = '22023';
  end if;
  v_request_sha := encode(extensions.digest(convert_to(concat_ws(chr(31),
    p_plan_id::text, p_plan_kind::text, p_available_minutes::text,
    p_as_of::text, p_blocks::text), 'UTF8'), 'sha256'), 'hex');
  select * into v_receipt from public.c3r_p_command_receipts
    where user_id = p_user_id and command_id = p_command_id;
  if found then
    if v_receipt.action <> 'create_plan' or v_receipt.request_sha256 <> v_request_sha then
      raise exception 'C3R_P_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return v_receipt.response_metadata;
  end if;
  select count(*) filter (where value ->> 'blockKind' = 'CORE_OUTCOME'),
    coalesce(sum((value ->> 'minutes')::integer), 0)
  into v_core_count, v_minutes from jsonb_array_elements(p_blocks);
  if v_core_count > 3 or v_minutes > p_available_minutes then
    raise exception 'C3R_P_INVALID_PLAN' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_blocks) block
    group by block ->> 'recordId', block ->> 'gapId', block ->> 'reviewPhase'
    having count(*) > 1
  ) then
    raise exception 'C3R_P_PLAN_BLOCK_AMBIGUOUS' using errcode = '23514';
  end if;
  v_eligibility := public.c3r_p_eligibility_digest_v1(p_user_id, p_as_of);
  v_review := public.c3r_p_review_state_digest_v1(p_user_id);
  insert into public.c3r_p_plans (
    id, user_id, plan_kind, available_minutes, eligibility_digest,
    review_state_digest, generated_at, updated_at
  ) values (
    p_plan_id, p_user_id, p_plan_kind, p_available_minutes, v_eligibility,
    v_review, p_as_of, p_as_of
  );
  for v_block in select value from jsonb_array_elements(p_blocks) loop
    perform public.c3r_p_require_exact_keys_v1(v_block,
      array['blockId', 'blockKind', 'gapId', 'minutes', 'ordinal', 'recordId',
        'reviewPhase']);
    if not exists (
      select 1 from public.c3r_p_learning_gaps g
      join public.c3r_p_learning_records r
        on r.user_id = g.user_id and r.id = g.record_id
      where g.user_id = p_user_id
        and g.id = (v_block ->> 'gapId')::uuid
        and r.id = (v_block ->> 'recordId')::uuid
        and g.state in ('OPEN', 'REOPENED')
        and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')
        and v_block ->> 'reviewPhase' = case r.state
          when 'REPAIRED' then 'D1'
          when 'D1_COMPLETE' then 'D7_TRANSFER'
          when 'D7_COMPLETE' then 'RECURRENCE'
          when 'REOPENED' then 'REOPENED_REVIEW'
          else 'INELIGIBLE' end
        and case
          when r.state = 'REPAIRED' then g.d1_due_at
          when r.state = 'D1_COMPLETE' then g.d7_due_at
          else g.recurrence_due_at end <= p_as_of
    ) then
      raise exception 'C3R_P_PLAN_ITEM_NOT_ELIGIBLE' using errcode = '23514';
    end if;
    insert into public.c3r_p_plan_blocks (
      id, plan_id, user_id, record_id, gap_id, review_phase, block_kind,
      ordinal, minutes
    ) values (
      (v_block ->> 'blockId')::uuid, p_plan_id, p_user_id,
      (v_block ->> 'recordId')::uuid, (v_block ->> 'gapId')::uuid,
      (v_block ->> 'reviewPhase')::public.c3r_p_review_phase,
      v_block ->> 'blockKind', (v_block ->> 'ordinal')::integer,
      (v_block ->> 'minutes')::integer
    );
  end loop;
  v_response := jsonb_build_object('planId', p_plan_id, 'recordVersion', 1,
    'state', 'PROPOSED', 'eligibilityDigest', v_eligibility,
    'reviewStateDigest', v_review, 'status', 'applied');
  insert into public.c3r_p_command_receipts (
    command_id, user_id, action, request_sha256, aggregate_id,
    resulting_version, response_metadata
  ) values (
    p_command_id, p_user_id, 'create_plan',
    v_request_sha, p_plan_id, 1, v_response
  );
  return v_response;
end;
$$;

create or replace function public.c3r_p_decide_plan_v1(
  p_user_id uuid,
  p_command_id uuid,
  p_plan_id uuid,
  p_expected_version bigint,
  p_decision text,
  p_as_of timestamptz,
  p_blocks jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_receipt public.c3r_p_command_receipts%rowtype;
  v_plan public.c3r_p_plans%rowtype;
  v_actual_eligibility text;
  v_block jsonb;
  v_core_count integer;
  v_minutes integer;
  v_request_sha text;
  v_response jsonb;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  v_request_sha := encode(extensions.digest(convert_to(concat_ws(chr(31), p_plan_id::text,
    p_expected_version::text, p_decision, p_as_of::text,
    coalesce(p_blocks::text, '')), 'UTF8'), 'sha256'), 'hex');
  select * into v_receipt from public.c3r_p_command_receipts
    where user_id = p_user_id and command_id = p_command_id;
  if found then
    if v_receipt.action <> 'decide_plan' or v_receipt.request_sha256 <> v_request_sha then
      raise exception 'C3R_P_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return v_receipt.response_metadata;
  end if;
  select * into v_plan from public.c3r_p_plans
    where id = p_plan_id and user_id = p_user_id for update;
  if not found then raise exception 'C3R_P_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_plan.record_version <> p_expected_version then
    raise exception 'C3R_P_CAS_CONFLICT' using errcode = '40001';
  end if;
  v_actual_eligibility := public.c3r_p_eligibility_digest_v1(p_user_id, p_as_of);
  if v_actual_eligibility <> v_plan.eligibility_digest
    or public.c3r_p_review_state_digest_v1(p_user_id) <> v_plan.review_state_digest then
    update public.c3r_p_plans set state = 'STALE',
      record_version = record_version + 1, updated_at = p_as_of
    where id = p_plan_id returning * into v_plan;
    v_response := jsonb_build_object('planId', p_plan_id,
      'recordVersion', v_plan.record_version, 'state', 'STALE',
      'status', 'stale_plan');
  else
    if p_decision not in ('ACCEPT', 'EDIT', 'REJECT') then
      raise exception 'C3R_P_INVALID_PLAN_DECISION' using errcode = '22023';
    end if;
    if p_decision = 'EDIT' then
      if jsonb_typeof(p_blocks) <> 'array' then
        raise exception 'C3R_P_INVALID_PLAN' using errcode = '22023';
      end if;
      if jsonb_array_length(p_blocks) = 0 or exists (
        select 1 from jsonb_array_elements(p_blocks) block
        group by block ->> 'recordId', block ->> 'gapId', block ->> 'reviewPhase'
        having count(*) > 1
      ) then
        raise exception 'C3R_P_PLAN_BLOCK_AMBIGUOUS' using errcode = '23514';
      end if;
      select count(*) filter (where value ->> 'blockKind' = 'CORE_OUTCOME'),
        coalesce(sum((value ->> 'minutes')::integer), 0)
      into v_core_count, v_minutes from jsonb_array_elements(p_blocks);
      if v_core_count > 3 or v_minutes > v_plan.available_minutes then
        raise exception 'C3R_P_INVALID_PLAN' using errcode = '23514';
      end if;
      delete from public.c3r_p_plan_blocks where plan_id = p_plan_id;
      for v_block in select value from jsonb_array_elements(p_blocks) loop
        perform public.c3r_p_require_exact_keys_v1(v_block,
          array['blockId', 'blockKind', 'gapId', 'minutes', 'ordinal', 'recordId',
            'reviewPhase']);
        if not exists (
          select 1 from public.c3r_p_learning_gaps g
          join public.c3r_p_learning_records r
            on r.user_id = g.user_id and r.id = g.record_id
          where g.user_id = p_user_id
            and g.id = (v_block ->> 'gapId')::uuid
            and r.id = (v_block ->> 'recordId')::uuid
            and g.state in ('OPEN', 'REOPENED')
            and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')
            and v_block ->> 'reviewPhase' = case r.state
              when 'REPAIRED' then 'D1'
              when 'D1_COMPLETE' then 'D7_TRANSFER'
              when 'D7_COMPLETE' then 'RECURRENCE'
              when 'REOPENED' then 'REOPENED_REVIEW'
              else 'INELIGIBLE' end
            and case
              when r.state = 'REPAIRED' then g.d1_due_at
              when r.state = 'D1_COMPLETE' then g.d7_due_at
              else g.recurrence_due_at end <= p_as_of
        ) then
          raise exception 'C3R_P_PLAN_ITEM_NOT_ELIGIBLE' using errcode = '23514';
        end if;
        insert into public.c3r_p_plan_blocks (
          id, plan_id, user_id, record_id, gap_id, review_phase, block_kind,
          ordinal, minutes
        ) values (
          (v_block ->> 'blockId')::uuid, p_plan_id, p_user_id,
          (v_block ->> 'recordId')::uuid, (v_block ->> 'gapId')::uuid,
          (v_block ->> 'reviewPhase')::public.c3r_p_review_phase,
          v_block ->> 'blockKind', (v_block ->> 'ordinal')::integer,
          (v_block ->> 'minutes')::integer
        );
      end loop;
    end if;
    update public.c3r_p_plans set
      state = case p_decision
        when 'ACCEPT' then 'ACCEPTED'::public.c3r_p_plan_state
        when 'EDIT' then 'EDITED'::public.c3r_p_plan_state
        else 'REJECTED'::public.c3r_p_plan_state end,
      record_version = record_version + 1, updated_at = p_as_of
    where id = p_plan_id returning * into v_plan;
    v_response := jsonb_build_object('planId', p_plan_id,
      'recordVersion', v_plan.record_version, 'state', v_plan.state,
      'status', 'applied');
  end if;
  insert into public.c3r_p_command_receipts (
    command_id, user_id, action, request_sha256, aggregate_id,
    resulting_version, response_metadata
  ) values (
    p_command_id, p_user_id, 'decide_plan',
    v_request_sha,
    p_plan_id, v_plan.record_version, v_response
  );
  return v_response;
end;
$$;

create or replace function public.c3r_p_restore_record_v1(
  p_user_id uuid,
  p_record_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'record', to_jsonb(r),
    'attempts', coalesce((select jsonb_agg(to_jsonb(a) order by a.occurred_at)
      from public.c3r_p_attempts a where a.record_id = r.id and a.user_id = p_user_id), '[]'::jsonb),
    'transferTask', (select jsonb_build_object(
      'taskId', t.id,
      'recordId', t.record_id,
      'sourceId', t.source_id,
      'problemId', t.problem_id,
      'revisionId', t.revision_id,
      'itemId', t.item_id,
      'artifactId', t.artifact_id,
      'surfaceId', t.surface_id,
      'eligibleAt', t.eligible_at,
      'presentedAt', t.presented_at,
      'completedAt', t.completed_at,
      'state', case when t.completed_at is not null then 'COMPLETED'
        when t.presented_at is not null then 'PRESENTED' else 'SEALED' end,
      'prompt', case when t.presented_at is not null then t.prompt else null end
    ) from public.c3r_p_transfer_tasks t
      where t.record_id = r.id and t.user_id = p_user_id),
    'assistanceEvents', coalesce((select jsonb_agg(to_jsonb(e) order by e.committed_at)
      from public.c3r_p_assistance_events e where e.record_id = r.id and e.user_id = p_user_id), '[]'::jsonb),
    'gaps', coalesce((select jsonb_agg(to_jsonb(g))
      from public.c3r_p_learning_gaps g where g.record_id = r.id and g.user_id = p_user_id), '[]'::jsonb),
    'failureNotes', coalesce((select jsonb_agg(to_jsonb(n))
      from public.c3r_p_failure_notes n where n.record_id = r.id and n.user_id = p_user_id), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at)
      from public.c3r_p_ledger_entries l where l.record_id = r.id and l.user_id = p_user_id), '[]'::jsonb)
  ) into v_result
  from public.c3r_p_learning_records r
  where r.id = p_record_id and r.user_id = p_user_id;
  if v_result is null then raise exception 'C3R_P_NOT_FOUND' using errcode = 'P0002'; end if;
  return v_result;
end;
$$;

create or replace function public.c3r_p_load_dashboard_v1(
  p_user_id uuid,
  p_as_of timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'eligibilityDigest', public.c3r_p_eligibility_digest_v1(p_user_id, p_as_of),
    'reviewStateDigest', public.c3r_p_review_state_digest_v1(p_user_id),
    'queue', coalesce((select jsonb_agg(jsonb_build_object(
      'recordId', r.id, 'gapId', g.id, 'state', r.state,
      'gapState', g.state, 'conceptId', g.concept_id,
      'reviewPhase', case r.state
        when 'REPAIRED' then 'D1'
        when 'D1_COMPLETE' then 'D7_TRANSFER'
        when 'D7_COMPLETE' then 'RECURRENCE'
        when 'REOPENED' then 'REOPENED_REVIEW'
        else 'INELIGIBLE' end,
      'dueAt', case
        when r.state = 'REPAIRED' then g.d1_due_at
        when r.state = 'D1_COMPLETE' then g.d7_due_at
        else g.recurrence_due_at end,
      'eligible', case
        when r.state = 'REPAIRED' then g.d1_due_at <= p_as_of
        when r.state = 'D1_COMPLETE' then g.d7_due_at <= p_as_of
        else g.recurrence_due_at <= p_as_of end
    ) order by g.updated_at, g.id)
      from public.c3r_p_learning_gaps g
      join public.c3r_p_learning_records r on r.id = g.record_id and r.user_id = g.user_id
      where g.user_id = p_user_id and g.state in ('OPEN', 'REOPENED')
        and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at desc)
      from public.c3r_p_ledger_entries l where l.user_id = p_user_id), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object(
      'planId', p.id,
      'planKind', p.plan_kind,
      'recordVersion', p.record_version,
      'eligibilityDigest', p.eligibility_digest,
      'state', p.state,
      'blocks', coalesce((select jsonb_agg(jsonb_build_object(
        'blockId', b.id,
        'blockKind', b.block_kind,
        'recordId', b.record_id,
        'gapId', b.gap_id,
        'reviewPhase', b.review_phase,
        'ordinal', b.ordinal,
        'minutes', b.minutes,
        'executionState', b.execution_state
      ) order by b.ordinal)
        from public.c3r_p_plan_blocks b
        where b.user_id = p_user_id and b.plan_id = p.id), '[]'::jsonb),
      'dayComplete', (
        exists (select 1 from public.c3r_p_plan_blocks b
          where b.user_id = p_user_id and b.plan_id = p.id)
        and not exists (select 1 from public.c3r_p_plan_blocks b
          where b.user_id = p_user_id and b.plan_id = p.id
            and b.execution_state <> 'COMPLETE')
      )
    ) order by p.generated_at desc, p.id)
      from public.c3r_p_plans p where p.user_id = p_user_id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.c3r_p_export_learner_data_v1(p_user_id uuid)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'schemaVersion', 'c3r-p-learner-export.v1',
    'subject', 'PRACTICE',
    'records', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at)
      from public.c3r_p_learning_records r where r.user_id = p_user_id), '[]'::jsonb),
    'attempts', coalesce((select jsonb_agg(to_jsonb(a) order by a.occurred_at)
      from public.c3r_p_attempts a where a.user_id = p_user_id), '[]'::jsonb),
    'transferTasks', coalesce((select jsonb_agg(jsonb_build_object(
      'taskId', t.id,
      'recordId', t.record_id,
      'sourceId', t.source_id,
      'problemId', t.problem_id,
      'revisionId', t.revision_id,
      'itemId', t.item_id,
      'artifactId', t.artifact_id,
      'surfaceId', t.surface_id,
      'eligibleAt', t.eligible_at,
      'presentedAt', t.presented_at,
      'completedAt', t.completed_at
    ) order by t.created_at, t.id)
      from public.c3r_p_transfer_tasks t where t.user_id = p_user_id), '[]'::jsonb),
    'assistanceEvents', coalesce((select jsonb_agg(to_jsonb(e) order by e.committed_at, e.id)
      from public.c3r_p_assistance_events e where e.user_id = p_user_id), '[]'::jsonb),
    'failureNotes', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at)
      from public.c3r_p_failure_notes n where n.user_id = p_user_id), '[]'::jsonb),
    'gaps', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at)
      from public.c3r_p_learning_gaps g where g.user_id = p_user_id), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at)
      from public.c3r_p_ledger_entries l where l.user_id = p_user_id), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(to_jsonb(p) order by p.generated_at)
      from public.c3r_p_plans p where p.user_id = p_user_id), '[]'::jsonb),
    'planBlocks', coalesce((select jsonb_agg(to_jsonb(b) order by b.plan_id, b.ordinal, b.id)
      from public.c3r_p_plan_blocks b where b.user_id = p_user_id), '[]'::jsonb),
    'commandReceipts', coalesce((select jsonb_agg(jsonb_build_object(
      'commandId', c.command_id,
      'action', c.action,
      'aggregateId', c.aggregate_id,
      'resultingVersion', c.resulting_version,
      'responseMetadata', c.response_metadata,
      'createdAt', c.created_at
    ) order by c.created_at, c.command_id)
      from public.c3r_p_command_receipts c where c.user_id = p_user_id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.c3r_p_delete_learner_data_v1(p_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_records bigint;
  v_plans bigint;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  select count(*) into v_records from public.c3r_p_learning_records where user_id = p_user_id;
  select count(*) into v_plans from public.c3r_p_plans where user_id = p_user_id;
  delete from public.c3r_p_plans where user_id = p_user_id;
  delete from public.c3r_p_learning_records where user_id = p_user_id;
  delete from public.c3r_p_command_receipts where user_id = p_user_id;
  return jsonb_build_object('deletedRecords', v_records, 'deletedPlans', v_plans,
    'status', 'deleted');
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'c3r_p_learning_records',
    'c3r_p_attempts',
    'c3r_p_learning_gaps',
    'c3r_p_failure_notes',
    'c3r_p_assistance_events',
    'c3r_p_ledger_entries',
    'c3r_p_transfer_tasks',
    'c3r_p_plans',
    'c3r_p_plan_blocks',
    'c3r_p_command_receipts'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format('grant select, insert, update, delete on table public.%I to service_role', v_table);
    execute format('drop policy if exists %I on public.%I',
      v_table || '_select_own', v_table);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      v_table || '_select_own', v_table
    );
  end loop;
end;
$$;

revoke all on function public.c3r_p_preserve_immutable_d0_v1() from public, anon, authenticated;
revoke all on function public.c3r_p_require_exact_keys_v1(jsonb, text[]) from public, anon, authenticated;
revoke all on function public.c3r_p_eligibility_digest_v1(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.c3r_p_review_state_digest_v1(uuid) from public, anon, authenticated;
revoke all on function public.c3r_p_apply_learning_command_v1(uuid, uuid, bigint, text, jsonb) from public, anon, authenticated;
revoke all on function public.c3r_p_create_plan_v1(uuid, uuid, uuid, public.c3r_p_plan_kind, integer, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.c3r_p_decide_plan_v1(uuid, uuid, uuid, bigint, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.c3r_p_restore_record_v1(uuid, uuid) from public, anon, authenticated;
revoke all on function public.c3r_p_load_dashboard_v1(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.c3r_p_export_learner_data_v1(uuid) from public, anon, authenticated;
revoke all on function public.c3r_p_delete_learner_data_v1(uuid) from public, anon, authenticated;

grant execute on function public.c3r_p_preserve_immutable_d0_v1() to service_role;
grant execute on function public.c3r_p_require_exact_keys_v1(jsonb, text[]) to service_role;
grant execute on function public.c3r_p_eligibility_digest_v1(uuid, timestamptz) to service_role;
grant execute on function public.c3r_p_review_state_digest_v1(uuid) to service_role;
grant execute on function public.c3r_p_apply_learning_command_v1(uuid, uuid, bigint, text, jsonb) to service_role;
grant execute on function public.c3r_p_create_plan_v1(uuid, uuid, uuid, public.c3r_p_plan_kind, integer, timestamptz, jsonb) to service_role;
grant execute on function public.c3r_p_decide_plan_v1(uuid, uuid, uuid, bigint, text, timestamptz, jsonb) to service_role;
grant execute on function public.c3r_p_restore_record_v1(uuid, uuid) to service_role;
grant execute on function public.c3r_p_load_dashboard_v1(uuid, timestamptz) to service_role;
grant execute on function public.c3r_p_export_learner_data_v1(uuid) to service_role;
grant execute on function public.c3r_p_delete_learner_data_v1(uuid) to service_role;

-- Reassert the already-produced Personal Concept Graph RPC-only boundary after
-- the fresh-history producer is present. This does not create a new C3R-P path.
revoke insert, update on table public.personal_concept_nodes from authenticated;
drop policy if exists "personal_concept_nodes_insert_own" on public.personal_concept_nodes;
drop policy if exists "personal_concept_nodes_update_own" on public.personal_concept_nodes;
revoke execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) from public, anon;
grant execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) to authenticated;

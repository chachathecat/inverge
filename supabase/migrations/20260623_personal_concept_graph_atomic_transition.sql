-- Personal Concept Graph atomic transition RPC v1
-- Forward-only migration. Depends on public.personal_concept_nodes.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.personal_concept_transition_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  exam_mode text not null,
  subject_id text not null,
  unit_id text not null,
  occurrence_at timestamptz not null,
  input_fingerprint text not null,
  status text not null,
  applied_node_id uuid,
  created_at timestamptz not null default now(),
  metadata_only boolean not null default true,
  source_status text not null default 'atomic_transition_v1',
  unique (user_id, event_id),
  constraint personal_concept_transition_events_event_id_not_empty_check
    check (length(trim(event_id)) > 0 and length(trim(event_id)) <= 200),
  constraint personal_concept_transition_events_exam_mode_check
    check (exam_mode in ('first', 'second')),
  constraint personal_concept_transition_events_input_fingerprint_check
    check (input_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint personal_concept_transition_events_status_check
    check (status in ('applied', 'stale_signal', 'rejected')),
  constraint personal_concept_transition_events_subject_id_not_empty_check
    check (length(trim(subject_id)) > 0),
  constraint personal_concept_transition_events_unit_id_not_empty_check
    check (length(trim(unit_id)) > 0),
  constraint personal_concept_transition_events_metadata_only_check
    check (metadata_only is true)
);

create index if not exists personal_concept_transition_events_user_id_idx
  on public.personal_concept_transition_events (user_id);

create index if not exists personal_concept_transition_events_user_concept_idx
  on public.personal_concept_transition_events (user_id, exam_mode, subject_id, unit_id);

create index if not exists personal_concept_transition_events_user_occurrence_idx
  on public.personal_concept_transition_events (user_id, occurrence_at);

alter table public.personal_concept_transition_events enable row level security;

grant select on table public.personal_concept_transition_events to authenticated;

drop policy if exists "personal_concept_transition_events_select_own" on public.personal_concept_transition_events;
create policy "personal_concept_transition_events_select_own"
  on public.personal_concept_transition_events
  as permissive
  for select
  to authenticated
  using (auth.uid() is not null and user_id = auth.uid());

create or replace function public.transition_personal_concept_node_v1(
  p_event_id text,
  p_exam_mode text,
  p_subject_id text,
  p_unit_id text,
  p_task_type text,
  p_result text,
  p_confidence text,
  p_due_bucket text,
  p_recent_miss_count integer,
  p_occurred_at timestamptz
)
returns table (
  status text,
  reason text,
  id uuid,
  user_id uuid,
  exam_mode text,
  subject_id text,
  unit_id text,
  state text,
  confidence text,
  last_result text,
  last_task_type text,
  wrong_count integer,
  recovery_count integer,
  stable_count integer,
  next_recommended_task_type text,
  next_due_at timestamptz,
  updated_at timestamptz,
  previous_state text,
  previous_updated_at timestamptz,
  metadata_only boolean
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id text := nullif(trim(coalesce(p_event_id, '')), '');
  v_exam_mode text := trim(coalesce(p_exam_mode, ''));
  v_subject_id text := nullif(trim(coalesce(p_subject_id, '')), '');
  v_unit_id text := nullif(trim(coalesce(p_unit_id, '')), '');
  v_task_type text := nullif(trim(coalesce(p_task_type, '')), '');
  v_result text := trim(coalesce(p_result, ''));
  v_confidence text := trim(coalesce(nullif(p_confidence, ''), 'unknown'));
  v_due_bucket text := nullif(trim(coalesce(p_due_bucket, '')), '');
  v_recent_miss_count integer := greatest(coalesce(p_recent_miss_count, 0), 0);
  v_previous public.personal_concept_nodes%rowtype;
  v_node public.personal_concept_nodes%rowtype;
  v_seen public.personal_concept_transition_events%rowtype;
  v_input_fingerprint text;
  v_previous_state text;
  v_next_state text;
  v_normalized_task_type text;
  v_next_task_type text;
  v_success boolean;
  v_wrong_like boolean;
  v_missed_due boolean;
  v_recovery_like boolean;
  v_stable_like boolean;
  v_due_days integer;
  v_event_lock bigint;
  v_concept_lock bigint;
  v_had_previous boolean := false;
begin
  if v_user_id is null then
    return query select
      'rejected'::text,
      'unauthenticated'::text,
      null::uuid,
      null::uuid,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::text,
      null::integer,
      null::integer,
      null::integer,
      null::text,
      null::timestamptz,
      null::timestamptz,
      null::text,
      null::timestamptz,
      true::boolean;
    return;
  end if;

  if v_event_id is null or length(v_event_id) > 200 then
    return query select 'rejected'::text, 'invalid_event_id'::text, null::uuid, v_user_id, null::text, null::text, null::text, null::text, null::text, null::text, null::text, null::integer, null::integer, null::integer, null::text, null::timestamptz, null::timestamptz, null::text, null::timestamptz, true::boolean;
    return;
  end if;

  if v_exam_mode not in ('first', 'second') then
    return query select 'rejected'::text, 'unsupported_exam_mode'::text, null::uuid, v_user_id, v_exam_mode, v_subject_id, v_unit_id, null::text, null::text, null::text, null::text, null::integer, null::integer, null::integer, null::text, null::timestamptz, null::timestamptz, null::text, null::timestamptz, true::boolean;
    return;
  end if;

  if v_subject_id is null or v_unit_id is null or v_task_type is null then
    return query select 'rejected'::text, 'malformed_transition'::text, null::uuid, v_user_id, v_exam_mode, v_subject_id, v_unit_id, null::text, null::text, null::text, null::text, null::integer, null::integer, null::integer, null::text, null::timestamptz, null::timestamptz, null::text, null::timestamptz, true::boolean;
    return;
  end if;

  if p_occurred_at is null then
    return query select 'rejected'::text, 'invalid_occurrence'::text, null::uuid, v_user_id, v_exam_mode, v_subject_id, v_unit_id, null::text, null::text, null::text, null::text, null::integer, null::integer, null::integer, null::text, null::timestamptz, null::timestamptz, null::text, null::timestamptz, true::boolean;
    return;
  end if;

  if v_result not in ('done', 'correct', 'completed', 'wrong', 'unknown', 'needs_rewrite', 'skipped', 'missed_due') then
    return query select 'rejected'::text, 'unsupported_result'::text, null::uuid, v_user_id, v_exam_mode, v_subject_id, v_unit_id, null::text, null::text, null::text, null::text, null::integer, null::integer, null::integer, null::text, null::timestamptz, null::timestamptz, null::text, null::timestamptz, true::boolean;
    return;
  end if;

  if v_confidence not in ('unknown', 'low', 'medium', 'high') then
    return query select 'rejected'::text, 'unsupported_confidence'::text, null::uuid, v_user_id, v_exam_mode, v_subject_id, v_unit_id, null::text, null::text, null::text, null::text, null::integer, null::integer, null::integer, null::text, null::timestamptz, null::timestamptz, null::text, null::timestamptz, true::boolean;
    return;
  end if;

  v_normalized_task_type := case lower(v_task_type)
    when 'ox' then 'O/X'
    when 'o/x' then 'O/X'
    when 'accounting' then 'accounting template'
    when 'accounting_template' then 'accounting template'
    when 'accounting template' then 'accounting template'
    when 'casio' then 'CASIO'
    when 'calculator_routine' then 'calculator_routine'
    when 'rewrite' then 'rewrite'
    when 'cloze' then 'cloze'
    when 'issue' then 'issue spotting'
    when 'issue_spotting' then 'issue spotting'
    when 'issue spotting' then 'issue spotting'
    else v_task_type
  end;

  v_input_fingerprint := encode(
    extensions.digest(
      concat_ws(
        '|',
        v_exam_mode,
        v_subject_id,
        v_unit_id,
        v_normalized_task_type,
        v_result,
        v_confidence,
        coalesce(v_due_bucket, ''),
        v_recent_miss_count::text,
        p_occurred_at::text
      ),
      'sha256'
    ),
    'hex'
  );

  v_event_lock := hashtextextended('personal-concept-event|' || v_user_id::text || '|' || v_event_id, 420);
  v_concept_lock := hashtextextended('personal-concept-node|' || v_user_id::text || '|' || v_exam_mode || '|' || v_subject_id || '|' || v_unit_id, 420);
  perform pg_advisory_xact_lock(v_event_lock);
  perform pg_advisory_xact_lock(v_concept_lock);

  select *
    into v_seen
    from public.personal_concept_transition_events
    where personal_concept_transition_events.user_id = v_user_id
      and personal_concept_transition_events.event_id = v_event_id
    for update;

  if found then
    select *
      into v_node
      from public.personal_concept_nodes
      where personal_concept_nodes.user_id = v_user_id
        and personal_concept_nodes.exam_mode = v_seen.exam_mode
        and personal_concept_nodes.subject_id = v_seen.subject_id
        and personal_concept_nodes.unit_id = v_seen.unit_id
      for update;

    if v_seen.input_fingerprint <> v_input_fingerprint then
      return query select
        'rejected'::text,
        'event_id_payload_mismatch'::text,
        v_node.id,
        v_user_id,
        coalesce(v_node.exam_mode, v_seen.exam_mode),
        coalesce(v_node.subject_id, v_seen.subject_id),
        coalesce(v_node.unit_id, v_seen.unit_id),
        v_node.state,
        v_node.confidence,
        v_node.last_result,
        v_node.last_task_type,
        v_node.wrong_count,
        v_node.recovery_count,
        v_node.stable_count,
        v_node.next_recommended_task_type,
        v_node.next_due_at,
        v_node.updated_at,
        null::text,
        null::timestamptz,
        true::boolean;
      return;
    end if;

    return query select
      'already_applied'::text,
      null::text,
      v_node.id,
      v_user_id,
      coalesce(v_node.exam_mode, v_seen.exam_mode),
      coalesce(v_node.subject_id, v_seen.subject_id),
      coalesce(v_node.unit_id, v_seen.unit_id),
      v_node.state,
      v_node.confidence,
      v_node.last_result,
      v_node.last_task_type,
      v_node.wrong_count,
      v_node.recovery_count,
      v_node.stable_count,
      v_node.next_recommended_task_type,
      v_node.next_due_at,
      v_node.updated_at,
      null::text,
      null::timestamptz,
      true::boolean;
    return;
  end if;

  select *
    into v_previous
    from public.personal_concept_nodes
    where personal_concept_nodes.user_id = v_user_id
      and personal_concept_nodes.exam_mode = v_exam_mode
      and personal_concept_nodes.subject_id = v_subject_id
      and personal_concept_nodes.unit_id = v_unit_id
    for update;
  v_had_previous := found;

  if v_had_previous and p_occurred_at < v_previous.updated_at then
    insert into public.personal_concept_transition_events (
      user_id, event_id, exam_mode, subject_id, unit_id, occurrence_at, input_fingerprint, status, applied_node_id
    )
    values (v_user_id, v_event_id, v_exam_mode, v_subject_id, v_unit_id, p_occurred_at, v_input_fingerprint, 'stale_signal', v_previous.id);

    return query select
      'stale_signal'::text,
      null::text,
      v_previous.id,
      v_previous.user_id,
      v_previous.exam_mode,
      v_previous.subject_id,
      v_previous.unit_id,
      v_previous.state,
      v_previous.confidence,
      v_previous.last_result,
      v_previous.last_task_type,
      v_previous.wrong_count,
      v_previous.recovery_count,
      v_previous.stable_count,
      v_previous.next_recommended_task_type,
      v_previous.next_due_at,
      v_previous.updated_at,
      v_previous.state,
      v_previous.updated_at,
      true::boolean;
    return;
  end if;

  if v_had_previous and p_occurred_at = v_previous.updated_at then
    insert into public.personal_concept_transition_events (
      user_id, event_id, exam_mode, subject_id, unit_id, occurrence_at, input_fingerprint, status, applied_node_id
    )
    values (v_user_id, v_event_id, v_exam_mode, v_subject_id, v_unit_id, p_occurred_at, v_input_fingerprint, 'rejected', v_previous.id);

    return query select
      'rejected'::text,
      'same_timestamp_different_event'::text,
      v_previous.id,
      v_previous.user_id,
      v_previous.exam_mode,
      v_previous.subject_id,
      v_previous.unit_id,
      v_previous.state,
      v_previous.confidence,
      v_previous.last_result,
      v_previous.last_task_type,
      v_previous.wrong_count,
      v_previous.recovery_count,
      v_previous.stable_count,
      v_previous.next_recommended_task_type,
      v_previous.next_due_at,
      v_previous.updated_at,
      v_previous.state,
      v_previous.updated_at,
      true::boolean;
    return;
  end if;

  v_previous_state := coalesce(v_previous.state, 'unknown');
  v_success := v_result in ('done', 'correct', 'completed');
  v_missed_due := v_result = 'missed_due'
    or v_due_bucket in ('missed', 'overdue')
    or (v_result = 'skipped' and v_recent_miss_count > 0);

  if v_missed_due then
    v_next_state := 'recovering';
  elsif v_result = 'needs_rewrite' then
    v_next_state := case when v_previous_state in ('stable', 'recovering') then 'recovering' else 'wrong' end;
  elsif v_result in ('wrong', 'unknown') or v_confidence = 'low' then
    v_next_state := case when v_confidence = 'low' or v_result = 'unknown' then 'confused' else 'wrong' end;
  elsif v_success then
    v_next_state := case
      when v_previous_state in ('wrong', 'confused', 'unknown') then 'recovering'
      when v_previous_state = 'recovering' then 'stable'
      else 'stable'
    end;
  elsif v_result = 'skipped' then
    v_next_state := 'recovering';
  else
    v_next_state := v_previous_state;
  end if;

  v_next_task_type := case
    when v_exam_mode = 'second' and v_normalized_task_type = 'calculator_routine' then 'calculator_routine'
    when v_exam_mode = 'second' and (v_result = 'needs_rewrite' or v_normalized_task_type = 'rewrite') then 'rewrite'
    when v_exam_mode = 'second' and v_normalized_task_type = 'CASIO' then 'CASIO'
    when v_exam_mode = 'second' and v_normalized_task_type = 'issue spotting' then 'issue spotting'
    when v_exam_mode = 'second' and v_next_state = 'stable' then coalesce(nullif(v_normalized_task_type, ''), 'scheduled review')
    when v_exam_mode = 'second' then 'rewrite'
    when v_exam_mode = 'first' and v_normalized_task_type = 'accounting template' then 'accounting template'
    when v_exam_mode = 'first' and v_normalized_task_type = 'cloze' then 'cloze'
    when v_exam_mode = 'first' and v_normalized_task_type = 'rewrite' then 'cloze'
    else coalesce(nullif(v_normalized_task_type, ''), 'O/X')
  end;

  v_wrong_like := v_result in ('wrong', 'unknown', 'needs_rewrite');
  v_recovery_like := v_next_state = 'recovering' or v_missed_due;
  v_stable_like := v_next_state = 'stable' and v_success;
  v_due_days := case
    when v_next_state in ('wrong', 'confused') then 1
    when v_next_state = 'recovering' then 2
    when v_next_state = 'stable' then 7
    else 3
  end;

  if v_had_previous then
    update public.personal_concept_nodes
      set state = v_next_state,
          confidence = v_confidence,
          last_result = v_result,
          last_task_type = v_normalized_task_type,
          wrong_count = v_previous.wrong_count + case when v_wrong_like then 1 else 0 end,
          recovery_count = v_previous.recovery_count + case when v_recovery_like then 1 else 0 end,
          stable_count = v_previous.stable_count + case when v_stable_like then 1 else 0 end,
          next_recommended_task_type = v_next_task_type,
          next_due_at = p_occurred_at + make_interval(days => v_due_days),
          updated_at = p_occurred_at,
          metadata_only = true,
          source_status = 'atomic_transition_rpc_v1'
      where personal_concept_nodes.id = v_previous.id
      returning *
      into v_node;
  else
    insert into public.personal_concept_nodes (
      user_id,
      exam_mode,
      subject_id,
      unit_id,
      state,
      confidence,
      last_result,
      last_task_type,
      wrong_count,
      recovery_count,
      stable_count,
      next_recommended_task_type,
      next_due_at,
      updated_at,
      metadata_only,
      version,
      source_status
    )
    values (
      v_user_id,
      v_exam_mode,
      v_subject_id,
      v_unit_id,
      v_next_state,
      v_confidence,
      v_result,
      v_normalized_task_type,
      case when v_wrong_like then 1 else 0 end,
      case when v_recovery_like then 1 else 0 end,
      case when v_stable_like then 1 else 0 end,
      v_next_task_type,
      p_occurred_at + make_interval(days => v_due_days),
      p_occurred_at,
      true,
      1,
      'atomic_transition_rpc_v1'
    )
    returning *
    into v_node;
  end if;

  insert into public.personal_concept_transition_events (
    user_id, event_id, exam_mode, subject_id, unit_id, occurrence_at, input_fingerprint, status, applied_node_id
  )
  values (v_user_id, v_event_id, v_exam_mode, v_subject_id, v_unit_id, p_occurred_at, v_input_fingerprint, 'applied', v_node.id);

  return query select
    'applied'::text,
    null::text,
    v_node.id,
    v_node.user_id,
    v_node.exam_mode,
    v_node.subject_id,
    v_node.unit_id,
    v_node.state,
    v_node.confidence,
    v_node.last_result,
    v_node.last_task_type,
    v_node.wrong_count,
    v_node.recovery_count,
    v_node.stable_count,
    v_node.next_recommended_task_type,
    v_node.next_due_at,
    v_node.updated_at,
    case when v_had_previous then v_previous.state else null::text end,
    case when v_had_previous then v_previous.updated_at else null::timestamptz end,
    true::boolean;
end;
$$;

revoke all on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) from public;

grant execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) to authenticated;

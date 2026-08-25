-- C3R-L Law durable-learning delta v1.
-- Forward-only extension of the validated C3R-P common durable substrate.
-- The historical C3R-P migration remains immutable; this migration performs
-- no linked, remote Supabase, Production, provider, payment, or activation work.
--
-- PRE-APPLY ROLLBACK: do not apply this migration. Keep
-- WCV_C3R_L_LAW_ENABLED=false and revert only the unmerged source candidate
-- through the protected Git process; preserve the installed Practice/Theory
-- database and perform no schema or learner-data mutation.
--
-- POST-APPLY FORWARD RECOVERY: on partial apply, failure, or catalog drift,
-- immediately keep WCV_C3R_L_LAW_ENABLED=false and halt the rollout. Retain
-- the LAW enum label, preserve all learner rows, and never edit, replay, or
-- destructively reverse either historical Law migration. Capture read-only
-- catalog evidence for the subject enum, every c3r_p_* constraint and index,
-- shared and subject RPC definitions/argument names, forced RLS/policies, and
-- exact grants without secrets or learner-private bodies. Then use only one
-- route under a separate exact Owner gate: restore a verified
-- pre-apply backup, or add a new forward-only repair migration. That repair
-- must keep Law disabled and data intact; restore predecessor-compatible
-- Practice/Theory constraints, functions, argument names, RLS, and
-- service-only grants; leave the LAW label and any Law rows inert; and pass
-- two fresh local PostgreSQL 15.8 reset/replay cycles plus the Practice and
-- Theory isolation/export/delete regressions before any separately authorized
-- remote/Production operation. No instruction here authorizes remote repair,
-- destructive deletion, security weakening, or activation.

-- Widen only the installed common rows. Defaults stay PRACTICE so the existing
-- Practice wrappers are behavior-identical unless a caller uses the new,
-- server-pinned Law RPCs. Practice and Theory behavior remains available.
alter table public.c3r_p_learning_records
  drop constraint if exists c3r_p_learning_records_practice_only,
  drop constraint if exists c3r_p_learning_records_d0_exact,
  drop constraint if exists c3r_learning_records_subject_closed,
  drop constraint if exists c3r_learning_records_d0_exact;
alter table public.c3r_p_attempts
  drop constraint if exists c3r_p_attempts_practice_only,
  drop constraint if exists c3r_p_attempts_proof_state_check,
  drop constraint if exists c3r_attempts_subject_closed,
  drop constraint if exists c3r_attempts_theory_proof_closed,
  drop constraint if exists c3r_attempts_subject_proof_closed,
  add column if not exists proof_claim jsonb,
  add column if not exists proof_evaluation jsonb,
  add column if not exists proof_reason_codes jsonb;
alter table public.c3r_p_learning_gaps
  drop constraint if exists c3r_p_learning_gaps_practice_only,
  drop constraint if exists c3r_p_learning_gaps_evidence_ref,
  drop constraint if exists c3r_learning_gaps_subject_closed,
  drop constraint if exists c3r_learning_gaps_evidence_ref;
alter table public.c3r_p_transfer_tasks
  drop constraint if exists c3r_p_transfer_tasks_practice_only,
  drop constraint if exists c3r_p_transfer_tasks_distinct_identity,
  drop constraint if exists c3r_transfer_tasks_subject_closed,
  drop constraint if exists c3r_transfer_tasks_distinct_identity;
alter table public.c3r_p_failure_notes
  drop constraint if exists c3r_p_failure_notes_practice_only,
  drop constraint if exists c3r_failure_notes_subject_closed;
alter table public.c3r_p_assistance_events
  drop constraint if exists c3r_p_assistance_events_practice_only,
  drop constraint if exists c3r_assistance_events_subject_closed;
alter table public.c3r_p_ledger_entries
  drop constraint if exists c3r_p_ledger_entries_practice_only,
  drop constraint if exists c3r_ledger_entries_subject_closed;
alter table public.c3r_p_plans
  drop constraint if exists c3r_p_plans_practice_only,
  drop constraint if exists c3r_plans_subject_closed;
alter table public.c3r_p_plan_blocks
  drop constraint if exists c3r_p_plan_blocks_practice_only,
  drop constraint if exists c3r_plan_blocks_subject_closed;
alter table public.c3r_p_command_receipts
  drop constraint if exists c3r_p_command_receipts_practice_only,
  drop constraint if exists c3r_command_receipts_subject_closed;

alter table public.c3r_p_learning_records
  add constraint c3r_learning_records_subject_closed
    check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
      'LAW'::public.c3r_p_subject)),
  add constraint c3r_learning_records_d0_exact check (
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
      'subject', subject::text,
      'surfaceId', initial_surface_id
    )
  );
alter table public.c3r_p_attempts
  add constraint c3r_attempts_subject_closed
    check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
      'LAW'::public.c3r_p_subject)),
  add constraint c3r_p_attempts_proof_state_check check (
    proof_state is null or proof_state in (
      'PASS', 'PARTIAL', 'AMBIGUOUS', 'UNSUPPORTED', 'BLOCKED', 'STALE'
    )
  ),
  add constraint c3r_attempts_subject_proof_closed check (
    (subject = 'PRACTICE'::public.c3r_p_subject
      and proof_claim is null and proof_evaluation is null and proof_reason_codes is null)
    or (subject = 'THEORY'::public.c3r_p_subject and (
      (validator_id is null and proof_state is null and proof_digest is null
        and proof_claim is null and proof_evaluation is null and proof_reason_codes is null
        and phase = 'D0'::public.c3r_p_review_phase and outcome = 'FAILURE'::public.c3r_p_attempt_outcome)
      or ((
        validator_id = 'validator:theory-scoped-predicate@1'
        and proof_state in ('PASS', 'PARTIAL', 'AMBIGUOUS', 'UNSUPPORTED', 'BLOCKED', 'STALE')
        and proof_digest ~ '^[0-9a-f]{64}$'
        and jsonb_typeof(proof_claim) = 'object'
        and jsonb_typeof(proof_evaluation) = 'object'
        and jsonb_typeof(proof_reason_codes) = 'array'
        and proof_evaluation ->> 'state' = proof_state
        and (proof_evaluation ->> 'verified')::boolean = (proof_state = 'PASS')
        and proof_evaluation ->> 'validatorId' = validator_id
        and proof_evaluation ->> 'anchorId' = proof_claim ->> 'anchorId'
        and proof_evaluation ->> 'anchorVersionId' = proof_claim ->> 'anchorVersionId'
        and proof_evaluation ->> 'sourceRevisionId' = proof_claim ->> 'sourceRevisionId'
        and proof_evaluation ->> 'targetScopeId' = proof_claim ->> 'targetScopeId'
        and proof_evaluation -> 'reasonCodes' = proof_reason_codes
        and proof_digest = encode(extensions.digest(convert_to(jsonb_build_object(
          'claim', proof_claim, 'evaluation', proof_evaluation)::text, 'UTF8'), 'sha256'), 'hex')
      ) is true)
    ))
    or (subject = 'LAW'::public.c3r_p_subject and (
      (validator_id is null and proof_state is null and proof_digest is null
        and proof_claim is null and proof_evaluation is null and proof_reason_codes is null
        and phase = 'D0'::public.c3r_p_review_phase and outcome = 'FAILURE'::public.c3r_p_attempt_outcome)
      or ((
        validator_id = 'validator:law-exact-applicability@1'
        and proof_state in ('PASS', 'PARTIAL', 'AMBIGUOUS', 'UNSUPPORTED', 'BLOCKED', 'STALE')
        and proof_digest ~ '^[0-9a-f]{64}$'
        and jsonb_typeof(proof_claim) = 'object'
        and jsonb_typeof(proof_evaluation) = 'object'
        and jsonb_typeof(proof_reason_codes) = 'array'
        and proof_evaluation ->> 'state' = proof_state
        and (proof_evaluation ->> 'verified')::boolean = (proof_state = 'PASS')
        and proof_evaluation ->> 'validatorId' = validator_id
        and proof_evaluation ->> 'anchorId' = 'repair-anchor:law:synthetic-article-10'
        and proof_evaluation ->> 'anchorVersionId' = 'repair-anchor:law:synthetic-article-10@1'
        and proof_evaluation ->> 'sourceRevisionId' = revision_id
        and proof_evaluation ->> 'lawSourceBindingId' = 'law-binding:synthetic-official-act:article-10'
        and proof_evaluation ->> 'sourceId' = 'law-source:synthetic-official-act'
        and proof_evaluation ->> 'sourceVersionId' = 'law-source:synthetic-official-act@2026-01-01'
        and proof_evaluation ->> 'lawAnchorId' = 'law-anchor:synthetic-official-act:article-10'
        and proof_evaluation ->> 'lawAnchorVersionId' = 'law-anchor:synthetic-official-act:article-10@2026-01-01'
        and proof_evaluation ->> 'exactLocator' = 'Article 10'
        and proof_evaluation ->> 'exactVersionIdentity' = '2026-01-01'
        and proof_evaluation ->> 'applicableAsOf' = '2026-08-15'
        and proof_evaluation -> 'reasonCodes' = proof_reason_codes
        and proof_digest = encode(extensions.digest(convert_to(jsonb_build_object(
          'claim', proof_claim, 'evaluation', proof_evaluation)::text, 'UTF8'), 'sha256'), 'hex')
      ) is true)
    ))
  );
alter table public.c3r_p_learning_gaps
  add constraint c3r_learning_gaps_subject_closed
    check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
      'LAW'::public.c3r_p_subject)),
  add constraint c3r_learning_gaps_evidence_ref check (
    (subject = 'PRACTICE'::public.c3r_p_subject
      and evidence_ref like 'PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#%')
    or (subject = 'THEORY'::public.c3r_p_subject
      and evidence_ref like 'THEORY_RUNTIME:c3r-t-theory-durable-learning-v1#%')
    or (subject = 'LAW'::public.c3r_p_subject
      and evidence_ref like 'LAW_RUNTIME:c3r-l-law-durable-learning-v1#%')
  );
alter table public.c3r_p_transfer_tasks
  add constraint c3r_transfer_tasks_subject_closed
    check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
      'LAW'::public.c3r_p_subject)),
  add constraint c3r_transfer_tasks_distinct_identity check (
    (subject = 'PRACTICE'::public.c3r_p_subject
      and item_id = 'c3r-p:practice:annual-net-income:d7-transfer-v1'
      and surface_id = 'server:practice-transfer-v1')
    or (subject = 'THEORY'::public.c3r_p_subject
      and item_id = 'c3r-t:theory:income-approach-scope:d7-transfer-v1'
      and surface_id = 'server:theory-transfer-v1')
    or (subject = 'LAW'::public.c3r_p_subject
      and item_id = 'c3r-l:law:synthetic-article-10-applicability:d7-transfer-v1'
      and surface_id = 'server:law-transfer-v1')
  );
alter table public.c3r_p_failure_notes add constraint c3r_failure_notes_subject_closed
  check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
    'LAW'::public.c3r_p_subject));
alter table public.c3r_p_assistance_events add constraint c3r_assistance_events_subject_closed
  check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
    'LAW'::public.c3r_p_subject));
alter table public.c3r_p_ledger_entries add constraint c3r_ledger_entries_subject_closed
  check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
    'LAW'::public.c3r_p_subject));
alter table public.c3r_p_plans add constraint c3r_plans_subject_closed
  check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
    'LAW'::public.c3r_p_subject));
alter table public.c3r_p_plan_blocks add constraint c3r_plan_blocks_subject_closed
  check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
    'LAW'::public.c3r_p_subject));
alter table public.c3r_p_command_receipts add constraint c3r_command_receipts_subject_closed
  check (subject in ('PRACTICE'::public.c3r_p_subject, 'THEORY'::public.c3r_p_subject,
    'LAW'::public.c3r_p_subject));

-- C3R-T already installed the exact subject-aware unique identities. Preserve
-- their catalog objects because the predecessor composite foreign keys depend
-- on those constraint identities; the new enum label needs no unique-key DDL.

alter table public.c3r_p_attempts
  drop constraint if exists c3r_p_attempts_record_binding_fk,
  drop constraint if exists c3r_p_attempts_transfer_task_owner_fk,
  drop constraint if exists c3r_attempts_subject_record_fk,
  drop constraint if exists c3r_attempts_subject_transfer_fk,
  add constraint c3r_attempts_subject_record_fk foreign key (
    user_id, record_id, subject, source_id, problem_id, revision_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, subject, source_id, problem_id, revision_id, artifact_id
  ) on delete cascade,
  add constraint c3r_attempts_subject_transfer_fk foreign key (
    user_id, record_id, transfer_task_id, subject
  ) references public.c3r_p_transfer_tasks(user_id, record_id, id, subject) on delete cascade;
alter table public.c3r_p_learning_gaps
  drop constraint if exists c3r_p_learning_gaps_record_binding_fk,
  drop constraint if exists c3r_gaps_subject_record_fk,
  add constraint c3r_gaps_subject_record_fk foreign key (
    user_id, record_id, subject, source_id, problem_id, revision_id, item_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, subject, source_id, problem_id, revision_id, item_id, artifact_id
  ) on delete cascade;
alter table public.c3r_p_transfer_tasks
  drop constraint if exists c3r_p_transfer_tasks_record_binding_fk,
  drop constraint if exists c3r_transfer_subject_record_fk,
  add constraint c3r_transfer_subject_record_fk foreign key (
    user_id, record_id, subject, source_id, problem_id, revision_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, subject, source_id, problem_id, revision_id, artifact_id
  ) on delete cascade;
alter table public.c3r_p_learning_records
  drop constraint if exists c3r_p_learning_records_primary_gap_fk,
  drop constraint if exists c3r_records_subject_primary_gap_fk,
  add constraint c3r_records_subject_primary_gap_fk foreign key (
    user_id, id, primary_gap_id, subject
  ) references public.c3r_p_learning_gaps(user_id, record_id, id, subject)
    deferrable initially deferred;
alter table public.c3r_p_failure_notes
  drop constraint if exists c3r_p_failure_notes_record_binding_fk,
  drop constraint if exists c3r_p_failure_notes_gap_owner_fk,
  drop constraint if exists c3r_notes_subject_record_fk,
  drop constraint if exists c3r_notes_subject_gap_fk,
  add constraint c3r_notes_subject_record_fk foreign key (
    user_id, record_id, subject, source_id, problem_id, revision_id, item_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, subject, source_id, problem_id, revision_id, item_id, artifact_id
  ) on delete cascade,
  add constraint c3r_notes_subject_gap_fk foreign key (user_id, record_id, gap_id, subject)
    references public.c3r_p_learning_gaps(user_id, record_id, id, subject) on delete cascade;
alter table public.c3r_p_assistance_events
  drop constraint if exists c3r_p_assistance_events_record_owner_fk,
  drop constraint if exists c3r_p_assistance_events_gap_owner_fk,
  drop constraint if exists c3r_p_assistance_events_attempt_owner_fk,
  drop constraint if exists c3r_assistance_subject_record_fk,
  drop constraint if exists c3r_assistance_subject_gap_fk,
  drop constraint if exists c3r_assistance_subject_attempt_fk,
  add constraint c3r_assistance_subject_record_fk foreign key (
    user_id, record_id, subject, source_id, problem_id, revision_id, item_id, artifact_id
  ) references public.c3r_p_learning_records(
    user_id, id, subject, source_id, problem_id, revision_id, item_id, artifact_id
  ) on delete cascade,
  add constraint c3r_assistance_subject_gap_fk foreign key (user_id, record_id, gap_id, subject)
    references public.c3r_p_learning_gaps(user_id, record_id, id, subject) on delete cascade,
  add constraint c3r_assistance_subject_attempt_fk foreign key (
    user_id, record_id, attempt_id, subject
  ) references public.c3r_p_attempts(user_id, record_id, id, subject) on delete cascade;
alter table public.c3r_p_ledger_entries
  drop constraint if exists c3r_p_ledger_entries_record_owner_fk,
  drop constraint if exists c3r_p_ledger_entries_gap_owner_fk,
  drop constraint if exists c3r_p_ledger_entries_attempt_owner_fk,
  drop constraint if exists c3r_ledger_subject_record_fk,
  drop constraint if exists c3r_ledger_subject_gap_fk,
  drop constraint if exists c3r_ledger_subject_attempt_fk,
  add constraint c3r_ledger_subject_record_fk foreign key (user_id, record_id, subject)
    references public.c3r_p_learning_records(user_id, id, subject) on delete cascade,
  add constraint c3r_ledger_subject_gap_fk foreign key (user_id, record_id, gap_id, subject)
    references public.c3r_p_learning_gaps(user_id, record_id, id, subject) on delete cascade,
  add constraint c3r_ledger_subject_attempt_fk foreign key (user_id, record_id, attempt_id, subject)
    references public.c3r_p_attempts(user_id, record_id, id, subject) on delete cascade;
alter table public.c3r_p_plan_blocks
  drop constraint if exists c3r_p_plan_blocks_plan_owner_fk,
  drop constraint if exists c3r_p_plan_blocks_record_owner_fk,
  drop constraint if exists c3r_p_plan_blocks_gap_owner_fk,
  drop constraint if exists c3r_blocks_subject_plan_fk,
  drop constraint if exists c3r_blocks_subject_record_fk,
  drop constraint if exists c3r_blocks_subject_gap_fk,
  add constraint c3r_blocks_subject_plan_fk foreign key (user_id, plan_id, subject)
    references public.c3r_p_plans(user_id, id, subject) on delete cascade,
  add constraint c3r_blocks_subject_record_fk foreign key (user_id, record_id, subject)
    references public.c3r_p_learning_records(user_id, id, subject) on delete cascade,
  add constraint c3r_blocks_subject_gap_fk foreign key (user_id, record_id, gap_id, subject)
    references public.c3r_p_learning_gaps(user_id, record_id, id, subject) on delete cascade;

create index if not exists c3r_learning_gaps_subject_queue_idx
  on public.c3r_p_learning_gaps(user_id, subject, state, d1_due_at, d7_due_at, recurrence_due_at);
create index if not exists c3r_ledger_subject_time_idx
  on public.c3r_p_ledger_entries(user_id, subject, occurred_at desc);
create index if not exists c3r_plans_subject_time_idx
  on public.c3r_p_plans(user_id, subject, generated_at desc);
create index if not exists c3r_receipts_subject_aggregate_idx
  on public.c3r_p_command_receipts(user_id, subject, aggregate_id, created_at);

create or replace function public.c3r_subject_eligibility_digest_v1(
  p_subject public.c3r_p_subject,
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
      end), ',' order by g.id), ''), 'UTF8'), 'sha256'), 'hex')
  from public.c3r_p_learning_gaps g
  join public.c3r_p_learning_records r
    on r.id = g.record_id and r.user_id = g.user_id and r.subject = g.subject
  where g.user_id = p_user_id and g.subject = p_subject
    and g.state in ('OPEN', 'REOPENED')
    and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')
    and case
      when r.state = 'REPAIRED' then g.d1_due_at <= p_as_of
      when r.state = 'D1_COMPLETE' then g.d7_due_at <= p_as_of
      else g.recurrence_due_at <= p_as_of
    end;
$$;

create or replace function public.c3r_subject_review_state_digest_v1(
  p_subject public.c3r_p_subject,
  p_user_id uuid
)
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
        where a.user_id = r.user_id and a.record_id = r.id and a.subject = p_subject)),
    ',' order by r.id), ''), 'UTF8'), 'sha256'), 'hex')
  from public.c3r_p_learning_records r
  left join public.c3r_p_learning_gaps g
    on g.record_id = r.id and g.user_id = r.user_id and g.subject = r.subject
  where r.user_id = p_user_id and r.subject = p_subject;
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
  select public.c3r_subject_eligibility_digest_v1('PRACTICE', p_user_id, p_as_of);
$$;
create or replace function public.c3r_p_review_state_digest_v1(p_user_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select public.c3r_subject_review_state_digest_v1('PRACTICE', p_user_id);
$$;
create or replace function public.c3r_l_eligibility_digest_v1(
  p_user_id uuid,
  p_as_of timestamptz
)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select public.c3r_subject_eligibility_digest_v1('LAW', p_user_id, p_as_of);
$$;
create or replace function public.c3r_l_review_state_digest_v1(p_user_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select public.c3r_subject_review_state_digest_v1('LAW', p_user_id);
$$;

create or replace function public.c3r_subject_find_record_v1(
  p_subject public.c3r_p_subject,
  p_user_id uuid,
  p_source_id text,
  p_problem_id text,
  p_revision_id text,
  p_item_id text,
  p_artifact_id text
)
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare v_record_id uuid;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  select r.id into v_record_id from public.c3r_p_learning_records r
  where r.user_id = p_user_id and r.subject = p_subject
    and r.source_id = p_source_id and r.problem_id = p_problem_id
    and r.revision_id = p_revision_id and r.item_id = p_item_id
    and r.artifact_id = p_artifact_id;
  return v_record_id;
end;
$$;

create or replace function public.c3r_subject_restore_record_v1(
  p_subject public.c3r_p_subject,
  p_user_id uuid,
  p_record_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare v_result jsonb;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'record', to_jsonb(r),
    'attempts', coalesce((select jsonb_agg(to_jsonb(a) order by a.occurred_at)
      from public.c3r_p_attempts a where a.record_id = r.id
        and a.user_id = p_user_id and a.subject = p_subject), '[]'::jsonb),
    'transferTask', (select jsonb_build_object(
      'taskId', t.id, 'recordId', t.record_id, 'sourceId', t.source_id,
      'problemId', t.problem_id, 'revisionId', t.revision_id, 'itemId', t.item_id,
      'artifactId', t.artifact_id, 'surfaceId', t.surface_id,
      'eligibleAt', t.eligible_at, 'presentedAt', t.presented_at,
      'completedAt', t.completed_at,
      'state', case when t.completed_at is not null then 'COMPLETED'
        when t.presented_at is not null then 'PRESENTED' else 'SEALED' end,
      'prompt', case when t.presented_at is not null then t.prompt else null end
    ) from public.c3r_p_transfer_tasks t where t.record_id = r.id
      and t.user_id = p_user_id and t.subject = p_subject),
    'assistanceEvents', coalesce((select jsonb_agg(to_jsonb(e) order by e.committed_at)
      from public.c3r_p_assistance_events e where e.record_id = r.id
        and e.user_id = p_user_id and e.subject = p_subject), '[]'::jsonb),
    'gaps', coalesce((select jsonb_agg(to_jsonb(g))
      from public.c3r_p_learning_gaps g where g.record_id = r.id
        and g.user_id = p_user_id and g.subject = p_subject), '[]'::jsonb),
    'failureNotes', coalesce((select jsonb_agg(to_jsonb(n))
      from public.c3r_p_failure_notes n where n.record_id = r.id
        and n.user_id = p_user_id and n.subject = p_subject), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at)
      from public.c3r_p_ledger_entries l where l.record_id = r.id
        and l.user_id = p_user_id and l.subject = p_subject), '[]'::jsonb)
  ) into v_result from public.c3r_p_learning_records r
  where r.id = p_record_id and r.user_id = p_user_id and r.subject = p_subject;
  if v_result is null then
    case p_subject
      when 'PRACTICE' then raise exception 'C3R_P_NOT_FOUND' using errcode = 'P0002';
      when 'THEORY' then raise exception 'C3R_T_NOT_FOUND' using errcode = 'P0002';
      when 'LAW' then raise exception 'C3R_L_NOT_FOUND' using errcode = 'P0002';
      else raise exception 'C3R_UNSUPPORTED_SUBJECT' using errcode = '22023';
    end case;
  end if;
  return v_result;
end;
$$;

create or replace function public.c3r_subject_load_dashboard_v1(
  p_subject public.c3r_p_subject,
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
    raise exception 'C3R_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'eligibilityDigest', public.c3r_subject_eligibility_digest_v1(p_subject, p_user_id, p_as_of),
    'reviewStateDigest', public.c3r_subject_review_state_digest_v1(p_subject, p_user_id),
    'queue', coalesce((select jsonb_agg(jsonb_build_object(
      'recordId', r.id, 'gapId', g.id, 'state', r.state, 'gapState', g.state,
      'conceptId', g.concept_id,
      'reviewPhase', case r.state when 'REPAIRED' then 'D1'
        when 'D1_COMPLETE' then 'D7_TRANSFER' when 'D7_COMPLETE' then 'RECURRENCE'
        when 'REOPENED' then 'REOPENED_REVIEW' else 'INELIGIBLE' end,
      'dueAt', case when r.state = 'REPAIRED' then g.d1_due_at
        when r.state = 'D1_COMPLETE' then g.d7_due_at else g.recurrence_due_at end,
      'eligible', case when r.state = 'REPAIRED' then g.d1_due_at <= p_as_of
        when r.state = 'D1_COMPLETE' then g.d7_due_at <= p_as_of
        else g.recurrence_due_at <= p_as_of end
    ) order by g.updated_at, g.id)
      from public.c3r_p_learning_gaps g join public.c3r_p_learning_records r
        on r.id = g.record_id and r.user_id = g.user_id and r.subject = g.subject
      where g.user_id = p_user_id and g.subject = p_subject
        and g.state in ('OPEN', 'REOPENED')
        and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at desc)
      from public.c3r_p_ledger_entries l where l.user_id = p_user_id
        and l.subject = p_subject), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object(
      'planId', p.id, 'planKind', p.plan_kind, 'recordVersion', p.record_version,
      'eligibilityDigest', p.eligibility_digest, 'state', p.state,
      'terminalReason', p.terminal_reason, 'generatedAt', p.generated_at,
      'updatedAt', p.updated_at,
      'blocks', coalesce((select jsonb_agg(jsonb_build_object(
        'blockId', b.id, 'blockKind', b.block_kind, 'recordId', b.record_id,
        'gapId', b.gap_id, 'reviewPhase', b.review_phase, 'ordinal', b.ordinal,
        'minutes', b.minutes, 'executionState', b.execution_state
      ) order by b.ordinal) from public.c3r_p_plan_blocks b
        where b.user_id = p_user_id and b.subject = p_subject and b.plan_id = p.id), '[]'::jsonb),
      'dayComplete', (exists (select 1 from public.c3r_p_plan_blocks b
          where b.user_id = p_user_id and b.subject = p_subject and b.plan_id = p.id)
        and not exists (select 1 from public.c3r_p_plan_blocks b
          where b.user_id = p_user_id and b.subject = p_subject and b.plan_id = p.id
            and b.execution_state <> 'COMPLETE')),
      'completionState', case when p.terminal_reason = 'COMPLETED' then 'COMPLETED'
        when p.terminal_reason is not null then 'TERMINAL_INCOMPLETE' else 'ACTIONABLE' end
    ) order by p.generated_at desc, p.id) from public.c3r_p_plans p
      where p.user_id = p_user_id and p.subject = p_subject), '[]'::jsonb)
  );
end;
$$;

create or replace function public.c3r_subject_export_learner_data_v1(
  p_subject public.c3r_p_subject,
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_subject not in ('PRACTICE', 'THEORY', 'LAW') then
    raise exception 'C3R_UNSUPPORTED_SUBJECT' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'schemaVersion', case p_subject
      when 'PRACTICE' then 'c3r-p-learner-export.v1'
      when 'THEORY' then 'c3r-t-learner-export.v1'
      when 'LAW' then 'c3r-l-learner-export.v1' end,
    'subject', p_subject::text,
    'records', coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at)
      from public.c3r_p_learning_records r where r.user_id = p_user_id
        and r.subject = p_subject), '[]'::jsonb),
    'attempts', coalesce((select jsonb_agg(to_jsonb(a) order by a.occurred_at)
      from public.c3r_p_attempts a where a.user_id = p_user_id
        and a.subject = p_subject), '[]'::jsonb),
    'transferTasks', coalesce((select jsonb_agg(jsonb_build_object(
      'taskId', t.id, 'recordId', t.record_id, 'sourceId', t.source_id,
      'problemId', t.problem_id, 'revisionId', t.revision_id, 'itemId', t.item_id,
      'artifactId', t.artifact_id, 'surfaceId', t.surface_id,
      'eligibleAt', t.eligible_at, 'presentedAt', t.presented_at,
      'completedAt', t.completed_at
    ) order by t.created_at, t.id) from public.c3r_p_transfer_tasks t
      where t.user_id = p_user_id and t.subject = p_subject), '[]'::jsonb),
    'assistanceEvents', coalesce((select jsonb_agg(to_jsonb(e) order by e.committed_at, e.id)
      from public.c3r_p_assistance_events e where e.user_id = p_user_id
        and e.subject = p_subject), '[]'::jsonb),
    'failureNotes', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at)
      from public.c3r_p_failure_notes n where n.user_id = p_user_id
        and n.subject = p_subject), '[]'::jsonb),
    'gaps', coalesce((select jsonb_agg(to_jsonb(g) order by g.created_at)
      from public.c3r_p_learning_gaps g where g.user_id = p_user_id
        and g.subject = p_subject), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) order by l.occurred_at)
      from public.c3r_p_ledger_entries l where l.user_id = p_user_id
        and l.subject = p_subject), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(to_jsonb(p) order by p.generated_at)
      from public.c3r_p_plans p where p.user_id = p_user_id
        and p.subject = p_subject), '[]'::jsonb),
    'planBlocks', coalesce((select jsonb_agg(to_jsonb(b) order by b.plan_id, b.ordinal, b.id)
      from public.c3r_p_plan_blocks b where b.user_id = p_user_id
        and b.subject = p_subject), '[]'::jsonb),
    'commandReceipts', coalesce((select jsonb_agg(jsonb_build_object(
      'commandId', c.command_id, 'subject', c.subject::text, 'action', c.action,
      'aggregateId', c.aggregate_id,
      'resultingVersion', c.resulting_version, 'responseMetadata', c.response_metadata,
      'createdAt', c.created_at
    ) order by c.created_at, c.command_id) from public.c3r_p_command_receipts c
      where c.user_id = p_user_id and c.subject = p_subject), '[]'::jsonb)
  );
end;
$$;

create or replace function public.c3r_subject_delete_learner_data_v1(
  p_subject public.c3r_p_subject,
  p_user_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare v_records bigint; v_plans bigint; v_lock_prefix text;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null then raise exception 'C3R_INVALID_INPUT' using errcode = '22023'; end if;
  v_lock_prefix := case p_subject
    when 'PRACTICE' then 'c3r-p-learner:'
    when 'THEORY' then 'c3r-t-learner:'
    when 'LAW' then 'c3r-l-learner:'
    else null end;
  if v_lock_prefix is null then
    raise exception 'C3R_UNSUPPORTED_SUBJECT' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_lock_prefix || p_user_id::text, 0));
  select count(*) into v_records from public.c3r_p_learning_records
    where user_id = p_user_id and subject = p_subject;
  select count(*) into v_plans from public.c3r_p_plans
    where user_id = p_user_id and subject = p_subject;
  delete from public.c3r_p_plans where user_id = p_user_id and subject = p_subject;
  delete from public.c3r_p_learning_records where user_id = p_user_id and subject = p_subject;
  delete from public.c3r_p_command_receipts where user_id = p_user_id and subject = p_subject;
  return jsonb_build_object('deletedRecords', v_records, 'deletedPlans', v_plans, 'status', 'deleted');
end;
$$;

create or replace function public.c3r_p_find_record_v1(
  p_user_id uuid,
  p_source_id text,
  p_problem_id text,
  p_revision_id text,
  p_item_id text,
  p_artifact_id text
)
returns uuid language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_find_record_v1(
  'PRACTICE', p_user_id, p_source_id, p_problem_id, p_revision_id, p_item_id, p_artifact_id
) $$;
create or replace function public.c3r_l_find_record_v1(
  p_user_id uuid,
  p_source_id text,
  p_problem_id text,
  p_revision_id text,
  p_item_id text,
  p_artifact_id text
)
returns uuid language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_find_record_v1(
  'LAW', p_user_id, p_source_id, p_problem_id, p_revision_id, p_item_id, p_artifact_id
) $$;
create or replace function public.c3r_p_restore_record_v1(p_user_id uuid, p_record_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_restore_record_v1('PRACTICE', p_user_id, p_record_id) $$;
create or replace function public.c3r_l_restore_record_v1(p_user_id uuid, p_record_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_restore_record_v1('LAW', p_user_id, p_record_id) $$;
create or replace function public.c3r_p_load_dashboard_v1(
  p_user_id uuid,
  p_as_of timestamptz
)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_load_dashboard_v1('PRACTICE', p_user_id, p_as_of) $$;
create or replace function public.c3r_l_load_dashboard_v1(
  p_user_id uuid,
  p_as_of timestamptz
)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_load_dashboard_v1('LAW', p_user_id, p_as_of) $$;
create or replace function public.c3r_p_export_learner_data_v1(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_export_learner_data_v1('PRACTICE', p_user_id) $$;
create or replace function public.c3r_l_export_learner_data_v1(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select public.c3r_subject_export_learner_data_v1('LAW', p_user_id) $$;
create or replace function public.c3r_p_delete_learner_data_v1(p_user_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select public.c3r_subject_delete_learner_data_v1('PRACTICE', p_user_id) $$;
create or replace function public.c3r_l_delete_learner_data_v1(p_user_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select public.c3r_subject_delete_learner_data_v1('LAW', p_user_id) $$;

create or replace function public.c3r_subject_create_plan_v1(
  p_subject public.c3r_p_subject,
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
  v_eligibility text; v_review text; v_block jsonb; v_core_count integer;
  v_minutes integer; v_request_sha text; v_response jsonb; v_prefix text;
begin
  v_prefix := case p_subject
    when 'PRACTICE' then 'C3R_P' when 'THEORY' then 'C3R_T'
    when 'LAW' then 'C3R_L' else null end;
  if v_prefix is null then
    raise exception 'C3R_UNSUPPORTED_SUBJECT' using errcode = '22023';
  end if;
  if current_user <> 'service_role' then
    raise exception '%', v_prefix || '_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception '%', v_prefix || '_INVALID_PLAN' using errcode = '22023';
  end if;
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(
    case p_subject when 'PRACTICE' then 'c3r-p-learner:'
      when 'THEORY' then 'c3r-t-learner:' when 'LAW' then 'c3r-l-learner:' end
      || p_user_id::text, 0)) then
    raise exception '%', v_prefix || '_LEARNER_MUTATION_BUSY' using errcode = '55P03';
  end if;
  if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) = 0
    or p_available_minutes not between 30 and 720 then
    raise exception '%', v_prefix || '_INVALID_PLAN' using errcode = '22023';
  end if;
  v_request_sha := case when p_subject = 'PRACTICE' then
    encode(extensions.digest(convert_to(concat_ws(chr(31),
      p_plan_id::text, p_plan_kind::text, p_available_minutes::text,
      p_as_of::text, p_blocks::text), 'UTF8'), 'sha256'), 'hex')
  else
    encode(extensions.digest(convert_to(concat_ws(chr(31),
      p_subject::text, p_plan_id::text, p_plan_kind::text,
      p_available_minutes::text, p_blocks::text), 'UTF8'), 'sha256'), 'hex')
  end;
  select * into v_receipt from public.c3r_p_command_receipts
    where user_id = p_user_id and command_id = p_command_id;
  if found then
    if v_receipt.subject <> p_subject or v_receipt.action <> 'create_plan'
      or v_receipt.request_sha256 <> v_request_sha then
      raise exception '%', v_prefix || '_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return v_receipt.response_metadata;
  end if;
  select count(*) filter (where value ->> 'blockKind' = 'CORE_OUTCOME'),
    coalesce(sum((value ->> 'minutes')::integer), 0)
  into v_core_count, v_minutes from jsonb_array_elements(p_blocks);
  if v_core_count > 3 or v_minutes > p_available_minutes then
    raise exception '%', v_prefix || '_INVALID_PLAN' using errcode = '23514';
  end if;
  if exists (select 1 from jsonb_array_elements(p_blocks) block
    group by block ->> 'recordId', block ->> 'gapId', block ->> 'reviewPhase'
    having count(*) > 1) then
    raise exception '%', v_prefix || '_PLAN_BLOCK_AMBIGUOUS' using errcode = '23514';
  end if;
  v_eligibility := public.c3r_subject_eligibility_digest_v1(p_subject, p_user_id, p_as_of);
  v_review := public.c3r_subject_review_state_digest_v1(p_subject, p_user_id);
  update public.c3r_p_plans prior set state = 'STALE', terminal_reason = 'SUPERSEDED',
    record_version = prior.record_version + 1, updated_at = p_as_of
  where prior.user_id = p_user_id and prior.subject = p_subject
    and prior.state in ('PROPOSED', 'ACCEPTED', 'EDITED') and exists (
      select 1 from public.c3r_p_plan_blocks pending
      where pending.user_id = p_user_id and pending.subject = p_subject
        and pending.plan_id = prior.id and pending.execution_state = 'PENDING');
  insert into public.c3r_p_plans (
    id, user_id, subject, plan_kind, available_minutes, eligibility_digest,
    review_state_digest, generated_at, updated_at
  ) values (
    p_plan_id, p_user_id, p_subject, p_plan_kind, p_available_minutes,
    v_eligibility, v_review, p_as_of, p_as_of
  );
  for v_block in select value from jsonb_array_elements(p_blocks) loop
    perform public.c3r_p_require_exact_keys_v1(v_block,
      array['blockId', 'blockKind', 'gapId', 'minutes', 'ordinal', 'recordId', 'reviewPhase']);
    if not exists (
      select 1 from public.c3r_p_learning_gaps g
      join public.c3r_p_learning_records r
        on r.user_id = g.user_id and r.id = g.record_id and r.subject = g.subject
      where g.user_id = p_user_id and g.subject = p_subject
        and g.id = (v_block ->> 'gapId')::uuid
        and r.id = (v_block ->> 'recordId')::uuid
        and g.state in ('OPEN', 'REOPENED')
        and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')
        and v_block ->> 'reviewPhase' = case r.state when 'REPAIRED' then 'D1'
          when 'D1_COMPLETE' then 'D7_TRANSFER' when 'D7_COMPLETE' then 'RECURRENCE'
          when 'REOPENED' then 'REOPENED_REVIEW' else 'INELIGIBLE' end
        and case when r.state = 'REPAIRED' then g.d1_due_at
          when r.state = 'D1_COMPLETE' then g.d7_due_at
          else g.recurrence_due_at end <= p_as_of
    ) then
      raise exception '%', v_prefix || '_PLAN_ITEM_NOT_ELIGIBLE' using errcode = '23514';
    end if;
    insert into public.c3r_p_plan_blocks (
      id, plan_id, user_id, subject, record_id, gap_id, review_phase,
      block_kind, ordinal, minutes
    ) values (
      (v_block ->> 'blockId')::uuid, p_plan_id, p_user_id, p_subject,
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
    command_id, user_id, subject, action, request_sha256, aggregate_id,
    resulting_version, response_metadata
  ) values (
    p_command_id, p_user_id, p_subject, 'create_plan', v_request_sha,
    p_plan_id, 1, v_response
  );
  return v_response;
exception when invalid_text_representation or null_value_not_allowed
  or string_data_right_truncation then
  raise exception '%', v_prefix || '_INVALID_PLAN' using errcode = '22023';
end;
$$;

create or replace function public.c3r_subject_decide_plan_v1(
  p_subject public.c3r_p_subject,
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
  v_receipt public.c3r_p_command_receipts%rowtype; v_plan public.c3r_p_plans%rowtype;
  v_actual_eligibility text; v_block jsonb; v_core_count integer; v_minutes integer;
  v_request_sha text; v_response jsonb; v_prefix text;
begin
  v_prefix := case p_subject
    when 'PRACTICE' then 'C3R_P' when 'THEORY' then 'C3R_T'
    when 'LAW' then 'C3R_L' else null end;
  if v_prefix is null then
    raise exception 'C3R_UNSUPPORTED_SUBJECT' using errcode = '22023';
  end if;
  if current_user <> 'service_role' then
    raise exception '%', v_prefix || '_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null then raise exception '%', v_prefix || '_INVALID_PLAN' using errcode = '22023'; end if;
  if not pg_catalog.pg_try_advisory_xact_lock(pg_catalog.hashtextextended(
    case p_subject when 'PRACTICE' then 'c3r-p-learner:'
      when 'THEORY' then 'c3r-t-learner:' when 'LAW' then 'c3r-l-learner:' end
      || p_user_id::text, 0)) then
    raise exception '%', v_prefix || '_LEARNER_MUTATION_BUSY' using errcode = '55P03';
  end if;
  v_request_sha := case when p_subject = 'PRACTICE' then
    encode(extensions.digest(convert_to(concat_ws(chr(31), p_plan_id::text,
      p_expected_version::text, p_decision, p_as_of::text,
      coalesce(p_blocks::text, '')), 'UTF8'), 'sha256'), 'hex')
  else
    encode(extensions.digest(convert_to(concat_ws(chr(31), p_subject::text,
      p_plan_id::text, p_expected_version::text, p_decision,
      coalesce(p_blocks::text, '')), 'UTF8'), 'sha256'), 'hex')
  end;
  select * into v_receipt from public.c3r_p_command_receipts
    where user_id = p_user_id and command_id = p_command_id;
  if found then
    if v_receipt.subject <> p_subject or v_receipt.action <> 'decide_plan'
      or v_receipt.request_sha256 <> v_request_sha then
      raise exception '%', v_prefix || '_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return v_receipt.response_metadata;
  end if;
  select * into v_plan from public.c3r_p_plans
    where id = p_plan_id and user_id = p_user_id and subject = p_subject for update;
  if not found then raise exception '%', v_prefix || '_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_plan.record_version <> p_expected_version then
    raise exception '%', v_prefix || '_CAS_CONFLICT' using errcode = '40001';
  end if;
  if v_plan.state not in ('PROPOSED', 'ACCEPTED', 'EDITED')
    or v_plan.terminal_reason is not null then
    raise exception '%', v_prefix || '_PLAN_TERMINAL' using errcode = '23514';
  end if;
  v_actual_eligibility := public.c3r_subject_eligibility_digest_v1(p_subject, p_user_id, p_as_of);
  if v_actual_eligibility <> v_plan.eligibility_digest
    or public.c3r_subject_review_state_digest_v1(p_subject, p_user_id) <> v_plan.review_state_digest then
    update public.c3r_p_plans set state = 'STALE', terminal_reason = 'ELIGIBILITY_CHANGED',
      record_version = record_version + 1, updated_at = p_as_of
    where id = p_plan_id and user_id = p_user_id and subject = p_subject
    returning * into v_plan;
    v_response := jsonb_build_object('planId', p_plan_id,
      'recordVersion', v_plan.record_version, 'state', 'STALE', 'status', 'stale_plan');
  else
    if p_decision not in ('ACCEPT', 'EDIT', 'REJECT') then
      raise exception '%', v_prefix || '_INVALID_PLAN_DECISION' using errcode = '22023';
    end if;
    if p_decision = 'EDIT' then
      if jsonb_typeof(p_blocks) <> 'array' or jsonb_array_length(p_blocks) = 0
        or exists (select 1 from jsonb_array_elements(p_blocks) block
          group by block ->> 'recordId', block ->> 'gapId', block ->> 'reviewPhase'
          having count(*) > 1) then
        raise exception '%', v_prefix || '_PLAN_BLOCK_AMBIGUOUS' using errcode = '23514';
      end if;
      select count(*) filter (where value ->> 'blockKind' = 'CORE_OUTCOME'),
        coalesce(sum((value ->> 'minutes')::integer), 0)
      into v_core_count, v_minutes from jsonb_array_elements(p_blocks);
      if v_core_count > 3 or v_minutes > v_plan.available_minutes then
        raise exception '%', v_prefix || '_INVALID_PLAN' using errcode = '23514';
      end if;
      delete from public.c3r_p_plan_blocks where plan_id = p_plan_id
        and user_id = p_user_id and subject = p_subject;
      for v_block in select value from jsonb_array_elements(p_blocks) loop
        perform public.c3r_p_require_exact_keys_v1(v_block,
          array['blockId', 'blockKind', 'gapId', 'minutes', 'ordinal', 'recordId', 'reviewPhase']);
        if not exists (
          select 1 from public.c3r_p_learning_gaps g join public.c3r_p_learning_records r
            on r.user_id = g.user_id and r.id = g.record_id and r.subject = g.subject
          where g.user_id = p_user_id and g.subject = p_subject
            and g.id = (v_block ->> 'gapId')::uuid and r.id = (v_block ->> 'recordId')::uuid
            and g.state in ('OPEN', 'REOPENED')
            and r.state in ('REPAIRED', 'D1_COMPLETE', 'D7_COMPLETE', 'REOPENED')
            and v_block ->> 'reviewPhase' = case r.state when 'REPAIRED' then 'D1'
              when 'D1_COMPLETE' then 'D7_TRANSFER' when 'D7_COMPLETE' then 'RECURRENCE'
              when 'REOPENED' then 'REOPENED_REVIEW' else 'INELIGIBLE' end
            and case when r.state = 'REPAIRED' then g.d1_due_at
              when r.state = 'D1_COMPLETE' then g.d7_due_at
              else g.recurrence_due_at end <= p_as_of
        ) then raise exception '%', v_prefix || '_PLAN_ITEM_NOT_ELIGIBLE' using errcode = '23514'; end if;
        insert into public.c3r_p_plan_blocks (
          id, plan_id, user_id, subject, record_id, gap_id, review_phase,
          block_kind, ordinal, minutes
        ) values (
          (v_block ->> 'blockId')::uuid, p_plan_id, p_user_id, p_subject,
          (v_block ->> 'recordId')::uuid, (v_block ->> 'gapId')::uuid,
          (v_block ->> 'reviewPhase')::public.c3r_p_review_phase,
          v_block ->> 'blockKind', (v_block ->> 'ordinal')::integer,
          (v_block ->> 'minutes')::integer
        );
      end loop;
    end if;
    update public.c3r_p_plans set state = case p_decision
        when 'ACCEPT' then 'ACCEPTED'::public.c3r_p_plan_state
        when 'EDIT' then 'EDITED'::public.c3r_p_plan_state
        else 'REJECTED'::public.c3r_p_plan_state end,
      terminal_reason = case p_decision when 'REJECT' then 'REJECTED' else null end,
      record_version = record_version + 1, updated_at = p_as_of
    where id = p_plan_id and user_id = p_user_id and subject = p_subject
    returning * into v_plan;
    v_response := jsonb_build_object('planId', p_plan_id,
      'recordVersion', v_plan.record_version, 'state', v_plan.state, 'status', 'applied');
  end if;
  insert into public.c3r_p_command_receipts (
    command_id, user_id, subject, action, request_sha256, aggregate_id,
    resulting_version, response_metadata
  ) values (
    p_command_id, p_user_id, p_subject, 'decide_plan', v_request_sha,
    p_plan_id, v_plan.record_version, v_response
  );
  return v_response;
exception when invalid_text_representation or null_value_not_allowed
  or string_data_right_truncation then
  raise exception '%', v_prefix || '_INVALID_PLAN' using errcode = '22023';
end;
$$;

create or replace function public.c3r_p_create_plan_v1(
  p_user_id uuid, p_command_id uuid, p_plan_id uuid,
  p_plan_kind public.c3r_p_plan_kind, p_available_minutes integer,
  p_as_of timestamptz, p_blocks jsonb
)
returns jsonb language sql security invoker set search_path = ''
as $$ select public.c3r_subject_create_plan_v1(
  'PRACTICE', p_user_id, p_command_id, p_plan_id, p_plan_kind,
  p_available_minutes, p_as_of, p_blocks) $$;
create or replace function public.c3r_l_create_plan_v1(
  p_user_id uuid, p_command_id uuid, p_plan_id uuid,
  p_plan_kind public.c3r_p_plan_kind, p_available_minutes integer,
  p_as_of timestamptz, p_blocks jsonb
)
returns jsonb language sql security invoker set search_path = ''
as $$ select public.c3r_subject_create_plan_v1(
  'LAW', p_user_id, p_command_id, p_plan_id, p_plan_kind,
  p_available_minutes, p_as_of, p_blocks) $$;
create or replace function public.c3r_p_decide_plan_v1(
  p_user_id uuid, p_command_id uuid, p_plan_id uuid, p_expected_version bigint,
  p_decision text, p_as_of timestamptz, p_blocks jsonb default null
)
returns jsonb language sql security invoker set search_path = ''
as $$ select public.c3r_subject_decide_plan_v1(
  'PRACTICE', p_user_id, p_command_id, p_plan_id, p_expected_version,
  p_decision, p_as_of, p_blocks) $$;
create or replace function public.c3r_l_decide_plan_v1(
  p_user_id uuid, p_command_id uuid, p_plan_id uuid, p_expected_version bigint,
  p_decision text, p_as_of timestamptz, p_blocks jsonb default null
)
returns jsonb language sql security invoker set search_path = ''
as $$ select public.c3r_subject_decide_plan_v1(
  'LAW', p_user_id, p_command_id, p_plan_id, p_expected_version,
  p_decision, p_as_of, p_blocks) $$;

-- The durable transition does not trust a caller-supplied proof state,
-- canonical sentence, reason list, or digest. It parses the closed Law claim
-- and independently reproduces the frozen exact-applicability rules.
create or replace function public.c3r_l_validate_law_claim_v1(
  p_claim jsonb,
  p_expected_revision_id text,
  p_confirmed_at timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_reasons text[] := array[]::text[];
  v_state text;
  v_claim jsonb;
  v_evaluation jsonb;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_L_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_claim) is distinct from 'object' or p_expected_revision_id is null
    or p_confirmed_at is null then
    raise exception 'C3R_L_INVALID_CLAIM' using errcode = '22023';
  end if;
  perform public.c3r_p_require_exact_keys_v1(p_claim, array[
    'anchorId', 'anchorVersionId', 'applicableAsOf', 'blockerState',
    'confirmationMode', 'currentLawApplicability', 'effectiveFrom', 'effectiveTo',
    'exactLocator', 'exactVersionIdentity', 'lawAnchorId', 'lawAnchorVersionId',
    'lawSourceBindingId', 'sourceId', 'sourceRevisionId', 'sourceVersionId']);
  if exists (select 1 from jsonb_each(p_claim) entry
    where entry.key <> 'blockerState' and entry.key <> 'effectiveTo'
      and jsonb_typeof(entry.value) <> 'string')
    or jsonb_typeof(p_claim -> 'blockerState') is distinct from 'object'
    or p_claim -> 'effectiveTo' is distinct from 'null'::jsonb then
    raise exception 'C3R_L_INVALID_CLAIM' using errcode = '22023';
  end if;
  perform public.c3r_p_require_exact_keys_v1(p_claim -> 'blockerState',
    array['blockerCount', 'openBlockingReferenceIds']);
  if jsonb_typeof(p_claim #> '{blockerState,openBlockingReferenceIds}') is distinct from 'array'
    or jsonb_typeof(p_claim #> '{blockerState,blockerCount}') is distinct from 'number'
    or exists (select 1 from jsonb_array_elements(
      p_claim #> '{blockerState,openBlockingReferenceIds}') blocker
      where jsonb_typeof(blocker) <> 'string')
    or (p_claim #>> '{blockerState,blockerCount}')::integer < 0
    or (p_claim #>> '{blockerState,blockerCount}')::integer <>
      jsonb_array_length(p_claim #> '{blockerState,openBlockingReferenceIds}')
    or (select count(*) from jsonb_array_elements_text(
      p_claim #> '{blockerState,openBlockingReferenceIds}')) <>
      (select count(distinct value) from jsonb_array_elements_text(
        p_claim #> '{blockerState,openBlockingReferenceIds}'))
    or p_claim ->> 'confirmationMode' not in ('EXTRACTED_THEN_EDITED', 'MANUAL_STRUCTURED') then
    raise exception 'C3R_L_INVALID_CLAIM' using errcode = '22023';
  end if;

  if p_claim ->> 'sourceRevisionId' is distinct from p_expected_revision_id then
    v_reasons := array_append(v_reasons, 'source_revision_mismatch');
  end if;
  if p_claim ->> 'anchorId' is distinct from 'repair-anchor:law:synthetic-article-10' then
    v_reasons := array_append(v_reasons, 'anchor_identity_mismatch'); end if;
  if p_claim ->> 'anchorVersionId' is distinct from 'repair-anchor:law:synthetic-article-10@1' then
    v_reasons := array_append(v_reasons, 'anchor_version_mismatch'); end if;
  if p_claim ->> 'lawSourceBindingId' is distinct from 'law-binding:synthetic-official-act:article-10' then
    v_reasons := array_append(v_reasons, 'law_source_binding_mismatch'); end if;
  if p_claim ->> 'sourceId' is distinct from 'law-source:synthetic-official-act' then
    v_reasons := array_append(v_reasons, 'source_identity_mismatch'); end if;
  if p_claim ->> 'sourceVersionId' is distinct from 'law-source:synthetic-official-act@2026-01-01' then
    v_reasons := array_append(v_reasons, 'source_version_mismatch'); end if;
  if p_claim ->> 'lawAnchorId' is distinct from 'law-anchor:synthetic-official-act:article-10' then
    v_reasons := array_append(v_reasons, 'law_anchor_identity_mismatch'); end if;
  if p_claim ->> 'lawAnchorVersionId' is distinct from 'law-anchor:synthetic-official-act:article-10@2026-01-01' then
    v_reasons := array_append(v_reasons, 'law_anchor_version_mismatch'); end if;
  if p_claim ->> 'exactLocator' is distinct from 'Article 10' then
    v_reasons := array_append(v_reasons, 'exact_locator_mismatch'); end if;
  if p_claim ->> 'exactVersionIdentity' is distinct from '2026-01-01' then
    v_reasons := array_append(v_reasons, 'exact_version_identity_mismatch'); end if;
  if p_claim ->> 'effectiveFrom' is distinct from '2026-01-01' then
    v_reasons := array_append(v_reasons, 'effective_from_mismatch'); end if;
  if p_claim ->> 'applicableAsOf' is distinct from '2026-08-15' then
    v_reasons := array_append(v_reasons, 'applicable_date_mismatch'); end if;
  if p_claim ->> 'currentLawApplicability' is distinct from 'APPLICABLE_CURRENT' then
    v_reasons := array_append(v_reasons, 'current_law_applicability_mismatch'); end if;
  if p_claim -> 'blockerState' is distinct from
    '{"openBlockingReferenceIds":[],"blockerCount":0}'::jsonb then
    v_reasons := array_append(v_reasons, 'blocking_reference_state_mismatch'); end if;

  v_state := case when 'source_revision_mismatch' = any(v_reasons) then 'STALE'
    when cardinality(v_reasons) > 0 then 'UNSUPPORTED' else 'PASS' end;
  v_claim := p_claim || jsonb_build_object('learnerConfirmedAt', p_confirmed_at);
  v_evaluation := jsonb_build_object(
    'state', v_state, 'verified', v_state = 'PASS',
    'validatorId', 'validator:law-exact-applicability@1',
    'anchorId', 'repair-anchor:law:synthetic-article-10',
    'anchorVersionId', 'repair-anchor:law:synthetic-article-10@1',
    'sourceRevisionId', p_expected_revision_id,
    'lawSourceBindingId', 'law-binding:synthetic-official-act:article-10',
    'sourceId', 'law-source:synthetic-official-act',
    'sourceVersionId', 'law-source:synthetic-official-act@2026-01-01',
    'lawAnchorId', 'law-anchor:synthetic-official-act:article-10',
    'lawAnchorVersionId', 'law-anchor:synthetic-official-act:article-10@2026-01-01',
    'exactLocator', 'Article 10', 'exactVersionIdentity', '2026-01-01',
    'applicableAsOf', '2026-08-15', 'reasonCodes', to_jsonb(v_reasons));
  return jsonb_build_object(
    'claim', v_claim, 'evaluation', v_evaluation,
    'state', v_state, 'verified', v_state = 'PASS',
    'validatorId', 'validator:law-exact-applicability@1',
    'reasonCodes', to_jsonb(v_reasons),
    'canonicalSentence', concat(
      p_claim ->> 'sourceVersionId', '의 ', p_claim ->> 'exactLocator', '는 ',
      p_claim ->> 'applicableAsOf', ' 현재 적용 가능하며, 열린 차단 근거는 ',
      p_claim #>> '{blockerState,blockerCount}', '개입니다.'),
    'proofDigest', encode(extensions.digest(convert_to(jsonb_build_object(
      'claim', v_claim, 'evaluation', v_evaluation)::text, 'UTF8'), 'sha256'), 'hex'));
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'C3R_L_INVALID_CLAIM' using errcode = '22023';
end;
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
declare v_record_id uuid;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_P_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_action <> 'start' then
    begin v_record_id := (p_payload ->> 'recordId')::uuid;
    exception when invalid_text_representation then
      raise exception 'C3R_P_INVALID_INPUT' using errcode = '22023';
    end;
    if not exists (select 1 from public.c3r_p_learning_records
      where id = v_record_id and user_id = p_user_id and subject = 'PRACTICE') then
      raise exception 'C3R_P_NOT_FOUND' using errcode = 'P0002';
    end if;
  end if;
  return public.c3r_p_apply_learning_command_practice_legacy_v1(
    p_user_id, p_command_id, p_expected_version, p_action, p_payload);
end;
$$;

create or replace function public.c3r_l_apply_learning_command_v1(
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
  v_gap public.c3r_p_learning_gaps%rowtype;
  v_plan public.c3r_p_plans%rowtype;
  v_transfer_task public.c3r_p_transfer_tasks%rowtype;
  v_record_id uuid; v_attempt_id uuid; v_gap_id uuid; v_now timestamptz;
  v_request_sha text; v_response jsonb; v_phase public.c3r_p_review_phase;
  v_outcome public.c3r_p_attempt_outcome; v_entry_kind text;
  v_completed_plan_blocks integer; v_candidate_plan_blocks integer;
  v_resolved_plan_block_id uuid; v_next_d1_due_at timestamptz; v_updated_rows integer;
  v_proof jsonb; v_proof_state text;
begin
  if current_user <> 'service_role' then
    raise exception 'C3R_L_SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_user_id is null or p_command_id is null or p_expected_version < 0
    or p_action is null or p_action = '' then
    raise exception 'C3R_L_INVALID_INPUT' using errcode = '22023';
  end if;
  if not pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended('c3r-l-learner:' || p_user_id::text, 0)) then
    raise exception 'C3R_L_LEARNER_MUTATION_BUSY' using errcode = '55P03';
  end if;
  -- occurredAt is server-observed evidence time, not command identity. Excluding it
  -- lets an ordinary HTTP retry replay the original receipt without weakening CAS.
  v_request_sha := encode(extensions.digest(convert_to(concat_ws(chr(31),
    p_expected_version::text, p_action,
    (case when p_action = 'commit_feedback' then
      p_payload - 'occurredAt' - 'd1DueAt' - 'd7DueAt' - 'recurrenceDueAt'
    else p_payload - 'occurredAt' end)::text), 'UTF8'), 'sha256'), 'hex');
  select * into v_receipt from public.c3r_p_command_receipts
    where user_id = p_user_id and command_id = p_command_id;
  if found then
    if v_receipt.subject <> 'LAW' or v_receipt.action <> p_action
      or v_receipt.request_sha256 <> v_request_sha then
      raise exception 'C3R_L_IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return v_receipt.response_metadata;
  end if;

  if p_action = 'start' then
    perform public.c3r_p_require_exact_keys_v1(p_payload, array[
      'artifactId', 'attemptBody', 'attemptId', 'confidence', 'itemId',
      'configurationDigest', 'configurationSnapshot', 'occurredAt', 'prediction',
      'problemId', 'recordId', 'revisionId', 'sourceId', 'surfaceId'
    ]);
    if p_expected_version <> 0 then raise exception 'C3R_L_CAS_CONFLICT' using errcode = '40001'; end if;
    v_record_id := (p_payload ->> 'recordId')::uuid;
    v_attempt_id := (p_payload ->> 'attemptId')::uuid;
    v_now := (p_payload ->> 'occurredAt')::timestamptz;
    insert into public.c3r_p_learning_records (
      id, user_id, subject, source_id, problem_id, revision_id, item_id, artifact_id,
      initial_surface_id, prediction, confidence, configuration_snapshot,
      configuration_digest, d0_basis, created_at, updated_at
    ) values (
      v_record_id, p_user_id, 'LAW', p_payload ->> 'sourceId', p_payload ->> 'problemId',
      p_payload ->> 'revisionId', p_payload ->> 'itemId', p_payload ->> 'artifactId',
      p_payload ->> 'surfaceId', p_payload ->> 'prediction', p_payload ->> 'confidence',
      p_payload -> 'configurationSnapshot', p_payload ->> 'configurationDigest',
      jsonb_build_object(
        'artifactId', p_payload ->> 'artifactId', 'confidence', p_payload ->> 'confidence',
        'configurationDigest', p_payload ->> 'configurationDigest',
        'configurationSnapshot', p_payload -> 'configurationSnapshot',
        'itemId', p_payload ->> 'itemId', 'prediction', p_payload ->> 'prediction',
        'problemId', p_payload ->> 'problemId', 'revisionId', p_payload ->> 'revisionId',
        'sourceId', p_payload ->> 'sourceId', 'subject', 'LAW',
        'surfaceId', p_payload ->> 'surfaceId'), v_now, v_now
    ) returning * into v_record;
    insert into public.c3r_p_attempts (
      id, record_id, user_id, subject, source_id, problem_id, revision_id, item_id,
      artifact_id, surface_id, phase, outcome, body, occurred_at
    ) values (
      v_attempt_id, v_record.id, p_user_id, 'LAW', v_record.source_id,
      v_record.problem_id, v_record.revision_id, v_record.item_id, v_record.artifact_id,
      v_record.initial_surface_id, 'D0', 'FAILURE', p_payload ->> 'attemptBody', v_now
    );
    insert into public.c3r_p_ledger_entries (
      id, record_id, attempt_id, user_id, subject, entry_kind,
      evidence_ref, projection, occurred_at
    ) values (
      gen_random_uuid(), v_record.id, v_attempt_id, p_user_id, 'LAW', 'D0_FROZEN',
      'LAW_RUNTIME:c3r-l-law-durable-learning-v1#706:FROZEN_D0',
      jsonb_build_object('phase', 'D0', 'sourceId', v_record.source_id,
        'revisionId', v_record.revision_id, 'itemId', v_record.item_id,
        'artifactId', v_record.artifact_id), v_now
    );
    v_response := jsonb_build_object('recordId', v_record.id, 'recordVersion', 1,
      'state', v_record.state, 'status', 'applied');
  else
    v_record_id := (p_payload ->> 'recordId')::uuid;
    select * into v_record from public.c3r_p_learning_records
      where id = v_record_id and user_id = p_user_id and subject = 'LAW' for update;
    if not found then raise exception 'C3R_L_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_record.record_version <> p_expected_version then
      raise exception 'C3R_L_CAS_CONFLICT' using errcode = '40001';
    end if;
    if p_payload ->> 'configurationDigest' <> v_record.configuration_digest then
      raise exception 'C3R_L_FROZEN_CONFIGURATION_MISMATCH' using errcode = '23514';
    end if;

    if p_action = 'present_d7_transfer_task' then
      perform public.c3r_p_require_exact_keys_v1(p_payload, array[
        'configurationDigest', 'occurredAt', 'recordId', 'transferTaskId']);
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      if v_record.state <> 'D1_COMPLETE' or v_now < v_record.d7_due_at then
        raise exception 'C3R_L_TRANSFER_NOT_ELIGIBLE' using errcode = '23514';
      end if;
      select * into v_transfer_task from public.c3r_p_transfer_tasks
      where id = (p_payload ->> 'transferTaskId')::uuid and user_id = p_user_id
        and subject = 'LAW' and record_id = v_record.id
        and source_id = v_record.source_id and problem_id = v_record.problem_id
        and revision_id = v_record.revision_id and artifact_id = v_record.artifact_id
        and item_id <> v_record.item_id and surface_id <> v_record.initial_surface_id
        and presented_at is null and completed_at is null for update;
      if not found then raise exception 'C3R_L_TRANSFER_TASK_NOT_CURRENT' using errcode = '23514'; end if;
      update public.c3r_p_transfer_tasks set presented_at = v_now
      where id = v_transfer_task.id and user_id = p_user_id and subject = 'LAW'
      returning * into v_transfer_task;
      v_response := jsonb_build_object('recordId', v_record.id,
        'recordVersion', v_record.record_version, 'state', v_record.state, 'status', 'applied');
    elsif p_action = 'commit_feedback' then
      perform public.c3r_p_require_exact_keys_v1(p_payload, array[
        'assistanceEventId', 'assistanceKind', 'conceptId', 'configurationDigest',
        'd1DueAt', 'd7DueAt', 'evidenceRef', 'failureNote', 'failureNoteId',
        'gapId', 'occurredAt', 'recordId', 'recurrenceDueAt']);
      if v_record.state <> 'D0_OPEN' or v_record.assistance_committed then
        raise exception 'C3R_L_INVALID_TRANSITION' using errcode = '23514';
      end if;
      v_gap_id := (p_payload ->> 'gapId')::uuid;
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      insert into public.c3r_p_learning_gaps (
        id, record_id, user_id, subject, source_id, problem_id, revision_id, item_id,
        artifact_id, concept_id, evidence_ref, d1_due_at, d7_due_at, recurrence_due_at,
        created_at, updated_at
      ) values (
        v_gap_id, v_record.id, p_user_id, 'LAW', v_record.source_id,
        v_record.problem_id, v_record.revision_id, v_record.item_id, v_record.artifact_id,
        p_payload ->> 'conceptId', p_payload ->> 'evidenceRef',
        (p_payload ->> 'd1DueAt')::timestamptz, (p_payload ->> 'd7DueAt')::timestamptz,
        (p_payload ->> 'recurrenceDueAt')::timestamptz, v_now, v_now
      );
      insert into public.c3r_p_failure_notes (
        id, record_id, gap_id, user_id, subject, source_id, problem_id, revision_id,
        item_id, artifact_id, body, created_at
      ) values (
        (p_payload ->> 'failureNoteId')::uuid, v_record.id, v_gap_id, p_user_id,
        'LAW', v_record.source_id, v_record.problem_id, v_record.revision_id,
        v_record.item_id, v_record.artifact_id, p_payload ->> 'failureNote', v_now
      );
      insert into public.c3r_p_assistance_events (
        id, record_id, gap_id, user_id, subject, source_id, problem_id, revision_id,
        item_id, artifact_id, assistance_kind, assistance_level, committed_at
      ) values (
        (p_payload ->> 'assistanceEventId')::uuid, v_record.id, v_gap_id, p_user_id,
        'LAW', v_record.source_id, v_record.problem_id, v_record.revision_id,
        v_record.item_id, v_record.artifact_id, p_payload ->> 'assistanceKind', 1, v_now
      );
      update public.c3r_p_learning_records set state = 'FEEDBACK_COMMITTED',
        record_version = record_version + 1, assistance_committed = true,
        primary_gap_id = v_gap_id, d1_due_at = (p_payload ->> 'd1DueAt')::timestamptz,
        d7_due_at = (p_payload ->> 'd7DueAt')::timestamptz,
        recurrence_due_at = (p_payload ->> 'recurrenceDueAt')::timestamptz,
        updated_at = v_now
      where id = v_record.id and user_id = p_user_id and subject = 'LAW'
      returning * into v_record;
      insert into public.c3r_p_ledger_entries (
        id, record_id, gap_id, user_id, subject, entry_kind,
        evidence_ref, projection, occurred_at
      ) values (
        gen_random_uuid(), v_record.id, v_gap_id, p_user_id, 'LAW', 'GAP_OPENED',
        p_payload ->> 'evidenceRef',
        jsonb_build_object('conceptId', p_payload ->> 'conceptId', 'state', 'OPEN'), v_now
      );
    elsif p_action = 'submit_repair' then
      perform public.c3r_p_require_exact_keys_v1(p_payload, array[
        'attemptId', 'claim', 'configurationDigest', 'occurredAt', 'recordId']);
      if v_record.state <> 'FEEDBACK_COMMITTED' then
        raise exception 'C3R_L_STRUCTURED_PROOF_REQUIRED' using errcode = '23514';
      end if;
      v_attempt_id := (p_payload ->> 'attemptId')::uuid;
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      v_proof := public.c3r_l_validate_law_claim_v1(
        p_payload -> 'claim', v_record.revision_id, v_now);
      v_proof_state := v_proof ->> 'state';
      if v_proof_state <> 'PASS' then
        raise exception 'C3R_L_STRUCTURED_PROOF_REQUIRED' using errcode = '23514';
      end if;
      insert into public.c3r_p_attempts (
        id, record_id, user_id, subject, source_id, problem_id, revision_id, item_id,
        artifact_id, surface_id, phase, outcome, assistance_level, body,
        validator_id, proof_state, proof_digest, proof_claim, proof_evaluation,
        proof_reason_codes, occurred_at
      ) values (
        v_attempt_id, v_record.id, p_user_id, 'LAW', v_record.source_id,
        v_record.problem_id, v_record.revision_id, v_record.item_id, v_record.artifact_id,
        v_record.initial_surface_id, 'D0', 'ASSISTED_SUCCESS', 1,
        v_proof ->> 'canonicalSentence', 'validator:law-exact-applicability@1', v_proof_state,
        v_proof ->> 'proofDigest', v_proof -> 'claim', v_proof -> 'evaluation',
        v_proof -> 'reasonCodes', v_now
      );
      update public.c3r_p_learning_records set state = 'REPAIRED',
        record_version = record_version + 1, updated_at = v_now
      where id = v_record.id and user_id = p_user_id and subject = 'LAW'
      returning * into v_record;
      insert into public.c3r_p_ledger_entries (
        id, record_id, gap_id, attempt_id, user_id, subject, entry_kind,
        evidence_ref, projection, occurred_at
      ) values (
        gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id,
        p_user_id, 'LAW', 'REPAIR_RECORDED',
        'LAW_RUNTIME:c3r-l-law-durable-learning-v1#707:EXACT_SOURCE_ATTEMPT_ARTIFACT_ITEM_BINDING',
        jsonb_build_object('outcome', 'ASSISTED_SUCCESS',
          'validatorId', 'validator:law-exact-applicability@1',
          'proofState', v_proof_state, 'proofDigest', v_proof ->> 'proofDigest',
          'reasonCodes', v_proof -> 'reasonCodes'), v_now
      );
    elsif p_action in (
      'record_assisted_review', 'complete_d1', 'complete_d7_transfer',
      'complete_recurrence', 'complete_reopened_review', 'record_later_failure'
    ) then
      if p_action in ('complete_d1', 'complete_d7_transfer') then
        perform public.c3r_p_require_exact_keys_v1(p_payload, array[
          'attemptId', 'claim', 'configurationDigest', 'itemId', 'occurredAt',
          'planBlockId', 'planId', 'planVersion', 'recordId', 'surfaceId',
          'transferTaskId']);
      elsif p_action in ('complete_recurrence', 'complete_reopened_review') then
        perform public.c3r_p_require_exact_keys_v1(p_payload, array[
          'attemptId', 'claim', 'configurationDigest', 'itemId', 'occurredAt',
          'planBlockId', 'planId', 'planVersion', 'recordId', 'surfaceId']);
      else
        perform public.c3r_p_require_exact_keys_v1(p_payload, array[
          'attemptId', 'claim', 'configurationDigest', 'itemId', 'occurredAt',
          'recordId', 'surfaceId']);
      end if;
      v_now := (p_payload ->> 'occurredAt')::timestamptz;
      v_proof := public.c3r_l_validate_law_claim_v1(
        p_payload -> 'claim', v_record.revision_id, v_now);
      v_proof_state := v_proof ->> 'state';
      if v_proof_state not in ('PASS', 'PARTIAL', 'AMBIGUOUS', 'UNSUPPORTED', 'BLOCKED', 'STALE')
        or (p_action = 'record_later_failure' and v_proof_state = 'PASS')
        or (p_action <> 'record_later_failure' and v_proof_state <> 'PASS') then
        raise exception 'C3R_L_STRUCTURED_PROOF_REQUIRED' using errcode = '23514';
      end if;
      v_attempt_id := (p_payload ->> 'attemptId')::uuid;
      if p_action = 'record_assisted_review' then
        v_phase := 'D1'; v_outcome := 'ASSISTED_SUCCESS';
        if v_record.state <> 'REPAIRED' or v_now < v_record.d1_due_at then
          raise exception 'C3R_L_D1_NOT_ELIGIBLE' using errcode = '23514';
        end if;
        select * into v_gap from public.c3r_p_learning_gaps
        where id = v_record.primary_gap_id and user_id = p_user_id
          and subject = 'LAW' and record_id = v_record.id
          and source_id = v_record.source_id and problem_id = v_record.problem_id
          and revision_id = v_record.revision_id and item_id = v_record.item_id
          and artifact_id = v_record.artifact_id and state in ('OPEN', 'REOPENED') for update;
        if not found then raise exception 'C3R_L_GAP_BINDING_MISMATCH' using errcode = '23514'; end if;
      elsif p_action = 'complete_d1' then
        v_phase := 'D1'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'D1_RECONSTRUCTED';
        if v_record.state <> 'REPAIRED' or v_now < v_record.d1_due_at then
          raise exception 'C3R_L_D1_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      elsif p_action = 'complete_d7_transfer' then
        v_phase := 'D7_TRANSFER'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'D7_TRANSFERRED';
        if v_record.state <> 'D1_COMPLETE' or v_now < v_record.d7_due_at
          or p_payload ->> 'itemId' = v_record.item_id
          or p_payload ->> 'surfaceId' = v_record.initial_surface_id then
          raise exception 'C3R_L_TRANSFER_NOT_ELIGIBLE' using errcode = '23514';
        end if;
        select * into v_transfer_task from public.c3r_p_transfer_tasks
        where id = (p_payload ->> 'transferTaskId')::uuid and user_id = p_user_id
          and subject = 'LAW' and record_id = v_record.id
          and source_id = v_record.source_id and problem_id = v_record.problem_id
          and revision_id = v_record.revision_id and artifact_id = v_record.artifact_id
          and item_id = p_payload ->> 'itemId' and surface_id = p_payload ->> 'surfaceId'
          and item_id <> v_record.item_id and surface_id <> v_record.initial_surface_id
          and eligible_at <= v_now and presented_at is not null and presented_at <= v_now
          and completed_at is null for update;
        if not found then raise exception 'C3R_L_TRANSFER_TASK_NOT_CURRENT' using errcode = '23514'; end if;
      elsif p_action = 'complete_recurrence' then
        v_phase := 'RECURRENCE'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'RECURRENCE_COMPLETED';
        if v_record.state <> 'D7_COMPLETE' or v_now < v_record.recurrence_due_at then
          raise exception 'C3R_L_RECURRENCE_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      elsif p_action = 'complete_reopened_review' then
        v_phase := 'REOPENED_REVIEW'; v_outcome := 'INDEPENDENT_SUCCESS'; v_entry_kind := 'REOPENED_COMPLETED';
        if v_record.state <> 'REOPENED' then
          raise exception 'C3R_L_REOPENED_COMPLETION_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      else
        v_phase := 'RECURRENCE'; v_outcome := 'FAILURE'; v_entry_kind := 'GAP_REOPENED';
        if v_record.state <> 'CLOSED' then
          raise exception 'C3R_L_REOPEN_NOT_ELIGIBLE' using errcode = '23514';
        end if;
      end if;
      if p_action <> 'complete_d7_transfer' and p_payload ->> 'itemId' <> v_record.item_id then
        raise exception 'C3R_L_ATTEMPT_ITEM_MISMATCH' using errcode = '23514';
      end if;

      if p_action in ('complete_d1', 'complete_d7_transfer',
        'complete_recurrence', 'complete_reopened_review') then
        select p.* into v_plan from public.c3r_p_plans p
        where p.user_id = p_user_id and p.subject = 'LAW'
          and p.state in ('ACCEPTED', 'EDITED') and p.terminal_reason is null
          and exists (select 1 from public.c3r_p_plan_blocks relevant
            where relevant.user_id = p_user_id and relevant.subject = 'LAW'
              and relevant.plan_id = p.id and relevant.record_id = v_record.id
              and relevant.gap_id = v_record.primary_gap_id
              and relevant.review_phase = v_phase and relevant.execution_state = 'PENDING')
        order by p.generated_at desc, p.id limit 1 for update;
        if found then
          if v_plan.eligibility_digest <>
              public.c3r_subject_eligibility_digest_v1('LAW', p_user_id, v_now)
            or v_plan.review_state_digest <>
              public.c3r_subject_review_state_digest_v1('LAW', p_user_id) then
            raise exception 'C3R_L_PLAN_BLOCK_STALE' using errcode = '23514';
          end if;
          if p_payload ->> 'planId' is null or (p_payload ->> 'planId')::uuid <> v_plan.id
            or p_payload ->> 'planVersion' is null
            or (p_payload ->> 'planVersion')::bigint <> v_plan.record_version then
            raise exception 'C3R_L_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
          end if;
          select count(*), min(b.id::text)::uuid
          into v_candidate_plan_blocks, v_resolved_plan_block_id
          from public.c3r_p_plan_blocks b
          where b.user_id = p_user_id and b.subject = 'LAW' and b.plan_id = v_plan.id
            and b.record_id = v_record.id and b.gap_id = v_record.primary_gap_id
            and b.review_phase = v_phase and b.execution_state = 'PENDING';
          if v_candidate_plan_blocks <> 1 or p_payload ->> 'planBlockId' is null
            or (p_payload ->> 'planBlockId')::uuid <> v_resolved_plan_block_id then
            raise exception 'C3R_L_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
          end if;
        elsif p_payload ->> 'planBlockId' is not null or p_payload ->> 'planId' is not null
          or p_payload ->> 'planVersion' is not null then
          raise exception 'C3R_L_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
        end if;
        update public.c3r_p_plans proposed set state = 'STALE',
          terminal_reason = 'ELIGIBILITY_CHANGED', record_version = proposed.record_version + 1,
          updated_at = v_now
        where proposed.user_id = p_user_id and proposed.subject = 'LAW'
          and proposed.state = 'PROPOSED' and proposed.terminal_reason is null and exists (
            select 1 from public.c3r_p_plan_blocks pending
            where pending.user_id = p_user_id and pending.subject = 'LAW'
              and pending.plan_id = proposed.id and pending.record_id = v_record.id
              and pending.gap_id = v_record.primary_gap_id
              and pending.review_phase = v_phase and pending.execution_state = 'PENDING');
      end if;

      insert into public.c3r_p_attempts (
        id, record_id, user_id, subject, source_id, problem_id, revision_id, item_id,
        artifact_id, surface_id, phase, outcome, assistance_level, transfer_task_id,
        body, validator_id, proof_state, proof_digest, proof_claim, proof_evaluation,
        proof_reason_codes, occurred_at
      ) values (
        v_attempt_id, v_record.id, p_user_id, 'LAW', v_record.source_id,
        v_record.problem_id, v_record.revision_id, p_payload ->> 'itemId',
        v_record.artifact_id, p_payload ->> 'surfaceId', v_phase, v_outcome,
        case when v_outcome = 'ASSISTED_SUCCESS' then 1 else 0 end,
        case when p_action = 'complete_d7_transfer'
          then (p_payload ->> 'transferTaskId')::uuid else null end,
        v_proof ->> 'canonicalSentence', 'validator:law-exact-applicability@1', v_proof_state,
        v_proof ->> 'proofDigest', v_proof -> 'claim', v_proof -> 'evaluation',
        v_proof -> 'reasonCodes', v_now
      );

      if p_action = 'record_assisted_review' then
        insert into public.c3r_p_assistance_events (
          id, record_id, gap_id, attempt_id, user_id, subject, source_id, problem_id,
          revision_id, item_id, artifact_id, assistance_kind, assistance_level, committed_at
        ) values (
          gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id,
          p_user_id, 'LAW', v_record.source_id, v_record.problem_id,
          v_record.revision_id, v_record.item_id, v_record.artifact_id,
          'SMALLEST_SCAFFOLD', 1, v_now
        );
        insert into public.c3r_p_ledger_entries (
          id, record_id, gap_id, attempt_id, user_id, subject, entry_kind,
          evidence_ref, projection, occurred_at
        ) values (
          gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id,
          p_user_id, 'LAW', 'D1_ASSISTED',
          'LAW_RUNTIME:c3r-l-law-durable-learning-v1#707:BODYLESS_RECURRING_DEDUCTION_EVIDENCE_PROJECTION',
          jsonb_build_object('phase', 'D1', 'outcome', 'ASSISTED_SUCCESS',
            'assistanceKind', 'SMALLEST_SCAFFOLD', 'assistanceLevel', 1,
            'sourceId', v_record.source_id, 'revisionId', v_record.revision_id,
            'itemId', v_record.item_id, 'proofState', v_proof_state), v_now
        );
        v_next_d1_due_at := v_now + interval '1 day';
        update public.c3r_p_learning_records set d1_due_at = v_next_d1_due_at,
          record_version = record_version + 1, updated_at = v_now
        where id = v_record.id and user_id = p_user_id and subject = 'LAW'
          and state = 'REPAIRED' returning * into v_record;
        if not found then raise exception 'C3R_L_CAS_CONFLICT' using errcode = '40001'; end if;
        update public.c3r_p_learning_gaps set d1_due_at = v_next_d1_due_at, updated_at = v_now
        where id = v_gap.id and user_id = p_user_id and subject = 'LAW'
          and record_id = v_record.id and source_id = v_record.source_id
          and problem_id = v_record.problem_id and revision_id = v_record.revision_id
          and item_id = v_record.item_id and artifact_id = v_record.artifact_id;
        get diagnostics v_updated_rows = row_count;
        if v_updated_rows <> 1 then raise exception 'C3R_L_GAP_BINDING_MISMATCH' using errcode = '23514'; end if;
        update public.c3r_p_plans prior set state = 'STALE',
          terminal_reason = 'ELIGIBILITY_CHANGED', record_version = prior.record_version + 1,
          updated_at = v_now
        where prior.user_id = p_user_id and prior.subject = 'LAW'
          and prior.state in ('PROPOSED', 'ACCEPTED', 'EDITED') and exists (
            select 1 from public.c3r_p_plan_blocks pending
            where pending.user_id = p_user_id and pending.subject = 'LAW'
              and pending.plan_id = prior.id and pending.record_id = v_record.id
              and pending.gap_id = v_gap.id and pending.review_phase = 'D1'
              and pending.execution_state = 'PENDING');
        v_response := jsonb_build_object('recordId', v_record.id,
          'recordVersion', v_record.record_version, 'state', v_record.state,
          'status', 'assisted_not_independent');
      else
        update public.c3r_p_learning_records set state = case p_action
            when 'complete_d1' then 'D1_COMPLETE'::public.c3r_p_record_state
            when 'complete_d7_transfer' then 'D7_COMPLETE'::public.c3r_p_record_state
            when 'complete_recurrence' then 'CLOSED'::public.c3r_p_record_state
            when 'complete_reopened_review' then 'CLOSED'::public.c3r_p_record_state
            else 'REOPENED'::public.c3r_p_record_state end,
          record_version = record_version + 1, updated_at = v_now
        where id = v_record.id and user_id = p_user_id and subject = 'LAW'
        returning * into v_record;
        if p_action = 'complete_d1' then
          insert into public.c3r_p_transfer_tasks (
            id, record_id, user_id, subject, source_id, problem_id, revision_id,
            item_id, artifact_id, surface_id, prompt, eligible_at, created_at
          ) values (
            (p_payload ->> 'transferTaskId')::uuid, v_record.id, p_user_id, 'LAW',
            v_record.source_id, v_record.problem_id, v_record.revision_id,
            'c3r-l:law:synthetic-article-10-applicability:d7-transfer-v1', v_record.artifact_id,
            'server:law-transfer-v1',
            '별도 전이 과업: 합성 법령 Article 10의 정확한 출처·버전·위치·효력기간·적용일·현재성과 열린 차단 근거 0개를 다시 결합하세요. 제출 전에는 기준 결합 문장을 공개하지 않습니다.',
            v_record.d7_due_at, v_now
          );
        elsif p_action = 'complete_d7_transfer' then
          update public.c3r_p_transfer_tasks set completed_at = v_now
          where id = v_transfer_task.id and user_id = p_user_id and subject = 'LAW';
        end if;
        if p_action in ('complete_recurrence', 'complete_reopened_review') then
          update public.c3r_p_learning_gaps set state = 'CLOSED', closed_at = v_now,
            updated_at = v_now
          where id = v_record.primary_gap_id and user_id = p_user_id
            and subject = 'LAW' and record_id = v_record.id;
        elsif p_action = 'record_later_failure' then
          update public.c3r_p_learning_gaps set state = 'REOPENED',
            reopen_count = reopen_count + 1, reopened_at = v_now,
            recurrence_due_at = v_now, updated_at = v_now
          where id = v_record.primary_gap_id and user_id = p_user_id
            and subject = 'LAW' and record_id = v_record.id;
        else
          update public.c3r_p_learning_gaps set updated_at = v_now
          where id = v_record.primary_gap_id and user_id = p_user_id
            and subject = 'LAW' and record_id = v_record.id;
        end if;
        if v_plan.id is not null then
          update public.c3r_p_plan_blocks set execution_state = 'COMPLETE'
          where id = v_resolved_plan_block_id and user_id = p_user_id
            and subject = 'LAW' and plan_id = v_plan.id and execution_state = 'PENDING';
          get diagnostics v_completed_plan_blocks = row_count;
          if v_completed_plan_blocks <> 1 then
            raise exception 'C3R_L_PLAN_BLOCK_NOT_CURRENT' using errcode = '23514';
          end if;
          update public.c3r_p_plans set
            eligibility_digest = public.c3r_subject_eligibility_digest_v1('LAW', p_user_id, v_now),
            review_state_digest = public.c3r_subject_review_state_digest_v1('LAW', p_user_id),
            terminal_reason = case when not exists (
              select 1 from public.c3r_p_plan_blocks pending
              where pending.user_id = p_user_id and pending.subject = 'LAW'
                and pending.plan_id = v_plan.id and pending.execution_state = 'PENDING'
            ) then 'COMPLETED' else null end,
            record_version = record_version + 1, updated_at = v_now
          where id = v_plan.id and user_id = p_user_id and subject = 'LAW';
        end if;
        insert into public.c3r_p_ledger_entries (
          id, record_id, gap_id, attempt_id, user_id, subject, entry_kind,
          evidence_ref, projection, occurred_at
        ) values (
          gen_random_uuid(), v_record.id, v_record.primary_gap_id, v_attempt_id,
          p_user_id, 'LAW', v_entry_kind,
          case v_entry_kind
            when 'D1_RECONSTRUCTED' then 'LAW_RUNTIME:c3r-l-law-durable-learning-v1#706:D_PLUS_1_UNAIDED_RECONSTRUCTION'
            when 'D7_TRANSFERRED' then 'LAW_RUNTIME:c3r-l-law-durable-learning-v1#706:SEALED_NON_SAME_SURFACE_D_PLUS_7_TRANSFER'
            when 'RECURRENCE_COMPLETED' then 'LAW_RUNTIME:c3r-l-law-durable-learning-v1#706:TIMED_RECURRENCE'
            when 'REOPENED_COMPLETED' then 'LAW_RUNTIME:c3r-l-law-durable-learning-v1#706:POST_REOPEN_INDEPENDENT_COMPLETION'
            else 'LAW_RUNTIME:c3r-l-law-durable-learning-v1#706:LATER_FAILURE_REOPEN' end,
          jsonb_build_object('phase', v_phase, 'outcome', v_outcome,
            'proofState', v_proof_state, 'proofDigest', v_proof ->> 'proofDigest',
            'reasonCodes', v_proof -> 'reasonCodes', 'itemId', p_payload ->> 'itemId',
            'surfaceId', p_payload ->> 'surfaceId',
            'planBlockId', p_payload ->> 'planBlockId', 'planId', p_payload ->> 'planId',
            'planVersion', p_payload ->> 'planVersion',
            'transferTaskId', p_payload ->> 'transferTaskId'), v_now
        );
      end if;
    else
      raise exception 'C3R_L_INVALID_ACTION' using errcode = '22023';
    end if;
    if v_response is null then
      v_response := jsonb_build_object('recordId', v_record.id,
        'recordVersion', v_record.record_version, 'state', v_record.state, 'status', 'applied');
    end if;
  end if;

  insert into public.c3r_p_command_receipts (
    command_id, user_id, subject, action, request_sha256, aggregate_id,
    resulting_version, response_metadata
  ) values (
    p_command_id, p_user_id, 'LAW', p_action, v_request_sha, v_record_id,
    coalesce((v_response ->> 'recordVersion')::bigint, 0), v_response
  );
  return v_response;
exception when invalid_text_representation or null_value_not_allowed
  or string_data_right_truncation then
  raise exception 'C3R_L_INVALID_INPUT' using errcode = '22023';
end;
$$;

-- Preserve the validated table/RLS policy. The policy remains same-owner read;
-- mutations are service-only and the server wrappers pin the subject.
do $$
declare v_table text;
begin
  foreach v_table in array array[
    'c3r_p_learning_records', 'c3r_p_attempts', 'c3r_p_learning_gaps',
    'c3r_p_failure_notes', 'c3r_p_assistance_events', 'c3r_p_ledger_entries',
    'c3r_p_transfer_tasks', 'c3r_p_plans', 'c3r_p_plan_blocks',
    'c3r_p_command_receipts'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('alter table public.%I force row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format('grant select, insert, update, delete on table public.%I to service_role', v_table);
  end loop;
end;
$$;

do $$
declare v_signature text;
begin
  foreach v_signature in array array[
    'public.c3r_subject_eligibility_digest_v1(public.c3r_p_subject,uuid,timestamptz)',
    'public.c3r_subject_review_state_digest_v1(public.c3r_p_subject,uuid)',
    'public.c3r_subject_find_record_v1(public.c3r_p_subject,uuid,text,text,text,text,text)',
    'public.c3r_subject_restore_record_v1(public.c3r_p_subject,uuid,uuid)',
    'public.c3r_subject_load_dashboard_v1(public.c3r_p_subject,uuid,timestamptz)',
    'public.c3r_subject_export_learner_data_v1(public.c3r_p_subject,uuid)',
    'public.c3r_subject_delete_learner_data_v1(public.c3r_p_subject,uuid)',
    'public.c3r_subject_create_plan_v1(public.c3r_p_subject,uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb)',
    'public.c3r_subject_decide_plan_v1(public.c3r_p_subject,uuid,uuid,uuid,bigint,text,timestamptz,jsonb)',
    'public.c3r_l_eligibility_digest_v1(uuid,timestamptz)',
    'public.c3r_l_review_state_digest_v1(uuid)',
    'public.c3r_l_find_record_v1(uuid,text,text,text,text,text)',
    'public.c3r_l_restore_record_v1(uuid,uuid)',
    'public.c3r_l_load_dashboard_v1(uuid,timestamptz)',
    'public.c3r_l_export_learner_data_v1(uuid)',
    'public.c3r_l_delete_learner_data_v1(uuid)',
    'public.c3r_l_create_plan_v1(uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb)',
    'public.c3r_l_decide_plan_v1(uuid,uuid,uuid,bigint,text,timestamptz,jsonb)',
    'public.c3r_l_validate_law_claim_v1(jsonb,text,timestamptz)',
    'public.c3r_l_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)',
    'public.c3r_p_apply_learning_command_practice_legacy_v1(uuid,uuid,bigint,text,jsonb)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', v_signature);
    execute format('grant execute on function %s to service_role', v_signature);
  end loop;
end;
$$;

revoke all on function public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)
  to service_role;
revoke all on function public.c3r_p_create_plan_v1(
  uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb)
  from public, anon, authenticated;
grant execute on function public.c3r_p_create_plan_v1(
  uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb) to service_role;
revoke all on function public.c3r_p_decide_plan_v1(
  uuid,uuid,uuid,bigint,text,timestamptz,jsonb)
  from public, anon, authenticated;
grant execute on function public.c3r_p_decide_plan_v1(
  uuid,uuid,uuid,bigint,text,timestamptz,jsonb) to service_role;

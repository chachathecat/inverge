-- S233A learner-scoped AI Answer Review persistence.
-- Forward-only and additive. Rollback prerequisites and operator procedure are
-- documented in docs/s233a-answer-review-runtime.md.

create table if not exists public.s233a_answer_reviews (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id text not null,
  idempotency_key text not null,
  input_fingerprint text not null,
  record_version integer not null,
  terminal boolean not null default false,
  request_active boolean not null default true,
  review_identity jsonb not null,
  evaluation_context jsonb,
  evidence_bundles jsonb not null default '[]'::jsonb,
  persistence_receipt_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, review_id),
  unique (user_id, idempotency_key),
  constraint s233a_answer_reviews_version_positive check (record_version > 0),
  constraint s233a_answer_reviews_fingerprint_sha256 check (input_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint s233a_answer_reviews_identity_object check (jsonb_typeof(review_identity) = 'object'),
  constraint s233a_answer_reviews_evidence_array check (jsonb_typeof(evidence_bundles) = 'array'),
  constraint s233a_answer_reviews_identity_binding check (
    review_identity ->> 'reviewId' = review_id
    and review_identity ->> 'learnerOwnerRefId' =
      'learner-' || substring(encode(extensions.digest('s233a-owner-ref:' || user_id::text, 'sha256'), 'hex') from 1 for 32)
    and (review_identity ->> 'reviewRecordVersion')::integer = record_version
    and review_identity #>> '{idempotency,key}' = idempotency_key
    and review_identity #>> '{idempotency,inputFingerprint}' = input_fingerprint
    and review_identity #>> '{dataBoundary,metadataOnly}' = 'true'
    and review_identity #>> '{dataBoundary,containsRawContent}' = 'false'
  )
);

create table if not exists public.s233a_answer_review_revisions (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id text not null,
  record_version integer not null,
  review_identity jsonb not null,
  persistence_receipt_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id, record_version),
  constraint s233a_answer_review_revisions_version_positive check (record_version > 0),
  constraint s233a_answer_review_revisions_identity_object check (jsonb_typeof(review_identity) = 'object'),
  constraint s233a_answer_review_revisions_identity_binding check (
    review_identity ->> 'reviewId' = review_id
    and review_identity ->> 'learnerOwnerRefId' =
      'learner-' || substring(encode(extensions.digest('s233a-owner-ref:' || user_id::text, 'sha256'), 'hex') from 1 for 32)
    and (review_identity ->> 'reviewRecordVersion')::integer = record_version
    and review_identity #>> '{dataBoundary,metadataOnly}' = 'true'
    and review_identity #>> '{dataBoundary,containsRawContent}' = 'false'
  )
);

create table if not exists public.s233a_evidence_state_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  review_id text not null,
  evidence_state_id text not null,
  proof_bundle jsonb not null,
  persistence_receipt_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, evidence_state_id),
  constraint s233a_evidence_state_records_bundle_object check (jsonb_typeof(proof_bundle) = 'object'),
  constraint s233a_evidence_state_records_lane_a_only check (
    proof_bundle #>> '{record,emitter}' = 'lane_a'
    and proof_bundle #>> '{record,state}' in ('detected', 'corrected', 'uncertain')
    and proof_bundle #>> '{record,containsRawContent}' = 'false'
    and proof_bundle #>> '{record,learnerOwnerRefId}' =
      'learner-' || substring(encode(extensions.digest('s233a-owner-ref:' || user_id::text, 'sha256'), 'hex') from 1 for 32)
    and (
      proof_bundle #>> '{record,learnerReviewId}' = review_id
      or proof_bundle #>> '{record,state}' = 'corrected'
    )
    and proof_bundle #>> '{record,evidenceStateId}' = evidence_state_id
  )
);

create index if not exists idx_s233a_answer_reviews_user_updated
  on public.s233a_answer_reviews (user_id, updated_at desc);
create index if not exists idx_s233a_answer_review_revisions_user_review
  on public.s233a_answer_review_revisions (user_id, review_id, record_version desc);
create index if not exists idx_s233a_evidence_state_records_user_review
  on public.s233a_evidence_state_records (user_id, review_id, created_at);

alter table public.s233a_answer_reviews enable row level security;
alter table public.s233a_answer_review_revisions enable row level security;
alter table public.s233a_evidence_state_records enable row level security;

do $$
begin
  create policy "s233a answer reviews own select" on public.s233a_answer_reviews
    for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "s233a answer review revisions own select" on public.s233a_answer_review_revisions
    for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "s233a evidence state own select" on public.s233a_evidence_state_records
    for select to authenticated using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

-- Reserve the canonical S233A Queue/Today namespace for the service-role
-- transition RPC while preserving every existing non-S233A learner workflow.
do $$
begin
  create policy "s233a review queue rpc insert namespace" on public.review_queue_items
    as restrictive for insert to authenticated
    with check (coalesce(source_kind, '') <> 's233a_answer_review');
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "s233a review queue rpc update namespace" on public.review_queue_items
    as restrictive for update to authenticated
    using (coalesce(source_kind, '') <> 's233a_answer_review')
    with check (coalesce(source_kind, '') <> 's233a_answer_review');
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "s233a review queue rpc delete namespace" on public.review_queue_items
    as restrictive for delete to authenticated
    using (coalesce(source_kind, '') <> 's233a_answer_review');
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "s233a today seed rpc insert namespace" on public.action_seeds
    as restrictive for insert to authenticated
    with check (coalesce(source_type, '') <> 's233a_answer_review');
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "s233a today seed rpc update namespace" on public.action_seeds
    as restrictive for update to authenticated
    using (coalesce(source_type, '') <> 's233a_answer_review')
    with check (coalesce(source_type, '') <> 's233a_answer_review');
exception when duplicate_object then null;
end $$;
do $$
begin
  create policy "s233a today seed rpc delete namespace" on public.action_seeds
    as restrictive for delete to authenticated
    using (coalesce(source_type, '') <> 's233a_answer_review');
exception when duplicate_object then null;
end $$;

-- Authenticated clients receive durable learner-scoped reads only. All writes
-- pass through the two closed, authenticated RPCs below so that CAS, immutable
-- revisions, evidence, concept events, Queue, and Today remain one transaction.
revoke insert, update, delete on table public.s233a_answer_reviews from public, anon, authenticated;
revoke insert, update, delete on table public.s233a_answer_review_revisions from public, anon, authenticated;
revoke insert, update, delete on table public.s233a_evidence_state_records from public, anon, authenticated;
grant select on table public.s233a_answer_reviews to authenticated;
grant select on table public.s233a_answer_review_revisions to authenticated;
grant select on table public.s233a_evidence_state_records to authenticated;
grant select, insert, update, delete on table public.s233a_answer_reviews to service_role;
grant select, insert, update, delete on table public.s233a_answer_review_revisions to service_role;
grant select, insert, update, delete on table public.s233a_evidence_state_records to service_role;

create or replace function public.claim_s233a_answer_review_v1(
  p_user_id uuid,
  p_review_id text,
  p_idempotency_key text,
  p_input_fingerprint text,
  p_review_identity jsonb,
  p_receipt_id text
)
returns table (
  claim_status text,
  review_identity jsonb,
  evaluation_context jsonb,
  evidence_bundles jsonb,
  persistence_receipt_id text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_existing public.s233a_answer_reviews%rowtype;
begin
  if current_user::text <> 'service_role' or v_user_id is null
  then raise exception using errcode = '28000', message = 's233a_trusted_server_required'; end if;
  if p_review_id is null or p_idempotency_key is null or p_receipt_id is null
    or p_input_fingerprint !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_review_identity) <> 'object'
    or (p_review_identity ->> 'reviewRecordVersion')::integer <> 1
    or p_review_identity ->> 'expectedPreviousReviewRecordVersion' is not null
    or p_review_identity ->> 'reviewId' <> p_review_id
    or p_review_identity #>> '{idempotency,key}' <> p_idempotency_key
    or p_review_identity #>> '{idempotency,inputFingerprint}' <> p_input_fingerprint
    or p_review_identity ->> 'learnerOwnerRefId' <>
      'learner-' || substring(encode(extensions.digest('s233a-owner-ref:' || v_user_id::text, 'sha256'), 'hex') from 1 for 32)
    or p_review_identity #>> '{stageStatus,overall}' <> 'pending'
    or p_review_identity #>> '{dataBoundary,metadataOnly}' <> 'true'
    or p_review_identity #>> '{dataBoundary,containsRawContent}' <> 'false'
  then raise exception using errcode = '22023', message = 's233a_invalid_claim'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || ':' || p_idempotency_key, 233));
  select * into v_existing from public.s233a_answer_reviews
    where user_id = v_user_id and idempotency_key = p_idempotency_key
    for update;
  if found then
    if v_existing.review_id <> p_review_id or v_existing.input_fingerprint <> p_input_fingerprint then
      raise exception using errcode = '40001', message = 's233a_idempotency_conflict';
    end if;
    if v_existing.terminal then
      return query select 'replayed'::text, v_existing.review_identity,
        v_existing.evaluation_context, v_existing.evidence_bundles,
        v_existing.persistence_receipt_id;
      return;
    end if;
    if v_existing.review_identity #>> '{stageStatus,overall}' = 'failed_retryable'
      and not v_existing.request_active
    then
      update public.s233a_answer_reviews
      set request_active = true, updated_at = now()
      where user_id = v_user_id and review_id = v_existing.review_id
        and request_active = false
      returning * into v_existing;
      if found then
        return query select 'retry_claimed'::text, v_existing.review_identity,
          v_existing.evaluation_context, v_existing.evidence_bundles,
          v_existing.persistence_receipt_id;
        return;
      end if;
    end if;
    return query select 'in_progress'::text, v_existing.review_identity,
      v_existing.evaluation_context, v_existing.evidence_bundles,
      v_existing.persistence_receipt_id;
    return;
  end if;

  insert into public.s233a_answer_reviews (
    user_id, review_id, idempotency_key, input_fingerprint, record_version,
    terminal, request_active, review_identity, persistence_receipt_id
  ) values (
    v_user_id, p_review_id, p_idempotency_key, p_input_fingerprint, 1,
    false, true, p_review_identity, p_receipt_id
  ) returning * into v_existing;
  insert into public.s233a_answer_review_revisions (
    user_id, review_id, record_version, review_identity, persistence_receipt_id
  ) values (v_user_id, p_review_id, 1, p_review_identity, p_receipt_id);
  return query select 'claimed'::text, v_existing.review_identity,
    v_existing.evaluation_context, v_existing.evidence_bundles,
    v_existing.persistence_receipt_id;
end;
$$;

create or replace function public.transition_s233a_answer_review_v1(
  p_user_id uuid,
  p_review_id text,
  p_expected_version integer,
  p_review_identity jsonb,
  p_evaluation_context jsonb,
  p_evidence_bundles jsonb,
  p_concept_transitions jsonb,
  p_queue_linkage jsonb,
  p_receipt_id text
)
returns table (
  review_identity jsonb,
  evaluation_context jsonb,
  evidence_bundles jsonb,
  persistence_receipt_id text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := p_user_id;
  v_existing public.s233a_answer_reviews%rowtype;
  v_next_version integer := p_expected_version + 1;
  v_terminal boolean;
  v_bundle jsonb;
  v_transition jsonb;
  v_concept_status text;
begin
  if current_user::text <> 'service_role' or v_user_id is null
  then raise exception using errcode = '28000', message = 's233a_trusted_server_required'; end if;
  if p_review_id is null or p_receipt_id is null or p_expected_version < 1
    or jsonb_typeof(p_review_identity) <> 'object'
    or jsonb_typeof(p_evidence_bundles) <> 'array'
    or jsonb_typeof(p_concept_transitions) <> 'array'
    or p_review_identity ->> 'reviewId' <> p_review_id
    or (p_review_identity ->> 'reviewRecordVersion')::integer <> v_next_version
    or (p_review_identity ->> 'expectedPreviousReviewRecordVersion')::integer <> p_expected_version
    or p_review_identity #>> '{dataBoundary,metadataOnly}' <> 'true'
    or p_review_identity #>> '{dataBoundary,containsRawContent}' <> 'false'
  then raise exception using errcode = '22023', message = 's233a_invalid_transition'; end if;

  select * into v_existing from public.s233a_answer_reviews
    where user_id = v_user_id and review_id = p_review_id for update;
  if not found then raise exception using errcode = '40001', message = 's233a_review_missing'; end if;
  if v_existing.record_version = v_next_version
    and v_existing.persistence_receipt_id = p_receipt_id
    and v_existing.review_identity = p_review_identity
  then
    return query select v_existing.review_identity, v_existing.evaluation_context,
      v_existing.evidence_bundles, v_existing.persistence_receipt_id;
    return;
  end if;
  if v_existing.terminal or v_existing.record_version <> p_expected_version then
    raise exception using errcode = '40001', message = 's233a_cas_conflict';
  end if;
  if v_existing.idempotency_key <> p_review_identity #>> '{idempotency,key}'
    or v_existing.input_fingerprint <> p_review_identity #>> '{idempotency,inputFingerprint}'
  then raise exception using errcode = '22023', message = 's233a_immutable_binding_changed'; end if;

  v_terminal := p_review_identity #>> '{stageStatus,overall}' in ('completed', 'abstained');
  if v_terminal and (p_evaluation_context is null or p_queue_linkage is null) then
    raise exception using errcode = '22023', message = 's233a_terminal_payload_incomplete';
  end if;
  if not v_terminal and (p_evaluation_context is not null or jsonb_array_length(p_evidence_bundles) <> 0
    or jsonb_array_length(p_concept_transitions) <> 0 or p_queue_linkage is not null)
  then raise exception using errcode = '22023', message = 's233a_partial_payload_not_metadata_only'; end if;

  if v_terminal then
    -- The canonical concept transition is learner-scoped through auth.uid().
    -- Only this service-role RPC can project the already authenticated owner
    -- into the transaction-local JWT claims before composing that frozen RPC.
    perform pg_catalog.set_config('request.jwt.claim.sub', v_user_id::text, true);
    perform pg_catalog.set_config(
      'request.jwt.claims',
      pg_catalog.jsonb_set(
        coalesce(
          nullif(pg_catalog.current_setting('request.jwt.claims', true), '')::jsonb,
          '{}'::jsonb
        ),
        '{sub}',
        pg_catalog.to_jsonb(v_user_id::text),
        true
      )::text,
      true
    );
    for v_bundle in select value from jsonb_array_elements(p_evidence_bundles) loop
      if v_bundle #>> '{record,emitter}' <> 'lane_a'
        or v_bundle #>> '{record,state}' not in ('detected', 'corrected', 'uncertain')
        or v_bundle #>> '{record,containsRawContent}' <> 'false'
        or (
          v_bundle #>> '{record,learnerReviewId}' <> p_review_id
          and (
            v_bundle #>> '{record,state}' <> 'corrected'
            or v_bundle #>> '{record,learnerReviewId}' <>
              p_review_identity #>> '{rewriteRegradeLineage,predecessorReviewId}'
          )
        )
      then raise exception using errcode = '22023', message = 's233a_invalid_evidence_bundle'; end if;
      insert into public.s233a_evidence_state_records (
        user_id, review_id, evidence_state_id, proof_bundle, persistence_receipt_id
      ) values (
        v_user_id, p_review_id, v_bundle #>> '{record,evidenceStateId}', v_bundle, p_receipt_id
      );
    end loop;

    for v_transition in select value from jsonb_array_elements(p_concept_transitions) loop
      if v_transition ->> 'containsRawContent' <> 'false' then
        raise exception using errcode = '22023', message = 's233a_invalid_concept_transition';
      end if;
      select transition_result.status into v_concept_status
      from public.transition_personal_concept_node_v1(
        v_transition ->> 'eventId', 'second', v_transition ->> 'subjectId',
        v_transition ->> 'unitId', v_transition ->> 'taskType',
        v_transition ->> 'result', v_transition ->> 'confidence', null, 0,
        (v_transition ->> 'occurredAt')::timestamptz
      ) as transition_result;
      if v_concept_status not in ('applied', 'already_applied') then
        raise exception using errcode = '40001', message = 's233a_concept_transition_rejected';
      end if;
    end loop;

    if p_queue_linkage ->> 'containsRawContent' <> 'false'
      or p_queue_linkage ->> 'reviewId' <> p_review_id
      or p_queue_linkage ->> 'reviewQueueItemId' <> p_review_identity #>> '{queueTodayLinkage,reviewQueueItemId}'
      or p_queue_linkage ->> 'todayPlanTaskId' <> p_review_identity #>> '{queueTodayLinkage,todayPlanTaskId}'
    then raise exception using errcode = '22023', message = 's233a_invalid_queue_linkage'; end if;
    insert into public.review_queue_items (
      id, user_id, exam_id, subject_id, stage, source_submission_id, source_kind,
      status, priority_score, raw_payload, derived_payload, created_at, updated_at
    ) values (
      p_queue_linkage ->> 'reviewQueueItemId', v_user_id, 'appraiser_second',
      p_queue_linkage ->> 'subject', 'answer_review', p_queue_linkage ->> 'answerSubmissionId',
      's233a_answer_review', 'pending', (p_queue_linkage ->> 'priorityScore')::numeric,
      '{}'::jsonb,
      jsonb_build_object(
        'reviewId', p_review_id, 'skillId', p_queue_linkage -> 'skillId',
        'actionType', p_queue_linkage ->> 'actionType', 'dueAt', p_queue_linkage ->> 'dueAt',
        'metadataOnly', true, 'containsRawContent', false
      ), now(), now()
    );
    insert into public.action_seeds (
      id, user_id, source_type, seed_type, priority_score, rendered_text, raw_payload, created_at
    ) values (
      (p_queue_linkage ->> 'todayPlanTaskId')::uuid, v_user_id, 's233a_answer_review',
      p_queue_linkage ->> 'actionType', (p_queue_linkage ->> 'priorityScore')::numeric,
      p_queue_linkage ->> 'renderedText',
      jsonb_build_object(
        'reviewId', p_review_id, 'reviewQueueItemId', p_queue_linkage ->> 'reviewQueueItemId',
        'dueAt', p_queue_linkage ->> 'dueAt', 'metadataOnly', true, 'containsRawContent', false
      ), now()
    );
  end if;

  update public.s233a_answer_reviews set
    record_version = v_next_version,
    terminal = v_terminal,
    request_active = not (
      v_terminal or p_review_identity #>> '{stageStatus,overall}' = 'failed_retryable'
    ),
    review_identity = p_review_identity,
    evaluation_context = p_evaluation_context,
    evidence_bundles = p_evidence_bundles,
    persistence_receipt_id = p_receipt_id,
    updated_at = now()
  where user_id = v_user_id and review_id = p_review_id and record_version = p_expected_version
  returning * into v_existing;
  if not found then raise exception using errcode = '40001', message = 's233a_cas_conflict'; end if;
  insert into public.s233a_answer_review_revisions (
    user_id, review_id, record_version, review_identity, persistence_receipt_id
  ) values (v_user_id, p_review_id, v_next_version, p_review_identity, p_receipt_id);
  return query select v_existing.review_identity, v_existing.evaluation_context,
    v_existing.evidence_bundles, v_existing.persistence_receipt_id;
end;
$$;

revoke all on function public.claim_s233a_answer_review_v1(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.transition_s233a_answer_review_v1(uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text) from public, anon, authenticated;
grant execute on function public.claim_s233a_answer_review_v1(uuid, text, text, text, jsonb, text) to service_role;
grant execute on function public.transition_s233a_answer_review_v1(uuid, text, integer, jsonb, jsonb, jsonb, jsonb, jsonb, text) to service_role;
grant execute on function public.transition_personal_concept_node_v1(
  text, text, text, text, text, text, text, text, integer, timestamptz
) to service_role;

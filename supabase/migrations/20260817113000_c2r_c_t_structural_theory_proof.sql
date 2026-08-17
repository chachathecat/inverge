-- C2R-C-T Theory trusted-repair complete vertical delta.
-- Forward-only rollback: disable WCV_C2R_C_T_THEORY_ENABLED. The existing
-- WCV_C2R_C_P_PRACTICE_ENABLED flag and Practice rows remain independently
-- usable. No remote application is authorized by this repository migration.

alter table public.wcv_c2_trusted_repair_sessions
  drop constraint if exists wcv_c2_trusted_repair_sessions_subject_check,
  drop constraint if exists wcv_c2_trusted_repair_sessions_contract_version_check,
  drop constraint if exists wcv_c2_trusted_repair_sessions_fixture_version_check,
  drop constraint if exists wcv_c2_trusted_repair_sessions_rubric_version_check,
  drop constraint if exists wcv_c2_trusted_repair_sessions_validator_version_check;

alter table public.wcv_c2_trusted_repair_sessions
  add constraint wcv_c2_trusted_repair_sessions_subject_binding_check check (
    (
      subject = 'appraisal_practical'
      and contract_version = 'wcv_c2r_c_p_structured_practice_proof.v2'
      and fixture_version = 'wcv_c2r_c_p_practice_rights_safe_fixtures.2026-08-17.v1'
      and rubric_version = 'wcv_c2r_c_p_practice_relation_rubric.v1'
      and validator_version = 'validator:practice-calculation-claim@2'
    )
    or
    (
      subject = 'appraisal_theory'
      and contract_version = 'wcv_c2r_c_t_structured_theory_proof.v1'
      and fixture_version = 'wcv_c2r_c_t_theory_rights_safe_fixtures.2026-08-17.v1'
      and rubric_version = 'wcv_c2r_c_t_theory_target_scope_rubric.v1'
      and validator_version = 'validator:theory-scoped-predicate@1'
    )
  );

alter table public.wcv_c2_trusted_repair_scarcity_events
  drop constraint if exists wcv_c2_trusted_repair_scarcity_events_subject_check;
alter table public.wcv_c2_trusted_repair_scarcity_events
  add constraint wcv_c2_trusted_repair_scarcity_events_subject_check
  check (subject in ('appraisal_practical', 'appraisal_theory'));

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
  v_subject text;
  v_claim jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_session_id::text || ':' || p_command_id::text,
      0
    )
  );

  select receipt.resulting_record_version, receipt.resulting_state
  into v_next_version, v_current_state
  from public.wcv_c2_trusted_repair_command_receipts as receipt
  where receipt.command_id = p_command_id
    and receipt.session_id = p_session_id
    and receipt.user_id = p_user_id;

  if found then
    return query select v_next_version, v_current_state, true;
    return;
  end if;

  select session.record_version, session.state, session.subject
  into v_current_version, v_current_state, v_subject
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
      'inputMode', 'revisionNumber', 'prediction', 'predictionConfidence',
      'selfDiagnosisCode', 'gapCandidates', 'repairNeed', 'repairPath',
      'continuation', 'structuredClaim', 'proofEvaluation', 'resultReasonCodes'
    ] <> '{}'::jsonb
  then
    raise exception 'WCV_C2_INVALID_STATE_DATA';
  end if;

  if p_next_state = 'verified' and v_subject = 'appraisal_practical' and (
    jsonb_typeof(p_state_data -> 'structuredClaim') <> 'object'
    or (p_state_data -> 'structuredClaim') - array[
      'sourceRevisionId', 'anchorId', 'anchorVersionId', 'grossIncome',
      'operatingExpense', 'operator', 'operandOrder', 'result', 'sign',
      'rounding', 'confirmationMode', 'learnerConfirmedAt'
    ] <> '{}'::jsonb
    or p_state_data -> 'structuredClaim' ->> 'sourceRevisionId'
      is distinct from p_confirmed_revision_id::text
    or p_state_data -> 'structuredClaim' ->> 'anchorId'
      is distinct from 'repair-anchor:practice:synthetic-net-income'
    or p_state_data -> 'structuredClaim' ->> 'anchorVersionId'
      is distinct from 'repair-anchor:practice:synthetic-net-income@1'
    or p_state_data -> 'structuredClaim' -> 'grossIncome'
      is distinct from '{"value":120000000,"unit":"KRW_PER_YEAR"}'::jsonb
    or p_state_data -> 'structuredClaim' -> 'operatingExpense'
      is distinct from '{"value":20000000,"unit":"KRW_PER_YEAR"}'::jsonb
    or p_state_data -> 'structuredClaim' ->> 'operator' is distinct from 'SUBTRACT'
    or p_state_data -> 'structuredClaim' -> 'operandOrder'
      is distinct from '["gross_income","operating_expense"]'::jsonb
    or p_state_data -> 'structuredClaim' -> 'result'
      is distinct from '{"value":100000000,"unit":"KRW_PER_YEAR"}'::jsonb
    or p_state_data -> 'structuredClaim' ->> 'sign' is distinct from 'POSITIVE'
    or p_state_data -> 'structuredClaim' -> 'rounding'
      is distinct from '{"mode":"HALF_UP","scale":0,"required":false}'::jsonb
    or p_state_data -> 'structuredClaim' ->> 'confirmationMode'
      not in ('EXTRACTED_THEN_EDITED', 'MANUAL_STRUCTURED')
    or (p_state_data -> 'structuredClaim' ->> 'learnerConfirmedAt')::timestamptz is null
    or p_state_data -> 'proofEvaluation' ->> 'state' is distinct from 'PASS'
    or p_state_data -> 'proofEvaluation' ->> 'validatorId'
      is distinct from 'validator:practice-calculation-claim@2'
    or (p_state_data -> 'proofEvaluation' ->> 'verified')::boolean is distinct from true
  ) then
    raise exception 'WCV_C2_STRUCTURED_PRACTICE_PROOF_REQUIRED';
  end if;

  if p_next_state = 'verified' and v_subject = 'appraisal_theory' then
    v_claim := p_state_data -> 'structuredClaim';
    if jsonb_typeof(v_claim) <> 'object'
      or v_claim - array[
        'sourceRevisionId', 'anchorId', 'anchorVersionId', 'targetScopeId',
        'clauses', 'confirmationMode', 'learnerConfirmedAt'
      ] <> '{}'::jsonb
      or v_claim ->> 'sourceRevisionId' is distinct from p_confirmed_revision_id::text
      or v_claim ->> 'anchorId'
        is distinct from 'repair-anchor:theory:synthetic-income-approach'
      or v_claim ->> 'anchorVersionId'
        is distinct from 'repair-anchor:theory:synthetic-income-approach@1'
      or v_claim ->> 'targetScopeId'
        is distinct from 'theory-target:synthetic-income-approach'
      or v_claim ->> 'confirmationMode'
        not in ('EXTRACTED_THEN_EDITED', 'MANUAL_STRUCTURED')
      or (v_claim ->> 'learnerConfirmedAt')::timestamptz is null
      or jsonb_typeof(v_claim -> 'clauses') <> 'array'
      or jsonb_array_length(v_claim -> 'clauses') not between 1 and 24
      or (
        select pg_catalog.coalesce(pg_catalog.sum(
          jsonb_array_length(clause.value -> 'predicates')
        ), 0)
        from jsonb_array_elements(v_claim -> 'clauses') as clause(value)
      ) > 64
      or exists (
        select 1
        from jsonb_array_elements(v_claim -> 'clauses') with ordinality
          as clause(value, ordinal)
        where jsonb_typeof(clause.value) <> 'object'
          or clause.value - array[
            'clauseIndex', 'scopeResolution', 'scopeId', 'predicates'
          ] <> '{}'::jsonb
          or (clause.value ->> 'clauseIndex')::integer <> clause.ordinal
          or clause.value ->> 'scopeResolution' is distinct from 'EXACT'
          or clause.value ->> 'scopeId' not in (
            'theory-target:synthetic-income-approach',
            'theory-target:synthetic-cost-approach'
          )
          or jsonb_typeof(clause.value -> 'predicates') <> 'array'
          or jsonb_array_length(clause.value -> 'predicates') < 1
          or exists (
            select 1
            from jsonb_array_elements(clause.value -> 'predicates') as predicate(value)
            where jsonb_typeof(predicate.value) <> 'object'
              or predicate.value - array['predicateId', 'polarity'] <> '{}'::jsonb
              or predicate.value ->> 'polarity' not in ('ASSERTED', 'NEGATED')
          )
      )
      or not exists (
        select 1
        from jsonb_array_elements(v_claim -> 'clauses') as clause(value),
          jsonb_array_elements(clause.value -> 'predicates') as predicate(value)
        where clause.value ->> 'scopeId' = 'theory-target:synthetic-income-approach'
          and predicate.value ->> 'predicateId' in (
            'converts_expected_income_to_value',
            'capitalizes_expected_income',
            'discounts_expected_cash_flow'
          )
          and predicate.value ->> 'polarity' = 'ASSERTED'
      )
      or exists (
        select 1
        from jsonb_array_elements(v_claim -> 'clauses') as clause(value),
          jsonb_array_elements(clause.value -> 'predicates') as predicate(value)
        where clause.value ->> 'scopeId' = 'theory-target:synthetic-income-approach'
          and predicate.value ->> 'predicateId' = 'uses_only_historical_cost'
          and predicate.value ->> 'polarity' = 'ASSERTED'
      )
      or exists (
        select 1
        from jsonb_array_elements(v_claim -> 'clauses') as clause(value),
          jsonb_array_elements(clause.value -> 'predicates') as predicate(value)
        where clause.value ->> 'scopeId' = 'theory-target:synthetic-income-approach'
        group by predicate.value ->> 'predicateId'
        having pg_catalog.count(distinct predicate.value ->> 'polarity') > 1
      )
      or p_state_data -> 'proofEvaluation' ->> 'state' is distinct from 'PASS'
      or p_state_data -> 'proofEvaluation' ->> 'validatorId'
        is distinct from 'validator:theory-scoped-predicate@1'
      or p_state_data -> 'proofEvaluation' ->> 'targetScopeId'
        is distinct from 'theory-target:synthetic-income-approach'
      or (p_state_data -> 'proofEvaluation' ->> 'verified')::boolean is distinct from true
    then
      raise exception 'WCV_C2_STRUCTURED_THEORY_PROOF_REQUIRED';
    end if;
  end if;

  if p_artifact is not null then
    if jsonb_typeof(p_artifact) <> 'object'
      or p_artifact - array[
        'artifactId', 'revisionNumber', 'kind', 'inputMode', 'body', 'createdAt'
      ] <> '{}'::jsonb
    then
      raise exception 'WCV_C2_INVALID_ARTIFACT_SHAPE';
    end if;
    insert into public.wcv_c2_trusted_repair_private_artifacts (
      id, session_id, user_id, revision_number, artifact_kind, input_mode,
      body, created_at
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
        'exposureId', 'revisionId', 'gapId', 'assistanceLevel',
        'scaffoldKind', 'occurredAt'
      ] <> '{}'::jsonb
    then
      raise exception 'WCV_C2_INVALID_EXPOSURE_SHAPE';
    end if;
    insert into public.wcv_c2_trusted_repair_exposure_events (
      id, session_id, user_id, revision_id, gap_id, assistance_level,
      scaffold_kind, occurred_at
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
  set state = p_next_state,
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
    command_id, session_id, user_id, resulting_record_version, resulting_state
  ) values (
    p_command_id, p_session_id, p_user_id, v_next_version, p_next_state
  );

  return query select v_next_version, p_next_state, false;
end;
$$;

revoke all on function public.wcv_c2_apply_trusted_repair_transition_v1(
  uuid, uuid, uuid, bigint, text, text, jsonb, uuid, text, text,
  smallint, boolean, jsonb, jsonb
) from public, anon, authenticated;
grant execute on function public.wcv_c2_apply_trusted_repair_transition_v1(
  uuid, uuid, uuid, bigint, text, text, jsonb, uuid, text, text,
  smallint, boolean, jsonb, jsonb
) to service_role;

comment on table public.wcv_c2_trusted_repair_sessions is
  'Bodyless canonical C2R-C-P Practice and C2R-C-T Theory session metadata with subject-exact typed-proof bindings.';
comment on function public.wcv_c2_apply_trusted_repair_transition_v1 is
  'Service-only exact-user CAS transition with subject-exact Practice or Theory structured-proof validation and replay receipt.';

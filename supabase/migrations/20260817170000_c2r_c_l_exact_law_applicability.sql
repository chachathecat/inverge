-- C2R-C-L Law trusted-repair complete vertical delta.
-- Forward-only rollback: disable WCV_C2R_C_L_LAW_ENABLED. Practice and Theory
-- flags and rows remain independently usable. No remote application is
-- authorized by this repository migration.

alter table public.wcv_c2_trusted_repair_sessions
  drop constraint if exists wcv_c2_trusted_repair_sessions_subject_binding_check;

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
    or
    (
      subject = 'appraisal_law'
      and contract_version = 'wcv_c2r_c_l_exact_law_applicability_proof.v1'
      and fixture_version = 'wcv_c2r_c_l_law_rights_safe_fixtures.2026-08-17.v1'
      and rubric_version = 'wcv_c2r_c_l_law_exact_applicability_rubric.v1'
      and validator_version = 'validator:law-exact-applicability@1'
    )
  );

alter table public.wcv_c2_trusted_repair_scarcity_events
  drop constraint if exists wcv_c2_trusted_repair_scarcity_events_subject_check;
alter table public.wcv_c2_trusted_repair_scarcity_events
  add constraint wcv_c2_trusted_repair_scarcity_events_subject_check
  check (subject in ('appraisal_practical', 'appraisal_theory', 'appraisal_law'));

create or replace function public.wcv_c2_validate_exact_law_proof_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_claim jsonb;
  v_proof jsonb;
begin
  if new.subject <> 'appraisal_law' or new.state <> 'verified' then
    return new;
  end if;

  v_claim := new.state_data -> 'structuredClaim';
  v_proof := new.state_data -> 'proofEvaluation';
  if jsonb_typeof(v_claim) is distinct from 'object'
    or v_claim - array[
      'sourceRevisionId', 'anchorId', 'anchorVersionId',
      'lawSourceBindingId', 'sourceId', 'sourceVersionId', 'lawAnchorId',
      'lawAnchorVersionId', 'exactLocator', 'exactVersionIdentity',
      'effectiveFrom', 'effectiveTo', 'applicableAsOf',
      'currentLawApplicability', 'blockerState', 'confirmationMode',
      'learnerConfirmedAt'
    ] <> '{}'::jsonb
    or v_claim ->> 'sourceRevisionId' is distinct from new.confirmed_revision_id::text
    or v_claim ->> 'anchorId' is distinct from 'repair-anchor:law:synthetic-article-10'
    or v_claim ->> 'anchorVersionId' is distinct from 'repair-anchor:law:synthetic-article-10@1'
    or v_claim ->> 'lawSourceBindingId' is distinct from 'law-binding:synthetic-official-act:article-10'
    or v_claim ->> 'sourceId' is distinct from 'law-source:synthetic-official-act'
    or v_claim ->> 'sourceVersionId' is distinct from 'law-source:synthetic-official-act@2026-01-01'
    or v_claim ->> 'lawAnchorId' is distinct from 'law-anchor:synthetic-official-act:article-10'
    or v_claim ->> 'lawAnchorVersionId' is distinct from 'law-anchor:synthetic-official-act:article-10@2026-01-01'
    or v_claim ->> 'exactLocator' is distinct from 'Article 10'
    or v_claim ->> 'exactVersionIdentity' is distinct from '2026-01-01'
    or v_claim ->> 'effectiveFrom' is distinct from '2026-01-01'
    or v_claim -> 'effectiveTo' is distinct from 'null'::jsonb
    or v_claim ->> 'applicableAsOf' is distinct from '2026-08-15'
    or v_claim ->> 'currentLawApplicability' is distinct from 'APPLICABLE_CURRENT'
    or v_claim -> 'blockerState' is distinct from
      '{"openBlockingReferenceIds":[],"blockerCount":0}'::jsonb
    or v_claim ->> 'confirmationMode' not in ('EXTRACTED_THEN_EDITED', 'MANUAL_STRUCTURED')
    or (v_claim ->> 'learnerConfirmedAt')::timestamptz is null
    or jsonb_typeof(v_proof) is distinct from 'object'
    or v_proof - array[
      'state', 'verified', 'validatorId', 'anchorId', 'anchorVersionId',
      'sourceRevisionId', 'lawSourceBindingId', 'sourceId', 'sourceVersionId',
      'lawAnchorId', 'lawAnchorVersionId', 'exactLocator',
      'exactVersionIdentity', 'applicableAsOf', 'reasonCodes'
    ] <> '{}'::jsonb
    or v_proof ->> 'state' is distinct from 'PASS'
    or (v_proof ->> 'verified')::boolean is distinct from true
    or v_proof ->> 'validatorId' is distinct from 'validator:law-exact-applicability@1'
    or v_proof ->> 'anchorId' is distinct from v_claim ->> 'anchorId'
    or v_proof ->> 'anchorVersionId' is distinct from v_claim ->> 'anchorVersionId'
    or v_proof ->> 'sourceRevisionId' is distinct from new.confirmed_revision_id::text
    or v_proof ->> 'lawSourceBindingId' is distinct from v_claim ->> 'lawSourceBindingId'
    or v_proof ->> 'sourceId' is distinct from v_claim ->> 'sourceId'
    or v_proof ->> 'sourceVersionId' is distinct from v_claim ->> 'sourceVersionId'
    or v_proof ->> 'lawAnchorId' is distinct from v_claim ->> 'lawAnchorId'
    or v_proof ->> 'lawAnchorVersionId' is distinct from v_claim ->> 'lawAnchorVersionId'
    or v_proof ->> 'exactLocator' is distinct from v_claim ->> 'exactLocator'
    or v_proof ->> 'exactVersionIdentity' is distinct from v_claim ->> 'exactVersionIdentity'
    or v_proof ->> 'applicableAsOf' is distinct from v_claim ->> 'applicableAsOf'
    or v_proof -> 'reasonCodes' is distinct from '[]'::jsonb
  then
    raise exception 'WCV_C2_STRUCTURED_LAW_PROOF_REQUIRED';
  end if;
  return new;
end;
$$;

revoke all on function public.wcv_c2_validate_exact_law_proof_v1()
from public, anon, authenticated;

drop trigger if exists wcv_c2_validate_exact_law_proof_v1
on public.wcv_c2_trusted_repair_sessions;
create trigger wcv_c2_validate_exact_law_proof_v1
before insert or update on public.wcv_c2_trusted_repair_sessions
for each row execute function public.wcv_c2_validate_exact_law_proof_v1();

comment on table public.wcv_c2_trusted_repair_sessions is
  'Bodyless C2R-C-P Practice, C2R-C-T Theory, and C2R-C-L Law session metadata with subject-exact typed-proof bindings.';
comment on function public.wcv_c2_validate_exact_law_proof_v1 is
  'Fail-closed persistence guard for exact Law source/version/anchor/locator/effective-window/applicable-date/currentness/zero-blocker proof.';

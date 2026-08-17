import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { readTextFileSync } from "./platform-text.mjs";

const ROOT = process.cwd();
const read = (relativePath) => readTextFileSync(path.join(ROOT, relativePath));
const MIGRATION =
  "supabase/migrations/20260817113000_c2r_c_t_structural_theory_proof.sql";
const WORKFLOW =
  ".github/workflows/c2r-c-t-theory-trusted-repair-runtime.yml";
const VERIFIER = "scripts/automation/verify-c2r-c-p-practice-runtime.mjs";

test("C2R-C-T persistence adds exact Theory bindings without weakening Practice", () => {
  const sql = read(MIGRATION);
  assert.match(sql, /Forward-only rollback: disable WCV_C2R_C_T_THEORY_ENABLED/);
  assert.match(sql, /subject = 'appraisal_practical'[\s\S]*validator:practice-calculation-claim@2/);
  assert.match(sql, /subject = 'appraisal_theory'[\s\S]*validator:theory-scoped-predicate@1/);
  assert.match(sql, /check \(subject in \('appraisal_practical', 'appraisal_theory'\)\)/);
  assert.match(sql, /p_next_state = 'verified' and v_subject = 'appraisal_theory'/);
  assert.match(sql, /repair-anchor:theory:synthetic-income-approach@1/);
  assert.match(sql, /theory-target:synthetic-income-approach/);
  assert.match(sql, /jsonb_array_length\(v_claim -> 'clauses'\) not between 1 and 24/);
  assert.match(sql, /v_occurrence_count > 64/);
  assert.match(sql, /scopeResolution' is distinct from 'EXACT'/);
  assert.match(sql, /v_target_polarities ->> v_predicate_id/);
  assert.match(sql, /v_existing_polarity <> v_polarity/);
  assert.match(
    sql,
    /drop constraint if exists wcv_c2_trusted_repair_sessions_subject_binding_check;[\s\S]*add constraint wcv_c2_trusted_repair_sessions_subject_binding_check/,
  );
  assert.match(
    sql,
    /v_required_asserted := v_required_asserted or v_polarity = 'ASSERTED'[\s\S]*v_required_negated := v_required_negated or v_polarity = 'NEGATED'/,
  );
  assert.match(
    sql,
    /if v_clause ->> 'scopeId' = 'theory-target:synthetic-income-approach'[\s\S]*v_existing_polarity <> v_polarity[\s\S]*v_mixed_polarity := true/,
  );
  assert.match(
    sql,
    /if v_required_negated[\s\S]*or v_mixed_polarity[\s\S]*or v_forbidden_asserted[\s\S]*or not \(v_required_asserted or v_alternative_asserted\)/,
  );
  assert.match(sql, /jsonb_typeof\(v_proof -> 'reasonCodes'\) is distinct from 'array'/);
  assert.match(sql, /jsonb_array_length\(v_proof -> 'reasonCodes'\) <> 0/);
  assert.match(sql, /WCV_C2_STRUCTURED_THEORY_PROOF_REQUIRED/);
  assert.match(sql, /WCV_C2_CAS_CONFLICT/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /security invoker/);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
  assert.doesNotMatch(sql, /drop table|truncate table|delete from/i);
});

test("C2R-C-T API and UI require a subject-exact structured confirmation", () => {
  const route = read("app/api/review-os/trusted-repair/route.ts");
  const access = read("lib/review-os/trusted-repair-access.ts");
  const server = read("lib/review-os/trusted-repair-server.ts");
  const loop = read("components/review-os/trusted-repair-loop.tsx");
  const page = read("app/app/trusted-repair/page.tsx");

  assert.match(route, /action === "confirm_theory_claim"/);
  assert.match(route, /parseTheoryPredicateClaimV1Input\(record\.claim\)/);
  assert.match(server, /const authorized = new Set\(authorizedSubjects\)/);
  assert.match(server, /if \(!authorized\.has\(subject\)\)/);
  assert.match(
    server,
    /const aggregate = await repository\.create\([\s\S]*?requireAuthorizedSubject\(aggregate\.session\.subject\);[\s\S]*?aggregate\.session\.subject !== input\.subject[\s\S]*?TrustedRepairContractError\("not_found"\)/,
  );
  assert.match(access, /WCV_C2R_C_T_OWNER_EMAILS/);
  assert.match(access, /subjects\.push\("appraisal_theory"\)/);
  assert.match(server, /theoryStructuredConfirmation:/);
  assert.match(server, /confirmTheoryClaim\(input:/);
  assert.match(loop, /theory \? "confirm_theory_claim" : "confirm_claim"/);
  assert.match(loop, /aria-label="필수 술어 극성"/);
  assert.match(loop, /aria-label="금지 술어 극성"/);
  assert.match(page, /availableSubjects=\{availableSubjects\}/);
  assert.match(read(".env.example"), /WCV_C2R_C_T_THEORY_ENABLED=false/);
  assert.match(read(".env.example"), /WCV_C2R_C_T_OWNER_EMAILS=/);
  assert.doesNotMatch(route, /mastery\s*:\s*true|transfer\s*:\s*true/);
});

test("C2R-C-T fixture inventory is synthetic, rights-bound, and subject exact", () => {
  const fixtures = read("lib/review-os/trusted-repair-fixtures.ts");
  const binding = read("lib/review-os/trusted-repair-source-binding.ts");
  assert.match(fixtures, /subject: "appraisal_theory"/);
  assert.match(fixtures, /sourceType: "synthetic"/);
  assert.match(fixtures, /sourceClass: "INVERGE_ORIGINAL"/);
  assert.match(fixtures, /permittedPurposes: \["OWNER_TEST_ONLY"\]/);
  assert.match(fixtures, /GOLD_FAMILIES/);
  assert.match(fixtures, /"GOLDEN" as const/);
  assert.match(fixtures, /"OWNER_GOLD" as const/);
  assert.match(binding, /SYNTHETIC_THEORY_SOURCE_BINDING/);
  assert.doesNotMatch(fixtures, /OFFICIAL_REDISSEMINATION|THIRD_PARTY_ACADEMY/);
});

test("C2R-C-T exact-head runtime workflow is fork-safe and credential-free", () => {
  const workflow = read(WORKFLOW);
  const verifier = read(VERIFIER);
  assert.match(workflow, /pull_request:\s*\n\s*branches: \[main\]/);
  assert.match(workflow, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{PR_HEAD_SHA\}"/);
  assert.match(workflow, /C2R_RUNTIME_SUBJECT: appraisal_theory/);
  assert.match(workflow, /--cleanup\s+--require-complete/);
  assert.match(workflow, /git diff --exit-code -- package\.json package-lock\.json/);
  assert.match(workflow, /if: success\(\)/);
  assert.doesNotMatch(workflow, /pull_request_target|persist-credentials: true|SUPABASE_ACCESS_TOKEN/);
  assert.match(verifier, /THEORY_RUNTIME/);
  assert.match(verifier, /\[PRACTICE_MIGRATION_PATH, THEORY_MIGRATION_PATH\]/);
  assert.match(verifier, /theory_migration_replay_psql/);
  assert.match(verifier, /fs\.readFileSync\(THEORY_MIGRATION_PATH, "utf8"\)/);
  assert.match(verifier, /theory_subject_binding_count_psql/);
  assert.match(verifier, /theory_migration_replay_safe/);
  assert.match(verifier, /validateTheoryConfirmationDiagnostic/);
  assert.match(verifier, /theory_final_confirmation_metadata_safe/);
  assert.match(verifier, /cross_subject_start_replay_fails_closed/);
  assert.match(verifier, /enabledSubjects: "both"/);
  assert.match(verifier, /enabledSubjects: "practice"/);
  assert.match(
    verifier,
    /source\.replace\(expected, `project_id = "\$\{PROJECT_ID\}"`\)/,
  );
  assert.match(verifier, /source\.split\(expected\)\.length !== 2/);
  assert.match(
    verifier,
    /\.c2r-c-t-playwright\.runtime\.config\.ts/,
  );
  assert.match(
    verifier,
    /browserConfigSource\.replace\([\s\S]*c2r-c-t-theory-trusted-repair-runtime\.spec\.ts/,
  );
  assert.match(
    verifier,
    /--config=\$\{BROWSER_RUNTIME_CONFIG_PATH\}/,
  );
  assert.match(
    verifier,
    /fs\.rmSync\(BROWSER_RUNTIME_CONFIG_PATH, \{ force: true \}\)/,
  );
  assert.match(verifier, /c2r-c-t-theory-trusted-repair-runtime\.spec\.ts/);
  assert.match(verifier, /remoteSupabaseUsed: false/);
  assert.match(verifier, /repositorySecretsUsed: false/);
  assert.match(verifier, /liveProvidersUsed: false/);
});

test("C2R-C-T browser contract covers the complete bounded Theory outcome", () => {
  const e2e = read("tests/e2e/c2r-c-t-theory-trusted-repair-runtime.spec.ts");
  for (const mode of [
    "TYPED_TEXT",
    "EDITABLE_PHOTO_OCR",
    "EDITABLE_PDF_OCR",
    "EDITABLE_VOICE_TRANSCRIPTION",
    "STRUCTURED_SELECTION",
  ]) {
    assert.match(e2e, new RegExp(mode));
  }
  for (const width of [390, 768, 1440]) {
    assert.match(e2e, new RegExp(`width: ${width}`));
  }
  assert.match(e2e, /new AxeBuilder/);
  assert.match(e2e, /keyboardOnly/);
  assert.match(e2e, /createPartial/);
  assert.match(e2e, /duplicateStart/);
  assert.match(e2e, /practiceDenied/);
  assert.match(e2e, /cross-subject start replay seed/);
  assert.match(e2e, /cross-subject start replay is denied with Theory disabled/);
  assert.match(e2e, /cross-subject start replay is denied with Practice disabled/);
  assert.match(e2e, /page\.waitForResponse/);
  for (const field of [
    "preState",
    "responseStatus",
    "safeErrorCode",
    "postState",
    "proofEvaluationState",
    "proofReasonCodeIds",
    "recordVersion",
    "theoryStructuredConfirmationExisted",
  ]) {
    assert.match(e2e, new RegExp(field));
  }
  assert.match(e2e, /negated_with_alternative/);
  assert.match(e2e, /arbitrary_mixed/);
  assert.match(e2e, /cross-user|tenant isolation/i);
  assert.match(e2e, /restart recovery/i);
  assert.match(e2e, /foreignHosts/);
});

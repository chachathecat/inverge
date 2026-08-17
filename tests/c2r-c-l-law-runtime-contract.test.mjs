import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  diagnoseTrustedRepairAttempt,
  initialTrustedRepairStateData,
} from "../lib/review-os/trusted-repair-engine.ts";
import { trustedRepairCanonicalFixture } from "../lib/review-os/trusted-repair-fixtures.ts";

const root = new URL("../", import.meta.url);
const read = (file) => readFile(new URL(file, root), "utf8");

test("C2R-C-L diagnosis guidance is Law-specific without weakening Practice or Theory", () => {
  const stateData = initialTrustedRepairStateData("TYPED_TEXT");
  const attemptText = "합성 법령의 버전과 조문 적용일을 정확히 확인해야 합니다.";
  const law = diagnoseTrustedRepairAttempt({
    fixture: trustedRepairCanonicalFixture("appraisal_law"),
    attemptText,
    stateData,
  });
  const practice = diagnoseTrustedRepairAttempt({
    fixture: trustedRepairCanonicalFixture("appraisal_practical"),
    attemptText,
    stateData,
  });
  const theory = diagnoseTrustedRepairAttempt({
    fixture: trustedRepairCanonicalFixture("appraisal_theory"),
    attemptText,
    stateData,
  });
  assert.match(law.primary.repairActionKo, /출처·버전·앵커·위치·효력기간·적용일·현재성·차단 근거/);
  assert.match(practice.primary.repairActionKo, /계산관계/);
  assert.match(theory.primary.repairActionKo, /목표 범위와 필수·금지 술어/);
});

test("C2R-C-L persistence requires exact Law metadata and preserves prior subjects", async () => {
  const sql = await read(
    "supabase/migrations/20260817170000_c2r_c_l_exact_law_applicability.sql",
  );
  for (const marker of [
    "subject = 'appraisal_practical'",
    "subject = 'appraisal_theory'",
    "subject = 'appraisal_law'",
    "validator:law-exact-applicability@1",
    "law-source:synthetic-official-act@2026-01-01",
    "law-anchor:synthetic-official-act:article-10@2026-01-01",
    "Article 10",
    "2026-08-15",
    "APPLICABLE_CURRENT",
    "WCV_C2_STRUCTURED_LAW_PROOF_REQUIRED",
  ]) {
    assert.match(sql, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(sql, /before insert or update/);
  assert.match(sql, /security invoker/);
  assert.match(sql, /Forward-only rollback: disable WCV_C2R_C_L_LAW_ENABLED/);
  assert.doesNotMatch(sql, /truncate table|delete from|drop table/i);
  assert.doesNotMatch(sql, /grant execute[\s\S]*to authenticated/i);
});

test("C2R-C-L API, server, repository, and UI require subject-exact structured confirmation", async () => {
  const [route, server, repository, access, loop, env] = await Promise.all([
    read("app/api/review-os/trusted-repair/route.ts"),
    read("lib/review-os/trusted-repair-server.ts"),
    read("lib/review-os/trusted-repair-repository.ts"),
    read("lib/review-os/trusted-repair-access.ts"),
    read("components/review-os/trusted-repair-loop.tsx"),
    read(".env.example"),
  ]);
  assert.match(route, /action === "confirm_law_claim"/);
  assert.match(route, /parseLawApplicabilityClaimV1Input/);
  assert.match(server, /confirmLawClaim\(input:/);
  assert.match(server, /lawStructuredConfirmation:/);
  assert.match(repository, /parseLawApplicabilityClaimV1/);
  assert.match(repository, /LAW_PROOF_EVALUATION_STATES/);
  assert.match(access, /WCV_C2R_C_L_OWNER_EMAILS/);
  assert.match(access, /subjects\.push\("appraisal_law"\)/);
  assert.match(loop, /confirm_law_claim/);
  assert.match(loop, /직접 확인하는 정확 법규적용 결합/);
  assert.match(env, /WCV_C2R_C_L_LAW_ENABLED=false/);
  assert.match(env, /WCV_C2R_C_L_OWNER_EMAILS=/);
});

test("C2R-C-L fixtures are rights-safe, exact, and independently rollbackable", async () => {
  const [fixtures, binding, contract, stage] = await Promise.all([
    read("lib/review-os/trusted-repair-fixtures.ts"),
    read("lib/review-os/trusted-repair-source-binding.ts"),
    read("lib/review-os/trusted-repair-contract.ts"),
    read("config/dabangil-c2r-c-l-structural-law-proof-v1.json"),
  ]);
  assert.match(fixtures, /subject: "appraisal_law"/);
  assert.match(fixtures, /sourceClass: "INVERGE_ORIGINAL"/);
  assert.match(fixtures, /OWNER_GOLD/);
  assert.match(binding, /loadTrustedRepairLawApplicabilitySnapshot/);
  assert.match(binding, /trustedRepairLawOpenBlockingReferenceIds/);
  assert.match(contract, /type LawApplicabilityAnchorV1/);
  assert.match(stage, /"killSwitch": "WCV_C2R_C_L_LAW_ENABLED"/);
  assert.match(stage, /"requiresDisablingOrRevertingPractice": false/);
  assert.match(stage, /"requiresDisablingOrRevertingTheory": false/);
});

test("C2R-C-L exact-head workflow and browser contract are local-only and metadata-safe", async () => {
  const [workflow, verifier, browser] = await Promise.all([
    read(".github/workflows/c2r-c-l-law-trusted-repair-runtime.yml"),
    read("scripts/automation/verify-c2r-c-p-practice-runtime.mjs"),
    read("tests/e2e/c2r-c-l-law-trusted-repair-runtime.spec.ts"),
  ]);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$\{PR_HEAD_SHA\}"/);
  assert.match(workflow, /git diff --exit-code -- package\.json package-lock\.json/);
  assert.match(verifier, /LAW_RUNTIME/);
  assert.match(verifier, /lawConfirmationDiagnostics/);
  assert.match(verifier, /law_actual_browser_to_postgres_chain/);
  assert.match(verifier, /remoteSupabaseUsed: false/);
  assert.match(verifier, /repositorySecretsUsed: false/);
  for (const mode of [
    "TYPED_TEXT",
    "EDITABLE_PHOTO_OCR",
    "EDITABLE_PDF_OCR",
    "EDITABLE_VOICE_TRANSCRIPTION",
    "STRUCTURED_SELECTION",
  ]) {
    assert.match(browser, new RegExp(mode));
  }
  for (const width of [390, 768, 1440]) {
    assert.match(browser, new RegExp(`width: ${width}`));
  }
  assert.match(browser, /new AxeBuilder/);
  assert.match(browser, /keyboardOnly/);
  assert.match(browser, /tenant isolation/);
  assert.match(browser, /process restart recovers/);
  assert.doesNotMatch(workflow, /pull_request_target|persist-credentials: true|SUPABASE_ACCESS_TOKEN/);
});

test("C2R-C-L activation remains Owner-only, default-OFF, and non-Production", async () => {
  const stage = JSON.parse(
    await read("config/dabangil-c2r-c-l-structural-law-proof-v1.json"),
  );
  assert.equal(stage.activationBoundary.ownerOnlyNonProduction, true);
  assert.equal(stage.activationBoundary.flagDefault, false);
  assert.equal(stage.activationBoundary.productionAuthorized, false);
  assert.equal(stage.activationBoundary.realLearnerAuthorized, false);
  assert.equal(stage.activationBoundary.providerAuthorized, false);
  assert.equal(stage.activationBoundary.paymentAuthorized, false);
  assert.equal(stage.activationBoundary.remoteMigrationApplyAuthorized, false);
  assert.deepEqual(stage.regressionCoverageCandidate.directRows, [3, 7, 15, 17, 21]);
  assert.deepEqual(stage.regressionCoverageCandidate.inheritedCommonRows, [1, 4, 6, 8, 11, 14]);
});

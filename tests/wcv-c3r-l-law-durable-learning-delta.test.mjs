import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseLawApplicabilityClaimV1Input,
  TrustedRepairContractError,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  buildLawApplicabilityClaim,
  validateLawApplicabilityClaim,
} from "../lib/review-os/trusted-repair-engine.ts";
import { trustedRepairCanonicalFixture } from
  "../lib/review-os/trusted-repair-fixtures.ts";
import {
  C3R_L_ENUM_MIGRATION_PATH,
  C3R_L_INTEGRATION_MIGRATION_PATH,
  C3R_L_NATIVE_SCHEMA_VERSION,
  C3R_L_RUNTIME_PRODUCER_VERSION,
  c3rLNativePrerequisiteClosure,
  classifyC3RLBrowserFailureStage,
  classifyC3RLNextFailureDiagnostic,
  classifyC3RLNativeServiceAssertions,
  createC3RLNativeEvidence,
  createLawRuntimeArtifact,
  isC3RLRiskCandidate,
  readC3RLBrowserFailureStage,
  validateLawRuntimeArtifact,
} from "../scripts/automation/wcv-c3r-p-practice-common-runtime.mjs";
import { runtimeRequiredPathRecords } from
  "../scripts/automation/runtime-risk-contract.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const contract = JSON.parse(read(
  "config/dabangil-wcv-c3r-l-law-durable-learning-delta-v1.json",
));
const authority = JSON.parse(read(
  "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json",
));
const enumSql = read(C3R_L_ENUM_MIGRATION_PATH);
const integrationSql = read(C3R_L_INTEGRATION_MIGRATION_PATH);
const serviceSource = read("lib/review-os/c3r-l-service.ts");
const repositorySource = read("lib/review-os/c3r-l-repository.ts");
const routeSource = read("app/api/review-os/c3r-l/route.ts");
const componentSource = read("components/review-os/c3r-l-law-loop.tsx");
const engineSource = read("lib/review-os/c3r-l-engine.ts");
const runtimeSource = read("scripts/automation/wcv-c3r-p-practice-common-runtime.mjs");
const runtimeProducerSource = read("scripts/automation/produce-runtime-evidence.mjs");
const runtimeGateSource = read("scripts/automation/runtime-gate.mjs");
const workflowSource = read(".github/workflows/c3r-l-law-durable-learning-delta.yml");
const lawE2eSource = read("tests/e2e/wcv-c3r-l-law-runtime.spec.ts");

const fixture = trustedRepairCanonicalFixture("appraisal_law");
const anchor = fixture.anchors[0].lawApplicability;
const sourceBinding = {
  bindingVersion: "dabangil.c2r_c_l.exact_law_applicability.v1",
  sourceStatus: "VERIFIED_CURRENT",
  versionStatus: "VERIFIED_CURRENT",
  currentLawStatus: anchor.currentLawApplicability,
  sourceAnchorId: anchor.lawAnchorId,
  blockerCount: 0,
  openBlockingReferenceIds: [],
  lawSourceBindingId: anchor.lawSourceBindingId,
  sourceId: anchor.sourceId,
  sourceVersionId: anchor.sourceVersionId,
  lawAnchorVersionId: anchor.lawAnchorVersionId,
  anchorStatus: "VERIFIED_CURRENT",
  exactLocator: anchor.exactLocator,
  exactVersionIdentity: anchor.exactVersionIdentity,
  effectiveFrom: anchor.effectiveFrom,
  effectiveTo: anchor.effectiveTo,
  applicableAsOf: anchor.applicableAsOf,
};
const revisionId = "d9f7e7fa-9d1d-4c65-8d2f-719e44356001";

function lawClaim(overrides = {}) {
  return {
    sourceRevisionId: revisionId,
    anchorId: anchor.anchorId,
    anchorVersionId: anchor.anchorVersionId,
    lawSourceBindingId: anchor.lawSourceBindingId,
    sourceId: anchor.sourceId,
    sourceVersionId: anchor.sourceVersionId,
    lawAnchorId: anchor.lawAnchorId,
    lawAnchorVersionId: anchor.lawAnchorVersionId,
    exactLocator: anchor.exactLocator,
    exactVersionIdentity: anchor.exactVersionIdentity,
    effectiveFrom: anchor.effectiveFrom,
    effectiveTo: anchor.effectiveTo,
    applicableAsOf: anchor.applicableAsOf,
    currentLawApplicability: anchor.currentLawApplicability,
    blockerState: { openBlockingReferenceIds: [], blockerCount: 0 },
    confirmationMode: "MANUAL_STRUCTURED",
    ...overrides,
  };
}

function evaluate(claim, binding = sourceBinding) {
  const closed = buildLawApplicabilityClaim({
    claim: parseLawApplicabilityClaimV1Input(claim),
    learnerConfirmedAt: "2026-08-26T00:06:00.000Z",
  });
  return validateLawApplicabilityClaim({
    claim: closed,
    anchor,
    expectedSourceRevisionId: revisionId,
    sourceBinding: binding,
  });
}

test("C3R-L is pinned to repaired protected main and validated C3R-P/T receipts", () => {
  assert.equal(contract.authority.stage, "C3R-L");
  assert.equal(contract.authority.subject, "LAW");
  assert.equal(contract.authority.baseSha,
    "75f3ce787d31047c2bceacc2ef752c0bfdfb23cc");
  assert.equal(contract.authority.baseTree,
    "a3e8ab7618cbceddb2c9ac156a84fc45bb018f1b");
  assert.equal(contract.authority.validatedDependencyReceipt.pullRequest, 800);
  assert.equal(contract.authority.validatedTheoryReceipt.pullRequest, 816);
  assert.equal(contract.authority.validatedTheoryReceipt.reviewedHeadSha,
    "96933cbe08864c6b3cb94a7349cb33e92bf2df8d");
  assert.deepEqual(
    contract.authority.validatedTheoryRepairReceiptsExactly.map((entry) => entry.pullRequest),
    [818, 820],
  );
  assert.equal(contract.authority.validatedTheoryRepairReceiptsExactly[1].resultingMainSha,
    contract.authority.baseSha);
  assert.equal(contract.authority.inheritsCommonDurableSubstrate, true);
  assert.equal(contract.authority.ownsNewCommonDurableSubstrate, false);
});

test("C3R-L binds every canonical Law #706/#707/#708 item exactly once", () => {
  for (const issue of ["706", "707", "708"]) {
    assert.deepEqual(
      contract.perSubjectIssueEvidence.requiredExactly[issue],
      authority.issueAllocation.issues[issue].requiredForEachSubjectExactly,
      issue,
    );
  }
  assert.equal(contract.perSubjectIssueEvidence.everyItemMustBeProvedExactlyOnce, true);
  assert.equal(contract.perSubjectIssueEvidence.metadataOnly, true);
  assert.deepEqual(contract.postMergeState.governedIssuesRemainOpen, [706, 707, 708, 714, 781]);
});

test("closed Law input and trusted live binding yield PASS only for the exact bundle", () => {
  assert.equal(evaluate(lawClaim()).state, "PASS");
  assert.equal(evaluate(lawClaim()).verified, true);
  for (const [field, value, reason] of [
    ["sourceVersionId", "law-source:synthetic-official-act@2025-01-01", "source_version_mismatch"],
    ["lawAnchorVersionId", "law-anchor:synthetic-official-act:article-10@old", "law_anchor_version_mismatch"],
    ["exactLocator", "Article 11", "exact_locator_mismatch"],
    ["applicableAsOf", "2025-12-31", "applicable_date_mismatch"],
    ["currentLawApplicability", "NOT_CURRENT", "current_law_applicability_mismatch"],
  ]) {
    const result = evaluate(lawClaim({ [field]: value }));
    assert.equal(result.state, "UNSUPPORTED", field);
    assert.ok(result.reasonCodes.includes(reason), field);
  }
  assert.equal(evaluate(lawClaim({
    sourceRevisionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  })).state, "STALE");
  assert.equal(evaluate(lawClaim(), { ...sourceBinding, anchorStatus: "UNVERIFIED" }).state,
    "BLOCKED");
  assert.throws(() => parseLawApplicabilityClaimV1Input({
    ...lawClaim(), callerProofState: "PASS",
  }), TrustedRepairContractError);
  assert.throws(() => parseLawApplicabilityClaimV1Input({
    ...lawClaim(), blockerState: { openBlockingReferenceIds: ["x", "x"], blockerCount: 2 },
  }), TrustedRepairContractError);
});

test("TypeScript renders but never mints the authoritative proof digest", () => {
  assert.match(engineSource, /buildLawApplicabilityClaim/);
  assert.match(engineSource, /validateLawApplicabilityClaim/);
  assert.match(engineSource, /resolveTrustedRepairSourceBinding/);
  assert.match(engineSource, /renderLawApplicabilityClaim/);
  assert.doesNotMatch(engineSource, /proofDigest\s*:/);
  assert.equal(contract.lawProof.proofDigestAuthority,
    "DATABASE_CANONICAL_JSONB_CLAIM_AND_EVALUATION_ONLY");
  assert.equal(contract.lawProof.typescriptProofDigestProduced, false);
  assert.equal(contract.lawProof.canonicalSentenceIsOutputOnly, true);
});

test("the enum migration is isolated and the integration closes P/T/L identities", () => {
  assert.match(enumSql, /alter type public\.c3r_p_subject add value if not exists 'LAW'/);
  assert.doesNotMatch(enumSql, /'LAW'::public\.c3r_p_subject/);
  assert.doesNotMatch(integrationSql, /alter type public\.c3r_p_subject/);
  assert.match(integrationSql,
    /subject in \('PRACTICE'::public\.c3r_p_subject, 'THEORY'::public\.c3r_p_subject,[\s\S]*'LAW'::public\.c3r_p_subject\)/);
  assert.match(integrationSql, /c3r_attempts_subject_proof_closed/);
  assert.match(integrationSql, /subject = 'THEORY'[\s\S]*validator:theory-scoped-predicate@1/);
  assert.match(integrationSql, /subject = 'LAW'[\s\S]*validator:law-exact-applicability@1/);
  assert.match(integrationSql, /LAW_RUNTIME:c3r-l-law-durable-learning-v1/);
  assert.match(integrationSql,
    /c3r-l:law:synthetic-article-10-applicability:d7-transfer-v1/);
  assert.doesNotMatch(integrationSql,
    /drop constraint if exists c3r_(?:learning_records|attempts|gaps|transfer|plans)_[a-z_]*uq/);
  assert.doesNotMatch(integrationSql, /c3r_lransfer/);
});

test("Postgres independently parses and persists exact Law proof metadata", () => {
  const validator = integrationSql.slice(
    integrationSql.indexOf("create or replace function public.c3r_l_validate_law_claim_v1"),
    integrationSql.indexOf("create or replace function public.c3r_p_apply_learning_command_v1"),
  );
  assert.match(validator, /current_user <> 'service_role'/);
  for (const key of [
    "lawSourceBindingId", "sourceVersionId", "lawAnchorVersionId", "exactLocator",
    "exactVersionIdentity", "effectiveFrom", "effectiveTo", "applicableAsOf",
    "currentLawApplicability", "blockerState",
  ]) assert.ok(validator.includes(`'${key}'`), key);
  assert.match(validator, /openBlockingReferenceIds[\s\S]*count\(distinct value\)/);
  assert.match(validator, /source_revision_mismatch[\s\S]*STALE/);
  assert.match(validator, /exact_locator_mismatch[\s\S]*UNSUPPORTED/);
  assert.match(validator, /'claim', v_claim, 'evaluation', v_evaluation/);
  assert.match(validator, /extensions\.digest/);
  assert.match(integrationSql,
    /v_proof ->> 'canonicalSentence'[\s\S]*v_proof -> 'claim'[\s\S]*v_proof -> 'evaluation'/);
});

test("shared subject functions have three explicit branches and no Theory fallthrough", () => {
  assert.match(integrationSql,
    /when 'PRACTICE' then 'c3r-p-learner:'[\s\S]*when 'THEORY' then 'c3r-t-learner:'[\s\S]*when 'LAW' then 'c3r-l-learner:'/);
  assert.match(integrationSql,
    /when 'PRACTICE' then 'C3R_P'[\s\S]*when 'THEORY' then 'C3R_T'[\s\S]*when 'LAW' then 'C3R_L'/);
  assert.match(integrationSql,
    /when 'PRACTICE' then 'c3r-p-learner-export\.v1'[\s\S]*when 'THEORY' then 'c3r-t-learner-export\.v1'[\s\S]*when 'LAW' then 'c3r-l-learner-export\.v1'/);
  assert.match(integrationSql,
    /when 'THEORY' then raise exception 'C3R_T_NOT_FOUND'[\s\S]*when 'LAW' then raise exception 'C3R_L_NOT_FOUND'/);
  assert.match(integrationSql, /C3R_UNSUPPORTED_SUBJECT/);
  assert.doesNotMatch(integrationSql,
    /case when p_subject = 'PRACTICE' then 'c3r-p-learner:' else 'c3r-t-learner:'/);
});

test("Law mutations are service-only while same-owner reads stay forced-RLS", () => {
  assert.match(integrationSql, /alter table public\.%I force row level security/);
  assert.match(integrationSql,
    /revoke all on table public\.%I from public, anon, authenticated/);
  assert.match(integrationSql,
    /revoke all on function %s from public, anon, authenticated/);
  assert.match(integrationSql,
    /public\.c3r_l_validate_law_claim_v1\(jsonb,text,timestamptz\)/);
  assert.match(repositorySource, /record\.subject !== "LAW"/);
  assert.match(repositorySource, /C3R_L_NOT_FOUND[\s\S]*new C3RLError\("not_found"\)/);
  for (const rpc of [
    "apply_learning_command", "find_record", "restore_record", "load_dashboard",
    "create_plan", "decide_plan", "export_learner_data", "delete_learner_data",
  ]) assert.ok(repositorySource.includes(`.rpc("c3r_l_${rpc}_v1"`), rpc);
});

test("Owner-only/default-off UI and API expose exact Law confirmation only", () => {
  assert.match(serviceSource,
    /process\.env\[C3R_L_FEATURE_FLAG\] !== "true"[\s\S]*feature_disabled/);
  assert.match(serviceSource, /VERCEL_ENV === "production"[\s\S]*production_denied/);
  assert.match(serviceSource, /ALPHA_ADMIN_EMAILS[\s\S]*C3R_L_OWNER_ALLOWLIST/);
  assert.doesNotMatch(serviceSource, /NEXT_PUBLIC_|createSupabaseAdminClient/);
  assert.match(routeSource, /requireC3RLAccess\(\)/);
  assert.match(routeSource, /parseJsonRejectingDuplicateKeys/);
  assert.match(routeSource, /parseLawApplicabilityClaimV1Input/);
  assert.doesNotMatch(routeSource, /parseLawPredicateClaimV1Input/);
  assert.match(componentSource, /lawBindingConfirmed/);
  assert.match(componentSource, /Article 10/);
  assert.match(componentSource, /APPLICABLE_CURRENT/);
  assert.match(componentSource, /열린 차단 근거 0개/);
  assert.doesNotMatch(componentSource, /scopeResolution|requiredPolarity|forbiddenPolarity/);
  assert.equal(contract.runtimeBoundary.featureDefaultOff, true);
  assert.equal(contract.runtimeBoundary.productionDenied, true);
  assert.equal(contract.runtimeBoundary.remoteSupabaseMutationCount, 0);
  assert.equal(contract.runtimeBoundary.publicActivation, false);
});

test("Today/Full-Day and durable review transitions remain deterministic", () => {
  assert.match(engineSource,
    /dashboard\.queue\.filter\(\(item\) => item\.eligible\)[\s\S]*dueAt\.localeCompare/);
  assert.match(engineSource, /index < 3 \? 30 : 15/);
  assert.match(integrationSql, /v_core_count > 3 or v_minutes > p_available_minutes/);
  assert.match(integrationSql, /p_action = 'record_later_failure' and v_proof_state = 'PASS'/);
  assert.match(integrationSql, /p_action <> 'record_later_failure' and v_proof_state <> 'PASS'/);
  for (const identity of [
    "D_PLUS_1_UNAIDED_RECONSTRUCTION", "SEALED_NON_SAME_SURFACE_D_PLUS_7_TRANSFER",
    "TIMED_RECURRENCE", "LATER_FAILURE_REOPEN", "POST_REOPEN_INDEPENDENT_COMPLETION",
  ]) assert.ok(integrationSql.includes(identity), identity);
});

test("native evidence dispatch owns exact P/T/L migrations and fails closed", () => {
  const riskResult = {
    runtimeEvidenceRequired: true,
    changedFilesTruncated: false,
    changedFiles: [
      C3R_L_ENUM_MIGRATION_PATH,
      C3R_L_INTEGRATION_MIGRATION_PATH,
      "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs",
    ],
  };
  riskResult.runtimeReasons = runtimeRequiredPathRecords(riskResult.changedFiles);
  assert.equal(isC3RLRiskCandidate(riskResult), true);
  assert.equal(isC3RLRiskCandidate({ ...riskResult,
    changedFiles: [...riskResult.changedFiles, C3R_L_ENUM_MIGRATION_PATH] }), false);
  const evidence = createC3RLNativeEvidence({
    verifiedAt: "2026-08-25T00:00:00.000Z", headSha: "a".repeat(40),
    headTree: "b".repeat(40), runId: "1", runAttempt: 1,
    riskBytes: Buffer.from("{}"), practiceBase: {}, prerequisiteClosure: {},
    theoryBase: [], lawDelta: [], cycles: [],
  });
  assert.equal(evidence.schemaVersion, C3R_L_NATIVE_SCHEMA_VERSION);
  assert.equal(evidence.producerVersion, C3R_L_RUNTIME_PRODUCER_VERSION);
  assert.equal(evidence.dataBoundary.metadataOnly, true);
  assert.equal(evidence.dataBoundary.rawLearnerContentPersisted, false);
  assert.equal(c3rLNativePrerequisiteClosure().inheritedTheoryMigrationsExecuted, true);
  const expected = ["applied", "applied", "applied", "applied", "applied", "applied",
    "1", "1", "1", "UNSUPPORTED"];
  assert.deepEqual(classifyC3RLNativeServiceAssertions(
    `${expected.slice(0, 6).join("|")}\n${expected.slice(6).join("|")}`,
  ), []);
  assert.deepEqual(classifyC3RLNativeServiceAssertions(expected.join("|")), ["output_shape"]);
});

test("Law native evidence runs before generic adapters and cleans up unconditionally", () => {
  assert.ok(runtimeProducerSource.indexOf("if (isC3RLRiskCandidate(riskResult))") <
    runtimeProducerSource.indexOf("if (isC3RTRiskCandidate(riskResult))"));
  assert.ok(runtimeGateSource.indexOf("if (isC3RLRiskCandidate(riskResult))") <
    runtimeGateSource.indexOf("if (isC3RTRiskCandidate(riskResult))"));
  assert.match(runtimeProducerSource,
    /cleanupC3RLNativeEvidence\(context\)[\s\S]*cleanupC3RTNativeEvidence\(context\)/);
  assert.match(runtimeSource,
    /sql\.append[\s\S]*sql\.theoryEnum[\s\S]*sql\.theoryIntegration[\s\S]*sql\.lawEnum[\s\S]*sql\.lawIntegration/);
  assert.match(runtimeSource,
    /PRACTICE,THEORY,LAW\|f\|f\|t/);
  assert.match(runtimeSource, /assertLawPostgrestArgumentCatalog/);
});

test("the dedicated browser fixture covers the full Law vertical and P/T isolation", () => {
  assert.match(lawE2eSource,
    /C3R-L Owner Law journey reaches Postgres and remains isolated/);
  assert.match(lawE2eSource, /action: "submit_repair"/);
  assert.match(lawE2eSource, /action: "complete_d1"/);
  assert.match(lawE2eSource, /action: "complete_d7_transfer"/);
  assert.match(lawE2eSource, /action: "complete_recurrence"/);
  assert.match(lawE2eSource, /action: "record_later_failure"/);
  assert.match(lawE2eSource, /action: "complete_reopened_review"/);
  assert.match(lawE2eSource, /action: "export"[\s\S]*action: "delete"/);
  assert.match(lawE2eSource, /subject='LAW'/);
  assert.match(lawE2eSource, /subject='PRACTICE'/);
  assert.match(lawE2eSource, /subject='THEORY'/);
  assert.doesNotMatch(lawE2eSource, /validator:law-scoped-predicate/);
});

test("Law browser failures disclose only a closed Next or exact stage classification", () => {
  assert.equal(classifyC3RLNextFailureDiagnostic(
    "GET /api/review-os/c3r-l 503 in 42ms",
  ), "C3R_L_API_TEMPORARILY_UNAVAILABLE");
  assert.equal(classifyC3RLNextFailureDiagnostic(
    "POST /api/review-os/c3r-l?recordId=metadata-only 404 in 8ms",
  ), "C3R_L_API_NOT_FOUND");
  assert.equal(classifyC3RLNextFailureDiagnostic(
    "GET /app/c3r-l 404 in 7ms",
  ), "C3R_L_PAGE_NOT_FOUND");
  assert.equal(classifyC3RLNextFailureDiagnostic(
    "Failed to compile: Module not found",
  ), "C3R_L_NEXT_COMPILE_FAILURE");
  assert.equal(classifyC3RLBrowserFailureStage({
    schemaVersion: "inverge.c3r_l.browser_failure_stage.v1",
    mode: "journey",
    stage: "LAW_START",
  }, "journey"), "C3R_L_BROWSER_JOURNEY_LAW_START");
  assert.equal(classifyC3RLBrowserFailureStage({
    schemaVersion: "inverge.c3r_l.browser_failure_stage.v1",
    mode: "journey",
    stage: "PRIVATE_BODY",
  }, "journey"), "C3R_L_BROWSER_STAGE_INVALID");
  const markerRoot = fs.mkdtempSync(path.join(os.tmpdir(), "c3r-l-browser-stage-"));
  try {
    assert.equal(readC3RLBrowserFailureStage(path.join(markerRoot, "missing.json"), "journey"),
      "C3R_L_BROWSER_STAGE_MISSING");
    const invalidMarker = path.join(markerRoot, "invalid.json");
    fs.writeFileSync(invalidMarker, "{not-json", { mode: 0o600 });
    assert.equal(readC3RLBrowserFailureStage(invalidMarker, "journey"),
      "C3R_L_BROWSER_STAGE_INVALID");
  } finally {
    fs.rmSync(markerRoot, { recursive: true, force: true });
  }
});

test("LAW_RUNTIME artifact binds two isolated exact-head PostgreSQL cycles", () => {
  const cycle = (number) => ({
    cycle: number,
    receiptId: `00000000-0000-4000-8000-00000000000${number}`,
    databaseIdentity: `c3r-l-cycle-${number}-123-1`,
    containerIdentity: `supabase_db_c3r-l-cycle-${number}-123-1`,
    migrationCount: 30,
    serverVersionNum: 150008,
    browserEvidenceSha256: String(number).repeat(64),
    practiceCompatibilityEvidenceSha256: String(number + 2).repeat(64),
    browserToPostgres: true,
    restartRestore: true,
    restoreExportDelete: true,
    hostileDirectRpcDenied: true,
    legacyPracticePlannerReceiptReplay: true,
    practiceCompatibilityPreserved: true,
    theoryCompatibilityPreserved: true,
    practiceWrapperArgumentNamesPreserved: true,
    theoryWrapperArgumentNamesPreserved: true,
    lawPostgrestArgumentNamesBound: true,
    cleanup: "complete",
  });
  const artifactRepository = fs.mkdtempSync(path.join(os.tmpdir(), "c3r-l-artifact-"));
  const priorPrHead = process.env.PR_HEAD_SHA;
  try {
    for (const [migrationPath, bytes] of [
      [C3R_L_ENUM_MIGRATION_PATH, enumSql],
      [C3R_L_INTEGRATION_MIGRATION_PATH, integrationSql],
    ]) {
      const destination = path.join(artifactRepository, migrationPath);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, bytes, "utf8");
    }
    const gitFixture = (args) => execFileSync("git", args, {
      cwd: artifactRepository,
      encoding: "utf8",
    }).trim();
    gitFixture(["init", "--quiet"]);
    gitFixture(["config", "user.name", "C3R-L artifact fixture"]);
    gitFixture(["config", "user.email", "c3r-l-artifact@example.invalid"]);
    gitFixture(["config", "core.autocrlf", "false"]);
    gitFixture(["add", "--", C3R_L_ENUM_MIGRATION_PATH, C3R_L_INTEGRATION_MIGRATION_PATH]);
    gitFixture(["commit", "--quiet", "-m", "fixture"]);
    const candidateHead = gitFixture(["rev-parse", "HEAD"]);
    const candidateTree = gitFixture(["rev-parse", "HEAD^{tree}"]);
    process.env.PR_HEAD_SHA = candidateHead;
    const migrationIdentities = [
      { path: C3R_L_ENUM_MIGRATION_PATH,
        sha256: crypto.createHash("sha256").update(enumSql).digest("hex") },
      { path: C3R_L_INTEGRATION_MIGRATION_PATH,
        sha256: crypto.createHash("sha256").update(integrationSql).digest("hex") },
    ];
    const artifact = createLawRuntimeArtifact({
      candidateHead,
      candidateTree,
      migrationIdentities,
      resetReplayCycles: [cycle(1), cycle(2)],
    });
    assert.equal(validateLawRuntimeArtifact(artifact, artifactRepository), artifact);
    assert.throws(() => validateLawRuntimeArtifact({
      ...artifact,
      resetReplayCycles: [{ ...cycle(1), lawPostgrestArgumentNamesBound: false }, cycle(2)],
    }, artifactRepository), /LAW_RUNTIME reset\/replay cycle 1 is invalid/u);
    assert.throws(() => validateLawRuntimeArtifact({
      ...artifact,
      rawLearnerBody: "private",
    }, artifactRepository), /keys are not exact/u);
    fs.appendFileSync(path.join(artifactRepository, C3R_L_ENUM_MIGRATION_PATH), "\n-- dirty\n");
    assert.throws(() => validateLawRuntimeArtifact(artifact, artifactRepository),
      /closed ordered head files/u);
  } finally {
    if (priorPrHead === undefined) delete process.env.PR_HEAD_SHA;
    else process.env.PR_HEAD_SHA = priorPrHead;
    fs.rmSync(artifactRepository, { recursive: true, force: true });
  }
});

test("the exact 20-path envelope remains sorted, unique, and migration-bounded", () => {
  const paths = contract.pathManifest.changedPathsExactly;
  assert.equal(paths.length, 20);
  assert.deepEqual(paths, [...paths].sort());
  assert.equal(new Set(paths).size, paths.length);
  assert.deepEqual(contract.pathManifest.forwardMigrationsExactly, [
    C3R_L_ENUM_MIGRATION_PATH,
    C3R_L_INTEGRATION_MIGRATION_PATH,
  ]);
  assert.equal(contract.pathManifest.immutableHistoricalMigration,
    "supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql");
  assert.match(workflowSource, /fetch-depth: 0/);
  assert.match(workflowSource, /--c3r-l-dedicated/);
  assert.match(workflowSource, /--verify-c3r-l-artifact/);
  assert.doesNotMatch(workflowSource, /supabase link|supabase db push|--linked/);
});

test("no artifact or contract claims efficacy, calibration, or activation", () => {
  const combined = JSON.stringify(contract) + runtimeSource + workflowSource;
  assert.doesNotMatch(combined, /actual learning efficacy|calibrated exam-item quality/iu);
  assert.equal(contract.runtimeBoundary.externalLearnerActivation, false);
  assert.equal(contract.runtimeBoundary.paymentActivation, false);
  assert.equal(contract.runtimeBoundary.providerCallsAllowed, false);
  assert.equal(contract.runtimeBoundary.productionMutationCount, 0);
  assert.equal(crypto.createHash("sha256").update(enumSql).digest("hex").length, 64);
});

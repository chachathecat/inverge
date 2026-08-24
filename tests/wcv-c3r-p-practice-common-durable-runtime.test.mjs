import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import { parsePracticeCalculationClaimV2Input } from
  "../lib/review-os/trusted-repair-contract.ts";
import {
  buildPracticeCalculationClaim,
  validatePracticeCalculationClaim,
} from "../lib/review-os/trusted-repair-engine.ts";
import { trustedRepairCanonicalFixture } from
  "../lib/review-os/trusted-repair-fixtures.ts";

import {
  C3R_P_APPEND_PATH,
  createC3RPEntryDiagnosticLog,
  createPracticeRuntimeArtifact,
  redactC3RPEntryDiagnosticText,
  seedDisposableReviewOsProfiles,
  validateC3RPEntryReceipt,
  validatePracticeRuntimeArtifact,
} from "../scripts/automation/wcv-c3r-p-practice-common-runtime.mjs";

const root = path.resolve(import.meta.dirname, "..");
const contract = JSON.parse(fs.readFileSync(path.join(root,
  "config/dabangil-wcv-c3r-p-practice-common-durable-runtime-v1.json"), "utf8"));
const sql = fs.readFileSync(path.join(root, C3R_P_APPEND_PATH), "utf8");
const runtimeSource = fs.readFileSync(path.join(root,
  "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs"), "utf8");
const serviceSource = fs.readFileSync(path.join(root, "lib/review-os/c3r-p-service.ts"), "utf8");
const engineSource = fs.readFileSync(path.join(root, "lib/review-os/c3r-p-engine.ts"), "utf8");
const routeSource = fs.readFileSync(path.join(root, "app/api/review-os/c3r-p/route.ts"), "utf8");
const componentSource = fs.readFileSync(path.join(root,
  "components/review-os/c3r-p-practice-loop.tsx"), "utf8");
const browserSource = fs.readFileSync(path.join(root,
  "tests/e2e/wcv-c3r-p-practice-common-runtime.spec.ts"), "utf8");
const workflowSource = fs.readFileSync(path.join(root,
  ".github/workflows/c3r-p-practice-common-durable-runtime.yml"), "utf8");
const productionAccessBlobs = Object.freeze({
  "lib/review-os/repository.ts": "f7f20117c5e3acb14eeb331d8f45a9b97d66c8c2",
  "lib/review-os/server.ts": "429085a06c3104aa66c49b272738d53f00318d8a",
  "app/app/layout.tsx": "215ec312e2102d39332eeb47e2cc3b446ad78d19",
  "app/app/c3r-p/page.tsx": "1183828115a8a0ef0fb04c5d9c0e42a8ae5bd240",
  "app/api/review-os/c3r-p/route.ts": "fd64b2ea3915e0d564bec762c96a8a4dd081c506",
  "lib/review-os/c3r-p-service.ts": "ed732441f059ebf4bf2b241fdccc1d661674bc71",
  "lib/review-os/c3r-p-repository.ts": "370346582c11a2e890a844fb4c5e654f81cd7659",
  "lib/review-os/c3r-p-engine.ts": "2c6cbc01ed77fd556bc8d3ee064da196183d13df",
  "components/review-os/c3r-p-practice-loop.tsx": "49573941af6fa818ad2e6b00694a6e5e503ac1fd",
});

const FORMER_C3R_P_SOURCE_REVISION_ID =
  "inverge-synthetic-practice-valuation-v1@1";
const C3R_P_SOURCE_REVISION_ID = "26a4f3bd-ddf3-4215-9fdf-d83453122ce1";
const MISMATCHED_C3R_P_SOURCE_REVISION_ID =
  "d2889575-35e6-4e31-9ed7-e27ae55d7e8d";

function exactPracticeClaim(sourceRevisionId) {
  return {
    sourceRevisionId,
    anchorId: "repair-anchor:practice:synthetic-net-income",
    anchorVersionId: "repair-anchor:practice:synthetic-net-income@1",
    grossIncome: { value: 120_000_000, unit: "KRW_PER_YEAR" },
    operatingExpense: { value: 20_000_000, unit: "KRW_PER_YEAR" },
    operator: "SUBTRACT",
    operandOrder: ["gross_income", "operating_expense"],
    result: { value: 100_000_000, unit: "KRW_PER_YEAR" },
    sign: "POSITIVE",
    rounding: { mode: "HALF_UP", scale: 0, required: false },
    confirmationMode: "MANUAL_STRUCTURED",
  };
}

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function diskInventory() {
  return fs.readdirSync(path.join(root, "supabase/migrations"))
    .filter((name) => /^\d{8,14}_[a-z0-9_]+\.sql$/.test(name)).sort()
    .map((name) => ({
      path: `supabase/migrations/${name}`,
      sha256: sha256(Buffer.from(fs.readFileSync(
        path.join(root, "supabase/migrations", name), "utf8",
      ).replace(/\r\n/g, "\n"), "utf8")),
    }));
}

function sampleArtifact() {
  const inventory = diskInventory();
  const append = inventory.find((entry) => entry.path === C3R_P_APPEND_PATH);
  return createPracticeRuntimeArtifact({
    candidateHead: process.env.PR_HEAD_SHA?.toLowerCase() ?? "a".repeat(40),
    candidateTree: "b".repeat(40),
    migrationInventory: inventory,
    appendIdentity: { path: C3R_P_APPEND_PATH, gitBlob: "c".repeat(40), sha256: append.sha256 },
    resetReplayCycles: [1, 2].map((cycle) => ({
      cycle,
      receiptId: `receipt-${cycle}`,
      databaseIdentity: `database-${cycle}`,
      containerIdentity: `container-${cycle}`,
      volumeIdentity: `volume-${cycle}`,
      migrationCount: 26,
      serverVersionNum: 150008,
      browserToPostgres: true,
      restartRestore: true,
      exportDelete: true,
      reopenedCompletion: true,
      planBlockCompletion: true,
      completeLearnerExport: true,
      oracleEvidenceSha256: String(cycle).repeat(64),
      cleanup: "complete",
    })),
    oracle: { status: "verified", serverVersionNum: 150008, cycleEvidenceCount: 2 },
    security: {
      rls: "enabled_and_forced",
      anonymous: "denied",
      authenticatedDirectMutation: "denied",
      crossUser: "denied_both_directions",
      serviceOnlyMutation: "verified",
      subjectIdentity: "PRACTICE_ONLY",
    },
  }, root);
}

function sampleEntryReceipt() {
  return {
    schemaVersion: "inverge.c3r_p.entry_metadata.v1",
    artifactKind: "C3R_P_ENTRY_METADATA",
    classification: "C3R_P_ENTRY_VERIFIED",
    loginResponseStatus: 200,
    browserSessionVisible: true,
    gotoStatus: 200,
    gotoFailureCategory: null,
    finalPathname: "/app/c3r-p",
    reachedLogin: false,
    notFoundSurface: false,
    genericReviewOsAccessState: false,
    c3rPLoadingSurface: true,
    c3rPRuntimeMarker: true,
    apiStatus: 200,
    apiErrorCode: null,
    browserConsoleErrorCategories: [],
    pageErrorCategories: [],
    requestFailures: [{ pathname: "/_next/static/chunk.js", category: "CONNECTION" }],
    cookies: [{ name: "sb-local-auth-token", domain: "127.0.0.1", path: "/" }],
  };
}

test("C3R-P rejects the former non-UUID revision and parses its exact fixed UUID claim", () => {
  assert.match(engineSource,
    /revisionId: "26a4f3bd-ddf3-4215-9fdf-d83453122ce1"/u);
  assert.match(engineSource,
    /function c3rPSourceView\(\)[\s\S]*\.\.\.C3R_P_SOURCE/u);
  assert.match(engineSource,
    /expectedSourceRevisionId: C3R_P_SOURCE\.revisionId/u);
  assert.doesNotMatch(componentSource,
    /(?:inverge-synthetic-practice-valuation-v1@1|26a4f3bd-ddf3-4215-9fdf-d83453122ce1)/u);
  assert.match(componentSource,
    /practiceClaim\(structuredCalculation, view\?\.source\.revisionId\)/u);
  assert.throws(
    () => parsePracticeCalculationClaimV2Input(
      exactPracticeClaim(FORMER_C3R_P_SOURCE_REVISION_ID),
    ),
    /invalid_input/u,
  );
  const exactClaim = exactPracticeClaim(C3R_P_SOURCE_REVISION_ID);
  assert.deepEqual(parsePracticeCalculationClaimV2Input(exactClaim), exactClaim);
});

test("C3R-P exact revision passes evaluation while mismatch and incorrect calculation fail closed", () => {
  const fixture = trustedRepairCanonicalFixture("appraisal_practical");
  const anchor = fixture.anchors[0].calculationRelation;
  const evaluate = (claimInput) => validatePracticeCalculationClaim({
    claim: buildPracticeCalculationClaim({
      claim: parsePracticeCalculationClaimV2Input(claimInput),
      learnerConfirmedAt: "2026-08-24T00:00:00.000Z",
    }),
    anchor,
    expectedSourceRevisionId: C3R_P_SOURCE_REVISION_ID,
  });
  const exact = evaluate(exactPracticeClaim(C3R_P_SOURCE_REVISION_ID));
  assert.equal(exact.state, "PASS");
  assert.equal(exact.verified, true);

  const mismatch = evaluate(
    exactPracticeClaim(MISMATCHED_C3R_P_SOURCE_REVISION_ID),
  );
  assert.equal(mismatch.verified, false);
  assert.ok(mismatch.reasonCodes.includes("source_revision_mismatch"));

  const incorrect = exactPracticeClaim(C3R_P_SOURCE_REVISION_ID);
  incorrect.result.value = 90_000_000;
  const incorrectEvaluation = evaluate(incorrect);
  assert.equal(incorrectEvaluation.verified, false);
  assert.ok(incorrectEvaluation.reasonCodes.includes("result_value_mismatch"));
});

test("C3R-P applies the exact seven operations and one 26th append", () => {
  const inventory = diskInventory();
  const binding = contract.migrationAuthorityBinding;
  assert.equal(inventory.length, 26);
  assert.deepEqual(Object.keys(binding).sort(), [
    "appendPath", "authorityContractSha256", "authorityDecisionSha256", "candidateSqlSha256",
    "effectiveInventorySha256", "operationBindings", "remoteMutationCount",
    "validatedAuthorityResultingMainSha", "validatedAuthorityResultingMainTree",
  ].sort());
  assert.equal(binding.operationBindings.length, 7);
  assert.equal(binding.appendPath, C3R_P_APPEND_PATH);
  assert.equal(binding.candidateSqlSha256,
    sha256(Buffer.from(sql.replace(/\r\n/g, "\n"), "utf8")));
  assert.equal(binding.effectiveInventorySha256,
    sha256(Buffer.from(canonicalJson(inventory), "utf8")));
  assert.ok(inventory.some((entry) => entry.path === C3R_P_APPEND_PATH && entry.sha256.length === 64));
  for (const [index, operation] of binding.operationBindings.entries()) {
    assert.deepEqual(Object.keys(operation).sort(), [
      "futureCanonicalUtf8LfSha256", "futureGitBlob", "futureRawSha256", "operationId",
    ].sort());
    const paths = contract.pathManifest.operationPaths[index];
    assert.equal(paths.operationId, operation.operationId);
    const bytes = fs.readFileSync(path.join(root, paths.futurePath));
    assert.equal(sha256(bytes), operation.futureRawSha256, operation.operationId);
    const blob = execFileSync("git", ["hash-object", "--stdin"], { cwd: root, input: bytes, encoding: "utf8" }).trim();
    assert.equal(blob, operation.futureGitBlob, operation.operationId);
    if (paths.currentPath !== paths.futurePath) {
      assert.equal(fs.existsSync(path.join(root, paths.currentPath)), false);
    }
  }
});

test("C3R-P preserves the immutable C3R-A0 authority artifacts byte-identically", () => {
  const a1 = JSON.parse(fs.readFileSync(path.join(root,
    "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json"), "utf8"));
  const bindings = a1.c3rA0ValidatedReceiptV1.immutableUpstreamBindings;
  const artifacts = [
    ["docs/decisions/2026-08-21-owner-wcv-c3r-a0-migration-dependency-authority.md", bindings.authorityDecision],
    ["config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json", bindings.authorityManifest],
    ["scripts/automation/wcv-c3r-a0-migration-dependency-closure.mjs", bindings.analyzer],
    [bindings.focusedTest.ref, bindings.focusedTest],
  ];
  for (const [file, identity] of artifacts) {
    const bytes = fs.readFileSync(path.join(root, file));
    assert.equal(sha256(bytes), identity.sha256, file);
    assert.equal(execFileSync("git", ["hash-object", "--stdin"],
      { cwd: root, input: bytes, encoding: "utf8" }).trim(), identity.gitBlob, file);
  }
});

test("sole append closes subject, ownership, RLS, RPC, CAS and durable outcome boundaries", () => {
  assert.match(sql, /create type public\.c3r_p_subject as enum \('PRACTICE'\)/);
  assert.doesNotMatch(sql, /c3r_p_subject as enum \([^)]*(?:THEORY|LAW)/);
  for (const table of [
    "learning_records", "attempts", "learning_gaps", "failure_notes", "assistance_events",
    "ledger_entries", "plans", "plan_blocks", "command_receipts",
  ]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.c3r_p_${table}`));
  }
  for (const marker of [
    "enable row level security", "force row level security",
    "revoke all on table", "grant select on table", "to service_role",
    "C3R_P_SERVICE_ROLE_REQUIRED", "C3R_P_IDEMPOTENCY_CONFLICT", "C3R_P_CAS_CONFLICT",
    "ASSISTED_SUCCESS", "D1_COMPLETE", "D7_COMPLETE", "RECURRENCE", "REOPENED",
    "c3r_p_restore_record_v1", "c3r_p_export_learner_data_v1", "c3r_p_delete_learner_data_v1",
  ]) assert.ok(sql.includes(marker), marker);
  assert.match(sql, /v_core_count > 3 or v_minutes > p_available_minutes/);
  assert.match(sql, /v_core_count > 3 or v_minutes > v_plan\.available_minutes/);
  assert.match(sql, /pg_constraint[\s\S]*c3r_p_learning_records_primary_gap_fk/);
  assert.match(sql, /drop policy if exists %I on public\.%I/);
  assert.match(sql, /p_action <> 'complete_d7_transfer'[\s\S]*C3R_P_ATTEMPT_ITEM_MISMATCH/);
  assert.match(sql, /c3r_p_attempts_record_binding_fk foreign key \(\s*user_id, record_id, source_id, problem_id, revision_id, artifact_id/);
  assert.match(sql, /'planId', p\.id[\s\S]*'blocks'[\s\S]*'dayComplete'/);
});

test("reopened Practice completion is an atomic independent retry and exact plan-block transition", () => {
  assert.match(sql, /p_action = 'complete_reopened_review'/);
  assert.match(sql,
    /p_action = 'complete_reopened_review'[\s\S]*v_record\.state <> 'REOPENED'/);
  assert.match(sql,
    /p_action = 'complete_reopened_review'[\s\S]*'INDEPENDENT_SUCCESS'/);
  assert.match(sql,
    /complete_reopened_review[\s\S]*update public\.c3r_p_learning_gaps set state = 'CLOSED'/);
  assert.match(sql,
    /update public\.c3r_p_plan_blocks[\s\S]*execution_state = 'COMPLETE'[\s\S]*p_payload ->> 'planBlockId'/);
  assert.match(sql, /'REOPENED_COMPLETED'/);
  assert.match(serviceSource,
    /PLAN_COMPLETION_ACTIONS\.has\(input\.action\)[\s\S]*planBlockId: input\.planBlockId \?\? null/);
  assert.match(routeSource,
    /PLAN_COMPLETION_ACTIONS\.has\(action\)[\s\S]*planBlockId/);
  assert.match(componentSource,
    /record\?\.state === "REOPENED"[\s\S]*다시 열린 복습을 독립 수행으로 완료/);
  assert.match(browserSource, /assistedRetryDenied: true/);
  assert.match(browserSource, /incorrectRetryDenied: true/);
  assert.match(browserSource, /staleRetryDenied: true/);
  assert.match(browserSource, /duplicateRetryIdempotent: true/);
  assert.match(browserSource, /crossUserRetryDenied: true/);
  assert.match(browserSource, /unrelatedPlanBlockUnchanged: true/);
  assert.match(browserSource, /laterFailureReopensAgain: true/);
});

test("every planned independent review phase completes only a current pending plan block", () => {
  assert.match(sql,
    /p_action in \('complete_d1', 'complete_d7_transfer',\s*'complete_recurrence', 'complete_reopened_review'\)[\s\S]*'planBlockId'/);
  assert.match(sql,
    /from public\.c3r_p_plan_blocks b[\s\S]*b\.execution_state = 'PENDING'/);
  assert.match(sql,
    /not exists \([\s\S]*from public\.c3r_p_plans newer[\s\S]*newer\.generated_at/);
  assert.match(sql,
    /newer\.generated_at = p\.generated_at and newer\.id < p\.id/);
  assert.match(sql,
    /v_plan\.eligibility_digest <>\s*public\.c3r_p_eligibility_digest_v1\(p_user_id, v_now\)/);
  assert.match(sql,
    /update public\.c3r_p_plans[\s\S]*eligibility_digest = public\.c3r_p_eligibility_digest_v1\(p_user_id, v_now\)/);
  assert.match(serviceSource,
    /PLAN_COMPLETION_ACTIONS\.has\(input\.action\)[\s\S]*planBlockId: input\.planBlockId \?\? null/);
  assert.match(routeSource,
    /PLAN_COMPLETION_ACTIONS\.has\(action\)[\s\S]*"planBlockId"/);
  assert.match(componentSource,
    /block\.executionState === "PENDING"[\s\S]*PLAN_COMPLETION_ACTIONS\.has\(action\)/);
  assert.match(browserSource, /completedPlanBlockReuseDenied: true/);
  assert.match(browserSource, /completedPlanBlockNotResent: true/);
});

test("learner export deterministically includes owned assistance events and final plan blocks", () => {
  const exportFunction = sql.slice(
    sql.indexOf("create or replace function public.c3r_p_export_learner_data_v1"),
    sql.indexOf("create or replace function public.c3r_p_delete_learner_data_v1"),
  );
  assert.match(exportFunction,
    /'assistanceEvents'[\s\S]*from public\.c3r_p_assistance_events e[\s\S]*e\.user_id = p_user_id/);
  assert.match(exportFunction,
    /jsonb_agg\(to_jsonb\(e\) order by e\.committed_at, e\.id\)/);
  assert.match(exportFunction,
    /'planBlocks'[\s\S]*from public\.c3r_p_plan_blocks b[\s\S]*b\.user_id = p_user_id/);
  assert.match(exportFunction,
    /jsonb_agg\(to_jsonb\(b\) order by b\.plan_id, b\.ordinal, b\.id\)/);
  assert.match(browserSource, /assistanceExportedExactlyOnce: true/);
  assert.match(browserSource, /todayAndFullDayBlocksExported: true/);
  assert.match(browserSource, /editedPlanBlocksExportFinalValues: true/);
  assert.match(browserSource, /crossUserExportRowsAbsent: true/);
  assert.match(browserSource, /emptyExportCollectionsAreArrays: true/);
  assert.match(browserSource, /deleteRemovesExportedData: true/);
  assert.equal(contract.practiceRuntimeArtifact.metadataOnly, true);
});

test("dedicated cycles start isolated Supabase first and transactionally apply all 26 migrations", () => {
  assert.match(runtimeSource, /c3r-p-migrations/);
  assert.match(runtimeSource, /\[storage\]\\nenabled = true/);
  const excludedServices = runtimeSource.slice(
    runtimeSource.indexOf("const EXCLUDED_SUPABASE_SERVICES"),
    runtimeSource.indexOf("];", runtimeSource.indexOf("const EXCLUDED_SUPABASE_SERVICES")) + 2,
  );
  assert.doesNotMatch(excludedServices, /storage-api/);
  assert.doesNotMatch(runtimeSource, /function installExternalMigrationSubstrate\(container\)/);
  assert.doesNotMatch(runtimeSource, /alter table storage\.objects enable row level security/);
  assert.match(runtimeSource, /function assertExternalMigrationSubstrate\(container\)/);
  assert.match(runtimeSource, /storage\.allow_only_operation\(text\)/);
  assert.match(runtimeSource, /storage\.allow_any_operation\(text\[\]\)/);
  assert.match(runtimeSource, /select relrowsecurity::text from pg_class/);
  assert.match(runtimeSource, /function applyExactMigrationHistory\(cycleRoot, container\)/);
  assert.match(runtimeSource, /names\.length !== 26/);
  assert.match(runtimeSource, /psql\(container, `begin;\\n\$\{sql\}\\ncommit;\\n`/);
  assert.match(runtimeSource, /notify pgrst, 'reload schema'/);
  assert.match(runtimeSource, /150008\|9\|PRACTICE\|f\|f\|t/);
  assert.match(runtimeSource, /150008\|9\|1\|1\|f\|f\|f\|t\|t\|postgres/);
  assert.match(runtimeSource, /append recovery reapplication/);
  assert.ok(
    runtimeSource.indexOf("assertExternalMigrationSubstrate(databaseContainer)") <
      runtimeSource.indexOf("applyExactMigrationHistory(cycleRoot, databaseContainer)"),
    "external Supabase substrate must be verified before exact-history replay",
  );
});

test("dedicated browser runner uses the pinned exact-match config without an absolute positional filter", () => {
  const browserRunner = runtimeSource.slice(
    runtimeSource.indexOf("function runBrowser"),
    runtimeSource.indexOf("async function runDedicatedCycle"),
  );
  assert.match(browserRunner, /wcv-c3r-p-playwright\.config\.ts/);
  assert.match(browserRunner, /reportOutput: true/);
  assert.doesNotMatch(browserRunner, /wcv-c3r-p-practice-common-runtime\.spec\.ts/);
});

test("disposable Review OS profiles upsert exactly three active free-trial Auth identities", () => {
  const identities = [
    { userId: "10000000-0000-4000-8000-000000000001", email: "c3r-p-a-1-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@example.invalid" },
    { userId: "20000000-0000-4000-8000-000000000002", email: "c3r-p-b-1-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb@example.invalid" },
    { userId: "30000000-0000-4000-8000-000000000003", email: "c3r-p-non-owner-1-cccccccc-cccc-4ccc-8ccc-cccccccccccc@example.invalid" },
  ];
  let captured;
  const receipt = seedDisposableReviewOsProfiles(
    "supabase_db_c3r-p-cycle-1-123-1",
    identities,
    (container, fixtureSql, label) => {
      captured = { container, fixtureSql, label };
      return "3|3|3|0";
    },
  );
  assert.deepEqual(receipt, {
    matchedRowCount: 3,
    activeRowCount: 3,
    freeTrialRowCount: 3,
    unrelatedRowMutationCount: 0,
  });
  assert.equal(Object.isFrozen(receipt), true);
  assert.match(captured.fixtureSql, /jsonb_to_recordset/);
  assert.match(captured.fixtureSql, /join auth\.users as auth_user/);
  assert.match(captured.fixtureSql, /insert into public\.profiles as profile/);
  assert.match(captured.fixtureSql, /select user_id, email, 'active', 'free_trial', statement_timestamp\(\)/);
  assert.match(captured.fixtureSql, /on conflict \(user_id\) do update set[\s\S]*invite_status = 'active'/);
  assert.match(captured.fixtureSql, /entitlement_tier = 'free_trial'/);
  assert.doesNotMatch(captured.fixtureSql, /display_name\s*=|created_at\s*=/);
  for (const identity of identities) {
    assert.doesNotMatch(captured.fixtureSql, new RegExp(identity.userId, "i"));
    assert.doesNotMatch(captured.fixtureSql, new RegExp(identity.email.replaceAll(".", "\\."), "i"));
  }
  const encodedPayload = captured.fixtureSql.match(/decode\('([^']+)', 'base64'\)/)?.[1];
  assert.ok(encodedPayload);
  assert.deepEqual(JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8")),
    identities.map((identity) => ({ user_id: identity.userId, email: identity.email })));
});

test("profile provisioning follows Auth creation and precedes every Next or browser entry", () => {
  const identitiesCreated = runtimeSource.indexOf("const identities = [");
  const fixtureSeeded = runtimeSource.indexOf(
    "seedDisposableReviewOsProfiles(databaseContainer, identities)",
  );
  const firstNextStart = runtimeSource.indexOf('server = await startFor("normal-entry")');
  assert.ok(identitiesCreated > 0 && identitiesCreated < fixtureSeeded);
  assert.ok(fixtureSeeded < firstNextStart);
  assert.match(runtimeSource,
    /ALPHA_INVITE_EMAILS: identities\.map\(\(identity\) => identity\.email\)\.join\(","\)/);
  assert.match(runtimeSource,
    /ALPHA_ADMIN_EMAILS: identities\.slice\(0, 2\)\.map\(\(identity\) => identity\.email\)\.join\(","\)/);
  assert.match(runtimeSource,
    /WCV_C3R_P_OWNER_EMAILS: identities\.slice\(0, 2\)\.map\(\(identity\) => identity\.email\)\.join\(","\)/);
  assert.match(runtimeSource,
    /createIdentity\(apiUrl, anonKey, `non-owner-\$\{input\.cycle\}`\)/);
  assert.match(runtimeSource,
    /probe\("owner-a-positive", "C3R_P_ENTRY_VERIFIED", "owner"\)/);
  assert.match(runtimeSource,
    /probe\("owner-b-positive", "C3R_P_ENTRY_VERIFIED", "owner", true,[\s\S]*identities\[1\], identities\[0\], identities\[2\]/);
});

test("disposable profile fixture rejects non-local, non-UUID, duplicate and incomplete boundaries", () => {
  const identities = [
    { userId: "10000000-0000-4000-8000-000000000001", email: "c3r-p-a-1-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa@example.invalid" },
    { userId: "20000000-0000-4000-8000-000000000002", email: "c3r-p-b-1-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb@example.invalid" },
    { userId: "30000000-0000-4000-8000-000000000003", email: "c3r-p-non-owner-1-cccccccc-cccc-4ccc-8ccc-cccccccccccc@example.invalid" },
  ];
  const execute = () => "3|3|3|0";
  assert.throws(() => seedDisposableReviewOsProfiles("remote-database", identities, execute));
  assert.throws(() => seedDisposableReviewOsProfiles(
    "supabase_db_c3r-p-cycle-1-123-1",
    [{ ...identities[0], userId: "not-a-uuid" }, identities[1], identities[2]],
    execute,
  ));
  assert.throws(() => seedDisposableReviewOsProfiles(
    "supabase_db_c3r-p-cycle-1-123-1",
    [identities[0], identities[1], { ...identities[2], userId: identities[0].userId }],
    execute,
  ));
  assert.throws(() => seedDisposableReviewOsProfiles(
    "supabase_db_c3r-p-cycle-1-123-1", identities.slice(0, 2), execute,
  ));
  assert.throws(() => seedDisposableReviewOsProfiles(
    "supabase_db_c3r-p-cycle-1-123-1", identities, () => "3|2|3|0",
  ));
});

test("disposable fixture leaves production access code and frozen identities unchanged", () => {
  for (const [file, expectedBlob] of Object.entries(productionAccessBlobs)) {
    assert.equal(execFileSync("git", ["hash-object", file], { cwd: root, encoding: "utf8" }).trim(),
      expectedBlob, file);
  }
  assert.equal(execFileSync("git", ["hash-object", "package.json"], { cwd: root, encoding: "utf8" }).trim(),
    contract.packageIdentity.packageJsonGitBlob);
  assert.equal(execFileSync("git", ["hash-object", "package-lock.json"], { cwd: root, encoding: "utf8" }).trim(),
    contract.packageIdentity.packageLockJsonGitBlob);
  assert.equal(sha256(Buffer.from(canonicalJson(diskInventory()), "utf8")),
    contract.migrationAuthorityBinding.effectiveInventorySha256);
});

test("entry diagnostics retain one exact metadata-only classification", () => {
  const receipt = sampleEntryReceipt();
  assert.deepEqual(validateC3RPEntryReceipt(receipt), {
    classification: "C3R_P_ENTRY_VERIFIED",
    finalPathname: "/app/c3r-p",
  });
  const privateReceipt = clone(receipt);
  privateReceipt.cookies[0].value = "secret";
  assert.throws(() => validateC3RPEntryReceipt(privateReceipt));
  const queryReceipt = clone(receipt);
  queryReceipt.finalPathname = "/app/c3r-p?recordId=private";
  assert.throws(() => validateC3RPEntryReceipt(queryReceipt));
  assert.match(browserSource, /C3R_P_ENTRY_AUTH_SESSION_NOT_VISIBLE/);
  assert.match(browserSource, /C3R_P_ENTRY_GENERIC_APP_ACCESS_DENIED/);
  assert.match(browserSource, /C3R_P_ENTRY_C3R_ACCESS_GATE_DENIED/);
  assert.match(browserSource, /C3R_P_ENTRY_NOT_FOUND/);
  assert.match(browserSource, /C3R_P_ENTRY_CLIENT_API_TIMEOUT/);
  assert.match(browserSource, /C3R_P_ENTRY_NEXT_RENDER_ERROR/);
  assert.match(browserSource, /C3R_P_ENTRY_VERIFIED/);
});

test("Next diagnostics are bounded and redact split credentials and learner identities", () => {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "c3r-p-entry-"));
  try {
    const logPath = path.join(temporaryRoot, "next.log");
    const secret = "super-secret-api-key";
    const log = createC3RPEntryDiagnosticLog(logPath, [secret], 512);
    log.append(`email=learner@example.invalid password=hunter2 ${secret.slice(0, 8)}`);
    log.append(`${secret.slice(8)} Bearer eyJabcdefghij.abcdefghijk.abcdefghijkl ${"x".repeat(1_000)}`);
    log.finish();
    const bytes = fs.readFileSync(logPath);
    const text = bytes.toString("utf8");
    assert.ok(bytes.length <= 512);
    assert.doesNotMatch(text, /learner@example\.invalid|hunter2|super-secret-api-key|eyJabcdefghij/);
    assert.doesNotMatch(redactC3RPEntryDiagnosticText(
      "cookie: first=value; second=other password=p email=user@example.invalid",
    ), /first=value|second=other|password=p|user@example\.invalid/);
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

test("failure diagnostics upload before unconditional cleanup and verified entry remains separate", () => {
  const failureUpload = workflowSource.indexOf("Upload bounded entry failure diagnostic");
  const verifiedUpload = workflowSource.indexOf("Upload verified entry metadata");
  const cleanup = workflowSource.indexOf("Unconditionally remove local runtime resources");
  assert.ok(failureUpload > 0 && failureUpload < cleanup);
  assert.ok(verifiedUpload > failureUpload && verifiedUpload < cleanup);
  assert.match(workflowSource, /entry-diagnostics\/failure-\*/);
  assert.match(workflowSource, /retention-days: 1/);
  assert.match(runtimeSource, /stdio: \["ignore", "pipe", "pipe"\]/);
  assert.match(runtimeSource, /ENTRY_DIAGNOSTIC_MAX_BYTES = 64 \* 1024/);
  assert.match(runtimeSource,
    /ALPHA_INVITE_EMAILS: identities\.map\(\(identity\) => identity\.email\)\.join\(","\)/);
  assert.match(runtimeSource,
    /WCV_C3R_P_OWNER_EMAILS: identities\.slice\(0, 2\)/);
});

test("verified attempts bind to learner-entered structured values and server-rendered bodies", () => {
  assert.match(componentSource,
    /practiceClaim\(structuredCalculation, view\?\.source\.revisionId\)/);
  assert.match(componentSource, /data-testid="c3r-p-gross-income"/);
  assert.match(componentSource, /data-testid="c3r-p-operating-expense"/);
  assert.match(componentSource, /data-testid="c3r-p-result"/);
  assert.doesNotMatch(componentSource, /function practiceClaim\(resultValue = 100_000_000\)/);
  assert.match(serviceSource, /attemptBody: proof\.canonicalSentence/g);
  assert.doesNotMatch(routeSource, /"attemptBody", "claim", "evidenceStep"/);
  assert.doesNotMatch(routeSource, /c3rPRequiredText\(row\.surfaceId/);
  assert.match(serviceSource, /surfaceId: input\.action === "complete_d7_transfer"[\s\S]*TRANSFER_SURFACE_ID[\s\S]*PRIMARY_SURFACE_ID/);
  assert.match(browserSource, /fillStructuredCalculation/);
});

test("plans and destructive-result UI are restored from successful server state", () => {
  assert.match(sql, /available_minutes between 30 and 720/);
  assert.match(sql, /C3R_P_FROZEN_CONFIGURATION_MISMATCH/);
  assert.match(serviceSource, /const FROZEN_CONFIGURATION = Object\.freeze/);
  assert.match(serviceSource, /configurationDigest: FROZEN_CONFIGURATION_DIGEST/g);
  assert.match(engineSource, /input\.availableMinutes < 30[\s\S]*input\.availableMinutes > 720/);
  assert.match(serviceSource, /const latestPlan = dashboard\.plans\.find/);
  assert.match(serviceSource, /\["REJECTED", "STALE"\]\.includes\(latestPlan\.state\)/);
  assert.match(serviceSource,
    /async createPlan[\s\S]*\.\.\.\(await view\(input\.recordId, asOf\)\)/);
  assert.match(serviceSource,
    /await repository\.decidePlan[\s\S]*return view\(input\.recordId, asOf\)/);
  assert.match(componentSource,
    /action: "create_plan",[\s\S]*recordId: record\.id/);
  assert.match(componentSource,
    /action: "decide_plan",[\s\S]*recordId: record\.id/);
  assert.match(componentSource, /const data = await request\(\{ action: "delete" \}\);\s*if \(!data\.ok\) return;/);
  assert.match(componentSource,
    /data\.result\?\.status !== "deleted"[\s\S]*setError\("temporarily_unavailable"\)/);
  assert.match(componentSource,
    /{error \? \([\s\S]*\) : null}\s*{exportStatus \? <p className="text-sm" role="status">{exportStatus}<\/p> : null}\s*<section/);
  assert.match(browserSource, /계획 상태: EDITED/);
  assert.match(browserSource, /temporarily_unavailable[\s\S]*c3r-p-ledger/);
});

test("PRACTICE_RUNTIME verifier reproduces every required binding", () => {
  const artifact = sampleArtifact();
  const verified = validatePracticeRuntimeArtifact(artifact, root);
  assert.deepEqual(Object.keys(verified), contract.practiceRuntimeArtifact.independentVerifierMustReproduce);
  assert.equal(verified.artifactRef, contract.practiceRuntimeArtifact.artifactRef);
  assert.deepEqual(verified.practiceEvidenceRefs, contract.practiceRuntimeArtifact.practiceEvidenceRefs);
  assert.equal(verified.perItemRuntimeEvidenceRefs.length,
    contract.practiceRuntimeArtifact.practiceEvidenceRefs.length);
});

test("PRACTICE_RUNTIME verifier rejects arbitrary, missing, unrelated and self-attested references", () => {
  const mutations = [
    (artifact) => { artifact.practiceEvidenceRefs[0] = "unrelated"; },
    (artifact) => { artifact.browserToPostgresEvidenceRef += "-self-attested"; },
    (artifact) => { artifact.perItemRuntimeEvidenceRefs[2].runtimeEvidenceRef = "nonexistent"; },
    (artifact) => { artifact.perItemRuntimeEvidenceRefs.pop(); },
    (artifact) => { artifact.candidateTree = "0".repeat(40); artifact.practiceEvidenceDigest = "0".repeat(64); },
    (artifact) => { artifact.resetReplayCycles[1].databaseIdentity = artifact.resetReplayCycles[0].databaseIdentity; },
  ];
  for (const mutate of mutations) {
    const artifact = clone(sampleArtifact());
    mutate(artifact);
    assert.throws(() => validatePracticeRuntimeArtifact(artifact, root));
  }
});

test("frozen path manifest is unique, package identity is unchanged, and candidate diff closes exactly", () => {
  const manifest = contract.pathManifest.changedPathsExactly;
  assert.equal(manifest.length, 37);
  assert.equal(new Set(manifest).size, manifest.length);
  for (const file of manifest) assert.equal(fs.existsSync(path.join(root, file)), true, file);
  assert.equal(execFileSync("git", ["hash-object", "package.json"], { cwd: root, encoding: "utf8" }).trim(),
    contract.packageIdentity.packageJsonGitBlob);
  assert.equal(execFileSync("git", ["hash-object", "package-lock.json"], { cwd: root, encoding: "utf8" }).trim(),
    contract.packageIdentity.packageLockJsonGitBlob);
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  const baseAvailable = spawnSync(
    "git", ["cat-file", "-e", `${contract.authority.baseSha}^{commit}`], { cwd: root },
  ).status === 0;
  if (head !== contract.authority.baseSha && baseAvailable) {
    const changed = execFileSync("git", ["diff", "--name-only", `${contract.authority.baseSha}...HEAD`],
      { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean).sort();
    assert.deepEqual(changed, [...manifest].sort());
  } else if (head !== contract.authority.baseSha) {
    assert.equal(process.env.CI, "true", "the pinned base must exist outside a shallow CI checkout");
  }
});

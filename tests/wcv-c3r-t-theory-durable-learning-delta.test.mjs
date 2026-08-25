import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  parseTheoryPredicateClaimV1Input,
  TrustedRepairContractError,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  buildTheoryPredicateClaim,
  validateTheoryPredicateClaim,
} from "../lib/review-os/trusted-repair-engine.ts";
import { trustedRepairCanonicalFixture } from
  "../lib/review-os/trusted-repair-fixtures.ts";
import {
  C3R_T_ENUM_MIGRATION_PATH,
  C3R_T_INTEGRATION_MIGRATION_PATH,
  createTheoryRuntimeArtifact,
  validateTheoryRuntimeArtifact,
} from "../scripts/automation/wcv-c3r-p-practice-common-runtime.mjs";

const root = path.resolve(import.meta.dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const contract = JSON.parse(read(
  "config/dabangil-wcv-c3r-t-theory-durable-learning-delta-v1.json",
));
const authority = JSON.parse(read(
  "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json",
));
const enumSql = read(
  "supabase/migrations/20260825054823_c3r_t_theory_durable_learning_delta.sql",
);
const integrationSql = read(
  "supabase/migrations/20260825055252_c3r_t_theory_common_substrate_integration.sql",
);
const serviceSource = read("lib/review-os/c3r-t-service.ts");
const repositorySource = read("lib/review-os/c3r-t-repository.ts");
const routeSource = read("app/api/review-os/c3r-t/route.ts");
const componentSource = read("components/review-os/c3r-t-theory-loop.tsx");
const engineSource = read("lib/review-os/c3r-t-engine.ts");
const runtimeSource = read("scripts/automation/wcv-c3r-p-practice-common-runtime.mjs");
const workflowSource = read(".github/workflows/c3r-t-theory-durable-learning-delta.yml");
const practiceSql = read(
  "supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql",
);

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function resignArtifact(artifact) {
  const base = { ...artifact };
  delete base.artifactSha256;
  return {
    ...base,
    artifactSha256: sha256(Buffer.from(canonicalJson(base), "utf8")),
  };
}

function theoryClaim(overrides = {}) {
  return {
    sourceRevisionId: "b8e6d6e9-8c0c-4b54-9c1e-608d33245001",
    anchorId: "repair-anchor:theory:synthetic-income-approach",
    anchorVersionId: "repair-anchor:theory:synthetic-income-approach@1",
    targetScopeId: "theory-target:synthetic-income-approach",
    clauses: [{
      clauseIndex: 1,
      scopeResolution: "EXACT",
      scopeId: "theory-target:synthetic-income-approach",
      predicates: [{
        predicateId: "converts_expected_income_to_value",
        polarity: "ASSERTED",
      }],
    }],
    confirmationMode: "MANUAL_STRUCTURED",
    ...overrides,
  };
}

function evaluate(claim) {
  const closedClaim = buildTheoryPredicateClaim({
    claim: parseTheoryPredicateClaimV1Input(claim),
    learnerConfirmedAt: "2026-08-26T00:06:00.000Z",
  });
  const anchor = trustedRepairCanonicalFixture("appraisal_theory").anchors[0]
    .scopedPredicate;
  return validateTheoryPredicateClaim({
    claim: closedClaim,
    anchor,
    expectedSourceRevisionId: "b8e6d6e9-8c0c-4b54-9c1e-608d33245001",
  });
}

test("C3R-T contract is pinned to the validated C3R-P and parallel-execution receipts", () => {
  assert.equal(contract.authority.stage, "C3R-T");
  assert.equal(contract.authority.subject, "THEORY");
  assert.equal(contract.authority.baseSha,
    "cad8b98e4f13a2fe50d82ffd983616adc70eb75a");
  assert.equal(contract.authority.baseTree,
    "dae1e5d7a2d7138f2e793f50e08f721ece354472");
  assert.equal(contract.authority.validatedDependencyReceipt.pullRequest, 800);
  assert.equal(contract.authority.validatedDependencyReceipt.reviewedHeadSha,
    "8f434027e5d20a5f3e799b1c2d85876e766b3858");
  assert.equal(contract.authority.validatedDependencyReceipt.resultingMainSha,
    "71fd878a7369c25a153bc90389347039684c501f");
  assert.equal(contract.authority.parallelExecutionReceipt.pullRequest, 808);
  assert.equal(contract.authority.parallelExecutionReceipt.resultingMainSha,
    contract.authority.baseSha);
  assert.equal(contract.authority.inheritsCommonDurableSubstrate, true);
  assert.equal(contract.authority.ownsNewCommonDurableSubstrate, false);
});

test("C3R-T binds the exact canonical #706/#707/#708 per-subject inventories", () => {
  for (const issue of ["706", "707", "708"]) {
    assert.deepEqual(
      contract.perSubjectIssueEvidence.requiredExactly[issue],
      authority.issueAllocation.issues[issue].requiredForEachSubjectExactly,
      issue,
    );
  }
  assert.equal(contract.perSubjectIssueEvidence.everyItemMustBeProvedExactlyOnce, true);
  assert.equal(contract.perSubjectIssueEvidence.metadataOnly, true);
  assert.equal(contract.postMergeState.governedIssuesRemainOpen.includes(706), true);
  assert.equal(contract.postMergeState.c3rL,
    "blocked_until_validated_c3r_t_receipt_then_authorized_unstarted");
});

test("closed Theory parser and validator reproduce PASS and every fail-closed class", () => {
  assert.equal(evaluate(theoryClaim()).state, "PASS");
  assert.equal(evaluate(theoryClaim({
    clauses: [{
      clauseIndex: 1, scopeResolution: "EXACT",
      scopeId: "theory-target:synthetic-income-approach",
      predicates: [{
        predicateId: "converts_expected_income_to_value", polarity: "NEGATED",
      }],
    }],
  })).state, "PARTIAL");
  assert.equal(evaluate(theoryClaim({
    clauses: [{
      clauseIndex: 1, scopeResolution: "EXACT",
      scopeId: "theory-target:synthetic-income-approach",
      predicates: [{ predicateId: "uses_only_historical_cost", polarity: "ASSERTED" }],
    }],
  })).state, "BLOCKED");
  assert.equal(evaluate(theoryClaim({
    clauses: [{
      clauseIndex: 1, scopeResolution: "EXACT",
      scopeId: "theory-target:synthetic-income-approach",
      predicates: [
        { predicateId: "converts_expected_income_to_value", polarity: "ASSERTED" },
        { predicateId: "converts_expected_income_to_value", polarity: "NEGATED" },
      ],
    }],
  })).state, "AMBIGUOUS");
  assert.equal(evaluate(theoryClaim({
    clauses: [{
      clauseIndex: 1, scopeResolution: "UNRESOLVED_ANAPHORA", scopeId: null,
      predicates: [{
        predicateId: "converts_expected_income_to_value", polarity: "ASSERTED",
      }],
    }],
  })).state, "AMBIGUOUS");
  assert.equal(evaluate(theoryClaim({
    clauses: [{
      clauseIndex: 1, scopeResolution: "EXACT",
      scopeId: "theory-target:synthetic-cost-approach",
      predicates: [{
        predicateId: "converts_expected_income_to_value", polarity: "ASSERTED",
      }],
    }],
  })).state, "UNSUPPORTED");
  const overflow = Array.from({ length: 25 }, (_, index) => ({
    clauseIndex: index + 1,
    scopeResolution: "EXACT",
    scopeId: "theory-target:synthetic-income-approach",
    predicates: [{ predicateId: `predicate_${index}`, polarity: "ASSERTED" }],
  }));
  assert.equal(evaluate(theoryClaim({ clauses: overflow })).state, "UNSUPPORTED");
  assert.throws(() => parseTheoryPredicateClaimV1Input({
    ...theoryClaim(), callerProofState: "PASS",
  }), TrustedRepairContractError);
});

test("Postgres is authoritative for Theory proof state, canonical body and digest", () => {
  assert.doesNotMatch(engineSource,
    /proofDigest:\s*c3rTSha256\(\{ claim, evaluation \}\)/u);
  assert.equal(contract.theoryProof.proofDigestAuthority,
    "DATABASE_CANONICAL_JSONB_CLAIM_AND_EVALUATION_ONLY");
  assert.equal(contract.theoryProof.typescriptProofDigestProduced, false);
  assert.match(integrationSql,
    /create or replace function public\.c3r_t_validate_theory_claim_v1\([\s\S]*current_user <> 'service_role'/);
  assert.match(integrationSql,
    /perform public\.c3r_p_require_exact_keys_v1\(p_claim, array\[[\s\S]*'targetScopeId'/);
  assert.match(integrationSql,
    /same_target_mixed_polarity:[\s\S]*required_predicate_negated[\s\S]*cross_target_evidence_cannot_satisfy_target/);
  assert.match(integrationSql,
    /p_action = 'submit_repair'[\s\S]*array\[[\s\S]*'attemptId', 'claim'[\s\S]*c3r_t_validate_theory_claim_v1/);
  assert.doesNotMatch(
    integrationSql.slice(
      integrationSql.indexOf("elsif p_action = 'submit_repair'"),
      integrationSql.indexOf("elsif p_action in (", integrationSql.indexOf("elsif p_action = 'submit_repair'")),
    ),
    /p_payload ->> '(?:proofState|proofDigest|validatorId|attemptBody)'/,
  );
  assert.match(integrationSql,
    /proof_claim jsonb[\s\S]*proof_evaluation jsonb[\s\S]*proof_reason_codes jsonb/);
  assert.match(integrationSql,
    /proof_evaluation ->> 'state' = proof_state[\s\S]*proof_evaluation -> 'reasonCodes' = proof_reason_codes/);
  assert.match(integrationSql,
    /proof_digest = encode\(extensions\.digest\(convert_to\(jsonb_build_object\([\s\S]*'claim', proof_claim, 'evaluation', proof_evaluation/);
  assert.match(integrationSql,
    /v_proof ->> 'canonicalSentence'[\s\S]*v_proof -> 'claim'[\s\S]*v_proof -> 'evaluation'[\s\S]*v_proof -> 'reasonCodes'/);
  assert.match(integrationSql,
    /jsonb_typeof\(p_claim -> 'anchorId'\) <> 'string'[\s\S]*jsonb_typeof\(v_predicate -> 'polarity'\) <> 'string'/);
});

test("hostile direct-RPC proof minting fails before a Theory transition", () => {
  const reviewSource = integrationSql.slice(
    integrationSql.indexOf("elsif p_action in ("),
    integrationSql.indexOf("else\n      raise exception 'C3R_T_INVALID_ACTION'"),
  );
  assert.match(reviewSource,
    /'attemptId', 'claim', 'configurationDigest', 'itemId', 'occurredAt'/);
  assert.doesNotMatch(reviewSource.slice(0, reviewSource.indexOf("v_now :=")),
    /'proofState'|'proofDigest'|'validatorId'|'attemptBody'/);
  assert.match(reviewSource,
    /v_proof := public\.c3r_t_validate_theory_claim_v1\([\s\S]*v_proof_state := v_proof ->> 'state'/);
  assert.match(reviewSource,
    /p_action = 'record_later_failure' and v_proof_state = 'PASS'/);
  assert.match(reviewSource,
    /p_action <> 'record_later_failure' and v_proof_state <> 'PASS'/);
});

test("ordinary retries are stable while legacy Practice planner receipts keep their hashes", () => {
  assert.match(integrationSql,
    /p_expected_version::text, p_action,[\s\S]*p_payload - 'occurredAt' - 'd1DueAt' - 'd7DueAt' - 'recurrenceDueAt'/);
  assert.match(serviceSource,
    /c3r-t-plan-block-v1:\$\{input\.planId\}:\$\{blockOrdinal \+= 1\}/);
  const createPlan = integrationSql.slice(
    integrationSql.indexOf("create or replace function public.c3r_subject_create_plan_v1"),
    integrationSql.indexOf("create or replace function public.c3r_subject_decide_plan_v1"),
  );
  const compactCreatePlan = createPlan.replace(/\s+/gu, " ");
  assert.match(compactCreatePlan,
    /case when p_subject = 'PRACTICE' then encode[\s\S]*p_plan_id::text, p_plan_kind::text, p_available_minutes::text, p_as_of::text, p_blocks::text/);
  assert.match(compactCreatePlan,
    /else encode[\s\S]*p_subject::text, p_plan_id::text, p_plan_kind::text, p_available_minutes::text, p_blocks::text/);
  const decidePlan = integrationSql.slice(
    integrationSql.indexOf("create or replace function public.c3r_subject_decide_plan_v1"),
    integrationSql.indexOf("create or replace function public.c3r_p_create_plan_v1"),
  );
  const compactDecidePlan = decidePlan.replace(/\s+/gu, " ");
  assert.match(compactDecidePlan,
    /case when p_subject = 'PRACTICE' then encode[\s\S]*p_plan_id::text, p_expected_version::text, p_decision, p_as_of::text, coalesce\(p_blocks::text, ''\)/);
  assert.match(compactDecidePlan,
    /else encode[\s\S]*p_subject::text, p_plan_id::text, p_expected_version::text, p_decision, coalesce\(p_blocks::text, ''\)/);
});

test("restore camouflage and destructive data operations stay subject and owner scoped", () => {
  assert.match(integrationSql,
    /if p_subject = 'PRACTICE' then[\s\S]*raise exception 'C3R_P_NOT_FOUND'[\s\S]*raise exception 'C3R_T_NOT_FOUND'/);
  assert.match(repositorySource, /C3R_T_NOT_FOUND[\s\S]*new C3RTError\("not_found"\)/);
  assert.match(integrationSql,
    /c3r_subject_restore_record_v1\('THEORY'[\s\S]*c3r_subject_export_learner_data_v1\('THEORY'[\s\S]*c3r_subject_delete_learner_data_v1\('THEORY'/);
  assert.match(integrationSql,
    /'commandReceipts'[\s\S]*'subject', c\.subject::text[\s\S]*c\.subject = p_subject/);
  assert.doesNotMatch(integrationSql.slice(
    integrationSql.indexOf("create or replace function public.c3r_subject_export_learner_data_v1"),
    integrationSql.indexOf("create or replace function public.c3r_subject_delete_learner_data_v1"),
  ), /requestSha256|request_sha256/u);
  assert.match(integrationSql,
    /where user_id = p_user_id and subject = p_subject/);
  assert.equal(contract.dataBoundary.theoryDeletePreservesPractice, true);
  assert.equal(contract.dataBoundary.practiceDeletePreservesTheory, true);
});

test("reopened independent completion has its own durable evidence identity", () => {
  assert.match(integrationSql,
    /when 'RECURRENCE_COMPLETED' then 'THEORY_RUNTIME:c3r-t-theory-durable-learning-v1#706:TIMED_RECURRENCE'/);
  assert.match(integrationSql,
    /when 'REOPENED_COMPLETED' then 'THEORY_RUNTIME:c3r-t-theory-durable-learning-v1#706:POST_REOPEN_INDEPENDENT_COMPLETION'/);
  assert.equal(contract.learnerVertical.orderedFlowExactly.includes(
    "POST_REOPEN_INDEPENDENT_COMPLETION",
  ), true);
});

test("Today and Full-Day stay deterministic and cap core outcomes at three", () => {
  assert.match(engineSource,
    /dashboard\.queue\.filter\(\(item\) => item\.eligible\)[\s\S]*dueAt\.localeCompare/);
  assert.match(engineSource,
    /const minutes = Math\.min\(index < 3 \? 30 : 15, remaining\)/);
  assert.match(engineSource,
    /blockKind: index < 3 \? "CORE_OUTCOME" : "SUPPORT"/);
  assert.match(integrationSql, /v_core_count > 3 or v_minutes > p_available_minutes/);
  assert.match(practiceSql,
    /create type public\.c3r_p_plan_kind as enum \('TODAY', 'FULL_DAY'\)/);
});

test("Owner-only/default-off boundaries and UI/API flow remain closed", () => {
  assert.match(serviceSource,
    /process\.env\[C3R_T_FEATURE_FLAG\] !== "true"[\s\S]*feature_disabled/);
  assert.match(serviceSource,
    /process\.env\.VERCEL_ENV === "production"[\s\S]*production_denied/);
  assert.match(serviceSource,
    /ALPHA_ADMIN_EMAILS[\s\S]*C3R_T_OWNER_ALLOWLIST/);
  assert.doesNotMatch(serviceSource, /NEXT_PUBLIC_|createSupabaseAdminClient/);
  assert.match(routeSource, /requireC3RTAccess\(\)/);
  assert.match(routeSource, /parseTheoryPredicateClaimV1Input/);
  assert.match(componentSource,
    /c3rTCurrentQueueItem[\s\S]*d1QueueItem\?\.eligible === true[\s\S]*d7QueueItem\?\.eligible === true[\s\S]*recurrenceQueueItem\?\.eligible === true[\s\S]*reopenedQueueItem\?\.eligible === true/);
  assert.match(componentSource,
    /hasEligibleQueueItem[\s\S]*disabled=\{pending \|\| !hasEligibleQueueItem\}/);
  for (const marker of [
    "prediction", "failureNote", "c3r-t-structured-claim", "D+1", "D+7",
  ]) assert.ok(componentSource.includes(marker), marker);
  assert.equal(contract.runtimeBoundary.publicActivation, false);
  assert.equal(contract.runtimeBoundary.paymentActivation, false);
  assert.equal(contract.runtimeBoundary.remoteSupabaseMutationCount, 0);
});

test("forward migrations preserve the validated C3R-P append byte-for-byte", () => {
  const practice = JSON.parse(read(
    "config/dabangil-wcv-c3r-p-practice-common-durable-runtime-v1.json",
  ));
  assert.equal(
    sha256(Buffer.from(practiceSql.replace(/\r\n/g, "\n"), "utf8")),
    practice.migrationAuthorityBinding.candidateSqlSha256,
  );
  assert.match(enumSql,
    /alter type public\.c3r_p_subject add value if not exists 'THEORY'/);
  assert.doesNotMatch(enumSql + integrationSql, /add value 'LAW'/);
  assert.equal(contract.pathManifest.forwardMigrationsExactly.length, 2);
});

test("THEORY_RUNTIME artifact closes two exact-head PG15.8 cycles and rejects drift", () => {
  const cycle = (number) => ({
    cycle: number,
    receiptId: `00000000-0000-4000-8000-00000000000${number}`,
    databaseIdentity: `c3r-t-cycle-${number}-123-1`,
    containerIdentity: `supabase_db_c3r-t-cycle-${number}-123-1`,
    migrationCount: 28,
    serverVersionNum: 150008,
    browserEvidenceSha256: String(number).repeat(64),
    practiceCompatibilityEvidenceSha256: String(number + 2).repeat(64),
    browserToPostgres: true,
    restartRestore: true,
    restoreExportDelete: true,
    hostileDirectRpcDenied: true,
    legacyPracticePlannerReceiptReplay: true,
    practiceCompatibilityPreserved: true,
    cleanup: "complete",
  });
  const artifactRepository = fs.mkdtempSync(path.join(os.tmpdir(), "c3r-t-artifact-"));
  const priorPrHead = process.env.PR_HEAD_SHA;
  try {
    for (const [migrationPath, bytes] of [
      [C3R_T_ENUM_MIGRATION_PATH, enumSql],
      [C3R_T_INTEGRATION_MIGRATION_PATH, integrationSql],
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
    gitFixture(["config", "user.name", "C3R-T artifact fixture"]);
    gitFixture(["config", "user.email", "c3r-t-artifact@example.invalid"]);
    gitFixture(["config", "core.autocrlf", "false"]);
    gitFixture(["add", "--", C3R_T_ENUM_MIGRATION_PATH, C3R_T_INTEGRATION_MIGRATION_PATH]);
    gitFixture(["commit", "--quiet", "-m", "fixture"]);
    const candidateHead = gitFixture(["rev-parse", "HEAD"]);
    const candidateTree = gitFixture(["rev-parse", "HEAD^{tree}"]);
    process.env.PR_HEAD_SHA = candidateHead;
    const migrationIdentities = [
      { path: C3R_T_ENUM_MIGRATION_PATH, sha256: sha256(Buffer.from(enumSql, "utf8")) },
      { path: C3R_T_INTEGRATION_MIGRATION_PATH,
        sha256: sha256(Buffer.from(integrationSql, "utf8")) },
    ];
    const artifact = createTheoryRuntimeArtifact({
      candidateHead,
      candidateTree,
      migrationIdentities,
      resetReplayCycles: [cycle(1), cycle(2)],
    });
    assert.equal(validateTheoryRuntimeArtifact(artifact, artifactRepository), artifact);
    assert.throws(() => validateTheoryRuntimeArtifact({
      ...artifact,
      resetReplayCycles: [{ ...cycle(1), hostileDirectRpcDenied: false }, cycle(2)],
    }, artifactRepository), /THEORY_RUNTIME reset\/replay cycle 1 is invalid/u);
    const duplicateMigration = createTheoryRuntimeArtifact({
      candidateHead,
      candidateTree,
      migrationIdentities: [migrationIdentities[0], migrationIdentities[0]],
      resetReplayCycles: [cycle(1), cycle(2)],
    });
    assert.throws(() => validateTheoryRuntimeArtifact(duplicateMigration, artifactRepository),
      /closed ordered head files/u);
    const reusedReceipt = createTheoryRuntimeArtifact({
      candidateHead,
      candidateTree,
      migrationIdentities,
      resetReplayCycles: [cycle(1), {
        ...cycle(2),
        receiptId: cycle(1).receiptId,
      }],
    });
    assert.throws(() => validateTheoryRuntimeArtifact(reusedReceipt, artifactRepository),
      /reused receiptId/u);
    const reusedCycleIdentity = createTheoryRuntimeArtifact({
      candidateHead,
      candidateTree,
      migrationIdentities,
      resetReplayCycles: [cycle(1), {
        ...cycle(2),
        databaseIdentity: cycle(1).databaseIdentity,
        containerIdentity: cycle(1).containerIdentity,
      }],
    });
    assert.throws(() => validateTheoryRuntimeArtifact(reusedCycleIdentity, artifactRepository),
      /reset\/replay cycle 2 is invalid/u);
    const extraPrivateField = resignArtifact({ ...artifact, rawLearnerBody: "private" });
    assert.throws(() => validateTheoryRuntimeArtifact(extraPrivateField, artifactRepository),
      /keys are not exact/u);
    fs.appendFileSync(path.join(artifactRepository, C3R_T_ENUM_MIGRATION_PATH), "\n-- dirty\n");
    assert.throws(() => validateTheoryRuntimeArtifact(artifact, artifactRepository),
      /closed ordered head files/u);
  } finally {
    if (priorPrHead === undefined) delete process.env.PR_HEAD_SHA;
    else process.env.PR_HEAD_SHA = priorPrHead;
    fs.rmSync(artifactRepository, { recursive: true, force: true });
  }
  assert.match(runtimeSource, /for \(let cycle = 1; cycle <= 2; cycle \+= 1\)/u);
  assert.match(runtimeSource,
    /--no-replace-objects", "show", `\$\{headSha\}:\$\{migrationPath\}`[\s\S]*diskBytes\.equals\(committedBytes\)/u);
  assert.match(runtimeSource,
    /applyExactMigrationHistory\(cycleRoot, container\)[\s\S]*C3R_T_ENUM_MIGRATION_PATH[\s\S]*C3R_T_INTEGRATION_MIGRATION_PATH/u);
  assert.match(workflowSource, /fetch-depth: 0/u);
  assert.match(workflowSource, /--c3r-t-dedicated/u);
  assert.match(workflowSource, /--verify-c3r-t-artifact/u);
});

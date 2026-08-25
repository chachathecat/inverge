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
  C3R_T_NATIVE_SCHEMA_VERSION,
  C3R_T_ENUM_MIGRATION_PATH,
  C3R_T_INTEGRATION_MIGRATION_PATH,
  C3R_T_RUNTIME_PRODUCER_VERSION,
  boundedNativePostgresDiagnostic,
  c3rTNativePrerequisiteClosure,
  classifyC3RTNativeServiceAssertions,
  createC3RTNativeEvidence,
  createTheoryRuntimeArtifact,
  isC3RPRiskCandidate,
  isC3RTRiskCandidate,
  isNativeContainerVerifiedAbsent,
  validateC3RPMigrationAuthorityBinding,
  validateC3RTNativeEvidence,
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
const runtimeProducerSource = read("scripts/automation/produce-runtime-evidence.mjs");
const runtimeGateSource = read("scripts/automation/runtime-gate.mjs");
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
  const actualChangedPaths = execFileSync("git", [
    "diff", "--name-only", contract.authority.baseSha, "--",
  ], { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/u).filter(Boolean);
  assert.deepEqual(contract.pathManifest.changedPathsExactly,
    [...contract.pathManifest.changedPathsExactly].sort());
  assert.equal(new Set(contract.pathManifest.changedPathsExactly).size,
    contract.pathManifest.changedPathsExactly.length);
  assert.deepEqual(actualChangedPaths, contract.pathManifest.changedPathsExactly);
});

test("generic runtime gate has a closed exact-head C3R-T native adapter", () => {
  const sharedRuntimePath =
    "scripts/automation/wcv-c3r-p-practice-common-runtime.mjs";
  const riskResult = {
    version: 1,
    risk: "high",
    reasons: [],
    runtimeEvidenceRequired: true,
    runtimeReasons: [
      { path: C3R_T_ENUM_MIGRATION_PATH, pattern: "supabase/migrations/**" },
      { path: C3R_T_INTEGRATION_MIGRATION_PATH, pattern: "supabase/migrations/**" },
      { path: sharedRuntimePath, pattern: sharedRuntimePath },
    ],
    changedFiles: [
      C3R_T_ENUM_MIGRATION_PATH,
      C3R_T_INTEGRATION_MIGRATION_PATH,
      sharedRuntimePath,
    ],
    changedFilesTruncated: false,
  };
  assert.equal(isC3RTRiskCandidate(riskResult), true);
  assert.equal(isC3RPRiskCandidate(riskResult), false);
  assert.equal(isC3RTRiskCandidate({
    ...riskResult,
    changedFiles: [C3R_T_ENUM_MIGRATION_PATH, sharedRuntimePath],
  }), false);
  assert.equal(isC3RTRiskCandidate({
    ...riskResult,
    changedFiles: [
      ...riskResult.changedFiles,
      "supabase/migrations/20990101000000_unowned_runtime.sql",
    ],
  }), false);
  assert.equal(isC3RTRiskCandidate({
    ...riskResult,
    changedFiles: [...riskResult.changedFiles, C3R_T_ENUM_MIGRATION_PATH],
  }), false);
  assert.equal(isC3RTRiskCandidate({ ...riskResult, changedFilesTruncated: true }), false);
  assert.equal(isC3RTRiskCandidate({ ...riskResult, runtimeEvidenceRequired: false }), false);
  assert.equal(isC3RTRiskCandidate({
    ...riskResult,
    runtimeReasons: riskResult.runtimeReasons.slice(1),
  }), false);
  assert.equal(isC3RTRiskCandidate({
    ...riskResult,
    runtimeReasons: [...riskResult.runtimeReasons, riskResult.runtimeReasons[0]],
  }), false);

  const adapterFixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "c3r-t-native-adapter-"));
  const adapterRepository = path.join(adapterFixtureRoot, "repository");
  const priorEnvironment = {
    PR_HEAD_SHA: process.env.PR_HEAD_SHA,
    GITHUB_RUN_ID: process.env.GITHUB_RUN_ID,
    GITHUB_RUN_ATTEMPT: process.env.GITHUB_RUN_ATTEMPT,
  };
  try {
    const gitMetadataPath = path.join(root, ".git");
    const sourceGitDirectory = fs.statSync(gitMetadataPath).isDirectory()
      ? gitMetadataPath
      : path.resolve(root, fs.readFileSync(gitMetadataPath, "utf8")
        .trim().replace(/^gitdir:\s*/u, ""));
    execFileSync("git", [
      "-c", `safe.directory=${root}`,
      "-c", `safe.directory=${sourceGitDirectory}`,
      "-c", "core.autocrlf=false", "clone", "--quiet", "--no-hardlinks",
      root, adapterRepository,
    ]);
    const gitFixture = (args) => execFileSync("git", args, {
      cwd: adapterRepository,
      encoding: "utf8",
    }).trim();
    for (const migrationPath of [
      C3R_T_ENUM_MIGRATION_PATH,
      C3R_T_INTEGRATION_MIGRATION_PATH,
    ]) {
      fs.copyFileSync(
        path.join(root, migrationPath),
        path.join(adapterRepository, migrationPath),
      );
    }
    gitFixture(["add", "--", C3R_T_ENUM_MIGRATION_PATH,
      C3R_T_INTEGRATION_MIGRATION_PATH]);
    gitFixture([
      "-c", "user.name=C3R-T Runtime Fixture",
      "-c", "user.email=c3r-t-runtime@example.invalid",
      "commit", "--quiet", "--allow-empty", "-m", "candidate migration source fixture",
    ]);
    const candidateParentSha = gitFixture(["rev-parse", "HEAD"]);
    const candidateParentTree = gitFixture(["rev-parse", "HEAD^{tree}"]);
    gitFixture([
      "-c", "user.name=C3R-T Runtime Fixture",
      "-c", "user.email=c3r-t-runtime@example.invalid",
      "commit", "--quiet", "--allow-empty", "-m", "candidate exact-head fixture",
    ]);
    const headSha = gitFixture(["rev-parse", "HEAD"]);
    const headTree = gitFixture(["rev-parse", "HEAD^{tree}"]);
    assert.notEqual(headSha, candidateParentSha);
    assert.equal(headTree, candidateParentTree);
    assert.equal(
      gitFixture(["show", `${headSha}:${C3R_T_INTEGRATION_MIGRATION_PATH}`]),
      integrationSql.trim(),
    );
    assert.equal(
      gitFixture(["show", `${headSha}:${C3R_T_ENUM_MIGRATION_PATH}`]),
      enumSql.trim(),
    );
    const commitEnvironment = {
      ...process.env,
      GIT_AUTHOR_NAME: "C3R-T Runtime Fixture",
      GIT_AUTHOR_EMAIL: "c3r-t-runtime@example.invalid",
      GIT_COMMITTER_NAME: "C3R-T Runtime Fixture",
      GIT_COMMITTER_EMAIL: "c3r-t-runtime@example.invalid",
    };
    const commitTree = (parents, message) => execFileSync("git", [
      "commit-tree", headTree, ...parents.flatMap((parent) => ["-p", parent]),
    ], {
      cwd: adapterRepository,
      encoding: "utf8",
      input: `${message}\n`,
      env: commitEnvironment,
    }).trim();
    const syntheticSideSha = commitTree([headSha], "synthetic side");
    const syntheticMergeSha = commitTree(
      [headSha, syntheticSideSha],
      "synthetic pull request merge",
    );
    gitFixture(["checkout", "--quiet", "--detach", syntheticMergeSha]);
    assert.notEqual(gitFixture(["rev-parse", "HEAD^{commit}"]), headSha);
    assert.equal(gitFixture(["rev-parse", "HEAD^{tree}"]), headTree);
    process.env.PR_HEAD_SHA = headSha;
    process.env.GITHUB_RUN_ID = "98765";
    process.env.GITHUB_RUN_ATTEMPT = "2";
    const riskBytes = Buffer.from(`${JSON.stringify(riskResult)}\n`, "utf8");
    const theoryDelta = [
      { path: C3R_T_ENUM_MIGRATION_PATH, sha256: sha256(Buffer.from(enumSql, "utf8")) },
      { path: C3R_T_INTEGRATION_MIGRATION_PATH,
        sha256: sha256(Buffer.from(integrationSql, "utf8")) },
    ];
    const inheritedInventory = validateC3RPMigrationAuthorityBinding(
      adapterRepository,
      headSha,
    );
    const inheritedAppend = inheritedInventory.find(
      (identity) => identity.path ===
        "supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql",
    );
    assert.ok(inheritedAppend);
    const practiceBase = {
      validatedInventoryCount: 26,
      inventorySha256: sha256(Buffer.from(canonicalJson(inheritedInventory), "utf8")),
      appendPath: inheritedAppend.path,
      appendSha256: inheritedAppend.sha256,
    };
    const forcedRlsTables = [
      "c3r_p_assistance_events", "c3r_p_attempts", "c3r_p_command_receipts",
      "c3r_p_failure_notes", "c3r_p_learning_gaps", "c3r_p_learning_records",
      "c3r_p_ledger_entries", "c3r_p_plan_blocks", "c3r_p_plans",
      "c3r_p_transfer_tasks",
    ];
    const cycle = (number) => ({
      cycle: number,
      databaseIdentity: `c3r-t-native-98765-2-${number}`,
      containerIdentity: `inverge-runtime-98765-2-c3r-t-${number}`,
      serverVersionNum: 150008,
      appliedRepositoryFilesExactly: [
        practiceBase.appendPath,
        C3R_T_ENUM_MIGRATION_PATH,
        C3R_T_INTEGRATION_MIGRATION_PATH,
      ],
      forcedRlsTables,
      subjectLabels: ["PRACTICE", "THEORY"],
      theoryStartIdempotent: true,
      practiceStartIdempotentPreserved: true,
      practiceWrapperArgumentNamesPreserved: true,
      crossTargetValidatorUnsupported: true,
      crossSubjectInsertDenied: true,
      authenticatedTableInsertDenied: true,
      authenticatedValidatorExecuteDenied: true,
      cleanup: "complete",
    });
    const evidence = createC3RTNativeEvidence({
      headSha,
      headTree,
      runId: "98765",
      runAttempt: 2,
      riskBytes,
      practiceBase,
      prerequisiteClosure: c3rTNativePrerequisiteClosure(),
      theoryDelta,
      cycles: [cycle(1), cycle(2)],
    });
    assert.equal(evidence.schemaVersion, C3R_T_NATIVE_SCHEMA_VERSION);
    assert.equal(evidence.producerVersion, C3R_T_RUNTIME_PRODUCER_VERSION);
    assert.doesNotThrow(() => validateC3RTNativeEvidence(
      evidence,
      { riskResult, riskBytes },
      adapterRepository,
    ));
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      verifiedAt: "2026-01-01T00:00:00.000Z",
    }, { riskResult, riskBytes }, adapterRepository), /stale or in the future/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      pullRequestHeadSha: "a".repeat(40),
    }, { riskResult, riskBytes }, adapterRepository), /exact execution head/u);
    assert.throws(() => validateC3RTNativeEvidence(
      evidence,
      { riskResult, riskBytes: Buffer.from("different-risk", "utf8") },
      adapterRepository,
    ), /identity is invalid/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      practiceBase: { ...practiceBase, validatedInventoryCount: 25 },
    }, { riskResult, riskBytes }, adapterRepository), /Practice base or Theory delta/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      prerequisiteClosure: {
        ...evidence.prerequisiteClosure,
        inheritedInventoryExecuted: true,
      },
    }, { riskResult, riskBytes }, adapterRepository), /prerequisite closure is invalid/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      theoryDelta: [theoryDelta[0], theoryDelta[0]],
    }, { riskResult, riskBytes }, adapterRepository), /Practice base or Theory delta/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      cycles: [cycle(1), { ...cycle(2), databaseIdentity: cycle(1).databaseIdentity }],
    }, { riskResult, riskBytes }, adapterRepository), /native cycle 2 is invalid/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      cycles: [{ ...cycle(1), appliedMigrationCount: 28 }, cycle(2)],
    }, { riskResult, riskBytes }, adapterRepository), /keys are not exact/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      cycles: [{ ...cycle(1), forcedRlsTables: forcedRlsTables.slice(1) }, cycle(2)],
    }, { riskResult, riskBytes }, adapterRepository), /native cycle 1 is invalid/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      cycles: [{ ...cycle(1), practiceWrapperArgumentNamesPreserved: false }, cycle(2)],
    }, { riskResult, riskBytes }, adapterRepository), /native cycle 1 is invalid/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      assertions: evidence.assertions.slice(1),
    }, { riskResult, riskBytes }, adapterRepository), /assertion set/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      assertions: [...evidence.assertions.slice(0, -1), evidence.assertions[0]],
    }, { riskResult, riskBytes }, adapterRepository), /assertion set/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      assertions: [{ ...evidence.assertions[0], note: "self-attested" },
        ...evidence.assertions.slice(1)],
    }, { riskResult, riskBytes }, adapterRepository), /keys are not exact/u);
    assert.throws(() => validateC3RTNativeEvidence({
      ...evidence,
      dataBoundary: { ...evidence.dataBoundary, rawLearnerContentPersisted: true },
    }, { riskResult, riskBytes }, adapterRepository), /metadata-only boundary/u);
    fs.writeFileSync(path.join(adapterRepository, "checkout-tree-drift.txt"), "drift\n");
    gitFixture(["add", "checkout-tree-drift.txt"]);
    gitFixture([
      "-c", "user.name=C3R-T Runtime Fixture",
      "-c", "user.email=c3r-t-runtime@example.invalid",
      "commit", "--quiet", "-m", "different checkout tree",
    ]);
    assert.notEqual(gitFixture(["rev-parse", "HEAD^{tree}"]), headTree);
    assert.throws(() => validateC3RTNativeEvidence(
      evidence,
      { riskResult, riskBytes },
      adapterRepository,
    ), /exact execution head\/tree\/run/u);
    gitFixture(["checkout", "--quiet", "--detach", syntheticMergeSha]);
    fs.appendFileSync(path.join(adapterRepository, C3R_T_ENUM_MIGRATION_PATH), "\n-- dirty\n");
    assert.throws(() => validateC3RTNativeEvidence(
      evidence,
      { riskResult, riskBytes },
      adapterRepository,
    ), /worktree bytes drifted/u);
  } finally {
    for (const [key, value] of Object.entries(priorEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fs.rmSync(adapterFixtureRoot, { recursive: true, force: true });
  }

  assert.ok(runtimeProducerSource.indexOf("if (isC3RTRiskCandidate(riskResult))") <
    runtimeProducerSource.indexOf("if (isC3RPRiskCandidate(riskResult))"));
  assert.ok(runtimeGateSource.indexOf("if (isC3RTRiskCandidate(riskResult))") <
    runtimeGateSource.indexOf("if (isC3RPRiskCandidate(riskResult))"));
  assert.match(runtimeSource,
    /nativePsql\(name, sql\.append[\s\S]*nativePsql\(name, sql\.enum[\s\S]*nativePsql\(name, sql\.integration/u);
  assert.match(runtimeSource,
    /authenticated direct mutation did not fail closed[\s\S]*authenticated proof validation did not fail closed/u);
  assert.match(runtimeSource,
    /select concat_ws\('\|',[\s\S]*c3r_t_apply_learning_command_v1[\s\S]*c3r_t_apply_learning_command_v1[\s\S]*c3r_p_apply_learning_command_v1[\s\S]*c3r_p_apply_learning_command_v1[\s\S]*\)\);\s*select concat_ws\('\|',[\s\S]*select count\(\*\) from public\.c3r_p_learning_records[\s\S]*select count\(\*\) from public\.c3r_p_learning_records[\s\S]*c3r_t_validate_theory_claim_v1/u);
  const expectedServiceFields = [
    "applied", "applied", "applied", "applied", "1", "1", "UNSUPPORTED",
  ];
  assert.deepEqual(classifyC3RTNativeServiceAssertions(
    `${expectedServiceFields.slice(0, 4).join("|")}\n${
      expectedServiceFields.slice(4).join("|")}\n`,
  ), []);
  const serviceMismatchCodes = [
    "theory_start_initial_status",
    "theory_start_replay_status",
    "practice_start_initial_status",
    "practice_start_replay_status",
    "theory_record_count",
    "practice_record_count",
    "cross_target_validator_state",
  ];
  for (const [index, code] of serviceMismatchCodes.entries()) {
    const mutated = [...expectedServiceFields];
    mutated[index] = "synthetic-private-secret-value";
    assert.deepEqual(classifyC3RTNativeServiceAssertions(
      `${mutated.slice(0, 4).join("|")}\n${mutated.slice(4).join("|")}`,
    ), [code]);
  }
  assert.deepEqual(classifyC3RTNativeServiceAssertions(
    expectedServiceFields.join("|"),
  ), ["output_shape"]);
  assert.deepEqual(classifyC3RTNativeServiceAssertions(
    `${expectedServiceFields.slice(0, 4).join("|")}\n${
      expectedServiceFields.slice(4).join("|")}\nextra`,
  ), ["output_shape"]);
  assert.deepEqual(classifyC3RTNativeServiceAssertions(null), ["output_shape"]);
  assert.doesNotMatch(runtimeSource, /serviceMismatchCodes[\s\S]*\$\{service\}/u);
  assert.equal(isNativeContainerVerifiedAbsent({
    status: 1, stdout: "", stderr: "Error: No such container: native-cycle",
  }), true);
  assert.equal(isNativeContainerVerifiedAbsent({
    status: 1, stdout: "", stderr: "Cannot connect to the Docker daemon",
  }), false);
  assert.equal(isNativeContainerVerifiedAbsent({ status: 0, stdout: "[]", stderr: "" }), false);
  const boundedDiagnostic = boundedNativePostgresDiagnostic({
    stderr: "NOTICE: ignored\u0000\n" +
      "ERROR: cannot change name of input parameter p_user_id " +
      "11111111-1111-4111-8111-111111111111 owner@example.invalid " +
      "https://example.invalid/private\n" +
      "HINT: synthetic-private-answer authorization: Bearer abcdefghijklmnop " +
      "password=private-password secret=private-secret\n" +
      "DETAIL: raw row body\nCONTEXT: select raw_private_body\n" +
      `ERROR: ${"x".repeat(5_000)}`,
    stdout: "",
  });
  assert.match(boundedDiagnostic, /cannot change name of input parameter p_user_id/u);
  assert.ok(Buffer.byteLength(boundedDiagnostic, "utf8") <= 2_048);
  assert.doesNotMatch(boundedDiagnostic,
    /NOTICE|DETAIL|CONTEXT|raw row|raw_private|example\.invalid|11111111|abcdefghijklmnop|private-password|private-secret|synthetic-private/u);
  assert.match(boundedDiagnostic,
    /\[uuid\]|\[REDACTED_EMAIL\]|\[url\]|\[private\]|\[REDACTED\]|password=\[REDACTED\]|secret=\[REDACTED\]/u);
});

test("dedicated Theory cycles bind identity relations before legacy Practice receipt replay", () => {
  const cycleSource = runtimeSource.slice(
    runtimeSource.indexOf("async function runTheoryDedicatedCycle"),
    runtimeSource.indexOf("export function createTheoryRuntimeArtifact"),
  );
  const baseApplied = cycleSource.indexOf("applyExactMigrationHistory(cycleRoot, databaseContainer)");
  const identitiesCreated = cycleSource.indexOf("await createTheoryIdentity");
  const identityRelationsSeeded = cycleSource.indexOf(
    "seedTheoryIdentityRelations(databaseContainer, identities)",
  );
  const legacyReceiptSeeded = cycleSource.indexOf(
    "const practiceWrapperArgumentNamesPreserved = applyTheoryMigrationHistory(",
  );
  assert.ok(baseApplied >= 0 && baseApplied < identitiesCreated);
  assert.ok(identitiesCreated < identityRelationsSeeded);
  assert.ok(identityRelationsSeeded < legacyReceiptSeeded);
  const identityFixtureSource = runtimeSource.slice(
    runtimeSource.indexOf("function seedTheoryIdentityRelations"),
    runtimeSource.indexOf("async function verifyDirectBoundaries"),
  );
  assert.match(identityFixtureSource, /insert into public\.profiles/u);
  assert.match(identityFixtureSource, /select count\(\*\) from auth\.users/u);
  assert.doesNotMatch(identityFixtureSource, /public\.users/u);
  assert.match(runtimeSource,
    /seedLegacyPracticePlannerReceipts\(container, identity\)[\s\S]*userId: identity\.userId\.toLowerCase\(\)/u);
  assert.match(runtimeSource,
    /practiceWrapperArgumentsBefore[\s\S]*practiceWrapperArgumentsAfter[\s\S]*practiceWrapperArgumentsAfter !== practiceWrapperArgumentsBefore/u);
  const requiredPracticeWrapperSignatures = [
    /c3r_p_find_record_v1\(\s*p_user_id uuid,\s*p_source_id text,\s*p_problem_id text,\s*p_revision_id text,\s*p_item_id text,\s*p_artifact_id text\s*\)/u,
    /c3r_p_restore_record_v1\(p_user_id uuid, p_record_id uuid\)/u,
    /c3r_p_load_dashboard_v1\(\s*p_user_id uuid,\s*p_as_of timestamptz\s*\)/u,
    /c3r_p_export_learner_data_v1\(p_user_id uuid\)/u,
    /c3r_p_delete_learner_data_v1\(p_user_id uuid\)/u,
  ];
  for (const signature of requiredPracticeWrapperSignatures) {
    assert.match(integrationSql, signature);
  }
  const exactPracticeWrapperCatalog = [
    ["public.c3r_p_apply_learning_command_v1(uuid,uuid,bigint,text,jsonb)",
      "p_user_id,p_command_id,p_expected_version,p_action,p_payload"],
    ["public.c3r_p_create_plan_v1(uuid,uuid,uuid,public.c3r_p_plan_kind,integer,timestamptz,jsonb)",
      "p_user_id,p_command_id,p_plan_id,p_plan_kind,p_available_minutes,p_as_of,p_blocks"],
    ["public.c3r_p_decide_plan_v1(uuid,uuid,uuid,bigint,text,timestamptz,jsonb)",
      "p_user_id,p_command_id,p_plan_id,p_expected_version,p_decision,p_as_of,p_blocks"],
    ["public.c3r_p_delete_learner_data_v1(uuid)", "p_user_id"],
    ["public.c3r_p_eligibility_digest_v1(uuid,timestamptz)", "p_user_id,p_as_of"],
    ["public.c3r_p_export_learner_data_v1(uuid)", "p_user_id"],
    ["public.c3r_p_find_record_v1(uuid,text,text,text,text,text)",
      "p_user_id,p_source_id,p_problem_id,p_revision_id,p_item_id,p_artifact_id"],
    ["public.c3r_p_load_dashboard_v1(uuid,timestamptz)", "p_user_id,p_as_of"],
    ["public.c3r_p_restore_record_v1(uuid,uuid)", "p_user_id,p_record_id"],
    ["public.c3r_p_review_state_digest_v1(uuid)", "p_user_id"],
  ];
  assert.equal((runtimeSource.match(/signature:\s*"public\.c3r_p_/gu) ?? []).length,
    exactPracticeWrapperCatalog.length);
  for (const [signature, names] of exactPracticeWrapperCatalog) {
    assert.ok(runtimeSource.includes(signature));
    assert.ok(runtimeSource.includes(`"${names}"`));
  }
  assert.doesNotMatch(integrationSql,
    /create or replace function public\.c3r_p_(?:find_record|restore_record|load_dashboard|export_learner_data|delete_learner_data)_v1\((?:uuid|uuid,)/u);
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
    practiceWrapperArgumentNamesPreserved: true,
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

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

import {
  S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_CONTRACT,
  S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION,
  assertS224MetadataOnly,
  buildS224ThreeSubjectLearnerRuntimeAcceptanceReport,
  validateS224ThreeSubjectLearnerRuntimeAcceptance,
} from "../lib/review-os/s224-three-subject-learner-runtime-acceptance.ts";
import { SAFE_DERIVED_SIGNAL_KEYS, assertNoRawUserDataInDerived } from "../lib/review-os/data-boundary.ts";
import { TODAY_PLAN_MAX_PRIMARY_TASKS } from "../lib/review-os/today-plan-engine.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

function flowBySubject(report, subject) {
  const flow = report.subjectFlows.find((entry) => entry.subject === subject);
  assert.ok(flow, `Missing ${subject} S224 flow`);
  return flow;
}

function unsafeObjectWithKey(left, right) {
  return Object.fromEntries([[`${left}${right}`, "blocked"]]);
}

function repositoryPathsIncludingUntracked() {
  return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" })
    .split(/\r?\n/)
    .filter(Boolean)
    .map((path) => path.replace(/\\/g, "/"));
}

function blockedAuthorityCopyPattern() {
  const phrases = [
    ["official", "grading"],
    ["official", "model", "answer"],
    ["confirmed", "score"],
    ["pass", "probability"],
    ["pass", "guarantee"],
    ["guaranteed", "score"],
    ["pass/fail", "prediction"],
  ];
  const alternatives = phrases.map((words) => words.map((word) => word.replace("/", "\\/")).join("\\s+"));
  return new RegExp(`\\b(?:${alternatives.join("|")})\\b`, "i");
}

test("S224 three-subject learner runtime acceptance contract and report exist", () => {
  const contract = S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_CONTRACT;
  const report = buildS224ThreeSubjectLearnerRuntimeAcceptanceReport();
  const validation = validateS224ThreeSubjectLearnerRuntimeAcceptance(contract, report);

  assert.equal(contract.version, S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION);
  assert.equal(report.version, S224_THREE_SUBJECT_LEARNER_RUNTIME_ACCEPTANCE_VERSION);
  assert.equal(contract.implementationMode, "learner_runtime_acceptance_report");
  assert.deepEqual(contract.subjectScope, ["practice", "theory", "law"]);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(report.valid, true);
  assert.equal(report.acceptanceStatus, "accepted_for_s225_final_launch_gate");
  assert.equal(report.publicPaidLaunchReadinessStatus, "blocked_until_s225");
  assert.equal(report.safeUse, "s224_learner_runtime_acceptance_for_s225_only");
  assert.equal(report.metadataOnly, true);
  assert.equal(report.containsRawContent, false);
  assert.equal(report.totals.subjectCount, 3);
  assert.equal(report.totals.acceptedSubjectCount, 3);
  assert.equal(report.totals.answerCaptureReadySubjectCount, 3);
  assert.equal(report.totals.editableConfirmationSubjectCount, 3);
  assert.equal(report.totals.subjectSpecificGapActionSubjectCount, 3);
  assert.equal(report.totals.retrievalCheckSubjectCount, 3);
  assert.equal(report.totals.continuationSubjectCount, 3);
  assert.equal(report.totals.todayPlanMaxPrimaryTasks, 3);
  assert.equal(report.totals.publicPaidLaunchAllowedSubjectCount, 0);
  assert.equal(Object.values(report.runtimeBoundary).every((value) => value === false), true);
  assert.equal(report.dataBoundary.metadataOnly, true);
  assert.equal(report.authorityBoundary.learningSupportOnly, true);
  assert.equal(report.authorityBoundary.authorityClaimAllowed, false);
  assertNoRawUserDataInDerived(report);
});

test("S224 practice, theory, and law flows expose subject-specific runtime signals", () => {
  const report = buildS224ThreeSubjectLearnerRuntimeAcceptanceReport();
  const practice = flowBySubject(report, "practice");
  const theory = flowBySubject(report, "theory");
  const law = flowBySubject(report, "law");

  assert.equal(practice.answerCapture.sourceType, "image");
  assert.equal(practice.answerCapture.inputKind, "image");
  assert.equal(practice.evidenceReview.reviewEngineId, "s213_practice");
  assert.equal(practice.evidenceReview.nextActionType, "recalculate");
  assert.equal(practice.retrievalCheck.retrievalPattern, "calculation_process_check");
  assert.equal(practice.continuation.taskHookKind, "recalculation");
  assert.equal(practice.continuation.rewriteOrCalculationContinuation, "recalculation");
  assert.equal(practice.continuation.calculator.model, "casio_fx_9860giii");
  assert.equal(practice.continuation.calculator.resetSafeHandKeyedRoutineOnly, true);
  assert.equal(practice.continuation.calculator.storedProgramDependency, false);

  assert.equal(theory.answerCapture.sourceType, "text");
  assert.equal(theory.answerCapture.inputKind, "text");
  assert.equal(theory.evidenceReview.reviewEngineId, "s212_theory");
  assert.equal(theory.evidenceReview.nextActionType, "rewrite");
  assert.equal(theory.retrievalCheck.retrievalPattern, "outline_recall");
  assert.equal(theory.continuation.taskHookKind, "rewrite");
  assert.equal(theory.continuation.calculator, null);

  assert.equal(law.answerCapture.sourceType, "pdf");
  assert.equal(law.answerCapture.inputKind, "pdf");
  assert.equal(law.evidenceReview.reviewEngineId, "s211_law");
  assert.equal(law.evidenceReview.nextActionType, "rewrite");
  assert.equal(law.retrievalCheck.retrievalPattern, "issue_recall");
  assert.equal(law.continuation.taskHookKind, "rewrite");
  assert.equal(law.continuation.calculator, null);

  for (const flow of report.subjectFlows) {
    assert.equal(flow.answerCapture.captureStatus, "prepared");
    assert.equal(flow.answerCapture.answerReviewRouteId, "/answer-review");
    assert.equal(flow.answerCapture.captureContractVersion, "s204.learner_answer_submission.v1");
    assert.equal(flow.answerCapture.editableBeforeSave, true);
    assert.equal(flow.answerCapture.trustCopyStatus, "s204_trust_copy_present");
    assert.equal(flow.evidenceReview.reviewStatusPath, "ready_or_fail_closed_by_source_gate");
    assert.equal(flow.evidenceReview.oneBiggestGapPresent, true);
    assert.equal(flow.evidenceReview.oneNextActionPresent, true);
    assert.equal(flow.evidenceReview.resultStartsWithGapAndAction, true);
    assert.equal(flow.evidenceReview.scoreLikeSummarySecondary, true);
    assert.equal(flow.evidenceReview.terminalLearnerAction, "rewrite_or_recalculation_or_scheduled_review");
    assert.equal(flow.retrievalCheck.retrievalSeconds, 10);
    assert.equal(flow.retrievalCheck.productionBeforeExplanation, true);
    assert.equal(flow.continuation.retryReviewAllowed, true);
    assert.equal(flow.continuation.reviewQueueCandidatePrepared, true);
    assert.equal(flow.continuation.todayPlanCandidatePrepared, true);
    assert.equal(flow.continuation.notesCandidatePrepared, true);
  }
});

test("S224 preserves Today Plan max-three and Review Queue / Today Plan / Notes continuation", () => {
  const report = buildS224ThreeSubjectLearnerRuntimeAcceptanceReport();

  assert.equal(TODAY_PLAN_MAX_PRIMARY_TASKS, 3);
  assert.equal(report.totals.todayPlanMaxPrimaryTasks, 3);
  assert.ok(report.runtimeEvidence.routeSmokeTargets.includes("/answer-review"));
  assert.ok(report.runtimeEvidence.routeSmokeTargets.includes("/app/capture"));
  assert.ok(report.runtimeEvidence.routeSmokeTargets.includes("/app/today"));
  assert.ok(report.runtimeEvidence.routeSmokeTargets.includes("/app/review"));
  assert.ok(report.runtimeEvidence.routeSmokeTargets.includes("/app/notes"));

  for (const flow of report.subjectFlows) {
    assert.equal(flow.continuation.todayPlanMaxPrimaryTasks, 3);
    assert.equal(flow.continuation.reviewQueueRouteId, "/app/review");
    assert.equal(flow.continuation.todayPlanRouteId, "/app/today");
    assert.equal(flow.continuation.notesRouteId, "/app/notes");
  }

  for (const routeFile of [
    "app/answer-review/page.tsx",
    "app/app/capture/page.tsx",
    "app/app/today/page.tsx",
    "app/app/review/page.tsx",
    "app/app/notes/page.tsx",
    "app/app/calculator/page.tsx",
  ]) {
    assert.equal(existsSync(routeFile), true, `${routeFile} should exist for S224 route evidence target`);
  }
});

test("S224 runtime evidence is documented honestly when no live browser session is embedded", () => {
  const report = buildS224ThreeSubjectLearnerRuntimeAcceptanceReport();

  assert.equal(report.runtimeEvidence.evidenceLevel, "source_level_contract_and_static_route_audit");
  assert.equal(report.runtimeEvidence.sourceLevelTestFile, "tests/s224-three-subject-learner-runtime-acceptance.test.mjs");
  assert.equal(report.runtimeEvidence.liveBrowserSessionRun, false);
  assert.equal(report.runtimeEvidence.productionBuildRun, false);
  assert.equal(report.runtimeEvidence.focusedRouteSmokeRun, false);
  assert.equal(report.runtimeEvidence.runtimeEvidenceDocumentedHonestly, true);
  assert.match(report.runtimeEvidence.limitedRuntimeEvidenceReason, /No live browser session/);

  const withRuntime = buildS224ThreeSubjectLearnerRuntimeAcceptanceReport({
    runtimeEvidence: {
      evidenceLevel: "production_build_and_route_smoke",
      liveBrowserSessionRun: true,
      productionBuildRun: true,
      focusedRouteSmokeRun: true,
      limitedRuntimeEvidenceReason: null,
    },
  });
  assert.equal(validateS224ThreeSubjectLearnerRuntimeAcceptance(undefined, withRuntime).valid, true);
  assert.equal(withRuntime.runtimeEvidence.liveBrowserSessionRun, true);
  assert.equal(withRuntime.runtimeEvidence.productionBuildRun, true);
});

test("S224 metadata rejects raw learner, OCR, problem, answer, source, provider, payment, and authority fields", () => {
  const unsafeValues = [
    unsafeObjectWithKey("answer", "Text"),
    unsafeObjectWithKey("rawAnswer", "Text"),
    unsafeObjectWithKey("userAnswer", "Text"),
    unsafeObjectWithKey("ocr", "Text"),
    unsafeObjectWithKey("rawOcr", "Text"),
    unsafeObjectWithKey("problem", "Text"),
    unsafeObjectWithKey("question", "Text"),
    unsafeObjectWithKey("reference", "Text"),
    unsafeObjectWithKey("generatedAnswer", "Prose"),
    unsafeObjectWithKey("source", "Excerpt"),
    unsafeObjectWithKey("provider", "Payload"),
    unsafeObjectWithKey("payment", "Secret"),
    unsafeObjectWithKey("billing", "Secret"),
    unsafeObjectWithKey("pdf", "Bytes"),
    unsafeObjectWithKey("image", "Bytes"),
  ];

  for (const unsafe of unsafeValues) {
    assert.throws(
      () => assertS224MetadataOnly(unsafe),
      /raw-user-data-in-derived-metadata|s224-forbidden-raw-content-field/,
    );
  }

  assert.throws(
    () => assertS224MetadataOnly({ officialGradingClaimAllowed: true }),
    /s224-forbidden-authority-claim-field/,
  );
  assert.throws(
    () => assertS224MetadataOnly({ generatedBy: "official grading shortcut" }),
    /s224-forbidden-authority-copy/,
  );
  assert.doesNotThrow(() => assertS224MetadataOnly(buildS224ThreeSubjectLearnerRuntimeAcceptanceReport()));
});

test("S224 learner, instructor, and academy separation remains closed", async () => {
  const learnerPaths = [
    "app/app/page.tsx",
    "app/app/capture/page.tsx",
    "app/app/today/page.tsx",
    "app/app/review/page.tsx",
    "app/app/notes/page.tsx",
    "app/answer-review/answer-review-client.tsx",
    "components/review-os/capture-form.tsx",
  ];
  for (const path of learnerPaths) {
    const source = await readFile(path, "utf8");
    assert.equal(source.includes("/academy"), false, `${path} must not link academy routes`);
    assert.equal(source.includes("S222_ACADEMY"), false, `${path} must not expose academy symbols`);
  }

  const report = buildS224ThreeSubjectLearnerRuntimeAcceptanceReport();
  for (const flow of report.subjectFlows) {
    assert.equal(flow.learnerInstructorBoundary.learnerRouteOnly, true);
    assert.equal(flow.learnerInstructorBoundary.instructorRouteSeparated, true);
    assert.equal(flow.learnerInstructorBoundary.academyTenantDataAccessed, false);
    assert.equal(flow.dataBoundary.academyTenantDataAccessed, false);
  }
});

test("S224 files do not add commercial, provider, OCR, route, auth, migration, workflow, archive, or corpus activation", async () => {
  const source = await readFile("lib/review-os/s224-three-subject-learner-runtime-acceptance.ts", "utf8");

  assert.doesNotMatch(source, /fetch\(|\/api\/|new OpenAI|GoogleGenerativeAI|createClient|from\(["']@supabase|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE/i);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  for (const token of [
    "learnerRouteChanged",
    "academyRuntimeRouteChanged",
    "instructorRouteChanged",
    "authChanged",
    "checkoutAdded",
    "paymentWebhookAdded",
    "billingProviderCalled",
    "productionBillingActivated",
    "entitlementEnforcementActivated",
    "productionPricingUiAdded",
    "providerRuntimeExpanded",
    "ocrRuntimeExpanded",
    "publicArchiveUiAdded",
    "rawCorpusExpansionAdded",
    "supabaseMigrationAdded",
    "workflowChanged",
  ]) {
    assert.match(source, new RegExp(`${token}:\\s*false`), `${token} must remain false`);
  }
});

test("S224 docs, source, and added metadata stay metadata-only without blocked authority copy", async () => {
  const paths = [
    "lib/review-os/s224-three-subject-learner-runtime-acceptance.ts",
    "docs/s224-three-subject-learner-runtime-acceptance.md",
    "tests/s224-three-subject-learner-runtime-acceptance.test.mjs",
  ];
  const rawFieldAssignmentPattern =
    /["'](?:answerText|rawAnswerText|userAnswerText|ocrText|rawOcrText|problemText|questionText|referenceText|sourceExcerpt|providerPayload|paymentSecret|billingSecret|pdfBytes|imageBytes)["']\s*[:=]/i;
  const blockedClaimPattern = blockedAuthorityCopyPattern();

  for (const path of paths) {
    const text = await readFile(path, "utf8");
    assert.doesNotMatch(text, rawFieldAssignmentPattern, `${path} must not assign raw fields`);
    if (!path.endsWith(".test.mjs")) {
      assert.doesNotMatch(text, blockedClaimPattern, `${path} must not include blocked learner-authority copy`);
    }
  }

  const tracked = repositoryPathsIncludingUntracked();
  assert.equal(
    tracked.some((path) => /(?:^|\/)(?:reference_corpus|data)\//.test(path) && /s224/i.test(path)),
    false,
    "S224 must not add global reference corpus or data fixtures",
  );
});

test("S224 safe keys, docs, runner, roadmap, and Agent Factory example target are wired", async () => {
  const docs = await readFile("docs/s224-three-subject-learner-runtime-acceptance.md", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const agentFactoryDocs = await readFile("docs/agent-factory-github-actions-button.md", "utf8");
  const agentFactoryButtonTest = await readFile("tests/agent-factory-github-actions-button.test.mjs", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s224 = plan.analyses.find((item) => item.itemId === "S224");
  const s225 = plan.analyses.find((item) => item.itemId === "S225");

  for (const token of [
    "S224",
    "Three-Subject Learner Runtime Acceptance",
    "answer/capture",
    "editable confirmation",
    "ten-second retrieval-check",
    "Review Queue",
    "Today Plan",
    "Notes",
    "metadata-only",
  ]) {
    assert.match(docs, new RegExp(token, "i"));
  }

  for (const key of [
    "learnerRuntimeAcceptanceVersion",
    "learnerRuntimeAcceptanceStatus",
    "learnerRuntimeSubject",
    "answerCaptureStatus",
    "editableConfirmationStatus",
    "trustCopyStatus",
    "retrievalCheckStatus",
    "retrievalPattern",
    "runtimeEvidenceLevel",
    "runtimeEvidenceDocumented",
    "routeSmokeTargetCount",
    "publicPaidLaunchReadinessStatus",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S224 safe key ${key}`);
  }

  assert.match(runner, /tests\/s224-three-subject-learner-runtime-acceptance\.test\.mjs/);
  assert.match(agentFactoryDocs, /roadmap item id such as `S225`/);
  assert.match(agentFactoryButtonTest, /--target[\s\S]{0,80}S225/);
  assert.equal(s224?.statusCategory, "completed");
  assert.equal(s225?.readinessStatus, "ready");
  assert.deepEqual(plan.selectedItemIds, ["S225"]);
});

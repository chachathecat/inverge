import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_CONTRACT,
  S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION,
  assertS223MetadataOnly,
  buildS223ThreeSubjectCorpusAcceptanceReport,
  validateS223ThreeSubjectCorpusAcceptance,
} from "../lib/review-os/s223-three-subject-corpus-reference-quality-acceptance.ts";
import { assertNoRawUserDataInDerived, SAFE_DERIVED_SIGNAL_KEYS } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

function unsafeObjectWithKey(left, right) {
  return Object.fromEntries([[`${left}${right}`, "blocked"]]);
}

function gateBySubject(report, subject) {
  const gate = report.subjectGates.find((entry) => entry.subject === subject);
  assert.ok(gate, `Missing ${subject} S223 gate`);
  return gate;
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

test("S223 three-subject source quality acceptance contract exists and stays source-level only", () => {
  const contract = S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_CONTRACT;
  const report = buildS223ThreeSubjectCorpusAcceptanceReport();
  const validation = validateS223ThreeSubjectCorpusAcceptance(contract, report);

  assert.equal(contract.version, S223_THREE_SUBJECT_CORPUS_ACCEPTANCE_VERSION);
  assert.equal(contract.implementationMode, "source_acceptance_contract_only");
  assert.deepEqual(contract.subjectScope, ["practice", "theory", "law"]);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(report.valid, true);
  assert.equal(report.sourceLevelAcceptanceStatus, "accepted_source_contract_only");
  assert.equal(report.publicLaunchReadinessStatus, "blocked_until_s224_s225");
  assert.equal(report.safeUse, "s223_three_subject_source_quality_acceptance_only");
  assert.equal(report.metadataOnly, true);
  assert.equal(report.containsRawContent, false);
  assert.equal(report.totals.subjectCount, 3);
  assert.equal(report.totals.subjectsWithSourceProvenanceMetadata, 3);
  assert.equal(report.totals.subjectsWithReferencePackageContract, 3);
  assert.equal(report.totals.subjectsWithCriticConsensusReleaseGate, 3);
  assert.equal(report.totals.sourceSkeletonCount, 16);
  assert.equal(report.totals.publicLaunchAllowedSubjectCount, 0);
  assert.equal(Object.values(report.runtimeBoundary).every((value) => value === false), true);
  assert.equal(report.dataBoundary.metadataOnly, true);
  assert.equal(report.authorityBoundary.learningReferenceOnly, true);
  assert.equal(report.authorityBoundary.authorityClaimAllowed, false);
  assertNoRawUserDataInDerived(report);
});

test("S223 practice, theory, and law gates expose required subject-specific acceptance metadata", () => {
  const report = buildS223ThreeSubjectCorpusAcceptanceReport();
  const practice = gateBySubject(report, "practice");
  const theory = gateBySubject(report, "theory");
  const law = gateBySubject(report, "law");

  assert.equal(practice.practiceCalculationGate.calculationInputMetadataStatus, "present");
  assert.equal(practice.practiceCalculationGate.supportedCalculationTypeMetadataStatus, "present");
  assert.equal(practice.practiceCalculationGate.unitCheckStatus, "present");
  assert.equal(practice.practiceCalculationGate.roundingCheckStatus, "present");
  assert.equal(practice.practiceCalculationGate.checksumValidationMetadataStatus, "represented");
  assert.equal(practice.practiceCalculationGate.calculatorModel, "casio_fx_9860giii");
  assert.equal(practice.practiceCalculationGate.resetSafeHandKeyedRoutineRequired, true);
  assert.equal(practice.practiceCalculationGate.storedProgramDependencyAllowed, false);
  assert.equal(practice.practiceCalculationGate.calculationMaterialStored, false);
  assert.equal(practice.practiceCalculationGate.supportedMetadataUnitCount, 1);
  assert.equal(practice.practiceCalculationGate.releaseAllowedUnitCount, 0);

  assert.equal(theory.theoryConceptGate.conceptNodeReferenceStatus, "present");
  assert.equal(theory.theoryConceptGate.definitionCoverageStatus, "represented");
  assert.equal(theory.theoryConceptGate.comparisonCoverageStatus, "represented");
  assert.equal(theory.theoryConceptGate.applicationCoverageStatus, "represented");
  assert.equal(theory.theoryConceptGate.generatedAnswerProseTreatedAsAuthority, false);
  assert.equal(theory.theoryConceptGate.conceptCount, 10);
  assert.equal(theory.openBlockingSourceOrConceptCount, 19);

  assert.equal(law.lawSourceVersionGate.legalSourceVersionStatus, "present");
  assert.equal(law.lawSourceVersionGate.examDateLawStatus, "represented");
  assert.equal(law.lawSourceVersionGate.currentLawDistinctionStatus, "represented");
  assert.equal(law.lawSourceVersionGate.legalGroundingEvidenceStatus, "represented");
  assert.equal(law.lawSourceVersionGate.sourceExcerptStored, false);
  assert.equal(law.lawSourceVersionGate.lawSourceCount, 10);
  assert.equal(law.openBlockingSourceOrConceptCount, 10);

  for (const gate of report.subjectGates) {
    assert.equal(gate.referencePackageStatus, "represented");
    assert.equal(gate.issueEvidenceReviewDraftStatus, "represented");
    assert.equal(gate.criticConsensusReleaseGateStatus, "represented");
    assert.equal(gate.qualityAcceptanceReadinessStatus, "source_contract_ready");
    assert.equal(gate.learnerRuntimeAcceptanceStatus, "not_in_s223");
    assert.equal(gate.publicLaunchReadinessStatus, "blocked_until_s224_s225");
    assert.equal(gate.metadataOnly, true);
    assert.equal(gate.containsRawContent, false);
  }
});

test("S223 metadata rejects raw learner, OCR, problem, answer, source, provider, payment, and authority fields", () => {
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
      () => assertS223MetadataOnly(unsafe),
      /raw-user-data-in-derived-metadata|s223-forbidden-raw-content-field/,
    );
  }

  assert.throws(
    () => assertS223MetadataOnly({ authorityClaimAllowed: true }),
    /s223-forbidden-authority-claim-field/,
  );
  assert.throws(
    () => assertS223MetadataOnly({ generatedBy: "official grading shortcut" }),
    /s223-forbidden-authority-copy/,
  );
  assert.doesNotThrow(() => assertS223MetadataOnly(buildS223ThreeSubjectCorpusAcceptanceReport()));
});

test("S223 files do not add checkout, webhook, provider, OCR, route, auth, migration, workflow, archive, or academy runtime activation", async () => {
  const source = await readFile("lib/review-os/s223-three-subject-corpus-reference-quality-acceptance.ts", "utf8");

  assert.doesNotMatch(source, /fetch\(|\/api\/|new OpenAI|GoogleGenerativeAI|createClient|from\(["']@supabase|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE/i);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  for (const token of [
    "learnerRuntimeAcceptanceFlowChanged",
    "academyRuntimeRouteChanged",
    "publicArchiveUiAdded",
    "checkoutAdded",
    "paymentWebhookAdded",
    "billingProviderCalled",
    "productionBillingActivated",
    "entitlementEnforcementActivated",
    "productionPricingUiAdded",
    "authChanged",
    "providerRuntimeExpanded",
    "ocrRuntimeExpanded",
    "supabaseMigrationAdded",
    "workflowChanged",
  ]) {
    assert.match(source, new RegExp(`${token}:\\s*false`), `${token} must remain false`);
  }
});

test("S223 docs, source, and added metadata stay free of raw-content assignments and learner-authority copy", async () => {
  const paths = [
    "lib/review-os/s223-three-subject-corpus-reference-quality-acceptance.ts",
    "docs/s223-three-subject-corpus-reference-quality-acceptance.md",
    "tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs",
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
    tracked.some((path) => /(?:^|\/)(?:reference_corpus|data)\//.test(path) && /s223/i.test(path)),
    false,
    "S223 must not add global reference corpus or data fixtures",
  );
});

test("S223 safe keys, docs, runner, roadmap, and Agent Factory example target are wired", async () => {
  const docs = await readFile("docs/s223-three-subject-corpus-reference-quality-acceptance.md", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const agentFactoryDocs = await readFile("docs/agent-factory-github-actions-button.md", "utf8");
  const agentFactoryButtonTest = await readFile("tests/agent-factory-github-actions-button.test.mjs", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s223 = plan.analyses.find((item) => item.itemId === "S223");
  const s224 = plan.analyses.find((item) => item.itemId === "S224");

  for (const token of [
    "S223",
    "Three-Subject Corpus Reference Quality Acceptance",
    "source-level acceptance contract",
    "source-provenance metadata",
    "practice",
    "theory",
    "law",
    "critic",
    "consensus",
    "release-gate",
    "metadata-only",
  ]) {
    assert.match(docs, new RegExp(token, "i"));
  }

  for (const key of [
    "corpusAcceptanceVersion",
    "corpusAcceptanceStatus",
    "qualityAcceptanceStatus",
    "qualityGateStatus",
    "sourceProvenanceStatus",
    "subjectCoverageStatus",
    "referencePackageStatus",
    "criticConsensusStatus",
    "releaseGateStatus",
    "lawVersionStatus",
    "examDateLawStatus",
    "currentLawDistinctionStatus",
    "theoryConceptStatus",
    "definitionCoverageStatus",
    "comparisonCoverageStatus",
    "applicationCoverageStatus",
    "practiceCalculationType",
    "unitCheckStatus",
    "roundingCheckStatus",
    "checksumValidationStatus",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S223 safe key ${key}`);
  }

  assert.match(runner, /tests\/s223-three-subject-corpus-reference-quality-acceptance\.test\.mjs/);
  assert.match(agentFactoryDocs, /roadmap item id such as `S224`/);
  assert.match(agentFactoryButtonTest, /--target[\s\S]{0,80}S224/);
  assert.equal(s223?.statusCategory, "completed");
  assert.equal(s224?.readinessStatus, "ready");
  assert.deepEqual(plan.selectedItemIds, ["S224"]);
});

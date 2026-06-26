import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildSecondRoundReferenceAnswerPackageReport,
  loadSecondRoundReferenceAnswerPackageRegistry,
  loadSecondRoundReferenceAnswerPackageReport,
} from "../lib/review-os/second-round-reference-answer-package-registry.ts";

const defaultPaths = {
  source: "reference_corpus/official_materials/appraiser/second_round_source_registry.json",
  rights: "reference_corpus/official_materials/appraiser/second_round_rights_registry.json",
  canonical: "reference_corpus/question_archive/second/appraiser_second_round_canonical_questions.json",
  registry: "reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_packages.json",
  report: "reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_package_report.json",
  syllabus: "reference_corpus/curriculum/appraiser/official_syllabus.json",
  docs: "docs/second-round-reference-answer-package-schema.md",
};

const requiredSectionKinds = [
  "requirement_map",
  "issue_map",
  "scoring_blueprint",
  "ten_minute_skeleton",
  "exam_time_reference",
  "expanded_study_reference",
  "alternative_acceptable_points",
  "common_failure_modes",
];
const practiceCheckKinds = [
  "assumptions",
  "formula",
  "extracted_values",
  "independent_recalculation",
  "unit_check",
  "rounding_check",
  "hand_keyed_sequence",
  "expected_display",
  "answer_sheet_transfer",
  "unsupported_type",
];
const theoryCheckKinds = [
  "definition",
  "logic_chain",
  "comparison",
  "application",
  "term_consistency",
  "alternative_view",
  "source_coverage",
  "unsupported_claim",
];
const lawCheckKinds = [
  "effective_date",
  "rule_source",
  "article_citation",
  "issue_identification",
  "application",
  "case_or_administrative_anchor",
  "conclusion",
  "unsupported_legal_claim",
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function sourceForSubject(sourceRegistry, subject) {
  const source = sourceRegistry.sourceArtifacts.find((entry) => entry.subject === subject);
  assert.ok(source, `Missing source fixture basis for ${subject}`);
  return source;
}

function subjectRecordFor(syllabus, subject) {
  const subjectRecord = syllabus.subjectRecords.find((entry) => entry.subjectKey === subject);
  assert.ok(subjectRecord, `Missing S201 subject record for ${subject}`);
  return subjectRecord;
}

function syntheticSource(sourceRegistry, subject = "practice") {
  const basis = sourceForSubject(sourceRegistry, subject);
  return {
    sourceId: `synthetic-s207-${subject}-source`,
    officialSourceId: basis.officialSourceId,
    sourceAgency: basis.sourceAgency,
    officialUrl: basis.officialUrl,
    examYear: 2090,
    examRound: 101,
    subject,
    paperOrSession: basis.paperOrSession,
    artifactKind: "pdf",
    retrievedAt: "2026-06-26",
    fileHashSha256: "0a4894f0a03062f48dd3e007f3dfa2db762c8146305e440662ef6413c7e994d3",
    hashStatus: "verified",
    pageCount: 1,
    examDate: "2090-07-01",
    lawEffectiveDate: subject === "law" ? "2090-07-01" : undefined,
    sourceStatus: "verified",
    extractionStatus: "extracted_private",
    lastOfficialVerifiedAt: "2026-06-26",
  };
}

function syntheticRights(sourceId) {
  return {
    sourceId,
    rightsStatus: "redistribution_allowed",
    displayMode: "full_text",
    decisionStatus: "synthetic_fixture_rights_allowed",
    evidenceSourceId: "qnet_appraiser_past_questions",
    evidenceReference: "Synthetic S207 fixture only; not a real redistribution decision.",
    verifiedBy: "s207-synthetic-fixture",
    verifiedAt: "2026-06-26",
    operationalNote: "Synthetic fixture used to exercise S207 package release rules.",
    learnerFacingPublicationAllowed: true,
  };
}

function syntheticQuestion({ subjectRecord, subject = "practice", sourceId }) {
  return {
    id: `synthetic-s207-${subject}-q1`,
    mode: "canonical_question",
    examYear: 2090,
    examRound: 101,
    subject,
    officialSubjectId: subjectRecord.id,
    officialSubjectLabelKo: subjectRecord.officialSubjectLabelKo,
    questionNo: 1,
    subQuestions: [
      {
        id: `synthetic-s207-${subject}-q1-a`,
        label: "1-A",
        points: 25,
        requirement: {
          origin: "synthetic_fixture",
          descriptor: "Synthetic metadata-only requirement A",
          textStored: false,
          verificationStatus: "synthetic_fixture",
        },
      },
      {
        id: `synthetic-s207-${subject}-q1-b`,
        label: "1-B",
        points: 25,
        requirement: {
          origin: "synthetic_fixture",
          descriptor: "Synthetic metadata-only requirement B",
          textStored: false,
          verificationStatus: "synthetic_fixture",
        },
      },
    ],
    totalPoints: 50,
    source: {
      sourceId,
      rightsStatus: "redistribution_allowed",
      displayMode: "full_text",
      extractionStatus: "extracted_private",
      metadataEligibleForS203: true,
      problemTextEligibleForS203: true,
      learnerPublicationEligible: true,
    },
    problemText: {
      status: "synthetic_fixture",
      textStored: false,
      officialQuestionBodyStored: false,
      extractionStatus: "extracted_private",
      verificationStatus: "synthetic_fixture",
    },
    canonicalVerificationStatus: "synthetic_fixture",
    referenceAnswerVerificationStatus: "not_started",
    examDate: "2090-07-01",
    lawEffectiveDate: subject === "law" ? "2090-07-01" : undefined,
    topicTags: [`synthetic_${subject}_topic`],
    conceptNodeIds: [`synthetic_${subject}_concept`],
    issueCandidates: [
      {
        candidateId: `synthetic-${subject}-issue-candidate`,
        kind: subject === "law" ? "law_issue" : subject === "theory" ? "theory_concept" : "practice_assumption",
        source: "synthetic_fixture",
        confidence: "medium",
        validatorRequired: true,
      },
    ],
    formulaCandidates: subject === "practice"
      ? [
          {
            formulaId: "synthetic-practice-formula",
            kind: "valuation_formula",
            source: "synthetic_fixture",
            unitCheckRequired: true,
            roundingCheckRequired: true,
          },
        ]
      : [],
    calculationCandidates: subject === "practice"
      ? [
          {
            candidateId: "synthetic-practice-calculation",
            kind: "deterministic_recalculation",
            formulaId: "synthetic-practice-formula",
            source: "synthetic_fixture",
            independentRecalculationRequired: true,
          },
        ]
      : [],
    tableAssets: [],
    giiiRoutine: subject === "practice"
      ? {
          calculatorModel: "casio_fx_9860giii",
          resetSafeHandKeyedRoutineRequired: true,
          storedProgramDependencyAllowed: false,
          routineStatus: "candidate_metadata_only",
          formulaCandidateIds: ["synthetic-practice-formula"],
        }
      : {
          calculatorModel: "casio_fx_9860giii",
          resetSafeHandKeyedRoutineRequired: true,
          storedProgramDependencyAllowed: false,
          routineStatus: "not_applicable",
          formulaCandidateIds: [],
        },
    evidenceReview: {
      eligible: true,
      status: "synthetic_fixture_only",
      reasonCodes: ["synthetic_fixture_only"],
    },
    deepReviewUnitEstimate: {
      status: "estimated",
      estimatedUnits: 1,
      basis: "synthetic_fixture",
      ledgerRequiredBeforeConsumption: true,
      consumptionImplemented: false,
    },
    learnerPublication: {
      allowed: true,
      reasonCodes: ["synthetic_fixture_only"],
    },
  };
}

function sourceAnchor(anchorId, kind, locatorKind, ref, extra = {}) {
  return {
    anchorId,
    kind,
    ...extra,
    locator: {
      kind: locatorKind,
      ref,
      rawTextStored: false,
      excerptStored: false,
    },
    verificationStatus: "source_verified",
  };
}

function evidenceAnchor(evidenceId, kind, sourceAnchorIds) {
  return {
    evidenceId,
    kind,
    status: "subject_validated",
    sourceAnchorIds,
    supportsRelease: true,
    rawEvidenceStored: false,
  };
}

function packageSections(packageId, sourceAnchorIds, evidenceAnchorIds) {
  return requiredSectionKinds.map((kind) => ({
    sectionId: `${packageId}-${kind}`,
    kind,
    contentStatus: "synthetic_fixture",
    contentStored: false,
    generatedTextStored: false,
    sourceAnchorIds,
    evidenceAnchorIds,
    verificationStatus: "released",
  }));
}

function validationChecks(prefix, kinds, sourceAnchorIds, evidenceAnchorIds) {
  return kinds.map((kind) => ({
    checkId: `${prefix}-${kind}`,
    kind,
    status: "synthetic_fixture",
    releaseBlocking: true,
    sourceAnchorIds,
    evidenceAnchorIds,
  }));
}

function syntheticPackage({ subject = "practice", question, sourceId }) {
  const packageId = `synthetic-s207-${subject}-package`;
  const sourceAnchors = [
    sourceAnchor(`${packageId}-question-anchor`, "official_question_metadata", "question_id", question.id, {
      sourceId,
      questionId: question.id,
    }),
    sourceAnchor(`${packageId}-source-anchor`, "official_source_identity", "source_id", sourceId, {
      sourceId,
      questionId: question.id,
    }),
    sourceAnchor(`${packageId}-subject-anchor`, "official_syllabus_rule", "subject_id", question.officialSubjectId, {
      questionId: question.id,
    }),
    sourceAnchor(`${packageId}-${subject}-validator-anchor`, subject === "practice"
      ? "practice_calculation_rule"
      : subject === "theory"
        ? "theory_concept_source"
        : "law_source_version", subject === "practice" ? "calculation_rule_id" : subject === "theory" ? "concept_node_id" : "law_version_id", `synthetic-${subject}-validator`, {
      questionId: question.id,
    }),
    sourceAnchor(`${packageId}-critic-anchor`, "critic_report", "metadata_id", `${packageId}-critic`, {
      questionId: question.id,
    }),
    sourceAnchor(`${packageId}-consensus-anchor`, "consensus_record", "metadata_id", `${packageId}-consensus`, {
      questionId: question.id,
    }),
  ];
  const sourceAnchorIds = sourceAnchors.map((anchor) => anchor.anchorId);
  const evidenceAnchors = [
    evidenceAnchor(`${packageId}-requirement-evidence`, "requirement_coverage", sourceAnchorIds.slice(0, 3)),
    evidenceAnchor(`${packageId}-rubric-evidence`, "rubric_alignment", sourceAnchorIds.slice(0, 3)),
    evidenceAnchor(`${packageId}-candidate-evidence`, "candidate_comparison", sourceAnchorIds),
    evidenceAnchor(`${packageId}-critic-evidence`, "critic_finding", sourceAnchorIds),
    evidenceAnchor(`${packageId}-consensus-evidence`, "consensus_decision", sourceAnchorIds),
    evidenceAnchor(`${packageId}-${subject}-evidence`, subject === "practice"
      ? "calculation_trace"
      : subject === "theory"
        ? "theory_concept_check"
        : "law_version_check", [sourceAnchorIds[3]]),
  ];
  const evidenceAnchorIds = evidenceAnchors.map((anchor) => anchor.evidenceId);
  const pkg = {
    id: packageId,
    mode: "synthetic_fixture",
    questionId: question.id,
    subject,
    officialSource: {
      sourceStatus: "synthetic_fixture",
      questionId: question.id,
      sourceId,
      rightsStatus: "redistribution_allowed",
      displayMode: "full_text",
      extractionStatus: "extracted_private",
      problemTextStatus: "synthetic_fixture",
      canonicalVerificationStatus: "synthetic_fixture",
      officialAnswerAvailability: "not_available_for_second_round",
      officialAnswerUsed: false,
      officialGradingCriteriaUsed: false,
    },
    learningReference: {
      status: "released_learning_reference",
      learnerFacingLabelKey: "verified_learning_reference",
      requiredCaveatKey: "learning_reference_not_official_answer",
      officialClaimAllowed: false,
      scorePredictionAllowed: false,
      passProbabilityAllowed: false,
    },
    sections: packageSections(packageId, sourceAnchorIds, evidenceAnchorIds),
    sourceAnchors,
    evidenceAnchors,
    uncertainty: [
      {
        uncertaintyId: `${packageId}-nonblocking-uncertainty`,
        kind: subject === "law" ? "legal_version_uncertainty" : subject === "practice" ? "calculation_uncertainty" : "theory_term_uncertainty",
        severity: "low",
        summary: "Synthetic fixture uncertainty resolved by metadata-only validators.",
        resolutionStatus: "resolved",
        releaseBlocking: false,
        sourceAnchorIds: [sourceAnchorIds[3]],
        evidenceAnchorIds: [evidenceAnchorIds.at(-1)],
      },
    ],
    alternativeReasoningPaths: [
      {
        pathId: `${packageId}-accepted-alternative`,
        status: "accepted",
        summary: "Synthetic accepted alternative reasoning path.",
        sourceAnchorIds: [sourceAnchorIds[3]],
        evidenceAnchorIds: [evidenceAnchorIds.at(-1)],
        uncertaintyIds: [`${packageId}-nonblocking-uncertainty`],
        releaseImplication: "non_blocking_alternative",
      },
    ],
    verificationReport: {
      sourceStatus: "source_verified",
      evidenceStatus: "subject_validated",
      subjectValidationStatus: "subject_validated",
      criticConsensusStatus: "critic_consensus_passed",
      releaseGateStatus: "released",
      independentCandidateCount: 3,
      criticPassCount: 1,
      unresolvedConflictCount: 0,
    },
    releaseBlockers: [],
    release: {
      status: "released",
      releasedAt: "2026-06-26T00:00:00.000Z",
      requiredCaveatKey: "learning_reference_not_official_answer",
      noOfficialAnswerGuardrail: true,
      learnerFacingOfficialClaimAllowed: false,
      releaseRequiresNoOpenBlockers: true,
    },
    downstreamUsage: {
      s214GenerationInput: true,
      s215ReleaseGateInput: true,
      s211LawReviewInput: subject === "law",
      s212TheoryReviewInput: subject === "theory",
      s213PracticeReviewInput: subject === "practice",
    },
  };
  if (subject === "practice") {
    pkg.practiceValidation = {
      calculatorModel: "casio_fx_9860giii",
      resetSafeHandKeyedRoutineRequired: true,
      storedProgramDependencyAllowed: false,
      formulaStored: false,
      extractedValuesStored: false,
      handKeyedSequenceStored: false,
      expectedDisplayStored: false,
      checks: validationChecks(`${packageId}-practice`, practiceCheckKinds, [sourceAnchorIds[3]], [evidenceAnchorIds.at(-1)]),
    };
  } else if (subject === "theory") {
    pkg.theoryValidation = {
      checks: validationChecks(`${packageId}-theory`, theoryCheckKinds, [sourceAnchorIds[3]], [evidenceAnchorIds.at(-1)]),
    };
  } else {
    pkg.lawValidation = {
      examDate: "2090-07-01",
      lawEffectiveDate: "2090-07-01",
      lawVersionAnchorIds: [sourceAnchorIds[3]],
      checks: validationChecks(`${packageId}-law`, lawCheckKinds, [sourceAnchorIds[3]], [evidenceAnchorIds.at(-1)]),
    };
  }
  return pkg;
}

async function makeFixtureConfig({
  subject = "practice",
  packageMutator = () => {},
  questionMutator = () => {},
  validate = true,
} = {}) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "s207-reference-package-"));
  const sourceRegistry = await readJson(defaultPaths.source);
  const rightsRegistry = await readJson(defaultPaths.rights);
  const canonicalRegistry = await readJson(defaultPaths.canonical);
  const referenceRegistry = await readJson(defaultPaths.registry);
  const syllabus = await readJson(defaultPaths.syllabus);

  const source = syntheticSource(sourceRegistry, subject);
  const rights = syntheticRights(source.sourceId);
  const subjectRecord = subjectRecordFor(syllabus, subject);
  const question = syntheticQuestion({ subject, sourceId: source.sourceId, subjectRecord });
  questionMutator(question);
  const pkg = syntheticPackage({ subject, question, sourceId: source.sourceId });
  packageMutator(pkg);

  sourceRegistry.sourceArtifacts = [source];
  rightsRegistry.rightsDecisions = [rights];
  canonicalRegistry.questions = [question];
  referenceRegistry.packages = [pkg];

  const sourceRegistryPath = path.join(fixtureDir, "second_round_source_registry.json");
  const rightsRegistryPath = path.join(fixtureDir, "second_round_rights_registry.json");
  const canonicalQuestionRegistryPath = path.join(fixtureDir, "canonical_questions.json");
  const registryPath = path.join(fixtureDir, "reference_answer_packages.json");
  const reportPath = path.join(fixtureDir, "reference_answer_package_report.json");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(sourceRegistryPath, `${JSON.stringify(sourceRegistry, null, 2)}\n`, "utf8");
  await writeFile(rightsRegistryPath, `${JSON.stringify(rightsRegistry, null, 2)}\n`, "utf8");
  await writeFile(canonicalQuestionRegistryPath, `${JSON.stringify(canonicalRegistry, null, 2)}\n`, "utf8");
  await writeFile(registryPath, `${JSON.stringify(referenceRegistry, null, 2)}\n`, "utf8");

  const config = { sourceRegistryPath, rightsRegistryPath, canonicalQuestionRegistryPath, registryPath, reportPath };
  if (validate) {
    const loadedRegistry = loadSecondRoundReferenceAnswerPackageRegistry(config);
    const report = buildSecondRoundReferenceAnswerPackageReport(loadedRegistry, config);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  return config;
}

test("S207 default registry loads as empty metadata-only package contract", () => {
  const registry = loadSecondRoundReferenceAnswerPackageRegistry({ asOfDate: "2026-06-26" });
  const report = loadSecondRoundReferenceAnswerPackageReport({ asOfDate: "2026-06-26" });

  assert.equal(registry.registryScope, "appraiser_second_round_only");
  assert.equal(registry.storagePolicy.metadataOnly, true);
  assert.equal(registry.storagePolicy.rawOfficialAnswerTextStored, false);
  assert.equal(registry.storagePolicy.rawReferenceAnswerTextStored, false);
  assert.equal(registry.boundaryPolicy.referenceAnswersGenerated, false);
  assert.equal(registry.boundaryPolicy.gradingEngineImplemented, false);
  assert.equal(registry.packages.length, 0);

  assert.equal(report.totals.packageCount, 0);
  assert.equal(report.totals.releasedPackageCount, 0);
  assert.equal(report.totals.openBlockingReleaseBlockerCount, 0);
  assert.equal(report.safeUse, "s207_reference_answer_package_contract_only");
});

test("S207 validator accepts a fully gated synthetic practice package", async () => {
  const config = await makeFixtureConfig();
  const registry = loadSecondRoundReferenceAnswerPackageRegistry(config);
  const report = loadSecondRoundReferenceAnswerPackageReport(config);
  const [pkg] = registry.packages;

  assert.equal(pkg.subject, "practice");
  assert.equal(pkg.release.status, "released");
  assert.equal(pkg.officialSource.officialAnswerAvailability, "not_available_for_second_round");
  assert.equal(pkg.officialSource.officialAnswerUsed, false);
  assert.equal(pkg.practiceValidation.calculatorModel, "casio_fx_9860giii");
  assert.equal(pkg.practiceValidation.storedProgramDependencyAllowed, false);
  assert.equal(report.totals.packageCount, 1);
  assert.equal(report.totals.releasablePackageCount, 1);
  assert.equal(report.totals.sourceAnchorCount, 6);
  assert.equal(report.totals.evidenceAnchorCount, 6);
});

test("S207 CLI validates the committed deterministic report", () => {
  const cli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "scripts/validate-second-round-reference-answer-packages.mjs",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /S207 reference answer package registry validation passed/);
});

test("S207 validation rejects raw fields and prohibited learner-facing authority claims", async () => {
  const rawFieldConfig = await makeFixtureConfig({
    validate: false,
    packageMutator(pkg) {
      pkg.answerText = "Synthetic raw answer-like field must not be present";
    },
  });
  assert.throws(
    () => loadSecondRoundReferenceAnswerPackageRegistry(rawFieldConfig),
    /answerText/,
  );

  const prohibitedClaimConfig = await makeFixtureConfig({
    validate: false,
    packageMutator(pkg) {
      pkg.sections[0].contentStatus = "official model answer";
    },
  });
  assert.throws(
    () => loadSecondRoundReferenceAnswerPackageRegistry(prohibitedClaimConfig),
    /prohibited official-answer|unsupported value/,
  );
});

test("S207 validation blocks release on open calculation, legal-source, or consensus blockers", async () => {
  for (const kind of ["calculation", "legal_source", "unresolved_consensus"]) {
    const config = await makeFixtureConfig({
      validate: false,
      packageMutator(pkg) {
        pkg.releaseBlockers = [
          {
            blockerId: `synthetic-${kind}-blocker`,
            kind,
            status: "open",
            severity: "blocking",
            summary: "Synthetic open blocker.",
            requiredResolver: kind === "calculation" ? "s210" : kind === "legal_source" ? "s208" : "s215",
            sourceAnchorIds: [pkg.sourceAnchors[0].anchorId],
            evidenceAnchorIds: [pkg.evidenceAnchors[0].evidenceId],
          },
        ];
      },
    });
    assert.throws(
      () => loadSecondRoundReferenceAnswerPackageRegistry(config),
      /release.status must be blocked|cannot release with open blocking release blockers/,
    );
  }
});

test("S207 validation enforces subject-specific sections and GIII reset-safe calculator rules", async () => {
  const missingPractice = await makeFixtureConfig({
    validate: false,
    packageMutator(pkg) {
      delete pkg.practiceValidation;
    },
  });
  assert.throws(
    () => loadSecondRoundReferenceAnswerPackageRegistry(missingPractice),
    /practiceValidation is required/,
  );

  const storedProgram = await makeFixtureConfig({
    validate: false,
    packageMutator(pkg) {
      pkg.practiceValidation.storedProgramDependencyAllowed = true;
    },
  });
  assert.throws(
    () => loadSecondRoundReferenceAnswerPackageRegistry(storedProgram),
    /storedProgramDependencyAllowed/,
  );

  const lawDateMismatch = await makeFixtureConfig({
    validate: false,
    subject: "law",
    packageMutator(pkg) {
      pkg.lawValidation.lawEffectiveDate = "2090-07-02";
    },
  });
  assert.throws(
    () => loadSecondRoundReferenceAnswerPackageRegistry(lawDateMismatch),
    /lawEffectiveDate must not be after examDate|lawValidation.lawEffectiveDate must match/,
  );
});

test("S207 docs describe downstream use and data-boundary limits", async () => {
  const docs = await readFile(defaultPaths.docs, "utf8");
  for (const token of ["S214", "S215", "S211", "S212", "S213", "S208", "S209", "S210"]) {
    assert.match(docs, new RegExp(token));
  }
  assert.match(docs, /metadata contract/);
  assert.match(docs, /release blockers/);
  assert.match(docs, /raw official question bodies/);
  assert.match(docs, /raw official answer bodies/);
});

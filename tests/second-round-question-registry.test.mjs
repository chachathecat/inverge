import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildSecondRoundQuestionIngestionReport,
  loadSecondRoundCanonicalQuestionRegistry,
  loadSecondRoundQuestionIngestionReport,
} from "../lib/review-os/second-round-question-registry.ts";

const defaultPaths = {
  source: "reference_corpus/official_materials/appraiser/second_round_source_registry.json",
  rights: "reference_corpus/official_materials/appraiser/second_round_rights_registry.json",
  registry: "reference_corpus/question_archive/second/appraiser_second_round_canonical_questions.json",
  report: "reference_corpus/question_archive/second/appraiser_second_round_ingestion_report.json",
};

const subjectMeta = {
  practice: {
    officialSubjectId: "appraiser_second_round_subject_practice_current_2026_06_25",
    officialSubjectLabelKo: "감정평가실무",
    session: "2차 1교시: 감정평가실무",
  },
  theory: {
    officialSubjectId: "appraiser_second_round_subject_theory_current_2026_06_25",
    officialSubjectLabelKo: "감정평가이론",
    session: "2차 2교시: 감정평가이론",
  },
  law: {
    officialSubjectId: "appraiser_second_round_subject_law_current_2026_06_25",
    officialSubjectLabelKo: "감정평가 및 보상법규",
    session: "2차 3교시: 감정평가 및 보상법규",
  },
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function syntheticSource(subject = "practice") {
  return {
    sourceId: `synthetic-s203-${subject}-source`,
    officialSourceId: "qnet_appraiser_past_questions",
    sourceAgency: "HRD Korea Q-Net",
    officialUrl: "https://www.q-net.or.kr/cst003.do?gId=31&gSite=L&id=cst00309",
    examYear: 2090,
    examRound: 101,
    subject,
    paperOrSession: subjectMeta[subject].session,
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

function syntheticRights(sourceId, overrides = {}) {
  return {
    sourceId,
    rightsStatus: "redistribution_allowed",
    displayMode: "full_text",
    decisionStatus: "synthetic_fixture_rights_allowed",
    evidenceSourceId: "qnet_appraiser_past_questions",
    evidenceReference: "Synthetic S203 fixture only; not a real redistribution decision.",
    verifiedBy: "s203-synthetic-fixture",
    verifiedAt: "2026-06-26",
    operationalNote: "Synthetic fixture used to exercise validator-allowed canonical shape.",
    learnerFacingPublicationAllowed: true,
    ...overrides,
  };
}

function syntheticQuestion(subject = "practice", overrides = {}) {
  const sourceId = `synthetic-s203-${subject}-source`;
  const base = {
    id: `synthetic-s203-${subject}-q1`,
    mode: "canonical_question",
    examYear: 2090,
    examRound: 101,
    subject,
    officialSubjectId: subjectMeta[subject].officialSubjectId,
    officialSubjectLabelKo: subjectMeta[subject].officialSubjectLabelKo,
    questionNo: 1,
    subQuestions: [
      {
        id: `synthetic-s203-${subject}-q1-a`,
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
        id: `synthetic-s203-${subject}-q1-b`,
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
    tableAssets: [
      {
        assetId: `synthetic-${subject}-table-1`,
        kind: "table",
        sourcePage: 1,
        regionRef: "synthetic-region-1",
        extractionStatus: "metadata_only",
        verificationStatus: "metadata_only",
        rawBytesStored: false,
        rawTextStored: false,
      },
    ],
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
  return { ...base, ...overrides };
}

async function makeFixtureConfig({
  subject = "practice",
  questionMutator = () => {},
  sourceMutator = () => {},
  rightsMutator = () => {},
  validate = true,
} = {}) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "s203-question-registry-"));
  const source = await readJson(defaultPaths.source);
  const rights = await readJson(defaultPaths.rights);
  const registry = await readJson(defaultPaths.registry);

  const sourceArtifact = syntheticSource(subject);
  sourceMutator(sourceArtifact);
  const rightsDecision = syntheticRights(sourceArtifact.sourceId);
  rightsMutator(rightsDecision);
  const question = syntheticQuestion(subject, { source: { ...syntheticQuestion(subject).source, sourceId: sourceArtifact.sourceId } });
  questionMutator(question);

  source.sourceArtifacts = [sourceArtifact];
  rights.rightsDecisions = [rightsDecision];
  registry.questions = [question];

  const sourceRegistryPath = path.join(fixtureDir, "second_round_source_registry.json");
  const rightsRegistryPath = path.join(fixtureDir, "second_round_rights_registry.json");
  const registryPath = path.join(fixtureDir, "canonical_questions.json");
  const ingestionReportPath = path.join(fixtureDir, "ingestion_report.json");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(sourceRegistryPath, `${JSON.stringify(source, null, 2)}\n`, "utf8");
  await writeFile(rightsRegistryPath, `${JSON.stringify(rights, null, 2)}\n`, "utf8");
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

  const config = { sourceRegistryPath, rightsRegistryPath, registryPath, ingestionReportPath };
  if (validate) {
    const loadedRegistry = loadSecondRoundCanonicalQuestionRegistry(config);
    const report = buildSecondRoundQuestionIngestionReport(loadedRegistry, config);
    await writeFile(ingestionReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  return config;
}

test("S203 default canonical registry loads as metadata-only source skeletons without official problem text", () => {
  const registry = loadSecondRoundCanonicalQuestionRegistry({ asOfDate: "2026-06-26" });
  const report = loadSecondRoundQuestionIngestionReport({ asOfDate: "2026-06-26" });

  assert.equal(registry.registryScope, "appraiser_second_round_only");
  assert.equal(registry.storagePolicy.metadataOnly, true);
  assert.equal(registry.storagePolicy.rawQuestionTextStored, false);
  assert.equal(registry.storagePolicy.rawAnswerTextStored, false);
  assert.equal(registry.boundaryPolicy.syntheticFixturesOnly, true);
  assert.equal(registry.boundaryPolicy.referenceAnswersGenerated, false);
  assert.equal(registry.questions.length, 0);

  assert.equal(report.totals.canonicalQuestionCount, 0);
  assert.equal(report.totals.sourceSkeletonCount, 16);
  assert.equal(report.totals.s202MetadataEligibleSourceCount, 16);
  assert.equal(report.totals.s202ProblemTextEligibleSourceCount, 0);
  assert.equal(report.totals.s202LearnerPublicationEligibleSourceCount, 0);
  assert.equal(report.sourceSkeletons.every((entry) => entry.problemTextEligibleForS203 === false), true);
  assert.equal(report.sourceSkeletons.every((entry) => entry.learnerPublicationEligible === false), true);
});

test("S203 validator accepts full synthetic practice metadata with GIII and Deep Review hooks", async () => {
  const config = await makeFixtureConfig();
  const registry = loadSecondRoundCanonicalQuestionRegistry(config);
  const report = loadSecondRoundQuestionIngestionReport(config);
  const [question] = registry.questions;

  assert.equal(question.subject, "practice");
  assert.equal(question.totalPoints, 50);
  assert.equal(question.subQuestions.length, 2);
  assert.equal(question.giiiRoutine.calculatorModel, "casio_fx_9860giii");
  assert.equal(question.giiiRoutine.storedProgramDependencyAllowed, false);
  assert.equal(question.evidenceReview.status, "synthetic_fixture_only");
  assert.equal(question.deepReviewUnitEstimate.estimatedUnits, 1);
  assert.equal(report.totals.canonicalQuestionCount, 1);
  assert.equal(report.totals.syntheticFixtureQuestionCount, 1);
  assert.equal(report.totals.estimatedDeepReviewUnits, 1);
});

test("S203 CLI validates the committed deterministic report", () => {
  const cli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "scripts/validate-second-round-question-registry.mjs",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /S203 canonical question registry validation passed/);
});

test("S203 validation rejects rights or extraction bypass for verified problem text", async () => {
  const config = await makeFixtureConfig({
    validate: false,
    questionMutator(question) {
      question.source.rightsStatus = "needs_legal_review";
      question.source.displayMode = "metadata_and_link";
      question.source.problemTextEligibleForS203 = false;
      question.source.learnerPublicationEligible = false;
      question.learnerPublication.allowed = false;
    },
    rightsMutator(decision) {
      decision.rightsStatus = "needs_legal_review";
      decision.displayMode = "metadata_and_link";
      decision.decisionStatus = "needs_legal_review";
      decision.learnerFacingPublicationAllowed = false;
    },
  });
  const registry = await readJson(config.registryPath);
  registry.questions[0].problemText.status = "verified";
  registry.questions[0].learnerPublication.allowed = false;
  await writeFile(config.registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

  assert.throws(
    () => loadSecondRoundCanonicalQuestionRegistry(config),
    /cannot verify problem text|problemTextEligibleForS203 is false/,
  );
});

test("S203 validation rejects invalid points, missing law date, raw fields, and stored-program dependency", async () => {
  const invalidPoints = await makeFixtureConfig({
    validate: false,
    questionMutator(question) {
      question.totalPoints = 60;
    },
  });
  assert.throws(
    () => loadSecondRoundCanonicalQuestionRegistry(invalidPoints),
    /points must sum to totalPoints/,
  );

  const missingLawDate = await makeFixtureConfig({
    validate: false,
    subject: "law",
    questionMutator(question) {
      delete question.lawEffectiveDate;
      question.learnerPublication.allowed = false;
    },
  });
  assert.throws(
    () => loadSecondRoundCanonicalQuestionRegistry(missingLawDate),
    /lawEffectiveDate is required/,
  );

  const rawField = await makeFixtureConfig({
    validate: false,
    questionMutator(question) {
      question.questionText = "Synthetic raw-like field still must not be present";
    },
  });
  assert.throws(
    () => loadSecondRoundCanonicalQuestionRegistry(rawField),
    /questionText/,
  );

  const storedProgram = await makeFixtureConfig({
    validate: false,
    questionMutator(question) {
      question.giiiRoutine.storedProgramDependencyAllowed = true;
    },
  });
  assert.throws(
    () => loadSecondRoundCanonicalQuestionRegistry(storedProgram),
    /storedProgramDependencyAllowed/,
  );
});

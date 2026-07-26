import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const registryPath = "reference_corpus/curriculum/appraiser/official_sources.json";
const curriculumPaths = [
  "reference_corpus/curriculum/appraiser/first_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/second_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/study_tracks.json",
  "reference_corpus/curriculum/appraiser/explanation_ladder.json",
];
const qnetQualificationDetailUrl = "https://www.q-net.or.kr/crf005.do?gId=60&gSite=L&gbnn=gbnSubtab2&id=crf00503";
const qnetExamInfoUrl = "https://www.q-net.or.kr/crf005.do?gId=60&gSite=L&gbnn=gbnSubtab1&id=crf00503";
const forbiddenFields = new Set([
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "sourceText",
  "copyrightedText",
  "officialAnswer",
  "modelAnswer",
  "score",
  "scorePrediction",
  "instructorComment",
]);
const forbiddenClaimPattern = /(official\s+grading|official\s+score|score\s+prediction|pass\s*\/\s*fail|model\s+answer|합격\s*보장|공식\s*채점|공식\s*점수|점수\s*예측|합격\s*\/\s*불합격|합불|공식\s*모범\s*답안|모범\s*답안)/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectSourceNodes(value, path = "root", output = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectSourceNodes(child, `${path}[${index}]`, output));
    return output;
  }
  if (!isRecord(value)) return output;
  if ("sourceStatus" in value) output.push({ node: value, path });
  for (const [key, child] of Object.entries(value)) {
    collectSourceNodes(child, `${path}.${key}`, output);
  }
  return output;
}


function makeValidRegistry() {
  return {
    sources: [
      {
        id: "qnet_appraiser_qualification_detail",
        sourceName: "Q-Net 감정평가사 자격상세정보",
        sourceUrl: qnetQualificationDetailUrl,
        sourceKind: "qualification_detail",
        authorityLevel: "primary",
        owner: "Q-Net",
        verifiedFacts: {
          qualificationNameKo: "감정평가사",
          qualificationNameEn: "Certified Appraiser",
          relatedMinistry: "국토교통부",
          administeringAgency: "한국산업인력공단",
        },
        lastCheckedAt: "2026-06-08",
        needsManualRecheckBy: "2026-12-08",
        allowedUse: ["metadata_only", "link_reference"],
        disallowedUse: ["raw_problem_text_copy", "copyrighted_question_body_storage", "official_score_claim", "pass_fail_claim"],
        notes: "Test fixture keeps metadata only.",
      },
      {
        id: "qnet_appraiser_exam_info",
        sourceName: "Q-Net 감정평가사 시험정보",
        sourceUrl: qnetExamInfoUrl,
        sourceKind: "exam_info",
        authorityLevel: "primary",
        owner: "Q-Net",
        verifiedFacts: {},
        lastCheckedAt: "2026-06-25",
        needsManualRecheckBy: "2026-12-25",
        allowedUse: ["metadata_only", "link_reference"],
        disallowedUse: ["raw_problem_text_copy", "copyrighted_question_body_storage", "official_score_claim", "pass_fail_claim"],
        notes: "Test fixture keeps metadata only.",
      },
      {
        id: "law_appraiser_enforcement_decree_exam_subjects",
        sourceName: "국가법령정보센터 감정평가사 시행령 시험과목",
        sourceUrl: "https://www.law.go.kr/LSW/lsInfoP.do?lsId=012651&efYd=20260625",
        sourceKind: "statute_or_regulation",
        authorityLevel: "primary",
        owner: "국토교통부",
        verifiedFacts: {},
        lastCheckedAt: "2026-06-25",
        needsManualRecheckBy: "2026-12-25",
        allowedUse: ["metadata_only", "link_reference"],
        disallowedUse: ["raw_problem_text_copy", "copyrighted_question_body_storage", "official_score_claim", "pass_fail_claim"],
        notes: "Test fixture keeps metadata only.",
      },
      {
        id: "qnet_appraiser_2026_public_notice",
        sourceName: "Q-Net 2026년도 감정평가사 시행공고",
        sourceUrl: "https://www.q-net.or.kr/crf002.do?gId=60&gSite=L&id=crf00201",
        sourceKind: "public_notice",
        authorityLevel: "primary",
        owner: "Q-Net",
        verifiedFacts: {},
        lastCheckedAt: "2026-06-25",
        needsManualRecheckBy: "2026-12-25",
        allowedUse: ["metadata_only", "link_reference"],
        disallowedUse: ["raw_problem_text_copy", "copyrighted_question_body_storage", "official_score_claim", "pass_fail_claim"],
        notes: "Test fixture keeps metadata only.",
      },
    ],
  };
}

function makeValidQnetExamInfoReference(overrides = {}) {
  return {
    label: "Q-Net 감정평가사 시험정보",
    url: qnetExamInfoUrl,
    reviewedAt: "2026-07-26",
    scope: "official_exam_administrator_and_public_exam_information_page",
    sourceStatus: "draft",
    needsOfficialVerification: true,
    ...overrides,
  };
}

function makeValidVerifiedNode(overrides = {}) {
  return {
    id: "officialQualificationIdentity",
    sourceStatus: "verified",
    needsOfficialVerification: false,
    officialSourceId: "qnet_appraiser_qualification_detail",
    officialSourceUrl: "https://www.q-net.or.kr/",
    officialSourceName: "Q-Net 감정평가사 자격 상세",
    officialSourceKind: "qualification_detail",
    lastOfficialVerifiedAt: "2026-06-08",
    verifiedBy: "official-source-fixture",
    ...overrides,
  };
}

function makeDraftNode(overrides = {}) {
  return {
    id: "draftCurriculumNode",
    sourceStatus: "draft",
    needsOfficialVerification: true,
    ...overrides,
  };
}

function makeStoragePolicy() {
  return {
    metadataOnly: true,
    rawTextStored: false,
    copyrightedTextStored: false,
    rawNoticeTextStored: false,
    rawQuestionTextStored: false,
    rawAnswerTextStored: false,
    rawLearnerTextStored: false,
  };
}

function makeValidOfficialSyllabus() {
  const baseRecord = {
    scope: "second_round",
    effectiveFrom: "2026-06-25",
    status: "verified",
    lastOfficialVerifiedAt: "2026-06-25",
    needsManualRecheckBy: "2026-12-25",
    productionFacing: false,
  };
  return {
    schemaVersion: "fixture",
    registryScope: "fixture",
    storagePolicy: makeStoragePolicy(),
    lastReviewedAt: "2026-06-25",
    currentAsOf: "2026-06-25",
    sourceIds: ["qnet_appraiser_qualification_detail", "qnet_appraiser_exam_info", "law_appraiser_enforcement_decree_exam_subjects"],
    qualificationStageRecords: [
      {
        ...baseRecord,
        id: "fixture_stage",
        recordType: "qualification_stage_identity",
        sourceIds: ["qnet_appraiser_qualification_detail", "law_appraiser_enforcement_decree_exam_subjects"],
      },
    ],
    subjectRecords: [
      ["practice", "감정평가실무", "second_practice", 1],
      ["theory", "감정평가이론", "second_theory", 2],
      ["law", "감정평가 및 보상법규", "second_compensation_law", 3],
    ].map(([subjectKey, officialSubjectLabelKo, editorialSubjectId, officialSubjectOrder]) => ({
      ...baseRecord,
      id: `fixture_subject_${subjectKey}`,
      recordType: "official_subject",
      subjectKey,
      officialSubjectLabelKo,
      officialSubjectOrder,
      editorialSubjectId,
      sourceIds: ["qnet_appraiser_exam_info", "law_appraiser_enforcement_decree_exam_subjects"],
    })),
    deprecatedRecords: [],
    unresolvedOfficialSourceConflicts: [],
  };
}

function makeValidExamRules() {
  return {
    schemaVersion: "fixture",
    registryScope: "fixture",
    storagePolicy: makeStoragePolicy(),
    lastReviewedAt: "2026-06-25",
    currentAsOf: "2026-06-25",
    sourceIds: ["qnet_appraiser_exam_info"],
    rules: [
      {
        id: "fixture_rule",
        scope: "second_round",
        ruleKey: "answer_method",
        value: { method: "written_essay" },
        sourceIds: ["qnet_appraiser_exam_info"],
        effectiveFrom: "2026-06-25",
        status: "verified",
        lastOfficialVerifiedAt: "2026-06-25",
        needsManualRecheckBy: "2026-12-25",
        productionFacing: false,
      },
    ],
    deprecatedRecords: [],
    unresolvedOfficialSourceConflicts: [],
  };
}

function makeValidAnnualNotice() {
  return {
    schemaVersion: "fixture",
    registryScope: "fixture",
    noticeYear: 2026,
    examRound: 37,
    qualificationNameKo: "감정평가사",
    storagePolicy: makeStoragePolicy(),
    lastReviewedAt: "2026-06-25",
    currentAsOf: "2026-06-25",
    sourceIds: ["qnet_appraiser_2026_public_notice", "qnet_appraiser_exam_info"],
    noticeMetadata: {
      noticeTitleKo: "2026년도 제37회 감정평가사 국가자격시험 시행계획 공고",
      noticePublishedAt: null,
      officialNoticeUrl: "https://www.q-net.or.kr/crf002.do?gId=60&gSite=L&id=crf00201",
      noticeBodyStored: false,
      attachmentBodyStored: false,
      sourceNote: "Fixture metadata only.",
    },
    annualValues: [
      {
        id: "fixture_annual_exam_date",
        scope: "second_round",
        valueKey: "exam_date",
        value: { date: "2026-07-04" },
        sourceIds: ["qnet_appraiser_2026_public_notice", "qnet_appraiser_exam_info"],
        effectiveFrom: "2026-01-01",
        effectiveTo: "2026-12-31",
        status: "verified",
        lastOfficialVerifiedAt: "2026-06-25",
        needsManualRecheckBy: "2026-12-25",
        productionFacing: false,
      },
    ],
    annualOverrides: [],
    unresolvedOfficialSourceConflicts: [],
  };
}

function runOfficialSourceCheckWithFixture(nodes, { registry = makeValidRegistry(), sourceReferences = [] } = {}) {
  const fixtureDir = mkdtempSync(join(tmpdir(), "inverge-official-source-"));
  const registryFixturePath = join(fixtureDir, "official_sources.json");
  const curriculumFixturePath = join(fixtureDir, "curriculum.json");
  const officialSyllabusFixturePath = join(fixtureDir, "official_syllabus.json");
  const examRulesFixturePath = join(fixtureDir, "exam_rules.json");
  const annualNoticeFixturePath = join(fixtureDir, "annual_notice_2026.json");
  writeFileSync(registryFixturePath, `${JSON.stringify(registry, null, 2)}\n`);
  writeFileSync(curriculumFixturePath, `${JSON.stringify({ nodes, sourceReferences }, null, 2)}\n`);
  writeFileSync(officialSyllabusFixturePath, `${JSON.stringify(makeValidOfficialSyllabus(), null, 2)}\n`);
  writeFileSync(examRulesFixturePath, `${JSON.stringify(makeValidExamRules(), null, 2)}\n`);
  writeFileSync(annualNoticeFixturePath, `${JSON.stringify(makeValidAnnualNotice(), null, 2)}\n`);
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

  return spawnSync(npmCommand, ["--silent", "run", "check:official-source-verification"], {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      OFFICIAL_SOURCE_REGISTRY_PATH: registryFixturePath,
      OFFICIAL_SOURCE_CURRICULUM_PATHS: curriculumFixturePath,
      OFFICIAL_SYLLABUS_REGISTRY_PATH: officialSyllabusFixturePath,
      OFFICIAL_EXAM_RULES_REGISTRY_PATH: examRulesFixturePath,
      OFFICIAL_ANNUAL_NOTICE_PATHS: annualNoticeFixturePath,
    },
  });
}

function assertNoForbiddenBoundary(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoForbiddenBoundary(child, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string") {
      assert.doesNotMatch(value, forbiddenClaimPattern, `${path} contains prohibited official grading/score/pass-fail/model-answer/guarantee claim`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenFields.has(key), false, `${path}.${key} must not be stored`);
    assertNoForbiddenBoundary(child, `${path}.${key}`);
  }
}

test("official source registry includes verified Q-Net appraiser identity metadata", () => {
  assert.equal(existsSync(registryPath), true);
  const registry = readJson(registryPath);
  const qnetIdentity = registry.sources.find((source) => source.id === "qnet_appraiser_qualification_detail");
  assert.ok(qnetIdentity);
  assert.equal(qnetIdentity.verifiedFacts.qualificationNameKo, "감정평가사");
  assert.equal(qnetIdentity.verifiedFacts.qualificationNameEn, "Certified Appraiser");
  assert.equal(qnetIdentity.verifiedFacts.relatedMinistry, "국토교통부");
  assert.equal(qnetIdentity.verifiedFacts.administeringAgency, "한국산업인력공단");
});

test("copied Q-Net curriculum references match canonical exam-info semantics while qualification identity stays on basic information", () => {
  const registry = readJson(registryPath);
  const qnetExamInfo = registry.sources.find((source) => source.id === "qnet_appraiser_exam_info");
  const qnetQualificationDetail = registry.sources.find((source) => source.id === "qnet_appraiser_qualification_detail");
  assert.ok(qnetExamInfo);
  assert.ok(qnetQualificationDetail);
  assert.equal(qnetExamInfo.sourceUrl, qnetExamInfoUrl);
  assert.equal(qnetQualificationDetail.sourceUrl, qnetQualificationDetailUrl);

  let checkedReferenceCount = 0;
  for (const path of curriculumPaths.slice(0, 3)) {
    const document = readJson(path);
    const qnetReferences = document.sourceReferences.filter((source) => source.label.startsWith("Q-Net 감정평가사"));
    assert.equal(qnetReferences.length, 1, `${path} should expose one copied Q-Net curriculum reference`);
    const [reference] = qnetReferences;
    assert.equal(reference.label, qnetExamInfo.sourceName, `${path} copied Q-Net label drifted`);
    assert.equal(reference.url, qnetExamInfo.sourceUrl, `${path} copied Q-Net URL drifted`);
    assert.match(reference.scope, /exam_information/, `${path} copied Q-Net scope must remain exam information`);
    assert.doesNotMatch(reference.url, /gbnSubtab4/, `${path} cannot treat job information as exam information`);

    const identity = document.officialQualificationIdentity;
    assert.equal(identity.officialSourceId, qnetQualificationDetail.id, `${path} qualification source id drifted`);
    assert.equal(identity.officialSourceUrl, qnetQualificationDetail.sourceUrl, `${path} qualification URL drifted`);
    assert.equal(identity.officialSourceKind, qnetQualificationDetail.sourceKind, `${path} qualification kind drifted`);
    checkedReferenceCount += 1;
  }
  assert.equal(checkedReferenceCount, 3);
});

test("curriculum and reference nodes include official-source status metadata", () => {
  const registry = readJson(registryPath);
  const sourceIds = new Set(registry.sources.map((source) => source.id));
  const allSourceNodes = curriculumPaths.flatMap((path) => collectSourceNodes(readJson(path), path));
  assert.ok(allSourceNodes.length > 0);

  for (const { node, path } of allSourceNodes) {
    assert.match(node.sourceStatus, /^(draft|verified|needs_update|deprecated)$/, `${path} sourceStatus is invalid`);
    if (node.sourceStatus === "draft") {
      assert.equal(node.needsOfficialVerification, true, `${path} draft node must remain explicitly non-authoritative`);
    }
    if (node.sourceStatus === "verified") {
      for (const field of ["officialSourceId", "officialSourceUrl", "officialSourceName", "officialSourceKind", "lastOfficialVerifiedAt", "verifiedBy"]) {
        assert.ok(node[field], `${path} verified node missing ${field}`);
      }
      assert.equal(node.needsOfficialVerification, false, `${path} verified node must not need verification`);
      assert.equal(sourceIds.has(node.officialSourceId), true, `${path} unknown source id`);
    }
  }
});

test("official-source metadata does not store raw question, answer, source, score, model-answer, or instructor fields", () => {
  assertNoForbiddenBoundary(readJson(registryPath), registryPath);
  for (const path of curriculumPaths) {
    assertNoForbiddenBoundary(readJson(path), path);
  }
});

test("official-source verifier enforces verified and draft metadata rules", async () => {
  const verifier = await import("../lib/review-os/official-source-verification.ts");
  const validVerifiedResult = verifier.validateVerifiedCurriculumNode(makeValidVerifiedNode());
  assert.equal(validVerifiedResult.valid, true, validVerifiedResult.errors.join("\n"));

  const validDraftResult = verifier.validateVerifiedCurriculumNode(makeDraftNode());
  assert.equal(validDraftResult.valid, true, validDraftResult.errors.join("\n"));

  const badUrlResult = verifier.validateVerifiedCurriculumNode(makeValidVerifiedNode({ officialSourceUrl: "not-a-url" }));
  assert.equal(badUrlResult.valid, false);
  assert.match(badUrlResult.errors.join("\n"), /officialSourceUrl/);

  const badDateResult = verifier.validateVerifiedCurriculumNode(makeValidVerifiedNode({ lastOfficialVerifiedAt: "yesterday" }));
  assert.equal(badDateResult.valid, false);
  assert.match(badDateResult.errors.join("\n"), /lastOfficialVerifiedAt/);

  const unknownSourceResult = verifier.validateVerifiedCurriculumNode(makeValidVerifiedNode({ officialSourceId: "unknown_source" }));
  assert.equal(unknownSourceResult.valid, false);
  assert.match(unknownSourceResult.errors.join("\n"), /officialSourceId/);

  const draftNeedsVerificationResult = verifier.validateVerifiedCurriculumNode(makeDraftNode({ needsOfficialVerification: false }));
  assert.equal(draftNeedsVerificationResult.valid, false);
  assert.match(draftNeedsVerificationResult.errors.join("\n"), /draft node must have needsOfficialVerification: true/);

  const sources = readJson(registryPath).sources;
  const summary = verifier.summarizeOfficialVerificationStatus(
    [
      { id: "verified", sourceStatus: "verified", officialSourceId: "qnet_appraiser_qualification_detail" },
      { id: "draft", sourceStatus: "draft" },
      { id: "update", sourceStatus: "needs_update" },
    ],
    sources,
  );
  assert.equal(summary.verifiedNodes, 1);
  assert.equal(summary.draftNodes, 1);
  assert.equal(summary.needsUpdateNodes, 1);
});

test("official-source verification script fails malformed verified metadata and passes valid metadata", () => {
  const validResult = runOfficialSourceCheckWithFixture(
    [makeValidVerifiedNode(), makeDraftNode()],
    { sourceReferences: [makeValidQnetExamInfoReference()] },
  );
  assert.equal(validResult.status, 0, validResult.stderr);
  assert.match(validResult.stdout, /passed_official_source_verification/);

  const badUrlResult = runOfficialSourceCheckWithFixture([makeValidVerifiedNode({ officialSourceUrl: "not-a-url" })]);
  assert.notEqual(badUrlResult.status, 0);
  assert.match(`${badUrlResult.stdout}\n${badUrlResult.stderr}`, /officialSourceUrl must be an https URL/);

  const badDateResult = runOfficialSourceCheckWithFixture([makeValidVerifiedNode({ lastOfficialVerifiedAt: "yesterday" })]);
  assert.notEqual(badDateResult.status, 0);
  assert.match(`${badDateResult.stdout}\n${badDateResult.stderr}`, /lastOfficialVerifiedAt must be YYYY-MM-DD/);

  const unknownSourceResult = runOfficialSourceCheckWithFixture([makeValidVerifiedNode({ officialSourceId: "unknown_source" })]);
  assert.notEqual(unknownSourceResult.status, 0);
  assert.match(`${unknownSourceResult.stdout}\n${unknownSourceResult.stderr}`, /unknown officialSourceId/);
});

test("official-source verification script rejects canonical and copied Q-Net tab drift", () => {
  const copiedTabDriftResult = runOfficialSourceCheckWithFixture(
    [makeValidVerifiedNode(), makeDraftNode()],
    {
      sourceReferences: [
        makeValidQnetExamInfoReference({
          url: "https://www.q-net.or.kr/crf005.do?gId=60&gSite=L&gbnn=gbnSubtab4&id=crf00503",
        }),
      ],
    },
  );
  assert.notEqual(copiedTabDriftResult.status, 0);
  assert.match(`${copiedTabDriftResult.stdout}\n${copiedTabDriftResult.stderr}`, /URL must match canonical source qnet_appraiser_exam_info/);

  const mixedSemanticsResult = runOfficialSourceCheckWithFixture(
    [makeValidVerifiedNode(), makeDraftNode()],
    {
      sourceReferences: [
        makeValidQnetExamInfoReference({
          label: "Q-Net 감정평가사 자격상세정보",
        }),
      ],
    },
  );
  assert.notEqual(mixedSemanticsResult.status, 0);
  assert.match(`${mixedSemanticsResult.stdout}\n${mixedSemanticsResult.stderr}`, /mixes exam-information and qualification-detail semantics/);

  const registryTabDrift = makeValidRegistry();
  registryTabDrift.sources.find((source) => source.id === "qnet_appraiser_exam_info").sourceUrl =
    "https://www.q-net.or.kr/crf005.do?gId=60&gSite=L&gbnn=gbnSubtab4&id=crf00503";
  const registryTabDriftResult = runOfficialSourceCheckWithFixture(
    [makeValidVerifiedNode(), makeDraftNode()],
    { registry: registryTabDrift },
  );
  assert.notEqual(registryTabDriftResult.status, 0);
  assert.match(`${registryTabDriftResult.stdout}\n${registryTabDriftResult.stderr}`, /qnet_appraiser_exam_info sourceUrl must remain/);
});

test("official-source verification script prints expected JSON contract", () => {
  const output = execFileSync("node", ["scripts/check-official-source-verification.mjs"], { encoding: "utf8" });
  const parsed = JSON.parse(output);
  assert.equal(parsed.status, "passed_official_source_verification");
  assert.deepEqual(parsed.verified, [
    "official_sources_registry_exists",
    "qnet_appraiser_identity_verified",
    "qnet_appraiser_source_contracts_canonical",
    "copied_qnet_source_references_match_registry",
    "curriculum_nodes_have_source_status",
    "verified_nodes_have_source_metadata",
    "draft_nodes_marked_needs_verification",
    "no_raw_problem_text",
    "no_official_grading_claims",
    "s201_official_syllabus_registry_valid",
    "s201_exam_rule_registry_valid",
    "s201_annual_notice_registry_valid",
  ]);
  assert.ok(parsed.summary.verifiedNodes >= 1);
  assert.ok(parsed.summary.draftNodes >= 1);
  assert.equal(typeof parsed.summary.needsUpdateNodes, "number");
  assert.equal(parsed.summary.copiedQnetReferenceCount, 3);
  assert.deepEqual(parsed.summary.s201.currentOfficialSubjects, [
    "감정평가실무",
    "감정평가이론",
    "감정평가 및 보상법규",
  ]);
});

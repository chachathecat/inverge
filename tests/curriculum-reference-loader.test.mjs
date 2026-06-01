import assert from "node:assert/strict";
import test from "node:test";

import {
  getCurriculumVerificationStatus,
  getExplanationLabels,
  listAllowedTaskTypes,
  listStudyTracks,
  listSubjects,
  listUnits,
  loadAppraiserCurriculumReference,
  loadExplanationLadder,
  loadFirstExamCurriculum,
  loadSecondExamCurriculum,
  loadStudyTracks,
  validateCurriculumDocument,
  validateStudyTracks,
} from "../lib/review-os/curriculum-reference";

const requiredMetadataFields = [
  "schemaVersion",
  "sourceStatus",
  "needsOfficialVerification",
  "lastReviewedAt",
  "verificationNote",
  "storagePolicy",
];

function assertRequiredMetadata(document) {
  for (const field of requiredMetadataFields) {
    assert.ok(field in document, `${field} should be present`);
  }
  assert.match(document.storagePolicy, /metadata_only/);
}

test("all appraiser curriculum reference files load through typed helpers", () => {
  const firstExam = loadFirstExamCurriculum();
  const secondExam = loadSecondExamCurriculum();
  const studyTracks = loadStudyTracks();
  const explanationLadder = loadExplanationLadder();
  const reference = loadAppraiserCurriculumReference();

  assert.equal(reference.firstExam.exam, "감정평가사 1차");
  assert.equal(reference.secondExam.exam, "감정평가사 2차");
  assert.deepEqual(reference.firstExam, firstExam);
  assert.deepEqual(reference.secondExam, secondExam);
  assert.deepEqual(reference.studyTracks, studyTracks);
  assert.deepEqual(reference.explanationLadder, explanationLadder);
});

test("all curriculum reference documents expose required metadata guardrail fields", () => {
  const reference = loadAppraiserCurriculumReference();
  assertRequiredMetadata(reference.firstExam);
  assertRequiredMetadata(reference.secondExam);
  assertRequiredMetadata(reference.studyTracks);
  assertRequiredMetadata(reference.explanationLadder);
});

test("verification status remains blocked while draft metadata needs official verification", () => {
  const reference = loadAppraiserCurriculumReference();
  const status = reference.verificationStatus;
  assert.equal(status.isOfficiallyVerified, false);
  assert.ok(status.blockingReason.includes("official verification"));
  assert.equal(status.sourceStatuses.length, 4);
  assert.ok(status.sourceStatuses.every((entry) => entry.needsOfficialVerification === true));
  assert.equal(status.lastReviewedAt.length, 4);

  assert.deepEqual(status, getCurriculumVerificationStatus(reference));
});

test("first and second exam subjects include the supported appraiser curriculum subjects", () => {
  const firstSubjectNames = listSubjects("first").map((subject) => subject.name);
  const secondSubjectNames = listSubjects("second").map((subject) => subject.name);

  for (const subjectName of ["민법", "경제학원론", "부동산학원론", "감정평가관계법규", "회계학"]) {
    assert.ok(firstSubjectNames.includes(subjectName), `missing first exam subject ${subjectName}`);
  }
  for (const subjectName of ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"]) {
    assert.ok(secondSubjectNames.includes(subjectName), `missing second exam subject ${subjectName}`);
  }
});

test("lookup helpers return units and allowed task types without creating UI behavior", () => {
  const units = listUnits("first", "first_accounting");
  assert.ok(units.some((unit) => unit.id === "acct_inventory_lcm"));
  assert.deepEqual(listAllowedTaskTypes("first", "acct_inventory_lcm"), ["O/X", "cloze", "accounting template"]);
  assert.equal(listAllowedTaskTypes("second", "missing_unit").length, 0);
});

test("study tracks include all seven allowed track ids and keep Today Plan primary choices capped", () => {
  const reference = loadAppraiserCurriculumReference();
  const trackIds = Object.keys(reference.studyTracks.tracks).sort();
  assert.deepEqual(trackIds, [
    "first_120",
    "first_30",
    "first_60",
    "first_90",
    "second_180",
    "second_365",
    "second_90",
  ]);
  assert.equal(reference.studyTracks.todayPlanMaxPrimaryTasks, 3);
  assert.deepEqual(listStudyTracks("first").map((track) => track.id).sort(), ["first_120", "first_30", "first_60", "first_90"]);
  assert.deepEqual(listStudyTracks("second").map((track) => track.id).sort(), ["second_180", "second_365", "second_90"]);
});

test("explanation ladder includes the approved calm explanation labels", () => {
  const labels = getExplanationLabels().map((label) => label.label);
  for (const label of ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"]) {
    assert.ok(labels.includes(label), `missing explanation ladder label ${label}`);
  }
});

test("raw text field names are rejected anywhere in curriculum reference validation", () => {
  const firstExam = structuredClone(loadFirstExamCurriculum());
  firstExam.subjects[0].units[0].questionText = "문제 전문은 저장하면 안 됩니다.";
  assert.throws(
    () => validateCurriculumDocument(firstExam, "감정평가사 1차", "invalid_first_exam"),
    /questionText/,
  );

  for (const rawFieldName of [
    "rawText",
    "rawOcrText",
    "ocrText",
    "userAnswerText",
    "answerText",
    "problemText",
    "uploadedProblemText",
    "fullText",
  ]) {
    const invalid = structuredClone(loadFirstExamCurriculum());
    invalid[rawFieldName] = "raw text must not be accepted";
    assert.throws(
      () => validateCurriculumDocument(invalid, "감정평가사 1차", `invalid_${rawFieldName}`),
      new RegExp(rawFieldName),
    );
  }
});

test("unsupported exam labels are rejected", () => {
  const invalid = structuredClone(loadFirstExamCurriculum());
  invalid.exam = "보험계리사";
  assert.throws(
    () => validateCurriculumDocument(invalid, "감정평가사 1차", "unsupported_exam"),
    /unsupported exam label/,
  );
});

test("unsupported study track ids are rejected", () => {
  const invalid = structuredClone(loadStudyTracks());
  invalid.tracks.cpa_90 = { examMode: "first", days: 90, label: "unsupported", dailyFocus: ["retrieval"] };
  assert.throws(
    () => validateStudyTracks(invalid, "unsupported_study_tracks"),
    /unsupported study track id cpa_90/,
  );
});

test("missing verification metadata fields are rejected before future engines can consume data", () => {
  for (const fieldName of ["sourceStatus", "needsOfficialVerification", "lastReviewedAt"]) {
    const invalid = structuredClone(loadFirstExamCurriculum());
    delete invalid[fieldName];
    assert.throws(
      () => validateCurriculumDocument(invalid, "감정평가사 1차", `missing_${fieldName}`),
      new RegExp(fieldName),
    );
  }

  const invalidPolicy = structuredClone(loadFirstExamCurriculum());
  invalidPolicy.storagePolicy = "full_problem_archive";
  assert.throws(
    () => validateCurriculumDocument(invalidPolicy, "감정평가사 1차", "invalid_policy"),
    /metadata_only/,
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCurriculumNextAction,
  classifyLearningSignalToCurriculum,
  recommendCurriculumTaskCandidates,
} from "../lib/review-os/curriculum-engine.ts";
import { loadAppraiserCurriculumReference } from "../lib/review-os/curriculum-reference.ts";

const reference = loadAppraiserCurriculumReference();
const draftWarning = "Curriculum reference is draft metadata and must not be treated as officially verified.";

function taskTypesFor(signal) {
  return buildCurriculumNextAction(signal, reference).candidates.map((candidate) => candidate.taskType);
}

function idsFor(signal) {
  return buildCurriculumNextAction(signal, reference).candidates.map((candidate) => candidate.id);
}

function assertUniqueCandidateIds(signal) {
  const ids = idsFor(signal);
  assert.equal(new Set(ids).size, ids.length, `duplicate candidate ids: ${ids.join(", ")}`);
  return ids;
}

test("first exam unitId classification works for acct_inventory_lcm", () => {
  const classification = classifyLearningSignalToCurriculum({ examMode: "first", unitId: "acct_inventory_lcm" }, reference);
  assert.equal(classification.matchedBy, "unitId");
  assert.equal(classification.subjectId, "first_accounting");
  assert.equal(classification.subjectName, "회계학");
  assert.equal(classification.unitId, "acct_inventory_lcm");
  assert.equal(classification.unitName, "재고자산과 저가법");
  assert.ok(classification.allowedTaskTypes.includes("accounting template"));
});

test("first exam subjectName classification works for 회계학", () => {
  const classification = classifyLearningSignalToCurriculum({ examMode: "first", subjectName: "회계학" }, reference);
  assert.equal(classification.matchedBy, "subjectName");
  assert.equal(classification.subjectId, "first_accounting");
  assert.equal(classification.unitId, null);
  assert.ok(classification.allowedTaskTypes.includes("O/X"));
  assert.ok(classification.allowedTaskTypes.includes("accounting template"));
});

test("second exam unitId classification works for practice_income", () => {
  const classification = classifyLearningSignalToCurriculum({ examMode: "second", unitId: "practice_income" }, reference);
  assert.equal(classification.matchedBy, "unitId");
  assert.equal(classification.subjectId, "second_practice");
  assert.equal(classification.subjectName, "감정평가실무");
  assert.equal(classification.unitId, "practice_income");
  assert.deepEqual(classification.allowedTaskTypes.sort(), ["CASIO", "rewrite"].sort());
});

test("second exam subjectName classification works for 감정평가 및 보상법규", () => {
  const classification = classifyLearningSignalToCurriculum({ examMode: "second", subjectName: "감정평가 및 보상법규" }, reference);
  assert.equal(classification.matchedBy, "subjectName");
  assert.equal(classification.subjectId, "second_compensation_law");
  assert.equal(classification.unitId, null);
  assert.ok(classification.allowedTaskTypes.includes("issue spotting"));
  assert.ok(classification.allowedTaskTypes.includes("rewrite"));
});

test("unsupported examMode is rejected", () => {
  assert.throws(
    () => classifyLearningSignalToCurriculum({ examMode: "cpa", subjectName: "회계학" }, reference),
    /Unsupported examMode cpa/,
  );
});

test("wrong or unknown first exam signal recommends O/X or cloze", () => {
  const wrongTypes = taskTypesFor({ examMode: "first", unitId: "civil_general", result: "wrong" });
  const unknownTypes = taskTypesFor({ examMode: "first", unitId: "civil_general", result: "unknown" });
  assert.ok(wrongTypes.includes("O/X") || wrongTypes.includes("cloze"));
  assert.ok(unknownTypes.includes("O/X") || unknownTypes.includes("cloze"));
});

test("accounting first exam signal recommends accounting template when allowed", () => {
  const types = taskTypesFor({
    examMode: "first",
    unitId: "acct_inventory_lcm",
    taskType: "accounting_template",
    result: "wrong",
  });
  assert.ok(types.includes("accounting template"));
});

test("second exam needs_rewrite recommends rewrite", () => {
  const types = taskTypesFor({ examMode: "second", unitId: "practice_income", result: "needs_rewrite" });
  assert.ok(types.includes("rewrite"));
});

test("second exam CASIO signal recommends CASIO when allowed", () => {
  const fromSource = taskTypesFor({ examMode: "second", unitId: "practice_income", sourceType: "casio" });
  const fromAlias = taskTypesFor({ examMode: "second", unitId: "practice_income", taskType: "casio" });
  assert.ok(fromSource.includes("CASIO"));
  assert.ok(fromAlias.includes("CASIO"));
});

test("second exam law/theory signal can recommend issue spotting", () => {
  const lawTypes = taskTypesFor({ examMode: "second", subjectName: "감정평가 및 보상법규", missingIssueCandidate: "보상 쟁점 후보" });
  const theoryTypes = taskTypesFor({ examMode: "second", subjectName: "감정평가이론", confidence: "low" });
  assert.ok(lawTypes.includes("issue spotting"));
  assert.ok(theoryTypes.includes("issue spotting"));
});


test("candidate ids are unique for first exam wrong plus low confidence", () => {
  const ids = assertUniqueCandidateIds({
    examMode: "first",
    unitId: "civil_general",
    result: "wrong",
    confidence: "low",
  });
  assert.ok(ids.some((id) => id.includes("wrong_cloze")));
  assert.ok(ids.some((id) => id.includes("low_confidence_cloze")));
});

test("candidate ids are unique for first exam accounting wrong low confidence with accounting task", () => {
  const ids = assertUniqueCandidateIds({
    examMode: "first",
    unitId: "acct_inventory_lcm",
    taskType: "accounting_template",
    result: "wrong",
    confidence: "low",
  });
  assert.ok(ids.some((id) => id.includes("wrong_cloze")));
  assert.ok(ids.some((id) => id.includes("low_confidence_cloze")));
  assert.ok(ids.some((id) => id.includes("accounting_template")));
});

test("candidate ids are unique for second exam needs_rewrite plus low confidence", () => {
  const ids = assertUniqueCandidateIds({
    examMode: "second",
    unitId: "practice_income",
    result: "needs_rewrite",
    confidence: "low",
  });
  assert.ok(ids.some((id) => id.includes("needs_rewrite")));
  assert.ok(ids.some((id) => id.includes("structure_rewrite")));
});

test("candidate ids are unique for second exam CASIO plus weak structure point", () => {
  const ids = assertUniqueCandidateIds({
    examMode: "second",
    unitId: "practice_income",
    sourceType: "casio",
    weakStructurePoint: "계산 순서와 결론 문장 연결",
  });
  assert.ok(ids.some((id) => id.includes("casio_sequence")));
  assert.ok(ids.some((id) => id.includes("structure_rewrite")));
});

test("과락 risk raises candidate priority", () => {
  const classification = classifyLearningSignalToCurriculum({ examMode: "first", unitId: "civil_general" }, reference);
  const normalTop = recommendCurriculumTaskCandidates(classification, {
    examMode: "first",
    unitId: "civil_general",
    result: "wrong",
  })[0];
  const riskTop = recommendCurriculumTaskCandidates(classification, {
    examMode: "first",
    unitId: "civil_general",
    result: "wrong",
    isFailRiskSubject: true,
  })[0];
  assert.equal(normalTop.prioritySignals.includes("과락 위험"), false);
  assert.equal(riskTop.prioritySignals.includes("과락 위험"), true);
  assert.ok(riskTop.prioritySignals.length > normalTop.prioritySignals.length);
});

test("recent missed tasks produce recovery and no-shame rationale", () => {
  const action = buildCurriculumNextAction({
    examMode: "first",
    unitId: "civil_general",
    result: "missed",
    recentMissCount: 2,
  }, reference);
  const rationale = action.topCandidate?.rationale ?? "";
  assert.match(rationale, /놓친 항목|다시 회수|복습 여부/);
  assert.doesNotMatch(rationale, /실패|게으름|불합격|망했/);
  assert.ok(action.topCandidate?.prioritySignals.includes("recent missed tasks"));
});

test("todayPlanPreview never exceeds 3 primary tasks", () => {
  const action = buildCurriculumNextAction({
    examMode: "first",
    unitId: "acct_inventory_lcm",
    result: "wrong",
    confidence: "low",
    taskType: "accounting",
    isFailRiskSubject: true,
    recentMissCount: 3,
    daysUntilExam: 14,
  }, reference);
  assert.ok(action.candidates.length >= 3);
  assert.ok(action.todayPlanPreview.length <= 3);
  assert.ok(action.todayPlanPreview.every((candidate) => candidate.isPrimaryCandidate));
});

test("engine output includes draft verification warning while needsOfficialVerification is true", () => {
  const action = buildCurriculumNextAction({ examMode: "first", unitId: "acct_inventory_lcm" }, reference);
  assert.equal(action.classification.verificationStatus.isOfficiallyVerified, false);
  assert.ok(action.classification.warnings.includes(draftWarning));
});

test("no raw text fields are required or emitted", () => {
  const action = buildCurriculumNextAction({
    examMode: "second",
    unitId: "practice_income",
    result: "needs_rewrite",
    confidence: "low",
  }, reference);
  const serialized = JSON.stringify(action);
  for (const rawField of [
    "rawText",
    "rawOcrText",
    "ocrText",
    "userAnswerText",
    "answerText",
    "problemText",
    "questionText",
    "uploadedProblemText",
    "fullText",
  ]) {
    assert.equal(serialized.includes(rawField), false, `raw field emitted: ${rawField}`);
  }
  assert.equal(action.topCandidate?.taskType, "rewrite");
});

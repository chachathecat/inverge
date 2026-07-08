import test from "node:test";
import assert from "node:assert/strict";

import { buildCurriculumAnchoredCaptureSignal } from "../lib/review-os/curriculum-capture-integration.ts";
import { buildTodayPlanSourceUnion, compressUnifiedTodayPlanToMaxThree } from "../lib/review-os/today-plan-source-union.ts";

const forbiddenRawOrClaimPattern = /rawOcrText|ocrText|problemText|questionText|userAnswer|answerText|rawAnswerText|sourceText|copyrightedText|공식\s*채점|공식\s*정답|official\s*grading|official\s*score|score\s*prediction|점수\s*(?:예측|확정|보장)|pass\s*fail|합격\s*보장|model\s*answer|모범\s*답안/i;

function captureSignal(overrides = {}) {
  return buildCurriculumAnchoredCaptureSignal({
    userId: "u-capture",
    examMode: "first",
    subject: "민법",
    learnerText: "무효와 취소 효과를 헷갈림",
    mistakeReason: "개념 혼동",
    confidence: "낮음",
    captureSourceType: "manual",
    ...overrides,
  });
}

test("capture signal includes metadataOnly learningStateUpdateCandidate", () => {
  const signal = captureSignal();
  assert.equal(signal.metadataOnly, true);
  assert.equal(signal.sourceEventType, "capture");
  assert.equal(signal.conceptNodeId, "first_civil_nullity_rescission");
  assert.equal(signal.learningStateUpdateCandidate?.metadataOnly, true);
  assert.equal(signal.learningStateUpdateCandidate?.sourceEventType, "capture");
  assert.equal(signal.learningStateUpdateCandidate?.conceptNodeId, signal.conceptNodeId);
  assert.equal(signal.learningStateUpdateCandidate?.nextStatus, "confused");
});

test("no raw OCR/problem/answer/source fields appear in capture learning state output", () => {
  const signal = captureSignal({
    learnerText: "다음 문제 원문 rawOcrText problemText userAnswerText 무효 취소",
    derivedSummary: "요약만 사용",
  });
  assert.doesNotMatch(JSON.stringify(signal), forbiddenRawOrClaimPattern);
});

test("Review Queue candidate carries concept state target metadata", () => {
  const signal = captureSignal();
  assert.equal(signal.reviewQueueCandidate.conceptNodeId, signal.conceptNodeId);
  assert.equal(signal.reviewQueueCandidate.previousStatus, "unknown");
  assert.equal(signal.reviewQueueCandidate.targetStatus, "confused");
  assert.equal(signal.reviewQueueCandidate.sourceEventType, "capture");
  assert.ok(signal.reviewQueueCandidate.reviewPattern);
  assert.ok(signal.reviewQueueCandidate.dueAtCandidate);
  assert.equal(signal.reviewQueueCandidate.taskType, signal.nextTaskType);
});

test("Today Plan ranking prioritizes confident_wrong above generic new study", () => {
  const plan = buildTodayPlanSourceUnion({
    conceptGraphActions: [
      {
        id: "generic-new-study",
        examMode: "first",
        subjectId: "civil-law",
        unitId: "new-study",
        taskType: "concept_review",
        title: "민법 새 개념 회상",
        rationale: "새 학습 후보입니다.",
        primaryAction: "핵심어 1개 회상하기",
        estimatedMinutes: 10,
        prioritySignals: ["schedule_track_focus"],
        isPrimaryTask: true,
        metadataOnly: true,
      },
      {
        id: "confident-wrong",
        examMode: "first",
        subjectId: "civil-law",
        unitId: "wrong-state",
        taskType: "first_ox_retry",
        title: "민법 확신 오답 재시도",
        rationale: "확신하고 틀린 개념을 먼저 바로잡습니다.",
        primaryAction: "O/X 5문항 다시 풀기",
        estimatedMinutes: 10,
        prioritySignals: ["learning_state:confident_wrong", "confident_wrong_concept"],
        isPrimaryTask: true,
        metadataOnly: true,
      },
    ],
    context: { examMode: "first" },
  });
  assert.equal(plan[0].unitId, "wrong-state");
});

test("Today Plan remains max 3", () => {
  const actions = Array.from({ length: 5 }, (_, index) => ({
    id: `a-${index}`,
    source: "personal_concept_graph",
    examMode: "first",
    subjectId: "civil-law",
    unitId: `unit-${index}`,
    taskType: "first_ox_retry",
    title: `민법 항목 ${index}`,
    rationale: "예정된 복습 항목입니다.",
    primaryAction: "O/X 5문항 다시 풀기",
    estimatedMinutes: 10,
    prioritySignals: index === 0 ? ["learning_state:confident_wrong"] : ["learning_state:wrong"],
    isPrimaryTask: true,
    metadataOnly: true,
  }));
  const plan = compressUnifiedTodayPlanToMaxThree(actions);
  assert.equal(plan.length, 3);
});

test("OCR pending schedules OCR confirmation before concept practice", () => {
  const plan = compressUnifiedTodayPlanToMaxThree([
    {
      id: "practice",
      source: "personal_concept_graph",
      examMode: "first",
      subjectId: "civil-law",
      unitId: "same-unit-practice",
      taskType: "first_ox_retry",
      title: "민법 개념 재시도",
      rationale: "개념을 다시 확인합니다.",
      primaryAction: "O/X 5문항 다시 풀기",
      estimatedMinutes: 10,
      prioritySignals: ["learning_state:wrong"],
      isPrimaryTask: true,
      metadataOnly: true,
    },
    {
      id: "ocr-first",
      source: "review_queue",
      examMode: "first",
      subjectId: "civil-law",
      unitId: "same-unit-ocr",
      taskType: "ocr_confirmation",
      title: "OCR 확인",
      rationale: "인식 신뢰도가 낮아 먼저 확인합니다.",
      primaryAction: "OCR 숫자·용어 1개 확인하기",
      estimatedMinutes: 5,
      prioritySignals: ["ocr_confirmation_pending"],
      isPrimaryTask: true,
      metadataOnly: true,
    },
  ]);
  assert.equal(plan[0].taskType, "ocr_confirmation");
});

test("unsupported exam mode fails safely", () => {
  const signal = captureSignal({ examMode: "CPA" });
  assert.equal(signal.metadataOnly, true);
  assert.ok(signal.safeFallbackReason);
  assert.equal(signal.learningStateUpdateCandidate, null);
  assert.equal(signal.curriculumCandidates.length, 0);
});

test("no official grading/score/pass-fail/model-answer/합격보장 claims", () => {
  const signal = captureSignal();
  const plan = buildTodayPlanSourceUnion({ conceptGraphActions: [{
    id: "safe",
    examMode: "first",
    subjectId: "civil-law",
    unitId: "safe-unit",
    taskType: "first_ox_retry",
    title: "민법 재시도",
    rationale: "학습 상태를 바탕으로 다음 행동만 고정합니다.",
    primaryAction: "O/X 5문항 다시 풀기",
    estimatedMinutes: 10,
    prioritySignals: ["learning_state:wrong"],
    isPrimaryTask: true,
    metadataOnly: true,
  }] });
  assert.doesNotMatch(JSON.stringify({ signal, plan }), forbiddenRawOrClaimPattern);
});

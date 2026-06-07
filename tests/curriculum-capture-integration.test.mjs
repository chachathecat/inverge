import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCurriculumAnchoredCaptureSignal,
  toCurriculumAnchoredTodayPlanCandidate,
} from "../lib/review-os/curriculum-capture-integration.ts";
import { buildExplanationLadder, validateExplanationLadder } from "../lib/review-os/explanation-ladder.ts";
import { capTodayPlanTasks } from "../lib/review-os/study-schedule-engine.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const rawOrForbiddenPattern = /rawOcrText|raw_ocr_text|ocrText|problemText|questionText|rawQuestionText|userAnswerText|answerText|rawAnswerText|sourceText|copyrightedText|공식\s*채점|공식\s*정답|score|점수\s*(?:예측|확정|보장)|pass\s*fail|합격\s*보장|모범\s*답안|model\s*answer|instructor/i;

function firstSignal(overrides = {}) {
  return buildCurriculumAnchoredCaptureSignal({
    userId: "u1",
    examMode: "first",
    subject: "민법",
    learnerText: "무효와 취소 효과를 헷갈림",
    mistakeReason: "개념 혼동",
    confidence: "낮음",
    timeSpent: 5,
    captureSourceType: "manual",
    ...overrides,
  });
}

function secondSignal(overrides = {}) {
  return buildCurriculumAnchoredCaptureSignal({
    userId: "u2",
    examMode: "second",
    subject: "감정평가 및 보상법규",
    learnerText: "사업인정 처분성 권리구제 목차 누락",
    mistakeReason: "논점 누락",
    confidence: "중간",
    timeSpent: 10,
    captureSourceType: "manual",
    ...overrides,
  });
}

function recordWithCurriculumSignal(signal) {
  return {
    id: "item-curriculum",
    userId: "u1",
    dedupeKey: "d1",
    processingStatus: "completed",
    examName: signal.examMode === "second" ? "감정평가사 2차" : "감정평가사 1차",
    subjectLabel: signal.subject,
    sourceType: "manual",
    confidence: "낮음",
    createdFromCapture: true,
    rawPayload: { created_from_capture: true },
    derivedPayload: { curriculum_anchored_capture_signal: signal },
    createdAt: "2026-05-03T09:00:00.000Z",
    updatedAt: "2026-05-03T09:00:00.000Z",
  };
}

test("first 민법 무효/취소 capture returns first-mode curriculum candidate", () => {
  const signal = firstSignal();
  assert.equal(signal.metadataOnly, true);
  assert.equal(signal.examMode, "first");
  assert.equal(signal.primaryConceptNodeId, "first_civil_nullity_rescission");
  assert.ok(signal.curriculumCandidates.some((candidate) => candidate.id === "first_civil_nullity_rescission"));
  assert.match(signal.topicLabel, /무효|취소/);
  assert.match(signal.todayPlanCandidate.title, /민법 무효·취소 구분 5분 O\/X 재시도/);
});

test("first capture with 소요시간 5분 does not classify 시간 부족 unless explicitly stated", () => {
  const signal = firstSignal({ learnerText: "무효와 취소 소요시간 5분", mistakeReason: "개념 혼동" });
  assert.doesNotMatch(signal.gapLabel, /시간\s*부족|시간\s*관리/);
  assert.doesNotMatch(signal.todayPlanCandidate.title, /시간\s*부족/);
});

test("second 법규 사업인정 capture returns legal issue/rewrite candidate, not calculation skeleton", () => {
  const signal = secondSignal();
  assert.equal(signal.examMode, "second");
  assert.equal(signal.primaryConceptNodeId, "second_law_project_approval_disposition");
  assert.equal(signal.nextTaskType, "paragraph_rewrite");
  assert.match(signal.todayPlanCandidate.title, /법규 사업인정 처분성 문단 10분 다시쓰기/);
  assert.doesNotMatch(JSON.stringify(signal.curriculumCandidates), /casio_step|calculation_template/);
});

test("second 실무 calculation-like capture may return calculation/CASIO candidate", () => {
  const signal = secondSignal({
    subject: "감정평가실무",
    learnerText: "수익환원법 순수익 환원이율 계산 산식 검산 CASIO 순서가 불안정함",
    mistakeReason: "계산 근거 누락",
  });
  assert.equal(signal.primaryConceptNodeId, "second_practice_income_approach");
  assert.equal(signal.nextTaskType, "calculation_template");
  assert.ok(signal.curriculumCandidates[0].taskTypes.some((taskType) => /calculation_template|casio_step/.test(taskType)));
  assert.match(signal.todayPlanCandidate.title, /실무 수익환원법 적용과 검산 산식 검산 12분/);
});

test("second 이론 keyword-like capture returns theory/keyword/logic candidate", () => {
  const signal = secondSignal({
    subject: "감정평가이론",
    learnerText: "가치형성요인 가격원칙 키워드만 쓰고 논리 연결이 약함",
    mistakeReason: "키워드 논리 연결 부족",
  });
  assert.equal(signal.primaryConceptNodeId, "second_theory_value_formation");
  assert.equal(signal.nextTaskType, "theory_keyword");
  assert.match(signal.gapLabel, /키워드 논리/);
});

test("signal output is metadata-only and excludes raw/problem/answer and forbidden claim fields", () => {
  const signal = firstSignal({ learnerText: "다음 중 옳은 것은? 무효와 취소", derivedSummary: "내가 고른 답안 원문은 공유하지 않음" });
  assert.equal(signal.metadataOnly, true);
  assert.doesNotMatch(JSON.stringify(signal), rawOrForbiddenPattern);
  assert.ok(signal.primaryConceptNodeId || signal.safeFallbackReason);
});

test("output includes explanation ladder labels and validates full generated ladder", () => {
  const signal = secondSignal();
  assert.deepEqual(signal.explanationLadderSummary?.labels, ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"]);
  assert.equal(signal.explanationLadderSummary?.metadataOnly, true);
  const fullLadderSignal = buildCurriculumAnchoredCaptureSignal({
    userId: "u3",
    examMode: "second",
    subject: "감정평가 및 보상법규",
    learnerText: "사업인정 처분성",
    mistakeReason: "문단 구조 보강",
    confidence: "중간",
    captureSourceType: "manual",
  });
  assert.equal(fullLadderSignal.explanationLadderSummary?.tenSecondCheckLabel, "10초 확인");
  // Rebuild with the safe public labels to validate the same helper contract without exposing long text in Today Plan.
  const ladder = buildExplanationLadder({ conceptLabel: fullLadderSignal.topicLabel, subject: fullLadderSignal.subject, examMode: fullLadderSignal.examMode });
  assert.equal(validateExplanationLadder(ladder), true);
});

test("Today Plan candidate title is derived/action-style, not raw question text", () => {
  const rawQuestion = "다음 제시문을 읽고 사업인정의 처분성에 관하여 논하시오";
  const signal = secondSignal({ learnerText: `${rawQuestion} 사업인정 처분성 누락` });
  const candidate = toCurriculumAnchoredTodayPlanCandidate(signal);
  assert.match(candidate.title, /법규 사업인정 처분성 문단 10분 다시쓰기/);
  assert.notEqual(candidate.title, rawQuestion);
  assert.doesNotMatch(candidate.title, /다음 제시문|논하시오/);
});

test("Today Plan candidate is capped by capTodayPlanTasks and buildTodayPlanTasks", () => {
  const signal = firstSignal();
  assert.equal(capTodayPlanTasks([signal.todayPlanCandidate, { id: "2" }, { id: "3" }, { id: "4" }]).length, 3);
  const tasks = buildTodayPlanTasks({
    mode: "first",
    now: new Date("2026-05-03T12:00:00.000Z"),
    queue: [],
    items: [
      recordWithCurriculumSignal(signal),
      { ...recordWithCurriculumSignal(firstSignal({ userId: "u4", learnerText: "무효 취소 추인" })), id: "item-2" },
      { ...recordWithCurriculumSignal(firstSignal({ userId: "u5", learnerText: "무효 취소 제3자" })), id: "item-3" },
      { ...recordWithCurriculumSignal(firstSignal({ userId: "u6", learnerText: "무효 취소 소급" })), id: "item-4" },
    ],
  });
  assert.equal(tasks.length, 3);
  assert.match(tasks[0].title, /민법 무효·취소 구분 5분 O\/X 재시도/);
});

test("unsupported exam mode is rejected safely", () => {
  const signal = buildCurriculumAnchoredCaptureSignal({
    userId: "u7",
    examMode: "third",
    subject: "민법",
    learnerText: "무효 취소",
    mistakeReason: "개념",
    confidence: "낮음",
    captureSourceType: "manual",
  });
  assert.equal(signal.metadataOnly, true);
  assert.equal(signal.curriculumCandidates.length, 0);
  assert.ok(signal.safeFallbackReason);
  assert.equal(signal.explanationLadderSummary, null);
});

test("no official grading, score, pass-fail, model-answer, or 합격보장 claim", () => {
  const signal = secondSignal();
  assert.doesNotMatch(JSON.stringify(signal), rawOrForbiddenPattern);
});

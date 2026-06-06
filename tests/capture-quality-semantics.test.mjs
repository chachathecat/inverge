import assert from "node:assert/strict";
import test from "node:test";

import { generateWrongAnswerArtifacts } from "../lib/review-os/ai.ts";
import { buildCaptureNoteSignals } from "../lib/review-os/capture-note-engine.ts";
import { buildSecondAnswerRewriteSignal } from "../lib/review-os/second-answer-rewrite.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const base = {
  sourceType: "text",
  problemTitle: "민법 무효와 취소",
  correctAnswer: "X",
  userAnswer: "O",
  confidence: "중간",
};

test("first capture with 무효/취소 mistake ranks concept gap over time metadata", async () => {
  const input = {
    ...base,
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    rawQuestionText: "정답: X\n내 답: O\n틀린 이유: 무효와 취소를 구분하지 못함\n소요시간: 5분",
    userReasonText: "무효와 취소를 구분하지 못함",
    timeSpentSeconds: 300,
  };
  const note = buildCaptureNoteSignals("first", input);
  assert.match(note.one_biggest_gap, /무효.*취소|개념/);
  assert.doesNotMatch(note.one_biggest_gap, /시간\s*부족|time_management/);
  assert.match(note.one_next_action, /O\/X|10초|회상/);
  const artifacts = await generateWrongAnswerArtifacts(input);
  assert.notEqual(artifacts.tags.mistakeType, "시간 부족");
});

test("time spent is metadata only unless time management is explicit", () => {
  const note = buildCaptureNoteSignals("first", {
    ...base,
    examName: "감정평가사 1차",
    subjectLabel: "민법",
    userReasonText: "무효와 취소를 구분하지 못함",
    timeSpentSeconds: 300,
  });
  assert.equal(note.one_biggest_gap.includes("시간"), false);
});

test("second 법규 사업인정 uses legal skeleton, not calculation skeleton", () => {
  const signal = buildSecondAnswerRewriteSignal({
    examName: "감정평가사 2차",
    subjectLabel: "감정평가 및 보상법규",
    sourceType: "text",
    problemTitle: "사업인정",
    rawQuestionText: "사업인정의 처분성과 권리구제 관계",
    correctAnswer: "처분성, 항고소송, 수용재결 관계",
    userAnswer: "사업인정 요건만 씀",
    confidence: "중간",
  });
  assert.doesNotMatch(`${signal.missingIssueCandidate} ${signal.weakStructurePoint} ${signal.rewriteInstruction} ${signal.calculationRisk ?? ""}`, /계산 근거 누락|계산 → 결론/);
  assert.match(`${signal.missingIssueCandidate} ${signal.weakStructurePoint} ${signal.rewriteInstruction}`, /법적 성질|처분성|권리구제|사안 해결|항고소송|수용재결/);
});

test("second 실무 may use calculation skeleton and second 이론 uses keyword logic skeleton", () => {
  const practice = buildSecondAnswerRewriteSignal({
    examName: "감정평가사 2차",
    subjectLabel: "감정평가실무",
    sourceType: "text",
    rawQuestionText: "수익환원법 계산 산식 검산",
    correctAnswer: "산식",
    userAnswer: "답",
    confidence: "중간",
    missingIssue: "계산 근거 누락",
    supportedCalculatorTemplateId: "appraisal_income_capitalization",
  });
  assert.match(`${practice.missingIssueCandidate} ${practice.calculationRisk ?? ""}`, /계산|환원이율|근거/);

  const theory = buildSecondAnswerRewriteSignal({
    examName: "감정평가사 2차",
    subjectLabel: "감정평가이론",
    sourceType: "text",
    rawQuestionText: "시장가치 논리 비교",
    correctAnswer: "키워드 논리",
    userAnswer: "정의만 씀",
    confidence: "중간",
  });
  assert.match(`${theory.missingIssueCandidate} ${theory.weakStructurePoint} ${theory.rewriteInstruction}`, /키워드|논리|비교|원리|예시|평가/);
  assert.doesNotMatch(theory.nextRewriteAction, /O\/X/);
});

test("Today Plan primary tasks expose derived action summaries, never raw text fields, and keep max 3", () => {
  const tasks = buildTodayPlanTasks({
    mode: "first",
    now: new Date("2026-06-06T00:00:00.000Z"),
    queue: [0, 1, 2, 3].map((i) => ({
      queueId: `q${i}`,
      itemId: `i${i}`,
      examName: "감정평가사 1차",
      subjectLabel: "민법",
      problemTitle: `rawOcrText problemText questionText sourceText 저작권 원문 ${i}`,
      topicTag: i === 0 ? "무효 취소" : "개념",
      mistakeType: "무효와 취소 구분 / 개념 혼동",
      reviewReason: "오답 원인 기반 재시도",
      priorityScore: 100 - i,
      dueAt: "2026-06-05T00:00:00.000Z",
      recurrenceCount: 1,
      confidence: "중간",
      timeSpentSeconds: 300,
      createdFromCapture: true,
      itemCreatedAt: "2026-06-05T00:00:00.000Z",
      rawQuestionText: `rawAnswerText 원문 ${i}`,
    })),
  });
  const visible = tasks.slice(0, 3);
  assert.equal(visible.length, 3);
  assert.match(visible[0].title, /민법.*무효.*취소.*O\/X/);
  for (const task of visible) {
    assert.doesNotMatch(task.title, /rawOcrText|rawAnswerText|problemText|questionText|sourceText/);
  }
});

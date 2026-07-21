import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  SECOND_REWRITE_CASIO_UNSUPPORTED_MESSAGE,
  buildSecondAnswerRewriteSignal,
  getSecondCasioKeystrokeMapping,
} from "../lib/review-os/second-answer-rewrite.ts";
import { buildCaptureLearningSignal } from "../lib/review-os/capture-learning-signals.ts";
import { buildCaptureNoteSignals } from "../lib/review-os/capture-note-engine.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

test("learner 2차 rewrite signal shows one gap, one structure point, and one rewrite action", () => {
  const signal = buildSecondAnswerRewriteSignal({
    caseSummary: "수익환원법 사례",
    myAnswerSummary: "환원이율 적용 근거가 약함",
    missingIssue: "환원이율 산정 근거 누락",
    weakStructurePoint: "계산식과 결론이 한 문단에 섞임",
    rewriteInstruction: "환원이율 근거를 먼저 쓰고 산식과 결론을 분리해 다시 쓰기",
  });

  assert.equal(signal.caseSummary, "수익환원법 사례");
  assert.equal(signal.userAnswerSummary, "환원이율 적용 근거가 약함");
  assert.equal(signal.missingIssueCandidate, "환원이율 산정 근거 누락");
  assert.equal(signal.weakStructurePoint, "계산식과 결론이 한 문단에 섞임");
  assert.equal(signal.rewriteInstruction, "환원이율 근거를 먼저 쓰고 산식과 결론을 분리해 다시 쓰기");
  assert.equal(signal.nextRewriteAction, "10분 다시 쓰기");
  assert.equal(signal.rewriteTaskType, "second_answer_rewrite");
});

test("unsupported calculation does not show fabricated CASIO steps", () => {
  const mapping = getSecondCasioKeystrokeMapping("unsupported-template");
  assert.equal(mapping.supportedCalculatorTemplateId, null);
  assert.equal(mapping.casioKeystrokes, null);
  assert.equal(mapping.casioUnsupportedMessage, SECOND_REWRITE_CASIO_UNSUPPORTED_MESSAGE);
});

test("supported formula maps to deterministic CASIO FX-9860GIII keystrokes", () => {
  const mapping = getSecondCasioKeystrokeMapping("appraisal_income_capitalization");
  assert.equal(mapping.supportedCalculatorTemplateId, "appraisal_income_capitalization");
  assert.deepEqual(mapping.casioKeystrokes, ["MENU", "1:RUN-MAT", "AC/ON", "순영업소득", "÷", "환원이율", "EXE"]);
});

test("capture note includes CASIO keystrokes only from deterministic template data", () => {
  const supported = buildCaptureNoteSignals("second", {
    examName: "감정평가사 2차",
    subjectLabel: "감정평가실무",
    sourceType: "manual",
    correctAnswer: "-",
    userAnswer: "원답안",
    confidence: "중간",
    missingIssue: "단위 결론 누락",
    weakStructurePoint: "산식과 결론 분리 부족",
    rewriteInstruction: "산식 다음 결론 단위를 다시 쓰기",
    supportedCalculatorTemplateId: "appraisal_unit_price",
  });
  assert.deepEqual(supported.casio_keystrokes, ["MENU", "1:RUN-MAT", "AC/ON", "총액", "÷", "면적", "EXE"]);

  const unsupported = buildCaptureNoteSignals("second", {
    examName: "감정평가사 2차",
    subjectLabel: "감정평가실무",
    sourceType: "manual",
    correctAnswer: "-",
    userAnswer: "원답안",
    confidence: "중간",
    supportedCalculatorTemplateId: "llm-freeform",
  });
  assert.equal(unsupported.casio_keystrokes, null);
  assert.equal(unsupported.casio_unsupported_message, SECOND_REWRITE_CASIO_UNSUPPORTED_MESSAGE);
});

test("no raw answer/OCR text is copied into learning signal metadata", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "i-second",
    examName: "감정평가사 2차",
    subject: "감정평가실무",
    sourceType: "manual",
    confidence: "중간",
    missingIssue: "단위 누락",
    weakStructurePoint: "결론 분리 부족",
    rewriteInstruction: "결론 단위를 다시 쓰기",
    calculationRisk: "환원이율 입력 확인",
    unitRisk: "원/㎡ 확인",
    supportedCalculatorTemplateId: "appraisal_unit_price",
    createdFromCapture: true,
  });
  const metadata = JSON.stringify(signal.metadataJson);
  ["rawQuestionText", "rawAnswerText", "raw_ocr_text", "raw_extraction_json", "rewriteParagraph", "원답안", "문제 원문"].forEach((token) => {
    assert.equal(metadata.includes(token), false, `raw metadata leak: ${token}`);
  });
  assert.equal(signal.metadataJson.rewriteTaskType, "second_answer_rewrite");
  assert.equal(signal.metadataJson.supportedCalculatorTemplateId, "appraisal_unit_price");
});

test("service derived payload keeps rewrite metadata sanitized", async () => {
  const source = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(source.includes("missingIssueCandidate"));
  assert.ok(source.includes("weakStructurePoint"));
  assert.ok(source.includes("calculationRisk"));
  assert.ok(source.includes("unitRisk"));
  assert.ok(source.includes("rewriteTaskType"));
  assert.ok(source.includes("supportedCalculatorTemplateId"));
  assert.equal(source.includes("second_answer_rewrite_v1"), false);
});

test("Today Plan second_answer_rewrite routes to 10분 다시 쓰기 and stays capped at 3", () => {
  const tasks = buildTodayPlanTasks({
    mode: "second",
    queue: [0, 1, 2, 3].map((index) => ({
      queueId: `q-${index}`,
      itemId: `i-${index}`,
      examName: "감정평가사 2차",
      subjectLabel: "감정평가실무",
      problemTitle: `실무 답안 ${index}`,
      topicTag: "수익환원법",
      mistakeType: "누락",
      reviewReason: "문단 다시쓰기",
      dueAt: "2026-05-30T00:00:00.000Z",
      priorityScore: 90 - index,
      confidence: "중간",
      recurrenceCount: 1,
      itemCreatedAt: "2026-05-30T00:00:00.000Z",
      createdFromCapture: false,
    })),
    now: new Date("2026-05-31T00:00:00.000Z"),
  });

  assert.equal(tasks.length, 3);
  assert.equal(tasks[0].task_type, "second_answer_rewrite");
  assert.deepEqual(tasks[0].primary_cta, { label: "10분 다시 쓰기", hrefKind: "review" });
});

test("learner UI remains collapsed, mobile-first, and separated from instructor/grading claims", async () => {
  const source = await readFile(new URL("../components/review-os/today-session-runner.tsx", import.meta.url), "utf8");
  ["가장 큰 간극 1개", "약한 구조 ·", "문단 1개 다시쓰기", "10분 다시 쓰기", "계산/CASIO 세부 보기"].forEach((token) => {
    assert.ok(source.includes(token), `missing UI token: ${token}`);
  });
  assert.ok(source.includes("V3QuietDisclosure"));
  assert.ok(source.includes("SessionActionButton"));
  assert.equal(source.includes("overflow-x-auto"), false);
  ["/instructor", "학원용", "공식 채점", "공식 모범답안", "공식 점수", "pass/fail", "합격/불합격"].forEach((token) => {
    assert.equal(source.includes(token), false, `forbidden UI token: ${token}`);
  });
});

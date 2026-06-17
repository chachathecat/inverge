import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildCaptureNoteDisplayCopy, buildCaptureNoteSummary } from "../lib/review-os/capture-note-display-copy.ts";
import { buildTodayPlanCandidateFromCaptureMetadata } from "../lib/review-os/capture-learning-signal-bridge.ts";

const forbiddenRawOutputKeys = [
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "copyrightedText",
  "originalText",
  "fullText",
  "sourceText",
];
const forbiddenClaims = ["공식 채점", "공식 점수 예측", "공식 모범 답안", "official grading", "official score prediction", "official model answer"];
const forbiddenTone = ["실패자", "게으름", "망했", "불합격 확정", "지금 안 하면 끝", "부끄럽", "순위 하락", "streak", "casino", "gacha", "랜덤 보상"];
const forbiddenSurfaces = ["결제", "payment", "archive", "아카이브", "native app", "네이티브 앱", "instructor", "/instructor", "학원용", "강사"];
const unsupportedExamCopy = ["보험계리사", "계리사", "CPA", "세무사", "TOEFL", "SAT", "universal exam", "multi-exam"];

function read(file) {
  return readFileSync(file, "utf8");
}

function serialized(value) {
  return JSON.stringify(value, null, 2);
}

function assertCleanOutput(value) {
  const text = serialized(value);
  for (const forbidden of [...forbiddenRawOutputKeys, ...forbiddenClaims, ...forbiddenTone, ...forbiddenSurfaces, ...unsupportedExamCopy]) {
    assert.equal(text.includes(forbidden), false, `${forbidden} must not appear in learner output`);
  }
}

function baseSummary(overrides = {}) {
  return {
    examMode: "first",
    subject: "민법",
    sourceType: "photo",
    capturedTextStatus: "draft",
    oneBiggestGap: "법률행위 요건을 헷갈렸습니다.",
    nextAction: "O/X 5문항으로 기준을 다시 고정합니다.",
    nextTaskType: "O/X",
    confidence: "중간",
    timeSpentMinutes: 35,
    derivedSignals: ["capture_note", "review_queue_candidate", "today_plan_candidate"],
    ...overrides,
  };
}

test("capture page and form keep capture-first learner copy with one primary starting action", () => {
  const route = read("app/app/capture/page.tsx");
  const form = read("components/review-os/capture-form.tsx");
  const combined = `${route}\n${form}`;

  for (const required of [
    "오늘 한 것 올리기",
    "텍스트로 바로 시작하고, 사진/PDF는 필요할 때만 추가하세요.",
    "텍스트로 시작",
    "학습 노트 초안 만들기",
    "촬영하거나 업로드한 뒤 OCR 초안을 직접 확인합니다.",
    "OCR/AI 정리는 초안입니다. 저장 전 직접 확인해 주세요.",
    "학습 노트 / 복습 / 오늘 할 일로 이어질 가장 큰 약점 1개와 다음 행동 1개가 만들어집니다.",
  ]) {
    assert.equal(combined.includes(required), true, `${required} copy should exist`);
  }
  assert.equal(form.includes("이미지/PDF로 입력하기"), false, "photo/PDF input copy should not be duplicated");
  assert.doesNotMatch(form, /기준\s*답안|기준답안|모범답안|공식답안|정답 확정|최종 판단/);

  assert.equal(form.includes("canQuickSave"), true, "secondary generate action should be hidden at the empty starting point");
  assert.equal(form.includes("data-testid=\"capture-note-summary\""), true, "capture result summary should be rendered after structure/confirmation");
  for (const forbidden of [...forbiddenClaims, ...forbiddenTone, ...forbiddenSurfaces, ...unsupportedExamCopy]) {
    assert.equal(combined.includes(forbidden), false, `${forbidden} must not appear on the learner capture surface`);
  }
});

test("capture summary exposes one biggest gap, one next action, confidence, time, and metadataOnly status", () => {
  const summary = buildCaptureNoteSummary(baseSummary());
  assert.equal(summary.examMode, "first");
  assert.equal(summary.subject, "민법");
  assert.equal(summary.sourceType, "photo");
  assert.equal(summary.capturedTextStatus, "draft");
  assert.equal(summary.oneBiggestGap, "법률행위 요건을 헷갈렸습니다.");
  assert.equal(summary.nextAction, "O/X 5문항으로 기준을 다시 고정합니다.");
  assert.equal(summary.nextTaskType, "O/X");
  assert.equal(summary.confidence, "중간");
  assert.equal(summary.timeSpentMinutes, 35);
  assert.equal(summary.metadataOnly, true);
  assert.ok(summary.derivedSignals.includes("review_queue_candidate"));
  assertCleanOutput(summary);
});

test("capture display copy is calm, learner-facing, and action-oriented", () => {
  const summary = buildCaptureNoteSummary(baseSummary({ capturedTextStatus: "user_confirmed" }));
  const copy = buildCaptureNoteDisplayCopy(summary);

  assert.equal(copy.gapLabel, "가장 큰 약점: 법률행위 요건을 헷갈렸습니다.");
  assert.equal(copy.nextActionLabel, "다음 행동: O/X 5문항으로 기준을 다시 고정합니다.");
  assert.equal(copy.saveCta, "저장하고 오늘 할 일에 반영");
  assert.equal(copy.todayPlanCta, "오늘 할 일에 반영");
  assert.equal(copy.retryOrRewriteCta, "다시 풀기");
  assertCleanOutput(copy);
});

test("capture-derived metadata can feed Review Queue and Today Plan helpers without raw fields", () => {
  const result = buildTodayPlanCandidateFromCaptureMetadata({
    examMode: "first",
    subjectName: "민법",
    unitName: "법률행위",
    captureSource: "photo",
    captureIntent: "wrong_answer",
    resultHint: "wrong",
    confidence: "low",
    taskType: "O/X",
    timeSpentMinutes: 30,
  });

  assert.equal(result.learningSignal.executionSource, "capture");
  assert.equal(result.reviewQueueItem?.metadataOnly, true);
  assert.ok(result.todayPlanCandidates.length > 0);
  assert.ok(result.todayPlanCandidates.length <= 3);
  assert.ok(result.todayPlanCandidates.every((candidate) => candidate.metadataOnly === true));
  assertCleanOutput(result);
});

test("capture note summary rejects raw OCR/problem/answer fields and unsupported exams", () => {
  for (const key of forbiddenRawOutputKeys) {
    assert.throws(() => buildCaptureNoteSummary({ ...baseSummary(), [key]: "private text" }), /metadata only/);
  }

  for (const examMode of ["actuary", "cpa", "tax", "toefl", "sat"]) {
    assert.throws(() => buildCaptureNoteSummary({ ...baseSummary(), examMode }), /Unsupported capture note examMode/);
  }

  assert.equal(buildCaptureNoteSummary(baseSummary({ examMode: "second", subject: "감정평가이론", sourceType: "pdf", nextTaskType: "rewrite" })).examMode, "second");
});

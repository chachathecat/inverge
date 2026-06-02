import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildLearningSignalFromExecutionResult,
  buildNextPlanSignalFromExecution,
  buildReviewCandidateFromExecutionSignal,
} from "../lib/review-os/execution-learning-signal.ts";

const componentUrl = new URL("../components/review-os/execution-result-controls.tsx", import.meta.url);

function signalFor(result, overrides = {}) {
  return buildLearningSignalFromExecutionResult({
    examMode: "second",
    taskType: "rewrite",
    subjectName: "감정평가이론",
    unitName: "정의와 사례 적용",
    executionSource: "session",
    result,
    ...overrides,
  });
}

function textOf(value) {
  return JSON.stringify(value);
}

test("component source includes the five lightweight result controls", async () => {
  const source = await readFile(componentUrl, "utf8");

  for (const label of ["완료", "틀림", "모르겠음", "다시쓰기 필요", "나중에"]) {
    assert.equal(source.includes(`label: \"${label}\"`), true, `missing control: ${label}`);
  }

  for (const result of ["done", "wrong", "unknown", "needs_rewrite", "skipped"]) {
    assert.equal(source.includes(`result: \"${result}\"`), true, `missing result mapping: ${result}`);
  }

  assert.match(source, /buildLearningSignalFromExecutionResult/);
  assert.match(source, /buildReviewCandidateFromExecutionSignal/);
  assert.match(source, /buildNextPlanSignalFromExecution/);
});

test("component does not expose instructor, payment, archive, native-app, official grading, or result-number copy", async () => {
  const source = await readFile(componentUrl, "utf8");

  for (const forbidden of [
    "/instructor",
    "학원용",
    "강사",
    "결제",
    "payment",
    "archive",
    "아카이브",
    "native app",
    "네이티브 앱",
    "공식 채점",
    "공식 점수",
    "score",
  ]) {
    assert.equal(source.includes(forbidden), false, `forbidden copy found: ${forbidden}`);
  }
});

test("done maps to completed feedback without extra candidate pressure", () => {
  const signal = signalFor("done");
  const candidate = buildReviewCandidateFromExecutionSignal(signal);
  const nextPlan = buildNextPlanSignalFromExecution(signal);

  assert.equal(signal.derivedStatus, "completed");
  assert.match(signal.feedbackCopy, /완료 기록/);
  assert.equal(candidate, null);
  assert.deepEqual(nextPlan.candidates, []);
});

test("wrong maps to review feedback", () => {
  const signal = signalFor("wrong");
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "needs_review");
  assert.match(signal.feedbackCopy, /복습|다시 써/);
  assert.equal(candidate?.candidateType, "review");
});

test("unknown maps to review feedback", () => {
  const signal = signalFor("unknown", { taskType: "issue spotting" });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "needs_review");
  assert.match(signal.feedbackCopy, /쟁점|복습/);
  assert.equal(candidate?.candidateType, "review");
});

test("needs_rewrite maps to rewrite feedback", () => {
  const signal = signalFor("needs_rewrite");
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "needs_rewrite");
  assert.match(signal.feedbackCopy, /다시쓰기|고쳐 쓰/);
  assert.equal(candidate?.candidateType, "rewrite");
  assert.equal(candidate?.taskType, "rewrite");
});

test("skipped later maps to recovery feedback", () => {
  const signal = signalFor("skipped");
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "recovery");
  assert.match(signal.feedbackCopy, /괜찮아요|복구|부담/);
  assert.equal(candidate?.candidateType, "recovery");
});

test("no raw text fields are required or emitted by result controls", async () => {
  const source = await readFile(componentUrl, "utf8");
  const signal = signalFor("wrong");
  const serialized = `${source}\n${textOf(signal)}\n${textOf(buildReviewCandidateFromExecutionSignal(signal))}`;

  assert.equal(/<textarea|<input/i.test(source), false, "result controls should not ask for text fields");

  for (const rawField of [
    "rawQuestionText",
    "rawText",
    "rawOcrText",
    "ocrText",
    "userAnswer",
    "userAnswerText",
    "answerText",
    "problemText",
    "questionText",
    "uploadedProblemText",
    "fullText",
    "copyrightedText",
  ]) {
    assert.equal(serialized.includes(rawField), false, `raw field found: ${rawField}`);
  }
});

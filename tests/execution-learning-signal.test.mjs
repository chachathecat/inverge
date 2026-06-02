import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildLearningSignalFromExecutionResult,
  buildNextPlanSignalFromExecution,
  buildReviewCandidateFromExecutionSignal,
} from "../lib/review-os/execution-learning-signal.ts";

function build(overrides = {}) {
  return buildLearningSignalFromExecutionResult({
    examMode: "first",
    taskType: "O/X",
    subjectName: "민법",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    ...overrides,
  });
}

function textOf(value) {
  return JSON.stringify(value);
}

function assertSecondRewriteFollowUpCopy(candidate) {
  assert.equal(candidate?.taskType, "rewrite");
  assert.equal(candidate?.title.includes("O/X"), false);
  assert.equal(candidate?.primaryAction.includes("O/X"), false);
  assert.match(candidate?.title ?? "", /다시쓰기|답안/);
  assert.match(candidate?.primaryAction ?? "", /다시쓰기|답안/);
}

test("wrong O/X creates needs_review signal and review candidate", () => {
  const signal = build({ taskType: "O/X", result: "wrong" });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "needs_review");
  assert.equal(signal.nextRecommendedTaskType, "O/X");
  assert.equal(signal.reviewDueHint, "tomorrow");
  assert.ok(signal.prioritySignals.includes("review_candidate"));
  assert.equal(candidate?.candidateType, "review");
  assert.equal(candidate?.taskType, "O/X");
  assert.match(candidate?.primaryAction ?? "", /O\/X/);
});

test("unknown cloze creates needs_review signal", () => {
  const signal = build({ taskType: "cloze", result: "unknown" });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "needs_review");
  assert.equal(signal.nextRecommendedTaskType, "cloze");
  assert.equal(candidate?.taskType, "cloze");
  assert.match(signal.feedbackCopy, /빈칸|핵심어/);
});

test("accounting template wrong creates accounting review candidate", () => {
  const signal = build({ taskType: "accounting template", subjectName: "회계학", result: "wrong" });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.nextRecommendedTaskType, "accounting template");
  assert.ok(signal.prioritySignals.includes("accounting_template_review"));
  assert.equal(candidate?.taskType, "accounting template");
  assert.match(candidate?.title ?? "", /회계|계산틀/);
});

test("second rewrite needs_rewrite creates rewrite candidate", () => {
  const signal = build({
    examMode: "second",
    taskType: "rewrite",
    subjectName: "감정평가 및 보상법규",
    result: "needs_rewrite",
  });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "needs_rewrite");
  assert.equal(signal.nextRecommendedTaskType, "rewrite");
  assert.equal(candidate?.candidateType, "rewrite");
  assert.equal(candidate?.taskType, "rewrite");
  assert.match(candidate?.primaryAction ?? "", /다시쓰기/);
});


test("second rewrite wrong uses rewrite follow-up copy without O/X labels", () => {
  const signal = build({
    examMode: "second",
    taskType: "rewrite",
    subjectName: "감정평가 및 보상법규",
    result: "wrong",
  });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.nextRecommendedTaskType, "rewrite");
  assertSecondRewriteFollowUpCopy(candidate);
});

test("second rewrite unknown uses rewrite follow-up copy without O/X labels", () => {
  const signal = build({
    examMode: "second",
    taskType: "rewrite",
    subjectName: "감정평가 및 보상법규",
    result: "unknown",
  });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.nextRecommendedTaskType, "rewrite");
  assertSecondRewriteFollowUpCopy(candidate);
});

test("second CASIO wrong creates CASIO/calculator recovery candidate", () => {
  const signal = build({
    examMode: "second",
    taskType: "CASIO",
    subjectName: "감정평가실무",
    result: "wrong",
  });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);

  assert.equal(signal.derivedStatus, "needs_review");
  assert.equal(signal.nextRecommendedTaskType, "CASIO");
  assert.ok(signal.prioritySignals.includes("calculator_recovery"));
  assert.equal(candidate?.taskType, "CASIO");
  assert.match(textOf(candidate), /CASIO|계산기/);
});

test("issue spotting unknown creates issue/rewrite candidate", () => {
  const signal = build({
    examMode: "second",
    taskType: "issue spotting",
    subjectName: "감정평가이론",
    result: "unknown",
  });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);
  const nextPlan = buildNextPlanSignalFromExecution(signal);

  assert.equal(signal.nextRecommendedTaskType, "issue spotting");
  assert.ok(signal.prioritySignals.includes("issue_spotting_gap"));
  assert.equal(candidate?.taskType, "issue spotting");
  assert.ok(nextPlan.candidates.some((entry) => entry.taskType === "rewrite"));
});

test("skipped uses no-shame recovery copy", () => {
  const signal = build({ result: "skipped", taskType: "O/X" });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);
  const serialized = textOf({ signal, candidate });

  assert.equal(signal.derivedStatus, "recovery");
  assert.equal(candidate?.candidateType, "recovery");
  assert.match(signal.feedbackCopy, /괜찮아요|부담|복구/);
  for (const forbidden of ["게으름", "망했", "불합격", "실패자", "부끄럽", "공포", "큰일"]) {
    assert.equal(serialized.includes(forbidden), false, `shame/fear copy found: ${forbidden}`);
  }
});

test("done creates completion signal without over-recommending", () => {
  const signal = build({ result: "done", confidence: "high" });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);
  const nextPlan = buildNextPlanSignalFromExecution(signal);

  assert.equal(signal.derivedStatus, "completed");
  assert.equal(signal.reviewDueHint, "none");
  assert.equal(signal.nextRecommendedTaskType, undefined);
  assert.equal(candidate, null);
  assert.deepEqual(nextPlan.candidates, []);
});

test("과락 risk adds priority signal", () => {
  const signal = build({ isFailRiskSubject: true });
  assert.ok(signal.prioritySignals.includes("fail_risk_subject"));
  assert.equal(signal.reviewDueHint, "soon");
});

test("exam proximity adds priority signal", () => {
  const signal = build({ daysUntilExam: 14 });
  assert.ok(signal.prioritySignals.includes("exam_proximity"));
  assert.equal(signal.reviewDueHint, "soon");
});

test("no raw text fields are accepted or emitted", () => {
  assert.throws(
    () => build({ questionText: "저작권 있는 문제 원문", answerText: "내 답안 원문" }),
    /Raw text field is not accepted/,
  );

  const signal = build({ unitName: "채권 총론" });
  const candidate = buildReviewCandidateFromExecutionSignal(signal);
  const nextPlan = buildNextPlanSignalFromExecution(signal);
  const serialized = textOf({ signal, candidate, nextPlan });

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
    "copyrightedText",
  ]) {
    assert.equal(serialized.includes(rawField), false, `raw field emitted: ${rawField}`);
  }
});

test("no instructor/payment/archive/native-app copy is introduced", async () => {
  const source = await readFile(new URL("../lib/review-os/execution-learning-signal.ts", import.meta.url), "utf8");
  const signal = build({ result: "unknown" });
  const serialized = `${source}\n${textOf(signal)}\n${textOf(buildReviewCandidateFromExecutionSignal(signal))}`;

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
  ]) {
    assert.equal(serialized.includes(forbidden), false, `forbidden copy found: ${forbidden}`);
  }
});

test("Today Plan compatibility: next plan signal returns at most 3 candidates if candidates are emitted", () => {
  for (const signal of [
    build({ taskType: "accounting template", subjectName: "회계학" }),
    build({ examMode: "second", taskType: "issue spotting", result: "unknown" }),
    build({ examMode: "second", taskType: "CASIO", result: "wrong" }),
    build({ result: "skipped" }),
  ]) {
    const nextPlan = buildNextPlanSignalFromExecution(signal);
    assert.ok(nextPlan.candidates.length <= 3);
    if (signal.derivedStatus !== "completed") assert.ok(nextPlan.candidates.length >= 1);
  }
});

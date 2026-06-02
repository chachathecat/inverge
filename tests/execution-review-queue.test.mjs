import test from "node:test";
import assert from "node:assert/strict";

import {
  assertNoForbiddenCopy,
  assertNoRawTextKeys,
  buildReviewQueueItemFromExecutionSignal,
  buildReviewQueueItemsFromExecutionResults,
  buildStableReviewQueueItemId,
  calculateReviewQueuePriorityScore,
  mergeExecutionReviewCandidate,
  rankExecutionReviewQueueItems,
} from "../lib/review-os/execution-review-queue.ts";
import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";

function buildInput(overrides = {}) {
  return {
    examMode: "first",
    taskType: "O/X",
    subjectId: "civil-law",
    subjectName: "민법",
    unitId: "civil-law-general",
    unitName: "민법 총칙",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    ...overrides,
  };
}

function itemFrom(overrides = {}) {
  const signal = buildLearningSignalFromExecutionResult(buildInput(overrides));
  return buildReviewQueueItemFromExecutionSignal(signal);
}

function textOf(value) {
  return JSON.stringify(value);
}

function assertNoOxCopy(item) {
  assert.equal(item.title.includes("O/X"), false);
  assert.equal(item.primaryAction.includes("O/X"), false);
}

test("wrong O/X creates review queue item", () => {
  const item = itemFrom({ taskType: "O/X", result: "wrong" });

  assert.equal(item?.source, "execution_result");
  assert.equal(item?.sourceResult, "wrong");
  assert.equal(item?.taskType, "O/X");
  assert.equal(item?.dueBucket, "tomorrow");
  assert.ok(item?.prioritySignals.includes("review_candidate"));
  assert.match(item?.title ?? "", /O\/X|복습/);
});

test("unknown cloze creates review queue item", () => {
  const item = itemFrom({ taskType: "cloze", result: "unknown" });

  assert.equal(item?.sourceResult, "unknown");
  assert.equal(item?.taskType, "cloze");
  assert.equal(item?.dueBucket, "three_days");
  assert.match(textOf(item), /빈칸|핵심어/);
});

test("accounting template wrong creates accounting review queue item", () => {
  const item = itemFrom({ taskType: "accounting template", subjectName: "회계학", result: "wrong" });

  assert.equal(item?.taskType, "accounting template");
  assert.ok(item?.prioritySignals.includes("accounting_template_review"));
  assert.match(textOf(item), /회계|계산틀/);
});

test("second rewrite wrong creates rewrite item without first-exam O/X copy", () => {
  const item = itemFrom({
    examMode: "second",
    taskType: "rewrite",
    subjectName: "감정평가이론",
    unitName: "논점 구성",
    result: "wrong",
  });

  assert.equal(item?.examMode, "second");
  assert.equal(item?.taskType, "rewrite");
  assert.ok(item?.prioritySignals.includes("review_candidate"));
  assert.match(item?.title ?? "", /다시쓰기|답안/);
  assert.ok(item);
  assertNoOxCopy(item);
});

test("second rewrite unknown behaves the same without O/X copy", () => {
  const item = itemFrom({ examMode: "second", taskType: "rewrite", subjectName: "감정평가이론", result: "unknown" });

  assert.equal(item?.sourceResult, "unknown");
  assert.equal(item?.taskType, "rewrite");
  assert.ok(item);
  assertNoOxCopy(item);
});

test("second CASIO wrong creates CASIO item", () => {
  const item = itemFrom({ examMode: "second", taskType: "CASIO", subjectName: "감정평가실무", result: "wrong" });

  assert.equal(item?.taskType, "CASIO");
  assert.ok(item?.prioritySignals.includes("calculator_recovery"));
  assert.match(`${item?.title} ${item?.primaryAction}`, /CASIO|계산기/);
});

test("second issue spotting unknown creates issue spotting item", () => {
  const item = itemFrom({ examMode: "second", taskType: "issue spotting", subjectName: "감정평가 및 보상법규", result: "unknown" });

  assert.equal(item?.taskType, "issue spotting");
  assert.ok(item?.prioritySignals.includes("issue_spotting_gap"));
  assert.match(textOf(item), /쟁점/);
});

test("needs_rewrite creates rewrite item", () => {
  const item = itemFrom({ examMode: "second", taskType: "rewrite", result: "needs_rewrite" });

  assert.equal(item?.sourceResult, "needs_rewrite");
  assert.equal(item?.taskType, "rewrite");
  assert.ok(item?.prioritySignals.includes("rewrite_candidate"));
});

test("skipped creates recovery item with no-shame copy", () => {
  const item = itemFrom({ taskType: "cloze", result: "skipped" });

  assert.equal(item?.sourceResult, "skipped");
  assert.ok(item?.prioritySignals.includes("recovery_candidate"));
  assert.match(textOf(item), /괜찮아요|복구|다시 시작/);
  for (const forbidden of ["실패자", "게으름", "망했", "불합격", "공포", "부끄럽"]) {
    assert.equal(textOf(item).includes(forbidden), false);
  }
});

test("done creates no review item", () => {
  const item = itemFrom({ result: "done", confidence: "high" });
  assert.equal(item, null);
});

test("wrong near exam creates dueBucket soon", () => {
  const item = itemFrom({ result: "wrong", daysUntilExam: 10 });

  assert.equal(item?.dueHint, "soon");
  assert.equal(item?.dueBucket, "soon");
  assert.ok(item?.prioritySignals.includes("exam_proximity"));
});

test("fail risk adds priority and raises score", () => {
  const baseline = itemFrom({ result: "wrong" });
  const failRisk = itemFrom({ result: "wrong", isFailRiskSubject: true });

  assert.ok(failRisk?.prioritySignals.includes("fail_risk_subject"));
  assert.ok((failRisk?.priorityScore ?? 0) > (baseline?.priorityScore ?? 0));
  assert.equal(calculateReviewQueuePriorityScore(failRisk), failRisk?.priorityScore);
});

test("unknown not near exam can produce three_days or later due bucket according to signal rules", () => {
  const item = itemFrom({ result: "unknown", daysUntilExam: 120 });

  assert.ok(item?.dueBucket === "three_days" || item?.dueBucket === "one_week");
});

test("rankExecutionReviewQueueItems puts soon before later buckets", () => {
  const later = itemFrom({ result: "unknown", daysUntilExam: 120 });
  const soon = itemFrom({ result: "wrong", daysUntilExam: 3, unitId: "near-exam" });
  assert.ok(later && soon);

  const ranked = rankExecutionReviewQueueItems([later, soon]);
  assert.equal(ranked[0].id, soon.id);
});

test("duplicate merge keeps stable id and merges priority signals", () => {
  const existing = itemFrom({ result: "unknown" });
  const rawIncoming = itemFrom({ result: "unknown", daysUntilExam: 8, isFailRiskSubject: true });
  assert.ok(existing && rawIncoming);
  const incoming = { ...rawIncoming, id: existing.id };

  const merged = mergeExecutionReviewCandidate(existing, incoming);
  assert.equal(merged.id, existing.id);
  assert.ok(merged.prioritySignals.includes("exam_proximity"));
  assert.ok(merged.prioritySignals.includes("fail_risk_subject"));
  assert.equal(merged.dueBucket, "soon");
  assert.doesNotThrow(() => assertNoRawTextKeys(merged));
});

test("duplicate merge preserves second-exam rewrite copy without O/X", () => {
  const existing = itemFrom({ examMode: "second", taskType: "rewrite", result: "unknown" });
  const incoming = itemFrom({ examMode: "second", taskType: "rewrite", result: "unknown", daysUntilExam: 2 });
  assert.ok(existing && incoming);

  const merged = mergeExecutionReviewCandidate(existing, incoming);
  assert.equal(merged.examMode, "second");
  assertNoOxCopy(merged);
});

test("raw/problem/answer/OCR text keys are rejected", () => {
  assert.throws(
    () => buildReviewQueueItemsFromExecutionResults([buildInput({ problemText: "원문", userAnswerText: "답안" })]),
    /Raw text field is not accepted/,
  );
  assert.throws(() => assertNoRawTextKeys({ rawOcrText: "원문" }), /Raw text field is not accepted/);
});

test("emitted review queue items do not include raw text fields", () => {
  const items = buildReviewQueueItemsFromExecutionResults([buildInput({ result: "wrong" })]);

  assert.equal(items.length, 1);
  const serialized = textOf(items[0]);
  for (const rawField of [
    "rawText",
    "rawOcrText",
    "ocrText",
    "userAnswer",
    "answerText",
    "problemText",
    "questionText",
    "sourceText",
    "copyrightedText",
    "originalText",
  ]) {
    assert.equal(serialized.includes(rawField), false, `raw field emitted: ${rawField}`);
  }
});

test("stable id does not include problem/user answer text", () => {
  const signal = buildLearningSignalFromExecutionResult(buildInput({ subjectName: "문제 원문 아님", unitName: "안전 메타" }));
  const id = buildStableReviewQueueItemId(signal);

  assert.equal(id.includes("저작권 있는 문제"), false);
  assert.equal(id.includes("내 답안"), false);
  assert.match(id, /^execution-result:/);
});

test("no instructor/payment/archive/native-app copy is introduced", () => {
  const item = itemFrom({ result: "unknown" });
  assert.doesNotThrow(() => assertNoForbiddenCopy(item));

  for (const forbidden of ["instructor", "/instructor", "결제", "payment", "archive", "아카이브", "native app", "네이티브 앱"]) {
    assert.equal(textOf(item).includes(forbidden), false);
  }
});

test("buildReviewQueueItemsFromExecutionResults returns Today Plan compatible review items", () => {
  const items = buildReviewQueueItemsFromExecutionResults([
    buildInput({ result: "wrong", unitId: "u1" }),
    buildInput({ result: "unknown", taskType: "cloze", unitId: "u2" }),
    buildInput({ result: "needs_rewrite", examMode: "second", taskType: "rewrite", unitId: "u3" }),
    buildInput({ result: "skipped", taskType: "O/X", unitId: "u4" }),
    buildInput({ result: "done", unitId: "u5" }),
  ]);

  assert.equal(items.length, 4);
  for (const item of items) {
    assert.equal(item.source, "execution_result");
    assert.equal(item.createdFromDerivedSignal, true);
    assert.equal(typeof item.primaryAction, "string");
    assert.ok(item.primaryAction.length > 0);
  }
  assert.ok(items.slice(0, 3).length <= 3);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildCaptureLearningSignal,
  buildCaptureReviewReason,
  computeCaptureQueuePriority,
  resolveCaptureExamMode,
} from "../lib/review-os/capture-learning-signals.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

test("buildCaptureLearningSignal creates first-mode signal safely", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "i1", examName: "감정평가사 1차", subject: "민법", sourceType: "manual", confidence: "낮음", timeSpentSeconds: 190,
    biggestGap: "개념 누락", nextAction: "같은 개념 3문제 다시 풀기", mistakeReason: "개념", keyConcepts: ["취소"], createdFromCapture: true,
  });
  assert.ok(signal.derivedTags.includes("objective_mistake"));
  assert.ok(signal.derivedTags.includes("review_needed"));
  assert.equal(signal.nextTaskType, "retry");
  const metadata = JSON.stringify(signal.metadataJson);
  assert.equal(/rawQuestionText|rawAnswerText|raw_ocr_text|raw_extraction_json/.test(metadata), false);
});

test("buildCaptureLearningSignal creates second-mode signal safely", () => {
  const signal = buildCaptureLearningSignal({
    itemId: "i2", examName: "감정평가사 2차", subject: "감정평가이론", sourceType: "manual", confidence: "중간",
    missingIssue: "논점 누락", weakStructurePoint: "목차 불안정", rewriteInstruction: "목차를 먼저 다시 잡기", createdFromCapture: true,
  });
  assert.ok(signal.derivedTags.includes("answer_structure"));
  assert.ok(signal.derivedTags.includes("rewrite_needed"));
  assert.ok(signal.derivedTags.includes("issue_missing") || signal.derivedTags.includes("structure_gap"));
});



test("resolveCaptureExamMode normalizes unknown to first mode", () => {
  assert.equal(resolveCaptureExamMode("감정평가사 1차"), "감정평가사 1차");
  assert.equal(resolveCaptureExamMode("감정평가사 2차"), "감정평가사 2차");
  assert.equal(resolveCaptureExamMode("unknown"), "감정평가사 1차");
});

test("helpers accept plain string examName variables", () => {
  const firstExamName = "감정평가사 1차";
  const secondExamName = "감정평가사 2차";
  const unknownExamName = "unknown";

  const firstSignal = buildCaptureLearningSignal({
    itemId: "plain-1", examName: firstExamName, subject: "민법", sourceType: "manual", confidence: "중간", createdFromCapture: true,
  });
  const secondSignal = buildCaptureLearningSignal({
    itemId: "plain-2", examName: secondExamName, subject: "감정평가이론", sourceType: "manual", confidence: "중간", createdFromCapture: true,
  });
  const unknownSignal = buildCaptureLearningSignal({
    itemId: "plain-3", examName: unknownExamName, subject: "민법", sourceType: "manual", confidence: "중간", createdFromCapture: true,
  });

  assert.equal(firstSignal.examMode, "감정평가사 1차");
  assert.equal(secondSignal.examMode, "감정평가사 2차");
  assert.equal(unknownSignal.examMode, "감정평가사 1차");

  const secondPriority = computeCaptureQueuePriority({ examName: secondExamName, confidence: "낮음", mistakeOrWeakPoint: "누락", weakStructurePoint: "구조", missingIssue: "논점" });
  const unknownPriority = computeCaptureQueuePriority({ examName: unknownExamName, confidence: "낮음", mistakeOrWeakPoint: "누락" });
  assert.ok(secondPriority > unknownPriority);

  assert.equal(buildCaptureReviewReason({ examName: secondExamName, confidence: "중간", missingIssue: "누락" }), "누락 논점 후보가 있어 짧게 다시 써야 합니다.");
  assert.equal(buildCaptureReviewReason({ examName: unknownExamName, confidence: "낮음" }), "확신이 낮았던 항목이라 근거를 다시 고정해야 합니다.");

  const metadata = JSON.stringify(unknownSignal.metadataJson);
  assert.equal(/rawQuestionText|rawAnswerText|raw_ocr_text|raw_extraction_json/.test(metadata), false);
});

test("priority scoring deterministic and capped", () => {
  const low = computeCaptureQueuePriority({ examName: "감정평가사 1차", confidence: "낮음", timeSpentSeconds: 200, mistakeOrWeakPoint: "개념" });
  const high = computeCaptureQueuePriority({ examName: "감정평가사 2차", confidence: "낮음", timeSpentSeconds: 400, mistakeOrWeakPoint: "누락 구조", weakStructurePoint: "구조", missingIssue: "누락" });
  assert.ok(high > low);
  assert.ok(high <= 100);
});

test("capture save path persists item/tag/queue/signal bridge", async () => {
  const source = await readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8");
  assert.ok(source.includes("insertWrongAnswerItem"));
  assert.ok(source.includes("insertWrongAnswerTag"));
  assert.ok(source.includes("insertReviewQueueEntry"));
  assert.ok(source.includes("createLearningSignalEvent"));
});

test("today plan stays one primary + max 3 and language is operational", () => {
  const tasks = buildTodayPlanTasks({ mode: "second", queue: [{ queueId:"q1", itemId:"i", examName:"감정평가사 2차", subjectLabel:"이론", problemTitle:"사례", topicTag:"논점", mistakeType:"누락", reviewReason: buildCaptureReviewReason({examName:"감정평가사 2차", confidence:"중간", missingIssue:"누락"}), dueAt:"2026-05-01T00:00:00.000Z", priorityScore:70, confidence:"중간", recurrenceCount:1, status:"pending", itemCreatedAt:"2026-05-05T00:00:00.000Z", createdFromCapture:true }] });
  assert.ok(tasks.length <= 3);
  assert.equal(tasks[0].created_from_capture, true);
  assert.equal(tasks[0].source_label, "오늘 기록 기반");
  assert.ok(Boolean(tasks[0].one_next_action));
  assert.ok(/다시 씁니다|회상|확인/.test(tasks[0].one_next_action));
});

test("learner-facing copy includes save bridge messages", async () => {
  const source = await readFile(new URL("../app/app/session/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("오늘 계획에 반영되었습니다."));
  assert.ok(source.includes("복습 큐에 들어갔습니다."));
  assert.ok(source.includes("오늘 기록이 저장되었습니다."));
  assert.ok(source.includes("가장 큰 간극:"));
  assert.ok(source.includes("다음 행동:"));
});

test("guardrails: no instructor imports, no OCR provider, no grading claims", async () => {
  const bridge = await readFile(new URL("../lib/review-os/capture-learning-signals.ts", import.meta.url), "utf8");
  assert.equal(bridge.includes("/instructor"), false);
  assert.equal(bridge.includes("openai"), false);
  assert.equal(bridge.includes("official"), false);
  assert.equal(bridge.includes("pass/fail"), false);
});

test("problem-snap learning signal is surfaced in learner plan surfaces", async () => {
  const homeSource = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  const itemsSource = await readFile(new URL("../app/app/items/page.tsx", import.meta.url), "utf8");

  assert.ok(homeSource.includes('event.sourceType === "problem-snap"'));
  assert.ok(homeSource.includes("Problem Snap"));
  assert.ok(itemsSource.includes('sourceType === "problem-snap"'));
  assert.ok(itemsSource.includes("Problem Snap"));
  assert.ok(itemsSource.includes("다시 풀기"));
  assert.ok(itemsSource.includes("Answer Review로 검토"));
  assert.ok(itemsSource.includes("문제 스냅으로 막힌 문제를 저장하면 오늘 할 일에 반영됩니다."));
});

test("problem-snap learner surfaces keep scope and no grading/payment claims", async () => {
  const merged = (
    await Promise.all([
      readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/app/items/page.tsx", import.meta.url), "utf8"),
    ])
  ).join("\n");

  assert.equal(merged.includes("/instructor"), false);
  assert.equal(merged.includes("공식 채점"), false);
  assert.equal(merged.includes("pass/fail"), false);
  assert.equal(merged.includes("합격/불합격"), false);
  assert.equal(merged.includes("결제"), false);
});

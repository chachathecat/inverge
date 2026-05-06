import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildCaptureLearningSignal, buildCaptureReviewReason, computeCaptureQueuePriority } from "../lib/review-os/capture-learning-signals.ts";
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
  assert.ok(/다시 씁니다|회상|확인/.test(tasks[0].one_next_action));
});

test("learner-facing copy includes save bridge messages", async () => {
  const source = await readFile(new URL("../app/app/session/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("오늘 계획에 반영되었습니다."));
  assert.ok(source.includes("복습 큐에 들어갔습니다."));
  assert.ok(source.includes("우선순위는 최근 기록과 반복 신호를 기준으로 계산됩니다."));
});

test("guardrails: no instructor imports, no OCR provider, no grading claims", async () => {
  const bridge = await readFile(new URL("../lib/review-os/capture-learning-signals.ts", import.meta.url), "utf8");
  assert.equal(bridge.includes("/instructor"), false);
  assert.equal(bridge.includes("openai"), false);
  assert.equal(bridge.includes("official"), false);
  assert.equal(bridge.includes("pass/fail"), false);
});

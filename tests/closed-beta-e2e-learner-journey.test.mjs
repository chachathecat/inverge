import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildBeginnerFirstPlan } from "../lib/review-os/beginner-first-plan.ts";
import { loadAppraiserCurriculumReference } from "../lib/review-os/curriculum-reference.ts";
import { buildExecutionBridge, buildExecutionHrefForTask } from "../lib/review-os/first-plan-execution-bridge.ts";
import {
  buildLearningSignalFromExecutionResult,
  buildReviewCandidateFromExecutionSignal,
} from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemsFromExecutionResults } from "../lib/review-os/execution-review-queue.ts";
import { buildTodayPlanFromReviewQueue } from "../lib/review-os/today-plan-prioritization.ts";
import { buildMorningBrief } from "../lib/review-os/morning-brief.ts";

const onboardingPageUrl = new URL("../app/app/onboarding/page.tsx", import.meta.url);
const resultControlsUrl = new URL("../components/review-os/execution-result-controls.tsx", import.meta.url);
const reference = loadAppraiserCurriculumReference();

const forbiddenLearnerScopeCopy = [
  "/instructor",
  "학원용",
  "강사",
  "결제",
  "payment",
  "archive",
  "아카이브",
  "native app",
  "네이티브 앱",
];
const rawFieldNames = [
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "originalText",
];
const notificationAndManipulationCopy = [
  "notification",
  "push",
  "email",
  "SMS",
  "sms",
  "Kakao",
  "카카오",
  "알림 발송",
  "casino",
  "gacha",
  "streak",
  "순위",
  "랭킹",
  "실패자",
  "게으름",
  "망했",
  "불합격 확정",
  "지금 안 하면 끝",
  "공포",
  "fear",
];

function serialized(value) {
  return JSON.stringify(value);
}

function assertNoTokens(value, tokens) {
  const output = serialized(value);
  for (const token of tokens) assert.equal(output.includes(token), false, `forbidden token found: ${token}`);
}

function planFor(overrides = {}) {
  return buildBeginnerFirstPlan({
    examMode: "first",
    daysUntilExam: 60,
    dailyAvailableMinutes: 60,
    currentLevel: "처음 시작",
    ...overrides,
  }, reference);
}

function executionInput(overrides = {}) {
  return {
    examMode: "first",
    taskType: "O/X",
    subjectName: "민법",
    unitName: "의사표시",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    daysUntilExam: 30,
    ...overrides,
  };
}

test("/app/onboarding route is a closed-beta source smoke for the first plan screen", async () => {
  const source = await readFile(onboardingPageUrl, "utf8");

  assert.match(source, /export default async function ReviewOsOnboardingPage/);
  assert.match(source, /return \(/);
  assert.equal(source.includes("첫 오늘 계획 만들기"), true);
  assert.equal(source.includes("buildExecutionBridge"), true);
  assert.equal(source.includes('source: "onboarding"'), true);
  assert.equal(source.includes("executionBridge?.tasks.map"), true);
  assert.equal(source.includes("오늘 계획으로 시작"), true);
  for (const forbidden of forbiddenLearnerScopeCopy) assert.equal(source.includes(forbidden), false, forbidden);

  const firstPlan = planFor({ examMode: "first", preferredStart: "O/X", weakSubjectName: "민법" });
  const secondPlan = planFor({ examMode: "second", preferredStart: "2차 다시쓰기", weakSubjectName: "감정평가이론" });
  assert.ok(firstPlan.todayPlan.length > 0 && firstPlan.todayPlan.length <= 3);
  assert.ok(secondPlan.todayPlan.length > 0 && secondPlan.todayPlan.length <= 3);

  const firstBridge = buildExecutionBridge(firstPlan.todayPlan, { examMode: "first", weakSubjectName: "민법", source: "onboarding" });
  const secondBridge = buildExecutionBridge(secondPlan.todayPlan, { examMode: "second", weakSubjectName: "감정평가이론", source: "onboarding" });
  assert.ok(firstBridge.tasks.every(({ href }) => href.includes("mode=first") || href.startsWith("/app/capture")), serialized(firstBridge));
  assert.ok(secondBridge.tasks.every(({ href }) => href.includes("mode=second")), serialized(secondBridge));
  assertNoTokens([firstPlan, secondPlan, firstBridge, secondBridge], [...forbiddenLearnerScopeCopy, ...rawFieldNames]);
});

test("first plan execution bridge routes every closed-beta task type to a safe learner route", () => {
  const cases = [
    ["O/X", { examMode: "first", weakSubjectName: "민법", source: "onboarding" }, "/app/first/ox?mode=first&subject=%EB%AF%BC%EB%B2%95"],
    ["cloze", { examMode: "first", weakSubjectName: "민법", source: "onboarding" }, "/app/session?mode=first&focus=cloze&subject=%EB%AF%BC%EB%B2%95"],
    ["accounting template", { examMode: "first", weakSubjectName: "회계학", source: "onboarding" }, "/app/calculator?mode=first&context=accounting&focus=accounting_template"],
    ["rewrite", { examMode: "second", weakSubjectName: "감정평가이론", source: "onboarding" }, "/app/write?mode=second"],
    ["CASIO", { examMode: "second", weakSubjectName: "감정평가실무", source: "onboarding" }, "/app/calculator?mode=second&context=practice&focus=casio"],
    ["issue spotting", { examMode: "second", weakSubjectName: "감정평가 및 보상법규", source: "onboarding" }, "/app/write?mode=second&focus=issue_spotting"],
  ];

  for (const [taskType, context, expectedHref] of cases) {
    const href = buildExecutionHrefForTask({ taskType }, context);
    assert.equal(href, expectedHref, taskType);
    assert.equal(href.includes("/instructor"), false, taskType);
  }
});

test("execution result controls expose the five learner outcomes and map to derived signals without raw text", async () => {
  const source = await readFile(resultControlsUrl, "utf8");
  const expectedSignals = {
    done: "completed",
    wrong: "needs_review",
    unknown: "needs_review",
    needs_rewrite: "needs_rewrite",
    skipped: "recovery",
  };

  for (const [label, result] of [["완료", "done"], ["틀림", "wrong"], ["모르겠음", "unknown"], ["다시쓰기 필요", "needs_rewrite"], ["나중에", "skipped"]]) {
    assert.equal(source.includes(`label: \"${label}\"`), true, label);
    assert.equal(source.includes(`result: \"${result}\"`), true, result);
  }
  for (const forbidden of [...forbiddenLearnerScopeCopy, "공식 채점", "공식 점수"]) assert.equal(source.includes(forbidden), false, forbidden);

  for (const [result, derivedStatus] of Object.entries(expectedSignals)) {
    const signal = buildLearningSignalFromExecutionResult(executionInput({ result, examMode: result === "needs_rewrite" ? "second" : "first", taskType: result === "needs_rewrite" ? "rewrite" : "O/X" }));
    const candidate = buildReviewCandidateFromExecutionSignal(signal);
    assert.equal(signal.derivedStatus, derivedStatus, result);
    assert.equal(result === "done" ? candidate === null : candidate !== null, true, result);
    assertNoTokens(signal, rawFieldNames);
  }
  assert.throws(() => buildLearningSignalFromExecutionResult(executionInput({ problemText: "저장 금지 원문" })), /Raw text field is not accepted/);
});

test("review queue and Today Plan complete the learner loop without spam or mode leakage", () => {
  const items = buildReviewQueueItemsFromExecutionResults([
    executionInput({ result: "wrong", taskType: "O/X", subjectName: "민법", unitName: "의사표시", daysUntilExam: 10 }),
    executionInput({ result: "unknown", taskType: "cloze", subjectName: "경제학", unitName: "수요공급", daysUntilExam: 60 }),
    executionInput({ result: "done", taskType: "O/X", subjectName: "부동산학원론", unitName: "시장론" }),
    executionInput({ result: "skipped", taskType: "O/X", subjectName: "감정평가관계법규", unitName: "절차", daysUntilExam: 20 }),
    executionInput({ result: "needs_rewrite", examMode: "second", taskType: "rewrite", subjectName: "감정평가이론", unitName: "정의와 사례 적용", daysUntilExam: 30 }),
    executionInput({ result: "wrong", examMode: "second", taskType: "CASIO", subjectName: "감정평가실무", unitName: "보상평가 계산", daysUntilExam: 30 }),
  ]);

  assert.equal(items.some((item) => item.sourceResult === "wrong"), true);
  assert.equal(items.some((item) => item.sourceResult === "unknown"), true);
  assert.equal(items.some((item) => item.sourceResult === "skipped" && item.prioritySignals.includes("recovery_candidate")), true);
  assert.equal(items.some((item) => item.sourceResult === "done"), false);
  assert.equal(items.length, 5, "done should not create review spam");

  const firstTodayPlan = buildTodayPlanFromReviewQueue({ reviewQueueItems: items, context: { examMode: "first", dailyAvailableMinutes: 60, source: "review_queue" } });
  const secondTodayPlan = buildTodayPlanFromReviewQueue({ reviewQueueItems: items, context: { examMode: "second", dailyAvailableMinutes: 60, source: "review_queue" } });

  assert.ok(firstTodayPlan.length > 0 && firstTodayPlan.length <= 3);
  assert.ok(secondTodayPlan.length > 0 && secondTodayPlan.length <= 3);
  assert.equal(firstTodayPlan.every((task) => task.source === "review_queue" && task.sourceReviewQueueItemId), true);
  assert.equal(secondTodayPlan.every((task) => task.source === "review_queue" && task.sourceReviewQueueItemId), true);

  const rewriteTask = secondTodayPlan.find((task) => task.taskType === "rewrite");
  const casioTask = secondTodayPlan.find((task) => task.taskType === "CASIO");
  assert.ok(rewriteTask, "expected 2차 rewrite task in Today Plan");
  assert.equal(/O\/X/i.test(serialized(rewriteTask)), false, serialized(rewriteTask));
  assert.ok(casioTask, "expected CASIO task in Today Plan");
  assert.match(serialized(casioTask), /CASIO|계산기/);
  assertNoTokens([items, firstTodayPlan, secondTodayPlan], [...forbiddenLearnerScopeCopy, ...rawFieldNames]);
});

test("morning brief preview is capped, preview-only, non-notifying, and has a 30-minute fallback", () => {
  const reviewQueueItems = buildReviewQueueItemsFromExecutionResults([
    executionInput({ result: "wrong", taskType: "O/X", subjectName: "민법", unitName: "의사표시 1", daysUntilExam: 7 }),
    executionInput({ result: "unknown", taskType: "cloze", subjectName: "경제학", unitName: "수요공급 1", daysUntilExam: 8 }),
    executionInput({ result: "skipped", taskType: "accounting template", subjectName: "회계학", unitName: "계산틀 1", daysUntilExam: 9 }),
    executionInput({ result: "wrong", taskType: "O/X", subjectName: "감정평가관계법규", unitName: "절차 1", daysUntilExam: 10 }),
  ]);

  const brief = buildMorningBrief({
    examMode: "first",
    reviewQueueItems,
    dailyAvailableMinutes: 90,
    recentMissCount: 1,
    daysUntilExam: 10,
  });

  assert.ok(brief.todayTasks.length > 0 && brief.todayTasks.length <= 3);
  assert.equal(brief.todayTasks.every((task) => task.previewOnly), true);
  assert.match(brief.fallbackAction, /30분 fallback/);
  assertNoTokens(brief, [...notificationAndManipulationCopy, ...forbiddenLearnerScopeCopy, ...rawFieldNames]);
});

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { getExplanationLabels, loadAppraiserCurriculumReference } from "../lib/review-os/curriculum-reference.ts";
import { buildLearningSignalFromExecutionResult } from "../lib/review-os/execution-learning-signal.ts";
import { buildReviewQueueItemFromExecutionSignal } from "../lib/review-os/execution-review-queue.ts";
import { buildMorningBrief } from "../lib/review-os/morning-brief.ts";
import { buildTodayPlanFromReviewQueue, compressTodayPlanToMaxThree } from "../lib/review-os/today-plan-prioritization.ts";

const read = (file) => readFileSync(file, "utf8");
const textOf = (value) => JSON.stringify(value);

const onboardingAndResultControlFiles = [
  "app/app/onboarding/page.tsx",
  "app/exams/appraisal-first/onboarding/page.tsx",
  "app/exams/appraiser-first/first/onboarding/page.tsx",
  "components/review-os/execution-result-controls.tsx",
];

const learnerLoopCopyFiles = [
  "app/app/onboarding/page.tsx",
  "app/app/page.tsx",
  "app/app/review/page.tsx",
  "app/app/session/page.tsx",
  "app/app/write/page.tsx",
  "components/review-os/execution-result-controls.tsx",
  "components/review-os/minimal-study-system.tsx",
  "components/review-os/profile-setup-form.tsx",
  "components/review-os/review-queue-client.tsx",
  "components/review-os/today-session-runner.tsx",
];

const learnerLoopHelperFiles = [
  "lib/review-os/beginner-first-plan.ts",
  "lib/review-os/curriculum-engine.ts",
  "lib/review-os/curriculum-reference.ts",
  "lib/review-os/execution-learning-signal.ts",
  "lib/review-os/execution-review-queue.ts",
  "lib/review-os/explanation-ladder-engine.ts",
  "lib/review-os/first-plan-execution-bridge.ts",
  "lib/review-os/morning-brief.ts",
  "lib/review-os/question-reference.ts",
  "lib/review-os/reference-context.ts",
  "lib/review-os/review-os-data-spine.mjs",
  "lib/review-os/study-schedule-engine.ts",
  "lib/review-os/today-plan-engine.ts",
  "lib/review-os/today-plan-prioritization.ts",
];

const paymentArchiveNativePatterns = [
  /결제/,
  /payment/i,
  /paywall/i,
  /checkout/i,
  /유료/,
  /archive/i,
  /아카이브/,
  /native app/i,
  /네이티브 앱/,
  /모바일 앱/,
];

const unsupportedExamScopePatterns = [
  /보험계리사/,
  /계리사/,
  /actuary/i,
  /\bCPA\b/,
  /세무사/,
  /TOEFL/i,
  /\bSAT\b/,
  /universal exam/i,
  /multi-exam/i,
];

const rawProblemTextFieldNames = [
  "rawProblemText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "sourceText",
  "copyrightedText",
  "originalText",
];

const rawUserDataFieldNames = [
  "rawOcrText",
  "raw_ocr_text",
  "ocrText",
  "userAnswer",
  "userAnswerText",
  "answerText",
  "rawAnswerText",
  "rawUserAnswer",
  "rawProblemText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "originalText",
];

const officialClaimPatterns = [
  /공식\s*채점/,
  /공식\s*점수/,
  /확정\s*점수/,
  /합격\s*판정/,
  /불합격\s*판정/,
  /공식\s*모범답안/,
  /모범답안\s*확정/,
  /official\s+grading/i,
  /official\s+score/i,
  /official\s+model\s+answer/i,
  /final\s+judg/i,
];

const shameFearCasinoPatterns = [
  /실패자/,
  /게으름/,
  /부끄럽/,
  /망했/,
  /정신\s*차려/,
  /핑계/,
  /불합격\s*확정/,
  /지금\s*안\s*하면\s*끝/,
  /공포/,
  /fear/i,
  /fake urgency/i,
  /casino/i,
  /gacha/i,
  /random reward/i,
  /랜덤\s*보상/,
  /streak/i,
  /랭킹/,
  /순위\s*하락/,
];

const notificationSendCodePatterns = [
  /send(?:Notification|Push|Email|Sms|SMS|Kakao|MorningBrief)\b/,
  /(?:deliver|dispatch)(?:Notification|Push|Email|Sms|SMS|Kakao|MorningBrief)\b/,
  /fetch\([^)]*(?:notification|push|email|sms|kakao)/is,
  /supabase\.functions\.invoke\([^)]*(?:notification|push|email|sms|kakao)/is,
];

function existingFiles(files) {
  return files.filter((file) => existsSync(file));
}

function assertNoPattern(source, patterns, label) {
  for (const pattern of patterns) {
    assert.equal(pattern.test(source), false, `${label} contains forbidden pattern ${pattern}`);
  }
}

function stripGuardrailRegexLiteralLines(source) {
  return source.replace(/^\s*\/.*\/[dgimsuvy]*,?\s*$/gm, "");
}

function assertNoObjectKeys(value, forbiddenKeys, label, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoObjectKeys(entry, forbiddenKeys, label, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(forbiddenKeys.includes(key), false, `${label} exposes forbidden raw field key ${key} at ${trail}`);
    assertNoObjectKeys(nestedValue, forbiddenKeys, label, `${trail}.${key}`);
  }
}

async function collectFiles(dir, predicate = () => true) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(full, predicate);
    return entry.isFile() && predicate(full) ? [full] : [];
  }));
  return nested.flat();
}

function sampleReviewQueueItem(overrides = {}) {
  const signal = buildLearningSignalFromExecutionResult({
    examMode: "first",
    taskType: "O/X",
    subjectId: "civil-law",
    subjectName: "민법",
    unitId: "juristic-act",
    unitName: "법률행위 효력",
    executionSource: "today_plan",
    result: "wrong",
    confidence: "low",
    daysUntilExam: 18,
    ...overrides,
  });
  const item = buildReviewQueueItemFromExecutionSignal(signal);
  assert.ok(item, "expected review queue item from sample execution signal");
  return item;
}

test("learner onboarding/result controls do not import or route into the instructor console", () => {
  for (const file of existingFiles(onboardingAndResultControlFiles)) {
    const source = read(file);
    const importLines = source.split("\n").filter((line) => /^\s*import\b/.test(line)).join("\n");

    assertNoPattern(importLines, [/instructor/i, /학원용/, /강사/], `${file} imports`);
    assertNoPattern(source, [/href=[{\"'`][^\n]*(?:\/instructor|\/studio)/i, /router\.push\([^)]*(?:\/instructor|\/studio)/i], file);
  }
});

test("learner loop UI copy avoids payment, public archive, native-app, and unsupported exam scope", () => {
  for (const file of existingFiles(learnerLoopCopyFiles)) {
    const source = read(file);
    assertNoPattern(source, paymentArchiveNativePatterns, file);
    assertNoPattern(source, unsupportedExamScopePatterns, file);
  }
});

test("morning brief stays display-only and contains no notification sending code", () => {
  const source = read("lib/review-os/morning-brief.ts");
  assertNoPattern(source, notificationSendCodePatterns, "morning brief source");

  const brief = buildMorningBrief({
    examMode: "first",
    reviewQueueItems: [sampleReviewQueueItem()],
    dailyAvailableMinutes: 60,
  });
  assertNoPattern(textOf(brief), [/notification/i, /push/i, /email/i, /sms/i, /kakao/i, /카카오/, /알림\s*발송/, /통지\s*발송/], "morning brief output");
});

test("reference, review queue, and Today Plan helpers keep raw problem text fields out of public outputs", () => {
  const reviewItem = sampleReviewQueueItem();
  const todayPlan = buildTodayPlanFromReviewQueue({
    reviewQueueItems: [
      reviewItem,
      sampleReviewQueueItem({ unitId: "economics", unitName: "수요 공급", subjectId: "economics", subjectName: "경제학원론" }),
      sampleReviewQueueItem({ unitId: "accounting", unitName: "계산 단위", subjectId: "accounting", subjectName: "회계학" }),
      sampleReviewQueueItem({ unitId: "real-estate", unitName: "부동산 시장", subjectId: "real-estate", subjectName: "부동산학원론" }),
    ],
    context: { examMode: "first", source: "review_queue" },
  });

  assertNoObjectKeys(reviewItem, rawProblemTextFieldNames, "review queue item");
  assertNoObjectKeys(todayPlan, rawProblemTextFieldNames, "today plan");
  assertNoPattern(textOf({ reviewItem, todayPlan }), rawProblemTextFieldNames.map((field) => new RegExp(`\\"${field}\\"`)), "review/today output");

  for (const file of learnerLoopHelperFiles.filter((entry) => /question-reference|execution-review-queue|today-plan/.test(entry))) {
    const source = read(file);
    const exportedTypeBlocks = [...source.matchAll(/export\s+type\s+\w+\s*=\s*\{[\s\S]*?\n\};/g)].map((match) => match[0]).join("\n");
    assertNoPattern(exportedTypeBlocks, rawProblemTextFieldNames.map((field) => new RegExp(`\\b${field}\\b`)), `${file} exported public types`);
  }
});

test("reference data remains metadata-only and contains no raw OCR, user answer, or problem text fields", async () => {
  const files = await collectFiles("reference_corpus", (file) => file.endsWith(".json"));
  for (const file of files) {
    const parsed = JSON.parse(read(file));
    assertNoObjectKeys(parsed, rawUserDataFieldNames, file);
  }
});

test("Today Plan max 3 guardrail is present and enforced in helpers/tests", () => {
  const helperSource = read("lib/review-os/today-plan-prioritization.ts");
  const testSources = ["tests/today-plan-prioritization.test.mjs", "tests/morning-brief.test.mjs"].map(read).join("\n");

  assert.ok(helperSource.includes("compressTodayPlanToMaxThree"), "Today Plan helper must keep the max-three compressor");
  assert.ok(helperSource.includes("compressed.length === 3"), "Today Plan compressor must stop at 3 tasks");
  assert.match(testSources, /max 3|MaxThree|length, 3|length === 3/);

  const tasks = [0, 1, 2, 3, 4].map((index) => ({
    ...sampleReviewQueueItem({ unitId: `unit-${index}`, unitName: `단원 ${index}`, subjectId: `subject-${index}`, subjectName: `과목 ${index}` }),
    id: `today-task-${index}`,
    source: "review_queue",
    sourceReviewQueueItemId: `queue-${index}`,
    isPrimaryTask: true,
  }));
  assert.equal(compressTodayPlanToMaxThree(tasks).length, 3);
});

test("learner loop remains scoped to 감정평가사 1차 and 감정평가사 2차 only", () => {
  const reference = loadAppraiserCurriculumReference();
  assert.deepEqual([reference.firstExam.exam, reference.secondExam.exam].sort(), ["감정평가사 1차", "감정평가사 2차"].sort());

  const onboardingSource = read("app/app/onboarding/page.tsx");
  assert.ok(onboardingSource.includes("감정평가사 1차"));
  assert.ok(onboardingSource.includes("감정평가사 2차"));
  assertNoPattern(onboardingSource, unsupportedExamScopePatterns, "onboarding scope");
});

test("Q-Net/current official notice verification warning remains in docs and reference data", () => {
  const referenceFiles = [
    "reference_corpus/curriculum/appraiser/first_exam_curriculum.json",
    "reference_corpus/curriculum/appraiser/second_exam_curriculum.json",
    "reference_corpus/curriculum/appraiser/study_tracks.json",
    "reference_corpus/curriculum/appraiser/explanation_ladder.json",
  ];
  const docs = [
    "docs/inverge-curriculum-system.md",
    "docs/inverge-learning-engine-spec.md",
    "docs/inverge-closed-beta-qa.md",
  ].filter((file) => existsSync(file));
  const combined = [...referenceFiles, ...docs].map(read).join("\n");

  assert.match(combined, /Q-Net\/current official notice verification/);
  assert.match(combined, /needsOfficialVerification/);
});

test("explanation ladder keeps closed-beta label set", () => {
  const labels = getExplanationLabels().map((entry) => entry.label);
  assert.deepEqual(labels, ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"]);
});

test("learner loop helpers and UI do not make official grading/model-answer claims", () => {
  for (const file of existingFiles(learnerLoopCopyFiles)) {
    assertNoPattern(read(file), officialClaimPatterns, file);
  }

  for (const file of existingFiles(learnerLoopHelperFiles)) {
    assertNoPattern(stripGuardrailRegexLiteralLines(read(file)), officialClaimPatterns, file);
  }
});

test("learner loop UI and runtime outputs avoid shame, fear, and casino gamification copy", () => {
  for (const file of existingFiles(learnerLoopCopyFiles)) {
    assertNoPattern(read(file), shameFearCasinoPatterns, file);
  }

  const reviewItem = sampleReviewQueueItem({ result: "skipped" });
  const todayPlan = buildTodayPlanFromReviewQueue({
    reviewQueueItems: [reviewItem],
    context: { examMode: "first", recentMissCount: 1, daysUntilExam: 10 },
  });
  const brief = buildMorningBrief({
    examMode: "first",
    reviewQueueItems: [reviewItem],
    todayPlanTasks: todayPlan,
    dailyAvailableMinutes: 30,
    recentMissCount: 1,
  });

  assertNoPattern(textOf({ reviewItem, todayPlan, brief }), shameFearCasinoPatterns, "learner loop outputs");
});

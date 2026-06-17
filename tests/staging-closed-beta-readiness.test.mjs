import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { buildBeginnerFirstPlan } from "../lib/review-os/beginner-first-plan.ts";
import { loadAppraiserCurriculumReference } from "../lib/review-os/curriculum-reference.ts";

const requiredFiles = [
  "docs/closed-beta-staging-qa-checklist.md",
  "docs/qa/durable-today-plan-staging-rollout-checklist.md",
  "docs/qa/durable-today-plan-staging-qa-evidence.md",
  "docs/qa/closed-beta-staging-final-signoff.md",
  "scripts/check-durable-today-plan-rollout-readiness.mjs",
  "lib/review-os/today-plan-learner-route-integration.ts",
  "scripts/check-staging-learner-routes.mjs",
  "app/app/page.tsx",
  "app/app/onboarding/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/session/page.tsx",
  "app/app/review/page.tsx",
  "app/app/write/page.tsx",
  "app/app/calculator/page.tsx",
];

const learnerRouteSources = [
  "app/app/page.tsx",
  "app/app/onboarding/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/session/page.tsx",
  "app/app/review/page.tsx",
  "app/app/write/page.tsx",
  "app/app/calculator/page.tsx",
];

const forbiddenLearnerPatterns = [
  /href=[{\"'`][^\n]*(?:\/instructor|\/studio)/i,
  /router\.push\([^)]*(?:\/instructor|\/studio)/i,
  /\b(?:payment|checkout|paywall)\b/i,
  /결제|유료/,
  /\barchive\b/i,
  /아카이브/,
  /native app|mobile app/i,
  /네이티브 앱|모바일 앱/,
];

const officialClaimPatterns = [
  /공식\s*채점/,
  /공식\s*점수/,
  /확정\s*점수/,
  /합격\s*판정/,
  /불합격\s*판정/,
  /official\s+grading/i,
  /official\s+score/i,
  /final\s+judg/i,
];

const unsupportedExamPatterns = [
  /보험계리사/,
  /계리사/,
  /\bactuary\b/i,
  /\bCPA\b/,
  /세무사/,
  /TOEFL/i,
  /\bSAT\b/,
  /universal exam/i,
  /multi-exam/i,
];

const notificationSendPatterns = [
  /send(?:Notification|Push|Email|Sms|SMS|Kakao|MorningBrief)\b/,
  /(?:deliver|dispatch)(?:Notification|Push|Email|Sms|SMS|Kakao|MorningBrief)\b/,
  /fetch\([^)]*(?:notification|push|email|sms|kakao)/is,
  /supabase\.functions\.invoke\([^)]*(?:notification|push|email|sms|kakao)/is,
];

const rawReferenceFieldNames = [
  "rawOcrText",
  "raw_ocr_text",
  "ocrText",
  "userAnswerText",
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

const referenceDataFiles = [
  "lib/review-os/reference-corpus.ts",
  "lib/review-os/past-exam-reference.ts",
  "lib/review-os/past-exam-review-seeds.ts",
  "lib/review-os/past-exam-source-seeds.ts",
  "lib/review-os/past-exam-extraction-seeds.ts",
];

function read(file) {
  return readFileSync(file, "utf8");
}

function assertNoPattern(source, patterns, label) {
  for (const pattern of patterns) {
    assert.equal(pattern.test(source), false, `${label} contains forbidden pattern ${pattern}`);
  }
}

function stripRegexLiteralGuardrailLines(source) {
  return source.replace(/^\s*\/.*\/[dgimsuvy]*,?\s*$/gm, "");
}

function assertNoRawReferenceKeys(value, label, trail = "root") {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRawReferenceKeys(entry, label, `${trail}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(rawReferenceFieldNames.includes(key), false, `${label} includes raw text field ${key} at ${trail}`);
    assertNoRawReferenceKeys(nestedValue, label, `${trail}.${key}`);
  }
}

test("staging checklist, route checker, and required learner route sources exist", () => {
  for (const file of requiredFiles) assert.equal(existsSync(file), true, `${file} should exist`);

  const checklist = read("docs/closed-beta-staging-qa-checklist.md");
  for (const heading of [
    "## A. Access/auth",
    "## B. First learner loop",
    "## C. Capture loop",
    "## D. 1차 loop",
    "## E. 2차 loop",
    "## F. Morning brief",
    "## G. Data boundary",
    "## H. Decision after QA",
  ]) {
    assert.equal(checklist.includes(heading), true, `${heading} should be documented`);
  }
});

test("final closed-beta staging sign-off keeps staging ready and production blocked", () => {
  const signoff = read("docs/qa/closed-beta-staging-final-signoff.md");

  for (const required of [
    "STAGING CLOSED-BETA READY WITH PRODUCTION BLOCKED",
    "Production rollout remains not approved.",
    "Today Plan visible primary tasks must be max 3",
    "PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0",
    "PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0",
    "No raw text leak",
    "No raw OCR/problem/answer/source/copyright/official/model/score/instructor fields",
    "PR #343 adds explanation quality harness",
    "PR #345 reduces mobile capture friction",
    "Text-first capture is the primary closed-beta path",
    "Low-confidence OCR requires confirmation before practice",
    "10초 확인 must remain O/X or cloze-convertible",
    "Official grading/model answer/score/pass-fail/합격보장 claims are forbidden",
    "Restricted routes must be blocked for normal learner",
  ]) {
    assert.equal(signoff.includes(required), true, `final sign-off should include ${required}`);
  }
});

test("staging route checker passes the route contract", () => {
  const result = spawnSync(process.execPath, ["scripts/check-staging-learner-routes.mjs"], { encoding: "utf8" });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test("onboarding and execution route contracts remain closed-beta safe", () => {
  const onboarding = read("app/app/onboarding/page.tsx");
  assert.equal(onboarding.includes("첫 오늘 계획 만들기"), true);
  assert.equal(onboarding.includes("buildExecutionBridge"), true);

  const bridge = read("lib/review-os/first-plan-execution-bridge.ts");
  assert.equal(bridge.includes('"/app/calculator?mode=second&context=practice&focus=casio"'), true);

  const resultControls = read("components/review-os/execution-result-controls.tsx");
  for (const label of ["완료", "틀림", "모르겠음", "다시쓰기 필요", "나중에"]) {
    assert.equal(resultControls.includes(label), true, `${label} should remain in result controls`);
  }
});

test("learner route sources do not expose blocked surfaces, unsupported scope, or official claims", () => {
  for (const file of learnerRouteSources) {
    const source = read(file);
    assertNoPattern(source, forbiddenLearnerPatterns, file);
    assertNoPattern(source, officialClaimPatterns, file);
    assertNoPattern(source, unsupportedExamPatterns, file);
  }
});


test("capture route smoke keeps capture-first copy and one primary start action", () => {
  const captureRoute = read("app/app/capture/page.tsx");
  const captureForm = read("components/review-os/capture-form.tsx");
  const capture = `${captureRoute}\n${captureForm}`;

  for (const required of [
    "오늘 한 것 올리기",
    "텍스트로 바로 시작하고, 사진/PDF는 필요할 때만 추가하세요.",
    "OCR/AI 정리는 초안입니다. 저장 전 직접 확인해 주세요.",
    "Notes / Review / Today로 이어질 빈틈 1개와 다음 행동 1개가 만들어집니다.",
  ]) {
    assert.equal(capture.includes(required), true, `${required} should render on /app/capture`);
  }

  assert.equal(capture.includes("canQuickSave"), true, "empty capture start should keep one primary visible action");
  assert.equal(/점수|채점|합격\s*판정|불합격\s*판정/.test(capture), false, "/app/capture should not become score-first");
  assertNoPattern(capture, forbiddenLearnerPatterns, "/app/capture");
  assertNoPattern(capture, officialClaimPatterns, "/app/capture");
});

test("morning brief is preview-only and has no notification sending code", () => {
  const source = read("lib/review-os/morning-brief.ts");
  assert.equal(source.includes("previewOnly: true"), true);
  const executableSource = stripRegexLiteralGuardrailLines(source);
  assertNoPattern(executableSource, notificationSendPatterns, "morning brief executable source");
});

test("reference data avoids raw user/OCR/problem text field names", () => {
  assertNoRawReferenceKeys(loadAppraiserCurriculumReference(), "curriculum reference");

  for (const file of referenceDataFiles.filter((candidate) => existsSync(candidate))) {
    const source = stripRegexLiteralGuardrailLines(read(file));
    for (const fieldName of rawReferenceFieldNames) {
      assert.equal(source.includes(fieldName), false, `${file} should not include raw text field name ${fieldName}`);
    }
  }
});

test("Today Plan max 3 guardrail still exists", () => {
  const source = read("lib/review-os/today-plan-prioritization.ts");
  assert.equal(source.includes("compressTodayPlanToMaxThree"), true);
  assert.equal(/compressed\.length\s*={2,3}\s*3/.test(source) || /slice\(0,\s*3\)/.test(source), true);
});

test("PR314 onboarding exam label and task links are mode-specific", () => {
  const onboarding = read("app/app/onboarding/page.tsx");
  assert.equal(onboarding.includes("plan.onboardingSummary.examModeLabel"), true, "onboarding preview should render selected exam label");
  assert.equal(onboarding.includes("buildExecutionBridge"), true, "onboarding should build per-task execution links");
  assert.equal(onboarding.includes("<Link href={href}"), true, "each preview task should navigate by its own href");

  const secondPlan = buildBeginnerFirstPlan({
    examMode: "second",
    daysUntilExam: 90,
    dailyAvailableMinutes: 60,
    currentLevel: "처음 시작",
    preferredStart: "CASIO",
    weakSubjectName: "감정평가실무",
  }, loadAppraiserCurriculumReference());
  assert.equal(secondPlan.onboardingSummary.examModeLabel, "감정평가사 2차");

  const bridge = read("lib/review-os/first-plan-execution-bridge.ts");
  assert.equal(bridge.includes('/app/calculator?mode=second&context=practice&focus=casio'), true);
  assert.equal(bridge.includes('/app/write?mode=second&focus=issue_spotting'), true);
});

test("PR314 result controls appear on completed exercise surfaces without raw text prompts", () => {
  for (const file of [
    "components/review-os/today-session-runner.tsx",
    "components/review-os/first-ox/first-ox-practice-client.tsx",
    "components/review-os/calculator-workflow-page.tsx",
  ]) {
    const source = read(file);
    assert.equal(source.includes("ExecutionResultControls"), true, `${file} should render result controls`);
  }

  const controls = read("components/review-os/execution-result-controls.tsx");
  for (const label of ["완료", "틀림", "모르겠음", "다시쓰기 필요", "나중에"]) {
    assert.equal(controls.includes(label), true, `${label} should be available`);
  }
  for (const forbidden of ["rawProblem", "rawAnswer", "rawOcr", "problemText", "answerText", "ocrText"]) {
    assert.equal(controls.includes(forbidden), false, `controls should not ask for ${forbidden}`);
  }
});


test("PR332 durable Today Plan rollout readiness guardrails exist and remain learner-route safe", () => {
  assert.equal(existsSync("docs/qa/durable-today-plan-staging-rollout-checklist.md"), true);
  assert.equal(existsSync("scripts/check-durable-today-plan-rollout-readiness.mjs"), true);

  const appPage = read("app/app/page.tsx");
  const routeHelper = read("lib/review-os/today-plan-learner-route-integration.ts");
  const readinessScript = read("scripts/check-durable-today-plan-rollout-readiness.mjs");
  const combined = `${appPage}\n${routeHelper}`;

  assert.equal(appPage.includes("buildLearnerTodayPlanTasksWithGatedDurableConceptGraph"), true, "learner app route should call gated route helper");
  assert.equal(routeHelper.includes('getPersonalConceptGraphRepositoryMode(input.env) === "supabase"'), true);
  assert.equal(routeHelper.includes('PERSONAL_CONCEPT_GRAPH_DURABLE_READS === "1"'), true);
  assert.equal(routeHelper.includes('PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT === "1"'), true);
  assert.equal(routeHelper.includes("Boolean(input.userId?.trim())"), true);
  assert.equal(routeHelper.includes('input.examMode === "first" || input.examMode === "second"'), true);
  assert.equal(readinessScript.includes("production_durable_today_plan_flags_enabled"), true, "production env flag guard should exist");

  assert.equal(/NODE_ENV\s*[:=]\s*["']production["'][\s\S]{0,160}PERSONAL_CONCEPT_GRAPH_DURABLE_READS\s*[:=]\s*["']1["']/.test(combined), false);
  assert.equal(/VERCEL_ENV\s*[:=]\s*["']production["'][\s\S]{0,160}PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT\s*[:=]\s*["']1["']/.test(combined), false);
  assert.equal(/service[_-]?role/i.test(combined), false, "learner route integration must not use service role keys");

  const outputMapping = routeHelper.slice(routeHelper.indexOf("function toDurableTask"), routeHelper.indexOf("function mergeUnifiedActionsBackToTasks"));
  for (const forbidden of ["rawOcrText", "raw_ocr_text", "problemText", "answerText", "sourceText", "copyrightedText", "officialAnswer", "modelAnswer", "scorePrediction", "instructorComment"]) {
    assert.equal(outputMapping.includes(forbidden), false, `route output mapping should not introduce ${forbidden}`);
  }
});

test("PR335 durable Today Plan staging evidence and visible action cap guardrails are documented", () => {
  assert.equal(existsSync("docs/qa/durable-today-plan-staging-qa-evidence.md"), true);

  const evidence = read("docs/qa/durable-today-plan-staging-qa-evidence.md");
  const checklist = read("docs/qa/durable-today-plan-staging-rollout-checklist.md");
  const appPage = read("app/app/page.tsx");

  assert.equal(evidence.includes("PR range covered: #331, #332, #333, #334"), true);
  assert.equal(evidence.includes("https://inverge-mppzi8wwq-chachathecats-projects.vercel.app/"), true);
  assert.equal(evidence.includes("PASS WITH WARNINGS"), true);
  assert.equal(evidence.includes("Production rollout remains blocked"), true);
  assert.equal(evidence.includes("PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1"), true);
  assert.equal(evidence.includes("PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1"), true);
  assert.equal(evidence.includes("Production flags remain off or unset"), true);

  assert.equal(checklist.includes("## I. Visible action cap QA"), true);
  for (const rule of [
    "Today Plan primary task cards must be max 3",
    "The screen should not visually imply more than 3",
    "Input options must be clearly separated from Today Plan tasks",
    "Secondary routes must be inside collapsed details",
    "If there are zero due tasks, the empty/recovery state should still show one primary next action",
  ]) {
    assert.equal(checklist.includes(rule), true, `visible action cap rule should be documented: ${rule}`);
  }

  assert.match(appPage, /const visibleTodayPlanTasks\s*=\s*todayPlanTasks\.slice\(0,\s*3\)/, "learner home should preserve visible max-3 Today Plan cap");
  assert.match(appPage, /data-visible-primary-task-cap="3"/);
  assert.match(appPage, /data-secondary-action-surface="additional-today-plan"/);
  assert.match(appPage, /오늘 입력할 수 있는 것/);

  assertNoPattern(appPage, forbiddenLearnerPatterns, "/app visible action cap surface");
  assertNoPattern(appPage, unsupportedExamPatterns, "/app visible action cap surface");
  assertNoPattern(appPage, officialClaimPatterns, "/app visible action cap surface");
  assert.equal(/NODE_ENV\s*[:=]\s*["']production["'][\s\S]{0,160}PERSONAL_CONCEPT_GRAPH_DURABLE_READS\s*[:=]\s*["']1["']/.test(appPage), false);
  assert.equal(/VERCEL_ENV\s*[:=]\s*["']production["'][\s\S]{0,160}PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT\s*[:=]\s*["']1["']/.test(appPage), false);
});


test("PR314 Today Plan mode switching and CASIO route copy are mode-safe", () => {
  const learnerShell = read("components/learner/learner-ui.tsx");
  assert.equal(learnerShell.includes('parseAppraisalMode(searchParams.get("mode")) ?? mode'), true, "URL mode should drive active tab");
  assert.equal(learnerShell.includes('href={`${pathname}?mode=${item.mode}`'), true, "tabs should switch current route mode");
  assert.equal(learnerShell.includes('aria-current={active ? "page" : undefined}'), true, "active tab should be announced");

  const appPage = read("app/app/page.tsx");
  assert.equal(appPage.includes('reviewOsService.getTodayFocus(session.userId, session.email, mode)'), true);
  assert.match(appPage, /buildLearnerTodayPlanTasksWithGatedDurableConceptGraph\s*\(/, "/app should use the gated learner Today Plan route helper");
  assert.match(appPage, /userId:\s*session\.userId/, "/app should pass the authenticated learner userId into the gated helper");
  assert.match(appPage, /\bmode\s*,/, "/app should pass the selected exam mode into the gated helper");
  assert.doesNotMatch(appPage, /buildTodayPlanTasks\s*\(/, "/app should not restore direct Today Plan task construction");
  assert.match(appPage, /modeCaptureHref/, "empty Today Plan links should preserve the selected mode");
  assert.match(appPage, /\/app\/calculator\?mode=second&context=practice&focus=casio/);

  const calculatorRoute = read("app/app/calculator/page.tsx");
  assert.equal(calculatorRoute.includes("focus?: string"), true);
  assert.equal(calculatorRoute.includes("focus={params?.focus}"), true);

  const calculatorPage = read("components/review-os/calculator-workflow-page.tsx");
  assert.equal(calculatorPage.includes('focus === "casio"'), true);
  assert.equal(calculatorPage.includes("CASIO 계산형 연습"), true);
});

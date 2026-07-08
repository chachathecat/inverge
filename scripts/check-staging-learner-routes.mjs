import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeSources = new Map([
  ["/app", "app/app/page.tsx"],
  ["/app/onboarding", "app/app/onboarding/page.tsx"],
  ["/app/capture", "app/app/capture/page.tsx"],
  ["/app/input", "app/app/input/page.tsx"],
  ["/app/entry", "app/app/entry/page.tsx"],
  ["/app/session", "app/app/session/page.tsx"],
  ["/app/review", "app/app/review/page.tsx"],
  ["/app/notes", "app/app/notes/page.tsx"],
  ["/app/write", "app/app/write/page.tsx"],
  ["/app/calculator", "app/app/calculator/page.tsx"],
  ["/answer-review", "app/answer-review/page.tsx"],
]);

const supportingSources = {
  resultControls: "components/review-os/execution-result-controls.tsx",
  firstPlanBridge: "lib/review-os/first-plan-execution-bridge.ts",
  todayPlan: "lib/review-os/today-plan-prioritization.ts",
  todayPlanEngine: "lib/review-os/today-plan-engine.ts",
  morningBrief: "lib/review-os/morning-brief.ts",
  answerReviewClient: "app/answer-review/answer-review-client.tsx",
  calculatorPage: "components/review-os/calculator-workflow-page.tsx",
};

const learnerForbiddenPatterns = [
  { pattern: /href=[{\"'`][^\n]*(?:\/instructor|\/studio|\/admin)/i, reason: "learner route links to instructor/studio/admin" },
  { pattern: /router\.push\([^)]*(?:\/instructor|\/studio|\/admin)/i, reason: "learner route pushes to instructor/studio/admin" },
  { pattern: /\b(?:payment|checkout|paywall)\b/i, reason: "payment/checkout/paywall copy or route" },
  { pattern: /결제|유료/, reason: "payment copy" },
  { pattern: /\barchive\b/i, reason: "public archive copy" },
  { pattern: /아카이브/, reason: "public archive copy" },
  { pattern: /native app|mobile app/i, reason: "native app copy" },
  { pattern: /네이티브 앱|모바일 앱/, reason: "native app copy" },
  { pattern: /공식\s*채점(?!\s*아님)|공식\s*점수|확정\s*점수|합격\s*판정|불합격\s*판정|official\s+grading|official\s+score|final\s+judg/i, reason: "official grading/score claim" },
  { pattern: /보험계리사|계리사|\bactuary\b|\bCPA\b|세무사|TOEFL|\bSAT\b|universal exam|multi-exam/i, reason: "unsupported exam scope" },
];

const notificationSendPatterns = [
  /send(?:Notification|Push|Email|Sms|SMS|Kakao|MorningBrief)\b/,
  /(?:deliver|dispatch)(?:Notification|Push|Email|Sms|SMS|Kakao|MorningBrief)\b/,
  /fetch\([^)]*(?:notification|push|email|sms|kakao)/is,
  /supabase\.functions\.invoke\([^)]*(?:notification|push|email|sms|kakao)/is,
];

const failures = [];

function sourcePath(file) {
  return path.join(root, file);
}

function read(file) {
  return readFileSync(sourcePath(file), "utf8");
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function stripRegexLiteralGuardrailLines(source) {
  return source.replace(/^\s*\/.*\/[dgimsuvy]*,?\s*$/gm, "");
}

for (const [route, file] of routeSources) {
  check(existsSync(sourcePath(file)), `${route} source is missing (${file})`);
}

for (const [label, file] of Object.entries(supportingSources)) {
  check(existsSync(sourcePath(file)), `${label} source is missing (${file})`);
}

for (const [route, file] of routeSources) {
  if (!existsSync(sourcePath(file))) continue;
  const source = read(file);
  for (const { pattern, reason } of learnerForbiddenPatterns) {
    check(!pattern.test(source), `${route} (${file}) exposes forbidden staging learner surface: ${reason} (${pattern})`);
  }
}

const examsPage = existsSync(sourcePath("app/exams/page.tsx")) ? read("app/exams/page.tsx") : "";
check(examsPage.includes('const appHref = `/app?mode=${mode}`'), "/exams authenticated CTA must use absolute /app mode route");
check(examsPage.includes('return mode === "first" ? "/app/capture?mode=first" : "/app/capture?mode=second";'), "/exams second-track CTA must start at /app/capture?mode=second");
check(!examsPage.includes('"/app/write?mode=second"'), "/exams second-track CTA must not target specialized /app/write route");

const learnerRouteConstructionSources = [
  "app/exams/page.tsx",
  "components/learner/learner-ui.tsx",
  "app/app/page.tsx",
  "app/app/capture/page.tsx",
  "app/app/input/page.tsx",
  "app/app/entry/page.tsx",
  "app/app/review/page.tsx",
  "app/app/notes/page.tsx",
];
for (const file of learnerRouteConstructionSources) {
  if (!existsSync(sourcePath(file))) continue;
  const source = read(file);
  check(!source.includes("/app/app"), `${file} must not construct duplicated /app/app routes`);
  check(!/(?:href|router\.push|redirect)\s*=*\(?[`'"]app\//.test(source), `${file} must use root-absolute /app links`);
}


const captureRoute = existsSync(sourcePath("app/app/capture/page.tsx")) ? read("app/app/capture/page.tsx") : "";
const captureForm = existsSync(sourcePath("components/review-os/capture-form.tsx")) ? read("components/review-os/capture-form.tsx") : "";
const capture = `${captureRoute}\n${captureForm}`;
check(capture.includes("오늘 한 것 올리기"), "/app/capture must keep warm capture-first CTA copy");
check(capture.includes("사진, PDF, 텍스트 중 하나로 시작하세요."), "/app/capture must render visible photo/PDF/text start copy");
check(capture.includes("OCR과 AI 정리는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다."), "/app/capture must show one OCR/AI draft warning");
check(
  capture.includes("가장 큰 약점 1개") &&
    capture.includes("다음 행동 1개") &&
    capture.includes("오늘 계획에 반영") &&
    capture.includes("복습에 남길 내용"),
  "/app/capture must keep one-biggest-gap focus",
);
check(capture.includes("canQuickSave"), "/app/capture starting point must not show more than one primary action");
check(!/점수|공식\s*채점(?!\s*아님)|채점\s*(?:결과|완료|확정)|합격\s*판정|불합격\s*판정/.test(capture), "/app/capture must not become score-first");
check(!/href=[{\"'`][^\n]*(?:\/instructor|\/studio|\/admin)/i.test(capture), "/app/capture must not expose instructor/admin links");

const learnerShell = existsSync(sourcePath("components/learner/learner-ui.tsx")) ? read("components/learner/learner-ui.tsx") : "";
check(learnerShell.includes('href: "/app/capture"'), "learner Input tab must target /app/capture");
check(learnerShell.includes('href: "/app/notes"'), "learner Notes tab must target /app/notes");
check(learnerShell.includes('activeHrefs: ["/app/capture", "/app/input", "/app/entry", "/app/write"]'), "learner Input tab must mark input aliases active");
check(learnerShell.includes('activeHrefs: ["/app/notes", "/app/items"]'), "learner Notes tab must mark notes/items active");
check(learnerShell.includes('`${href}?mode=${currentMode}`'), "learner nav must preserve selected exam mode");

for (const file of ["app/app/input/page.tsx", "app/app/entry/page.tsx"]) {
  const source = existsSync(sourcePath(file)) ? read(file) : "";
  check(source.includes("redirect(`/app/capture"), `${file} must resolve to /app/capture`);
  check(source.includes('params.set("mode", mode)'), `${file} must preserve mode query param`);
}

const notesRoute = existsSync(sourcePath("app/app/notes/page.tsx")) ? read("app/app/notes/page.tsx") : "";
check(notesRoute.includes("renderReviewOsItemsPage"), "/app/notes must render the existing learner-owned notes list");

const review = existsSync(sourcePath("app/app/review/page.tsx")) ? read("app/app/review/page.tsx") : "";
check(review.includes("재시도") || review.includes("다시"), "/app/review must remain review/retry oriented");

const calculatorRoute = existsSync(sourcePath("app/app/calculator/page.tsx")) ? read("app/app/calculator/page.tsx") : "";
const calculatorPage = existsSync(sourcePath(supportingSources.calculatorPage)) ? read(supportingSources.calculatorPage) : "";
check(calculatorRoute.includes('requestedContext === "practice" || requestedContext === "accounting"'), "/app/calculator must keep practice/accounting context routing");
check(calculatorRoute.includes("focus={params?.focus}"), "/app/calculator must pass focus into the CASIO/accounting workflow");
check(calculatorPage.includes('focus === "casio"'), "calculator workflow must keep CASIO focus handling");

const answerReview = ["app/answer-review/page.tsx", supportingSources.answerReviewClient]
  .filter((file) => existsSync(sourcePath(file)))
  .map(read)
  .join("\n");
check(answerReview.includes("/api/answer-review/structure"), "/answer-review must use the learner structure endpoint");
check(!answerReview.includes("/api/answer-review/grade-second"), "/answer-review must remain separated from grading endpoint copy/calls");
check(!/href=[{"'`][^\n]*(?:\/instructor|\/studio|\/admin)/i.test(answerReview), "/answer-review must not link to instructor/studio/admin");

const onboarding = existsSync(sourcePath("app/app/onboarding/page.tsx")) ? read("app/app/onboarding/page.tsx") : "";
check(onboarding.includes("첫 오늘 계획 만들기"), "/app/onboarding must keep first Today Plan creation copy");
check(onboarding.includes("buildExecutionBridge"), "/app/onboarding must build the execution bridge");

const resultControls = existsSync(sourcePath(supportingSources.resultControls)) ? read(supportingSources.resultControls) : "";
for (const label of ["완료", "틀림", "모르겠음", "다시쓰기 필요", "나중에"]) {
  check(resultControls.includes(label), `execution result controls must include ${label}`);
}

const bridge = existsSync(sourcePath(supportingSources.firstPlanBridge)) ? read(supportingSources.firstPlanBridge) : "";
check(
  bridge.includes('"/app/calculator?mode=second&context=practice&focus=casio"'),
  "CASIO route target must remain /app/calculator with mode=second and context=practice",
);

const todayPlan = existsSync(sourcePath(supportingSources.todayPlan)) ? read(supportingSources.todayPlan) : "";
check(todayPlan.includes("compressTodayPlanToMaxThree"), "Today Plan max 3 compression function must exist");
check(/compressed\.length\s*={2,3}\s*3/.test(todayPlan) || /slice\(0,\s*3\)/.test(todayPlan), "Today Plan max 3 guardrail must be enforced");
const todayPlanEngine = existsSync(sourcePath(supportingSources.todayPlanEngine)) ? read(supportingSources.todayPlanEngine) : "";
check(
  todayPlanEngine.includes("TODAY_PLAN_MAX_PRIMARY_TASKS") && todayPlanEngine.includes("selectActiveTodayPlanTasks"),
  "learner /app Today Plan engine must keep max 3 active primary task output",
);

const morningBrief = existsSync(sourcePath(supportingSources.morningBrief)) ? read(supportingSources.morningBrief) : "";
const morningBriefWithoutGuardrailRegexes = stripRegexLiteralGuardrailLines(morningBrief);
check(morningBrief.includes("previewOnly: true"), "morning brief tasks must be preview-only");
for (const pattern of notificationSendPatterns) {
  check(!pattern.test(morningBriefWithoutGuardrailRegexes), `morning brief must not send notifications (${pattern})`);
}

if (failures.length > 0) {
  console.error("[staging-learner-routes] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("[staging-learner-routes] PASS: staging learner route sources, learner-scope guardrails, result controls, Today Plan max 3, CASIO routing, and preview-only morning brief are ready for closed beta QA.");

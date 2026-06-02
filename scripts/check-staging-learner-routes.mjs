import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const routeSources = new Map([
  ["/app", "app/app/page.tsx"],
  ["/app/onboarding", "app/app/onboarding/page.tsx"],
  ["/app/capture", "app/app/capture/page.tsx"],
  ["/app/session", "app/app/session/page.tsx"],
  ["/app/review", "app/app/review/page.tsx"],
  ["/app/write", "app/app/write/page.tsx"],
  ["/app/calculator", "app/app/calculator/page.tsx"],
]);

const supportingSources = {
  resultControls: "components/review-os/execution-result-controls.tsx",
  firstPlanBridge: "lib/review-os/first-plan-execution-bridge.ts",
  todayPlan: "lib/review-os/today-plan-prioritization.ts",
  morningBrief: "lib/review-os/morning-brief.ts",
};

const learnerForbiddenPatterns = [
  { pattern: /href=[{\"'`][^\n]*(?:\/instructor|\/studio)/i, reason: "learner route links to instructor/studio" },
  { pattern: /router\.push\([^)]*(?:\/instructor|\/studio)/i, reason: "learner route pushes to instructor/studio" },
  { pattern: /\b(?:payment|checkout|paywall)\b/i, reason: "payment/checkout/paywall copy or route" },
  { pattern: /결제|유료/, reason: "payment copy" },
  { pattern: /\barchive\b/i, reason: "public archive copy" },
  { pattern: /아카이브/, reason: "public archive copy" },
  { pattern: /native app|mobile app/i, reason: "native app copy" },
  { pattern: /네이티브 앱|모바일 앱/, reason: "native app copy" },
  { pattern: /공식\s*채점|공식\s*점수|확정\s*점수|합격\s*판정|불합격\s*판정|official\s+grading|official\s+score|final\s+judg/i, reason: "official grading/score claim" },
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

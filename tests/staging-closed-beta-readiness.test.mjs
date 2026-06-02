import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { loadAppraiserCurriculumReference } from "../lib/review-os/curriculum-reference.ts";

const requiredFiles = [
  "docs/closed-beta-staging-qa-checklist.md",
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

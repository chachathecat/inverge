import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildBeginnerFirstPlan, normalizeWeakSubjectName } from "../lib/review-os/beginner-first-plan.ts";
import { loadAppraiserCurriculumReference } from "../lib/review-os/curriculum-reference.ts";

const reference = loadAppraiserCurriculumReference();

function build(overrides = {}) {
  return buildBeginnerFirstPlan({
    examMode: "first",
    daysUntilExam: 120,
    dailyAvailableMinutes: 60,
    currentLevel: "처음 시작",
    ...overrides,
  }, reference);
}

function taskTypes(plan) {
  return plan.todayPlan.map((task) => task.taskType);
}

function serialized(plan) {
  return JSON.stringify(plan);
}

test("1차 beginner with 30 min gets max 3 smaller tasks", () => {
  const plan = build({ examMode: "first", dailyAvailableMinutes: 30, currentLevel: "처음 시작" });
  assert.ok(plan.todayPlan.length > 0);
  assert.ok(plan.todayPlan.length <= 3);
  assert.ok(plan.todayPlan.every((task) => task.estimatedMinutes <= 10));
});

test("1차 weak 회계학 can produce accounting template when preferred", () => {
  const plan = build({
    examMode: "first",
    weakSubjectName: "회계학",
    preferredStart: "회계 계산틀",
    currentLevel: "조금 공부함",
  });
  assert.ok(taskTypes(plan).includes("accounting template"));
});

test("1차 wrong or unknown style signal maps to O/X or cloze", () => {
  const plan = build({ examMode: "first", preferredStart: "O/X", currentLevel: "처음 시작" });
  assert.ok(taskTypes(plan).includes("O/X") || taskTypes(plan).includes("cloze"));
  assert.equal(plan.inferredSignal.result, "unknown");
});

test("2차 beginner gets issue spotting or rewrite", () => {
  const plan = build({ examMode: "second", currentLevel: "처음 시작" });
  assert.ok(taskTypes(plan).includes("issue spotting") || taskTypes(plan).includes("rewrite"));
});

test("2차 실무 plus CASIO preferred can produce CASIO", () => {
  const plan = build({
    examMode: "second",
    weakSubjectName: "감정평가실무",
    preferredStart: "CASIO",
    currentLevel: "조금 공부함",
  });
  assert.ok(taskTypes(plan).includes("CASIO"));
});

test("weak subjects are normalized against selected exam mode", () => {
  assert.equal(normalizeWeakSubjectName("first", " 회계학 "), "회계학");
  assert.equal(normalizeWeakSubjectName("second", "감정평가실무"), "감정평가실무");
  assert.equal(normalizeWeakSubjectName("second", "회계학"), undefined);
  assert.equal(normalizeWeakSubjectName("first", "감정평가실무"), undefined);
});

test("invalid weak subject for selected exam mode is not passed into generated plan", () => {
  const secondPlan = build({ examMode: "second", weakSubjectName: "회계학", preferredStart: "쟁점 찾기" });
  assert.equal(secondPlan.onboardingSummary.weakSubjectName, null);
  assert.notEqual(secondPlan.inferredSignal.subjectName, "회계학");

  const firstPlan = build({ examMode: "first", weakSubjectName: "감정평가실무", preferredStart: "O/X" });
  assert.equal(firstPlan.onboardingSummary.weakSubjectName, null);
  assert.notEqual(firstPlan.inferredSignal.subjectName, "감정평가실무");
});

test("selected exam mode cannot produce a summary with the other exam weak subject", () => {
  const secondPlan = build({ examMode: "second", weakSubjectName: "회계학" });
  assert.notEqual(secondPlan.onboardingSummary.weakSubjectName, "회계학");
  assert.equal(serialized(secondPlan).includes('"weakSubjectName":"회계학"'), false);

  const firstPlan = build({ examMode: "first", weakSubjectName: "감정평가실무" });
  assert.notEqual(firstPlan.onboardingSummary.weakSubjectName, "감정평가실무");
  assert.equal(serialized(firstPlan).includes('"weakSubjectName":"감정평가실무"'), false);
});

test("막판 정리 does not use shame or fear copy", () => {
  const plan = build({ examMode: "first", currentLevel: "막판 정리", daysUntilExam: 14 });
  const text = serialized(plan);
  for (const forbidden of ["게으름", "망했", "불합격", "실패자", "큰일", "공포", "부끄럽"])
    assert.equal(text.includes(forbidden), false, `forbidden copy found: ${forbidden}`);
  assert.match(text, /회수|복구|약점|노드|차분/);
});

test("todayPlan never exceeds 3", () => {
  for (const preferredStart of ["O/X", "개념 회상", "회계 계산틀", "2차 다시쓰기", "CASIO", "쟁점 찾기"]) {
    const plan = build({
      examMode: preferredStart === "CASIO" || preferredStart === "2차 다시쓰기" || preferredStart === "쟁점 찾기" ? "second" : "first",
      weakSubjectName: preferredStart === "회계 계산틀" ? "회계학" : undefined,
      preferredStart,
      currentLevel: "막판 정리",
      daysUntilExam: 7,
    });
    assert.ok(plan.todayPlan.length <= 3, `${preferredStart} exceeded 3 tasks`);
  }
});

test("output includes draft verification warning while needsOfficialVerification is true", () => {
  const plan = build();
  assert.equal(plan.curriculumNextAction.classification.verificationStatus.isOfficiallyVerified, false);
  assert.ok(plan.planWarnings.some((warning) => warning.includes("draft metadata") || warning.includes("초안 메타데이터")));
});

test("no raw text fields are required or emitted", () => {
  const plan = build({ examMode: "second", preferredStart: "2차 다시쓰기" });
  const text = serialized(plan);
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
  ]) {
    assert.equal(text.includes(rawField), false, `raw field emitted: ${rawField}`);
  }
});

test("onboarding page guardrails and mode-preserving primary CTA", async () => {
  const source = await readFile(new URL("../app/app/onboarding/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("첫 오늘 계획 만들기"));
  assert.ok(source.includes("오늘 계획 만들기"));
  assert.ok(source.includes("오늘 할 일 {plan.todayPlan.length}개"));
  assert.ok(source.includes("plan.todayPlan.map"));
  assert.match(source, /function sessionHref\(examMode: AppraiserExamMode\) \{\n  return `\/app\/session\?mode=\$\{examMode\}`;\n\}/);
  assert.ok(source.includes('href={sessionHref(examMode)}>오늘 계획으로 시작</Link>'));
  assert.ok(source.includes('{ value: "first", label: "감정평가사 1차" }'));
  assert.ok(source.includes('{ value: "second", label: "감정평가사 2차" }'));
  assert.ok(source.includes('normalizeWeakSubjectName(examMode, firstValue(params.weakSubjectName))'));
  for (const forbidden of ["/instructor", "instructor", "결제", "payment", "기출 아카이브", "archive", "native app", "네이티브 앱", "공식 채점", "공식 점수"])
    assert.equal(source.includes(forbidden), false, `forbidden onboarding source found: ${forbidden}`);
});

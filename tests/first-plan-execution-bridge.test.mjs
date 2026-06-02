import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { buildBeginnerFirstPlan } from "../lib/review-os/beginner-first-plan.ts";
import { buildExecutionBridge, buildExecutionHrefForTask } from "../lib/review-os/first-plan-execution-bridge.ts";

function hrefFor(taskType, context = { examMode: "first", weakSubjectName: "민법", source: "onboarding" }) {
  return buildExecutionHrefForTask({ id: `task-${taskType}`, taskType }, context);
}

function assertNoInstructorRoute(href) {
  assert.equal(href.includes("/instructor"), false, `instructor route leaked: ${href}`);
  assert.equal(href.includes("/studio"), false, `studio route leaked: ${href}`);
}

test("O/X task preserves mode=first", () => {
  const href = hrefFor("O/X");
  assert.match(href, /^\/app\/first\/ox\?/);
  assert.ok(new URL(`https://example.test${href}`).searchParams.get("mode") === "first");
  assert.ok(href.includes(encodeURIComponent("민법")));
});

test("cloze task preserves mode=first", () => {
  const href = hrefFor("cloze");
  const url = new URL(`https://example.test${href}`);
  assert.equal(url.pathname, "/app/session");
  assert.equal(url.searchParams.get("mode"), "first");
  assert.equal(url.searchParams.get("focus"), "cloze");
});

test("accounting template task preserves mode=first", () => {
  const href = hrefFor("accounting template", { examMode: "first", weakSubjectName: "회계학", source: "onboarding" });
  const url = new URL(`https://example.test${href}`);
  assert.equal(url.pathname, "/app/calculator");
  assert.equal(url.searchParams.get("mode"), "first");
  assert.equal(url.searchParams.get("context"), "accounting");
});

test("rewrite task goes to second write route", () => {
  assert.equal(hrefFor("rewrite", { examMode: "second", weakSubjectName: "감정평가이론", source: "onboarding" }), "/app/write?mode=second");
});

test("CASIO task goes to second write/CASIO-safe route", () => {
  const href = hrefFor("CASIO", { examMode: "second", weakSubjectName: "감정평가실무", source: "onboarding" });
  const url = new URL(`https://example.test${href}`);
  assert.equal(url.pathname, "/app/write");
  assert.equal(url.searchParams.get("mode"), "second");
  assert.equal(url.searchParams.get("focus"), "casio");
});

test("issue spotting task goes to second write/issue-safe route", () => {
  const href = hrefFor("issue spotting", { examMode: "second", weakSubjectName: "감정평가 및 보상법규", source: "onboarding" });
  const url = new URL(`https://example.test${href}`);
  assert.equal(url.pathname, "/app/write");
  assert.equal(url.searchParams.get("mode"), "second");
  assert.equal(url.searchParams.get("focus"), "issue_spotting");
});

test("fallback first does not expose instructor route", () => {
  const href = hrefFor("unknown task", { examMode: "first", weakSubjectName: "민법", source: "today_plan" });
  const url = new URL(`https://example.test${href}`);
  assert.equal(url.pathname, "/app/capture");
  assert.equal(url.searchParams.get("mode"), "first");
  assertNoInstructorRoute(href);
});

test("fallback second does not expose instructor route", () => {
  const href = hrefFor("unknown task", { examMode: "second", weakSubjectName: "감정평가실무", source: "today_plan" });
  assert.equal(href, "/app/write?mode=second");
  assertNoInstructorRoute(href);
});

test("onboarding page uses bridge helper for task action links", async () => {
  const source = await readFile(new URL("../app/app/onboarding/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('buildExecutionBridge(plan.todayPlan'));
  assert.ok(source.includes('source: "onboarding"'));
  assert.ok(source.includes("executionBridge?.primaryHref"));
  assert.ok(source.includes("이 과제 시작"));
});

test("Today Plan remains max 3", () => {
  const plan = buildBeginnerFirstPlan({
    examMode: "first",
    daysUntilExam: 14,
    dailyAvailableMinutes: 180,
    currentLevel: "막판 정리",
    weakSubjectName: "회계학",
    preferredStart: "회계 계산틀",
  });
  const bridge = buildExecutionBridge(plan.todayPlan, { examMode: "first", weakSubjectName: plan.onboardingSummary.weakSubjectName, source: "onboarding" });
  assert.ok(plan.todayPlan.length <= 3);
  assert.ok(bridge.tasks.length <= 3);
});

test("no payment/archive/native-app/instructor copy is introduced", async () => {
  const files = [
    "../app/app/onboarding/page.tsx",
    "../lib/review-os/first-plan-execution-bridge.ts",
  ];
  const combined = (await Promise.all(files.map((file) => readFile(new URL(file, import.meta.url), "utf8")))).join("\n").toLowerCase();
  for (const forbidden of ["/instructor", "instructor", "결제", "payment", "기출 아카이브", "public archive", "native app", "네이티브 앱", "공식 채점", "official grading"]) {
    assert.equal(combined.includes(forbidden), false, `forbidden copy found: ${forbidden}`);
  }
});

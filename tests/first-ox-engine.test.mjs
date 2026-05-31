import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import {
  buildFirstOxLearningSignalInput,
  buildFirstOxWrongAnswerItemInput,
  evaluateFirstOxAttempt,
  normalizeFiveChoiceItemToStatements,
  resolveFirstOxLearningSignalKind,
  shuffleFirstOxStatements,
} from "../lib/review-os/first-ox-engine.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

const choices = [
  "① 할 수 있다와 하여야 한다를 구별한다.",
  "② 원칙과 예외는 항상 같은 효과이다.",
  "③ 전부가 아니라 일부만 무효일 수 있다.",
  "④ 원시취득과 승계취득은 승계 여부로 구별된다.",
  "⑤ 인식, 측정, 평가는 회계학에서 구별된다.",
];

function statements() {
  return normalizeFiveChoiceItemToStatements({
    id: "source-1",
    subject: "민법",
    stem: "옳은 것은?",
    choices,
    expectedOxByChoice: ["O", "X", "O", "O", "O"],
    topicCandidate: "표현 함정",
    conceptCandidate: "원칙·예외",
  });
}

test("5-choice item becomes 5 independent O/X statements with trap words", () => {
  const normalized = statements();
  assert.equal(normalized.length, 5);
  assert.equal(normalized.every((item) => item.statementText.length > 0), true);
  assert.equal(normalized.some((item) => item.statementText.includes("①")), false);
  assert.ok(normalized[0].trapWords.includes("할 수 있다"));
  assert.ok(normalized[0].trapWords.includes("하여야 한다"));
});

test("practice order is not the original answer-position order", () => {
  const normalized = statements();
  const shuffled = shuffleFirstOxStatements(normalized);
  assert.deepEqual(new Set(shuffled.map((item) => item.id)), new Set(normalized.map((item) => item.id)));
  assert.notDeepEqual(shuffled.map((item) => item.id), normalized.map((item) => item.id));
});

test("incorrect/certain creates high-priority retry learning signal", () => {
  const statement = statements()[1];
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  assert.equal(attempt.result, "incorrect");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "wrong_answer_retry");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  assert.ok(signal?.derivedTags.includes("wrong_answer_retry"));
  const item = buildFirstOxWrongAnswerItemInput(statement, attempt);
  assert.equal(item?.userReasonPreset, "선지 오독");
  assert.equal(item?.confidence, "중간");
});

test("confused creates review signal even when answer is correct", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "O", "confused", "2026-05-30T00:00:00.000Z");
  assert.equal(attempt.result, "correct");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "weak_confidence");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  assert.ok(signal?.derivedTags.includes("weak_confidence"));
});

test("correct/certain does not create unnecessary review item", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  assert.equal(attempt.result, "correct");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "none");
  assert.equal(buildFirstOxLearningSignalInput(statement, attempt), null);
  assert.equal(buildFirstOxWrongAnswerItemInput(statement, attempt), null);
});

test("unknown creates needs-concept-review signal", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  assert.equal(resolveFirstOxLearningSignalKind(attempt), "needs_concept_review");
  const signal = buildFirstOxLearningSignalInput(statement, attempt);
  assert.equal(signal?.nextTaskType, "concept_review");
});

test("Today Plan can surface first_ox_retry and route the primary CTA to O/X practice", () => {
  const statement = statements()[1];
  const attempt = evaluateFirstOxAttempt(statement, "O", "certain", "2026-05-30T00:00:00.000Z");
  const signal = {
    ...buildFirstOxLearningSignalInput(statement, attempt),
    id: "sig-1",
    userId: "u1",
    createdAt: "2026-05-30T00:00:00.000Z",
  };
  const tasks = buildTodayPlanTasks({ mode: "first", queue: [], items: [], learningSignals: [signal], now: new Date("2026-05-30T00:10:00.000Z") });
  assert.equal(tasks[0]?.task_type, "first_ox_retry");
  assert.equal(tasks[0]?.source_label, "1차 O/X 기반");
  assert.deepEqual(tasks[0]?.primary_cta, { label: "5분 O/X 재시도", hrefKind: "first_ox" });
});

test("first-ox concept-review signal still returns to the O/X statement surface", () => {
  const statement = statements()[0];
  const attempt = evaluateFirstOxAttempt(statement, "unknown", "unknown", "2026-05-30T00:00:00.000Z");
  const signal = {
    ...buildFirstOxLearningSignalInput(statement, attempt),
    id: "sig-concept-1",
    userId: "u1",
    createdAt: "2026-05-30T00:00:00.000Z",
  };
  const tasks = buildTodayPlanTasks({ mode: "first", queue: [], items: [], learningSignals: [signal], now: new Date("2026-05-30T00:10:00.000Z") });
  assert.equal(tasks[0]?.task_type, "concept_review");
  assert.equal(tasks[0]?.source_label, "1차 O/X 기반");
  assert.equal(tasks[0]?.primary_cta.hrefKind, "first_ox");
});

test("app resolves first O/X task CTA hrefs to the dedicated route", async () => {
  await access("app/app/first/ox/page.tsx");
  const homeSource = await readFile("app/app/page.tsx", "utf8");
  assert.match(homeSource, /hrefKind === "first_ox"\) return "\/app\/first\/ox"/);
});

test("learner UI hides instructor route and raw internal fields while showing trap highlights after answer", async () => {
  const source = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  assert.equal(source.includes("/instructor"), false);
  assert.equal(/rawPayload|derivedPayload|metadataJson|official_answer_authority/.test(source), false);
  assert.match(source, /highlightTrapWords/);
  assert.match(source, /currentAttempt \? highlightTrapWords/);
});

test("mobile surface avoids horizontal overflow and keeps one statement card", async () => {
  const source = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");
  assert.match(source, /overflow-x-hidden/);
  assert.match(source, /w-full/);
  assert.equal((source.match(/현재 선지/g) ?? []).length, 1);
});

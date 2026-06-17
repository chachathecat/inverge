import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("home daily command card keeps one primary CTA and folds details", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  ["오늘 할 일", "오늘 한 것 1개를 정리하면 가장 큰 약점 1개와 다음 행동 1개로 이어집니다.", "채점 확정이 아니라, 다음 행동을 정리하는 학습 운영 도구입니다."].forEach((t) =>
    assert.ok(source.includes(t)),
  );
  assert.ok(source.includes("<details"));
});

test("learner home maps task types to calm labels instead of raw internals", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

  assert.ok(source.includes("resolveTaskTypeLabel(task.task_type)"));
  assert.ok(source.includes("OCR 확인"));
  assert.ok(source.includes("문단 다시쓰기"));
  assert.equal(source.includes("{task.task_type}"), false);
  assert.equal(source.includes("유형:</span> {task.task_type}"), false);
});

test("capture initial surface is one-input with text first", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  [
    "빠른 입력",
    "텍스트로 시작",
    "텍스트 입력으로 이동",
    "오늘 공부한 내용이나 내 답안을 바로 붙여넣으세요.",
    "학습 노트 초안 만들기",
    "AI로 정리",
    "사진 찍기",
    "촬영하거나 업로드한 뒤 OCR 초안을 직접 확인합니다.",
    "OCR 상태",
  ].forEach((t) => assert.ok(source.includes(t)));
});

test("first and second session order enforces retrieval/rewrite first", async () => {
  const source = await readFile(new URL("../components/review-os/today-session-runner.tsx", import.meta.url), "utf8");
  ["해설 보기 전, 근거 1문장", "짧은 재풀이", "함정 카드 3개", "다음 복습 예약", "쟁점 1개 회상", "문단 1개 다시쓰기", "전후 비교", "다음 보강 예약"].forEach((t) => assert.ok(source.includes(t)));
});

test("first-mode retrieval gate keeps explanation hidden until recall input", async () => {
  const source = await readFile(new URL("../components/review-os/today-session-runner.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("retrievalSentence.trim().length > 3"));
  assert.ok(source.includes("설명:"));
});

test("core loop keeps no more than one primary CTA in each execution step", async () => {
  const source = await readFile(new URL("../components/review-os/today-session-runner.tsx", import.meta.url), "utf8");
  [
    "추천 작업으로 시작",
    "근거 1문장 남기기",
    "다음: 함정 카드 3개",
    "다음: 회상 문장 작성",
    "다음: 틀린 이유 1개 선택",
    "다음: 문단 1개 다시쓰기",
  ].forEach((t) => assert.ok(source.includes(t)));
  assert.ok(source.includes("다른 작업 보기"));
});



test("second-write flow hides global footer until step 6 and keeps defer actions under details", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.match(source, /const hideGlobalFooterActions =\s*mode === "second" && secondModeHiddenFooterStages\.has\(stage\);/);
  assert.ok(source.includes("{!hideGlobalFooterActions ? ("));
  assert.ok(source.includes("다른 선택"));
  assert.ok(source.includes("다시 쓰기"));
  assert.ok(source.includes("나중에 하기"));
});

test("second-write flow starts from step 1 copy and no separate setup card", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("강의/교재 정리 보기 전, 쟁점 1개만 적으세요."));
  assert.ok(source.includes("과목:"));
  assert.ok(source.includes("과목 바꾸기"));
  assert.equal(source.includes("설정"), false);
});

test("second-write flow gates step 4 by step 3 answer and step 5 by step 4 reference", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.match(source, /if \(form\.userAnswer\.trim\(\)\.length >= 8\) \{\s*update\("productionBeforeComparison", true\);\s*setStage\("second-reference"\);\s*\}/);
  assert.match(source, /update\("referenceAnswerAddedAfterProduction", true\);\s*setStage\("second-gap"\);/);
});

test("learner writing flow copy keeps no instructor/grading/payment claims", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  ["/instructor", "pass/fail", "합격/불합격", "결제"].forEach((forbidden) => {
    assert.equal(source.includes(forbidden), false, `Forbidden token found: ${forbidden}`);
  });
});

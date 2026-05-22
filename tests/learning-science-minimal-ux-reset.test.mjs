import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("home daily command card keeps one primary CTA and folds details", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  ["오늘은 이것만 합니다", "오늘은 복구만 합니다", "오늘은 여기까지 해도 됩니다"].forEach((t) => assert.ok(source.includes(t)));
  assert.ok(source.includes("<details"));
});

test("capture initial surface is one-input with photo first", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  ["오늘 한 것 올리기", "사진 찍기", "텍스트로 입력", "사진 촬영 팁", "OCR 상태", "캡처 유형"].forEach((t) => assert.ok(source.includes(t)));
});

test("first and second session order enforces retrieval/rewrite first", async () => {
  const source = await readFile(new URL("../components/review-os/today-session-runner.tsx", import.meta.url), "utf8");
  ["해설 보기 전, 근거 1문장", "짧은 재풀이", "함정 카드 3개", "다음 복습 예약", "쟁점 1개 회상", "문단 1개 다시쓰기", "전후 비교", "다음 보강 예약"].forEach((t) => assert.ok(source.includes(t)));
});



test("second-write flow hides global footer until step 6 and keeps defer actions under details", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('!(secondWriteEnabled && stage !== "second-rewrite")'));
  assert.ok(source.includes("다른 선택"));
  assert.ok(source.includes("다시 쓰기"));
  assert.ok(source.includes("나중에 하기"));
});

test("second-write flow starts from step 1 copy and no separate setup card", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("기준답안 보기 전, 쟁점 1개만 적으세요."));
  assert.ok(source.includes("과목:"));
  assert.ok(source.includes("과목 바꾸기"));
  assert.equal(source.includes("설정"), false);
});

test("second-write flow gates step 4 by step 3 answer and step 5 by step 4 reference", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('if (form.userAnswer.trim().length >= 8) setStage("second-reference")'));
  assert.ok(source.includes('if (form.correctAnswer.trim().length >= 8) setStage("second-gap")'));
});

test("learner writing flow copy keeps no instructor/grading/payment claims", async () => {
  const source = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  ["/instructor", "pass/fail", "합격/불합격", "결제"].forEach((forbidden) => {
    assert.equal(source.includes(forbidden), false, `Forbidden token found: ${forbidden}`);
  });
});

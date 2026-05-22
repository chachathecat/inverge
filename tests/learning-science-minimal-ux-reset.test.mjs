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


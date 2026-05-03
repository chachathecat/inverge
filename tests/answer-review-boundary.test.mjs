import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('learner answer-review does not expose second grader panel text', async () => {
  const source = await readFile(new URL('../app/answer-review/answer-review-client.tsx', import.meta.url), 'utf8');
  assert.equal(source.includes('2차 채점관 모드'), false);
});

test('instructor second grading page exists', async () => {
  const source = await readFile(new URL('../app/instructor/second-grading/page.tsx', import.meta.url), 'utf8');
  assert.ok(source.includes('SecondGradingClient'));
});

test('learner answer-review does not link instructor OCR route', async () => {
  const learnerSource = await readFile(new URL('../app/answer-review/answer-review-client.tsx', import.meta.url), 'utf8');
  assert.equal(learnerSource.includes('/api/instructor/second-grading/ocr'), false);
});

test('instructor second-grading OCR UI is scoped to instructor page', async () => {
  const instructorSource = await readFile(new URL('../app/instructor/second-grading/second-grading-client.tsx', import.meta.url), 'utf8');
  assert.ok(instructorSource.includes('/api/instructor/second-grading/ocr'));
  assert.ok(instructorSource.includes('multiple'));
  assert.ok(instructorSource.includes('[OCR page ${pageNumber}]'));
  assert.ok(instructorSource.includes('페이지 순서 확인 필요'));
  assert.ok(instructorSource.includes('문제번호 확인'));
  assert.ok(instructorSource.includes('accept="image/*,.pdf"'));
  assert.ok(instructorSource.includes('capture="environment"'));
});


test("learner capture flow keeps instructor OCR route separated and editable OCR notice", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.equal(learnerCapture.includes("/api/instructor/second-grading/ocr"), false);
  assert.ok(learnerCapture.includes("OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요."));
  assert.ok(learnerCapture.includes("capture=\"environment\""));
});

test("learner capture mobile inputs and extraction states are explicit", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes("사진 찍기"));
  assert.ok(learnerCapture.includes("이미지 업로드"));
  assert.ok(learnerCapture.includes("PDF 선택"));
  assert.ok(learnerCapture.includes("입력 상태"));
  assert.ok(learnerCapture.includes("manual"));
  assert.ok(learnerCapture.includes("uploading"));
  assert.ok(learnerCapture.includes("extracting"));
  assert.ok(learnerCapture.includes("succeeded"));
  assert.ok(learnerCapture.includes("failed"));
  assert.ok(learnerCapture.includes("PDF는 현재 파일명 보관과 수동 텍스트 입력을 지원합니다. 필요한 부분을 아래 입력창에 붙여넣어 주세요."));
});

test("learner capture failure copy is calm and draft-preserving", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes("텍스트 추출에 실패했습니다. 직접 붙여넣거나 다시 시도해 주세요."));
  assert.ok(learnerCapture.includes("저장 전 내용을 한 번 확인해 주세요."));
  assert.ok(learnerCapture.includes("rawQuestionText: extractedText || form.rawQuestionText"));
});

test("learner capture does not auto-save or auto-grade after OCR/PDF", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.equal(learnerCapture.includes("/api/answer-review/grade-second"), false);
  assert.ok(learnerCapture.includes('setStage("preview")'));
  assert.ok(learnerCapture.includes("페이지 순서"));
});

test("saved learner capture copy shows one biggest gap and one next action choices", async () => {
  const itemsPage = await readFile(new URL("../app/app/items/page.tsx", import.meta.url), "utf8");
  assert.ok(itemsPage.includes("가장 큰 간극 1개와 다음 행동 1개"));
  assert.ok(itemsPage.includes("오늘 계획에 반영"));
  assert.ok(itemsPage.includes("다시 풀기/다시 쓰기"));
  assert.ok(itemsPage.includes("나중에 하기") || itemsPage.includes("나중에 복습"));
});

test("capture defer action label does not imply persistence", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes("나중에 하기"));
  assert.equal(learnerCapture.includes("나중에 복습"), false);
});


test("reset clears extraction state and uploaded pages", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes("setExtractionState(\"idle\")"));
  assert.ok(learnerCapture.includes("setUploadedPages([])"));
});

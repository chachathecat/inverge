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
  assert.ok(learnerSource.includes('inverge.problemSnap.answerReviewHandoff'));
  assert.ok(learnerSource.includes('handoff.source !== "problem-snap"'));
  assert.ok(learnerSource.includes('Problem Snap에서 다시 푼 답안을 불러왔습니다.'));
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
  assert.match(learnerCapture, /노트 원문은 비공개로 보관되며,\s*파생 학습 신호는 개인 추천 개선에만\s*사용됩니다\./);
  assert.ok(learnerCapture.includes("capture=\"environment\""));
});

test("learner capture mobile inputs and extraction states are explicit", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes("사진 찍기"));
  assert.ok(learnerCapture.includes("앨범에서 선택"));
  assert.ok(learnerCapture.includes("PDF 선택"));
  assert.ok(learnerCapture.includes("OCR 상태"));
  assert.ok(learnerCapture.includes("manual"));
  assert.ok(learnerCapture.includes("uploading"));
  assert.ok(learnerCapture.includes("extracting"));
  assert.ok(learnerCapture.includes("succeeded"));
  assert.ok(learnerCapture.includes("failed"));
  assert.ok(learnerCapture.includes("현재 PDF는 파일명만 기록됩니다. 내용은 직접 붙여넣어 주세요."));
  assert.ok(learnerCapture.includes("사진 촬영 팁"));
  assert.ok(learnerCapture.includes("그림자가 적게 찍기"));
  assert.ok(learnerCapture.includes("한 페이지씩 정면으로 찍기"));
  assert.ok(learnerCapture.includes("흔들리면 다시 찍기"));
});

test("learner capture failure copy is calm and draft-preserving", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes("텍스트 추출에 실패했습니다. 직접 붙여넣거나 다시 시도해 주세요."));
  assert.ok(learnerCapture.includes("현재 PDF는 파일명만 기록됩니다. 내용은 직접 붙여넣어 주세요."));
  assert.ok(learnerCapture.includes("rawQuestionText: extractedText || form.rawQuestionText"));
});

test("learner capture does not auto-save or auto-grade after OCR/PDF", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.equal(learnerCapture.includes("/api/answer-review/grade-second"), false);
  assert.ok(learnerCapture.includes('setStage("preview")'));
  assert.ok(learnerCapture.includes("페이지 순서"));
  assert.ok(learnerCapture.includes("저장 전 캡처 품질 체크"));
  assert.ok(learnerCapture.includes("글자가 선명한가"));
  assert.ok(learnerCapture.includes("페이지 순서가 맞는가"));
  assert.ok(learnerCapture.includes("문제번호가 보이는가"));
  assert.ok(learnerCapture.includes("계산/답/단위가 보이는가"));
  assert.ok(learnerCapture.includes("끝/이하여백 표시가 있는가"));
});

test("first mode is not overloaded with second-only capture quality checklist", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes('{mode === "second" ? ('));
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

test("second write flow includes all micro-step labels", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  ["Step 1. 쟁점 회상", "Step 2. 목차 작성", "Step 3. 내 답안 작성", "Step 4. 기준답안/해설 입력", "Step 5. 가장 큰 간극 1개", "Step 6. 문단 다시쓰기"].forEach((label) => {
    assert.ok(learnerCapture.includes(label), `Missing step label: ${label}`);
  });
});

test("second write flow keeps advanced fields behind details and one-primary-step copy", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes("세부 입력 보기 (선택)"));
  assert.ok(learnerCapture.includes("<details"));
  assert.ok(learnerCapture.includes("전체 답안보다 목차 3줄이 먼저입니다."));
  assert.ok(learnerCapture.includes("완벽히 쓰지 말고, 지금 떠오르는 문장만 적으세요."));
  assert.ok(learnerCapture.includes("비교는 작성 이후에 합니다."));
});

test("second write flow stage order enforces own answer before reference comparison", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes('"second-answer"'));
  assert.ok(learnerCapture.includes('"second-reference"'));
  assert.ok(learnerCapture.includes('"second-gap"'));
  assert.match(learnerCapture, /if \(form\.userAnswer\.trim\(\)\.length >= 8\) \{\s*update\("productionBeforeComparison", true\);\s*setStage\("second-reference"\);\s*\}/);
  assert.match(learnerCapture, /update\("referenceAnswerAddedAfterProduction", true\);\s*setStage\("second-gap"\);/);
});

test("second rewrite step stores rewritten paragraph separately from original answer", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  assert.ok(learnerCapture.includes('value={form.rewriteParagraph}'));
  assert.ok(learnerCapture.includes('update("rewriteParagraph", event.target.value);'));
  assert.ok(learnerCapture.includes("처음 쓴 답안 보기"));
  assert.ok(learnerCapture.includes("한 문단만 다시 씁니다."));
});

test("second write answer templates include all official second subjects", async () => {
  const learnerCapture = await readFile(new URL("../components/review-os/capture-form.tsx", import.meta.url), "utf8");
  ["감정평가실무", "문제 요구:", "계산 근거:", "감정평가이론", "정의:", "논거:", "사례 적용:", "감정평가 및 보상법규", "요건:", "조문/법리:", "사안 포섭:"].forEach((token) => {
    assert.ok(learnerCapture.includes(token), `Missing template token: ${token}`);
  });
});

import {
  buildTodayPlanItemsFromReviewTasks,
  buildReviewQueueSections,
  computeReadinessRiskFromSignals,
  createFirstRoundFastDrillSignal,
  createLearningNote,
  createReviewTaskFromSignal,
  createSecondAnswerWorkspaceSignal,
  createRewriteTaskFromSecondAnswer,
  deleteLearningNoteAndDependents,
  exportUserOwnedLearningNotes,
  PRIVACY_DATA_CLASSES,
} from "../lib/review-os/learning-os-data-spine.mjs";

test("creating a second-mode answer can create a rewrite task", () => {
  const signal = createSecondAnswerWorkspaceSignal({
    id: "s-second-1",
    examMode: "second",
    subject: "감정평가실무",
    sourceType: "text",
    confidence: "낮음",
    dueAt: "2026-05-03T00:00:00.000Z",
    explainableBy: ["weak_structure:논거 누락"],
  });
  const rewrite = createRewriteTaskFromSecondAnswer(signal);
  assert.ok(rewrite);
  assert.equal(rewrite?.taskType, "rewrite");
});

test("creating a first-mode low-confidence answer can create a review task", () => {
  const signal = createFirstRoundFastDrillSignal({
    id: "s-first-1",
    examMode: "first",
    subject: "민법",
    sourceType: "manual",
    confidence: "낮음",
    dueAt: "2026-05-03T00:00:00.000Z",
    explainableBy: ["confidence:low"],
  });
  const reviewTask = createReviewTaskFromSignal(signal);
  assert.equal(reviewTask.examMode, "first");
  assert.equal(reviewTask.confidence, "낮음");
});

test("today plan can pull due review tasks", () => {
  const now = new Date("2026-05-03T12:00:00.000Z");
  const dueTask = { ...createReviewTaskFromSignal(createFirstRoundFastDrillSignal({ id: "due", examMode: "first", subject: "민법", sourceType: "text", dueAt: "2026-05-02T00:00:00.000Z" })) };
  const futureTask = { ...createReviewTaskFromSignal(createFirstRoundFastDrillSignal({ id: "future", examMode: "first", subject: "민법", sourceType: "text", dueAt: "2026-05-04T00:00:00.000Z" })) };
  const plan = buildTodayPlanItemsFromReviewTasks([futureTask, dueTask], now);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].reviewTaskId, dueTask.id);
});

test("today plan limits to 3 primary items and skips completed", () => {
  const now = new Date("2026-05-06T12:00:00.000Z");
  const tasks = ["a", "b", "c", "d", "e"].map((id, idx) => ({
    ...createReviewTaskFromSignal(createFirstRoundFastDrillSignal({ id, examMode: "first", subject: "민법", sourceType: "text", dueAt: `2026-05-0${idx + 1}T00:00:00.000Z` })),
  }));
  tasks[0].completedAt = "2026-05-03T08:00:00.000Z";
  const plan = buildTodayPlanItemsFromReviewTasks(tasks, now);
  assert.equal(plan.length, 3);
  assert.equal(plan.some((item) => item.reviewTaskId === tasks[0].id), false);
});

test("review queue sections keep rewrite/retry routing hints", () => {
  const now = new Date("2026-05-03T12:00:00.000Z");
  const secondSignal = createSecondAnswerWorkspaceSignal({ id: "second-rw", examMode: "second", subject: "감정평가실무", sourceType: "text", dueAt: "2026-05-02T00:00:00.000Z" });
  const firstSignal = createFirstRoundFastDrillSignal({ id: "first-rv", examMode: "first", subject: "민법", sourceType: "text", dueAt: "2026-05-04T00:00:00.000Z" });
  const tasks = [createRewriteTaskFromSecondAnswer(secondSignal), createReviewTaskFromSignal(firstSignal)].filter(Boolean);
  const sections = buildReviewQueueSections(tasks, now);
  assert.equal(sections.dueTasks[0].examMode, "second");
  assert.equal(sections.upcomingTasks[0].examMode, "first");
});

test("home page includes today plan/review queue and no pass-fail score copy", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("Today Plan"));
  assert.ok(source.includes("Review Queue"));
  assert.ok(source.includes("완료 처리하기"));
  assert.ok(source.includes("추천은 저장된 학습 신호 기반입니다."));
  assert.equal(source.includes("점수 예측"), false);
  assert.equal(source.includes("합격/불합격 예측"), false);
});

test("readiness risk does not use score/pass/fail prediction", () => {
  const fnSource = computeReadinessRiskFromSignals.toString();
  assert.equal(/score|pass|fail|합격|불합격/.test(fnSource), false);
  const risks = computeReadinessRiskFromSignals([
    createSecondAnswerWorkspaceSignal({ id: "risk-1", examMode: "second", subject: "감정평가이론", sourceType: "text", confidence: "낮음", mistakeType: "논점 누락", weakStructurePoint: "근거 부족", explainableBy: ["signal:risk"] }),
  ]);
  assert.equal(risks[0].level, "high");
  assert.ok(risks[0].explainableSignals.length > 0);
});

test("deleting a note removes private raw references", () => {
  const note = createLearningNote({
    id: "note-1",
    examMode: "second",
    subject: "감정평가 및 보상법규",
    sourceType: "image",
    rawRefIds: ["raw-1", "raw-2"],
  });
  const rawRefStore = new Map([
    ["raw-1", { body: "private answer" }],
    ["raw-2", { body: "private answer 2" }],
    ["raw-3", { body: "keep" }],
  ]);
  const result = deleteLearningNoteAndDependents(note, rawRefStore);
  assert.deepEqual(result.deletedRawRefs, ["raw-1", "raw-2"]);
  assert.equal(rawRefStore.has("raw-1"), false);
  assert.equal(rawRefStore.has("raw-2"), false);
  assert.equal(rawRefStore.has("raw-3"), true);
});

test("privacy data classes are explicitly defined", () => {
  assert.deepEqual(Object.keys(PRIVACY_DATA_CLASSES), [
    "rawUserAnswer",
    "uploadedImagePdf",
    "ocrText",
    "userEditedText",
    "derivedLearningSignal",
    "anonymizedAggregateInsight",
    "productQualityMetric",
  ]);
});

test("raw OCR-like text is not copied into derived explainable signals", () => {
  const rawLike = "원문 답안 문장입니다. ".repeat(20);
  const signal = createFirstRoundFastDrillSignal({
    id: "agg-raw-filter-1",
    examMode: "first",
    subject: "민법",
    sourceType: "text",
    explainableBy: [rawLike, "mistake_type:조건 누락"],
  });
  assert.deepEqual(signal.explainableBy, ["mistake_type:조건 누락"]);
});

test("export includes user-owned notes", () => {
  const note = createLearningNote({
    id: "note-export-1",
    examMode: "second",
    subject: "감정평가실무",
    sourceType: "manual",
    topicCandidate: "원가법",
    nextAction: "rewrite",
  });
  const exported = exportUserOwnedLearningNotes([note]);
  assert.equal(exported.length, 1);
  assert.equal(exported[0].id, "note-export-1");
  assert.equal(exported[0].topicCandidate, "원가법");
});

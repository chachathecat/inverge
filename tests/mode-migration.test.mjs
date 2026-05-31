import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  MODE_MIGRATION_CONFIRMATION_COPY,
  buildFirstToSecondMigrationSnapshot,
  buildSecondModeMigrationLearningSignal,
} from "../lib/review-os/mode-migration.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

function firstItem(overrides = {}) {
  return {
    id: overrides.id ?? "first-item-1",
    userId: "u1",
    examName: "감정평가사 1차",
    subjectLabel: overrides.subjectLabel ?? "민법",
    sourceType: "manual",
    problemTitle: "민법 오답",
    rawQuestionText: "원문 문제 텍스트가 여기에 있지만 복사되면 안 됩니다.",
    rawAnswerText: "사용자 답안 원문이 여기에 있지만 복사되면 안 됩니다.",
    correctAnswer: "O",
    userAnswer: "X",
    confidence: overrides.confidence ?? "낮음",
    timeSpentSeconds: null,
    dedupeKey: "d1",
    processingStatus: "completed",
    rawPayload: { raw_ocr_text: "OCR 원문 금지", userAnswer: "사용자 원답안 금지" },
    derivedPayload: { conceptCandidate: overrides.conceptCandidate ?? "대리권 요건", reviewStage: overrides.reviewStage ?? "빈칸" },
    conceptCard: overrides.conceptCard ?? {
      sourceType: "first_ox",
      examMode: "감정평가사 1차",
      subject: "민법",
      trapWords: ["요건"],
      coreRule: "대리권 요건",
      minimalExplanation: "요건 확인",
      examTrapExplanation: "표현 오독",
      nextReviewAction: "근거 회상",
      reviewStage: "빈칸",
      dueAt: "2026-05-30T00:00:00.000Z",
      concept_candidate: overrides.conceptCandidate ?? "대리권 요건",
      official_answer_authority: false,
    },
    createdAt: "2026-05-30T00:00:00.000Z",
    updatedAt: "2026-05-30T00:00:00.000Z",
    ...overrides,
  };
}

function firstQueue(overrides = {}) {
  return {
    queueId: overrides.queueId ?? "q1",
    itemId: overrides.itemId ?? "first-item-1",
    examName: "감정평가사 1차",
    subjectLabel: overrides.subjectLabel ?? "민법",
    problemTitle: "보관될 1차 큐",
    topicTag: overrides.topicTag ?? "대리권",
    mistakeType: overrides.mistakeType ?? "요건 누락",
    reviewReason: "복습 예정",
    priorityScore: 90,
    dueAt: "2026-05-30T00:00:00.000Z",
    recurrenceCount: 2,
    confidence: overrides.confidence ?? "낮음",
    timeSpentSeconds: null,
    createdFromCapture: false,
    itemCreatedAt: "2026-05-29T00:00:00.000Z",
    ...overrides,
  };
}

test("migration snapshot preserves first-exam history and carries only safe derived signals", () => {
  const snapshot = buildFirstToSecondMigrationSnapshot({
    firstItems: [firstItem(), firstItem({ id: "first-item-2", subjectLabel: "감정평가관계법규", conceptCandidate: "수용 절차" })],
    firstQueue: [firstQueue(), firstQueue({ queueId: "q2", subjectLabel: "감정평가관계법규", mistakeType: "절차 순서 혼동" })],
    firstLearningSignals: [{
      id: "s1",
      userId: "u1",
      examMode: "감정평가사 1차",
      subject: "민법",
      sourceType: "first_ox",
      derivedTags: ["대리권 요건"],
      relatedFormulas: [],
      nextTaskType: "review",
      nextTask: "회상",
      metadataJson: { conceptCandidate: "대리권 요건", reviewStage: "O/X", rawQuestionText: "누출 금지" },
      createdAt: "2026-05-31T00:00:00.000Z",
    }],
    migratedAt: "2026-05-31T00:00:00.000Z",
  });

  assert.equal(snapshot.activeMode, "second");
  assert.equal(snapshot.archivedMode, "first");
  assert.equal(snapshot.archivedTodayPlanQueueCount, 2);
  assert.equal(snapshot.preservedHistory.firstOxAttempts, "preserved_in_first_mode");
  assert.equal(snapshot.preservedHistory.conceptCards, "preserved_in_first_mode");
  assert.equal(snapshot.preservedHistory.clozeReviewHistory, "preserved_in_first_mode");
  assert.equal(snapshot.preservedHistory.accountingEconomicsTemplateRetryHistory, "preserved_in_first_mode");
  assert.ok(snapshot.preservedHistory.weakSubjects.includes("민법"));
  assert.ok(snapshot.preservedHistory.legalCivilConceptCards >= 2);
  assert.ok(snapshot.carriedForward.lawRelatedConceptCandidates.includes("대리권 요건"));
  assert.ok(snapshot.carriedForward.repeatedWeakTopics.some((topic) => topic.label.includes("민법")));
  assert.ok(snapshot.carriedForward.confidencePatterns.some((pattern) => pattern.label === "낮음"));
  assert.ok(snapshot.carriedForward.reviewStageSummaries.some((stage) => stage.label === "빈칸"));

  const serialized = JSON.stringify(snapshot);
  ["rawQuestionText", "rawAnswerText", "raw_ocr_text", "사용자 답안 원문", "OCR 원문", "원문 문제 텍스트", "누출 금지"].forEach((token) => {
    assert.equal(serialized.includes(token), false, `raw migration metadata leak: ${token}`);
  });
});

test("migration learning signal changes Today Plan emphasis to second_answer_rewrite", () => {
  const snapshot = buildFirstToSecondMigrationSnapshot({
    firstItems: [firstItem(), firstItem({ id: "i2", conceptCandidate: "대리권 요건" })],
    firstQueue: [firstQueue()],
    firstLearningSignals: [],
    migratedAt: "2026-05-31T00:00:00.000Z",
  });
  const signal = {
    ...buildSecondModeMigrationLearningSignal(snapshot),
    id: "migration-signal-1",
    userId: "u1",
    createdAt: "2026-05-31T00:00:00.000Z",
  };

  assert.equal(signal.examMode, "감정평가사 2차");
  assert.equal(signal.nextTaskType, "second_answer_rewrite");

  const tasks = buildTodayPlanTasks({ mode: "second", queue: [], items: [], learningSignals: [signal], now: new Date("2026-05-31T01:00:00.000Z") });
  assert.equal(tasks[0].task_type, "second_answer_rewrite");
  assert.equal(tasks[0].source_label, "2차 전환 기반");
  assert.match(tasks[0].one_next_action, /문단 1개/);
});

test("learner migration UI is manual, collapsed, and contains no official pass/fail or instructor copy", async () => {
  const [ui, page, api, service] = await Promise.all([
    readFile(new URL("../components/review-os/mode-migration-confirmation.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/os/mode-migration/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/review-os/service.ts", import.meta.url), "utf8"),
  ]);
  assert.ok(ui.includes("MODE_MIGRATION_CONFIRMATION_COPY"));
  assert.equal(MODE_MIGRATION_CONFIRMATION_COPY, "1차 학습 기록은 보관되고, 오늘 계획은 2차 중심으로 전환됩니다.");
  assert.ok(ui.includes("취소"));
  assert.ok(ui.includes("나중에 전환"));
  assert.ok(ui.includes("2차 준비로 전환"));
  assert.ok(ui.includes("보관되는 것"));
  assert.ok(ui.includes("2차에서 이어지는 것"));
  assert.ok(ui.includes("<details"));
  assert.ok(page.includes("/app/mode-migration?mode=first"));
  assert.ok(api.includes("migrateFirstToSecondMode"));
  assert.ok(service.includes("archiveReviewQueueItemsForMode"));
  assert.ok(service.includes("getModeLabel(\"second\")"));

  const merged = `${ui}\n${page}\n${api}\n${service}`;
  ["/instructor", "학원용", "강사", "공식 합격", "공식 불합격", "pass/fail", "합격 예측", "불합격 예측", "결제", "paywall"].forEach((forbidden) => {
    assert.equal(merged.includes(forbidden), false, `forbidden learner migration copy: ${forbidden}`);
  });
});

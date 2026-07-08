import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildCognitiveLearningActionUnit } from "../lib/review-os/cognitive-learning-actions.ts";

const read = (path) => readFileSync(path, "utf8");

const forbiddenActionCopy = [
  /공식\s*채점/,
  /공식\s*모범\s*답안/,
  /확정\s*점수/,
  /합격\s*가능성/,
  /합격\s*확률/,
  /pass probability/i,
  /guarantee/i,
  /score prediction/i,
];

const runtimeExpansionPatterns = [
  /checkout/i,
  /payment webhook/i,
  /billing provider/i,
  /entitlement enforcement/i,
  /production pricing/i,
  /supabase\s+migration/i,
  /createSupabase(Admin|Persistence)Client/i,
  /openai|gemini/i,
  /\/api\/instructor|\/instructor|academy route|instructor route/i,
];

function assertNoForbiddenActionCopy(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  for (const pattern of forbiddenActionCopy) {
    assert.doesNotMatch(text, pattern);
  }
}

test("S220E builds gap to rewrite to retrieval to continuation action unit", () => {
  const unit = buildCognitiveLearningActionUnit({
    mode: "second",
    subjectLabel: "감정평가 및 보상법규",
    biggestGap: "처분성 판단 누락",
    nextAction: "처분성 판단 문단 1개 다시쓰기",
    nextTaskType: "issue_recall",
  });

  assert.equal(unit.unitLabel, "s220e_cognitive_learning_action");
  assert.equal(unit.oneBiggestGap, "처분성 판단 누락");
  assert.match(unit.nextRewriteAction, /문단|다시쓰기|다시 쓰/);
  assert.equal(unit.retrievalCheck.label, "10초 확인");
  assert.equal(unit.retrievalCheck.pattern, "issue_recall");
  assert.match(unit.retrievalCheck.prompt, /쟁점|조문|요건|사안 포섭/);
  assert.equal(unit.continuation.label, "내일 복습에 남길 내용");
  assert.match(unit.continuation.reviewQueueCandidate, /복습/);
  assert.match(unit.continuation.todayPlanCandidate, /오늘 할 일/);
  assert.match(unit.continuation.notesCandidate, /학습 노트/);
  assert.equal(unit.continuation.todayPlanMaxPrimaryTasks, 3);
  assert.equal(unit.dataBoundary.metadataOnly, true);
  assert.equal(unit.dataBoundary.globalReferenceWrite, false);
  assertNoForbiddenActionCopy(unit);
});

test("S220E second-round answer mode prioritizes rewrite, issue recall, outline recall, and calculation process checks", () => {
  const theory = buildCognitiveLearningActionUnit({
    mode: "second",
    subjectLabel: "감정평가이론",
    biggestGap: "목차와 문단 연결 부족",
    nextAction: "목차 3줄을 문단 1개로 다시 쓰기",
    nextTaskType: "outline_review",
  });
  const practice = buildCognitiveLearningActionUnit({
    mode: "second",
    subjectLabel: "감정평가실무",
    biggestGap: "단위 확인 누락",
    nextAction: "산식과 단위를 분리해 문단 1개 다시쓰기",
    nextTaskType: "calculation_process_check",
  });

  assert.deepEqual(theory.secondRoundPriorityOrder, [
    "paragraph_rewrite",
    "issue_recall",
    "outline_recall",
    "calculation_process_check",
  ]);
  assert.equal(theory.retrievalCheck.pattern, "outline_recall");
  assert.equal(practice.retrievalCheck.pattern, "calculation_process_check");
  assert.match(theory.nextRewriteAction, /문단|다시/);
  assert.match(practice.retrievalCheck.prompt, /산식|단위|반올림/);
});

test("S220E learner surfaces show the cognitive action card without adding persistence", () => {
  const firstSession = read("components/review-os/s220c-first-five-minute-magic.tsx");
  const answerReview = read("app/answer-review/answer-review-client.tsx");
  const captureForm = read("components/review-os/capture-form.tsx");
  const captureBuilder = read("lib/capture/capture-to-note.ts");
  const card = read("components/review-os/cognitive-learning-action-card.tsx");
  const combined = [firstSession, answerReview, captureForm, captureBuilder, card].join("\n");

  for (const phrase of [
    "CognitiveLearningActionCard",
    "buildCognitiveLearningActionUnit",
    "가장 큰 간극 1개",
    "오늘 다시 쓸 문단 1개",
    "10초 확인",
    "내일 복습에 남길 내용",
    "복습",
    "오늘 할 일",
    "학습 노트",
  ]) {
    assert.ok(combined.includes(phrase), `missing S220E surface phrase: ${phrase}`);
  }

  assert.match(captureBuilder, /cognitiveLearningAction/);
  assert.doesNotMatch(combined, /\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/);
  assertNoForbiddenActionCopy(card);
});

test("S220E helper rejects raw learner/OCR/provider/payment fields", () => {
  for (const key of [
    "rawOcrText",
    "rawAnswerText",
    "answerText",
    "problemText",
    "questionText",
    "sourceText",
    "officialAnswer",
    "modelAnswer",
    "providerPayload",
    "paymentData",
    "billingData",
  ]) {
    assert.throws(
      () =>
        buildCognitiveLearningActionUnit({
          mode: "second",
          subjectLabel: "감정평가이론",
          biggestGap: "정의와 적용 연결 부족",
          nextAction: "적용 문단 다시쓰기",
          [key]: "private text",
        }),
      /metadata only/,
      `${key} should be rejected`,
    );
  }
});

test("S220E source boundaries do not add billing, provider, auth, migration, or instructor routes", () => {
  const pureActionSources = [
    "lib/review-os/cognitive-learning-actions.ts",
    "components/review-os/cognitive-learning-action-card.tsx",
    "lib/capture/capture-to-note.ts",
    "lib/capture/capture-to-note-types.ts",
  ].map(read).join("\n");
  const learnerSurfaces = [
    "components/review-os/s220c-first-five-minute-magic.tsx",
    "app/answer-review/answer-review-client.tsx",
    "components/review-os/capture-form.tsx",
  ].map(read).join("\n");

  for (const pattern of runtimeExpansionPatterns) {
    assert.doesNotMatch(pureActionSources, pattern);
  }
  assert.doesNotMatch(pureActionSources, /fetch\s*\(/);
  assert.doesNotMatch(learnerSurfaces, /checkout|payment webhook|billing provider|entitlement enforcement|production pricing|\/api\/instructor|\/instructor|academy route|instructor route/i);
});

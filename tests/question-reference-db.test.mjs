import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildWeakUnitMappingFromReferences,
  findQuestionReferencesForLearningItem,
  getSimilarQuestionReferenceCandidates,
  loadQuestionReferenceIndex,
  mapLearningItemToQuestionReferenceHints,
  sanitizeQuestionReferenceInput,
} from "../lib/review-os/question-reference.ts";
import { buildTodayPlanTasks } from "../lib/review-os/today-plan-engine.ts";

test("sample question reference entries load as metadata-only records", async () => {
  const index = await loadQuestionReferenceIndex();
  assert.ok(index.length >= 4);
  assert.ok(index.some((entry) => entry.id === "qr-first-2024-civil-law-juristic-act-001"));
  assert.ok(index.some((entry) => entry.id === "qr-second-2024-practice-income-001"));
  assert.ok(index.every((entry) => entry.sourceRightsStatus));
  assert.ok(index.every((entry) => entry.rawTextStoragePolicy));
  assert.ok(index.every((entry) => entry.rawTextAvailable === false));
});

test("safe derived input maps to small reference hints", async () => {
  const hints = await findQuestionReferencesForLearningItem({
    examMode: "first",
    subject: "민법",
    topicCandidate: "법률행위",
    conceptCandidate: "무효와 취소",
    mistakeType: "요건 누락",
    issueTags: ["표현 함정"],
    derivedTags: ["first_ox_retry"],
    safeSkeletonIds: ["first_civil_law_juristic_act_effect"],
  });
  assert.ok(hints.length > 0);
  assert.ok(hints.length <= 2);
  assert.equal(hints[0].referenceId, "qr-first-2024-civil-law-juristic-act-001");
  assert.equal("snippet" in hints[0], false);
  assert.equal("rawText" in hints[0], false);
});

test("raw user fields are stripped before question reference matching", async () => {
  const input = sanitizeQuestionReferenceInput({
    examMode: "second",
    subject: "감정평가실무",
    topicCandidate: "수익환원법",
    conceptCandidate: "환원이율 근거",
    mistakeType: "단위 결론",
    issueTags: ["환원이율 근거"],
    skeletonId: "appraisal_income_capitalization",
    rawOcrText: "학습자 OCR 원문",
    userAnswerText: "학습자 답안 전문",
    uploadedProblemText: "업로드 문제 전문",
    rawProblemText: "기출 원문 전문",
    rewriteParagraph: "다시쓴 문단 전문",
    handwrittenContent: "손글씨 원문",
  });
  const serialized = JSON.stringify(input);
  assert.equal(/학습자|업로드|기출 원문|다시쓴|손글씨/.test(serialized), false);
  assert.equal(input.skeletonId, "appraisal_income_capitalization");

  const hints = await mapLearningItemToQuestionReferenceHints(input);
  assert.equal(hints[0]?.referenceId, "qr-second-2024-practice-income-001");
});

test("source rights status is required when loading custom reference files", async () => {
  const valid = await loadQuestionReferenceIndex({ sourcePath: "reference_corpus/question_archive" });
  assert.ok(valid.every((entry) => ["public_domain", "licensed", "internal_curated", "needs_review"].includes(entry.sourceRightsStatus)));

  const missingRights = await loadQuestionReferenceIndex({ sourcePath: "tests/fixtures/question-reference-invalid" });
  assert.deepEqual(missingRights, []);
});

test("raw text storage policy is represented on every hint source", async () => {
  const index = await loadQuestionReferenceIndex();
  const policies = new Set(index.map((entry) => entry.rawTextStoragePolicy));
  assert.ok(policies.has("metadata_only"));
  assert.ok(index.every((entry) => entry.rawTextAvailable === false || entry.rawTextStoragePolicy !== "metadata_only"));
});

test("weak-unit and similar-candidate helpers use reference metadata only", async () => {
  const input = {
    examMode: "second",
    subject: "감정평가실무",
    topicCandidate: "수익환원법",
    issueTags: ["환원이율 근거"],
    safeSkeletonIds: ["appraisal_income_capitalization"],
  };
  const similar = await getSimilarQuestionReferenceCandidates(input);
  const weakUnits = await buildWeakUnitMappingFromReferences(input);
  assert.ok(similar[0]?.reason.includes("비슷한 기출 기준"));
  assert.ok(weakUnits[0]?.referenceIds.includes("qr-second-2024-practice-income-001"));
  assert.ok(weakUnits[0]?.skeletonIds.includes("appraisal_income_capitalization"));
});

test("no dense learner archive UI is created by question reference DB", async () => {
  const sources = await Promise.all([
    readFile("app/app/page.tsx", "utf8"),
    readFile("app/app/items/[itemId]/page.tsx", "utf8"),
    readFile("components/review-os/today-session-runner.tsx", "utf8"),
    readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8"),
  ]);
  for (const source of sources) {
    assert.equal(source.includes("20년치 기출 탐색"), false);
    assert.equal(/href=\{?['\"]\/app\/archive/.test(source), false);
  }
  const archivePage = await readFile("app/exams/archive/page.tsx", "utf8");
  assert.equal(archivePage.includes("question-reference"), false);
  assert.equal(archivePage.includes("question_archive"), false);
});

test("Today Plan/detail integration is collapsed and optional", async () => {
  const home = await readFile("app/app/page.tsx", "utf8");
  const detail = await readFile("app/app/items/[itemId]/page.tsx", "utf8");
  const secondRewrite = await readFile("components/review-os/today-session-runner.tsx", "utf8");
  const firstOx = await readFile("components/review-os/first-ox/first-ox-practice-client.tsx", "utf8");

  assert.ok(home.includes("관련 기출 기준 힌트"));
  assert.ok(home.includes("<details"));
  assert.ok(home.includes("slice(0, 2)"));
  assert.equal(/관련 기출 기준 힌트[\s\S]{0,400}<details open/.test(home), false);

  assert.ok(detail.includes("비슷한 기출 기준"));
  assert.ok(detail.includes("<details"));
  assert.ok(detail.includes("questionReferenceHints.slice(0, 2)"));

  assert.match(secondRewrite, /<V3QuietDisclosure summary="관련 학습 구조 \/ 참고 근거 보기"[\s\S]*?note\?\.referenceSnippets\?\.length/);
  assert.ok(firstOx.includes("빈출 표현 기준 보기 (선택)"));
});

test("existing learner loop passes with optional question reference hints", async () => {
  const tasks = buildTodayPlanTasks({
    mode: "second",
    queue: [{
      queueId: "q1",
      itemId: "item1",
      examName: "감정평가사 2차",
      subjectLabel: "감정평가실무",
      problemTitle: "수익환원법 문단",
      topicTag: "수익환원법",
      mistakeType: "환원이율 근거",
      reviewReason: "누락 논점",
      priorityScore: 80,
      dueAt: "2026-05-30T00:00:00.000Z",
      recurrenceCount: 1,
      confidence: "중간",
      timeSpentSeconds: 600,
      createdFromCapture: false,
      itemCreatedAt: "2026-05-29T00:00:00.000Z",
    }],
    items: [],
    learningSignals: [],
    now: new Date("2026-05-31T00:00:00.000Z"),
  });
  assert.equal(tasks[0]?.task_type, "second_answer_rewrite");
  const hints = await getSimilarQuestionReferenceCandidates({
    examMode: tasks[0].exam_mode,
    subject: tasks[0].subject,
    topicCandidate: tasks[0].title,
    conceptCandidate: tasks[0].one_biggest_gap,
    issueTags: [tasks[0].one_biggest_gap],
    safeSkeletonIds: ["appraisal_income_capitalization"],
  });
  assert.ok(hints.length <= 2);
  assert.equal(hints[0]?.rawTextAvailable, false);
});

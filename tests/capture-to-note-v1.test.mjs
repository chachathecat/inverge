import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { buildCaptureToNoteDraft } from "../lib/capture/capture-to-note.ts";

const builderPath = "lib/capture/capture-to-note.ts";
const typesPath = "lib/capture/capture-to-note-types.ts";
const docsPath = "docs/inverge-capture-to-note-v1.md";
const captureRoutePath = "app/app/capture/page.tsx";
const captureFormPath = "components/review-os/capture-form.tsx";

function read(path) {
  return readFileSync(path, "utf8");
}

function draftLegalHint(overrides = {}) {
  return {
    status: "grounded_draft",
    canDraftLegalExplanation: false,
    needsReview: true,
    unsupported: false,
    learnerSafeMessage: "법령 근거 후보가 있지만 아직 검수 전입니다.",
    sourceAnchors: {
      conceptCandidateCount: 1,
      sourceAnchorCount: 1,
      verifiedAnchorCount: 0,
      draftOrReviewRequiredAnchorCount: 1,
      summary: [],
    },
    ...overrides,
  };
}

test("capture-to-note builder and types exist", () => {
  assert.equal(existsSync(builderPath), true);
  assert.equal(existsSync(typesPath), true);
  const source = read(builderPath);
  assert.match(source, /buildCaptureToNoteDraft/);
});

test("capture-to-note output requires one biggest gap, one next action, and derived signals", async () => {
  const result = await buildCaptureToNoteDraft({
    examMode: "first",
    subject: "민법",
    sourceType: "text",
    editableText: "무효와 취소 효과를 헷갈려서 선택 근거를 다시 확인했다.",
    confidence: "medium",
    timeSpentMin: 20,
  });

  assert.equal(result.examMode, "first");
  assert.equal(result.subject, "민법");
  assert.equal(result.sourceType, "text");
  assert.equal(result.userEditableText.includes("무효와 취소"), true);
  assert.equal(typeof result.biggestGap, "string");
  assert.equal(result.biggestGap.length > 0, true);
  assert.equal(typeof result.nextAction, "string");
  assert.equal(result.nextAction.length > 0, true);
  assert.equal(result.derivedSignals.subject, "민법");
  assert.equal(Array.isArray(result.derivedSignals.topicCandidates), true);
  assert.equal(result.dataBoundary.learnerOwnedRawText, true);
  assert.equal(result.dataBoundary.globalReferenceWrite, false);
});

test("first mode produces OX, cloze, or concept-review next task", async () => {
  const result = await buildCaptureToNoteDraft({
    examMode: "first",
    subject: "민법",
    sourceType: "photo",
    editableText: "선지 O/X에서 요건과 효과를 헷갈렸다.",
    confidence: "low",
  });

  assert.match(result.derivedSignals.nextTaskType, /^(ox|cloze|concept_review)$/);
  assert.match(result.nextAction, /O\/X|정리|떠올/);
  assert.equal(result.todayPlanCandidate.metadataOnly, true);
  assert.equal(result.reviewQueueCandidate.metadataOnly, true);
});

test("second mode produces rewrite, issue, or outline next task", async () => {
  const result = await buildCaptureToNoteDraft({
    examMode: "second",
    subject: "감정평가 및 보상법규",
    sourceType: "pdf",
    editableText: "사업인정 처분성 쟁점은 적었지만 문단에서 요건과 사안 포섭이 분리됐다.",
    confidence: "unknown",
    problemSummary: "보상법규 사례 답안 초안",
  });

  assert.match(result.derivedSignals.nextTaskType, /^(paragraph_rewrite|issue_recall|outline_review)$/);
  assert.match(result.nextAction, /쟁점|목차|문단/);
  assert.equal(result.reviewQueueCandidate.source, "capture_to_note");
});

test("Today Plan candidates are capped at max 3", async () => {
  const result = await buildCaptureToNoteDraft({
    examMode: "second",
    subject: "감정평가이론",
    sourceType: "text",
    editableText: "정의 다음에 논거와 사례 적용을 연결하지 못했다.",
  });

  assert.equal(result.todayPlanCandidates.length <= 3, true);
  assert.equal(result.todayPlanCandidates.every((candidate) => candidate.metadataOnly), true);
});

test("draft legal grounding does not allow legal explanation claim", async () => {
  const result = await buildCaptureToNoteDraft({
    examMode: "second",
    subject: "감정평가 및 보상법규",
    sourceType: "text",
    editableText: "사업인정과 처분성 관계를 답안에 쓰려다 멈췄다.",
    legalGroundingHint: draftLegalHint(),
  });

  assert.equal(result.legalGroundingHint?.status, "grounded_draft");
  assert.equal(result.legalGroundingHint?.canDraftLegalExplanation, false);
  assert.doesNotMatch(JSON.stringify(result), /official grading|model answer|pass-fail|score prediction/i);
});

test("capture builder does not use service role keys, mutations, OpenAI, external APIs, or embeddings", () => {
  const combined = `${read(builderPath)}\n${read(typesPath)}`;

  assert.doesNotMatch(combined, /SUPABASE_SERVICE_ROLE_KEY|service_role|createSupabaseAdminClient|createSupabasePersistenceClient/i);
  assert.doesNotMatch(combined, /\.\s*(insert|update|upsert|delete)\s*\(/i);
  assert.doesNotMatch(combined, /openai|embedding|embeddings|fetch\s*\(|axios|https?:\/\//i);
});

test("learner capture route stays separated from instructor second grading", () => {
  const combined = `${read(captureRoutePath)}\n${read(captureFormPath)}`;

  assert.doesNotMatch(combined, /\/instructor\/second-grading|second-grading|grade-second/);
  assert.match(combined, /오늘 한 것 정리하기/);
  assert.match(combined, /학습 노트 만들기/);
  assert.match(combined, /OCR 결과는 초안입니다\. 저장 전 직접 확인해 주세요\./);
});

test("docs cover claims, raw text boundary, OCR editability, legal grounding, Today max 3, and Review Queue", () => {
  assert.equal(existsSync(docsPath), true);
  const docs = read(docsPath).toLowerCase();

  assert.match(docs, /no official grading|official grading/);
  assert.match(docs, /official model answers|model answers/);
  assert.match(docs, /pass-fail|pass-fail judgment/);
  assert.match(docs, /raw user text must not be stored in global reference data/);
  assert.match(docs, /ocr result text is editable before save/);
  assert.match(docs, /no source, no legal claim/);
  assert.match(docs, /today plan.*max 3/s);
  assert.match(docs, /review queue/);
});

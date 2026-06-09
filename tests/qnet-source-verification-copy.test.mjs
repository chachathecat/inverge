import test from "node:test";
import assert from "node:assert/strict";

import {
  assertSafeQnetSourceVerificationCopy,
  buildQnetSourceVerificationBadge,
  buildQnetSourceVerificationCopy,
  shouldShowQnetSourceVerificationCopy,
} from "../lib/review-os/qnet-source-verification-copy.ts";
import { buildQnetReferenceCoverageReport } from "../lib/review-os/qnet-reference-metrics.ts";
import { buildTodayPlanSourceUnion } from "../lib/review-os/today-plan-source-union.ts";

function qnetReference(overrides = {}) {
  return {
    matchedSourceIds: ["qnet-safe-source-1"],
    matchedTopics: ["source verified topic"],
    matchedCurriculumNodeCandidates: ["second_practice"],
    trapPatternCandidates: ["condition check"],
    answerSkeletonTags: ["outline"],
    calculationTemplateCandidates: ["calculation template"],
    casioRelevant: true,
    metadataOnly: true,
    safeUse: "metadata_reference_only",
    ...overrides,
  };
}

const forbiddenOfficialClaimPatterns = [
  /official\s+grading/i,
  /official\s+score/i,
  /score\s*prediction/i,
  /pass\s*\/\s*fail/i,
  /model\s+answer/i,
  /pass\s*guarantee/i,
  /공식\s*채점/,
  /공식\s*점수/,
  /점수\s*예측/,
  /합불/,
  /모범\s*답안/,
  /모범답안/,
  /기준\s*정답/,
  /공식\s*정답/,
  /공식\s*해설/,
  /합격\s*보장/,
];

const forbiddenRawPatterns = [
  /https?:\/\//i,
  /source\s+excerpt/i,
  /qnet-safe-source-1/i,
  /raw question/i,
  /raw answer/i,
  /ocr full text/i,
  /local_official_materials/i,
  /qnet_manifest\.json/i,
  /\.(pdf|hwp|hwpx|docx|zip|png|jpe?g)\b/i,
  /"sourceUrl"/,
  /"sourceExcerpt"/,
  /"officialAnswerBody"/,
  /"answerText"/,
  /"score"/,
];

const forbiddenTonePatterns = [
  /게으름/,
  /망했/,
  /불합격/,
  /공포/,
  /부끄/,
  /순위\s*하락/,
  /streak/i,
  /casino/i,
  /gacha/i,
  /random\s*reward/i,
];

function serialized(value) {
  return JSON.stringify(value);
}

function assertSafeCopy(value) {
  const text = serialized(value);
  assertSafeQnetSourceVerificationCopy(value);
  for (const pattern of [...forbiddenOfficialClaimPatterns, ...forbiddenRawPatterns, ...forbiddenTonePatterns]) {
    assert.doesNotMatch(text, pattern);
  }
}

test("Q-Net source verification copy appears only for metadata-only qnetReference", () => {
  const reference = qnetReference();

  assert.equal(shouldShowQnetSourceVerificationCopy(reference), true);
  assert.equal(buildQnetSourceVerificationBadge(reference), "공식자료 metadata 참고");

  const copy = buildQnetSourceVerificationCopy(reference);
  assert.ok(copy);
  assert.equal(copy.metadataOnly, true);
  assert.equal(copy.safeUse, "qnet_source_verification_copy_only");
  assert.equal(copy.badge, "공식자료 metadata 참고");
  assert.equal(copy.title, "공식자료 기반 출제영역 후보");
  assertSafeCopy(copy);
});

test("missing or unsafe qnetReference hides source verification copy", () => {
  assert.equal(shouldShowQnetSourceVerificationCopy(undefined), false);
  assert.equal(shouldShowQnetSourceVerificationCopy(null), false);
  assert.equal(shouldShowQnetSourceVerificationCopy({}), false);
  assert.equal(shouldShowQnetSourceVerificationCopy(qnetReference({ metadataOnly: false })), false);
  assert.equal(shouldShowQnetSourceVerificationCopy(qnetReference({ safeUse: "wrong_use" })), false);
  assert.equal(buildQnetSourceVerificationCopy(), null);
  assert.equal(buildQnetSourceVerificationBadge(), null);
});

test("Q-Net source verification copy explains metadata reference and learner confirmation", () => {
  const copy = buildQnetSourceVerificationCopy(qnetReference());
  assert.ok(copy);
  const text = serialized(copy);

  assert.match(text, /metadata/);
  assert.match(text, /참고/);
  assert.match(text, /분류 보조 신호/);
  assert.match(text, /직접 확인/);
  assert.match(text, /Q-Net 공식자료/);
  assertSafeCopy(copy);
});

test("Q-Net source verification copy does not expose source URLs, source excerpts, or matched source IDs", () => {
  const copy = buildQnetSourceVerificationCopy(qnetReference({
    sourceUrl: "https://qnet.example.invalid/source",
    sourceExcerpt: "DO_NOT_EMIT_SOURCE_EXCERPT",
    officialAnswerBody: "DO_NOT_EMIT_OFFICIAL_BODY",
    answerText: "DO_NOT_EMIT_ANSWER",
    score: 100,
  }));
  const text = serialized(copy);

  assert.ok(copy);
  assert.equal(text.includes("https://qnet.example.invalid/source"), false);
  assert.equal(text.includes("DO_NOT_EMIT_SOURCE_EXCERPT"), false);
  assert.equal(text.includes("DO_NOT_EMIT_OFFICIAL_BODY"), false);
  assert.equal(text.includes("DO_NOT_EMIT_ANSWER"), false);
  assert.equal(text.includes("qnet-safe-source-1"), false);
  assertSafeCopy(copy);
});

test("Q-Net source verification copy avoids official-answer, grading, model-answer, pass-fail, prediction, and guarantee claims", () => {
  const copy = buildQnetSourceVerificationCopy(qnetReference());
  const text = serialized(copy);

  assert.ok(copy);
  for (const pattern of forbiddenOfficialClaimPatterns) assert.doesNotMatch(text, pattern);
  assertSafeCopy(copy);
});

test("Q-Net source verification safety assertion rejects raw fields and prohibited claim copy", () => {
  assert.throws(
    () => assertSafeQnetSourceVerificationCopy({ ...buildQnetSourceVerificationCopy(qnetReference()), sourceUrl: "https://example.invalid" }),
    /unsafe-qnet-source-verification-copy/,
  );
  assert.throws(
    () => assertSafeQnetSourceVerificationCopy({ ...buildQnetSourceVerificationCopy(qnetReference()), sourceExcerpt: "raw source excerpt" }),
    /unsafe-qnet-source-verification-copy/,
  );
  assert.throws(
    () => assertSafeQnetSourceVerificationCopy({ ...buildQnetSourceVerificationCopy(qnetReference()), body: "official grading claim" }),
    /unsafe-qnet-source-verification-copy/,
  );
  assert.throws(
    () => assertSafeQnetSourceVerificationCopy({ ...buildQnetSourceVerificationCopy(qnetReference()), body: "공식 채점 claim" }),
    /unsafe-qnet-source-verification-copy/,
  );
});

test("Q-Net source verification copy does not alter metrics safety or Today Plan max 3 invariants", () => {
  const report = buildQnetReferenceCoverageReport([
    {
      id: "qnet-copy-action",
      prioritySignals: ["schedule_track_focus", "official_reference_source_verified", "official_reference_topic_match"],
      qnetReference: qnetReference(),
    },
    { id: "learner-due", prioritySignals: ["due_review"] },
  ]);
  assert.equal(report.metadataOnly, true);
  assert.equal(report.rawLeakCount, 0);
  assert.equal(report.officialClaimLeakCount, 0);

  const conceptGraphActions = Array.from({ length: 5 }, (_, index) => ({
    id: `copy-concept-${index}`,
    nodeId: `copy-node-${index}`,
    userId: "u-qnet-copy",
    source: "personal_concept_graph",
    examMode: "second",
    subjectId: index % 2 === 0 ? "second_law" : "second_theory",
    unitId: index % 2 === 0 ? `second_law_project_approval_${index}` : `second_theory_value_theory_${index}`,
    state: index === 0 ? "wrong" : "confused",
    taskType: "rewrite",
    title: "metadata-only retry",
    rationale: "existing learner-derived concept graph weakness",
    primaryAction: "rewrite one issue",
    prioritySignals: [index === 0 ? "wrong_concept" : "confused_concept"],
    isPrimaryTask: true,
    estimatedMinutes: 15,
    metadataOnly: true,
  }));

  const plan = buildTodayPlanSourceUnion({
    conceptGraphActions,
    context: { examMode: "second" },
  });

  assert.equal(plan.length, 3);
  assert.ok(plan.every((item) => item.metadataOnly === true));
});

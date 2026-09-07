import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { loadEconomicsContent, ECONOMICS_REVIEW_CHECKS } from "../../lib/review-os/first-stage/runtime/economics-content.ts";
import { privateSessionDigest as digest } from "../../lib/review-os/first-stage/runtime/session-service.ts";

// Entirely synthetic. These receipts describe test inputs, NOT a performed human
// review, Q-Net evidence, production stock or a person who approved any content.
const evidence = id => ({ schemaVersion: "first_stage.immutable_evidence_reference.v1",
  evidenceId: `synthetic-${id}`, evidenceVersion: "fixture-v1", evidenceSha256: digest(id) });
export function economicsPacket() {
  const questions = ["q1", "retry-1", "retry-2"].map((suffix, index) => ({
    reference: { schemaVersion: "first_stage.question_reference.v1", questionId: `synthetic-economics-${suffix}`,
      questionVersion: "fixture-v1", subjectId: "economics_principles", examYear: 2026, examRound: 37,
      sessionId: "synthetic-only-session", questionNumber: 1, choiceCount: 5,
      sourceVersionManifestIds: ["synthetic-source-only"], rightsState: "verified_owner_private", currentnessState: "verified_exam_date" },
    kind: index ? "practice_retry" : "original", sourceQuestionId: index ? "synthetic-economics-q1" : null,
    stem: index ? `SYNTHETIC_RETRY_BODY_${index}` : "SYNTHETIC_PRIVATE_ECONOMICS_BODY",
    choices: [1, 2, 3, 4, 5].map(id => `Synthetic choice ${id}`), correctChoice: 2,
    choiceExplanations: [1, 2, 3, 4, 5].map(id => `SYNTHETIC_CHOICE_EXPLANATION_${id}`),
    easyExplanation: "SYNTHETIC_PRIVATE_EXPLANATION",
    concept: { id: "synthetic-economics-concept", version: "fixture-v1" },
    feedback: { incorrectCauseByChoice: ["C", null, "C", "C", "C"], biggestGapCode: "synthetic-gap", nextActionCode: "synthetic-review" },
    sourceEvidence: evidence(`${suffix}-source`), rightsEvidence: evidence(`${suffix}-rights`), versionEvidence: evidence(`${suffix}-version`),
  }));
  return { schemaVersion: "first_stage.economics_private_content.v1", version: "synthetic-packet-v1",
    dataClass: "synthetic_test_only", authority: "LEARNING_ONLY", questions,
    keys: questions.map((row, index) => ({ questionReferenceSha256: digest(row.reference),
      choiceSetSha256: digest(row.choices.map((body, i) => ({ choiceId: i + 1, body }))), correctChoice: 2,
      authority: index ? "independently_reviewed_retry_key" : "original_final_key", evidence: evidence(`key-${index}`) })) };
}
export function syntheticContentInput(packet = economicsPacket()) {
  const bytes = Buffer.from(JSON.stringify(packet));
  const approval = { packetSha256: createHash("sha256").update(bytes).digest("hex"), packetVersion: packet.version,
    dataClass: "synthetic_test_only", reviewId: "synthetic-test-receipt", reviewerIdentity: "synthetic-not-a-human-review",
    reviewerClass: "owner_approved_personal_feedback_reviewer", reviewedAt: "2026-09-06T10:00:00.000Z",
    decision: "approved_owner_private_learning", checks: [...ECONOMICS_REVIEW_CHECKS] };
  return { approvals: [approval], readBytes: async () => bytes, expectedDataClass: "synthetic_test_only" };
}
export const economicsCatalog = await loadEconomicsContent(syntheticContentInput());
assert.ok(economicsCatalog, "synthetic content must pass the real loader and economics adapter");
export const CONTENT_EXPLANATION = economicsCatalog.explanation(economicsCatalog.initialReferences[0]).text;

import crypto from "node:crypto";

import {
  S233_AI_CASCADE_VERSION,
  S233_ANSWER_PACK_SCHEMA_VERSION,
  S233_CONTROLLER_EVENT_VERSION,
  S233_INPUT_FINGERPRINT_SCOPE,
  S233_REUSED_CONTRACT_VERSIONS,
  S233_SCORING_FINDING_SCHEMA_VERSION,
  S233_SCORING_ONTOLOGY_VERSION,
  type S233LearnerAnswerReviewIdentity,
} from "./s233-parallel-execution-contract";
import type { RubricEvidenceSubject } from "./rubric-evidence-contract";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
}

export function sha256S233a(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function normalizeS233aLearnerInputText(value: string): string {
  return value.normalize("NFKC").replace(/\r\n?/g, "\n").trim();
}

export function deriveS233aLearnerOwnerRef(authenticatedUserId: string): string {
  return `learner-${sha256S233a(`s233a-owner-ref:${authenticatedUserId}`).slice(0, 32)}`;
}

export function deriveS233aReviewId(learnerOwnerRefId: string, clientRequestId: string): string {
  return `review-${sha256S233a(`${learnerOwnerRefId}:${clientRequestId}`).slice(0, 32)}`;
}

export function deriveS233aTraceId(reviewId: string): string {
  return `trace-${sha256S233a(`s233a-trace:${reviewId}`).slice(0, 32)}`;
}

export function deriveS233aIdempotencyKey(
  learnerOwnerRefId: string,
  clientRequestId: string,
): string {
  return `review:${learnerOwnerRefId}:${sha256S233a(clientRequestId).slice(0, 32)}`;
}

function subjectEngineVersion(subject: RubricEvidenceSubject) {
  if (subject === "law") return S233_REUSED_CONTRACT_VERSIONS.s211LawReview;
  if (subject === "theory") return S233_REUSED_CONTRACT_VERSIONS.s212TheoryReview;
  return S233_REUSED_CONTRACT_VERSIONS.s213PracticeReview;
}

export type S233aFingerprintInput = {
  learnerOwnerRefId: string;
  answerSubmissionId: string;
  inputVersionId: string;
  normalizedLearnerInput: string;
  answerPackId: string;
  answerPackVersion: string;
  sourceVersion: string;
  subject: RubricEvidenceSubject;
  primaryModelVersion: string;
  primaryPromptVersion: string;
  criticModelVersion: string;
  criticPromptVersion: string;
  fingerprintedRevealEvent: S233LearnerAnswerReviewIdentity["revealHistory"][number];
};

export function computeS233aInputFingerprint(input: S233aFingerprintInput): {
  fingerprint: string;
  normalizedLearnerInputSha256: string;
  fingerprintScope: typeof S233_INPUT_FINGERPRINT_SCOPE;
} {
  const normalizedLearnerInputSha256 = sha256S233a(
    normalizeS233aLearnerInputText(input.normalizedLearnerInput),
  );
  const preimage = canonicalize({
    learnerOwnerRefId: input.learnerOwnerRefId,
    rewriteRegradeLineage: {
      answerSubmissionId: input.answerSubmissionId,
    },
    inputVersionId: input.inputVersionId,
    normalizedLearnerInputSha256,
    versions: {
      answerPackId: input.answerPackId,
      answerPackVersion: input.answerPackVersion,
      answerPackSchemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
      ontologyVersion: S233_SCORING_ONTOLOGY_VERSION,
      rubricVersion: S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence,
      subjectEngineVersion: subjectEngineVersion(input.subject),
      sourceVersion: input.sourceVersion,
      primaryModelVersion: input.primaryModelVersion,
      primaryPromptVersion: input.primaryPromptVersion,
      criticModelVersion: input.criticModelVersion,
      criticPromptVersion: input.criticPromptVersion,
      cascadeVersion: S233_AI_CASCADE_VERSION,
      findingSchemaVersion: S233_SCORING_FINDING_SCHEMA_VERSION,
      controllerEventVersion: S233_CONTROLLER_EVENT_VERSION,
      rewriteRegradeVersion: S233_REUSED_CONTRACT_VERSIONS.s206RewriteRegrade,
    },
    fingerprintedRevealEvent: input.fingerprintedRevealEvent,
  });

  return {
    fingerprint: sha256S233a(JSON.stringify(preimage)),
    normalizedLearnerInputSha256,
    fingerprintScope: S233_INPUT_FINGERPRINT_SCOPE,
  };
}

export { subjectEngineVersion as getS233aSubjectEngineVersion };

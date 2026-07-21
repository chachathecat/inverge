import {
  S233_ANSWER_PACK_SCHEMA_VERSION,
  S233_AUTHORITY_GUARDRAILS,
  S233_REUSED_CONTRACT_VERSIONS,
} from "../lib/review-os/s233-parallel-execution-contract.ts";
import { buildS233aTrustedScoringContext } from "../lib/review-os/s233a-scoring-ontology.ts";

export function trustedLawMaterials() {
  const packId = "answer-pack-law-golden-1";
  const packVersion = "1.0.0";
  const contentHashSha256 = "a".repeat(64);
  const answerPack = {
    schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
    packId,
    packVersion,
    contentHashSha256,
    immutable: true,
    subject: "law",
    verificationStatus: "verified_learning_reference",
    answerLevels: ["L1_recall_outline", "L2_exam_length_answer", "L3_annotated_reasoning"],
    claimSourceGraph: {
      graphId: "claim-graph-law-1",
      claimIds: ["claim-law-1", "claim-law-2"],
      sourceAnchorIds: ["source-law-1"],
      edges: [
        { claimId: "claim-law-1", sourceAnchorId: "source-law-1", relation: "supports" },
        { claimId: "claim-law-2", sourceAnchorId: "source-law-1", relation: "supports" },
      ],
      claimProseStored: false,
      sourceExcerptStored: false,
    },
    snapshot: {
      snapshotId: "snapshot-law-1",
      sourceRegistryVersion: "second-round-source-registry.v1",
      sourceIds: ["source-law-1"],
      lawRegistryVersion: "law-source-registry.v1",
      lawVersionIds: ["law-version-exam-date-1"],
      lawVersionStatus: "verified",
      rightsRegistryVersion: "second-round-rights-registry.v1",
      rightsDecisionIds: ["rights-decision-1"],
      rightsStatuses: ["display_by_deep_link"],
      capturedAt: "2026-07-21T03:00:00.000Z",
    },
    transformationProvenance: [
      {
        provenanceId: "provenance-deterministic-1",
        kind: "deterministic_validation",
        inputRefIds: ["snapshot-law-1"],
        outputClaimIds: ["claim-law-1", "claim-law-2"],
        modelVersion: null,
        promptVersion: null,
        schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
        transformedAt: "2026-07-21T03:01:00.000Z",
        providerPayloadStored: false,
        learnerContentUsed: false,
      },
      {
        provenanceId: "provenance-critic-1",
        kind: "critic_consensus",
        inputRefIds: ["s214-pipeline-1", "provenance-deterministic-1"],
        outputClaimIds: ["claim-law-1", "claim-law-2"],
        modelVersion: "critic-law-model.v1",
        promptVersion: "critic-law-prompt.v1",
        schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
        transformedAt: "2026-07-21T03:02:00.000Z",
        providerPayloadStored: false,
        learnerContentUsed: false,
      },
      {
        provenanceId: "provenance-release-1",
        kind: "release_gate",
        inputRefIds: ["s214-pipeline-1", "s215-gate-1", "provenance-critic-1"],
        outputClaimIds: ["claim-law-1", "claim-law-2"],
        modelVersion: null,
        promptVersion: null,
        schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
        transformedAt: "2026-07-21T03:03:00.000Z",
        providerPayloadStored: false,
        learnerContentUsed: false,
      },
    ],
    releaseProof: {
      s214PipelineVersion: S233_REUSED_CONTRACT_VERSIONS.s214AnswerPipeline,
      s214PipelineId: "s214-pipeline-1",
      s214Status: "ready_for_s215_consensus",
      s215ReleaseGateVersion: S233_REUSED_CONTRACT_VERSIONS.s215ReleaseGate,
      s215GateId: "s215-gate-1",
      s215Status: "released",
      unresolvedBlockerCodes: [],
    },
    learnerContentPolicy: { allowed: false, included: false, sourceIds: [] },
    expertReview: { approved: false, approvalEvidenceId: null },
    authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
    containsRawContent: false,
  };
  const answerPackRegistryContext = {
    sourceRegistryVersion: "second-round-source-registry.v1",
    lawRegistryVersion: "law-source-registry.v1",
    rightsRegistryVersion: "second-round-rights-registry.v1",
    sourceRecords: [
      { sourceId: "source-law-1", subject: "law", sourceAnchorIds: ["source-law-1"], lawVersionIds: ["law-version-exam-date-1"], rightsDecisionIds: ["rights-decision-1"] },
    ],
    lawVersionRecords: [{ lawVersionId: "law-version-exam-date-1", status: "verified" }],
    rightsDecisionRecords: [{ rightsDecisionId: "rights-decision-1", sourceId: "source-law-1", status: "display_by_deep_link" }],
    s214PipelineRecords: [{ pipelineId: "s214-pipeline-1", packId, packVersion, contentHashSha256, subject: "law", status: "ready_for_s215_consensus" }],
    s215GateRecords: [{ gateId: "s215-gate-1", pipelineId: "s214-pipeline-1", packId, packVersion, contentHashSha256, subject: "law", status: "released", unresolvedBlockerCodes: [] }],
  };
  return {
    answerPack,
    answerPackRegistryContext,
    trustedScoringContext: buildS233aTrustedScoringContext("law"),
    evaluationReferenceText: "쟁점, 법리, 사안 적용 및 결론의 검증된 학습 기준",
    materialReceiptId: "material-receipt-law-1",
  };
}

export function request(overrides = {}) {
  return {
    authenticatedUserId: "11111111-1111-4111-8111-111111111111",
    clientRequestId: "client-request-1",
    subject: "law",
    questionText: "법적 쟁점을 검토하시오.",
    learnerInput: {
      normalizedText: "쟁점과 법리를 제시하고 사안에 적용한 뒤 결론을 내린다.",
      segments: [{ segmentId: "segment-1", text: "쟁점과 법리를 제시하고 사안에 적용한 뒤 결론을 내린다." }],
    },
    answerSubmissionId: "submission-root-1",
    inputVersionId: "input-version-1",
    historyId: "history-1",
    attemptId: "attempt-root-1",
    attemptVersion: 1,
    rootAttemptId: "attempt-root-1",
    parentAttemptId: null,
    predecessorReviewId: null,
    answerPackId: "answer-pack-law-golden-1",
    answerPackVersion: "1.0.0",
    revealHistory: [],
    elapsedTimeMs: 120000,
    confidence: "medium",
    assistanceLevel: "none",
    answerExposure: "none",
    inputModality: "typed",
    variantFamilyId: null,
    variantDistance: null,
    sessionPosition: 0,
    sourceUncertaintyCodes: [],
    predecessorControllerEventId: null,
    ...overrides,
  };
}

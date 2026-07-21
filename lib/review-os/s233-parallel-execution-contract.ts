import { assertNoRawUserDataInDerived } from "./data-boundary";
import type {
  OneNextActionContract,
  RubricEvidenceConfidenceLevel,
  RubricEvidenceSubject,
} from "./rubric-evidence-contract";

export const S233_PARALLEL_EXECUTION_CONTRACT_VERSION =
  "s233.parallel_execution_contract.v1" as const;
export const S233_SCORING_SKILL_SCHEMA_VERSION =
  "s233.scoring_skill_identity.v1" as const;
export const S233_SCORING_ONTOLOGY_VERSION =
  "s233.scoring_skill_ontology.v1" as const;
export const S233_SCORING_FINDING_SCHEMA_VERSION =
  "s233.scoring_finding.v1" as const;
export const S233_ANSWER_PACK_SCHEMA_VERSION = "answer_pack.2.0" as const;
export const S233_LEARNER_REVIEW_SCHEMA_VERSION =
  "s233.learner_answer_review_identity.v1" as const;
export const S233_EVIDENCE_STATE_SCHEMA_VERSION =
  "s233.evidence_state.v1" as const;
export const S233_CONTROLLER_EVENT_VERSION =
  "s233.future_controller_event.v1" as const;
export const S233_AI_CASCADE_VERSION =
  "s233.ai_only_evaluation_cascade.v1" as const;
export const S233_TRUSTED_SCORING_CONTEXT_VERSION =
  "s233.trusted_scoring_context.v1" as const;

export const S233_REUSED_CONTRACT_VERSIONS = {
  s205RubricEvidence: "s205.common_rubric_evidence.v1",
  s206RewriteRegrade: "s206.rewrite_regrade_history.v1",
  s211LawReview: "s211.law_answer_review_engine.v1",
  s212TheoryReview: "s212.theory_answer_review.v1",
  s213PracticeReview: "s213.practice_answer_review.v1",
  s214AnswerPipeline: "s214.reference_answer_candidate_pipeline.v1",
  s215ReleaseGate: "s215.reference_answer_critic_consensus_release_gate.v1",
  s216ErrorTaxonomy: "s216.error_notebook_gap_taxonomy.v1",
  s217ConceptGraph: "s217.personal_core_concept_graph.v1",
  s218ReviewScheduler: "s218.similar_past_question_review_scheduler.v1",
} as const;

export type S233LawVersionStatus =
  | "verified"
  | "needs_official_verification"
  | "unresolved_conflict"
  | "blocked"
  | "synthetic_fixture"
  | "not_applicable";

export type S233RightsStatus =
  | "redistribution_allowed"
  | "display_by_deep_link"
  | "private_reference_only"
  | "needs_legal_review";

export const S233_FINDING_STATUSES = [
  "met",
  "partial",
  "missing",
  "incorrect",
  "not_assessable",
] as const;
export type S233FindingStatus = (typeof S233_FINDING_STATUSES)[number];

export const S233_ANSWER_PACK_VERIFICATION_STATUSES = [
  "verified_learning_reference",
  "source_grounded_study_answer",
  "expert_unreviewed_ai_draft",
] as const;
export type S233AnswerPackVerificationStatus =
  (typeof S233_ANSWER_PACK_VERIFICATION_STATUSES)[number];

export const S233_ANSWER_LEVELS = [
  "L1_recall_outline",
  "L2_exam_length_answer",
  "L3_annotated_reasoning",
] as const;
export type S233AnswerLevel = (typeof S233_ANSWER_LEVELS)[number];

export const S233_EVIDENCE_STATES = [
  "detected",
  "corrected",
  "uncertain",
  "retained",
  "near_transferred",
  "far_transferred",
  "timed_stable",
] as const;
export type S233EvidenceState = (typeof S233_EVIDENCE_STATES)[number];

export const S233_LANE_A_EMITTABLE_EVIDENCE_STATES = [
  "detected",
  "corrected",
  "uncertain",
] as const satisfies readonly S233EvidenceState[];
export type S233LaneAEmittableEvidenceState =
  (typeof S233_LANE_A_EMITTABLE_EVIDENCE_STATES)[number];

export const S233_LATER_EVIDENCE_STATES = [
  "retained",
  "near_transferred",
  "far_transferred",
  "timed_stable",
] as const satisfies readonly S233EvidenceState[];
export type S233LaterEvidenceState =
  (typeof S233_LATER_EVIDENCE_STATES)[number];

export type S233ValidationResult = {
  valid: boolean;
  errors: string[];
};

export type S233AuthorityGuardrails = {
  officialGrading: false;
  expertVerifiedWithoutApproval: false;
  passProbability: false;
  validatedDigitalTwin: false;
  causalInterventionSelection: false;
  optimalInterventionSelection: false;
  humanApprovalRequiredForPersonalLearnerPath: false;
};

export const S233_AUTHORITY_GUARDRAILS: S233AuthorityGuardrails = {
  officialGrading: false,
  expertVerifiedWithoutApproval: false,
  passProbability: false,
  validatedDigitalTwin: false,
  causalInterventionSelection: false,
  optimalInterventionSelection: false,
  humanApprovalRequiredForPersonalLearnerPath: false,
};

export const S233_INPUT_FINGERPRINT_SCOPE =
  "s233.owner_submission_input_digest_pack_ontology_rubric_source_evaluator_schema_exposure.v1" as const;

export const S233_INPUT_FINGERPRINT_FIELDS = [
  "learnerOwnerRefId",
  "rewriteRegradeLineage.answerSubmissionId",
  "inputVersionId",
  "normalizedLearnerInputSha256",
  "versions.answerPackId",
  "versions.answerPackVersion",
  "versions.answerPackSchemaVersion",
  "versions.ontologyVersion",
  "versions.rubricVersion",
  "versions.subjectEngineVersion",
  "versions.sourceVersion",
  "versions.primaryModelVersion",
  "versions.primaryPromptVersion",
  "versions.criticModelVersion",
  "versions.criticPromptVersion",
  "versions.cascadeVersion",
  "versions.findingSchemaVersion",
  "revealHistory[fingerprintedRevealEventId]",
] as const;

export type S233ScoringEvidenceRequirement = {
  requirementId: string;
  kind:
    | "learner_answer_segment"
    | "learner_calculation_step"
    | "source_anchor"
    | "rubric_anchor";
  minimumCount: number;
  required: boolean;
};

export type S233ScoringSkillIdentity = {
  schemaVersion: typeof S233_SCORING_SKILL_SCHEMA_VERSION;
  skillId: string;
  ontologyVersion: typeof S233_SCORING_ONTOLOGY_VERSION;
  subject: RubricEvidenceSubject;
  taskArchetype: string;
  parentSkillIds: string[];
  prerequisiteSkillIds: string[];
  evidenceRequirements: S233ScoringEvidenceRequirement[];
  severity: "minor" | "moderate" | "major";
  critical: boolean;
  deductionGroup: {
    groupId: string;
    nonOverlap: true;
    doubleDeductionAllowed: false;
  };
  remediationActionType: OneNextActionContract["actionType"];
  immutable: true;
  containsRawContent: false;
};

export type S233LearnerEvidenceLocator = {
  answerSubmissionId: string;
  inputVersionId: string;
  wholeAnswer: boolean;
  segmentId?: string;
  calculationStepId?: string;
  pageIndex?: number;
  containsRawContent: false;
};

export type S233ScoringFinding = {
  schemaVersion: typeof S233_SCORING_FINDING_SCHEMA_VERSION;
  findingId: string;
  skillId: string;
  status: S233FindingStatus;
  learnerEvidenceLocator: S233LearnerEvidenceLocator | null;
  sourceAnchorIds: string[];
  rubricAnchorIds: string[];
  evidenceRequirementBindings: Array<{
    requirementId: string;
    evidenceRefIds: string[];
  }>;
  confidence: {
    level: RubricEvidenceConfidenceLevel;
    uncertaintyCodes: string[];
  };
  provenance: {
    kind: "official" | "instructor" | "ai_inferred";
    provenanceRefId: string;
  };
  abstentionReason:
    | "learner_evidence_missing"
    | "source_unresolved"
    | "rubric_unresolved"
    | "evaluator_uncertain"
    | "critic_disagreement_unresolved"
    | "unsupported_task"
    | null;
  authorityGuardrails: S233AuthorityGuardrails;
  containsRawContent: false;
};

export type S233ScoringFindingBundle = {
  finding: S233ScoringFinding;
  skill: S233ScoringSkillIdentity;
  expectedAnswerSubmissionId: string;
  expectedInputVersionId: string;
  ontologySkillBindings: Array<{
    skill: S233ScoringSkillIdentity;
  }>;
  sourceAnchorBindings: Array<{
    sourceAnchorId: string;
    sourceId: string;
    sourceSnapshotId: string;
    answerPackId: string;
    answerPackVersion: string;
    subject: RubricEvidenceSubject;
    taskArchetype: string;
  }>;
  rubricAnchorBindings: Array<{
    rubricAnchorId: string;
    rubricVersion: typeof S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence;
    subject: RubricEvidenceSubject;
    skillId: string;
  }>;
  provenanceBindings: Array<{
    provenanceRefId: string;
    kind: "official" | "instructor" | "ai_inferred";
    subject: RubricEvidenceSubject;
    skillId: string;
    cascadeTraceId: string;
    modelVersion: string | null;
    promptVersion: string | null;
  }>;
};

export type S233ClaimSourceGraph = {
  graphId: string;
  claimIds: string[];
  sourceAnchorIds: string[];
  edges: Array<{
    claimId: string;
    sourceAnchorId: string;
    relation: "supports" | "qualifies" | "contradicts";
  }>;
  claimProseStored: false;
  sourceExcerptStored: false;
};

export type S233AnswerPackSnapshot = {
  snapshotId: string;
  sourceRegistryVersion: string;
  sourceIds: string[];
  lawRegistryVersion: string | null;
  lawVersionIds: string[];
  lawVersionStatus: S233LawVersionStatus;
  rightsRegistryVersion: string;
  rightsDecisionIds: string[];
  rightsStatuses: S233RightsStatus[];
  capturedAt: string;
};

export type S233TransformationProvenance = {
  provenanceId: string;
  kind:
    | "source_normalization"
    | "deterministic_validation"
    | "ai_generation"
    | "critic_consensus"
    | "release_gate";
  inputRefIds: string[];
  outputClaimIds: string[];
  modelVersion: string | null;
  promptVersion: string | null;
  schemaVersion: string;
  transformedAt: string;
  providerPayloadStored: false;
  learnerContentUsed: false;
};

export type S233AnswerPackIdentity = {
  schemaVersion: typeof S233_ANSWER_PACK_SCHEMA_VERSION;
  packId: string;
  packVersion: string;
  contentHashSha256: string;
  immutable: true;
  subject: RubricEvidenceSubject;
  verificationStatus: S233AnswerPackVerificationStatus;
  answerLevels: S233AnswerLevel[];
  claimSourceGraph: S233ClaimSourceGraph;
  snapshot: S233AnswerPackSnapshot;
  transformationProvenance: S233TransformationProvenance[];
  releaseProof: {
    s214PipelineVersion: typeof S233_REUSED_CONTRACT_VERSIONS.s214AnswerPipeline;
    s214PipelineId: string;
    s214Status: "ready_for_s215_consensus";
    s215ReleaseGateVersion: typeof S233_REUSED_CONTRACT_VERSIONS.s215ReleaseGate;
    s215GateId: string;
    s215Status: "released";
    unresolvedBlockerCodes: [];
  } | null;
  learnerContentPolicy: {
    allowed: false;
    included: false;
    sourceIds: [];
  };
  expertReview: {
    approved: false;
    approvalEvidenceId: null;
  };
  authorityGuardrails: S233AuthorityGuardrails;
  containsRawContent: false;
};

export type S233AnswerPackRegistryContext = {
  sourceRegistryVersion: string;
  lawRegistryVersion: string | null;
  rightsRegistryVersion: string;
  sourceRecords: Array<{
    sourceId: string;
    subject: RubricEvidenceSubject;
    sourceAnchorIds: string[];
    lawVersionIds: string[];
    rightsDecisionIds: string[];
  }>;
  lawVersionRecords: Array<{
    lawVersionId: string;
    status: S233LawVersionStatus;
  }>;
  rightsDecisionRecords: Array<{
    rightsDecisionId: string;
    sourceId: string;
    status: S233RightsStatus;
  }>;
  s214PipelineRecords: Array<{
    pipelineId: string;
    packId: string;
    packVersion: string;
    contentHashSha256: string;
    subject: RubricEvidenceSubject;
    status: "ready_for_s215_consensus" | "blocked";
  }>;
  s215GateRecords: Array<{
    gateId: string;
    pipelineId: string;
    packId: string;
    packVersion: string;
    contentHashSha256: string;
    subject: RubricEvidenceSubject;
    status: "released" | "blocked";
    unresolvedBlockerCodes: string[];
  }>;
};

export type S233AnswerExposure = "none" | "outline" | "partial" | "full";
export type S233AssistanceLevel =
  | "none"
  | "navigation_only"
  | "hint"
  | "worked_step"
  | "full_answer";

export type S233LearnerAnswerReviewIdentity = {
  schemaVersion: typeof S233_LEARNER_REVIEW_SCHEMA_VERSION;
  reviewId: string;
  reviewRecordVersion: number;
  expectedPreviousReviewRecordVersion: number | null;
  ownerBinding: "authenticated_request_user";
  learnerOwnerRefId: string;
  subject: RubricEvidenceSubject;
  attemptId: string;
  attemptVersion: number;
  inputVersionId: string;
  versions: {
    answerPackId: string;
    answerPackVersion: string;
    answerPackSchemaVersion: typeof S233_ANSWER_PACK_SCHEMA_VERSION;
    ontologyVersion: typeof S233_SCORING_ONTOLOGY_VERSION;
    rubricVersion: typeof S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence;
    subjectEngineVersion:
      | typeof S233_REUSED_CONTRACT_VERSIONS.s211LawReview
      | typeof S233_REUSED_CONTRACT_VERSIONS.s212TheoryReview
      | typeof S233_REUSED_CONTRACT_VERSIONS.s213PracticeReview;
    sourceVersion: string;
    primaryModelVersion: string;
    primaryPromptVersion: string;
    criticModelVersion: string;
    criticPromptVersion: string;
    cascadeVersion: typeof S233_AI_CASCADE_VERSION;
    cascadeTraceId: string;
    controllerEventVersion: typeof S233_CONTROLLER_EVENT_VERSION;
    findingSchemaVersion: typeof S233_SCORING_FINDING_SCHEMA_VERSION;
    rewriteRegradeVersion: typeof S233_REUSED_CONTRACT_VERSIONS.s206RewriteRegrade;
  };
  revealHistory: Array<{
    eventId: string;
    occurredAt: string;
    exposure: S233AnswerExposure;
    answerLevel: S233AnswerLevel | null;
    deliberateLearnerOverride: boolean;
  }>;
  rewriteRegradeLineage: {
    historyId: string;
    rootAnswerSubmissionId: string;
    answerSubmissionId: string;
    rootAttemptId: string;
    parentAttemptId: string | null;
    predecessorReviewId: string | null;
  };
  idempotency: {
    key: string;
    inputFingerprint: string;
    fingerprintScope: typeof S233_INPUT_FINGERPRINT_SCOPE;
    fingerprintedRevealEventId: string;
    status: "claimed" | "completed" | "failed_retryable";
  };
  stageStatus: {
    overall: "pending" | "partial" | "completed" | "abstained" | "failed_retryable";
    deterministicChecks: "pending" | "completed" | "failed" | "failed_retryable";
    primaryGrader: "pending" | "completed" | "abstained" | "skipped" | "failed_retryable";
    conditionalCritic:
      | "not_required"
      | "pending"
      | "completed"
      | "abstained"
      | "failed_retryable";
    persistence: "pending" | "completed" | "failed_retryable";
    failureStage:
      | "deterministic_checks"
      | "primary_grader"
      | "conditional_critic"
      | "persistence"
      | null;
  };
  queueTodayLinkage: {
    status: "not_linked" | "queue_linked" | "today_linked" | "queue_and_today_linked";
    reviewQueueItemId: string | null;
    todayPlanTaskId: string | null;
  };
  authorityGuardrails: S233AuthorityGuardrails;
  dataBoundary: {
    learnerMaterialInIdentity: false;
    learnerMaterialInTelemetry: false;
    globalReferenceWrite: false;
    modelTrainingUse: false;
    metadataOnly: true;
    containsRawContent: false;
  };
};

export type S233LearnerReviewRequestContext = {
  authenticatedLearnerOwnerRefId: string;
  requestIdempotencyKey: string;
  computedInputFingerprintSha256: string;
};

type S233EvidenceStateRecordBase = {
  schemaVersion: typeof S233_EVIDENCE_STATE_SCHEMA_VERSION;
  evidenceStateId: string;
  learnerOwnerRefId: string;
  learnerReviewId: string;
  conceptNodeId: string;
  initialDetectionEventId: string;
  evidenceEventId: string;
  predecessorEvidenceStateId: string | null;
  evidenceKind:
    | "initial_evaluation"
    | "verified_correction"
    | "unresolved_evaluation"
    | "delayed_unassisted_retrieval"
    | "near_variant_transfer"
    | "far_variant_transfer"
    | "timed_unassisted_practice";
  outcome: "correct" | "partially_correct" | "incorrect" | "abstained";
  proofRefIds: string[];
  assistanceLevel: S233AssistanceLevel;
  answerExposure: S233AnswerExposure;
  variantFamilyId: string | null;
  variantDistance: "same" | "near" | "far" | null;
  elapsedTimeMs: number | null;
  observedAt: string;
  containsRawContent: false;
};

export type S233LaneAEvidenceStateRecord = S233EvidenceStateRecordBase & {
  state: S233LaneAEmittableEvidenceState;
  emitter: "lane_a";
  actualLaterEvidenceObserved: false;
};

export type S233LaterEvidenceStateRecord = S233EvidenceStateRecordBase & {
  state: S233LaterEvidenceState;
  emitter: "later_evidence";
  actualLaterEvidenceObserved: true;
  predecessorEvidenceStateId: string;
};

export type S233EvidenceStateRecord =
  | S233LaneAEvidenceStateRecord
  | S233LaterEvidenceStateRecord;

export type S233FutureControllerEvent = {
  eventVersion: typeof S233_CONTROLLER_EVENT_VERSION;
  eventId: string;
  idempotencyKey: string;
  learnerOwnerRefId: string;
  learnerReviewId: string;
  conceptNodeId: string;
  occurredAt: string;
  elapsedTimeMs: number;
  confidence: RubricEvidenceConfidenceLevel | "unknown";
  assistanceLevel: S233AssistanceLevel;
  answerExposure: S233AnswerExposure;
  inputModality:
    | "typed"
    | "handwritten_ocr"
    | "file_upload"
    | "calculator"
    | "manual_metadata";
  variantFamilyId: string | null;
  variantDistance: "same" | "near" | "far" | null;
  sessionPosition: number;
  sourceUncertaintyCodes: string[];
  evaluatorUncertaintyCodes: string[];
  outcome: "correct" | "partially_correct" | "incorrect" | "abstained";
  outcomeProofRefIds: string[];
  predecessorEventId: string | null;
  successorEventId: string | null;
  metadataOnly: true;
  containsRawContent: false;
};

export type S233EvidenceProofBundle = {
  record: S233EvidenceStateRecord;
  predecessor: S233EvidenceStateRecord | null;
  controllerEvent: S233FutureControllerEvent;
  controllerEventPersistenceReceiptId: string;
  predecessorStatePersistenceReceiptId: string | null;
  authenticatedLearnerOwnerRefId: string;
  trustedOutcomeProofRecords: Array<{
    proofRefId: string;
    kind:
      | "scoring_finding"
      | "rewrite_verification"
      | "retrieval_result"
      | "transfer_result"
      | "timed_practice_result";
    learnerOwnerRefId: string;
    learnerReviewId: string;
    conceptNodeId: string;
    controllerEventId: string;
    outcome: "correct" | "partially_correct" | "incorrect" | "abstained";
    variantTaskId: string;
    variantFamilyId: string | null;
    variantDistance: "same" | "near" | "far" | null;
    observedAt: string;
    persistenceReceiptId: string;
    immutable: true;
    containsRawContent: false;
  }>;
};

export const S233_AI_ONLY_EVALUATION_CASCADE = [
  "deterministic_checks",
  "primary_subject_grader",
  "conditional_critic",
  "abstention_when_unresolved",
] as const;

export type S233AiEvaluationCascadeTrace = {
  traceId: string;
  cascadeVersion: typeof S233_AI_CASCADE_VERSION;
  learnerOwnerRefId: string;
  learnerReviewId: string;
  answerSubmissionId: string;
  inputVersionId: string;
  inputFingerprintSha256: string;
  answerPackId: string;
  answerPackVersion: string;
  sourceSnapshotId: string;
  deterministicChecks: {
    status: "passed" | "failed";
    checkIds: string[];
    blockerCodes: string[];
  };
  primarySubjectGrader: {
    subject: RubricEvidenceSubject;
    status: "completed" | "abstained" | "not_run";
    modelVersion: string | null;
    promptVersion: string | null;
    findingIds: string[];
    criticalFindingIds: string[];
    uncertaintyCodes: string[];
    graderDisagreementDetected: boolean;
  };
  conditionalCritic: {
    status: "not_required" | "completed" | "abstained";
    triggerReasons: Array<"critical_finding" | "uncertainty" | "grader_disagreement">;
    modelVersion: string | null;
    promptVersion: string | null;
    unresolvedCodes: string[];
  };
  finalDisposition: "evaluated" | "abstained";
  humanApproval: {
    requested: false;
    required: false;
    received: false;
  };
  authorityGuardrails: S233AuthorityGuardrails;
};

export type S233AiEvaluationCascadeBundle = {
  trace: S233AiEvaluationCascadeTrace;
  findings: S233ScoringFinding[];
  skills: S233ScoringSkillIdentity[];
  deterministicFindingCheckResults: Array<{
    checkResultId: string;
    checkId: string;
    findingId: string;
    deterministicStatus: S233FindingStatus;
    persistenceReceiptId: string;
    immutable: true;
    containsRawContent: false;
  }>;
};

export type S233TrustedScoringContext = {
  contextVersion: typeof S233_TRUSTED_SCORING_CONTEXT_VERSION;
  ontologyAdapterVersion: "s233.canonical_ontology_adapter.v1";
  rubricAdapterVersion: "s233.s205_rubric_adapter.v1";
  ontologyVersion: typeof S233_SCORING_ONTOLOGY_VERSION;
  rubricVersion: typeof S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence;
  snapshotReceiptId: string;
  canonicalSkills: S233ScoringSkillIdentity[];
  rubricAnchors: Array<{
    rubricAnchorId: string;
    subject: RubricEvidenceSubject;
    skillId: string;
  }>;
};

export type S233LearnerReviewEvaluationContext = {
  review: S233LearnerAnswerReviewIdentity;
  requestContext: S233LearnerReviewRequestContext;
  cascadeBundle: S233AiEvaluationCascadeBundle;
  answerPack: S233AnswerPackIdentity;
  answerPackRegistryContext: S233AnswerPackRegistryContext;
  trustedScoringContext: S233TrustedScoringContext;
  findingBundles: S233ScoringFindingBundle[];
};

export const S233_FROZEN_SHARED_FILES = [
  "lib/review-os/s233-parallel-execution-contract.ts",
  "tests/s233-parallel-execution-contract.test.mjs",
  "docs/s233-parallel-execution-contract-lock.md",
  "lib/review-os/data-boundary.ts",
  "lib/review-os/rubric-evidence-contract.ts",
  "lib/review-os/rewrite-regrade-history-contract.ts",
  "lib/review-os/s211-law-answer-review-engine.ts",
  "lib/review-os/theory-answer-review-engine.ts",
  "lib/review-os/practice-answer-review-engine.ts",
  "lib/review-os/s214-reference-answer-pipeline.ts",
  "lib/review-os/s215-reference-answer-release-gate.ts",
  "lib/review-os/s216-error-notebook-gap-taxonomy.ts",
  "lib/review-os/s217-personal-core-concept-graph.ts",
  "lib/review-os/s218-similar-question-review-scheduler.ts",
  "lib/review-os/law-source-version-registry.ts",
  "lib/review-os/practice-calculation-unit-registry.ts",
  "lib/review-os/second-round-question-registry.ts",
  "lib/review-os/second-round-reference-answer-package-registry.ts",
  "lib/review-os/second-round-source-rights-registry.ts",
  "lib/review-os/theory-concept-corpus-registry.ts",
  "tests/rubric-evidence-contract.test.mjs",
  "tests/rewrite-regrade-history-contract.test.mjs",
  "tests/s211-law-answer-review-engine.test.mjs",
  "tests/theory-answer-review-engine.test.mjs",
  "tests/practice-answer-review-engine.test.mjs",
  "tests/s214-reference-answer-pipeline.test.mjs",
  "tests/s215-reference-answer-release-gate.test.mjs",
  "tests/s216-error-notebook-gap-taxonomy.test.mjs",
  "tests/s217-personal-core-concept-graph.test.mjs",
  "tests/s218-similar-question-review-scheduler.test.mjs",
  "tests/law-source-version-registry.test.mjs",
  "tests/practice-calculation-unit-registry.test.mjs",
  "tests/second-round-question-registry.test.mjs",
  "tests/second-round-reference-answer-package-registry.test.mjs",
  "tests/second-round-source-rights-registry.test.mjs",
  "tests/theory-concept-corpus-registry.test.mjs",
  "scripts/run-node-tests.mjs",
  "package.json",
  "AGENTS.md",
  "roadmap/active-program.yml",
] as const;

export const S233_LANE_FILE_OWNERSHIP = {
  laneA: {
    prefixes: [
      "app/answer-review/",
      "app/api/answer-review/",
      "components/review-os/s233a-",
      "lib/review-os/s233a-",
      "tests/s233a-",
      "docs/s233a-",
    ],
    exactFiles: [
      "lib/evaluate/answer-review-structure.ts",
      "lib/evaluate/answer-review-field-score.ts",
      "lib/evaluate/answer-review-quality.ts",
      "lib/review-os/answer-review-reference-grounding.ts",
      "lib/review-os/repository.ts",
      "lib/review-os/second-answer-rewrite.ts",
      "lib/review-os/second-rewrite-comparison.ts",
      "lib/review-os/service.ts",
      "lib/review-os/types.ts",
    ],
    additiveMigration: {
      prefix: "supabase/migrations/",
      basenamePattern: "^[0-9]{12,14}_s233a_[a-z0-9_]+[.]sql$",
      reviewVersion: "s233.additive_migration_review.v1",
      maximum: 1,
    },
  },
  laneB: {
    prefixes: [
      "scripts/s233b-",
      "lib/review-os/s233b-",
      "reference_corpus/legal_sources/appraiser_second_round_",
      "reference_corpus/legal_sources/s233b_",
      "reference_corpus/practice_sources/appraiser_second_round_",
      "reference_corpus/practice_sources/s233b_",
      "reference_corpus/theory_sources/appraiser_second_round_",
      "reference_corpus/theory_sources/s233b_",
      "reference_corpus/question_archive/second/",
      "reference_corpus/reference_answers/second/",
      "tests/s233b-",
      "docs/s233b-",
    ],
    exactFiles: [
      "reference_corpus/legal_sources/appraiser_second_round_law_source_report.json",
      "reference_corpus/legal_sources/appraiser_second_round_law_sources.json",
      "reference_corpus/official_materials/appraiser/second_round_coverage_report.json",
      "reference_corpus/official_materials/appraiser/second_round_rights_registry.json",
      "reference_corpus/official_materials/appraiser/second_round_source_registry.json",
      "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_unit_report.json",
      "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_units.json",
      "reference_corpus/theory_sources/appraiser_second_round_theory_concept_report.json",
      "reference_corpus/theory_sources/appraiser_second_round_theory_concepts.json",
    ],
  },
} as const;

export type S233Lane = keyof typeof S233_LANE_FILE_OWNERSHIP;

export type S233LaneChangeManifestEntry = {
  path: string;
  changeKind: "added" | "modified";
  gitMode: "100644" | "100755";
  contentSha256: string;
  baseBlobSha256: string | null;
};

export type S233LaneChangeManifest = {
  contractVersion: typeof S233_PARALLEL_EXECUTION_CONTRACT_VERSION;
  lane: S233Lane;
  baseMergeSha: string;
  headSha: string;
  entries: S233LaneChangeManifestEntry[];
  additiveMigrationReviewId: string | null;
};

export type S233ObservedGitDiff = {
  baseMergeSha: string;
  headSha: string;
  mergeBaseSha: string;
  baseIsAncestor: true;
  entries: S233LaneChangeManifestEntry[];
};

export type S233TrustedAdditiveMigrationReview = {
  reviewId: string;
  path: string;
  changeKind: "added";
  gitMode: "100644";
  contentSha256: string;
  reviewVersion: "s233.additive_migration_review.v1";
  validatorId: "trusted_sql_additivity_validator";
  verdict: "additive_only";
  destructiveOperationsDetected: false;
  validationEvidenceRefId: string;
};

const REMEDIATION_ACTION_TYPES: readonly OneNextActionContract["actionType"][] = [
  "confirm_ocr",
  "rewrite",
  "recalculate",
  "compare_reference",
  "retry",
  "schedule_review",
  "withhold_until_verified",
];
const CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
const FINDING_STATUSES = new Set<string>(S233_FINDING_STATUSES);
const ANSWER_PACK_STATUSES = new Set<string>(S233_ANSWER_PACK_VERIFICATION_STATUSES);
const ANSWER_LEVELS = new Set<string>(S233_ANSWER_LEVELS);
const EVIDENCE_STATES = new Set<string>(S233_EVIDENCE_STATES);
const LANE_A_STATES = new Set<string>(S233_LANE_A_EMITTABLE_EVIDENCE_STATES);
const ABSTENTION_REASONS = new Set<string>([
  "learner_evidence_missing",
  "source_unresolved",
  "rubric_unresolved",
  "evaluator_uncertain",
  "critic_disagreement_unresolved",
  "unsupported_task",
]);
const RIGHTS_STATUSES = new Set<string>([
  "redistribution_allowed",
  "display_by_deep_link",
  "private_reference_only",
  "needs_legal_review",
]);
const LAW_VERSION_STATUSES = new Set<string>([
  "verified",
  "needs_official_verification",
  "unresolved_conflict",
  "blocked",
  "synthetic_fixture",
  "not_applicable",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SAFE_METADATA_TOKEN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;
const SHA256_DIGEST = /^[a-f0-9]{64}$/;

function isSafeMetadataToken(value: unknown): value is string {
  return isNonEmptyString(value) && SAFE_METADATA_TOKEN.test(value);
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === "string" && SHA256_DIGEST.test(value);
}

function isFullGitSha(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{40}$/.test(value);
}

function addRequiredString(errors: string[], value: unknown, path: string) {
  if (!isSafeMetadataToken(value)) {
    errors.push(`${path} must be a bounded opaque metadata token`);
  }
}

function addClosedRecordErrors(
  errors: string[],
  value: unknown,
  allowedKeys: readonly string[],
  path: string,
) {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return;
  }
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} is not allowed by the closed schema`);
  }
}

function addStringArrayErrors(
  errors: string[],
  value: unknown,
  path: string,
  options: { minimum?: number; unique?: boolean } = {},
) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  const minimum = options.minimum ?? 0;
  if (value.length < minimum) errors.push(`${path} must contain at least ${minimum} item(s)`);
  if (value.some((entry) => !isSafeMetadataToken(entry))) {
    errors.push(`${path} must contain only bounded opaque metadata tokens`);
  }
  if (options.unique !== false && new Set(value).size !== value.length) {
    errors.push(`${path} must not contain duplicates`);
  }
}

function addIsoTimestampError(errors: string[], value: unknown, path: string) {
  const formatValid =
    isNonEmptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
  const timestamp = formatValid ? Date.parse(value) : Number.NaN;
  const normalized =
    formatValid && typeof value === "string" && !value.includes(".")
      ? value.replace("Z", ".000Z")
      : value;
  if (
    !formatValid ||
    Number.isNaN(timestamp) ||
    new Date(timestamp).toISOString() !== normalized
  ) {
    errors.push(`${path} must be a strict UTC RFC3339 timestamp`);
  }
}

function timestampMillis(value: unknown) {
  return isNonEmptyString(value) ? Date.parse(value) : Number.NaN;
}

function addRawBoundaryError(errors: string[], value: unknown) {
  try {
    assertNoRawUserDataInDerived(value);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "raw-data-boundary-violation");
  }
}

function addAuthorityErrors(errors: string[], value: unknown, path: string) {
  addClosedRecordErrors(
    errors,
    value,
    Object.keys(S233_AUTHORITY_GUARDRAILS),
    path,
  );
  if (!isRecord(value)) {
    return;
  }
  for (const key of Object.keys(S233_AUTHORITY_GUARDRAILS)) {
    if (value[key] !== false) errors.push(`${path}.${key} must be false`);
  }
}

function validationResult(errors: string[]): S233ValidationResult {
  return { valid: errors.length === 0, errors };
}

function expectedSubjectEngineVersion(subject: RubricEvidenceSubject) {
  if (subject === "law") return S233_REUSED_CONTRACT_VERSIONS.s211LawReview;
  if (subject === "theory") return S233_REUSED_CONTRACT_VERSIONS.s212TheoryReview;
  return S233_REUSED_CONTRACT_VERSIONS.s213PracticeReview;
}

export function validateS233ScoringSkillIdentity(
  value: unknown,
): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["scoring skill must be an object"]);
  const skill = value as S233ScoringSkillIdentity;
  addClosedRecordErrors(
    errors,
    skill,
    [
      "schemaVersion",
      "skillId",
      "ontologyVersion",
      "subject",
      "taskArchetype",
      "parentSkillIds",
      "prerequisiteSkillIds",
      "evidenceRequirements",
      "severity",
      "critical",
      "deductionGroup",
      "remediationActionType",
      "immutable",
      "containsRawContent",
    ],
    "skill",
  );
  if (skill.schemaVersion !== S233_SCORING_SKILL_SCHEMA_VERSION) {
    errors.push("schemaVersion must match the frozen scoring-skill schema");
  }
  addRequiredString(errors, skill.skillId, "skillId");
  if (skill.ontologyVersion !== S233_SCORING_ONTOLOGY_VERSION) {
    errors.push("ontologyVersion must match the frozen S233 ontology");
  }
  if (!["practice", "theory", "law"].includes(skill.subject)) {
    errors.push("subject must be practice, theory, or law");
  }
  if (
    !isNonEmptyString(skill.taskArchetype) ||
    !/^(common|practice|theory|law)\.[a-z0-9_]+\.v[1-9]\d*$/.test(skill.taskArchetype)
  ) {
    errors.push("taskArchetype must be a versioned common or subject-scoped identity");
  } else {
    const scope = skill.taskArchetype.split(".", 1)[0];
    if (scope !== "common" && scope !== skill.subject) {
      errors.push("taskArchetype subject scope must match subject");
    }
  }
  addStringArrayErrors(errors, skill.parentSkillIds, "parentSkillIds");
  addStringArrayErrors(errors, skill.prerequisiteSkillIds, "prerequisiteSkillIds");
  const parentSkillIds = Array.isArray(skill.parentSkillIds) ? skill.parentSkillIds : [];
  const prerequisiteSkillIds = Array.isArray(skill.prerequisiteSkillIds)
    ? skill.prerequisiteSkillIds
    : [];
  if (parentSkillIds.includes(skill.skillId)) errors.push("skill cannot be its own parent");
  if (prerequisiteSkillIds.includes(skill.skillId)) {
    errors.push("skill cannot be its own prerequisite");
  }
  const parentSet = new Set(parentSkillIds);
  if (prerequisiteSkillIds.some((id) => parentSet.has(id))) {
    errors.push("parent and prerequisite IDs must not overlap");
  }
  if (!Array.isArray(skill.evidenceRequirements) || skill.evidenceRequirements.length === 0) {
    errors.push("evidenceRequirements must not be empty");
  } else {
    const requirementIds = new Set<string>();
    for (const rawRequirement of skill.evidenceRequirements) {
      if (!isRecord(rawRequirement)) {
        errors.push("evidenceRequirements entries must be objects");
        continue;
      }
      const requirement = rawRequirement as S233ScoringEvidenceRequirement;
      addClosedRecordErrors(
        errors,
        requirement,
        ["requirementId", "kind", "minimumCount", "required"],
        "evidenceRequirements[]",
      );
      addRequiredString(errors, requirement.requirementId, "evidenceRequirements.requirementId");
      if (requirementIds.has(requirement.requirementId)) {
        errors.push("evidence requirement IDs must be unique");
      }
      requirementIds.add(requirement.requirementId);
      if (
        ![
          "learner_answer_segment",
          "learner_calculation_step",
          "source_anchor",
          "rubric_anchor",
        ].includes(requirement.kind)
      ) {
        errors.push("evidenceRequirements.kind is invalid");
      }
      if (!Number.isInteger(requirement.minimumCount) || requirement.minimumCount < 1) {
        errors.push("evidenceRequirements.minimumCount must be a positive integer");
      }
      if (
        (requirement.kind === "learner_answer_segment" ||
          requirement.kind === "learner_calculation_step") &&
        requirement.minimumCount !== 1
      ) {
        errors.push("single learner locators require minimumCount exactly 1");
      }
      if (typeof requirement.required !== "boolean") {
        errors.push("evidenceRequirements.required must be boolean");
      }
    }
  }
  if (!["minor", "moderate", "major"].includes(skill.severity)) {
    errors.push("severity is invalid");
  }
  if (typeof skill.critical !== "boolean") errors.push("critical must be boolean");
  if (skill.critical && skill.severity !== "major") {
    errors.push("critical skills must use major severity");
  }
  addRequiredString(errors, skill.deductionGroup?.groupId, "deductionGroup.groupId");
  addClosedRecordErrors(
    errors,
    skill.deductionGroup,
    ["groupId", "nonOverlap", "doubleDeductionAllowed"],
    "deductionGroup",
  );
  if (skill.deductionGroup?.nonOverlap !== true) {
    errors.push("deductionGroup.nonOverlap must be true");
  }
  if (skill.deductionGroup?.doubleDeductionAllowed !== false) {
    errors.push("deductionGroup.doubleDeductionAllowed must be false");
  }
  if (!REMEDIATION_ACTION_TYPES.includes(skill.remediationActionType)) {
    errors.push("remediationActionType is invalid");
  }
  if (skill.immutable !== true) errors.push("scoring-skill identity must be immutable");
  if (skill.containsRawContent !== false) errors.push("scoring-skill identity must be metadata-only");
  addRawBoundaryError(errors, skill);
  return validationResult(errors);
}

export function validateS233ScoringFinding(
  value: unknown,
): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["scoring finding must be an object"]);
  const finding = value as S233ScoringFinding;
  addClosedRecordErrors(
    errors,
    finding,
    [
      "schemaVersion",
      "findingId",
      "skillId",
      "status",
      "learnerEvidenceLocator",
      "sourceAnchorIds",
      "rubricAnchorIds",
      "evidenceRequirementBindings",
      "confidence",
      "provenance",
      "abstentionReason",
      "authorityGuardrails",
      "containsRawContent",
    ],
    "finding",
  );
  if (finding.schemaVersion !== S233_SCORING_FINDING_SCHEMA_VERSION) {
    errors.push("schemaVersion must match the frozen scoring-finding schema");
  }
  addRequiredString(errors, finding.findingId, "findingId");
  addRequiredString(errors, finding.skillId, "skillId");
  if (!FINDING_STATUSES.has(finding.status)) errors.push("finding status is invalid");
  const assessed = finding.status !== "not_assessable";
  addStringArrayErrors(errors, finding.sourceAnchorIds, "sourceAnchorIds", {
    minimum: assessed ? 1 : 0,
  });
  addStringArrayErrors(errors, finding.rubricAnchorIds, "rubricAnchorIds", {
    minimum: assessed ? 1 : 0,
  });
  if (!Array.isArray(finding.evidenceRequirementBindings)) {
    errors.push("evidenceRequirementBindings must be an array");
  } else {
    const requirementIds = new Set<string>();
    for (const rawBinding of finding.evidenceRequirementBindings) {
      if (!isRecord(rawBinding)) {
        errors.push("evidenceRequirementBindings entries must be objects");
        continue;
      }
      addClosedRecordErrors(
        errors,
        rawBinding,
        ["requirementId", "evidenceRefIds"],
        "evidenceRequirementBindings[]",
      );
      addRequiredString(errors, rawBinding.requirementId, "evidenceRequirementBindings.requirementId");
      addStringArrayErrors(
        errors,
        rawBinding.evidenceRefIds,
        "evidenceRequirementBindings.evidenceRefIds",
        { minimum: assessed ? 1 : 0 },
      );
      if (isSafeMetadataToken(rawBinding.requirementId)) {
        if (requirementIds.has(rawBinding.requirementId)) {
          errors.push("evidenceRequirementBindings requirement IDs must be unique");
        }
        requirementIds.add(rawBinding.requirementId);
      }
    }
  }
  addClosedRecordErrors(
    errors,
    finding.confidence,
    ["level", "uncertaintyCodes"],
    "confidence",
  );
  if (!CONFIDENCE_LEVELS.includes(finding.confidence?.level)) {
    errors.push("confidence.level is invalid");
  }
  addStringArrayErrors(errors, finding.confidence?.uncertaintyCodes, "confidence.uncertaintyCodes");
  if (
    (finding.confidence?.level === "low" || finding.confidence?.level === "medium") &&
    (!Array.isArray(finding.confidence.uncertaintyCodes) ||
      finding.confidence.uncertaintyCodes.length === 0)
  ) {
    errors.push("low or medium confidence requires an explicit uncertainty code");
  }
  if (!["official", "instructor", "ai_inferred"].includes(finding.provenance?.kind)) {
    errors.push("provenance.kind is invalid");
  }
  addClosedRecordErrors(
    errors,
    finding.provenance,
    ["kind", "provenanceRefId"],
    "provenance",
  );
  addRequiredString(errors, finding.provenance?.provenanceRefId, "provenance.provenanceRefId");
  const locator = finding.learnerEvidenceLocator;
  if (locator !== null) {
    if (!isRecord(locator)) {
      errors.push("learnerEvidenceLocator must be an object or null");
    } else {
      addClosedRecordErrors(
        errors,
        locator,
        [
          "answerSubmissionId",
          "inputVersionId",
          "wholeAnswer",
          "segmentId",
          "calculationStepId",
          "pageIndex",
          "containsRawContent",
        ],
        "learnerEvidenceLocator",
      );
      addRequiredString(errors, locator.answerSubmissionId, "learnerEvidenceLocator.answerSubmissionId");
      addRequiredString(errors, locator.inputVersionId, "learnerEvidenceLocator.inputVersionId");
      if (typeof locator.wholeAnswer !== "boolean") {
        errors.push("learnerEvidenceLocator.wholeAnswer must be boolean");
      }
      if (locator.segmentId !== undefined) {
        addRequiredString(errors, locator.segmentId, "learnerEvidenceLocator.segmentId");
      }
      if (locator.calculationStepId !== undefined) {
        addRequiredString(
          errors,
          locator.calculationStepId,
          "learnerEvidenceLocator.calculationStepId",
        );
      }
      if (
        locator.wholeAnswer !== true &&
        !isSafeMetadataToken(locator.segmentId) &&
        !isSafeMetadataToken(locator.calculationStepId)
      ) {
        errors.push("learner evidence locator requires a segment or calculation-step ID");
      }
      if (
        locator.wholeAnswer === true &&
        (locator.segmentId !== undefined || locator.calculationStepId !== undefined)
      ) {
        errors.push("whole-answer locator must not invent a segment or calculation-step ID");
      }
      if (locator.wholeAnswer === true && finding.status !== "missing") {
        errors.push("only a missing finding may deliberately locate the whole submitted answer");
      }
      if (locator.containsRawContent !== false) {
        errors.push("learner evidence locator must not contain raw content");
      }
      if (
        locator.pageIndex !== undefined &&
        (!Number.isInteger(locator.pageIndex) || (locator.pageIndex as number) < 0)
      ) {
        errors.push("learnerEvidenceLocator.pageIndex must be a non-negative integer");
      }
    }
  }
  if (finding.status === "not_assessable") {
    if (
      finding.abstentionReason === "learner_evidence_missing" &&
      finding.learnerEvidenceLocator !== null
    ) {
      errors.push("learner_evidence_missing abstention must not invent a learner locator");
    }
    if (finding.abstentionReason === null) {
      errors.push("not_assessable findings require an abstention reason");
    } else if (!ABSTENTION_REASONS.has(finding.abstentionReason)) {
      errors.push("abstentionReason is invalid");
    }
    if (finding.confidence?.level !== "low") {
      errors.push("not_assessable findings must use low confidence");
    }
  } else {
    if (!isRecord(locator)) {
      errors.push("assessed findings require a learner evidence locator");
    }
    if (finding.abstentionReason !== null) {
      errors.push("assessed findings must not carry an abstention reason");
    }
  }
  addAuthorityErrors(errors, finding.authorityGuardrails, "authorityGuardrails");
  if (finding.containsRawContent !== false) errors.push("finding must be metadata-only");
  addRawBoundaryError(errors, finding);
  return validationResult(errors);
}

export function validateS233ScoringFindingBundle(value: unknown): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["scoring finding bundle must be an object"]);
  const bundle = value as S233ScoringFindingBundle;
  addClosedRecordErrors(
    errors,
    bundle,
    [
      "finding",
      "skill",
      "expectedAnswerSubmissionId",
      "expectedInputVersionId",
      "ontologySkillBindings",
      "sourceAnchorBindings",
      "rubricAnchorBindings",
      "provenanceBindings",
    ],
    "findingBundle",
  );
  errors.push(...validateS233ScoringFinding(bundle.finding).errors);
  errors.push(...validateS233ScoringSkillIdentity(bundle.skill).errors);
  addRequiredString(errors, bundle.expectedAnswerSubmissionId, "expectedAnswerSubmissionId");
  addRequiredString(errors, bundle.expectedInputVersionId, "expectedInputVersionId");
  const validateBindingArray = (
    bindings: unknown,
    path: string,
    keys: readonly string[],
  ) => {
    if (!Array.isArray(bindings)) {
      errors.push(`${path} must be an array`);
      return [] as Record<string, unknown>[];
    }
    const records: Record<string, unknown>[] = [];
    for (const binding of bindings) {
      if (!isRecord(binding)) {
        errors.push(`${path} entries must be objects`);
        continue;
      }
      addClosedRecordErrors(errors, binding, keys, `${path}[]`);
      records.push(binding);
    }
    return records;
  };
  const ontologyBindings = validateBindingArray(
    bundle.ontologySkillBindings,
    "ontologySkillBindings",
    ["skill"],
  );
  const sourceBindings = validateBindingArray(
    bundle.sourceAnchorBindings,
    "sourceAnchorBindings",
    [
      "sourceAnchorId",
      "sourceId",
      "sourceSnapshotId",
      "answerPackId",
      "answerPackVersion",
      "subject",
      "taskArchetype",
    ],
  );
  const rubricBindings = validateBindingArray(
    bundle.rubricAnchorBindings,
    "rubricAnchorBindings",
    ["rubricAnchorId", "rubricVersion", "subject", "skillId"],
  );
  const provenanceBindings = validateBindingArray(
    bundle.provenanceBindings,
    "provenanceBindings",
    [
      "provenanceRefId",
      "kind",
      "subject",
      "skillId",
      "cascadeTraceId",
      "modelVersion",
      "promptVersion",
    ],
  );
  for (const binding of ontologyBindings) {
    errors.push(...validateS233ScoringSkillIdentity(binding.skill).errors);
  }
  for (const binding of sourceBindings) {
    addRequiredString(errors, binding.sourceAnchorId, "sourceAnchorBindings.sourceAnchorId");
    addRequiredString(errors, binding.sourceId, "sourceAnchorBindings.sourceId");
    addRequiredString(errors, binding.sourceSnapshotId, "sourceAnchorBindings.sourceSnapshotId");
    addRequiredString(errors, binding.answerPackId, "sourceAnchorBindings.answerPackId");
    addRequiredString(errors, binding.answerPackVersion, "sourceAnchorBindings.answerPackVersion");
    addRequiredString(errors, binding.taskArchetype, "sourceAnchorBindings.taskArchetype");
    if (!["practice", "theory", "law"].some((subject) => subject === binding.subject)) {
      errors.push("source anchor binding subject is invalid");
    }
  }
  for (const binding of rubricBindings) {
    addRequiredString(errors, binding.rubricAnchorId, "rubricAnchorBindings.rubricAnchorId");
    addRequiredString(errors, binding.skillId, "rubricAnchorBindings.skillId");
    if (binding.rubricVersion !== S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence) {
      errors.push("rubric anchor binding must pin the frozen S205 rubric version");
    }
    if (!["practice", "theory", "law"].some((subject) => subject === binding.subject)) {
      errors.push("rubric anchor binding subject is invalid");
    }
  }
  for (const binding of provenanceBindings) {
    addRequiredString(errors, binding.provenanceRefId, "provenanceBindings.provenanceRefId");
    addRequiredString(errors, binding.skillId, "provenanceBindings.skillId");
    addRequiredString(errors, binding.cascadeTraceId, "provenanceBindings.cascadeTraceId");
    if (!["official", "instructor", "ai_inferred"].some((kind) => kind === binding.kind)) {
      errors.push("provenance binding kind is invalid");
    }
    if (!["practice", "theory", "law"].some((subject) => subject === binding.subject)) {
      errors.push("provenance binding subject is invalid");
    }
    if (binding.kind === "ai_inferred") {
      addRequiredString(errors, binding.modelVersion, "provenanceBindings.modelVersion");
      addRequiredString(errors, binding.promptVersion, "provenanceBindings.promptVersion");
    } else if (binding.modelVersion !== null || binding.promptVersion !== null) {
      errors.push("official/instructor provenance must not claim AI model or prompt versions");
    }
  }
  for (const [label, ids] of [
    [
      "ontology skill",
      ontologyBindings.map((binding) =>
        isRecord(binding.skill) ? binding.skill.skillId : undefined,
      ),
    ],
    ["source anchor", sourceBindings.map((binding) => binding.sourceAnchorId)],
    ["rubric anchor", rubricBindings.map((binding) => binding.rubricAnchorId)],
    ["provenance", provenanceBindings.map((binding) => binding.provenanceRefId)],
  ] as const) {
    if (new Set(ids).size !== ids.length) {
      errors.push(`${label} binding identities must be unique`);
    }
  }
  if (!isRecord(bundle.finding) || !isRecord(bundle.skill)) return validationResult(errors);

  if (bundle.finding.skillId !== bundle.skill.skillId) {
    errors.push("finding.skillId must resolve to the bundled frozen scoring skill");
  }
  const ontologyById = new Map<string, S233ScoringSkillIdentity>();
  for (const binding of ontologyBindings) {
    if (!isRecord(binding.skill)) continue;
    const canonicalSkill = binding.skill as S233ScoringSkillIdentity;
    if (isSafeMetadataToken(canonicalSkill.skillId)) {
      ontologyById.set(canonicalSkill.skillId, canonicalSkill);
    }
  }
  for (const skillId of [
    bundle.skill.skillId,
    ...(Array.isArray(bundle.skill.parentSkillIds) ? bundle.skill.parentSkillIds : []),
    ...(Array.isArray(bundle.skill.prerequisiteSkillIds) ? bundle.skill.prerequisiteSkillIds : []),
  ]) {
    const canonicalSkill = ontologyById.get(skillId);
    if (
      !canonicalSkill ||
      canonicalSkill.subject !== bundle.skill.subject ||
      canonicalSkill.ontologyVersion !== bundle.skill.ontologyVersion
    ) {
      errors.push(`skill lineage is absent from the trusted ontology: ${String(skillId)}`);
    }
  }
  const canonicalBundledSkill = ontologyById.get(bundle.skill.skillId);
  if (!canonicalBundledSkill || !sameValidatedValue(canonicalBundledSkill, bundle.skill)) {
    errors.push("bundled scoring skill must exactly equal its trusted canonical ontology identity");
  }
  const sourceById = new Map(sourceBindings.map((binding) => [binding.sourceAnchorId, binding]));
  const rubricById = new Map(rubricBindings.map((binding) => [binding.rubricAnchorId, binding]));
  const provenanceById = new Map(
    provenanceBindings.map((binding) => [binding.provenanceRefId, binding]),
  );
  for (const anchor of Array.isArray(bundle.finding.sourceAnchorIds) ? bundle.finding.sourceAnchorIds : []) {
    const binding = sourceById.get(anchor);
    if (
      !binding ||
      binding.subject !== bundle.skill.subject ||
      binding.taskArchetype !== bundle.skill.taskArchetype
    ) errors.push(`finding source anchor lacks a subject/task binding: ${String(anchor)}`);
  }
  for (const anchor of Array.isArray(bundle.finding.rubricAnchorIds) ? bundle.finding.rubricAnchorIds : []) {
    const binding = rubricById.get(anchor);
    if (
      !binding ||
      binding.subject !== bundle.skill.subject ||
      binding.skillId !== bundle.skill.skillId
    ) errors.push(`finding rubric anchor lacks a subject/skill binding: ${String(anchor)}`);
  }
  const provenanceBinding = provenanceById.get(bundle.finding.provenance?.provenanceRefId);
  if (
    !provenanceBinding ||
    provenanceBinding.kind !== bundle.finding.provenance?.kind ||
    provenanceBinding.subject !== bundle.skill.subject ||
    provenanceBinding.skillId !== bundle.skill.skillId
  ) {
    errors.push("finding provenance must resolve to the same kind, subject, and skill");
  }
  const locator = bundle.finding.learnerEvidenceLocator;
  if (isRecord(locator)) {
    if (locator.answerSubmissionId !== bundle.expectedAnswerSubmissionId) {
      errors.push("learner locator answerSubmissionId does not match the evaluated submission");
    }
    if (locator.inputVersionId !== bundle.expectedInputVersionId) {
      errors.push("learner locator inputVersionId does not match the evaluated input version");
    }
  }
  if (Array.isArray(bundle.skill.evidenceRequirements)) {
    const bindingByRequirementId = new Map(
      (Array.isArray(bundle.finding.evidenceRequirementBindings)
        ? bundle.finding.evidenceRequirementBindings.filter(isRecord)
        : []
      ).map((binding) => [binding.requirementId, binding]),
    );
    const usedEvidenceRefs = new Set<string>();
    const knownRequirementIds = new Set(
      bundle.skill.evidenceRequirements
        .filter(isRecord)
        .map((requirement) => requirement.requirementId),
    );
    for (const requirementId of bindingByRequirementId.keys()) {
      if (!knownRequirementIds.has(requirementId)) {
        errors.push(`finding binds an unknown evidence requirement: ${String(requirementId)}`);
      }
    }
    for (const requirement of bundle.skill.evidenceRequirements) {
      if (!isRecord(requirement)) continue;
      const requirementBinding = bindingByRequirementId.get(requirement.requirementId);
      if (!requirementBinding) {
        if (bundle.finding.status !== "not_assessable" && requirement.required === true) {
          errors.push(`finding does not satisfy required evidence: ${String(requirement.requirementId)}`);
        }
        continue;
      }
      const suppliedRefs =
        Array.isArray(requirementBinding.evidenceRefIds)
          ? requirementBinding.evidenceRefIds
          : [];
      const allowedRefs =
        requirement.kind === "learner_answer_segment"
          ? isRecord(locator) && isSafeMetadataToken(locator.segmentId)
            ? [locator.segmentId]
            : isRecord(locator) && locator.wholeAnswer === true && bundle.finding.status === "missing"
              ? [locator.answerSubmissionId]
              : []
          : requirement.kind === "learner_calculation_step"
            ? isRecord(locator) && isSafeMetadataToken(locator.calculationStepId)
              ? [locator.calculationStepId]
              : isRecord(locator) && locator.wholeAnswer === true && bundle.finding.status === "missing"
                ? [locator.answerSubmissionId]
                : []
            : requirement.kind === "source_anchor"
              ? (Array.isArray(bundle.finding.sourceAnchorIds) ? bundle.finding.sourceAnchorIds : [])
              : requirement.kind === "rubric_anchor"
                ? (Array.isArray(bundle.finding.rubricAnchorIds) ? bundle.finding.rubricAnchorIds : [])
                : [];
      if (
        !Number.isInteger(requirement.minimumCount) ||
        suppliedRefs.length < Number(requirement.minimumCount) ||
        suppliedRefs.some((ref) => !allowedRefs.includes(ref))
      ) {
        errors.push(`finding binding does not satisfy its evidence requirement: ${String(requirement.requirementId)}`);
      }
      for (const ref of suppliedRefs) {
        const key = String(ref);
        if (usedEvidenceRefs.has(key)) {
          errors.push("one evidence reference cannot satisfy multiple scoring requirements");
        }
        usedEvidenceRefs.add(key);
      }
    }
  }
  return validationResult(errors);
}

export function validateS233AnswerPackIdentity(
  value: unknown,
): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["Answer Pack identity must be an object"]);
  const pack = value as S233AnswerPackIdentity;
  addClosedRecordErrors(
    errors,
    pack,
    [
      "schemaVersion",
      "packId",
      "packVersion",
      "contentHashSha256",
      "immutable",
      "subject",
      "verificationStatus",
      "answerLevels",
      "claimSourceGraph",
      "snapshot",
      "transformationProvenance",
      "releaseProof",
      "learnerContentPolicy",
      "expertReview",
      "authorityGuardrails",
      "containsRawContent",
    ],
    "answerPack",
  );
  if (pack.schemaVersion !== S233_ANSWER_PACK_SCHEMA_VERSION) {
    errors.push("schemaVersion must be answer_pack.2.0");
  }
  addRequiredString(errors, pack.packId, "packId");
  addRequiredString(errors, pack.packVersion, "packVersion");
  if (!isSha256Digest(pack.contentHashSha256)) {
    errors.push("contentHashSha256 must be a lowercase SHA-256 digest");
  }
  if (pack.immutable !== true) errors.push("Answer Pack identity must be immutable");
  if (!["practice", "theory", "law"].includes(pack.subject)) {
    errors.push("Answer Pack subject is invalid");
  }
  if (!ANSWER_PACK_STATUSES.has(pack.verificationStatus)) {
    errors.push("verificationStatus is invalid");
  }
  if (
    !Array.isArray(pack.answerLevels) ||
    pack.answerLevels.length !== S233_ANSWER_LEVELS.length ||
    new Set(pack.answerLevels).size !== S233_ANSWER_LEVELS.length ||
    pack.answerLevels.some((level) => !ANSWER_LEVELS.has(level))
  ) {
    errors.push("Answer Pack 2.0 must declare each frozen L1/L2/L3 answer level exactly once");
  }
  const graph = pack.claimSourceGraph;
  addClosedRecordErrors(
    errors,
    graph,
    [
      "graphId",
      "claimIds",
      "sourceAnchorIds",
      "edges",
      "claimProseStored",
      "sourceExcerptStored",
    ],
    "claimSourceGraph",
  );
  addRequiredString(errors, graph?.graphId, "claimSourceGraph.graphId");
  addStringArrayErrors(errors, graph?.claimIds, "claimSourceGraph.claimIds", { minimum: 1 });
  addStringArrayErrors(errors, graph?.sourceAnchorIds, "claimSourceGraph.sourceAnchorIds", {
    minimum: 1,
  });
  const claimIdValues = Array.isArray(graph?.claimIds) ? graph.claimIds : [];
  const sourceAnchorIdValues = Array.isArray(graph?.sourceAnchorIds) ? graph.sourceAnchorIds : [];
  const claimIds = new Set(claimIdValues);
  const sourceAnchorIds = new Set(sourceAnchorIdValues);
  const supportedClaims = new Set<string>();
  if (!Array.isArray(graph?.edges) || graph.edges.length === 0) {
    errors.push("claimSourceGraph.edges must not be empty");
  } else {
    for (const rawEdge of graph.edges) {
      if (!isRecord(rawEdge)) {
        errors.push("claimSourceGraph.edges entries must be objects");
        continue;
      }
      const edge = rawEdge as S233ClaimSourceGraph["edges"][number];
      addClosedRecordErrors(
        errors,
        edge,
        ["claimId", "sourceAnchorId", "relation"],
        "claimSourceGraph.edges[]",
      );
      addRequiredString(errors, edge.claimId, "claimSourceGraph.edges.claimId");
      addRequiredString(errors, edge.sourceAnchorId, "claimSourceGraph.edges.sourceAnchorId");
      if (!claimIds.has(edge.claimId)) errors.push("claim-source edge references an unknown claim");
      if (!sourceAnchorIds.has(edge.sourceAnchorId)) {
        errors.push("claim-source edge references an unknown source anchor");
      }
      if (!["supports", "qualifies", "contradicts"].includes(edge.relation)) {
        errors.push("claim-source edge relation is invalid");
      }
      if (edge.relation === "supports") supportedClaims.add(edge.claimId);
    }
  }
  if ([...claimIds].some((claimId) => !supportedClaims.has(claimId))) {
    errors.push("every Answer Pack claim must have at least one supporting source edge");
  }
  if (graph?.claimProseStored !== false || graph?.sourceExcerptStored !== false) {
    errors.push("claim/source graph must remain metadata-only");
  }
  const snapshot = pack.snapshot;
  addClosedRecordErrors(
    errors,
    snapshot,
    [
      "snapshotId",
      "sourceRegistryVersion",
      "sourceIds",
      "lawRegistryVersion",
      "lawVersionIds",
      "lawVersionStatus",
      "rightsRegistryVersion",
      "rightsDecisionIds",
      "rightsStatuses",
      "capturedAt",
    ],
    "snapshot",
  );
  addRequiredString(errors, snapshot?.snapshotId, "snapshot.snapshotId");
  addRequiredString(errors, snapshot?.sourceRegistryVersion, "snapshot.sourceRegistryVersion");
  addStringArrayErrors(errors, snapshot?.sourceIds, "snapshot.sourceIds", { minimum: 1 });
  addRequiredString(errors, snapshot?.rightsRegistryVersion, "snapshot.rightsRegistryVersion");
  addStringArrayErrors(errors, snapshot?.rightsDecisionIds, "snapshot.rightsDecisionIds", {
    minimum: 1,
  });
  if (!Array.isArray(snapshot?.rightsStatuses) || snapshot.rightsStatuses.length === 0) {
    errors.push("snapshot.rightsStatuses must not be empty");
  } else if (snapshot.rightsStatuses.some((status) => !RIGHTS_STATUSES.has(status))) {
    errors.push("snapshot.rightsStatuses contains an invalid rights status");
  }
  addStringArrayErrors(errors, snapshot?.rightsStatuses, "snapshot.rightsStatuses", {
    minimum: 1,
  });
  if (!LAW_VERSION_STATUSES.has(snapshot?.lawVersionStatus)) {
    errors.push("snapshot.lawVersionStatus is invalid");
  }
  addIsoTimestampError(errors, snapshot?.capturedAt, "snapshot.capturedAt");
  if (pack.subject === "law") {
    addRequiredString(errors, snapshot?.lawRegistryVersion, "snapshot.lawRegistryVersion");
    addStringArrayErrors(errors, snapshot?.lawVersionIds, "snapshot.lawVersionIds", {
      minimum: 1,
    });
    if (snapshot?.lawVersionStatus === "not_applicable") {
      errors.push("law Answer Packs cannot use a not_applicable law snapshot");
    }
  }
  if (!Array.isArray(pack.transformationProvenance) || pack.transformationProvenance.length === 0) {
    errors.push("transformationProvenance must not be empty");
  } else {
    const provenanceIds = new Set<string>();
    let previousTransformationTime = -Infinity;
    for (const rawStep of pack.transformationProvenance) {
      if (!isRecord(rawStep)) {
        errors.push("transformationProvenance entries must be objects");
        continue;
      }
      const step = rawStep as S233TransformationProvenance;
      addClosedRecordErrors(
        errors,
        step,
        [
          "provenanceId",
          "kind",
          "inputRefIds",
          "outputClaimIds",
          "modelVersion",
          "promptVersion",
          "schemaVersion",
          "transformedAt",
          "providerPayloadStored",
          "learnerContentUsed",
        ],
        "transformationProvenance[]",
      );
      addRequiredString(errors, step.provenanceId, "transformationProvenance.provenanceId");
      if (provenanceIds.has(step.provenanceId)) {
        errors.push("transformation provenance IDs must be unique");
      }
      provenanceIds.add(step.provenanceId);
      if (
        ![
          "source_normalization",
          "deterministic_validation",
          "ai_generation",
          "critic_consensus",
          "release_gate",
        ].includes(step.kind)
      ) {
        errors.push("transformation provenance kind is invalid");
      }
      addStringArrayErrors(errors, step.inputRefIds, "transformationProvenance.inputRefIds", {
        minimum: 1,
      });
      addStringArrayErrors(errors, step.outputClaimIds, "transformationProvenance.outputClaimIds", {
        minimum: 1,
      });
      if (
        Array.isArray(step.outputClaimIds) &&
        step.outputClaimIds.some((claimId) => !claimIds.has(claimId))
      ) {
        errors.push("transformation provenance references an unknown output claim");
      }
      if (step.kind === "ai_generation" || step.kind === "critic_consensus") {
        addRequiredString(errors, step.modelVersion, "ai transformation modelVersion");
        addRequiredString(errors, step.promptVersion, "ai transformation promptVersion");
      } else if (step.modelVersion !== null || step.promptVersion !== null) {
        errors.push("non-AI transformation stages must not claim model or prompt versions");
      }
      addRequiredString(errors, step.schemaVersion, "transformationProvenance.schemaVersion");
      addIsoTimestampError(errors, step.transformedAt, "transformationProvenance.transformedAt");
      const currentTransformationTime = timestampMillis(step.transformedAt);
      if (
        Number.isFinite(currentTransformationTime) &&
        currentTransformationTime < previousTransformationTime
      ) {
        errors.push("transformation provenance must be chronological");
      }
      if (Number.isFinite(currentTransformationTime)) {
        previousTransformationTime = currentTransformationTime;
      }
      if (
        isNonEmptyString(snapshot?.capturedAt) &&
        isNonEmptyString(step.transformedAt) &&
        timestampMillis(step.transformedAt) < timestampMillis(snapshot.capturedAt)
      ) {
        errors.push("transformation provenance cannot predate the source/law/rights snapshot");
      }
      if (step.providerPayloadStored !== false || step.learnerContentUsed !== false) {
        errors.push("transformation provenance must exclude provider payloads and learner content");
      }
    }
    if (
      pack.verificationStatus === "expert_unreviewed_ai_draft" &&
      !pack.transformationProvenance.some(
        (step) => isRecord(step) && step.kind === "ai_generation",
      )
    ) {
      errors.push("expert_unreviewed_ai_draft requires AI-generation provenance");
    }
  }
  const provenanceKinds = new Set(
    Array.isArray(pack.transformationProvenance)
      ? pack.transformationProvenance
          .filter(isRecord)
          .map((step) => step.kind)
          .filter(isNonEmptyString)
      : [],
  );
  const transformationSteps = Array.isArray(pack.transformationProvenance)
    ? (pack.transformationProvenance.filter(isRecord) as S233TransformationProvenance[])
    : [];
  const transformationIndexById = new Map(
    transformationSteps.map((step, index) => [step.provenanceId, index]),
  );
  transformationSteps.forEach((step, index) => {
    for (const inputRefId of Array.isArray(step.inputRefIds) ? step.inputRefIds : []) {
      const referencedIndex = transformationIndexById.get(inputRefId);
      if (referencedIndex !== undefined && referencedIndex >= index) {
        errors.push("transformation provenance may consume only an earlier transformation ID");
      }
    }
  });
  const stepsForKind = (kind: S233TransformationProvenance["kind"]) =>
    transformationSteps.filter((step) => step.kind === kind);
  const claimsCoveredBy = (kind: S233TransformationProvenance["kind"]) =>
    new Set(
      stepsForKind(kind).flatMap((step) =>
        Array.isArray(step.outputClaimIds) ? step.outputClaimIds : [],
      ),
    );
  const requireEveryClaimCovered = (
    kind: S233TransformationProvenance["kind"],
    statusLabel: string,
  ) => {
    const covered = claimsCoveredBy(kind);
    for (const claimId of claimIdValues) {
      if (!covered.has(claimId)) {
        errors.push(`${statusLabel} provenance does not cover claim: ${String(claimId)}`);
      }
    }
  };
  const statusClaimsGrounding =
    pack.verificationStatus === "verified_learning_reference" ||
    pack.verificationStatus === "source_grounded_study_answer";
  if (statusClaimsGrounding) {
    if (pack.subject === "law" && snapshot?.lawVersionStatus !== "verified") {
      errors.push("grounded law Answer Packs require a verified law version");
    }
    if (
      Array.isArray(snapshot?.rightsStatuses) &&
      snapshot.rightsStatuses.includes("needs_legal_review")
    ) {
      errors.push("grounded Answer Packs cannot use unresolved rights status");
    }
    if (!provenanceKinds.has("deterministic_validation")) {
      errors.push("grounded Answer Packs require deterministic-validation provenance");
    }
    requireEveryClaimCovered("deterministic_validation", "deterministic-validation");
    for (const claimId of claimIdValues) {
      if (
        !stepsForKind("deterministic_validation").some(
          (step) =>
            Array.isArray(step.outputClaimIds) &&
            step.outputClaimIds.includes(claimId) &&
            Array.isArray(step.inputRefIds) &&
            step.inputRefIds.includes(snapshot?.snapshotId),
        )
      ) {
        errors.push(`grounded claim lacks snapshot-bound deterministic validation: ${String(claimId)}`);
      }
    }
  }
  if (pack.verificationStatus === "expert_unreviewed_ai_draft") {
    requireEveryClaimCovered("ai_generation", "AI-generation");
  }
  if (pack.verificationStatus === "verified_learning_reference") {
    if (!provenanceKinds.has("critic_consensus") || !provenanceKinds.has("release_gate")) {
      errors.push("verified learning references require critic-consensus and release-gate provenance");
    }
    const proof = pack.releaseProof;
    addClosedRecordErrors(
      errors,
      proof,
      [
        "s214PipelineVersion",
        "s214PipelineId",
        "s214Status",
        "s215ReleaseGateVersion",
        "s215GateId",
        "s215Status",
        "unresolvedBlockerCodes",
      ],
      "releaseProof",
    );
    if (proof?.s214PipelineVersion !== S233_REUSED_CONTRACT_VERSIONS.s214AnswerPipeline) {
      errors.push("releaseProof must pin the frozen S214 pipeline version");
    }
    addRequiredString(errors, proof?.s214PipelineId, "releaseProof.s214PipelineId");
    if (proof?.s214Status !== "ready_for_s215_consensus") {
      errors.push("releaseProof requires S214 ready_for_s215_consensus");
    }
    if (proof?.s215ReleaseGateVersion !== S233_REUSED_CONTRACT_VERSIONS.s215ReleaseGate) {
      errors.push("releaseProof must pin the frozen S215 release-gate version");
    }
    addRequiredString(errors, proof?.s215GateId, "releaseProof.s215GateId");
    if (proof?.s215Status !== "released") {
      errors.push("releaseProof requires S215 released status");
    }
    if (!Array.isArray(proof?.unresolvedBlockerCodes) || proof.unresolvedBlockerCodes.length !== 0) {
      errors.push("verified learning reference release proof cannot retain unresolved blockers");
    }
    requireEveryClaimCovered("critic_consensus", "critic-consensus");
    requireEveryClaimCovered("release_gate", "release-gate");
    const deterministicSteps = stepsForKind("deterministic_validation");
    const criticSteps = stepsForKind("critic_consensus");
    const releaseSteps = stepsForKind("release_gate");
    if (
      isRecord(proof) &&
      !releaseSteps.some(
        (step) =>
          Array.isArray(step.inputRefIds) &&
          step.inputRefIds.includes(proof.s214PipelineId) &&
          step.inputRefIds.includes(proof.s215GateId),
      )
    ) {
      errors.push("release-gate provenance must consume the frozen S214 pipeline and S215 gate IDs");
    }
    if (isRecord(proof)) {
      for (const claimId of claimIdValues) {
        const deterministicForClaim = deterministicSteps.filter(
          (step) => Array.isArray(step.outputClaimIds) && step.outputClaimIds.includes(claimId),
        );
        const criticForClaim = criticSteps.filter(
          (step) =>
            Array.isArray(step.outputClaimIds) &&
            step.outputClaimIds.includes(claimId) &&
            Array.isArray(step.inputRefIds) &&
            step.inputRefIds.includes(proof.s214PipelineId) &&
            deterministicForClaim.some((prior) =>
              step.inputRefIds.includes(prior.provenanceId),
            ),
        );
        const released = releaseSteps.some(
          (step) =>
            Array.isArray(step.outputClaimIds) &&
            step.outputClaimIds.includes(claimId) &&
            Array.isArray(step.inputRefIds) &&
            step.inputRefIds.includes(proof.s214PipelineId) &&
            step.inputRefIds.includes(proof.s215GateId) &&
            criticForClaim.some((prior) => step.inputRefIds.includes(prior.provenanceId)),
        );
        if (!released) {
          errors.push(`verified claim lacks linked deterministic/critic/release lineage: ${String(claimId)}`);
        }
      }
    }
  } else if (pack.releaseProof !== null) {
    errors.push("only verified_learning_reference may carry S214/S215 release proof");
  }
  addClosedRecordErrors(
    errors,
    pack.learnerContentPolicy,
    ["allowed", "included", "sourceIds"],
    "learnerContentPolicy",
  );
  if (
    pack.learnerContentPolicy?.allowed !== false ||
    pack.learnerContentPolicy?.included !== false ||
    !Array.isArray(pack.learnerContentPolicy?.sourceIds) ||
    pack.learnerContentPolicy.sourceIds.length !== 0
  ) {
    errors.push("learner content is forbidden in Answer Pack 2.0");
  }
  addClosedRecordErrors(
    errors,
    pack.expertReview,
    ["approved", "approvalEvidenceId"],
    "expertReview",
  );
  if (
    pack.expertReview?.approved !== false ||
    pack.expertReview?.approvalEvidenceId !== null
  ) {
    errors.push("S233 Answer Pack statuses do not claim expert approval");
  }
  addAuthorityErrors(errors, pack.authorityGuardrails, "authorityGuardrails");
  if (pack.containsRawContent !== false) errors.push("Answer Pack identity must be metadata-only");
  addRawBoundaryError(errors, pack);
  return validationResult(errors);
}

export function validateS233AnswerPackRegistryContext(
  packValue: unknown,
  contextValue: unknown,
): S233ValidationResult {
  const errors = [...validateS233AnswerPackIdentity(packValue).errors];
  if (!isRecord(packValue) || !isRecord(contextValue)) {
    if (!isRecord(contextValue)) errors.push("Answer Pack registry context must be an object");
    return validationResult(errors);
  }
  const pack = packValue as S233AnswerPackIdentity;
  const context = contextValue as S233AnswerPackRegistryContext;
  addClosedRecordErrors(
    errors,
    context,
    [
      "sourceRegistryVersion",
      "lawRegistryVersion",
      "rightsRegistryVersion",
      "sourceRecords",
      "lawVersionRecords",
      "rightsDecisionRecords",
      "s214PipelineRecords",
      "s215GateRecords",
    ],
    "answerPackRegistryContext",
  );
  addRequiredString(errors, context.sourceRegistryVersion, "context.sourceRegistryVersion");
  if (context.lawRegistryVersion !== null) {
    addRequiredString(errors, context.lawRegistryVersion, "context.lawRegistryVersion");
  }
  addRequiredString(errors, context.rightsRegistryVersion, "context.rightsRegistryVersion");
  if (context.sourceRegistryVersion !== pack.snapshot?.sourceRegistryVersion) {
    errors.push("source registry context version must match the Answer Pack snapshot");
  }
  if (context.lawRegistryVersion !== pack.snapshot?.lawRegistryVersion) {
    errors.push("law registry context version must match the Answer Pack snapshot");
  }
  if (context.rightsRegistryVersion !== pack.snapshot?.rightsRegistryVersion) {
    errors.push("rights registry context version must match the Answer Pack snapshot");
  }

  const records = <T extends Record<string, unknown>>(
    value: unknown,
    path: string,
    allowedKeys: readonly string[],
  ) => {
    if (!Array.isArray(value)) {
      errors.push(`${path} must be an array`);
      return [] as T[];
    }
    const result: T[] = [];
    for (const entry of value) {
      if (!isRecord(entry)) {
        errors.push(`${path} entries must be objects`);
        continue;
      }
      addClosedRecordErrors(errors, entry, allowedKeys, `${path}[]`);
      result.push(entry as T);
    }
    return result;
  };
  const sourceRecords = records<S233AnswerPackRegistryContext["sourceRecords"][number]>(
    context.sourceRecords,
    "context.sourceRecords",
    ["sourceId", "subject", "sourceAnchorIds", "lawVersionIds", "rightsDecisionIds"],
  );
  const lawRecords = records<S233AnswerPackRegistryContext["lawVersionRecords"][number]>(
    context.lawVersionRecords,
    "context.lawVersionRecords",
    ["lawVersionId", "status"],
  );
  const rightsRecords = records<S233AnswerPackRegistryContext["rightsDecisionRecords"][number]>(
    context.rightsDecisionRecords,
    "context.rightsDecisionRecords",
    ["rightsDecisionId", "sourceId", "status"],
  );
  const pipelineRecords = records<S233AnswerPackRegistryContext["s214PipelineRecords"][number]>(
    context.s214PipelineRecords,
    "context.s214PipelineRecords",
    ["pipelineId", "packId", "packVersion", "contentHashSha256", "subject", "status"],
  );
  const gateRecords = records<S233AnswerPackRegistryContext["s215GateRecords"][number]>(
    context.s215GateRecords,
    "context.s215GateRecords",
    [
      "gateId",
      "pipelineId",
      "packId",
      "packVersion",
      "contentHashSha256",
      "subject",
      "status",
      "unresolvedBlockerCodes",
    ],
  );

  for (const record of sourceRecords) {
    addRequiredString(errors, record.sourceId, "sourceRecords.sourceId");
    if (!["practice", "theory", "law"].includes(record.subject)) errors.push("source record subject is invalid");
    addStringArrayErrors(errors, record.sourceAnchorIds, "sourceRecords.sourceAnchorIds");
    addStringArrayErrors(errors, record.lawVersionIds, "sourceRecords.lawVersionIds");
    addStringArrayErrors(errors, record.rightsDecisionIds, "sourceRecords.rightsDecisionIds");
  }
  for (const record of lawRecords) {
    addRequiredString(errors, record.lawVersionId, "lawVersionRecords.lawVersionId");
    if (!LAW_VERSION_STATUSES.has(record.status)) errors.push("law-version record status is invalid");
  }
  for (const record of rightsRecords) {
    addRequiredString(errors, record.rightsDecisionId, "rightsDecisionRecords.rightsDecisionId");
    addRequiredString(errors, record.sourceId, "rightsDecisionRecords.sourceId");
    if (!RIGHTS_STATUSES.has(record.status)) errors.push("rights-decision record status is invalid");
  }
  for (const record of pipelineRecords) {
    for (const [path, token] of [
      ["pipelineId", record.pipelineId],
      ["packId", record.packId],
      ["packVersion", record.packVersion],
    ] as const) addRequiredString(errors, token, `s214PipelineRecords.${path}`);
    if (!isSha256Digest(record.contentHashSha256)) errors.push("S214 pipeline content hash is invalid");
    if (!["practice", "theory", "law"].includes(record.subject)) errors.push("S214 pipeline subject is invalid");
    if (!["ready_for_s215_consensus", "blocked"].includes(record.status)) errors.push("S214 pipeline status is invalid");
  }
  for (const record of gateRecords) {
    for (const [path, token] of [
      ["gateId", record.gateId],
      ["pipelineId", record.pipelineId],
      ["packId", record.packId],
      ["packVersion", record.packVersion],
    ] as const) addRequiredString(errors, token, `s215GateRecords.${path}`);
    if (!isSha256Digest(record.contentHashSha256)) errors.push("S215 gate content hash is invalid");
    if (!["practice", "theory", "law"].includes(record.subject)) errors.push("S215 gate subject is invalid");
    if (!["released", "blocked"].includes(record.status)) errors.push("S215 gate status is invalid");
    addStringArrayErrors(errors, record.unresolvedBlockerCodes, "s215GateRecords.unresolvedBlockerCodes");
  }
  for (const [label, ids] of [
    ["source", sourceRecords.map((record) => record.sourceId)],
    ["law version", lawRecords.map((record) => record.lawVersionId)],
    ["rights decision", rightsRecords.map((record) => record.rightsDecisionId)],
    ["S214 pipeline", pipelineRecords.map((record) => record.pipelineId)],
    ["S215 gate", gateRecords.map((record) => record.gateId)],
  ] as const) {
    if (new Set(ids).size !== ids.length) errors.push(`${label} context identities must be unique`);
  }

  const sourceById = new Map(sourceRecords.map((record) => [record.sourceId, record]));
  const snapshotSources = (Array.isArray(pack.snapshot?.sourceIds) ? pack.snapshot.sourceIds : [])
    .map((sourceId) => sourceById.get(sourceId))
    .filter((record): record is S233AnswerPackRegistryContext["sourceRecords"][number] => Boolean(record));
  if (snapshotSources.length !== (Array.isArray(pack.snapshot?.sourceIds) ? pack.snapshot.sourceIds.length : 0)) {
    errors.push("every snapshot source must resolve to a trusted source record");
  }
  if (snapshotSources.some((record) => record.subject !== pack.subject)) {
    errors.push("snapshot source subjects must match the Answer Pack subject");
  }
  const boundAnchors = new Set(snapshotSources.flatMap((record) => record.sourceAnchorIds));
  for (const anchor of Array.isArray(pack.claimSourceGraph?.sourceAnchorIds) ? pack.claimSourceGraph.sourceAnchorIds : []) {
    if (!boundAnchors.has(anchor)) errors.push(`claim anchor is not bound to a snapshot source: ${String(anchor)}`);
  }
  const boundLawIds = new Set(snapshotSources.flatMap((record) => record.lawVersionIds));
  const lawById = new Map(lawRecords.map((record) => [record.lawVersionId, record]));
  for (const lawVersionId of Array.isArray(pack.snapshot?.lawVersionIds) ? pack.snapshot.lawVersionIds : []) {
    const lawRecord = lawById.get(lawVersionId);
    if (!boundLawIds.has(lawVersionId) || !lawRecord || lawRecord.status !== pack.snapshot.lawVersionStatus) {
      errors.push(`law version is unbound or its trusted status differs: ${String(lawVersionId)}`);
    }
  }
  const rightsById = new Map(rightsRecords.map((record) => [record.rightsDecisionId, record]));
  const trustedRightsStatuses: S233RightsStatus[] = [];
  for (const rightsDecisionId of Array.isArray(pack.snapshot?.rightsDecisionIds) ? pack.snapshot.rightsDecisionIds : []) {
    const rightsRecord = rightsById.get(rightsDecisionId);
    const source = rightsRecord ? sourceById.get(rightsRecord.sourceId) : undefined;
    if (
      !rightsRecord ||
      !source ||
      !snapshotSources.includes(source) ||
      !Array.isArray(source.rightsDecisionIds) ||
      !source.rightsDecisionIds.includes(rightsDecisionId)
    ) {
      errors.push(`rights decision is not bound to a snapshot source: ${String(rightsDecisionId)}`);
    } else {
      trustedRightsStatuses.push(rightsRecord.status);
    }
  }
  if (!sameStringSet(pack.snapshot?.rightsStatuses, [...new Set(trustedRightsStatuses)])) {
    errors.push("snapshot rights statuses must equal trusted rights-decision statuses");
  }

  if (pack.releaseProof !== null && isRecord(pack.releaseProof)) {
    const pipeline = pipelineRecords.find(
      (record) => record.pipelineId === pack.releaseProof?.s214PipelineId,
    );
    if (
      !pipeline ||
      pipeline.packId !== pack.packId ||
      pipeline.packVersion !== pack.packVersion ||
      pipeline.contentHashSha256 !== pack.contentHashSha256 ||
      pipeline.subject !== pack.subject ||
      pipeline.status !== pack.releaseProof.s214Status
    ) {
      errors.push("S214 release proof does not match the trusted pack-bound pipeline result");
    }
    const gate = gateRecords.find((record) => record.gateId === pack.releaseProof?.s215GateId);
    if (
      !gate ||
      gate.pipelineId !== pack.releaseProof.s214PipelineId ||
      gate.packId !== pack.packId ||
      gate.packVersion !== pack.packVersion ||
      gate.contentHashSha256 !== pack.contentHashSha256 ||
      gate.subject !== pack.subject ||
      gate.status !== pack.releaseProof.s215Status ||
      !Array.isArray(gate.unresolvedBlockerCodes) ||
      gate.unresolvedBlockerCodes.length !== 0
    ) {
      errors.push("S215 release proof does not match the trusted pack-bound release result");
    }
  }
  return validationResult(errors);
}

export function validateS233LearnerAnswerReviewIdentity(value: unknown): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["learner review identity must be an object"]);
  const review = value as S233LearnerAnswerReviewIdentity;
  addClosedRecordErrors(
    errors,
    review,
    [
      "schemaVersion",
      "reviewId",
      "reviewRecordVersion",
      "expectedPreviousReviewRecordVersion",
      "ownerBinding",
      "learnerOwnerRefId",
      "subject",
      "attemptId",
      "attemptVersion",
      "inputVersionId",
      "versions",
      "revealHistory",
      "rewriteRegradeLineage",
      "idempotency",
      "stageStatus",
      "queueTodayLinkage",
      "authorityGuardrails",
      "dataBoundary",
    ],
    "review",
  );
  if (review.schemaVersion !== S233_LEARNER_REVIEW_SCHEMA_VERSION) {
    errors.push("schemaVersion must match the frozen learner-review identity schema");
  }
  addRequiredString(errors, review.reviewId, "reviewId");
  const reviewRecordVersionValid =
    Number.isInteger(review.reviewRecordVersion) &&
    typeof review.reviewRecordVersion === "number" &&
    review.reviewRecordVersion >= 1;
  if (!reviewRecordVersionValid) {
    errors.push("reviewRecordVersion must be a positive integer");
  } else if (review.reviewRecordVersion === 1) {
    if (review.expectedPreviousReviewRecordVersion !== null) {
      errors.push("the first review record version must not claim a previous revision");
    }
  } else if (review.expectedPreviousReviewRecordVersion !== review.reviewRecordVersion - 1) {
    errors.push("review record revision must compare-and-swap against its immediate predecessor");
  }
  if (review.ownerBinding !== "authenticated_request_user") {
    errors.push("review ownerBinding must be authenticated_request_user");
  }
  addRequiredString(errors, review.learnerOwnerRefId, "learnerOwnerRefId");
  if (!["practice", "theory", "law"].includes(review.subject)) errors.push("review subject is invalid");
  addRequiredString(errors, review.attemptId, "attemptId");
  const attemptVersionValid =
    Number.isInteger(review.attemptVersion) &&
    typeof review.attemptVersion === "number" &&
    review.attemptVersion >= 1;
  if (!attemptVersionValid) {
    errors.push("attemptVersion must be a positive integer");
  }
  addRequiredString(errors, review.inputVersionId, "inputVersionId");

  const versions = review.versions;
  addClosedRecordErrors(
    errors,
    versions,
    [
      "answerPackId",
      "answerPackVersion",
      "answerPackSchemaVersion",
      "ontologyVersion",
      "rubricVersion",
      "subjectEngineVersion",
      "sourceVersion",
      "primaryModelVersion",
      "primaryPromptVersion",
      "criticModelVersion",
      "criticPromptVersion",
      "cascadeVersion",
      "cascadeTraceId",
      "controllerEventVersion",
      "findingSchemaVersion",
      "rewriteRegradeVersion",
    ],
    "versions",
  );
  addRequiredString(errors, versions?.answerPackId, "versions.answerPackId");
  addRequiredString(errors, versions?.answerPackVersion, "versions.answerPackVersion");
  if (versions?.answerPackSchemaVersion !== S233_ANSWER_PACK_SCHEMA_VERSION) {
    errors.push("versions.answerPackSchemaVersion must be answer_pack.2.0");
  }
  if (versions?.ontologyVersion !== S233_SCORING_ONTOLOGY_VERSION) {
    errors.push("versions.ontologyVersion must match the frozen scoring ontology");
  }
  if (versions?.rubricVersion !== S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence) {
    errors.push("versions.rubricVersion must pin the S205 contract");
  }
  if (versions?.subjectEngineVersion !== expectedSubjectEngineVersion(review.subject)) {
    errors.push("versions.subjectEngineVersion must match the review subject");
  }
  addRequiredString(errors, versions?.sourceVersion, "versions.sourceVersion");
  addRequiredString(errors, versions?.primaryModelVersion, "versions.primaryModelVersion");
  addRequiredString(errors, versions?.primaryPromptVersion, "versions.primaryPromptVersion");
  addRequiredString(errors, versions?.criticModelVersion, "versions.criticModelVersion");
  addRequiredString(errors, versions?.criticPromptVersion, "versions.criticPromptVersion");
  if (versions?.cascadeVersion !== S233_AI_CASCADE_VERSION) {
    errors.push("versions.cascadeVersion must match the frozen AI-only cascade");
  }
  addRequiredString(errors, versions?.cascadeTraceId, "versions.cascadeTraceId");
  if (versions?.controllerEventVersion !== S233_CONTROLLER_EVENT_VERSION) {
    errors.push("versions.controllerEventVersion must match the frozen event schema");
  }
  if (versions?.findingSchemaVersion !== S233_SCORING_FINDING_SCHEMA_VERSION) {
    errors.push("versions.findingSchemaVersion must match the frozen finding schema");
  }
  if (versions?.rewriteRegradeVersion !== S233_REUSED_CONTRACT_VERSIONS.s206RewriteRegrade) {
    errors.push("versions.rewriteRegradeVersion must pin the S206 contract");
  }

  if (!Array.isArray(review.revealHistory) || review.revealHistory.length === 0) {
    errors.push("revealHistory must contain at least one explicit exposure event");
  } else {
    const revealEventIds = new Set<string>();
    let previousTime = -Infinity;
    for (const rawEvent of review.revealHistory) {
      if (!isRecord(rawEvent)) {
        errors.push("revealHistory entries must be objects");
        continue;
      }
      const event = rawEvent as S233LearnerAnswerReviewIdentity["revealHistory"][number];
      addClosedRecordErrors(
        errors,
        event,
        ["eventId", "occurredAt", "exposure", "answerLevel", "deliberateLearnerOverride"],
        "revealHistory[]",
      );
      addRequiredString(errors, event.eventId, "revealHistory.eventId");
      if (revealEventIds.has(event.eventId)) errors.push("reveal event IDs must be unique");
      revealEventIds.add(event.eventId);
      addIsoTimestampError(errors, event.occurredAt, "revealHistory.occurredAt");
      const currentTime = timestampMillis(event.occurredAt);
      if (Number.isFinite(currentTime) && currentTime < previousTime) {
        errors.push("revealHistory must be chronological");
      }
      if (Number.isFinite(currentTime)) previousTime = currentTime;
      if (!["none", "outline", "partial", "full"].includes(event.exposure)) {
        errors.push("revealHistory.exposure is invalid");
      }
      if (event.exposure === "none" && event.answerLevel !== null) {
        errors.push("a no-exposure event cannot name an answer level");
      }
      if (event.exposure !== "none" && !ANSWER_LEVELS.has(event.answerLevel ?? "")) {
        errors.push("an exposed answer event must name a frozen answer level");
      }
      if (typeof event.deliberateLearnerOverride !== "boolean") {
        errors.push("revealHistory.deliberateLearnerOverride must be boolean");
      }
    }
  }

  const lineage = review.rewriteRegradeLineage;
  addClosedRecordErrors(
    errors,
    lineage,
    [
      "historyId",
      "rootAnswerSubmissionId",
      "answerSubmissionId",
      "rootAttemptId",
      "parentAttemptId",
      "predecessorReviewId",
    ],
    "rewriteRegradeLineage",
  );
  addRequiredString(errors, lineage?.historyId, "rewriteRegradeLineage.historyId");
  addRequiredString(
    errors,
    lineage?.rootAnswerSubmissionId,
    "rewriteRegradeLineage.rootAnswerSubmissionId",
  );
  addRequiredString(errors, lineage?.answerSubmissionId, "rewriteRegradeLineage.answerSubmissionId");
  addRequiredString(errors, lineage?.rootAttemptId, "rewriteRegradeLineage.rootAttemptId");
  if (lineage?.answerSubmissionId !== lineage?.rootAnswerSubmissionId) {
    errors.push("S206 lineage requires answerSubmissionId to remain bound to the root submission");
  }
  if (attemptVersionValid && review.attemptVersion === 1) {
    if (lineage?.rootAttemptId !== review.attemptId) {
      errors.push("the first attempt must be the root attempt");
    }
    if (lineage?.parentAttemptId !== null || lineage?.predecessorReviewId !== null) {
      errors.push("the first attempt cannot have parent or predecessor review lineage");
    }
  }
  if (attemptVersionValid && review.attemptVersion > 1) {
    if (!isSafeMetadataToken(lineage?.parentAttemptId)) {
      errors.push("a later attempt requires a parent attempt ID");
    }
    if (!isSafeMetadataToken(lineage?.predecessorReviewId)) {
      errors.push("a later attempt requires a predecessor review ID");
    }
    if (lineage?.rootAttemptId === review.attemptId) {
      errors.push("a later attempt cannot replace the frozen root attempt identity");
    }
  }
  if (lineage?.parentAttemptId === review.attemptId) errors.push("an attempt cannot be its own parent");
  if (lineage?.predecessorReviewId === review.reviewId) errors.push("a review cannot be its own predecessor");

  addClosedRecordErrors(
    errors,
    review.idempotency,
    ["key", "inputFingerprint", "fingerprintScope", "fingerprintedRevealEventId", "status"],
    "idempotency",
  );
  addRequiredString(errors, review.idempotency?.key, "idempotency.key");
  if (!isSha256Digest(review.idempotency?.inputFingerprint)) {
    errors.push("idempotency.inputFingerprint must be a lowercase SHA-256 digest");
  }
  if (review.idempotency?.fingerprintScope !== S233_INPUT_FINGERPRINT_SCOPE) {
    errors.push("idempotency.fingerprintScope must match the frozen fingerprint scope");
  }
  addRequiredString(
    errors,
    review.idempotency?.fingerprintedRevealEventId,
    "idempotency.fingerprintedRevealEventId",
  );
  if (
    !Array.isArray(review.revealHistory) ||
    !review.revealHistory.some(
      (event) =>
        isRecord(event) &&
        event.eventId === review.idempotency?.fingerprintedRevealEventId,
    )
  ) {
    errors.push("fingerprinted reveal event must resolve in revealHistory");
  }
  if (
    isSafeMetadataToken(review.learnerOwnerRefId) &&
    (!isNonEmptyString(review.idempotency?.key) ||
      !review.idempotency.key.startsWith(`review:${review.learnerOwnerRefId}:`))
  ) {
    errors.push("idempotency.key must be namespaced by the learner owner reference");
  }
  if (!["claimed", "completed", "failed_retryable"].includes(review.idempotency?.status)) {
    errors.push("idempotency.status is invalid");
  }

  const stages = review.stageStatus;
  addClosedRecordErrors(
    errors,
    stages,
    [
      "overall",
      "deterministicChecks",
      "primaryGrader",
      "conditionalCritic",
      "persistence",
      "failureStage",
    ],
    "stageStatus",
  );
  if (![
    "pending",
    "partial",
    "completed",
    "abstained",
    "failed_retryable",
  ].includes(stages?.overall)) errors.push("stageStatus.overall is invalid");
  if (!["pending", "completed", "failed", "failed_retryable"].includes(stages?.deterministicChecks)) {
    errors.push("stageStatus.deterministicChecks is invalid");
  }
  if (!["pending", "completed", "abstained", "skipped", "failed_retryable"].includes(stages?.primaryGrader)) {
    errors.push("stageStatus.primaryGrader is invalid");
  }
  if (!["not_required", "pending", "completed", "abstained", "failed_retryable"].includes(stages?.conditionalCritic)) {
    errors.push("stageStatus.conditionalCritic is invalid");
  }
  if (!["pending", "completed", "failed_retryable"].includes(stages?.persistence)) {
    errors.push("stageStatus.persistence is invalid");
  }
  if (![null, "deterministic_checks", "primary_grader", "conditional_critic", "persistence"].includes(stages?.failureStage)) {
    errors.push("stageStatus.failureStage is invalid");
  }

  const stageTuple = [
    stages?.deterministicChecks,
    stages?.primaryGrader,
    stages?.conditionalCritic,
    stages?.persistence,
  ].map((stage) => (typeof stage === "string" ? stage : "invalid")).join("|");
  const pendingTuples = new Set([
    "pending|pending|pending|pending",
  ]);
  const partialTuples = new Set([
    "completed|pending|pending|pending",
    "completed|completed|pending|pending",
    "completed|completed|not_required|pending",
    "completed|completed|completed|pending",
  ]);
  const completedTuples = new Set([
    "completed|completed|not_required|completed",
    "completed|completed|completed|completed",
  ]);
  const abstainedTuples = new Set([
    "failed|skipped|not_required|completed",
    "completed|abstained|completed|completed",
    "completed|abstained|abstained|completed",
    "completed|completed|abstained|completed",
  ]);
  if (stages?.overall === "completed") {
    if (!completedTuples.has(stageTuple) || stages.failureStage !== null) {
      errors.push("a completed review must follow deterministic, primary, optional critic, persistence order");
    }
    if (review.idempotency?.status !== "completed") {
      errors.push("a completed review requires completed idempotency status");
    }
  }
  if (stages?.overall === "abstained") {
    if (!abstainedTuples.has(stageTuple)) {
      errors.push("an abstained review must stop at the first unresolved cascade stage, then persist");
    }
    if (review.idempotency?.status !== "completed") errors.push("terminal abstention must complete idempotency");
    if (stages.failureStage !== null) errors.push("abstention is not a retryable failure stage");
  }
  if (stages?.overall === "failed_retryable") {
    if (review.idempotency?.status !== "failed_retryable") {
      errors.push("failed_retryable stage status must match idempotency status");
    }
    const failureStatusByStage = {
      deterministic_checks: stages.deterministicChecks,
      primary_grader: stages.primaryGrader,
      conditional_critic: stages.conditionalCritic,
      persistence: stages.persistence,
    } as const;
    if (
      stages.failureStage === null ||
      failureStatusByStage[stages.failureStage] !== "failed_retryable"
    ) errors.push("failed_retryable review must identify the exact retryable failure stage");
    const allowedFailureTupleByStage = {
      deterministic_checks: new Set(["failed_retryable|pending|pending|pending"]),
      primary_grader: new Set(["completed|failed_retryable|pending|pending"]),
      conditional_critic: new Set(["completed|completed|failed_retryable|pending"]),
      persistence: new Set([
        "completed|completed|not_required|failed_retryable",
        "completed|completed|completed|failed_retryable",
        "completed|completed|abstained|failed_retryable",
      ]),
    } as const;
    const failureStage = stages.failureStage;
    if (
      failureStage !== null &&
      Object.prototype.hasOwnProperty.call(allowedFailureTupleByStage, failureStage) &&
      !allowedFailureTupleByStage[
        failureStage as keyof typeof allowedFailureTupleByStage
      ].has(stageTuple)
    ) {
      errors.push("retryable failure stages must preserve monotonic cascade order");
    }
  } else if (stages?.failureStage !== null) {
    errors.push("failureStage is allowed only for failed_retryable overall status");
  }
  if (stages?.overall === "pending") {
    if (review.idempotency?.status !== "claimed") {
      errors.push("pending review requires claimed idempotency status");
    }
    if (!pendingTuples.has(stageTuple)) {
      errors.push("pending review cannot advance a later stage before deterministic checks");
    }
  }
  if (stages?.overall === "partial") {
    if (review.idempotency?.status !== "claimed") {
      errors.push("partial review requires claimed idempotency status");
    }
    if (!partialTuples.has(stageTuple)) {
      errors.push("partial review stages must advance monotonically through the cascade");
    }
  }

  const linkage = review.queueTodayLinkage;
  addClosedRecordErrors(
    errors,
    linkage,
    ["status", "reviewQueueItemId", "todayPlanTaskId"],
    "queueTodayLinkage",
  );
  if (linkage?.reviewQueueItemId !== undefined && linkage.reviewQueueItemId !== null) {
    addRequiredString(errors, linkage.reviewQueueItemId, "queueTodayLinkage.reviewQueueItemId");
  }
  if (linkage?.todayPlanTaskId !== undefined && linkage.todayPlanTaskId !== null) {
    addRequiredString(errors, linkage.todayPlanTaskId, "queueTodayLinkage.todayPlanTaskId");
  }
  const hasQueue = isSafeMetadataToken(linkage?.reviewQueueItemId);
  const hasToday = isSafeMetadataToken(linkage?.todayPlanTaskId);
  const expectedLinkage = hasQueue ? (hasToday ? "queue_and_today_linked" : "queue_linked") : hasToday ? "today_linked" : "not_linked";
  if (linkage?.status !== expectedLinkage) errors.push("queueTodayLinkage.status must match its Queue and Today IDs");

  addAuthorityErrors(errors, review.authorityGuardrails, "authorityGuardrails");
  addClosedRecordErrors(
    errors,
    review.dataBoundary,
    [
      "learnerMaterialInIdentity",
      "learnerMaterialInTelemetry",
      "globalReferenceWrite",
      "modelTrainingUse",
      "metadataOnly",
      "containsRawContent",
    ],
    "dataBoundary",
  );
  if (
    review.dataBoundary?.learnerMaterialInIdentity !== false ||
    review.dataBoundary?.learnerMaterialInTelemetry !== false ||
    review.dataBoundary?.globalReferenceWrite !== false ||
    review.dataBoundary?.modelTrainingUse !== false ||
    review.dataBoundary?.metadataOnly !== true ||
    review.dataBoundary?.containsRawContent !== false
  ) errors.push("learner review identity must preserve the private metadata-only boundary");
  addRawBoundaryError(errors, review);
  return validationResult(errors);
}

export function validateS233LearnerReviewRequestContext(
  reviewValue: unknown,
  contextValue: unknown,
): S233ValidationResult {
  const errors = [...validateS233LearnerAnswerReviewIdentity(reviewValue).errors];
  if (!isRecord(reviewValue) || !isRecord(contextValue)) {
    if (!isRecord(contextValue)) errors.push("learner review request context must be an object");
    return validationResult(errors);
  }
  const review = reviewValue as S233LearnerAnswerReviewIdentity;
  const context = contextValue as S233LearnerReviewRequestContext;
  addClosedRecordErrors(
    errors,
    context,
    ["authenticatedLearnerOwnerRefId", "requestIdempotencyKey", "computedInputFingerprintSha256"],
    "requestContext",
  );
  addRequiredString(errors, context.authenticatedLearnerOwnerRefId, "requestContext.authenticatedLearnerOwnerRefId");
  addRequiredString(errors, context.requestIdempotencyKey, "requestContext.requestIdempotencyKey");
  if (!isSha256Digest(context.computedInputFingerprintSha256)) {
    errors.push("requestContext.computedInputFingerprintSha256 must be a lowercase SHA-256 digest");
  }
  if (review.learnerOwnerRefId !== context.authenticatedLearnerOwnerRefId) {
    errors.push("learner review owner does not match the authenticated request owner");
  }
  if (review.idempotency?.key !== context.requestIdempotencyKey) {
    errors.push("learner review idempotency key does not match the request");
  }
  if (review.idempotency?.inputFingerprint !== context.computedInputFingerprintSha256) {
    errors.push("learner review input fingerprint does not match computed request input");
  }
  return validationResult(errors);
}

export function validateS233LearnerReviewTransition(
  previousValue: unknown,
  nextValue: unknown,
): S233ValidationResult {
  const errors = [...validateS233LearnerAnswerReviewIdentity(nextValue).errors];
  if (previousValue !== null) {
    errors.push(...validateS233LearnerAnswerReviewIdentity(previousValue).errors);
  }
  if (errors.length > 0 || !isRecord(nextValue)) return validationResult(errors);
  const next = nextValue as S233LearnerAnswerReviewIdentity;
  if (previousValue === null) {
    if (next.reviewRecordVersion !== 1 || next.expectedPreviousReviewRecordVersion !== null) {
      errors.push("new learner review persistence must create record revision 1");
    }
    return validationResult(errors);
  }
  if (!isRecord(previousValue)) return validationResult(errors);
  const previous = previousValue as S233LearnerAnswerReviewIdentity;
  if (
    next.reviewRecordVersion !== previous.reviewRecordVersion + 1 ||
    next.expectedPreviousReviewRecordVersion !== previous.reviewRecordVersion
  ) {
    errors.push("learner review persistence must use monotonic compare-and-swap revision lineage");
  }
  for (const [left, right, label] of [
    [next.reviewId, previous.reviewId, "review ID"],
    [next.learnerOwnerRefId, previous.learnerOwnerRefId, "learner owner"],
    [next.attemptId, previous.attemptId, "attempt ID"],
    [next.attemptVersion, previous.attemptVersion, "attempt version"],
    [next.inputVersionId, previous.inputVersionId, "input version"],
    [next.idempotency.key, previous.idempotency.key, "idempotency key"],
    [next.idempotency.inputFingerprint, previous.idempotency.inputFingerprint, "input fingerprint"],
    [next.idempotency.fingerprintScope, previous.idempotency.fingerprintScope, "fingerprint scope"],
    [
      next.idempotency.fingerprintedRevealEventId,
      previous.idempotency.fingerprintedRevealEventId,
      "fingerprinted reveal event",
    ],
  ] as const) {
    if (left !== right) errors.push(`review revision cannot change ${label}`);
  }
  if (JSON.stringify(next.versions) !== JSON.stringify(previous.versions)) {
    errors.push("review revision cannot change frozen evaluator/source versions");
  }
  if (
    JSON.stringify(next.rewriteRegradeLineage) !==
    JSON.stringify(previous.rewriteRegradeLineage)
  ) {
    errors.push("review revision cannot change S206 attempt lineage");
  }
  const previousReveal = previous.revealHistory;
  const nextRevealPrefix = next.revealHistory.slice(0, previousReveal.length);
  if (JSON.stringify(previousReveal) !== JSON.stringify(nextRevealPrefix)) {
    errors.push("review revision may append but cannot rewrite reveal/exposure history");
  }
  const allowedOverallTransitions: Record<
    S233LearnerAnswerReviewIdentity["stageStatus"]["overall"],
    readonly S233LearnerAnswerReviewIdentity["stageStatus"]["overall"][]
  > = {
    pending: ["pending", "partial", "abstained", "failed_retryable"],
    partial: ["partial", "completed", "abstained", "failed_retryable"],
    failed_retryable: ["partial", "completed", "abstained", "failed_retryable"],
    completed: [],
    abstained: [],
  };
  if (!allowedOverallTransitions[previous.stageStatus.overall].includes(next.stageStatus.overall)) {
    errors.push("learner review stage cannot regress or mutate after terminal persistence");
  }
  const allowedStageAdvances = new Set([
    "deterministicChecks:pending>completed",
    "deterministicChecks:pending>failed",
    "deterministicChecks:pending>failed_retryable",
    "deterministicChecks:failed_retryable>completed",
    "deterministicChecks:failed_retryable>failed",
    "primaryGrader:pending>completed",
    "primaryGrader:pending>abstained",
    "primaryGrader:pending>skipped",
    "primaryGrader:pending>failed_retryable",
    "primaryGrader:failed_retryable>completed",
    "primaryGrader:failed_retryable>abstained",
    "conditionalCritic:pending>not_required",
    "conditionalCritic:pending>completed",
    "conditionalCritic:pending>abstained",
    "conditionalCritic:pending>failed_retryable",
    "conditionalCritic:failed_retryable>completed",
    "conditionalCritic:failed_retryable>abstained",
    "persistence:pending>completed",
    "persistence:pending>failed_retryable",
    "persistence:failed_retryable>completed",
  ]);
  for (const stage of [
    "deterministicChecks",
    "primaryGrader",
    "conditionalCritic",
    "persistence",
  ] as const) {
    const previousStatus = previous.stageStatus[stage];
    const nextStatus = next.stageStatus[stage];
    if (
      previousStatus !== nextStatus &&
      !allowedStageAdvances.has(`${stage}:${previousStatus}>${nextStatus}`)
    ) {
      errors.push(`learner review ${stage} cannot regress or overwrite a completed stage`);
    }
  }
  return validationResult(errors);
}

const LATER_EVIDENCE_KIND_BY_STATE: Record<
  (typeof S233_LATER_EVIDENCE_STATES)[number],
  S233EvidenceStateRecord["evidenceKind"]
> = {
  retained: "delayed_unassisted_retrieval",
  near_transferred: "near_variant_transfer",
  far_transferred: "far_variant_transfer",
  timed_stable: "timed_unassisted_practice",
};

function validateS233EvidenceStateRecordStructure(
  value: unknown,
  proofBundlePresent: boolean,
): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["evidence state must be an object"]);
  const record = value as S233EvidenceStateRecord;
  addClosedRecordErrors(
    errors,
    record,
    [
      "schemaVersion",
      "evidenceStateId",
      "learnerOwnerRefId",
      "learnerReviewId",
      "conceptNodeId",
      "state",
      "emitter",
      "initialDetectionEventId",
      "evidenceEventId",
      "predecessorEvidenceStateId",
      "evidenceKind",
      "outcome",
      "proofRefIds",
      "assistanceLevel",
      "answerExposure",
      "variantFamilyId",
      "variantDistance",
      "elapsedTimeMs",
      "observedAt",
      "actualLaterEvidenceObserved",
      "containsRawContent",
    ],
    "evidenceState",
  );
  if (record.schemaVersion !== S233_EVIDENCE_STATE_SCHEMA_VERSION) {
    errors.push("schemaVersion must match the frozen evidence-state schema");
  }
  for (const [path, token] of [
    ["evidenceStateId", record.evidenceStateId],
    ["learnerOwnerRefId", record.learnerOwnerRefId],
    ["learnerReviewId", record.learnerReviewId],
    ["conceptNodeId", record.conceptNodeId],
    ["initialDetectionEventId", record.initialDetectionEventId],
    ["evidenceEventId", record.evidenceEventId],
  ] as const) addRequiredString(errors, token, path);
  addStringArrayErrors(errors, record.proofRefIds, "proofRefIds", { minimum: 1 });
  if (!EVIDENCE_STATES.has(record.state)) errors.push("evidence state is invalid");
  if (!["correct", "partially_correct", "incorrect", "abstained"].includes(record.outcome)) {
    errors.push("evidence outcome is invalid");
  }
  addIsoTimestampError(errors, record.observedAt, "observedAt");
  if (record.predecessorEvidenceStateId !== null) {
    addRequiredString(errors, record.predecessorEvidenceStateId, "predecessorEvidenceStateId");
  }
  if (record.predecessorEvidenceStateId === record.evidenceStateId) {
    errors.push("an evidence state cannot be its own predecessor");
  }
  if (!["none", "navigation_only", "hint", "worked_step", "full_answer"].includes(record.assistanceLevel)) {
    errors.push("evidence assistanceLevel is invalid");
  }
  if (!["none", "outline", "partial", "full"].includes(record.answerExposure)) {
    errors.push("evidence answerExposure is invalid");
  }
  if (record.elapsedTimeMs !== null && (!Number.isFinite(record.elapsedTimeMs) || record.elapsedTimeMs < 0)) {
    errors.push("evidence elapsedTimeMs must be null or a non-negative number");
  }
  if (record.variantDistance !== null) {
    if (!["same", "near", "far"].includes(record.variantDistance)) errors.push("evidence variantDistance is invalid");
    addRequiredString(errors, record.variantFamilyId, "variantFamilyId");
  } else if (record.variantFamilyId !== null) {
    errors.push("evidence variantFamilyId requires variantDistance");
  }

  if (record.emitter === "lane_a") {
    if (!LANE_A_STATES.has(record.state)) errors.push("Lane A may emit only detected, corrected, or uncertain");
    if (record.actualLaterEvidenceObserved !== false) errors.push("Lane A must not claim later evidence");
    const expectedKind = {
      detected: "initial_evaluation",
      corrected: "verified_correction",
      uncertain: "unresolved_evaluation",
    }[record.state as S233LaneAEmittableEvidenceState];
    if (expectedKind && record.evidenceKind !== expectedKind) {
      errors.push("Lane A evidence kind must match the emitted early state");
    }
  } else if (record.emitter === "later_evidence") {
    if (LANE_A_STATES.has(record.state)) errors.push("later-evidence emitter is reserved for later states");
    if (record.actualLaterEvidenceObserved !== true) errors.push("later states require an actual later observation");
    const expectedKind = LATER_EVIDENCE_KIND_BY_STATE[
      record.state as keyof typeof LATER_EVIDENCE_KIND_BY_STATE
    ];
    if (expectedKind && record.evidenceKind !== expectedKind) {
      errors.push("later evidence kind must match the evidence state");
    }
  } else {
    errors.push("evidence emitter is invalid");
  }

  if (record.state === "detected" || record.state === "uncertain") {
    if (record.predecessorEvidenceStateId !== null) errors.push("initial detected/uncertain states cannot claim predecessor evidence");
    if (record.evidenceEventId !== record.initialDetectionEventId) errors.push("initial evidence must bind to its detection event");
  }
  if (record.state === "detected" && !["partially_correct", "incorrect"].includes(record.outcome)) {
    errors.push("detected requires an observed partial or incorrect outcome");
  }
  if (record.state === "uncertain" && record.outcome !== "abstained") {
    errors.push("uncertain requires an abstained outcome");
  }
  if (record.state === "corrected" || !LANE_A_STATES.has(record.state)) {
    if (!proofBundlePresent) {
      errors.push("corrected and later states require validateS233EvidenceProofBundle");
    }
    if (record.outcome !== "correct") errors.push("corrected and later states require a correct observed outcome");
    if (!isSafeMetadataToken(record.predecessorEvidenceStateId)) {
      errors.push("corrected and later states require predecessor evidence lineage");
    }
    if (record.evidenceEventId === record.initialDetectionEventId) {
      errors.push("corrected and later evidence requires a distinct evidence event");
    }
  }
  if (["retained", "near_transferred", "far_transferred", "timed_stable"].includes(record.state)) {
    if (record.assistanceLevel !== "none" || record.answerExposure !== "none") {
      errors.push("later evidence requires unassisted, pre-exposure performance");
    }
  }
  if (record.state === "near_transferred" || record.state === "far_transferred") {
    const expectedDistance = record.state === "near_transferred" ? "near" : "far";
    if (record.variantDistance !== expectedDistance) errors.push(`${record.state} requires variantDistance ${expectedDistance}`);
  }
  if (record.state === "timed_stable" && (!Number.isFinite(record.elapsedTimeMs) || (record.elapsedTimeMs ?? 0) <= 0)) {
    errors.push("timed_stable requires a positive elapsed time");
  }
  if (record.containsRawContent !== false) errors.push("evidence state must be metadata-only");
  addRawBoundaryError(errors, record);
  return validationResult(errors);
}

export function validateS233EvidenceStateRecord(value: unknown): S233ValidationResult {
  return validateS233EvidenceStateRecordStructure(value, false);
}

export function validateS233FutureControllerEvent(value: unknown): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["future-controller event must be an object"]);
  const event = value as S233FutureControllerEvent;
  addClosedRecordErrors(
    errors,
    event,
    [
      "eventVersion",
      "eventId",
      "idempotencyKey",
      "learnerOwnerRefId",
      "learnerReviewId",
      "conceptNodeId",
      "occurredAt",
      "elapsedTimeMs",
      "confidence",
      "assistanceLevel",
      "answerExposure",
      "inputModality",
      "variantFamilyId",
      "variantDistance",
      "sessionPosition",
      "sourceUncertaintyCodes",
      "evaluatorUncertaintyCodes",
      "outcome",
      "outcomeProofRefIds",
      "predecessorEventId",
      "successorEventId",
      "metadataOnly",
      "containsRawContent",
    ],
    "controllerEvent",
  );
  if (event.eventVersion !== S233_CONTROLLER_EVENT_VERSION) errors.push("eventVersion must match the frozen future-controller event");
  for (const [path, token] of [
    ["eventId", event.eventId],
    ["idempotencyKey", event.idempotencyKey],
    ["learnerOwnerRefId", event.learnerOwnerRefId],
    ["learnerReviewId", event.learnerReviewId],
    ["conceptNodeId", event.conceptNodeId],
  ] as const) addRequiredString(errors, token, path);
  if (
    isSafeMetadataToken(event.learnerOwnerRefId) &&
    (!isNonEmptyString(event.idempotencyKey) ||
      !event.idempotencyKey.startsWith(`controller:${event.learnerOwnerRefId}:`))
  ) {
    errors.push("controller idempotencyKey must be namespaced by learner owner reference");
  }
  addIsoTimestampError(errors, event.occurredAt, "occurredAt");
  if (!Number.isFinite(event.elapsedTimeMs) || event.elapsedTimeMs < 0) errors.push("elapsedTimeMs must be a non-negative number");
  if (![...CONFIDENCE_LEVELS, "unknown"].includes(event.confidence)) errors.push("confidence is invalid");
  if (!["none", "navigation_only", "hint", "worked_step", "full_answer"].includes(event.assistanceLevel)) errors.push("assistanceLevel is invalid");
  if (!["none", "outline", "partial", "full"].includes(event.answerExposure)) errors.push("answerExposure is invalid");
  if (!["typed", "handwritten_ocr", "file_upload", "calculator", "manual_metadata"].includes(event.inputModality)) errors.push("inputModality is invalid");
  if (!["correct", "partially_correct", "incorrect", "abstained"].includes(event.outcome)) errors.push("controller outcome is invalid");
  addStringArrayErrors(errors, event.outcomeProofRefIds, "outcomeProofRefIds", { minimum: 1 });
  if (!Number.isInteger(event.sessionPosition) || event.sessionPosition < 0) errors.push("sessionPosition must be a non-negative integer");
  if (event.variantDistance !== null) {
    if (!["same", "near", "far"].includes(event.variantDistance)) errors.push("variantDistance is invalid");
    addRequiredString(errors, event.variantFamilyId, "variantFamilyId");
  } else if (event.variantFamilyId !== null) errors.push("variantFamilyId requires variantDistance");
  addStringArrayErrors(errors, event.sourceUncertaintyCodes, "sourceUncertaintyCodes");
  addStringArrayErrors(errors, event.evaluatorUncertaintyCodes, "evaluatorUncertaintyCodes");
  for (const [path, token] of [
    ["predecessorEventId", event.predecessorEventId],
    ["successorEventId", event.successorEventId],
  ] as const) if (token !== null) addRequiredString(errors, token, path);
  if (event.predecessorEventId === event.eventId || event.successorEventId === event.eventId) errors.push("controller event lineage cannot point to itself");
  if (event.predecessorEventId !== null && event.predecessorEventId === event.successorEventId) errors.push("predecessor and successor event IDs must differ");
  if (event.metadataOnly !== true || event.containsRawContent !== false) errors.push("future-controller events must be metadata-only");
  addRawBoundaryError(errors, event);
  return validationResult(errors);
}

export function validateS233EvidenceProofBundle(value: unknown): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["evidence proof bundle must be an object"]);
  const bundle = value as S233EvidenceProofBundle;
  addClosedRecordErrors(
    errors,
    bundle,
    [
      "record",
      "predecessor",
      "controllerEvent",
      "controllerEventPersistenceReceiptId",
      "predecessorStatePersistenceReceiptId",
      "authenticatedLearnerOwnerRefId",
      "trustedOutcomeProofRecords",
    ],
    "evidenceProofBundle",
  );
  errors.push(...validateS233EvidenceStateRecordStructure(bundle.record, true).errors);
  errors.push(...validateS233FutureControllerEvent(bundle.controllerEvent).errors);
  addRequiredString(errors, bundle.authenticatedLearnerOwnerRefId, "authenticatedLearnerOwnerRefId");
  addRequiredString(
    errors,
    bundle.controllerEventPersistenceReceiptId,
    "controllerEventPersistenceReceiptId",
  );
  if (bundle.predecessorStatePersistenceReceiptId !== null) {
    addRequiredString(
      errors,
      bundle.predecessorStatePersistenceReceiptId,
      "predecessorStatePersistenceReceiptId",
    );
  }
  const proofRecords: S233EvidenceProofBundle["trustedOutcomeProofRecords"] = [];
  if (!Array.isArray(bundle.trustedOutcomeProofRecords)) {
    errors.push("trustedOutcomeProofRecords must be an array");
  } else {
    for (const rawProof of bundle.trustedOutcomeProofRecords) {
      if (!isRecord(rawProof)) {
        errors.push("trustedOutcomeProofRecords entries must be objects");
        continue;
      }
      const proof = rawProof as S233EvidenceProofBundle["trustedOutcomeProofRecords"][number];
      addClosedRecordErrors(
        errors,
        proof,
        [
          "proofRefId",
          "kind",
          "learnerOwnerRefId",
          "learnerReviewId",
          "conceptNodeId",
          "controllerEventId",
          "outcome",
          "variantTaskId",
          "variantFamilyId",
          "variantDistance",
          "observedAt",
          "persistenceReceiptId",
          "immutable",
          "containsRawContent",
        ],
        "trustedOutcomeProofRecords[]",
      );
      for (const [path, token] of [
        ["proofRefId", proof.proofRefId],
        ["learnerOwnerRefId", proof.learnerOwnerRefId],
        ["learnerReviewId", proof.learnerReviewId],
        ["conceptNodeId", proof.conceptNodeId],
        ["controllerEventId", proof.controllerEventId],
        ["variantTaskId", proof.variantTaskId],
        ["persistenceReceiptId", proof.persistenceReceiptId],
      ] as const) addRequiredString(errors, token, `trustedOutcomeProofRecords.${path}`);
      if (!["scoring_finding", "rewrite_verification", "retrieval_result", "transfer_result", "timed_practice_result"].includes(proof.kind)) errors.push("trusted outcome-proof kind is invalid");
      if (!["correct", "partially_correct", "incorrect", "abstained"].includes(proof.outcome)) errors.push("trusted outcome-proof outcome is invalid");
      if (proof.variantFamilyId !== null) addRequiredString(errors, proof.variantFamilyId, "trustedOutcomeProofRecords.variantFamilyId");
      if (proof.variantDistance !== null && !["same", "near", "far"].includes(proof.variantDistance)) errors.push("trusted outcome-proof variant distance is invalid");
      if ((proof.variantFamilyId === null) !== (proof.variantDistance === null)) errors.push("trusted outcome-proof variant family/distance must be present together");
      addIsoTimestampError(errors, proof.observedAt, "trustedOutcomeProofRecords.observedAt");
      if (proof.immutable !== true || proof.containsRawContent !== false) errors.push("trusted outcome proof must be immutable metadata");
      addRawBoundaryError(errors, proof);
      proofRecords.push(proof);
    }
  }
  if (new Set(proofRecords.map((proof) => proof.proofRefId)).size !== proofRecords.length) {
    errors.push("trusted outcome-proof IDs must be unique");
  }
  if (!isRecord(bundle.record) || !isRecord(bundle.controllerEvent)) return validationResult(errors);
  const record = bundle.record as S233EvidenceStateRecord;
  const event = bundle.controllerEvent as S233FutureControllerEvent;
  if (record.learnerOwnerRefId !== bundle.authenticatedLearnerOwnerRefId) errors.push("evidence owner must match authenticated learner owner");
  for (const [recordValue, eventValue, label] of [
    [record.learnerOwnerRefId, event.learnerOwnerRefId, "learner owner"],
    [record.learnerReviewId, event.learnerReviewId, "learner review"],
    [record.conceptNodeId, event.conceptNodeId, "concept node"],
    [record.evidenceEventId, event.eventId, "evidence event"],
    [record.observedAt, event.occurredAt, "observation timestamp"],
    [record.assistanceLevel, event.assistanceLevel, "assistance level"],
    [record.answerExposure, event.answerExposure, "answer exposure"],
    [record.variantFamilyId, event.variantFamilyId, "variant family"],
    [record.variantDistance, event.variantDistance, "variant distance"],
    [record.outcome, event.outcome, "outcome"],
  ] as const) if (recordValue !== eventValue) errors.push(`evidence ${label} must match its controller event`);
  if (record.elapsedTimeMs !== null && record.elapsedTimeMs !== event.elapsedTimeMs) errors.push("evidence elapsed time must match its controller event");
  const proofRefs = new Set(Array.isArray(record.proofRefIds) ? record.proofRefIds : []);
  if (!proofRefs.has(event.eventId)) errors.push("evidence proofRefIds must include its controller event ID");
  for (const proofRef of Array.isArray(event.outcomeProofRefIds) ? event.outcomeProofRefIds : []) {
    if (!proofRefs.has(proofRef)) errors.push(`evidence proofRefIds omit outcome proof: ${String(proofRef)}`);
  }
  if (
    !sameStringSet(record.proofRefIds, [
      event.eventId,
      ...(Array.isArray(event.outcomeProofRefIds) ? event.outcomeProofRefIds : []),
    ])
  ) {
    errors.push("evidence proofRefIds must equal its controller event and trusted outcome proofs");
  }
  const expectedProofKindByState: Record<S233EvidenceState, S233EvidenceProofBundle["trustedOutcomeProofRecords"][number]["kind"]> = {
    detected: "scoring_finding",
    uncertain: "scoring_finding",
    corrected: "rewrite_verification",
    retained: "retrieval_result",
    near_transferred: "transfer_result",
    far_transferred: "transfer_result",
    timed_stable: "timed_practice_result",
  };
  const currentProofRecords = proofRecords.filter(
    (proof) => proof.controllerEventId === event.eventId,
  );
  if (!sameStringSet(event.outcomeProofRefIds, currentProofRecords.map((proof) => proof.proofRefId))) {
    errors.push("controller outcome proof IDs must exactly resolve to trusted proof records");
  }
  if (
    !currentProofRecords.some(
      (proof) => proof.kind === expectedProofKindByState[record.state],
    )
  ) errors.push("evidence state requires a trusted outcome proof of the matching kind");
  for (const proof of currentProofRecords) {
    if (proof.persistenceReceiptId !== bundle.controllerEventPersistenceReceiptId) {
      errors.push("current trusted outcome proof must resolve through the controller-event persistence receipt");
    }
    for (const [left, right, label] of [
      [proof.learnerOwnerRefId, record.learnerOwnerRefId, "learner owner"],
      [proof.learnerReviewId, record.learnerReviewId, "learner review"],
      [proof.conceptNodeId, record.conceptNodeId, "concept node"],
      [proof.outcome, record.outcome, "outcome"],
      [proof.variantFamilyId, record.variantFamilyId, "variant family"],
      [proof.variantDistance, record.variantDistance, "variant distance"],
      [proof.observedAt, record.observedAt, "observed timestamp"],
    ] as const) if (left !== right) errors.push(`trusted outcome proof must match evidence ${label}`);
  }

  const requiresPredecessor = record.state === "corrected" || !LANE_A_STATES.has(record.state);
  if (requiresPredecessor) {
    if (!isRecord(bundle.predecessor)) {
      errors.push("corrected and later evidence requires the actual predecessor record");
    } else {
      if (!isSafeMetadataToken(bundle.predecessorStatePersistenceReceiptId)) {
        errors.push("predecessor evidence must resolve through a persistence receipt");
      }
      errors.push(...validateS233EvidenceStateRecordStructure(bundle.predecessor, true).errors);
      const predecessor = bundle.predecessor as S233EvidenceStateRecord;
      if (record.predecessorEvidenceStateId !== predecessor.evidenceStateId) errors.push("predecessor record does not match predecessorEvidenceStateId");
      for (const [left, right, label] of [
        [record.learnerOwnerRefId, predecessor.learnerOwnerRefId, "learner owner"],
        [record.learnerReviewId, predecessor.learnerReviewId, "learner review"],
        [record.conceptNodeId, predecessor.conceptNodeId, "concept node"],
        [record.initialDetectionEventId, predecessor.initialDetectionEventId, "initial detection event"],
      ] as const) if (left !== right) errors.push(`evidence transition must preserve ${label}`);
      if (timestampMillis(record.observedAt) <= timestampMillis(predecessor.observedAt)) errors.push("evidence observation must occur after predecessor evidence");
      if (event.predecessorEventId !== predecessor.evidenceEventId) errors.push("controller predecessorEventId must bind to predecessor evidence event");
      if (bundle.controllerEventPersistenceReceiptId === bundle.predecessorStatePersistenceReceiptId) {
        errors.push("current and predecessor persistence receipts must be distinct");
      }
      const allowedPredecessorStates: Record<string, readonly S233EvidenceState[]> = {
        corrected: ["detected", "uncertain"],
        retained: ["corrected"],
        near_transferred: ["corrected", "retained"],
        far_transferred: ["corrected", "retained", "near_transferred"],
        timed_stable: ["corrected", "retained", "near_transferred", "far_transferred"],
      };
      if (!(allowedPredecessorStates[record.state] ?? []).includes(predecessor.state)) errors.push("evidence transition is not allowed by the frozen progression");
      const predecessorProofIds = new Set(
        Array.isArray(predecessor.proofRefIds) ? predecessor.proofRefIds : [],
      );
      const predecessorProofs = proofRecords.filter(
        (proof) =>
          proof.controllerEventId === predecessor.evidenceEventId &&
          predecessorProofIds.has(proof.proofRefId),
      );
      if (
        !sameStringSet(predecessor.proofRefIds, [
          predecessor.evidenceEventId,
          ...predecessorProofs.map((proof) => proof.proofRefId),
        ])
      ) {
        errors.push("predecessor proofRefIds must equal its persisted event and trusted outcome proofs");
      }
      if (
        !predecessorProofs.some(
          (proof) => proof.kind === expectedProofKindByState[predecessor.state],
        )
      ) errors.push("predecessor evidence outcome must resolve to its trusted proof record");
      for (const proof of predecessorProofs) {
        if (
          proof.persistenceReceiptId !== bundle.predecessorStatePersistenceReceiptId ||
          proof.learnerOwnerRefId !== predecessor.learnerOwnerRefId ||
          proof.learnerReviewId !== predecessor.learnerReviewId ||
          proof.conceptNodeId !== predecessor.conceptNodeId ||
          proof.outcome !== predecessor.outcome ||
          proof.observedAt !== predecessor.observedAt
        ) errors.push("predecessor trusted proof does not match persisted predecessor evidence");
      }
      if (
        (record.state === "near_transferred" || record.state === "far_transferred") &&
        currentProofRecords.some((currentProof) =>
          predecessorProofs.some(
            (predecessorProof) =>
              currentProof.variantTaskId === predecessorProof.variantTaskId,
          ),
        )
      ) {
        errors.push("transfer evidence must come from a distinct variant task");
      }
    }
  } else if (bundle.predecessor !== null) {
    errors.push("initial detected/uncertain evidence must not supply a predecessor record");
  } else if (bundle.predecessorStatePersistenceReceiptId !== null) {
    errors.push("initial evidence must not claim a predecessor persistence receipt");
  }
  return validationResult(errors);
}

export function validateS233LaneAEvidenceProofBundle(value: unknown): S233ValidationResult {
  const errors = [...validateS233EvidenceProofBundle(value).errors];
  if (!isRecord(value) || !isRecord(value.record)) return validationResult(errors);
  if (
    value.record.emitter !== "lane_a" ||
    !LANE_A_STATES.has(value.record.state as S233EvidenceState)
  ) {
    errors.push("Lane A proof boundary may emit only detected, corrected, or uncertain");
  }
  return validationResult(errors);
}

function sameStringSet(left: unknown, right: unknown) {
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return leftSet.size === rightSet.size && [...leftSet].every((entry) => rightSet.has(entry));
}

function sameValidatedValue(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => sameValidatedValue(entry, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && sameValidatedValue(left[key], right[key]),
    )
  );
}

export function validateS233AiEvaluationCascadeTrace(value: unknown): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["AI evaluation cascade trace must be an object"]);
  const trace = value as S233AiEvaluationCascadeTrace;
  addClosedRecordErrors(
    errors,
    trace,
    [
      "traceId",
      "cascadeVersion",
      "learnerOwnerRefId",
      "learnerReviewId",
      "answerSubmissionId",
      "inputVersionId",
      "inputFingerprintSha256",
      "answerPackId",
      "answerPackVersion",
      "sourceSnapshotId",
      "deterministicChecks",
      "primarySubjectGrader",
      "conditionalCritic",
      "finalDisposition",
      "humanApproval",
      "authorityGuardrails",
    ],
    "cascadeTrace",
  );
  addRequiredString(errors, trace.traceId, "traceId");
  for (const [path, token] of [
    ["learnerOwnerRefId", trace.learnerOwnerRefId],
    ["learnerReviewId", trace.learnerReviewId],
    ["answerSubmissionId", trace.answerSubmissionId],
    ["inputVersionId", trace.inputVersionId],
    ["answerPackId", trace.answerPackId],
    ["answerPackVersion", trace.answerPackVersion],
    ["sourceSnapshotId", trace.sourceSnapshotId],
  ] as const) addRequiredString(errors, token, path);
  if (!isSha256Digest(trace.inputFingerprintSha256)) {
    errors.push("inputFingerprintSha256 must be a lowercase SHA-256 digest");
  }
  if (trace.cascadeVersion !== S233_AI_CASCADE_VERSION) errors.push("cascadeVersion must match the frozen AI-only cascade");
  const deterministic = trace.deterministicChecks;
  addClosedRecordErrors(errors, deterministic, ["status", "checkIds", "blockerCodes"], "deterministicChecks");
  addStringArrayErrors(errors, deterministic?.checkIds, "deterministicChecks.checkIds", { minimum: 1 });
  addStringArrayErrors(errors, deterministic?.blockerCodes, "deterministicChecks.blockerCodes");
  if (!["passed", "failed"].includes(deterministic?.status)) errors.push("deterministicChecks.status is invalid");
  const blockers = Array.isArray(deterministic?.blockerCodes) ? deterministic.blockerCodes : [];
  if (deterministic?.status === "failed" && blockers.length === 0) errors.push("failed deterministic checks require blocker codes");
  if (deterministic?.status === "passed" && blockers.length > 0) errors.push("passed deterministic checks cannot retain blocker codes");

  const primary = trace.primarySubjectGrader;
  addClosedRecordErrors(
    errors,
    primary,
    ["subject", "status", "modelVersion", "promptVersion", "findingIds", "criticalFindingIds", "uncertaintyCodes", "graderDisagreementDetected"],
    "primarySubjectGrader",
  );
  if (!["practice", "theory", "law"].includes(primary?.subject)) errors.push("primarySubjectGrader.subject is invalid");
  if (!["completed", "abstained", "not_run"].includes(primary?.status)) errors.push("primarySubjectGrader.status is invalid");
  addStringArrayErrors(errors, primary?.findingIds, "primarySubjectGrader.findingIds", { minimum: primary?.status === "completed" ? 1 : 0 });
  addStringArrayErrors(errors, primary?.criticalFindingIds, "primarySubjectGrader.criticalFindingIds");
  addStringArrayErrors(errors, primary?.uncertaintyCodes, "primarySubjectGrader.uncertaintyCodes", { minimum: primary?.status === "abstained" ? 1 : 0 });
  if (typeof primary?.graderDisagreementDetected !== "boolean") errors.push("primarySubjectGrader.graderDisagreementDetected must be boolean");
  const findingIds = new Set(Array.isArray(primary?.findingIds) ? primary.findingIds : []);
  if ((Array.isArray(primary?.criticalFindingIds) ? primary.criticalFindingIds : []).some((id) => !findingIds.has(id))) errors.push("criticalFindingIds must reference primary findingIds");
  if (primary?.status === "completed" || primary?.status === "abstained") {
    addRequiredString(errors, primary.modelVersion, "primarySubjectGrader.modelVersion");
    addRequiredString(errors, primary.promptVersion, "primarySubjectGrader.promptVersion");
  } else if (
    primary?.status === "not_run" &&
    (primary.modelVersion !== null || primary.promptVersion !== null || findingIds.size > 0 || (Array.isArray(primary.uncertaintyCodes) && primary.uncertaintyCodes.length > 0) || primary.graderDisagreementDetected !== false)
  ) errors.push("not_run primary grader cannot claim versions, findings, uncertainty, or disagreement");

  const critic = trace.conditionalCritic;
  addClosedRecordErrors(errors, critic, ["status", "triggerReasons", "modelVersion", "promptVersion", "unresolvedCodes"], "conditionalCritic");
  if (!["not_required", "completed", "abstained"].includes(critic?.status)) errors.push("conditionalCritic.status is invalid");
  if (!Array.isArray(critic?.triggerReasons)) errors.push("conditionalCritic.triggerReasons must be an array");
  else if (new Set(critic.triggerReasons).size !== critic.triggerReasons.length || critic.triggerReasons.some((reason) => !["critical_finding", "uncertainty", "grader_disagreement"].includes(reason))) errors.push("conditional critic trigger reasons must be unique frozen values");
  addStringArrayErrors(errors, critic?.unresolvedCodes, "conditionalCritic.unresolvedCodes", { minimum: critic?.status === "abstained" ? 1 : 0 });
  const expectedTriggerReasons = new Set<string>();
  if ((Array.isArray(primary?.criticalFindingIds) ? primary.criticalFindingIds.length : 0) > 0) expectedTriggerReasons.add("critical_finding");
  if ((Array.isArray(primary?.uncertaintyCodes) ? primary.uncertaintyCodes.length : 0) > 0) expectedTriggerReasons.add("uncertainty");
  if (primary?.graderDisagreementDetected === true) expectedTriggerReasons.add("grader_disagreement");
  const triggerReasons = Array.isArray(critic?.triggerReasons) ? critic.triggerReasons : [];
  if (!sameStringSet(triggerReasons, [...expectedTriggerReasons])) errors.push("conditional critic triggers must equal the triggers derived from the primary trace");
  if (expectedTriggerReasons.size === 0 && critic?.status !== "not_required") errors.push("critic may run only for a frozen trigger");
  if (expectedTriggerReasons.size > 0 && critic?.status === "not_required") errors.push("critical, uncertain, or disagreement cases require the critic");
  if (critic?.status === "completed" || critic?.status === "abstained") {
    addRequiredString(errors, critic.modelVersion, "conditionalCritic.modelVersion");
    addRequiredString(errors, critic.promptVersion, "conditionalCritic.promptVersion");
  }
  if (critic?.status === "completed" && Array.isArray(critic.unresolvedCodes) && critic.unresolvedCodes.length > 0) errors.push("completed critic cannot retain unresolved codes");
  if (critic?.status === "not_required" && (critic.modelVersion !== null || critic.promptVersion !== null || triggerReasons.length > 0 || (Array.isArray(critic.unresolvedCodes) && critic.unresolvedCodes.length > 0))) errors.push("not_required critic cannot claim versions, triggers, or unresolved codes");

  if (deterministic?.status === "failed") {
    if (primary?.status !== "not_run" || critic?.status !== "not_required") errors.push("deterministic failure must skip both graders");
  } else if (primary?.status === "not_run") errors.push("passed deterministic checks require the primary subject grader");
  const unresolved = deterministic?.status === "failed" || primary?.status === "abstained" || critic?.status === "abstained";
  if (unresolved && trace.finalDisposition !== "abstained") errors.push("unresolved evaluation must abstain");
  if (!unresolved && trace.finalDisposition !== "evaluated") errors.push("fully resolved evaluation must use evaluated disposition");
  if (!["evaluated", "abstained"].includes(trace.finalDisposition)) errors.push("finalDisposition is invalid");
  addClosedRecordErrors(errors, trace.humanApproval, ["requested", "required", "received"], "humanApproval");
  if (trace.humanApproval?.requested !== false || trace.humanApproval?.required !== false || trace.humanApproval?.received !== false) errors.push("human approval is not part of the personal learner request path");
  addAuthorityErrors(errors, trace.authorityGuardrails, "authorityGuardrails");
  addRawBoundaryError(errors, trace);
  return validationResult(errors);
}

export function validateS233AiEvaluationCascadeBundle(value: unknown): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["AI evaluation cascade bundle must be an object"]);
  const bundle = value as S233AiEvaluationCascadeBundle;
  addClosedRecordErrors(
    errors,
    bundle,
    ["trace", "findings", "skills", "deterministicFindingCheckResults"],
    "cascadeBundle",
  );
  errors.push(...validateS233AiEvaluationCascadeTrace(bundle.trace).errors);
  if (!Array.isArray(bundle.findings)) errors.push("cascade findings must be an array");
  else for (const finding of bundle.findings) errors.push(...validateS233ScoringFinding(finding).errors);
  if (!Array.isArray(bundle.skills)) errors.push("cascade skills must be an array");
  else for (const skill of bundle.skills) errors.push(...validateS233ScoringSkillIdentity(skill).errors);
  const deterministicResults: S233AiEvaluationCascadeBundle["deterministicFindingCheckResults"] = [];
  if (!Array.isArray(bundle.deterministicFindingCheckResults)) {
    errors.push("deterministicFindingCheckResults must be an array");
  } else {
    for (const rawResult of bundle.deterministicFindingCheckResults) {
      if (!isRecord(rawResult)) {
        errors.push("deterministicFindingCheckResults entries must be objects");
        continue;
      }
      const result = rawResult as S233AiEvaluationCascadeBundle["deterministicFindingCheckResults"][number];
      addClosedRecordErrors(
        errors,
        result,
        [
          "checkResultId",
          "checkId",
          "findingId",
          "deterministicStatus",
          "persistenceReceiptId",
          "immutable",
          "containsRawContent",
        ],
        "deterministicFindingCheckResults[]",
      );
      for (const [path, token] of [
        ["checkResultId", result.checkResultId],
        ["checkId", result.checkId],
        ["findingId", result.findingId],
        ["persistenceReceiptId", result.persistenceReceiptId],
      ] as const) addRequiredString(errors, token, `deterministicFindingCheckResults.${path}`);
      if (!FINDING_STATUSES.has(result.deterministicStatus)) {
        errors.push("deterministic finding-check status is invalid");
      }
      if (result.immutable !== true || result.containsRawContent !== false) {
        errors.push("deterministic finding-check results must be immutable metadata");
      }
      addRawBoundaryError(errors, result);
      deterministicResults.push(result);
    }
  }
  if (
    new Set(deterministicResults.map((result) => result.checkResultId)).size !==
    deterministicResults.length
  ) {
    errors.push("deterministic finding-check result IDs must be unique");
  }
  if (
    new Set(
      deterministicResults.map((result) => `${String(result.checkId)}:${String(result.findingId)}`),
    ).size !== deterministicResults.length
  ) {
    errors.push("deterministic check/finding bindings must be unique");
  }
  if (!isRecord(bundle.trace)) return validationResult(errors);
  const findings = Array.isArray(bundle.findings) ? bundle.findings.filter(isRecord) as S233ScoringFinding[] : [];
  const skills = Array.isArray(bundle.skills) ? bundle.skills.filter(isRecord) as S233ScoringSkillIdentity[] : [];
  const findingIds = findings.map((finding) => finding.findingId);
  const skillById = new Map(skills.map((skill) => [skill.skillId, skill]));
  if (new Set(findingIds).size !== findingIds.length) errors.push("cascade finding IDs must be unique");
  if (new Set(skills.map((skill) => skill.skillId)).size !== skills.length) errors.push("cascade skill IDs must be unique");
  if (!sameStringSet(skills.map((skill) => skill.skillId), findings.map((finding) => finding.skillId))) {
    errors.push("cascade skills must exactly equal the skills used by bundled findings");
  }
  for (const finding of findings) {
    const skill = skillById.get(finding.skillId);
    if (!skill) errors.push(`cascade finding has no bundled scoring skill: ${String(finding.findingId)}`);
    else if (skill.subject !== bundle.trace.primarySubjectGrader?.subject) errors.push("cascade scoring skill subject must match primary grader subject");
    if (
      finding.learnerEvidenceLocator !== null &&
      isRecord(finding.learnerEvidenceLocator) &&
      (finding.learnerEvidenceLocator.answerSubmissionId !== bundle.trace.answerSubmissionId ||
        finding.learnerEvidenceLocator.inputVersionId !== bundle.trace.inputVersionId)
    ) {
      errors.push("cascade finding locator must match the trace submission and input version");
    }
  }
  if (!sameStringSet(bundle.trace.primarySubjectGrader?.findingIds, findingIds)) errors.push("primary findingIds must equal the actual bundled findings");
  const adverse = new Set<S233FindingStatus>(["partial", "missing", "incorrect", "not_assessable"]);
  const criticalFindingIds = findings
    .filter((finding) => skillById.get(finding.skillId)?.critical === true && adverse.has(finding.status))
    .map((finding) => finding.findingId);
  if (!sameStringSet(bundle.trace.primarySubjectGrader?.criticalFindingIds, criticalFindingIds)) errors.push("criticalFindingIds must be derived from bundled skills and adverse findings");
  const uncertaintyCodes = new Set<string>();
  for (const finding of findings) {
    for (const code of Array.isArray(finding.confidence?.uncertaintyCodes) ? finding.confidence.uncertaintyCodes : []) uncertaintyCodes.add(code);
    if (finding.status === "not_assessable" && isSafeMetadataToken(finding.abstentionReason)) uncertaintyCodes.add(finding.abstentionReason);
  }
  if (!sameStringSet(bundle.trace.primarySubjectGrader?.uncertaintyCodes, [...uncertaintyCodes])) errors.push("primary uncertaintyCodes must be derived from actual findings");
  const findingById = new Map(findings.map((finding) => [finding.findingId, finding]));
  const deterministicCheckIds = new Set(
    Array.isArray(bundle.trace.deterministicChecks?.checkIds)
      ? bundle.trace.deterministicChecks.checkIds
      : [],
  );
  const disagreementFindingIds = new Set<string>();
  for (const result of deterministicResults) {
    const actualFinding = findingById.get(result.findingId);
    if (!actualFinding) {
      errors.push("deterministic finding-check result must reference an actual finding");
      continue;
    }
    if (!deterministicCheckIds.has(result.checkId)) {
      errors.push("deterministic finding-check result must reference a check that actually ran");
    }
    if (result.deterministicStatus !== actualFinding.status) {
      disagreementFindingIds.add(result.findingId);
    }
  }
  if (
    bundle.trace.primarySubjectGrader?.graderDisagreementDetected !==
    (disagreementFindingIds.size > 0)
  ) {
    errors.push("graderDisagreementDetected must be derived from typed deterministic check results");
  }
  if (findings.some((finding) => finding.status === "not_assessable") && bundle.trace.finalDisposition !== "abstained") errors.push("not_assessable findings require final abstention");
  return validationResult(errors);
}

export function validateS233TrustedScoringContext(value: unknown): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return validationResult(["trusted scoring context must be an object"]);
  const context = value as S233TrustedScoringContext;
  addClosedRecordErrors(
    errors,
    context,
    [
      "contextVersion",
      "ontologyAdapterVersion",
      "rubricAdapterVersion",
      "ontologyVersion",
      "rubricVersion",
      "snapshotReceiptId",
      "canonicalSkills",
      "rubricAnchors",
    ],
    "trustedScoringContext",
  );
  if (context.contextVersion !== S233_TRUSTED_SCORING_CONTEXT_VERSION) {
    errors.push("trusted scoring context version is invalid");
  }
  if (context.ontologyAdapterVersion !== "s233.canonical_ontology_adapter.v1") {
    errors.push("trusted scoring context requires the canonical ontology adapter");
  }
  if (context.rubricAdapterVersion !== "s233.s205_rubric_adapter.v1") {
    errors.push("trusted scoring context requires the S205 rubric adapter");
  }
  if (context.ontologyVersion !== S233_SCORING_ONTOLOGY_VERSION) {
    errors.push("trusted scoring context must pin the frozen ontology version");
  }
  if (context.rubricVersion !== S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence) {
    errors.push("trusted scoring context must pin the frozen S205 rubric version");
  }
  addRequiredString(errors, context.snapshotReceiptId, "trustedScoringContext.snapshotReceiptId");
  const canonicalSkills: S233ScoringSkillIdentity[] = [];
  if (!Array.isArray(context.canonicalSkills) || context.canonicalSkills.length === 0) {
    errors.push("trusted scoring context requires canonical skills");
  } else {
    for (const skill of context.canonicalSkills) {
      errors.push(...validateS233ScoringSkillIdentity(skill).errors);
      if (isRecord(skill)) canonicalSkills.push(skill as S233ScoringSkillIdentity);
    }
  }
  if (new Set(canonicalSkills.map((skill) => skill.skillId)).size !== canonicalSkills.length) {
    errors.push("trusted canonical skill IDs must be unique");
  }
  const rubricAnchors: S233TrustedScoringContext["rubricAnchors"] = [];
  if (!Array.isArray(context.rubricAnchors) || context.rubricAnchors.length === 0) {
    errors.push("trusted scoring context requires rubric anchors");
  } else {
    for (const rawAnchor of context.rubricAnchors) {
      if (!isRecord(rawAnchor)) {
        errors.push("trusted rubric anchors must be objects");
        continue;
      }
      const anchor = rawAnchor as S233TrustedScoringContext["rubricAnchors"][number];
      addClosedRecordErrors(
        errors,
        anchor,
        ["rubricAnchorId", "subject", "skillId"],
        "trustedScoringContext.rubricAnchors[]",
      );
      addRequiredString(errors, anchor.rubricAnchorId, "trusted rubric anchor ID");
      addRequiredString(errors, anchor.skillId, "trusted rubric skill ID");
      if (!["practice", "theory", "law"].includes(anchor.subject)) {
        errors.push("trusted rubric anchor subject is invalid");
      }
      rubricAnchors.push(anchor);
    }
  }
  if (new Set(rubricAnchors.map((anchor) => anchor.rubricAnchorId)).size !== rubricAnchors.length) {
    errors.push("trusted rubric anchor IDs must be unique");
  }
  const canonicalSkillById = new Map(canonicalSkills.map((skill) => [skill.skillId, skill]));
  for (const anchor of rubricAnchors) {
    if (canonicalSkillById.get(anchor.skillId)?.subject !== anchor.subject) {
      errors.push("trusted rubric anchor must resolve to a same-subject canonical skill");
    }
  }
  addRawBoundaryError(errors, context);
  return validationResult(errors);
}

export function validateS233LearnerReviewEvaluationContext(
  value: unknown,
): S233ValidationResult {
  if (!isRecord(value)) {
    return validationResult(["learner review evaluation context must be an object"]);
  }
  const context = value as S233LearnerReviewEvaluationContext;
  const errors: string[] = [];
  addClosedRecordErrors(
    errors,
    context,
    [
      "review",
      "requestContext",
      "cascadeBundle",
      "answerPack",
      "answerPackRegistryContext",
      "trustedScoringContext",
      "findingBundles",
    ],
    "learnerReviewEvaluationContext",
  );
  errors.push(...validateS233LearnerAnswerReviewIdentity(context.review).errors);
  errors.push(
    ...validateS233LearnerReviewRequestContext(
      context.review,
      context.requestContext,
    ).errors,
  );
  errors.push(...validateS233TrustedScoringContext(context.trustedScoringContext).errors);
  errors.push(...validateS233AiEvaluationCascadeBundle(context.cascadeBundle).errors);
  errors.push(
    ...validateS233AnswerPackRegistryContext(
      context.answerPack,
      context.answerPackRegistryContext,
    ).errors,
  );
  if (!Array.isArray(context.findingBundles)) {
    errors.push("findingBundles must be an array");
  } else {
    for (const bundle of context.findingBundles) {
      errors.push(...validateS233ScoringFindingBundle(bundle).errors);
    }
  }
  if (errors.length > 0) return validationResult(errors);

  const review = context.review;
  const cascadeBundle = context.cascadeBundle;
  const trace = cascadeBundle.trace;
  const pack = context.answerPack;

  if (review.versions?.cascadeTraceId !== trace.traceId) {
    errors.push("learner review cascadeTraceId must bind to the persisted cascade trace");
  }
  if (review.versions?.cascadeVersion !== trace.cascadeVersion) {
    errors.push("learner review cascadeVersion must match the persisted cascade trace");
  }
  if (review.subject !== trace.primarySubjectGrader?.subject) {
    errors.push("learner review subject must match the primary subject grader");
  }
  for (const [left, right, label] of [
    [review.learnerOwnerRefId, trace.learnerOwnerRefId, "learner owner"],
    [review.reviewId, trace.learnerReviewId, "learner review"],
    [
      review.rewriteRegradeLineage.answerSubmissionId,
      trace.answerSubmissionId,
      "answer submission",
    ],
    [review.inputVersionId, trace.inputVersionId, "input version"],
    [review.idempotency.inputFingerprint, trace.inputFingerprintSha256, "input fingerprint"],
    [review.versions.answerPackId, pack.packId, "Answer Pack ID"],
    [review.versions.answerPackVersion, pack.packVersion, "Answer Pack version"],
    [review.versions.answerPackSchemaVersion, pack.schemaVersion, "Answer Pack schema"],
    [review.subject, pack.subject, "Answer Pack subject"],
    [review.versions.sourceVersion, pack.snapshot.snapshotId, "source snapshot"],
    [trace.answerPackId, pack.packId, "cascade Answer Pack ID"],
    [trace.answerPackVersion, pack.packVersion, "cascade Answer Pack version"],
    [trace.sourceSnapshotId, pack.snapshot.snapshotId, "cascade source snapshot"],
  ] as const) {
    if (left !== right) {
      errors.push(`terminal learner review must bind the exact ${label}`);
    }
  }

  const findingBundleById = new Map(
    context.findingBundles.map((bundle) => [bundle.finding.findingId, bundle]),
  );
  if (findingBundleById.size !== context.findingBundles.length) {
    errors.push("terminal finding bundle IDs must be unique");
  }
  if (!sameStringSet([...findingBundleById.keys()], cascadeBundle.findings.map((item) => item.findingId))) {
    errors.push("terminal finding bundles must exactly cover the cascade findings");
  }
  const skillById = new Map(cascadeBundle.skills.map((item) => [item.skillId, item]));
  const trustedSkillById = new Map(
    context.trustedScoringContext.canonicalSkills.map((item) => [item.skillId, item]),
  );
  const trustedRubricById = new Map(
    context.trustedScoringContext.rubricAnchors.map((item) => [item.rubricAnchorId, item]),
  );
  for (const cascadeFinding of cascadeBundle.findings) {
    const bundle = findingBundleById.get(cascadeFinding.findingId);
    if (!bundle) continue;
    if (!sameValidatedValue(bundle.finding, cascadeFinding)) {
      errors.push("terminal finding bundle must contain the exact persisted cascade finding");
    }
    const cascadeSkill = skillById.get(cascadeFinding.skillId);
    if (!cascadeSkill || !sameValidatedValue(bundle.skill, cascadeSkill)) {
      errors.push("terminal finding bundle must contain the exact persisted cascade skill");
    }
    if (!sameValidatedValue(bundle.skill, trustedSkillById.get(bundle.skill.skillId))) {
      errors.push("terminal scoring skill must equal the canonical trusted ontology identity");
    }
    for (const ontologyBinding of bundle.ontologySkillBindings) {
      if (
        !sameValidatedValue(
          ontologyBinding.skill,
          trustedSkillById.get(ontologyBinding.skill.skillId),
        )
      ) {
        errors.push("terminal ontology lineage must resolve through trusted canonical skills");
      }
    }
    if (
      bundle.expectedAnswerSubmissionId !== review.rewriteRegradeLineage.answerSubmissionId ||
      bundle.expectedInputVersionId !== review.inputVersionId
    ) {
      errors.push("terminal finding bundle must bind the review submission and input version");
    }
    if (
      bundle.skill.ontologyVersion !== review.versions.ontologyVersion ||
      bundle.skill.subject !== review.subject
    ) {
      errors.push("terminal finding ontology and subject must match the learner review");
    }
    for (const sourceBinding of bundle.sourceAnchorBindings) {
      const sourceRecord = context.answerPackRegistryContext.sourceRecords.find(
        (record) => record.sourceId === sourceBinding.sourceId,
      );
      if (
        sourceBinding.answerPackId !== pack.packId ||
        sourceBinding.answerPackVersion !== pack.packVersion ||
        sourceBinding.sourceSnapshotId !== pack.snapshot.snapshotId ||
        !pack.snapshot.sourceIds.includes(sourceBinding.sourceId) ||
        !pack.claimSourceGraph.sourceAnchorIds.includes(sourceBinding.sourceAnchorId) ||
        !sourceRecord ||
        !sourceRecord.sourceAnchorIds.includes(sourceBinding.sourceAnchorId)
      ) {
        errors.push("terminal finding source anchor must resolve through the exact Answer Pack snapshot");
      }
    }
    for (const rubricBinding of bundle.rubricAnchorBindings) {
      const trustedRubric = trustedRubricById.get(rubricBinding.rubricAnchorId);
      if (
        rubricBinding.rubricVersion !== review.versions.rubricVersion ||
        !trustedRubric ||
        trustedRubric.subject !== rubricBinding.subject ||
        trustedRubric.skillId !== rubricBinding.skillId
      ) {
        errors.push("terminal finding rubric anchor must resolve through the exact trusted S205 context");
      }
    }
    for (const provenanceBinding of bundle.provenanceBindings) {
      if (provenanceBinding.cascadeTraceId !== trace.traceId) {
        errors.push("terminal finding provenance must bind the exact cascade trace");
      }
      if (
        provenanceBinding.kind === "ai_inferred" &&
        (provenanceBinding.modelVersion !== trace.primarySubjectGrader.modelVersion ||
          provenanceBinding.promptVersion !== trace.primarySubjectGrader.promptVersion)
      ) {
        errors.push("AI-inferred finding provenance must bind the primary grader that ran");
      }
    }
  }
  if (
    trace.primarySubjectGrader?.status === "completed" ||
    trace.primarySubjectGrader?.status === "abstained"
  ) {
    if (
      review.versions?.primaryModelVersion !== trace.primarySubjectGrader.modelVersion ||
      review.versions?.primaryPromptVersion !== trace.primarySubjectGrader.promptVersion
    ) {
      errors.push("learner review must pin the exact primary model and prompt that ran");
    }
  }
  if (
    trace.conditionalCritic?.status === "completed" ||
    trace.conditionalCritic?.status === "abstained"
  ) {
    if (
      review.versions?.criticModelVersion !== trace.conditionalCritic.modelVersion ||
      review.versions?.criticPromptVersion !== trace.conditionalCritic.promptVersion
    ) {
      errors.push("learner review must pin the exact critic model and prompt that ran");
    }
  }

  const expectedDeterministic =
    trace.deterministicChecks?.status === "failed" ? "failed" : "completed";
  const expectedPrimary =
    trace.deterministicChecks?.status === "failed"
      ? "skipped"
      : trace.primarySubjectGrader?.status;
  const expectedCritic = trace.conditionalCritic?.status;
  const expectedOverall = trace.finalDisposition === "evaluated" ? "completed" : "abstained";
  if (
    review.stageStatus?.overall !== expectedOverall ||
    review.stageStatus?.deterministicChecks !== expectedDeterministic ||
    review.stageStatus?.primaryGrader !== expectedPrimary ||
    review.stageStatus?.conditionalCritic !== expectedCritic ||
    review.stageStatus?.persistence !== "completed" ||
    review.stageStatus?.failureStage !== null ||
    review.idempotency?.status !== "completed"
  ) {
    errors.push("persisted learner review stages must exactly match the terminal cascade trace");
  }
  return validationResult(errors);
}

function pathIsOwnedByLane(lane: S233Lane, file: string) {
  const ownership = S233_LANE_FILE_OWNERSHIP[lane];
  return (
    ownership.exactFiles.includes(file as never) ||
    ownership.prefixes.some((prefix) => file.startsWith(prefix))
  );
}

function addLaneManifestEntryErrors(
  errors: string[],
  value: unknown,
  path: string,
): value is S233LaneChangeManifestEntry {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  const entry = value as S233LaneChangeManifestEntry;
  addClosedRecordErrors(
    errors,
    entry,
    ["path", "changeKind", "gitMode", "contentSha256", "baseBlobSha256"],
    path,
  );
  if (
    !isNonEmptyString(entry.path) ||
    entry.path.startsWith("/") ||
    entry.path.includes("\\") ||
    entry.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) errors.push(`${path}.path must be a canonical repository-relative POSIX path`);
  if (!["added", "modified"].includes(entry.changeKind)) errors.push(`${path}.changeKind must be added or modified`);
  if (!["100644", "100755"].includes(entry.gitMode)) errors.push(`${path}.gitMode must be a regular-file mode`);
  if (!isSha256Digest(entry.contentSha256)) errors.push(`${path}.contentSha256 must be a lowercase SHA-256 digest`);
  if (entry.changeKind === "added" && entry.baseBlobSha256 !== null) errors.push(`${path}.baseBlobSha256 must be null for an added file`);
  if (entry.changeKind === "modified" && !isSha256Digest(entry.baseBlobSha256)) errors.push(`${path}.baseBlobSha256 must prove the modified base blob`);
  return true;
}

function laneManifestEntrySignature(entry: S233LaneChangeManifestEntry) {
  return [
    entry.path,
    entry.changeKind,
    entry.gitMode,
    entry.contentSha256,
    entry.baseBlobSha256 ?? "null",
  ]
    .map((value) => String(value))
    .join("|");
}

export function validateS233LaneChangeManifest(
  manifestValue: unknown,
  expectedBaseMergeSha: unknown,
  observedGitDiffValue: unknown,
  trustedAdditiveMigrationReviewValue: unknown,
): S233ValidationResult {
  const errors: string[] = [];
  if (!isRecord(manifestValue)) return validationResult(["lane change manifest must be an object"]);
  const manifest = manifestValue as S233LaneChangeManifest;
  addClosedRecordErrors(
    errors,
    manifest,
    [
      "contractVersion",
      "lane",
      "baseMergeSha",
      "headSha",
      "entries",
      "additiveMigrationReviewId",
    ],
    "laneChangeManifest",
  );
  if (manifest.contractVersion !== S233_PARALLEL_EXECUTION_CONTRACT_VERSION) errors.push("lane manifest must pin the frozen S233 contract version");
  if (!isSafeMetadataToken(manifest.lane) || !["laneA", "laneB"].includes(manifest.lane)) {
    errors.push("lane must be laneA or laneB");
  }
  if (!isFullGitSha(expectedBaseMergeSha)) errors.push("expected base merge SHA must be a full lowercase Git SHA");
  if (!isFullGitSha(manifest.baseMergeSha)) errors.push("baseMergeSha must be a full lowercase Git SHA");
  if (!isFullGitSha(manifest.headSha)) errors.push("headSha must be a full lowercase Git SHA");
  if (manifest.baseMergeSha !== expectedBaseMergeSha) errors.push("lane manifest is not anchored to the required S233 merge SHA");
  if (manifest.headSha === manifest.baseMergeSha) errors.push("lane manifest headSha must identify a descendant change");

  const entries: S233LaneChangeManifestEntry[] = [];
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    errors.push("lane manifest entries must contain the Git-derived diff");
  } else {
    manifest.entries.forEach((entry, index) => {
      if (addLaneManifestEntryErrors(errors, entry, `laneChangeManifest.entries[${index}]`)) entries.push(entry);
    });
  }
  if (new Set(entries.map((entry) => entry.path)).size !== entries.length) errors.push("lane manifest paths must be unique");

  if (!isRecord(observedGitDiffValue)) {
    errors.push("trusted Git-derived diff evidence must be supplied");
  } else {
    const observed = observedGitDiffValue as S233ObservedGitDiff;
    addClosedRecordErrors(
      errors,
      observed,
      ["baseMergeSha", "headSha", "mergeBaseSha", "baseIsAncestor", "entries"],
      "observedGitDiff",
    );
    if (observed.baseMergeSha !== expectedBaseMergeSha || observed.baseMergeSha !== manifest.baseMergeSha) errors.push("observed Git diff base does not match the required S233 merge SHA");
    if (observed.headSha !== manifest.headSha) errors.push("observed Git diff head does not match the manifest head");
    if (
      !isFullGitSha(observed.mergeBaseSha) ||
      observed.mergeBaseSha !== expectedBaseMergeSha ||
      observed.baseIsAncestor !== true
    ) {
      errors.push("trusted Git evidence must prove the S233 base is the head's merge base and ancestor");
    }
    const observedEntries: S233LaneChangeManifestEntry[] = [];
    if (!Array.isArray(observed.entries)) errors.push("observedGitDiff.entries must be an array");
    else observed.entries.forEach((entry, index) => {
      if (addLaneManifestEntryErrors(errors, entry, `observedGitDiff.entries[${index}]`)) observedEntries.push(entry);
    });
    if (new Set(observedEntries.map((entry) => entry.path)).size !== observedEntries.length) {
      errors.push("observed Git diff paths must be unique");
    }
    const declaredSignatures = entries.map(laneManifestEntrySignature).sort();
    const observedSignatures = observedEntries.map(laneManifestEntrySignature).sort();
    if (
      declaredSignatures.length !== observedSignatures.length ||
      declaredSignatures.some((signature, index) => signature !== observedSignatures[index])
    ) errors.push("manifest entries must exactly equal trusted Git-derived status, modes, and blob hashes");
  }

  const frozen = new Set<string>(S233_FROZEN_SHARED_FILES);
  const lane = manifest.lane;
  if (lane !== "laneA" && lane !== "laneB") return validationResult(errors);
  const otherLane: S233Lane = lane === "laneA" ? "laneB" : "laneA";
  const pathSafeEntries = entries.filter((entry) => isNonEmptyString(entry.path));
  const migrations = pathSafeEntries.filter((entry) => entry.path.startsWith("supabase/migrations/"));
  for (const entry of pathSafeEntries) {
    const file = entry.path;
    if (frozen.has(file)) {
      errors.push(`shared contract file requires a separate reported change: ${file}`);
      continue;
    }
    if (file.startsWith("supabase/migrations/")) {
      if (lane !== "laneA") errors.push(`Lane B may not own migrations: ${file}`);
      continue;
    }
    if (pathIsOwnedByLane(otherLane, file)) {
      errors.push(`${lane} may not edit ${otherLane}-owned file: ${file}`);
      continue;
    }
    if (!pathIsOwnedByLane(lane, file)) {
      errors.push(`${file} is outside ${lane}'s frozen ownership manifest`);
    }
  }

  const migrationRule = S233_LANE_FILE_OWNERSHIP.laneA.additiveMigration;
  if (migrations.length > migrationRule.maximum) errors.push("Lane A may add at most one proven additive persistence migration");
  if (migrations.length === 0) {
    if (manifest.additiveMigrationReviewId !== null) {
      errors.push("additive migration review ID is allowed only when the diff contains a migration");
    }
    if (trustedAdditiveMigrationReviewValue !== null) {
      errors.push("trusted additive migration review is allowed only when the diff contains a migration");
    }
  } else {
    const entry = migrations[0];
    const review = trustedAdditiveMigrationReviewValue;
    addRequiredString(
      errors,
      manifest.additiveMigrationReviewId,
      "additiveMigrationReviewId",
    );
    addClosedRecordErrors(
      errors,
      review,
      [
        "reviewId",
        "path",
        "changeKind",
        "gitMode",
        "contentSha256",
        "reviewVersion",
        "validatorId",
        "verdict",
        "destructiveOperationsDetected",
        "validationEvidenceRefId",
      ],
      "trustedAdditiveMigrationReview",
    );
    if (!new RegExp(`^${migrationRule.prefix}[0-9]{12,14}_s233a_[a-z0-9_]+[.]sql$`).test(entry?.path ?? "")) errors.push("Lane A migration must be a direct-child timestamped S233A SQL file");
    if (entry?.changeKind !== "added" || entry?.baseBlobSha256 !== null || entry?.gitMode !== "100644") errors.push("Lane A migration must be a newly added regular non-executable file absent at base");
    if (!isRecord(review)) {
      errors.push("migration requires separately trusted, content-hash-bound additive SQL review evidence");
    } else {
      if (review.reviewId !== manifest.additiveMigrationReviewId) errors.push("manifest migration review ID must resolve to the separately trusted review");
      addRequiredString(errors, review.reviewId, "trustedAdditiveMigrationReview.reviewId");
      if (review.path !== entry?.path || review.changeKind !== entry?.changeKind || review.gitMode !== entry?.gitMode || review.contentSha256 !== entry?.contentSha256) errors.push("trusted additive SQL review must bind to the exact Git-derived migration blob");
      if (review.reviewVersion !== migrationRule.reviewVersion || review.validatorId !== "trusted_sql_additivity_validator" || review.verdict !== "additive_only" || review.destructiveOperationsDetected !== false) errors.push("trusted migration review must prove additive-only SQL with no destructive operations");
      addRequiredString(errors, review.validationEvidenceRefId, "additiveMigration.validationEvidenceRefId");
    }
  }
  return validationResult(errors);
}

export function validateS233OwnershipBoundary(): S233ValidationResult {
  const errors: string[] = [];
  const laneA = S233_LANE_FILE_OWNERSHIP.laneA;
  const laneB = S233_LANE_FILE_OWNERSHIP.laneB;
  const laneAExact = new Set<string>(laneA.exactFiles);
  for (const file of laneB.exactFiles) {
    if (laneAExact.has(file)) errors.push(`exact file ownership overlaps: ${file}`);
  }
  for (const left of laneA.prefixes) {
    for (const right of laneB.prefixes) {
      if (left.startsWith(right) || right.startsWith(left)) {
        errors.push(`prefix ownership overlaps: ${left} <> ${right}`);
      }
    }
  }
  for (const file of laneA.exactFiles) {
    if (laneB.prefixes.some((prefix) => file.startsWith(prefix))) {
      errors.push(`Lane A exact file overlaps Lane B prefix: ${file}`);
    }
  }
  for (const file of laneB.exactFiles) {
    if (laneA.prefixes.some((prefix) => file.startsWith(prefix))) {
      errors.push(`Lane B exact file overlaps Lane A prefix: ${file}`);
    }
  }
  const frozen = new Set<string>(S233_FROZEN_SHARED_FILES);
  for (const lane of ["laneA", "laneB"] as const) {
    for (const file of S233_LANE_FILE_OWNERSHIP[lane].exactFiles) {
      if (frozen.has(file)) errors.push(`frozen file assigned to ${lane}: ${file}`);
    }
  }
  return validationResult(errors);
}

export function assertValidS233ContractValue(result: S233ValidationResult): void {
  if (!result.valid) {
    throw new Error(`invalid-s233-parallel-contract: ${result.errors.join("; ")}`);
  }
}

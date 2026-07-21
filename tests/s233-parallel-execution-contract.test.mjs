import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S233_AI_CASCADE_VERSION,
  S233_ANSWER_PACK_SCHEMA_VERSION,
  S233_AUTHORITY_GUARDRAILS,
  S233_CONTROLLER_EVENT_VERSION,
  S233_EVIDENCE_STATE_SCHEMA_VERSION,
  S233_FINDING_STATUSES,
  S233_FROZEN_SHARED_FILES,
  S233_INPUT_FINGERPRINT_FIELDS,
  S233_INPUT_FINGERPRINT_SCOPE,
  S233_LANE_A_EMITTABLE_EVIDENCE_STATES,
  S233_LATER_EVIDENCE_STATES,
  S233_LEARNER_REVIEW_SCHEMA_VERSION,
  S233_PARALLEL_EXECUTION_CONTRACT_VERSION,
  S233_REUSED_CONTRACT_VERSIONS,
  S233_SCORING_FINDING_SCHEMA_VERSION,
  S233_SCORING_ONTOLOGY_VERSION,
  S233_SCORING_SKILL_SCHEMA_VERSION,
  S233_TRUSTED_SCORING_CONTEXT_VERSION,
  validateS233AiEvaluationCascadeBundle,
  validateS233AiEvaluationCascadeTrace,
  validateS233AnswerPackIdentity,
  validateS233AnswerPackRegistryContext,
  validateS233EvidenceProofBundle,
  validateS233EvidenceStateRecord,
  validateS233FutureControllerEvent,
  validateS233LaneAEvidenceProofBundle,
  validateS233LaneChangeManifest,
  validateS233LearnerAnswerReviewIdentity,
  validateS233LearnerReviewEvaluationContext,
  validateS233LearnerReviewRequestContext,
  validateS233LearnerReviewTransition,
  validateS233OwnershipBoundary,
  validateS233ScoringFinding,
  validateS233ScoringFindingBundle,
  validateS233ScoringSkillIdentity,
  validateS233TrustedScoringContext,
} from "../lib/review-os/s233-parallel-execution-contract.ts";

const BASE_SHA = "1".repeat(40);
const HEAD_SHA = "2".repeat(40);

function clone(value) {
  return structuredClone(value);
}

function skill(overrides = {}) {
  return {
    schemaVersion: S233_SCORING_SKILL_SCHEMA_VERSION,
    skillId: "skill-law-issue-1",
    ontologyVersion: S233_SCORING_ONTOLOGY_VERSION,
    subject: "law",
    taskArchetype: "law.issue_rule_application.v1",
    parentSkillIds: ["skill-law-answer-structure"],
    prerequisiteSkillIds: ["skill-law-rule-source"],
    evidenceRequirements: [
      {
        requirementId: "requirement-learner-segment",
        kind: "learner_answer_segment",
        minimumCount: 1,
        required: true,
      },
      {
        requirementId: "requirement-law-source",
        kind: "source_anchor",
        minimumCount: 1,
        required: true,
      },
      {
        requirementId: "requirement-law-rubric",
        kind: "rubric_anchor",
        minimumCount: 1,
        required: true,
      },
    ],
    severity: "major",
    critical: true,
    deductionGroup: {
      groupId: "deduction-law-issue-root",
      nonOverlap: true,
      doubleDeductionAllowed: false,
    },
    remediationActionType: "rewrite",
    immutable: true,
    containsRawContent: false,
    ...overrides,
  };
}

function finding(overrides = {}) {
  return {
    schemaVersion: S233_SCORING_FINDING_SCHEMA_VERSION,
    findingId: "finding-law-1",
    skillId: "skill-law-issue-1",
    status: "partial",
    learnerEvidenceLocator: {
      answerSubmissionId: "submission-1",
      inputVersionId: "input-version-1",
      wholeAnswer: false,
      segmentId: "segment-1",
      containsRawContent: false,
    },
    sourceAnchorIds: ["source-law-1"],
    rubricAnchorIds: ["rubric-law-issue-1"],
    evidenceRequirementBindings: [
      {
        requirementId: "requirement-learner-segment",
        evidenceRefIds: ["segment-1"],
      },
      {
        requirementId: "requirement-law-source",
        evidenceRefIds: ["source-law-1"],
      },
      {
        requirementId: "requirement-law-rubric",
        evidenceRefIds: ["rubric-law-issue-1"],
      },
    ],
    confidence: {
      level: "medium",
      uncertaintyCodes: ["application_link_partial"],
    },
    provenance: {
      kind: "ai_inferred",
      provenanceRefId: "evaluation-primary-1",
    },
    abstentionReason: null,
    authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
    containsRawContent: false,
    ...overrides,
  };
}

function findingBundle(overrides = {}) {
  const {
    finding: findingOverride = finding(),
    skill: skillOverride = skill(),
    ...remainingOverrides
  } = overrides;
  return {
    finding: findingOverride,
    skill: skillOverride,
    expectedAnswerSubmissionId: "submission-1",
    expectedInputVersionId: "input-version-1",
    ontologySkillBindings: [
      {
        skill: clone(skillOverride),
      },
      {
        skill: skill({
          skillId: "skill-law-answer-structure",
          taskArchetype: "law.answer_structure.v1",
          parentSkillIds: [],
          prerequisiteSkillIds: [],
          severity: "moderate",
          critical: false,
          deductionGroup: {
            groupId: "deduction-law-answer-structure",
            nonOverlap: true,
            doubleDeductionAllowed: false,
          },
        }),
      },
      {
        skill: skill({
          skillId: "skill-law-rule-source",
          taskArchetype: "law.rule_source.v1",
          parentSkillIds: [],
          prerequisiteSkillIds: [],
          severity: "moderate",
          critical: false,
          deductionGroup: {
            groupId: "deduction-law-rule-source",
            nonOverlap: true,
            doubleDeductionAllowed: false,
          },
        }),
      },
    ],
    sourceAnchorBindings: [
      {
        sourceAnchorId: "source-law-1",
        sourceId: "source-law-1",
        sourceSnapshotId: "snapshot-law-1",
        answerPackId: "answer-pack-law-golden-1",
        answerPackVersion: "1.0.0",
        subject: "law",
        taskArchetype: "law.issue_rule_application.v1",
      },
    ],
    rubricAnchorBindings: [
      {
        rubricAnchorId: "rubric-law-issue-1",
        rubricVersion: S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence,
        subject: "law",
        skillId: skillOverride.skillId,
      },
    ],
    provenanceBindings: [
      {
        provenanceRefId: "evaluation-primary-1",
        kind: "ai_inferred",
        subject: "law",
        skillId: skillOverride.skillId,
        cascadeTraceId: "cascade-trace-1",
        modelVersion: "primary-law-grader.v1",
        promptVersion: "primary-law-prompt.v1",
      },
    ],
    ...remainingOverrides,
  };
}

function answerPack(overrides = {}) {
  const allClaims = ["claim-law-1", "claim-law-2"];
  return {
    schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
    packId: "answer-pack-law-golden-1",
    packVersion: "1.0.0",
    contentHashSha256: "a".repeat(64),
    immutable: true,
    subject: "law",
    verificationStatus: "verified_learning_reference",
    answerLevels: ["L1_recall_outline", "L2_exam_length_answer", "L3_annotated_reasoning"],
    claimSourceGraph: {
      graphId: "claim-graph-law-1",
      claimIds: allClaims,
      sourceAnchorIds: ["source-law-1", "source-law-2"],
      edges: [
        { claimId: "claim-law-1", sourceAnchorId: "source-law-1", relation: "supports" },
        { claimId: "claim-law-2", sourceAnchorId: "source-law-2", relation: "supports" },
      ],
      claimProseStored: false,
      sourceExcerptStored: false,
    },
    snapshot: {
      snapshotId: "snapshot-law-1",
      sourceRegistryVersion: "second-round-source-registry.v1",
      sourceIds: ["source-law-1", "source-law-2"],
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
        outputClaimIds: allClaims,
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
        outputClaimIds: allClaims,
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
        outputClaimIds: allClaims,
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
    ...overrides,
  };
}

function answerPackContext(overrides = {}) {
  return {
    sourceRegistryVersion: "second-round-source-registry.v1",
    lawRegistryVersion: "law-source-registry.v1",
    rightsRegistryVersion: "second-round-rights-registry.v1",
    sourceRecords: [
      {
        sourceId: "source-law-1",
        subject: "law",
        sourceAnchorIds: ["source-law-1"],
        lawVersionIds: ["law-version-exam-date-1"],
        rightsDecisionIds: ["rights-decision-1"],
      },
      {
        sourceId: "source-law-2",
        subject: "law",
        sourceAnchorIds: ["source-law-2"],
        lawVersionIds: [],
        rightsDecisionIds: [],
      },
    ],
    lawVersionRecords: [
      { lawVersionId: "law-version-exam-date-1", status: "verified" },
    ],
    rightsDecisionRecords: [
      {
        rightsDecisionId: "rights-decision-1",
        sourceId: "source-law-1",
        status: "display_by_deep_link",
      },
    ],
    s214PipelineRecords: [
      {
        pipelineId: "s214-pipeline-1",
        packId: "answer-pack-law-golden-1",
        packVersion: "1.0.0",
        contentHashSha256: "a".repeat(64),
        subject: "law",
        status: "ready_for_s215_consensus",
      },
    ],
    s215GateRecords: [
      {
        gateId: "s215-gate-1",
        pipelineId: "s214-pipeline-1",
        packId: "answer-pack-law-golden-1",
        packVersion: "1.0.0",
        contentHashSha256: "a".repeat(64),
        subject: "law",
        status: "released",
        unresolvedBlockerCodes: [],
      },
    ],
    ...overrides,
  };
}

function learnerReview(overrides = {}) {
  return {
    schemaVersion: S233_LEARNER_REVIEW_SCHEMA_VERSION,
    reviewId: "review-1",
    reviewRecordVersion: 1,
    expectedPreviousReviewRecordVersion: null,
    ownerBinding: "authenticated_request_user",
    learnerOwnerRefId: "learner-1",
    subject: "law",
    attemptId: "attempt-root-1",
    attemptVersion: 1,
    inputVersionId: "input-version-1",
    versions: {
      answerPackId: "answer-pack-law-golden-1",
      answerPackVersion: "1.0.0",
      answerPackSchemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
      ontologyVersion: S233_SCORING_ONTOLOGY_VERSION,
      rubricVersion: S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence,
      subjectEngineVersion: S233_REUSED_CONTRACT_VERSIONS.s211LawReview,
      sourceVersion: "snapshot-law-1",
      primaryModelVersion: "primary-law-grader.v1",
      primaryPromptVersion: "primary-law-prompt.v1",
      criticModelVersion: "critic-law-model.v1",
      criticPromptVersion: "critic-law-prompt.v1",
      cascadeVersion: S233_AI_CASCADE_VERSION,
      cascadeTraceId: "cascade-trace-1",
      controllerEventVersion: S233_CONTROLLER_EVENT_VERSION,
      findingSchemaVersion: S233_SCORING_FINDING_SCHEMA_VERSION,
      rewriteRegradeVersion: S233_REUSED_CONTRACT_VERSIONS.s206RewriteRegrade,
    },
    revealHistory: [
      {
        eventId: "reveal-none-1",
        occurredAt: "2026-07-21T03:05:00.000Z",
        exposure: "none",
        answerLevel: null,
        deliberateLearnerOverride: false,
      },
    ],
    rewriteRegradeLineage: {
      historyId: "history-1",
      rootAnswerSubmissionId: "submission-1",
      answerSubmissionId: "submission-1",
      rootAttemptId: "attempt-root-1",
      parentAttemptId: null,
      predecessorReviewId: null,
    },
    idempotency: {
      key: "review:learner-1:answer-1",
      inputFingerprint: "b".repeat(64),
      fingerprintScope: S233_INPUT_FINGERPRINT_SCOPE,
      fingerprintedRevealEventId: "reveal-none-1",
      status: "completed",
    },
    stageStatus: {
      overall: "completed",
      deterministicChecks: "completed",
      primaryGrader: "completed",
      conditionalCritic: "not_required",
      persistence: "completed",
      failureStage: null,
    },
    queueTodayLinkage: {
      status: "queue_and_today_linked",
      reviewQueueItemId: "queue-item-1",
      todayPlanTaskId: "today-task-1",
    },
    authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
    dataBoundary: {
      learnerMaterialInIdentity: false,
      learnerMaterialInTelemetry: false,
      globalReferenceWrite: false,
      modelTrainingUse: false,
      metadataOnly: true,
      containsRawContent: false,
    },
    ...overrides,
  };
}

function detectedEvidence(overrides = {}) {
  return {
    schemaVersion: S233_EVIDENCE_STATE_SCHEMA_VERSION,
    evidenceStateId: "evidence-state-1",
    learnerOwnerRefId: "learner-1",
    learnerReviewId: "review-1",
    conceptNodeId: "concept-law-1",
    state: "detected",
    emitter: "lane_a",
    initialDetectionEventId: "controller-event-1",
    evidenceEventId: "controller-event-1",
    predecessorEvidenceStateId: null,
    evidenceKind: "initial_evaluation",
    outcome: "incorrect",
    proofRefIds: ["controller-event-1", "finding-law-1"],
    assistanceLevel: "none",
    answerExposure: "none",
    variantFamilyId: null,
    variantDistance: null,
    elapsedTimeMs: 120000,
    observedAt: "2026-07-21T04:00:00.000Z",
    actualLaterEvidenceObserved: false,
    containsRawContent: false,
    ...overrides,
  };
}

function controllerEvent(overrides = {}) {
  return {
    eventVersion: S233_CONTROLLER_EVENT_VERSION,
    eventId: "controller-event-1",
    idempotencyKey: "controller:learner-1:event-1",
    learnerOwnerRefId: "learner-1",
    learnerReviewId: "review-1",
    conceptNodeId: "concept-law-1",
    occurredAt: "2026-07-21T04:00:00.000Z",
    elapsedTimeMs: 120000,
    confidence: "high",
    assistanceLevel: "none",
    answerExposure: "none",
    inputModality: "typed",
    variantFamilyId: null,
    variantDistance: null,
    sessionPosition: 0,
    sourceUncertaintyCodes: [],
    evaluatorUncertaintyCodes: [],
    outcome: "incorrect",
    outcomeProofRefIds: ["finding-law-1"],
    predecessorEventId: null,
    successorEventId: null,
    metadataOnly: true,
    containsRawContent: false,
    ...overrides,
  };
}

function correctedEvidence(overrides = {}) {
  return detectedEvidence({
    evidenceStateId: "evidence-state-2",
    state: "corrected",
    initialDetectionEventId: "controller-event-1",
    evidenceEventId: "controller-event-2",
    predecessorEvidenceStateId: "evidence-state-1",
    evidenceKind: "verified_correction",
    outcome: "correct",
    proofRefIds: ["controller-event-2", "finding-law-2"],
    assistanceLevel: "hint",
    answerExposure: "partial",
    elapsedTimeMs: 90000,
    observedAt: "2026-07-21T05:00:00.000Z",
    ...overrides,
  });
}

function correctedController(overrides = {}) {
  return controllerEvent({
    eventId: "controller-event-2",
    idempotencyKey: "controller:learner-1:event-2",
    occurredAt: "2026-07-21T05:00:00.000Z",
    elapsedTimeMs: 90000,
    assistanceLevel: "hint",
    answerExposure: "partial",
    outcome: "correct",
    outcomeProofRefIds: ["finding-law-2"],
    predecessorEventId: "controller-event-1",
    sessionPosition: 1,
    ...overrides,
  });
}

function cascadeTrace(overrides = {}) {
  return {
    traceId: "cascade-trace-1",
    cascadeVersion: S233_AI_CASCADE_VERSION,
    learnerOwnerRefId: "learner-1",
    learnerReviewId: "review-1",
    answerSubmissionId: "submission-1",
    inputVersionId: "input-version-1",
    inputFingerprintSha256: "b".repeat(64),
    answerPackId: "answer-pack-law-golden-1",
    answerPackVersion: "1.0.0",
    sourceSnapshotId: "snapshot-law-1",
    deterministicChecks: {
      status: "passed",
      checkIds: ["schema-check-1", "owner-check-1"],
      blockerCodes: [],
    },
    primarySubjectGrader: {
      subject: "law",
      status: "completed",
      modelVersion: "primary-law-grader.v1",
      promptVersion: "primary-law-prompt.v1",
      findingIds: ["finding-law-1"],
      criticalFindingIds: [],
      uncertaintyCodes: [],
      graderDisagreementDetected: false,
    },
    conditionalCritic: {
      status: "not_required",
      triggerReasons: [],
      modelVersion: null,
      promptVersion: null,
      unresolvedCodes: [],
    },
    finalDisposition: "evaluated",
    humanApproval: { requested: false, required: false, received: false },
    authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
    ...overrides,
  };
}

function outcomeProof(overrides = {}) {
  return {
    proofRefId: "finding-law-1",
    kind: "scoring_finding",
    learnerOwnerRefId: "learner-1",
    learnerReviewId: "review-1",
    conceptNodeId: "concept-law-1",
    controllerEventId: "controller-event-1",
    outcome: "incorrect",
    variantTaskId: "variant-task-law-1",
    variantFamilyId: null,
    variantDistance: null,
    observedAt: "2026-07-21T04:00:00.000Z",
    persistenceReceiptId: "persistence-receipt-event-1",
    immutable: true,
    containsRawContent: false,
    ...overrides,
  };
}

function trustedScoringContext(findingBundles) {
  const skillsById = new Map();
  const rubricById = new Map();
  for (const bundle of findingBundles) {
    for (const binding of bundle.ontologySkillBindings) {
      skillsById.set(binding.skill.skillId, clone(binding.skill));
    }
    for (const binding of bundle.rubricAnchorBindings) {
      rubricById.set(binding.rubricAnchorId, {
        rubricAnchorId: binding.rubricAnchorId,
        subject: binding.subject,
        skillId: binding.skillId,
      });
    }
  }
  return {
    contextVersion: S233_TRUSTED_SCORING_CONTEXT_VERSION,
    ontologyAdapterVersion: "s233.canonical_ontology_adapter.v1",
    rubricAdapterVersion: "s233.s205_rubric_adapter.v1",
    ontologyVersion: S233_SCORING_ONTOLOGY_VERSION,
    rubricVersion: S233_REUSED_CONTRACT_VERSIONS.s205RubricEvidence,
    snapshotReceiptId: "trusted-scoring-snapshot-receipt-1",
    canonicalSkills: [...skillsById.values()],
    rubricAnchors: [...rubricById.values()],
  };
}

function calmEvaluationContext() {
  const calmSkill = skill({
    skillId: "skill-law-calm-1",
    critical: false,
    severity: "moderate",
    deductionGroup: {
      groupId: "deduction-law-calm-1",
      nonOverlap: true,
      doubleDeductionAllowed: false,
    },
  });
  const calmFinding = finding({
    skillId: "skill-law-calm-1",
    status: "met",
    confidence: { level: "high", uncertaintyCodes: [] },
  });
  const bundle = {
    trace: cascadeTrace(),
    findings: [calmFinding],
    skills: [calmSkill],
    deterministicFindingCheckResults: [],
  };
  const groundedFinding = findingBundle({ finding: calmFinding, skill: calmSkill });
  return {
    review: learnerReview(),
    requestContext: {
      authenticatedLearnerOwnerRefId: "learner-1",
      requestIdempotencyKey: "review:learner-1:answer-1",
      computedInputFingerprintSha256: "b".repeat(64),
    },
    cascadeBundle: bundle,
    answerPack: answerPack(),
    answerPackRegistryContext: answerPackContext(),
    trustedScoringContext: trustedScoringContext([groundedFinding]),
    findingBundles: [groundedFinding],
  };
}

function manifest(lane, entries, additiveMigrationReviewId = null) {
  return {
    contractVersion: S233_PARALLEL_EXECUTION_CONTRACT_VERSION,
    lane,
    baseMergeSha: BASE_SHA,
    headSha: HEAD_SHA,
    entries,
    additiveMigrationReviewId,
  };
}

function addedEntry(path, content = "c".repeat(64)) {
  return {
    path,
    changeKind: "added",
    gitMode: "100644",
    contentSha256: content,
    baseBlobSha256: null,
  };
}

function validateManifest(value, trustedMigrationReview = null) {
  return validateS233LaneChangeManifest(value, BASE_SHA, {
    baseMergeSha: value.baseMergeSha,
    headSha: value.headSha,
    mergeBaseSha: value.baseMergeSha,
    baseIsAncestor: true,
    entries: clone(value.entries),
  }, trustedMigrationReview);
}

test("freezes exact versions, states, and reused contract pins", () => {
  assert.equal(S233_PARALLEL_EXECUTION_CONTRACT_VERSION, "s233.parallel_execution_contract.v1");
  assert.deepEqual(S233_FINDING_STATUSES, ["met", "partial", "missing", "incorrect", "not_assessable"]);
  assert.deepEqual(S233_LANE_A_EMITTABLE_EVIDENCE_STATES, ["detected", "corrected", "uncertain"]);
  assert.deepEqual(S233_LATER_EVIDENCE_STATES, ["retained", "near_transferred", "far_transferred", "timed_stable"]);
  assert.equal(
    S233_INPUT_FINGERPRINT_SCOPE,
    "s233.owner_submission_input_digest_pack_ontology_rubric_source_evaluator_schema_exposure.v1",
  );
  assert.ok(S233_INPUT_FINGERPRINT_FIELDS.includes("normalizedLearnerInputSha256"));
  assert.deepEqual(S233_REUSED_CONTRACT_VERSIONS, {
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
  });
});

test("validates versioned scoring-skill identity and rejects overlap or open schema", () => {
  assert.equal(validateS233ScoringSkillIdentity(skill()).valid, true);
  assert.equal(validateS233ScoringSkillIdentity(skill({ parentSkillIds: ["skill-law-issue-1"] })).valid, false);
  assert.equal(validateS233ScoringSkillIdentity({ ...skill(), notes: "private learner prose" }).valid, false);
});

test("validates findings structurally and rejects privacy/authority smuggling", () => {
  assert.equal(validateS233ScoringFinding(finding()).valid, true);
  assert.equal(validateS233ScoringFinding({ ...finding(), officialScoreClaimed: true }).valid, false);
  const prose = finding();
  prose.provenance.provenanceRefId = "The learner disclosed a private medical condition";
  assert.equal(validateS233ScoringFinding(prose).valid, false);
  const notAssessable = finding({
    status: "not_assessable",
    learnerEvidenceLocator: null,
    sourceAnchorIds: [],
    rubricAnchorIds: [],
    evidenceRequirementBindings: [],
    confidence: { level: "low", uncertaintyCodes: ["learner_input_missing"] },
    abstentionReason: "learner_evidence_missing",
  });
  assert.equal(validateS233ScoringFinding(notAssessable).valid, true);
  const malformedLocator = clone(notAssessable);
  malformedLocator.abstentionReason = "source_unresolved";
  malformedLocator.learnerEvidenceLocator = { answerSubmissionId: "submission-1", notes: "secret" };
  assert.equal(validateS233ScoringFinding(malformedLocator).valid, false);
  const wholeAnswerMet = finding({
    status: "met",
    learnerEvidenceLocator: {
      answerSubmissionId: "submission-1",
      inputVersionId: "input-version-1",
      wholeAnswer: true,
      containsRawContent: false,
    },
    confidence: { level: "high", uncertaintyCodes: [] },
  });
  assert.equal(validateS233ScoringFinding(wholeAnswerMet).valid, false);
});

test("grounds findings against skill, learner input, anchors, and provenance context", () => {
  assert.equal(validateS233ScoringFindingBundle(findingBundle()).valid, true);
  const unknownAnchor = findingBundle();
  unknownAnchor.finding.sourceAnchorIds = ["source-invented-1"];
  assert.equal(validateS233ScoringFindingBundle(unknownAnchor).valid, false);
  const wrongInput = findingBundle({ expectedInputVersionId: "input-version-2" });
  assert.equal(validateS233ScoringFindingBundle(wrongInput).valid, false);
  const duplicateSourceBinding = findingBundle();
  duplicateSourceBinding.sourceAnchorBindings.unshift({
    sourceAnchorId: "source-law-1",
    sourceId: "source-law-1",
    sourceSnapshotId: "snapshot-law-1",
    answerPackId: "answer-pack-law-golden-1",
    answerPackVersion: "1.0.0",
    subject: "theory",
    taskArchetype: "theory.issue_rule_application.v1",
  });
  assert.equal(validateS233ScoringFindingBundle(duplicateSourceBinding).valid, false);
  const downgradedCanonicalSkill = findingBundle();
  downgradedCanonicalSkill.skill.critical = false;
  downgradedCanonicalSkill.skill.severity = "moderate";
  assert.equal(validateS233ScoringFindingBundle(downgradedCanonicalSkill).valid, false);
  const missingRequirement = findingBundle();
  delete missingRequirement.finding.learnerEvidenceLocator.segmentId;
  assert.equal(validateS233ScoringFindingBundle(missingRequirement).valid, false);

  const optionalSkill = skill({
    evidenceRequirements: skill().evidenceRequirements.map((requirement, index) =>
      index === 0 ? { ...requirement, required: false } : requirement,
    ),
  });
  const forgedOptionalEvidence = finding();
  forgedOptionalEvidence.evidenceRequirementBindings[0].evidenceRefIds = ["forged-segment"];
  assert.equal(
    validateS233ScoringFindingBundle(
      findingBundle({ finding: forgedOptionalEvidence, skill: optionalSkill }),
    ).valid,
    false,
  );

  const unknownAbstentionBinding = finding({
    status: "not_assessable",
    learnerEvidenceLocator: null,
    sourceAnchorIds: [],
    rubricAnchorIds: [],
    evidenceRequirementBindings: [
      { requirementId: "totally-unknown", evidenceRefIds: [] },
    ],
    confidence: { level: "low", uncertaintyCodes: ["evaluator_uncertain"] },
    abstentionReason: "evaluator_uncertain",
  });
  assert.equal(
    validateS233ScoringFindingBundle(
      findingBundle({ finding: unknownAbstentionBinding }),
    ).valid,
    false,
  );

  const wholeAnswerMissingFinding = finding({
    status: "missing",
    learnerEvidenceLocator: {
      answerSubmissionId: "submission-1",
      inputVersionId: "input-version-1",
      wholeAnswer: true,
      containsRawContent: false,
    },
    evidenceRequirementBindings: [
      {
        requirementId: "requirement-learner-segment",
        evidenceRefIds: ["submission-1"],
      },
      {
        requirementId: "requirement-law-source",
        evidenceRefIds: ["source-law-1"],
      },
      {
        requirementId: "requirement-law-rubric",
        evidenceRefIds: ["rubric-law-issue-1"],
      },
    ],
  });
  assert.equal(
    validateS233ScoringFindingBundle(
      findingBundle({ finding: wholeAnswerMissingFinding }),
    ).valid,
    true,
  );
});

test("validates immutable Answer Pack 2.0 release identity and registry grounding", () => {
  assert.equal(validateS233AnswerPackIdentity(answerPack()).valid, true);
  assert.equal(validateS233AnswerPackRegistryContext(answerPack(), answerPackContext()).valid, true);
  const unknownLaw = answerPackContext({ lawVersionRecords: [] });
  assert.equal(validateS233AnswerPackRegistryContext(answerPack(), unknownLaw).valid, false);
  const blockedGate = answerPackContext();
  blockedGate.s215GateRecords[0].status = "blocked";
  blockedGate.s215GateRecords[0].unresolvedBlockerCodes = ["critic_disagreement"];
  assert.equal(validateS233AnswerPackRegistryContext(answerPack(), blockedGate).valid, false);
});

test("rejects fabricated Answer Pack verification, timestamps, and learner content", () => {
  const blockedLaw = answerPack();
  blockedLaw.snapshot.lawVersionStatus = "blocked";
  assert.equal(validateS233AnswerPackIdentity(blockedLaw).valid, false);

  const unresolvedRights = answerPack();
  unresolvedRights.snapshot.rightsStatuses = ["needs_legal_review"];
  assert.equal(validateS233AnswerPackIdentity(unresolvedRights).valid, false);

  const contradictionsOnly = answerPack();
  contradictionsOnly.claimSourceGraph.edges = contradictionsOnly.claimSourceGraph.edges.map((edge) => ({ ...edge, relation: "contradicts" }));
  assert.equal(validateS233AnswerPackIdentity(contradictionsOnly).valid, false);

  const inventedTransform = answerPack();
  inventedTransform.transformationProvenance[0].kind = "expert_magic";
  assert.equal(validateS233AnswerPackIdentity(inventedTransform).valid, false);

  const looseTimestamp = answerPack();
  looseTimestamp.snapshot.capturedAt = "1";
  assert.equal(validateS233AnswerPackIdentity(looseTimestamp).valid, false);

  const impossibleDate = answerPack();
  impossibleDate.snapshot.capturedAt = "2026-02-31T03:00:00.000Z";
  assert.equal(validateS233AnswerPackIdentity(impossibleDate).valid, false);

  const incompleteRelease = answerPack();
  for (const step of incompleteRelease.transformationProvenance) {
    step.outputClaimIds = ["claim-law-1"];
  }
  assert.equal(validateS233AnswerPackIdentity(incompleteRelease).valid, false);

  const reversedRelease = answerPack();
  reversedRelease.transformationProvenance[0].transformedAt = "2026-07-21T03:03:00.000Z";
  reversedRelease.transformationProvenance[1].transformedAt = "2026-07-21T03:02:00.000Z";
  reversedRelease.transformationProvenance[2].transformedAt = "2026-07-21T03:01:00.000Z";
  assert.equal(validateS233AnswerPackIdentity(reversedRelease).valid, false);

  const learnerContent = answerPack();
  learnerContent.learnerContentPolicy = { allowed: true, included: true, sourceIds: ["learner-answer-1"] };
  assert.equal(validateS233AnswerPackIdentity(learnerContent).valid, false);
});

test("requires S214/S215 release proof only for verified learning references", () => {
  const missingProof = answerPack({ releaseProof: null });
  assert.equal(validateS233AnswerPackIdentity(missingProof).valid, false);

  const draft = answerPack({
    verificationStatus: "expert_unreviewed_ai_draft",
    releaseProof: null,
    transformationProvenance: [
      {
        provenanceId: "provenance-ai-draft-1",
        kind: "ai_generation",
        inputRefIds: ["snapshot-law-1"],
        outputClaimIds: ["claim-law-1", "claim-law-2"],
        modelVersion: "draft-model.v1",
        promptVersion: "draft-prompt.v1",
        schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
        transformedAt: "2026-07-21T03:01:00.000Z",
        providerPayloadStored: false,
        learnerContentUsed: false,
      },
    ],
  });
  assert.equal(validateS233AnswerPackIdentity(draft).valid, true);
});

test("validates learner-owned identity only with authenticated request context", () => {
  const review = learnerReview();
  assert.equal(validateS233LearnerAnswerReviewIdentity(review).valid, true);
  assert.equal(
    validateS233LearnerReviewRequestContext(review, {
      authenticatedLearnerOwnerRefId: "learner-1",
      requestIdempotencyKey: "review:learner-1:answer-1",
      computedInputFingerprintSha256: "b".repeat(64),
    }).valid,
    true,
  );
  assert.equal(
    validateS233LearnerReviewRequestContext(review, {
      authenticatedLearnerOwnerRefId: "learner-2",
      requestIdempotencyKey: "review:learner-1:answer-1",
      computedInputFingerprintSha256: "b".repeat(64),
    }).valid,
    false,
  );
});

test("rejects impossible rewrite lineage, stage order, and weak idempotency", () => {
  const weakDigest = learnerReview();
  weakDigest.idempotency.inputFingerprint = "fingerprint-1";
  assert.equal(validateS233LearnerAnswerReviewIdentity(weakDigest).valid, false);

  const lateWithoutPredecessor = learnerReview({
    attemptId: "attempt-rewrite-2",
    attemptVersion: 2,
    rewriteRegradeLineage: {
      ...learnerReview().rewriteRegradeLineage,
      parentAttemptId: null,
      predecessorReviewId: null,
    },
  });
  assert.equal(validateS233LearnerAnswerReviewIdentity(lateWithoutPredecessor).valid, false);

  const outOfOrder = learnerReview();
  outOfOrder.idempotency.status = "claimed";
  outOfOrder.stageStatus = {
    overall: "partial",
    deterministicChecks: "pending",
    primaryGrader: "completed",
    conditionalCritic: "not_required",
    persistence: "pending",
    failureStage: null,
  };
  assert.equal(validateS233LearnerAnswerReviewIdentity(outOfOrder).valid, false);

  const primaryAbstainedWithoutCritic = learnerReview();
  primaryAbstainedWithoutCritic.stageStatus = {
    overall: "abstained",
    deterministicChecks: "completed",
    primaryGrader: "abstained",
    conditionalCritic: "not_required",
    persistence: "completed",
    failureStage: null,
  };
  assert.equal(
    validateS233LearnerAnswerReviewIdentity(primaryAbstainedWithoutCritic).valid,
    false,
  );
});

test("requires compare-and-swap review revisions and append-only exposure history", () => {
  const partial = learnerReview({
    reviewRecordVersion: 1,
    expectedPreviousReviewRecordVersion: null,
    versions: {
      ...learnerReview().versions,
      criticModelVersion: "critic-law-model.v1",
      criticPromptVersion: "critic-law-prompt.v1",
    },
    idempotency: {
      ...learnerReview().idempotency,
      status: "claimed",
    },
    stageStatus: {
      overall: "partial",
      deterministicChecks: "completed",
      primaryGrader: "completed",
      conditionalCritic: "pending",
      persistence: "pending",
      failureStage: null,
    },
  });
  assert.equal(validateS233LearnerReviewTransition(null, partial).valid, true);

  const completed = learnerReview({
    reviewRecordVersion: 2,
    expectedPreviousReviewRecordVersion: 1,
    versions: clone(partial.versions),
    stageStatus: clone(learnerReview().stageStatus),
  });
  assert.equal(validateS233LearnerReviewTransition(partial, completed).valid, true);

  const stale = clone(completed);
  stale.expectedPreviousReviewRecordVersion = 0;
  assert.equal(validateS233LearnerReviewTransition(partial, stale).valid, false);

  const terminalMutation = clone(completed);
  terminalMutation.reviewRecordVersion = 3;
  terminalMutation.expectedPreviousReviewRecordVersion = 2;
  assert.equal(validateS233LearnerReviewTransition(completed, terminalMutation).valid, false);

  const rewrittenReveal = clone(completed);
  rewrittenReveal.revealHistory[0].exposure = "full";
  rewrittenReveal.revealHistory[0].answerLevel = "L3_annotated_reasoning";
  assert.equal(validateS233LearnerReviewTransition(partial, rewrittenReveal).valid, false);

  const appendedReveal = clone(partial);
  appendedReveal.reviewRecordVersion = 2;
  appendedReveal.expectedPreviousReviewRecordVersion = 1;
  appendedReveal.revealHistory.push({
    eventId: "reveal-outline-2",
    occurredAt: "2026-07-21T03:06:00.000Z",
    exposure: "outline",
    answerLevel: "L1_recall_outline",
    deliberateLearnerOverride: true,
  });
  assert.equal(validateS233LearnerReviewTransition(partial, appendedReveal).valid, true);

  const progressed = clone(partial);
  progressed.stageStatus.conditionalCritic = "completed";
  const regressed = clone(progressed);
  regressed.reviewRecordVersion = 2;
  regressed.expectedPreviousReviewRecordVersion = 1;
  regressed.stageStatus.primaryGrader = "pending";
  regressed.stageStatus.conditionalCritic = "pending";
  assert.equal(validateS233LearnerReviewTransition(progressed, regressed).valid, false);
});

test("allows only structural detected/uncertain evidence without proof bundle", () => {
  assert.equal(validateS233EvidenceStateRecord(detectedEvidence()).valid, true);
  assert.equal(validateS233EvidenceStateRecord(correctedEvidence()).valid, false);
  const forgedLater = correctedEvidence({
    state: "retained",
    emitter: "later_evidence",
    evidenceKind: "delayed_unassisted_retrieval",
    assistanceLevel: "none",
    answerExposure: "none",
    actualLaterEvidenceObserved: true,
  });
  assert.equal(validateS233EvidenceStateRecord(forgedLater).valid, false);
});

test("proves corrected and later evidence against owner-bound controller lineage", () => {
  const corrected = correctedEvidence();
  const correctedBundle = {
    record: corrected,
    predecessor: detectedEvidence(),
    controllerEvent: correctedController(),
    controllerEventPersistenceReceiptId: "persistence-receipt-event-2",
    predecessorStatePersistenceReceiptId: "persistence-receipt-event-1",
    authenticatedLearnerOwnerRefId: "learner-1",
    trustedOutcomeProofRecords: [
      outcomeProof(),
      outcomeProof({
        proofRefId: "finding-law-2",
        kind: "rewrite_verification",
        controllerEventId: "controller-event-2",
        outcome: "correct",
        variantTaskId: "variant-task-law-rewrite-1",
        observedAt: "2026-07-21T05:00:00.000Z",
        persistenceReceiptId: "persistence-receipt-event-2",
      }),
    ],
  };
  assert.equal(validateS233EvidenceProofBundle(correctedBundle).valid, true);
  assert.equal(validateS233LaneAEvidenceProofBundle(correctedBundle).valid, true);

  const retained = correctedEvidence({
    evidenceStateId: "evidence-state-3",
    state: "retained",
    emitter: "later_evidence",
    evidenceEventId: "controller-event-3",
    predecessorEvidenceStateId: "evidence-state-2",
    evidenceKind: "delayed_unassisted_retrieval",
    proofRefIds: ["controller-event-3", "retrieval-result-1"],
    assistanceLevel: "none",
    answerExposure: "none",
    elapsedTimeMs: 80000,
    observedAt: "2026-07-22T05:00:00.000Z",
    actualLaterEvidenceObserved: true,
  });
  const retainedEvent = correctedController({
    eventId: "controller-event-3",
    idempotencyKey: "controller:learner-1:event-3",
    occurredAt: "2026-07-22T05:00:00.000Z",
    elapsedTimeMs: 80000,
    assistanceLevel: "none",
    answerExposure: "none",
    outcomeProofRefIds: ["retrieval-result-1"],
    predecessorEventId: "controller-event-2",
    sessionPosition: 2,
  });
  const retainedBundle = {
    record: retained,
    predecessor: corrected,
    controllerEvent: retainedEvent,
    controllerEventPersistenceReceiptId: "persistence-receipt-event-3",
    predecessorStatePersistenceReceiptId: "persistence-receipt-event-2",
    authenticatedLearnerOwnerRefId: "learner-1",
    trustedOutcomeProofRecords: [
      outcomeProof({
        proofRefId: "finding-law-2",
        kind: "rewrite_verification",
        controllerEventId: "controller-event-2",
        outcome: "correct",
        variantTaskId: "variant-task-law-rewrite-1",
        observedAt: "2026-07-21T05:00:00.000Z",
        persistenceReceiptId: "persistence-receipt-event-2",
      }),
      outcomeProof({
        proofRefId: "retrieval-result-1",
        kind: "retrieval_result",
        controllerEventId: "controller-event-3",
        outcome: "correct",
        variantTaskId: "variant-task-law-retention-1",
        observedAt: "2026-07-22T05:00:00.000Z",
        persistenceReceiptId: "persistence-receipt-event-3",
      }),
    ],
  };
  assert.equal(validateS233EvidenceProofBundle(retainedBundle).valid, true);
  assert.equal(validateS233LaneAEvidenceProofBundle(retainedBundle).valid, false);

  const forgedOwner = clone(retainedBundle);
  forgedOwner.controllerEvent.learnerOwnerRefId = "learner-2";
  assert.equal(validateS233EvidenceProofBundle(forgedOwner).valid, false);
  const missingProof = clone(retainedBundle);
  missingProof.record.proofRefIds = ["controller-event-3"];
  assert.equal(validateS233EvidenceProofBundle(missingProof).valid, false);

  const reusedTransferTask = clone(retainedBundle);
  reusedTransferTask.record.state = "near_transferred";
  reusedTransferTask.record.evidenceKind = "near_variant_transfer";
  reusedTransferTask.record.variantFamilyId = "variant-family-law-1";
  reusedTransferTask.record.variantDistance = "near";
  reusedTransferTask.controllerEvent.variantFamilyId = "variant-family-law-1";
  reusedTransferTask.controllerEvent.variantDistance = "near";
  reusedTransferTask.trustedOutcomeProofRecords[1].kind = "transfer_result";
  reusedTransferTask.trustedOutcomeProofRecords[1].variantFamilyId = "variant-family-law-1";
  reusedTransferTask.trustedOutcomeProofRecords[1].variantDistance = "near";
  reusedTransferTask.trustedOutcomeProofRecords[1].variantTaskId =
    "variant-task-law-rewrite-1";
  assert.equal(validateS233EvidenceProofBundle(reusedTransferTask).valid, false);
  reusedTransferTask.trustedOutcomeProofRecords[1].variantTaskId =
    "variant-task-law-transfer-1";
  assert.equal(validateS233EvidenceProofBundle(reusedTransferTask).valid, true);
});

test("validates all future-controller fields and rejects open/raw schemas", () => {
  assert.equal(validateS233FutureControllerEvent(controllerEvent()).valid, true);
  assert.equal(validateS233FutureControllerEvent({ ...controllerEvent(), notes: "learner private prose" }).valid, false);
  assert.equal(validateS233FutureControllerEvent({ ...controllerEvent(), outcomeProofRefIds: [] }).valid, false);
});

test("enforces deterministic-primary-conditional-critic-abstention cascade", () => {
  assert.equal(validateS233AiEvaluationCascadeTrace(cascadeTrace()).valid, true);
  const passedWithBlocker = cascadeTrace();
  passedWithBlocker.deterministicChecks.blockerCodes = ["learner_owner_failed"];
  assert.equal(validateS233AiEvaluationCascadeTrace(passedWithBlocker).valid, false);
  const zeroFindings = cascadeTrace();
  zeroFindings.primarySubjectGrader.findingIds = [];
  assert.equal(validateS233AiEvaluationCascadeTrace(zeroFindings).valid, false);
  const humanGrade = { ...cascadeTrace(), humanGrade: { approved: true } };
  assert.equal(validateS233AiEvaluationCascadeTrace(humanGrade).valid, false);
  const lowWithoutUncertainty = finding({
    status: "met",
    confidence: { level: "low", uncertaintyCodes: [] },
  });
  assert.equal(validateS233ScoringFinding(lowWithoutUncertainty).valid, false);
});

test("derives critic triggers from actual findings and skill criticality", () => {
  const calmSkill = skill({
    skillId: "skill-law-calm-cascade",
    critical: false,
    severity: "moderate",
    deductionGroup: {
      groupId: "deduction-law-calm-cascade",
      nonOverlap: true,
      doubleDeductionAllowed: false,
    },
  });
  const calmFinding = finding({
    skillId: "skill-law-calm-cascade",
    status: "met",
    confidence: { level: "high", uncertaintyCodes: [] },
  });
  assert.equal(
    validateS233AiEvaluationCascadeBundle({
      trace: cascadeTrace(),
      findings: [calmFinding],
      skills: [calmSkill],
      deterministicFindingCheckResults: [],
    }).valid,
    true,
  );

  const criticalTrace = cascadeTrace();
  criticalTrace.primarySubjectGrader.criticalFindingIds = ["finding-law-1"];
  criticalTrace.primarySubjectGrader.uncertaintyCodes = ["application_link_partial"];
  criticalTrace.conditionalCritic = {
    status: "completed",
    triggerReasons: ["critical_finding", "uncertainty"],
    modelVersion: "critic-law-model.v1",
    promptVersion: "critic-law-prompt.v1",
    unresolvedCodes: [],
  };
  assert.equal(
    validateS233AiEvaluationCascadeBundle({
      trace: criticalTrace,
      findings: [finding()],
      skills: [skill()],
      deterministicFindingCheckResults: [],
    }).valid,
    true,
  );
  criticalTrace.primarySubjectGrader.criticalFindingIds = [];
  assert.equal(
    validateS233AiEvaluationCascadeBundle({
      trace: criticalTrace,
      findings: [finding()],
      skills: [skill()],
      deterministicFindingCheckResults: [],
    }).valid,
    false,
  );

  const disagreementSkill = skill({
    skillId: "skill-law-disagreement-1",
    critical: false,
    severity: "moderate",
    deductionGroup: {
      groupId: "deduction-law-disagreement-1",
      nonOverlap: true,
      doubleDeductionAllowed: false,
    },
  });
  const disagreementFinding = finding({
    skillId: "skill-law-disagreement-1",
    status: "met",
    confidence: { level: "high", uncertaintyCodes: [] },
  });
  const disagreementTrace = cascadeTrace();
  disagreementTrace.primarySubjectGrader.graderDisagreementDetected = true;
  disagreementTrace.conditionalCritic = {
    status: "completed",
    triggerReasons: ["grader_disagreement"],
    modelVersion: "critic-law-model.v1",
    promptVersion: "critic-law-prompt.v1",
    unresolvedCodes: [],
  };
  const disagreementBundle = {
    trace: disagreementTrace,
    findings: [disagreementFinding],
    skills: [disagreementSkill],
    deterministicFindingCheckResults: [
      {
        checkResultId: "deterministic-check-result-1",
        checkId: "schema-check-1",
        findingId: "finding-law-1",
        deterministicStatus: "missing",
        persistenceReceiptId: "deterministic-check-receipt-1",
        immutable: true,
        containsRawContent: false,
      },
    ],
  };
  assert.equal(validateS233AiEvaluationCascadeBundle(disagreementBundle).valid, true);
  disagreementBundle.deterministicFindingCheckResults = [];
  assert.equal(validateS233AiEvaluationCascadeBundle(disagreementBundle).valid, false);
});

test("binds persisted learner review versions and stages to the actual cascade", () => {
  const calmContext = calmEvaluationContext();
  assert.equal(validateS233LearnerReviewEvaluationContext(calmContext).valid, true);

  const wrongTrace = clone(calmContext);
  wrongTrace.cascadeBundle.trace.traceId = "cascade-trace-other";
  assert.equal(validateS233LearnerReviewEvaluationContext(wrongTrace).valid, false);

  const wrongPack = clone(calmContext);
  wrongPack.cascadeBundle.trace.answerPackVersion = "2.0.0";
  assert.equal(validateS233LearnerReviewEvaluationContext(wrongPack).valid, false);

  const extraCascadeSkill = clone(calmContext);
  extraCascadeSkill.cascadeBundle.skills.push(
    skill({
      skillId: "skill-law-unused-1",
      parentSkillIds: [],
      prerequisiteSkillIds: [],
      critical: false,
      severity: "moderate",
      deductionGroup: {
        groupId: "deduction-law-unused-1",
        nonOverlap: true,
        doubleDeductionAllowed: false,
      },
    }),
  );
  assert.equal(validateS233LearnerReviewEvaluationContext(extraCascadeSkill).valid, false);

  const ungroundedFinding = clone(calmContext);
  ungroundedFinding.findingBundles[0].expectedInputVersionId = "input-version-other";
  assert.equal(validateS233LearnerReviewEvaluationContext(ungroundedFinding).valid, false);

  const locallyForgedGrounding = clone(calmContext);
  const forgedBundle = locallyForgedGrounding.findingBundles[0];
  forgedBundle.finding.sourceAnchorIds = ["source-invented-1"];
  forgedBundle.finding.rubricAnchorIds = ["rubric-invented-1"];
  forgedBundle.finding.provenance.provenanceRefId = "evaluation-invented-1";
  forgedBundle.finding.evidenceRequirementBindings[1].evidenceRefIds = ["source-invented-1"];
  forgedBundle.finding.evidenceRequirementBindings[2].evidenceRefIds = ["rubric-invented-1"];
  forgedBundle.sourceAnchorBindings[0].sourceAnchorId = "source-invented-1";
  forgedBundle.rubricAnchorBindings[0].rubricAnchorId = "rubric-invented-1";
  forgedBundle.provenanceBindings[0].provenanceRefId = "evaluation-invented-1";
  locallyForgedGrounding.cascadeBundle.findings[0] = clone(forgedBundle.finding);
  assert.equal(validateS233ScoringFindingBundle(forgedBundle).valid, true);
  assert.equal(validateS233LearnerReviewEvaluationContext(locallyForgedGrounding).valid, false);

  const forgedOntology = clone(calmContext);
  forgedOntology.findingBundles[0].skill.remediationActionType = "retry";
  forgedOntology.findingBundles[0].ontologySkillBindings[0].skill.remediationActionType = "retry";
  forgedOntology.cascadeBundle.skills[0].remediationActionType = "retry";
  assert.equal(validateS233ScoringFindingBundle(forgedOntology.findingBundles[0]).valid, true);
  assert.equal(validateS233LearnerReviewEvaluationContext(forgedOntology).valid, false);

  const forgedOwner = clone(calmContext);
  forgedOwner.review.learnerOwnerRefId = "learner-victim";
  forgedOwner.cascadeBundle.trace.learnerOwnerRefId = "learner-victim";
  forgedOwner.review.idempotency.key = "review:learner-victim:answer-1";
  assert.equal(validateS233LearnerReviewEvaluationContext(forgedOwner).valid, false);

  const calmSkill = skill({
    skillId: "skill-law-uncertain-1",
    critical: false,
    severity: "moderate",
    deductionGroup: {
      groupId: "deduction-law-uncertain-1",
      nonOverlap: true,
      doubleDeductionAllowed: false,
    },
  });
  const uncertainFinding = finding({
    skillId: "skill-law-uncertain-1",
    status: "not_assessable",
    learnerEvidenceLocator: null,
    sourceAnchorIds: [],
    rubricAnchorIds: [],
    evidenceRequirementBindings: [],
    confidence: { level: "low", uncertaintyCodes: ["evaluator_uncertain"] },
    abstentionReason: "evaluator_uncertain",
  });
  const abstainedTrace = cascadeTrace();
  abstainedTrace.primarySubjectGrader.status = "abstained";
  abstainedTrace.primarySubjectGrader.uncertaintyCodes = ["evaluator_uncertain"];
  abstainedTrace.conditionalCritic = {
    status: "completed",
    triggerReasons: ["uncertainty"],
    modelVersion: "critic-law-model.v1",
    promptVersion: "critic-law-prompt.v1",
    unresolvedCodes: [],
  };
  abstainedTrace.finalDisposition = "abstained";
  const abstainedReview = learnerReview();
  abstainedReview.versions.criticModelVersion = "critic-law-model.v1";
  abstainedReview.versions.criticPromptVersion = "critic-law-prompt.v1";
  abstainedReview.stageStatus = {
    overall: "abstained",
    deterministicChecks: "completed",
    primaryGrader: "abstained",
    conditionalCritic: "completed",
    persistence: "completed",
    failureStage: null,
  };
  const groundedUncertainFinding = findingBundle({
    finding: uncertainFinding,
    skill: calmSkill,
  });
  assert.equal(
    validateS233LearnerReviewEvaluationContext({
      review: abstainedReview,
      requestContext: {
        authenticatedLearnerOwnerRefId: "learner-1",
        requestIdempotencyKey: "review:learner-1:answer-1",
        computedInputFingerprintSha256: "b".repeat(64),
      },
      cascadeBundle: {
        trace: abstainedTrace,
        findings: [uncertainFinding],
        skills: [calmSkill],
        deterministicFindingCheckResults: [],
      },
      answerPack: answerPack(),
      answerPackRegistryContext: answerPackContext(),
      trustedScoringContext: trustedScoringContext([groundedUncertainFinding]),
      findingBundles: [groundedUncertainFinding],
    }).valid,
    true,
  );
});

test("freezes disjoint ownership and rejects first-round, admin, scheduler, and shared paths", () => {
  assert.equal(validateS233OwnershipBoundary().valid, true);
  assert.ok(S233_FROZEN_SHARED_FILES.includes("lib/review-os/s214-reference-answer-pipeline.ts"));
  assert.equal(validateManifest(manifest("laneA", [addedEntry("lib/review-os/s233a-runtime.ts")])).valid, true);
  assert.equal(validateManifest(manifest("laneB", [addedEntry("scripts/s233b-acquire-official-second.mjs")])).valid, true);
  for (const path of [
    "app/app/first/ox/page.tsx",
    "app/api/os/admin/feed/route.ts",
    "lib/review-os/today-plan-engine.ts",
    "components/review-os/trust-status-card.tsx",
  ]) assert.equal(validateManifest(manifest("laneA", [addedEntry(path)])).valid, false, path);
  assert.equal(
    validateManifest(manifest("laneB", [addedEntry("reference_corpus/question_archive/first/new.json")])).valid,
    false,
  );
  assert.equal(
    validateManifest(
      manifest("laneB", [
        addedEntry("reference_corpus/legal_sources/appraiser_first_round_sources.json"),
      ]),
    ).valid,
    false,
  );
  assert.equal(
    validateManifest(manifest("laneB", [addedEntry("lib/review-os/s214-reference-answer-pipeline.ts")])).valid,
    false,
  );
});

test("requires exact trusted Git diff evidence and rejects deletes, renames, or fake bases", () => {
  const value = manifest("laneA", [addedEntry("lib/review-os/s233a-runtime.ts")]);
  const observed = {
    baseMergeSha: BASE_SHA,
    headSha: HEAD_SHA,
    mergeBaseSha: BASE_SHA,
    baseIsAncestor: true,
    entries: clone(value.entries),
  };
  assert.equal(validateS233LaneChangeManifest(value, BASE_SHA, observed, null).valid, true);
  observed.entries[0].contentSha256 = "d".repeat(64);
  assert.equal(validateS233LaneChangeManifest(value, BASE_SHA, observed, null).valid, false);
  const nonDescendant = { ...observed, entries: clone(value.entries), mergeBaseSha: "3".repeat(40) };
  assert.equal(
    validateS233LaneChangeManifest(value, BASE_SHA, nonDescendant, null).valid,
    false,
  );
  const deleted = manifest("laneA", [{ ...addedEntry("lib/review-os/s233a-runtime.ts"), changeKind: "deleted" }]);
  assert.equal(validateManifest(deleted).valid, false);
  assert.equal(validateS233LaneChangeManifest(value, "3".repeat(40), { ...observed, baseMergeSha: "3".repeat(40) }, null).valid, false);
});

test("permits at most one Git-proven, hash-bound additive Lane A migration", () => {
  const entry = addedEntry("supabase/migrations/202607210930_s233a_review_state.sql", "e".repeat(64));
  const review = {
    reviewId: "sql-additivity-review-1",
    path: entry.path,
    changeKind: "added",
    gitMode: "100644",
    contentSha256: entry.contentSha256,
    reviewVersion: "s233.additive_migration_review.v1",
    validatorId: "trusted_sql_additivity_validator",
    verdict: "additive_only",
    destructiveOperationsDetected: false,
    validationEvidenceRefId: "sql-additivity-report-1",
  };
  assert.equal(validateManifest(manifest("laneA", [entry], review.reviewId), review).valid, true);
  assert.equal(validateManifest(manifest("laneB", [entry], review.reviewId), review).valid, false);
  assert.equal(validateManifest(manifest("laneA", [entry], review.reviewId), null).valid, false);

  const modified = { ...entry, changeKind: "modified", baseBlobSha256: "f".repeat(64) };
  assert.equal(validateManifest(manifest("laneA", [modified], review.reviewId), review).valid, false);
  const nested = { ...entry, path: "supabase/migrations/nested/202607210930_s233a_review_state.sql" };
  assert.equal(validateManifest(manifest("laneA", [nested], review.reviewId), { ...review, path: nested.path }).valid, false);
  const destructive = { ...review, destructiveOperationsDetected: true };
  assert.equal(validateManifest(manifest("laneA", [entry], review.reviewId), destructive).valid, false);
  const second = addedEntry("supabase/migrations/202607210931_s233a_review_event.sql", "9".repeat(64));
  assert.equal(validateManifest(manifest("laneA", [entry, second], review.reviewId), review).valid, false);
});

test("all public validators fail closed without throwing on malformed values", () => {
  const malformed = [null, [], {}, { finding: "wrong" }, { claimSourceGraph: { claimIds: {} } }];
  const unary = [
    validateS233ScoringSkillIdentity,
    validateS233ScoringFinding,
    validateS233ScoringFindingBundle,
    validateS233AnswerPackIdentity,
    validateS233LearnerAnswerReviewIdentity,
    validateS233EvidenceStateRecord,
    validateS233FutureControllerEvent,
    validateS233EvidenceProofBundle,
    validateS233LaneAEvidenceProofBundle,
    validateS233AiEvaluationCascadeTrace,
    validateS233AiEvaluationCascadeBundle,
    validateS233TrustedScoringContext,
    validateS233LearnerReviewEvaluationContext,
  ];
  for (const validator of unary) {
    for (const value of malformed) {
      assert.doesNotThrow(() => validator(value));
      assert.equal(validator(value).valid, false);
    }
  }
  assert.doesNotThrow(() => validateS233AnswerPackRegistryContext(null, null));
  assert.doesNotThrow(() => validateS233LearnerReviewRequestContext(null, null));
  assert.doesNotThrow(() => validateS233LearnerReviewEvaluationContext(null));
  assert.doesNotThrow(() => validateS233LearnerReviewTransition(null, null));
  assert.doesNotThrow(() => validateS233LaneChangeManifest(null, BASE_SHA, null, null));
  const malformedDraft = answerPack({
    verificationStatus: "expert_unreviewed_ai_draft",
    releaseProof: null,
    transformationProvenance: [null],
  });
  assert.doesNotThrow(() => validateS233AnswerPackIdentity(malformedDraft));
  const malformedReview = learnerReview();
  malformedReview.idempotency.key = 1;
  malformedReview.stageStatus = {
    overall: "failed_retryable",
    deterministicChecks: "completed",
    primaryGrader: "completed",
    conditionalCritic: "not_required",
    persistence: "pending",
    failureStage: "invented_stage",
  };
  assert.doesNotThrow(() => validateS233LearnerAnswerReviewIdentity(malformedReview));
  const symbolRevision = learnerReview();
  symbolRevision.reviewRecordVersion = Symbol("revision");
  symbolRevision.attemptVersion = 1n;
  assert.doesNotThrow(() => validateS233LearnerAnswerReviewIdentity(symbolRevision));
  const symbolStage = learnerReview();
  symbolStage.stageStatus.deterministicChecks = Symbol("stage");
  assert.doesNotThrow(() => validateS233LearnerAnswerReviewIdentity(symbolStage));
  const symbolMinimum = findingBundle();
  symbolMinimum.skill.evidenceRequirements[0].minimumCount = Symbol("minimum");
  assert.doesNotThrow(() => validateS233ScoringFindingBundle(symbolMinimum));
  assert.doesNotThrow(() =>
    validateS233FutureControllerEvent({ ...controllerEvent(), idempotencyKey: 1 }),
  );
  assert.doesNotThrow(() =>
    validateS233AnswerPackIdentity({ ...answerPack(), contentHashSha256: Symbol("digest") }),
  );
  const nullReleaseInputs = answerPack();
  nullReleaseInputs.transformationProvenance[2].inputRefIds = null;
  assert.doesNotThrow(() => validateS233AnswerPackIdentity(nullReleaseInputs));
  const symbolClaim = answerPack();
  symbolClaim.claimSourceGraph.claimIds = [Symbol("claim")];
  assert.doesNotThrow(() => validateS233AnswerPackIdentity(symbolClaim));
  const symbolAnchor = finding();
  symbolAnchor.sourceAnchorIds = [Symbol("anchor")];
  assert.doesNotThrow(() => validateS233ScoringFindingBundle(
    findingBundle({ finding: symbolAnchor }),
  ));
  assert.doesNotThrow(() =>
    validateS233FutureControllerEvent(
      controllerEvent({ outcomeProofRefIds: [Symbol("proof")] }),
    ),
  );
  const malformedGate = answerPackContext();
  malformedGate.s215GateRecords[0].unresolvedBlockerCodes = null;
  assert.doesNotThrow(() => validateS233AnswerPackRegistryContext(answerPack(), malformedGate));
  const symbolManifest = manifest("laneA", [addedEntry("lib/review-os/s233a-runtime.ts")]);
  symbolManifest.baseMergeSha = Symbol("base");
  assert.doesNotThrow(() => validateS233LaneChangeManifest(symbolManifest, BASE_SHA, null, null));
  const symbolPathManifest = manifest("laneA", [
    { ...addedEntry("lib/review-os/s233a-runtime.ts"), path: Symbol("path") },
  ]);
  assert.doesNotThrow(() =>
    validateS233LaneChangeManifest(symbolPathManifest, BASE_SHA, null, null),
  );
});

test("documentation states the AI-first lock and the required contextual validators", async () => {
  const document = await readFile(
    new URL("../docs/s233-parallel-execution-contract-lock.md", import.meta.url),
    "utf8",
  );
  for (const phrase of [
    "AI-first",
    "Human approval is not part of the personal learner request path",
    "verified_learning_reference",
    "expert_unreviewed_ai_draft",
    "validateS233ScoringFindingBundle",
    "validateS233AnswerPackRegistryContext",
    "validateS233LearnerReviewRequestContext",
    "validateS233LearnerReviewTransition",
    "validateS233LearnerReviewEvaluationContext",
    "validateS233TrustedScoringContext",
    "validateS233EvidenceProofBundle",
    "validateS233LaneAEvidenceProofBundle",
    "validateS233AiEvaluationCascadeBundle",
    "fingerprintedRevealEventId",
    "baseIsAncestor",
    "trusted_sql_additivity_validator",
    "may not change this shared contract independently",
  ]) assert.match(document, new RegExp(phrase));
});

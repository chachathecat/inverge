import { FirstStageKernelError } from "../../lib/review-os/first-stage/kernel/domain.ts";
import { createSubjectAdapterRegistry, SUBJECT_ADAPTER_SCHEMA_VERSION } from "../../lib/review-os/first-stage/subject-adapter/subject-adapter.ts";
import { createPrivateFirstStageSessionService, privateSessionDigest as digest } from "../../lib/review-os/first-stage/runtime/session-service.ts";

// Synthetic kernel-unit fixtures, NOT reviewed production stock or content evidence.
const OWNER = "synthetic-owner-a";
const START = "2026-09-06T10:00:00.000Z";
const SUBMIT = "2026-09-06T10:01:00.000Z";
const BODY = "SYNTHETIC_PRIVATE_ECONOMICS_BODY";
const EXPLANATION = "SYNTHETIC_PRIVATE_EXPLANATION";

function reference(id = "synthetic-economics-q1") {
  return { schemaVersion: "first_stage.question_reference.v1", questionId: id,
    questionVersion: "fixture-v1", subjectId: "economics_principles", examYear: 2026,
    examRound: 37, sessionId: "synthetic-only-session", questionNumber: 1,
    choiceCount: 5, sourceVersionManifestIds: ["synthetic-source-only"],
    rightsState: "verified_owner_private", currentnessState: "verified_exam_date" };
}

function evidence(id) {
  return { schemaVersion: "first_stage.immutable_evidence_reference.v1",
    evidenceId: `synthetic-${id}`, evidenceVersion: "fixture-v1", evidenceSha256: digest(id) };
}

function harness(options = {}) {
  const rows = options.rows ?? new Map();
  const counts = { creates: 0, replaces: 0, explanations: 0 };
  let clock = START;
  let failWrite = false;
  const store = options.store ?? {
    async load(ownerId, sessionId) {
      const value = rows.get(`${ownerId}/${sessionId}`);
      return value ? structuredClone(value) : null;
    },
    async create(value) {
      const key = `${value.ownerId}/${value.sessionId}`;
      if (!rows.has(key)) { counts.creates++; rows.set(key, structuredClone(value)); }
      return structuredClone(rows.get(key));
    },
    async replace(value, expectedRevision) {
      if (failWrite) { failWrite = false; throw new Error("synthetic-storage-failure"); }
      const key = `${value.ownerId}/${value.sessionId}`;
      if (rows.get(key)?.state.revision !== expectedRevision) return false;
      counts.replaces++;
      rows.set(key, structuredClone(value));
      return true;
    },
  };
  const concept = { schemaVersion: "first_stage.concept_binding.v1",
    conceptId: "synthetic-economics-concept", conceptVersion: "fixture-v1",
    subjectId: "economics_principles", role: "primary" };
  const adapter = {
    schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION,
    adapterId: "synthetic-economics-adapter", adapterVersion: "fixture-v1",
    subjectId: "economics_principles",
    assertQuestionReference(value) {
      if (value.subjectId !== this.subjectId ||
        !value.questionId.startsWith("synthetic-economics-")) {
        throw new FirstStageKernelError("adapter_mismatch");
      }
    },
    presentQuestion(value) {
      return { schemaVersion: "first_stage.mcq_question_presentation.v1",
        questionReference: value, stem: BODY,
        choices: [1, 2, 3, 4, 5].map((choiceId) => ({ choiceId, body: `Synthetic choice ${choiceId}` })),
        sourceStatusLabel: value.rightsState, currentnessStatusLabel: value.currentnessState,
        learningReferenceDisclaimer: true };
    },
    evaluateSubmission(input) {
      const decision = input.submission.selectedChoice === null ? "unanswered"
        : input.submission.selectedChoice === 2 ? "correct" : "incorrect";
      return { schemaVersion: "first_stage.attempt_evaluation.v1", decision,
        errorCause: decision === "incorrect" ? "C" : null, conceptBindings: [concept],
        biggestGapCode: "synthetic-gap", nextActionCode: "synthetic-review",
        retryDisposition: "review_then_retry", reviewAfterMs: 86_400_000,
        evaluationPolicyVersion: "synthetic-policy-v1",
        evidenceEnvelope: { schemaVersion: "first_stage.attempt_evidence_envelope.v1",
          attemptId: input.attempt.attemptId, submissionSha256: input.submissionSha256,
          questionId: input.questionReference.questionId,
          questionVersion: input.questionReference.questionVersion,
          questionReferenceSha256: digest(input.questionReference), subjectId: this.subjectId,
          adapterId: this.adapterId, adapterVersion: this.adapterVersion,
          officialKeyReference: evidence("key"), choiceSetReference: evidence("choices"),
          sourceReference: evidence("source"), versionDecisionReference: evidence("version"),
          rightsDecisionReference: evidence("rights"),
          reviewedFeedback: { schemaVersion: "first_stage.reviewed_feedback_evidence.v1",
            state: "reviewed_available", receiptReference: evidence("feedback"),
            reviewerIdentity: "synthetic-owner-reviewer", reviewerClass: "owner_approved_personal_feedback_reviewer",
            modelAlone: false } } };
    },
    buildIndependentRetry(input) {
      const variant = reference(`synthetic-economics-retry-${input.priorRetries.length + 1}`);
      return { schemaVersion: "first_stage.independent_retry_candidate.v1", questionReference: variant,
        lineageReceipt: { schemaVersion: "first_stage.independent_retry_lineage_receipt.v1",
          receiptId: `synthetic-lineage-${input.priorRetries.length + 1}`, receiptVersion: "fixture-v1",
          adapterId: this.adapterId, adapterVersion: this.adapterVersion, subjectId: this.subjectId,
          sourceQuestionId: input.sourceQuestionReference.questionId,
          sourceQuestionVersion: input.sourceQuestionReference.questionVersion,
          sourceQuestionReferenceSha256: digest(input.sourceQuestionReference),
          variantQuestionId: variant.questionId, variantQuestionVersion: variant.questionVersion,
          variantQuestionReferenceSha256: digest(variant),
          targetConceptBindingKeys: [`${concept.subjectId}:${concept.conceptId}@${concept.conceptVersion}:${concept.role}`],
          priorRetryCount: input.priorRetries.length, decision: "verified_variant_for_independent_retry" } };
    },
  };
  const catalog = options.catalog ?? { digest: options.catalogDigest ?? digest("synthetic-catalog-v1"),
    registry: createSubjectAdapterRegistry([adapter]), initialReferences: [reference()],
    retryAvailability() { return "available"; },
    explanation() { counts.explanations++; return { text: EXPLANATION,
      sourceStatus: "synthetic-fixture-only", learningReferenceDisclaimer: true }; } };
  const service = createPrivateFirstStageSessionService(store, catalog, () => clock);
  return { service, rows, counts, store, catalog, setClock: (value) => { clock = value; },
    getClock: () => clock,
    failNextWrite: () => { failWrite = true; } };
}

async function start(h) {
  const created = await h.service.create(OWNER, { requestId: "create-1", questionId: reference().questionId });
  const begun = await h.service.execute(OWNER, created.sessionId, { action: "begin", requestId: "begin-1",
    expectedRevision: 1, questionId: reference().questionId });
  return { sessionId: created.sessionId, attemptId: begun.state.attempts[0].attemptId };
}

function submission(attemptId, choice = 1) {
  return { action: "submit", requestId: "submit-1", expectedRevision: 2, attemptId,
    submission: { selectedChoice: choice, confidence: "medium", answerChanged: false,
      previousChoice: null, eliminatedChoiceIds: [],
      workTrace: { schemaVersion: "first_stage.work_trace.v1",
        steps: [{ sequence: 1, kind: "select_answer", atElapsedMs: 1_000, choiceId: choice }] } } };
}


export { OWNER, START, SUBMIT, BODY, EXPLANATION, reference, harness, start, submission };

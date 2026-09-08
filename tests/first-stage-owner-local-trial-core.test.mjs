import assert from "node:assert/strict";
import test from "node:test";
import { parseQuestionReference } from "../lib/review-os/first-stage/kernel/domain.ts";
import { createSubjectAdapterRegistry, validateAttemptEvaluation, validatePresentation } from "../lib/review-os/first-stage/subject-adapter/subject-adapter.ts";
import { createOwnerLocalTrialApplication, authorizeOwnerLocalR3TrialAdapter } from "../lib/review-os/first-stage/runtime/owner-local-trial-context.ts";
import { privateSessionDigest as digest } from "../lib/review-os/first-stage/runtime/session-service.ts";

// Public, entirely synthetic content. No r3 question bodies or human receipts.
export const trialReference = () => ({ schemaVersion: "first_stage.owner_local_trial_question_reference.v1",
  questionId: "qnet-2025-36-s1-A-46", questionVersion: "issue883-economics-r3-runtime-v1",
  subjectId: "economics_principles", examYear: 2025, examRound: 36, sessionId: "qnet-2025-36-s1-A",
  questionNumber: 46, choiceCount: 5, sourceVersionManifestIds: ["synthetic-r3-source"],
  rightsState: "observed_owner_local_only", currentnessState: "observed_historical_unreviewed" });
function adapter() { return { schemaVersion: "dabangil.first_stage.subject_adapter.v1",
  adapterId: "owner-local-economics-r3-experiment", adapterVersion: "1", subjectId: "economics_principles",
  assertQuestionReference() {}, presentQuestion() {}, evaluateSubmission() {}, buildIndependentRetry() {} }; }
const evidence = id => ({ schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: `synthetic-${id}`,
  evidenceVersion: "v1", evidenceSha256: digest(id) });
function evaluation(a, reference) {
  const attempt = { schemaVersion: "first_stage.attempt.v1", attemptId: "synthetic-trial-attempt", examCycleId: "synthetic-cycle",
    questionReference: reference, kind: "initial", sourceAttemptId: null, reviewTaskId: null, exposureState: "first_exposure",
    assistanceLevel: "none", startedAt: "2026-09-08T00:00:00.000Z", state: "in_progress", submission: null, evaluation: null };
  const input = { schemaVersion: "first_stage.subject_evaluation_input.v1", questionReference: reference, attempt,
    submission: { selectedChoice: 2 }, submissionSha256: digest("synthetic-submission") };
  const value = { schemaVersion: "first_stage.attempt_evaluation.v1", decision: "correct", errorCause: null,
    conceptBindings: [{ schemaVersion: "first_stage.concept_binding.v1", conceptId: "synthetic-concept", conceptVersion: "v1",
      subjectId: "economics_principles", role: "primary" }], biggestGapCode: "synthetic-gap", nextActionCode: "synthetic-retry",
    retryDisposition: "review_then_retry", reviewAfterMs: 86400000, evaluationPolicyVersion: "synthetic-trial-v1",
    evidenceEnvelope: { schemaVersion: "first_stage.attempt_evidence_envelope.v1", attemptId: attempt.attemptId,
      submissionSha256: input.submissionSha256, questionId: reference.questionId, questionVersion: reference.questionVersion,
      questionReferenceSha256: digest(reference), subjectId: reference.subjectId, adapterId: a.adapterId, adapterVersion: a.adapterVersion,
      officialKeyReference: evidence("independent-key"), choiceSetReference: evidence("choices"), sourceReference: evidence("source"),
      versionDecisionReference: evidence("version"), rightsDecisionReference: evidence("rights-observation"),
      reviewedFeedback: { schemaVersion: "first_stage.owner_local_unreviewed_feedback.v1", state: "human_unreviewed_owner_local",
        receiptReference: null, reviewerIdentity: null, reviewerClass: null, modelAlone: true } } };
  return { input, value };
}
async function scoped(callback) {
  let error;
  const application = createOwnerLocalTrialApplication({
    environment: () => ({ NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55421",
      INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED: "true", INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "true",
      ALPHA_ADMIN_EMAILS: "synthetic@example.test", INVERGE_OWNER_FIRST_STAGE_EMAILS: "synthetic@example.test" }),
    session: async () => ({ isAuthenticated: true, isDemo: false, source: "supabase", userId: "synthetic-owner", email: "synthetic@example.test" }),
    catalog: async () => { try { await callback(); } catch (caught) { error = caught; } return null; },
    repository: () => { throw new Error("No actual storage in this unit test"); } });
  assert.equal((await application(new Request("http://127.0.0.1:3883/api/trial"))).status, 200);
  if (error) throw error;
}
test("trial question and feedback are separate and accepted only by the request-registered adapter", async () => {
  const a = adapter(), reference = trialReference(), { input, value } = evaluation(a, reference);
  assert.throws(() => createSubjectAdapterRegistry([a]));
  assert.throws(() => validateAttemptEvaluation(a, input, value));
  await scoped(() => {
    authorizeOwnerLocalR3TrialAdapter(a);
    const registry = createSubjectAdapterRegistry([a]);
    assert.deepEqual(parseQuestionReference(reference), reference);
    assert.equal(validateAttemptEvaluation(registry.require(a.subjectId), input, value).evidenceEnvelope.reviewedFeedback.modelAlone, true);
    const presented = validatePresentation(a, reference, { schemaVersion: "first_stage.mcq_question_presentation.v1",
      questionReference: reference, stem: "SYNTHETIC TRIAL QUESTION", choices: [1,2,3,4,5].map(choiceId => ({ choiceId, body: "SYNTHETIC CHOICE" })),
      sourceStatusLabel: reference.rightsState, currentnessStatusLabel: reference.currentnessState, learningReferenceDisclaimer: true });
    assert.equal(presented.questionReference.schemaVersion, reference.schemaVersion);
    assert.throws(() => validateAttemptEvaluation({ ...a }, input, value));
  });
  assert.throws(() => validateAttemptEvaluation(a, input, value));
});
test("trial cannot invent human receipts or choose the reviewed schema, and normal adapters reject trial evidence", async () => {
  await scoped(() => {
    const a = adapter(), reference = trialReference(); authorizeOwnerLocalR3TrialAdapter(a);
    for (const delta of [{ reviewerIdentity: "invented-human" }, { receiptReference: evidence("fake-approval") },
      { modelAlone: false }, { schemaVersion: "first_stage.reviewed_feedback_evidence.v1" }, { state: "reviewed_available" }]) {
      const { input, value } = evaluation(a, reference); Object.assign(value.evidenceEnvelope.reviewedFeedback, delta);
      assert.throws(() => validateAttemptEvaluation(a, input, value));
    }
    const normal = { ...a, adapterId: "synthetic-normal-economics" };
    const { input, value } = evaluation(normal, reference);
    assert.throws(() => validateAttemptEvaluation(normal, input, value));
    const promoted = { ...reference, schemaVersion: "first_stage.question_reference.v1", rightsState: "verified_owner_private", currentnessState: "verified_exam_date" };
    const forged = evaluation(a, promoted);
    assert.throws(() => validateAttemptEvaluation(a, forged.input, forged.value));
    assert.throws(() => parseQuestionReference({ ...reference, rightsState: "verified_owner_private" }));
  });
});

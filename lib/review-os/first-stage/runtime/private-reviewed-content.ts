import crypto from "node:crypto";
import {
  ERROR_CAUSES, FirstStageKernelError, exactObject, parseQuestionReference,
  requiredIdentifier, requiredSafeInteger, requiredUtcInstant,
  type ChoiceId, type ErrorCause, type ImmutableEvidenceReference, type QuestionReference,
} from "../kernel/domain";
import {
  SUBJECT_ADAPTER_SCHEMA_VERSION, createSubjectAdapterRegistry,
  validateAttemptEvaluation, validatePresentation, type SubjectAdapterV1,
} from "../subject-adapter/subject-adapter";
import { privateSessionDigest as digest, type PrivateFirstStageCatalog } from "./session-service";
import { validateCivilApplicability, validateRelatedLawApplicability, validateRealEstateApplicability, validateEconomicsApplicability, type PrivateApplicabilityInstallation } from "./foundation-applicability";
import type { FinalReleaseProjection } from "./foundation-release";
import { ECONOMICS_CANDIDATE_SCHEMA } from "./economics-candidate";
import { bindEconomicsCandidateRelease } from "./economics-candidate-release";
import type { QfI1CandidateV1 } from "../../../question-foundry/runtime/qf-i1-bank-first";

// Output capability of this actual loader only. Cloned objects, legacy six-check
// catalogs and the separately admitted unreviewed r3 catalog cannot claim it.
const economicsBankSupply = new WeakMap<PrivateFirstStageCatalog, () => readonly QfI1CandidateV1[]>();
export function reviewedEconomicsBankCandidates(catalog: PrivateFirstStageCatalog) {
  return economicsBankSupply.get(catalog)?.() ?? null;
}

export const PRIVATE_CONTENT_MAX_BYTES = 2 * 1024 * 1024;
export const PRIVATE_CONTENT_REVIEW_CHECKS = Object.freeze([
  "source_transcription", "rights_and_booklet", "answer_keys", "feedback",
  "model_assumptions", "practice_retry_lineage",
] as const);

/** Installed server evidence, never an upload field or a client claim. Empty until
 * an actual reviewer approves this exact content snapshot and its six checks. */
export type PrivateContentApproval = Readonly<{
  packetSha256: string; packetVersion: string;
  dataClass: "human_reviewed_private" | "synthetic_test_only";
  reviewId: string; reviewerIdentity: string;
  reviewerClass: "named_owner_authorized_human_reviewer" | "owner_approved_personal_feedback_reviewer";
  reviewedAt: string; decision: "approved_owner_private_learning";
  checks: readonly string[];
}>;

function fail(): never { throw new FirstStageKernelError("adapter_mismatch"); }
function hash(value: unknown): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/u.test(value)) fail();
  return value;
}
function text(value: unknown, max = 12_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail();
  return value;
}
function evidence(value: unknown): ImmutableEvidenceReference {
  const row = exactObject(value, ["schemaVersion", "evidenceId", "evidenceVersion", "evidenceSha256"]);
  if (row.schemaVersion !== "first_stage.immutable_evidence_reference.v1") fail();
  return Object.freeze({ schemaVersion: row.schemaVersion, evidenceId: requiredIdentifier(row.evidenceId),
    evidenceVersion: requiredIdentifier(row.evidenceVersion), evidenceSha256: hash(row.evidenceSha256) });
}
function freeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function approval(value: PrivateContentApproval) {
  exactObject(value, ["packetSha256", "packetVersion", "dataClass", "reviewId", "reviewerIdentity",
    "reviewerClass", "reviewedAt", "decision", "checks"]);
  hash(value.packetSha256); requiredIdentifier(value.packetVersion); requiredIdentifier(value.reviewId);
  requiredIdentifier(value.reviewerIdentity); requiredUtcInstant(value.reviewedAt);
  if (!["human_reviewed_private", "synthetic_test_only"].includes(value.dataClass) ||
    !["named_owner_authorized_human_reviewer", "owner_approved_personal_feedback_reviewer"].includes(value.reviewerClass) ||
    value.decision !== "approved_owner_private_learning" ||
    digest(value.checks) !== digest(PRIVATE_CONTENT_REVIEW_CHECKS)) fail();
  return freeze(structuredClone(value));
}

/** The runtime calls this with human_reviewed_private only. Tests inject synthetic
 * data and synthetic receipts into this SAME loader, not a fake adapter. */
export type PrivateContentInput = {
  approvals: readonly PrivateContentApproval[];
  readBytes(): Promise<Uint8Array>;
  expectedDataClass?: PrivateContentApproval["dataClass"];
  /** Server-installed Foundation objects; never parsed from the private packet. */
  applicability?: readonly PrivateApplicabilityInstallation[];
};

// Closed server-selected policies. Request bodies cannot choose or alter these.
const POLICIES = Object.freeze({
  economics_principles: Object.freeze({ name: "economics", schema: "first_stage.economics_private_content.v1", historicalOnly: false }),
  accounting: Object.freeze({ name: "accounting", schema: "first_stage.accounting_private_content.v1", historicalOnly: false }),
  civil_law: Object.freeze({ name: "civil-law", schema: "first_stage.civil_law_private_content.v1", historicalOnly: true }),
  real_estate_principles: Object.freeze({ name: "real-estate-principles", schema: "first_stage.real_estate_principles_private_content.v1", historicalOnly: false }),
  appraiser_related_law: Object.freeze({ name: "appraiser-related-law", schema: "first_stage.appraiser_related_law_private_content.v1", historicalOnly: true }),
});

export async function loadPrivateReviewedContent(subjectId: keyof typeof POLICIES,
  options: PrivateContentInput): Promise<PrivateFirstStageCatalog | null> {
  try {
    if (!Object.hasOwn(POLICIES, subjectId)) return null;
    const policy = POLICIES[subjectId];
    const expected = options.expectedDataClass ?? "human_reviewed_private";
    const approvals = options.approvals.map(approval);
    if (!approvals.length || approvals.some(item => item.dataClass !== expected) ||
      new Set(approvals.map(item => item.packetSha256)).size !== approvals.length) return null;
    let requiresFoundation = subjectId === "civil_law" || subjectId === "appraiser_related_law" || subjectId === "real_estate_principles";
    const applicability = structuredClone(options.applicability ?? []);
    if (requiresFoundation && (!applicability.length ||
      applicability.some(item => item.dataClass !== expected) ||
      new Set(applicability.map(item => item.packetSha256)).size !== applicability.length)) return null;
    const bytes = await options.readBytes();
    if (!bytes.length || bytes.byteLength > PRIVATE_CONTENT_MAX_BYTES) return null;
    const packetSha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const approved = approvals.find(item => item.packetSha256 === packetSha256);
    if (!approved) return null;
    let decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    let candidateProjections: ReadonlyMap<string, FinalReleaseProjection> | undefined;
    if (decoded?.schemaVersion === ECONOMICS_CANDIDATE_SCHEMA) {
      if (subjectId !== "economics_principles" || decoded.version !== approved.packetVersion) return null;
      requiresFoundation = true;
      if (!applicability.length || applicability.some(item => item.dataClass !== expected) ||
        new Set(applicability.map(item => item.packetSha256)).size !== applicability.length) return null;
      const installed = applicability.find(item => item.packetSha256 === packetSha256);
      if (!installed) return null;
      const projected = bindEconomicsCandidateRelease(decoded, expected, installed);
      decoded = projected.packet; candidateProjections = projected.projections;
    }
    const packet = exactObject(decoded,
      ["schemaVersion", "version", "dataClass", "authority", "questions", "keys"]);
    if (packet.schemaVersion !== policy.schema ||
      packet.version !== approved.packetVersion || packet.dataClass !== expected ||
      packet.authority !== "LEARNING_ONLY" || !Array.isArray(packet.questions) ||
      packet.questions.length < 2 || packet.questions.length > 200 || !Array.isArray(packet.keys) ||
      packet.keys.length !== packet.questions.length) return null;
    // The historical r3 profile cannot be disguised as legacy v1 to choose a
    // six-check-only route. Other already-supported legacy profiles are unchanged.
    if (subjectId === "economics_principles" && !candidateProjections && packet.questions.some(value =>
      (value as { reference?: { examYear?: unknown } })?.reference?.examYear === 2025)) return null;
    let applicabilityDigest: string | null = null;
    let applicabilityExpiresAt = Infinity;
    let attributions: ReadonlyMap<string, FinalReleaseProjection> | undefined = candidateProjections;
    if (requiresFoundation) {
      const installed = applicability.find(item => item.packetSha256 === packetSha256);
      if (!installed) return null;
      const validate = subjectId === "civil_law" ? validateCivilApplicability
        : subjectId === "appraiser_related_law" ? validateRelatedLawApplicability
        : subjectId === "economics_principles" ? validateEconomicsApplicability : validateRealEstateApplicability;
      const validated = validate(installed, packet.questions, packet.keys);
      applicabilityDigest = validated.digest; applicabilityExpiresAt = validated.expiresAt;
      attributions = candidateProjections ? new Map([...validated.projections].map(([id, value]) => {
        const notices = candidateProjections.get(id); if (!notices) fail();
        return [id, { question: Object.freeze([...value.question, ...notices.question]),
          feedback: Object.freeze([...value.feedback, ...notices.feedback]) }];
      })) : validated.projections;
    }

    const questions = packet.questions.map(value => {
      const row = exactObject(value, ["reference", "kind", "sourceQuestionId", "stem", "choices", "correctChoice",
        "choiceExplanations", "easyExplanation", "concept", "feedback", "sourceEvidence", "rightsEvidence", "versionEvidence"]);
      const reference = parseQuestionReference(row.reference);
      if (reference.subjectId !== subjectId ||
        // These law routes support reviewed historical exam snapshots only, not
        // a timeless "current law" claim or a live legal-source validator.
        (policy.historicalOnly && reference.currentnessState !== "verified_exam_date") ||
        !["original", "practice_retry"].includes(String(row.kind)) ||
        (row.kind === "original" ? row.sourceQuestionId !== null : typeof row.sourceQuestionId !== "string") ||
        !Array.isArray(row.choices) || row.choices.length !== 5 ||
        !Array.isArray(row.choiceExplanations) || row.choiceExplanations.length !== 5) fail();
      const correctChoice = requiredSafeInteger(row.correctChoice, 1, 5) as ChoiceId;
      const concept = exactObject(row.concept, ["id", "version"]);
      const feedback = exactObject(row.feedback, ["incorrectCauseByChoice", "biggestGapCode", "nextActionCode"]);
      if (!Array.isArray(feedback.incorrectCauseByChoice) || feedback.incorrectCauseByChoice.length !== 5) fail();
      const causes = feedback.incorrectCauseByChoice.map((cause, index) => {
        if (index + 1 === correctChoice ? cause !== null : !ERROR_CAUSES.includes(cause as ErrorCause)) fail();
        return cause as ErrorCause | null;
      });
      return freeze({ reference, kind: row.kind as "original" | "practice_retry",
        sourceQuestionId: row.sourceQuestionId === null ? null : requiredIdentifier(row.sourceQuestionId),
        stem: text(row.stem), choices: row.choices.map((body, index) => ({ choiceId: (index + 1) as ChoiceId, body: text(body, 4_000) })),
        correctChoice, choiceExplanations: row.choiceExplanations.map(body => text(body, 4_000)),
        easyExplanation: text(row.easyExplanation),
        concept: { schemaVersion: "first_stage.concept_binding.v1" as const,
          conceptId: requiredIdentifier(concept.id), conceptVersion: requiredIdentifier(concept.version),
          subjectId, role: "primary" as const },
        feedback: { causes, biggestGapCode: requiredIdentifier(feedback.biggestGapCode), nextActionCode: requiredIdentifier(feedback.nextActionCode) },
        sourceEvidence: evidence(row.sourceEvidence), rightsEvidence: evidence(row.rightsEvidence), versionEvidence: evidence(row.versionEvidence) });
    });
    const rows = new Map(questions.map(row => [row.reference.questionId, row]));
    if (rows.size !== questions.length) fail();
    const keys = packet.keys.map(value => {
      const row = exactObject(value, ["questionReferenceSha256", "choiceSetSha256", "correctChoice", "authority", "evidence"]);
      return { questionReferenceSha256: hash(row.questionReferenceSha256), choiceSetSha256: hash(row.choiceSetSha256),
        correctChoice: requiredSafeInteger(row.correctChoice, 1, 5), authority: row.authority, evidence: evidence(row.evidence) };
    });
    const keyByReference = new Map(keys.map(key => [key.questionReferenceSha256, key]));
    if (keyByReference.size !== keys.length) fail();
    for (const row of questions) {
      const key = keyByReference.get(digest(row.reference));
      if (!key || key.correctChoice !== row.correctChoice || key.choiceSetSha256 !== digest(row.choices) ||
        key.authority !== (row.kind === "original" ? "original_final_key" : "independently_reviewed_retry_key")) fail();
      if (row.kind === "practice_retry") {
        const source = rows.get(row.sourceQuestionId!);
        if (!source || source.kind !== "original" || digest(source.concept) !== digest(row.concept) ||
          key.evidence.evidenceSha256 === keyByReference.get(digest(source.reference))?.evidence.evidenceSha256) fail();
      } else if (!questions.some(candidate => candidate.sourceQuestionId === row.reference.questionId)) fail();
    }
    if (!questions.some(row => row.kind === "original")) fail();

    function requireRow(reference: QuestionReference) {
      // Recheck time at presentation/evaluation/retry and durable explanation
      // readback, not only before a potentially slow persistence operation.
      if (Date.now() >= applicabilityExpiresAt) fail();
      const row = rows.get(reference.questionId);
      if (!row || digest(reference) !== digest(row.reference)) fail();
      return row;
    }
    function boundEvidence(kind: string, value: unknown): ImmutableEvidenceReference {
      return { schemaVersion: "first_stage.immutable_evidence_reference.v1", evidenceId: `${policy.name}-${kind}-${digest([approved, value]).slice(0, 40)}`,
        evidenceVersion: approved!.packetVersion, evidenceSha256: digest(value) };
    }
    const adapter: SubjectAdapterV1 = {
      schemaVersion: SUBJECT_ADAPTER_SCHEMA_VERSION, adapterId: `private-${policy.name}-reviewed-content`,
      adapterVersion: "1", subjectId,
      assertQuestionReference(reference) { requireRow(reference); },
      presentQuestion(reference) {
        const row = requireRow(reference);
        return validatePresentation(adapter, reference, { schemaVersion: "first_stage.mcq_question_presentation.v1",
          questionReference: row.reference, stem: row.stem, choices: row.choices,
          sourceStatusLabel: reference.rightsState, currentnessStatusLabel: reference.currentnessState,
          learningReferenceDisclaimer: true });
      },
      evaluateSubmission(input) {
        const row = requireRow(input.questionReference);
        const key = keyByReference.get(digest(row.reference))!;
        const selected = input.submission.selectedChoice;
        const decision = selected === null ? "unanswered" : selected === key.correctChoice ? "correct" : "incorrect";
        return validateAttemptEvaluation(adapter, input, { schemaVersion: "first_stage.attempt_evaluation.v1", decision,
          errorCause: decision === "incorrect" ? row.feedback.causes[selected! - 1] : null,
          conceptBindings: [row.concept], biggestGapCode: row.feedback.biggestGapCode, nextActionCode: row.feedback.nextActionCode,
          retryDisposition: "review_then_retry", reviewAfterMs: 86_400_000, evaluationPolicyVersion: `private-${policy.name}-learning-v1`,
          evidenceEnvelope: { schemaVersion: "first_stage.attempt_evidence_envelope.v1",
            attemptId: input.attempt.attemptId, submissionSha256: input.submissionSha256,
            questionId: row.reference.questionId, questionVersion: row.reference.questionVersion,
            questionReferenceSha256: digest(row.reference), subjectId: adapter.subjectId,
            adapterId: adapter.adapterId, adapterVersion: adapter.adapterVersion,
            // Frozen kernel field name. A retry uses ITS OWN reviewed key, never the original answer table.
            officialKeyReference: key.evidence, choiceSetReference: boundEvidence("choices", row.choices),
            sourceReference: row.sourceEvidence, versionDecisionReference: row.versionEvidence, rightsDecisionReference: row.rightsEvidence,
            reviewedFeedback: { schemaVersion: "first_stage.reviewed_feedback_evidence.v1", state: "reviewed_available",
              receiptReference: boundEvidence("feedback", { approved, questionReference: row.reference }),
              reviewerIdentity: approved.reviewerIdentity, reviewerClass: approved.reviewerClass, modelAlone: false } } });
      },
      buildIndependentRetry(input) {
        const source = requireRow(input.sourceQuestionReference);
        const used = new Set(input.priorRetries.map(retry => retry.questionReference.questionId));
        const candidate = questions.filter(row => row.kind === "practice_retry" &&
          row.sourceQuestionId === source.reference.questionId && !used.has(row.reference.questionId))
          .sort((a, b) => a.reference.questionId < b.reference.questionId ? -1 : 1)[0];
        if (!candidate) throw new FirstStageKernelError("adapter_unavailable");
        const target = [`${source.concept.subjectId}:${source.concept.conceptId}@${source.concept.conceptVersion}:${source.concept.role}`];
        if (digest(input.reviewTask.conceptBindings) !== digest([source.concept])) fail();
        return { schemaVersion: "first_stage.independent_retry_candidate.v1", questionReference: candidate.reference,
          lineageReceipt: { schemaVersion: "first_stage.independent_retry_lineage_receipt.v1",
            receiptId: `${policy.name}-lineage-${digest([input.reviewTask.reviewTaskId, candidate.reference]).slice(0, 40)}`,
            receiptVersion: approved.packetVersion, adapterId: adapter.adapterId, adapterVersion: adapter.adapterVersion,
            subjectId: adapter.subjectId, sourceQuestionId: source.reference.questionId,
            sourceQuestionVersion: source.reference.questionVersion, sourceQuestionReferenceSha256: digest(source.reference),
            variantQuestionId: candidate.reference.questionId, variantQuestionVersion: candidate.reference.questionVersion,
            variantQuestionReferenceSha256: digest(candidate.reference), targetConceptBindingKeys: target,
            priorRetryCount: input.priorRetries.length, decision: "verified_variant_for_independent_retry" } };
      },
    };
    // Validate every presentation before advertising any stock. No body is returned here.
    for (const row of questions) adapter.presentQuestion(row.reference);
    const catalog: PrivateFirstStageCatalog = Object.freeze({ digest: digest({ packetSha256, approved, adapterVersion: adapter.adapterVersion,
      ...(applicabilityDigest === null ? {} : { applicabilityDigest }) }),
      registry: createSubjectAdapterRegistry([adapter]),
      initialReferences: Object.freeze(questions.filter(row => row.kind === "original").map(row => row.reference)),
      ...(attributions ? { questionAttributions(reference: QuestionReference) {
        requireRow(reference); return attributions.get(reference.questionId)!.question;
      } } : {}),
      retryAvailability(reference: QuestionReference, usedQuestionIds: readonly string[]) {
        requireRow(reference);
        return questions.some(row => row.sourceQuestionId === reference.questionId && !usedQuestionIds.includes(row.reference.questionId))
          ? "available" as const : "exhausted" as const;
      },
      explanation(reference: QuestionReference) {
        const row = requireRow(reference);
        return Object.freeze({ text: [`정답: ${row.correctChoice}`, row.easyExplanation,
          ...row.choiceExplanations.map((body, index) => `${index + 1}. ${body}`)].join("\n\n"),
          sourceStatus: expected === "synthetic_test_only" ? "synthetic-test-only-not-human-review"
            : "human-reviewed-private-learning-reference", learningReferenceDisclaimer: true as const,
          ...(attributions ? { attributions: attributions.get(reference.questionId)!.feedback } : {}) });
      } });
    if (subjectId === "economics_principles" && candidateProjections && applicabilityDigest !== null) {
      economicsBankSupply.set(catalog, () => Object.freeze(catalog.initialReferences.map(reference => {
        requireRow(reference); // Recheck exact version and all source/release expiry before each use.
        return Object.freeze({ candidateId: reference.questionId,
          candidateDigest: `sha256:${digest({ questionId: reference.questionId, questionVersion: reference.questionVersion,
            subjectId, examYear: reference.examYear, examRound: reference.examRound })}`,
          familyId: reference.questionId, surfaceId: `${reference.questionId}@${reference.questionVersion}`,
          bankClass: "LEARNING_PRACTICE" as const, origin: "BANK_STOCK" as const,
          contentAuthority: "LEARNING_ONLY" as const, rightsStatus: "VERIFIED" as const,
          // CURRENT means the validated use decision has not expired. It is not
          // a claim that a historical exam snapshot is current law.
          sourceStatus: "CURRENT" as const, releaseChainComplete: true,
          unseenEligibilitySnapshotSealed: false, nonSameSurfaceAsSource: false,
          familyIsolated: false, calibrationState: "UNASSESSED" as const,
          timedProtocolBound: false, chronology: null, chronologyAuthority: null,
          availableAt: approved.reviewedAt, priority: 0 });
      })));
    }
    return catalog;
  } catch { return null; } // No raw body, parse error, source path or candidate authority escapes.
}

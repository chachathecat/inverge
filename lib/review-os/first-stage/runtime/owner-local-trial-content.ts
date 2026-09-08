import crypto from "node:crypto";
import { prepareEconomicsRuntimeCandidate } from "../../../../scripts/content-review/prepare-economics-runtime-candidate.mjs";
import { FirstStageKernelError, parseQuestionReference, type ChoiceId, type QuestionReference } from "../kernel/domain";
import { createSubjectAdapterRegistry, validatePresentation, validateAttemptEvaluation, type SubjectAdapterV1 } from "../subject-adapter/subject-adapter";
import { privateSessionDigest as digest, type PrivateFirstStageCatalog } from "./session-service";
import { authorizeOwnerLocalR3TrialAdapter, activeOwnerLocalR3TrialAdapter } from "./owner-local-trial-context";
import { OWNER_LOCAL_R3_TRIAL_ADAPTER_ID, OWNER_LOCAL_R3_TRIAL_NOTICE } from "./owner-local-trial-boundary";

export const TRIAL_ARTIFACTS = ["candidate", "review", "calculations", "ai", "observation", "checklist", "pdf", "key", "keyObservation"] as const;
type Artifact = typeof TRIAL_ARTIFACTS[number];
export type TrialInstallation = Readonly<{ schemaVersion: "first_stage.owner_local_r3_installation.v1";
  dataClass: "private_review_candidate" | "synthetic_test_only"; fileSha256: Readonly<Record<Artifact, string>> }>;
export type TrialContentInput = { installation: TrialInstallation | null;
  readArtifact(name: Artifact): Promise<Uint8Array>;
  /** Only synthetic tests supply this port; the real server never changes it. */
  expectedDataClass?: TrialInstallation["dataClass"] };
const sha = (bytes: Uint8Array) => crypto.createHash("sha256").update(bytes).digest("hex");
const fail = (): never => { throw new FirstStageKernelError("adapter_mismatch"); };
const text = (bytes: Uint8Array) => new TextDecoder("utf-8", { fatal: true }).decode(bytes);

/** No human approval is produced. Only the closed r3 46/r46 pair is supported
 * initially. The whole unchanged candidate and its existing evidence are bound;
 * other originals/variants remain uninstalled, including normalized item 53. */
export async function loadOwnerLocalR3TrialContent(input: TrialContentInput): Promise<PrivateFirstStageCatalog | null> {
  try {
    const installed = input.installation, expected = input.expectedDataClass ?? "private_review_candidate";
    if (!installed || installed.schemaVersion !== "first_stage.owner_local_r3_installation.v1" || installed.dataClass !== expected ||
      Object.keys(installed).sort().join() !== ["dataClass", "fileSha256", "schemaVersion"].join() ||
      Object.keys(installed.fileSha256).sort().join() !== [...TRIAL_ARTIFACTS].sort().join()) return null;
    const sources = {} as Record<Artifact, Uint8Array>;
    for (const name of TRIAL_ARTIFACTS) {
      const bytes = await input.readArtifact(name);
      if (!bytes.length || bytes.length > 2 * 1024 * 1024 || sha(bytes) !== installed.fileSha256[name]) return null;
      sources[name] = bytes;
    }
    const candidate = JSON.parse(text(sources.candidate));
    if (candidate.dataClass !== expected) return null;
    const prepared = prepareEconomicsRuntimeCandidate({ reviewSource: text(sources.review), calculationSource: text(sources.calculations),
      aiEvidenceSource: text(sources.ai), sourceObservationSource: text(sources.observation), humanChecklistSource: text(sources.checklist) });
    prepared.candidate.dataClass = expected;
    if (digest(prepared.candidate) !== digest(candidate) || candidate.sourceBinding.questionFileSha256 !== sha(sources.pdf) ||
      candidate.sourceBinding.keyFileSha256 !== sha(sources.key)) return null;
    const observation = JSON.parse(text(sources.observation));
    for (const [post, attachment] of [["5231525", "2230215"], ["5246129", "2243629"]]) {
      const rows = observation.posts?.filter((row: { articleId: string }) => String(row.articleId) === post);
      if (rows?.length !== 1 || rows[0].displayedLicense !== "KOGL_TYPE_1_ATTRIBUTION" ||
        !rows[0].downloadedAttachmentIds?.map(String).includes(attachment)) return null;
    }
    // Full 200-position observation is retained, including multiple accepted
    // answers. It is NOT the Foundation's human-reviewed key/release receipt.
    const keyObservation = JSON.parse(text(sources.keyObservation));
    const subjects = ["civil_law", "economics_principles", "real_estate_principles", "appraiser_related_law", "accounting"];
    if (keyObservation.schemaVersion !== "issue883.r3.ai_key_observation.v1" || keyObservation.humanReview !== false ||
      keyObservation.method !== "AI_visual_transcription_of_preserved_official_key_images" || keyObservation.keyBookletExplicit !== null ||
      keyObservation.keyFileSha256 !== sha(sources.key) || keyObservation.groups?.length !== 5) return null;
    for (const [index, group] of keyObservation.groups.entries()) {
      if (group.subject !== subjects[index] || group.session !== (index < 3 ? 1 : 2) ||
        group.firstQuestion !== [1,41,81,1,41][index] || group.answers?.length !== 40) return null;
      for (const answers of group.answers) if (!Array.isArray(answers) || !answers.length || answers.length > 5 ||
        new Set(answers).size !== answers.length || answers.some(choice => !Number.isInteger(choice) || choice < 1 || choice > 5)) return null;
    }
    const rawRows = prepared.candidate.questions.filter(row => row.reference.questionNumber === 46);
    if (rawRows.length !== 2 || rawRows[0].kind !== "original" || rawRows[1].kind !== "practice_retry" ||
      digest(keyObservation.groups[1].answers[5]) !== digest([rawRows[0].correctChoice])) return null;
    const rows = rawRows.map(row => ({ ...row, reference: parseQuestionReference({ ...row.reference,
      schemaVersion: "first_stage.owner_local_trial_question_reference.v1", rightsState: "observed_owner_local_only",
      currentnessState: "observed_historical_unreviewed" }), choices: row.choices.map((body: string, i: number) => ({ choiceId: (i + 1) as ChoiceId, body })) }));
    const source = rows[0], variant = rows[1];
    if (variant.sourceQuestionId !== source.reference.questionId || digest(source.concept) !== digest(variant.concept)) fail();
    const concept = { schemaVersion: "first_stage.concept_binding.v1" as const, conceptId: source.concept.id,
      conceptVersion: source.concept.version, subjectId: "economics_principles" as const, role: "primary" as const };
    const bound = (kind: string, value: unknown) => ({ schemaVersion: "first_stage.immutable_evidence_reference.v1" as const,
      evidenceId: `local-trial-${kind}-${digest(value).slice(0,32)}`, evidenceVersion: candidate.version, evidenceSha256: digest(value) });
    function requireRow(reference: QuestionReference) {
      if (!activeOwnerLocalR3TrialAdapter(adapter)) fail();
      const row = rows.find(row => digest(row.reference) === digest(reference));
      if (!row) return fail(); return row;
    }
    const adapter: SubjectAdapterV1 = {
      schemaVersion: "dabangil.first_stage.subject_adapter.v1", adapterId: OWNER_LOCAL_R3_TRIAL_ADAPTER_ID,
      adapterVersion: "1", subjectId: "economics_principles",
      assertQuestionReference(reference) { requireRow(reference); },
      presentQuestion(reference) { const row = requireRow(reference);
        return validatePresentation(adapter, reference, { schemaVersion: "first_stage.mcq_question_presentation.v1",
          questionReference: reference, stem: row.stem, choices: row.choices, sourceStatusLabel: reference.rightsState,
          currentnessStatusLabel: reference.currentnessState, learningReferenceDisclaimer: true }); },
      evaluateSubmission(input) { const row = requireRow(input.questionReference), selected = input.submission.selectedChoice;
        const decision = selected === null ? "unanswered" : selected === row.correctChoice ? "correct" : "incorrect";
        return validateAttemptEvaluation(adapter, input, { schemaVersion: "first_stage.attempt_evaluation.v1", decision,
          errorCause: decision === "incorrect" ? row.feedback.incorrectCauseByChoice[selected! - 1] : null,
          conceptBindings: [concept], biggestGapCode: row.feedback.biggestGapCode, nextActionCode: row.feedback.nextActionCode,
          retryDisposition: "review_then_retry", reviewAfterMs: 86400000, evaluationPolicyVersion: "owner-local-r3-unreviewed-v1",
          evidenceEnvelope: { schemaVersion: "first_stage.attempt_evidence_envelope.v1", attemptId: input.attempt.attemptId,
            submissionSha256: input.submissionSha256, questionId: row.reference.questionId, questionVersion: row.reference.questionVersion,
            questionReferenceSha256: digest(row.reference), subjectId: adapter.subjectId, adapterId: adapter.adapterId, adapterVersion: adapter.adapterVersion,
            // Legacy field name: the variant binds its OWN AI/code-checked key,
            // never the official original key and never a human review receipt.
            officialKeyReference: bound(row.kind === "original" ? "original-key-observation" : "variant-own-key", { installed, row }),
            choiceSetReference: bound("choices", row.choices), sourceReference: row.sourceEvidence,
            versionDecisionReference: row.versionEvidence, rightsDecisionReference: row.rightsEvidence,
            reviewedFeedback: { schemaVersion: "first_stage.owner_local_unreviewed_feedback.v1", state: "human_unreviewed_owner_local",
              receiptReference: null, reviewerIdentity: null, reviewerClass: null, modelAlone: true } } }); },
      buildIndependentRetry(input) { requireRow(input.sourceQuestionReference);
        if (input.sourceQuestionReference.questionId !== source.reference.questionId || input.priorRetries.length ||
          digest(input.reviewTask.conceptBindings) !== digest([concept])) throw new FirstStageKernelError("adapter_unavailable");
        return { schemaVersion: "first_stage.independent_retry_candidate.v1", questionReference: variant.reference,
          lineageReceipt: { schemaVersion: "first_stage.independent_retry_lineage_receipt.v1",
            receiptId: `local-trial-lineage-${digest([input.reviewTask.reviewTaskId, variant.reference]).slice(0,32)}`,
            receiptVersion: candidate.version, adapterId: adapter.adapterId, adapterVersion: adapter.adapterVersion, subjectId: adapter.subjectId,
            sourceQuestionId: source.reference.questionId, sourceQuestionVersion: source.reference.questionVersion,
            sourceQuestionReferenceSha256: digest(source.reference), variantQuestionId: variant.reference.questionId,
            variantQuestionVersion: variant.reference.questionVersion, variantQuestionReferenceSha256: digest(variant.reference),
            targetConceptBindingKeys: [`${concept.subjectId}:${concept.conceptId}@${concept.conceptVersion}:${concept.role}`],
            priorRetryCount: 0, decision: "unreviewed_owner_local_practice_retry" } }; },
    };
    authorizeOwnerLocalR3TrialAdapter(adapter);
    const registry = createSubjectAdapterRegistry([adapter]);
    const attribution = (reference: QuestionReference) => [OWNER_LOCAL_R3_TRIAL_NOTICE,
      "출처: 한국산업인력공단 Q-Net · 2025년 제36회 1차 1교시 A형 경제학 46번",
      "공공누리 제1유형 게시물·첨부 출처 관찰 · 인적 검토 미완료 · 공식 추천·보증 아님",
      "https://www.q-net.or.kr/cst003.do?artlSeq=5231525&boardId=Q004&gId=60&gSite=L&id=cst00302&menuType=cst00309",
      "최종정답표의 A형 명시는 없음 · 대응 근거의 사람 검토 미완료",
      reference.questionId === source.reference.questionId ? "공식 원문 전사 후보 · 전사 인적 검토 미완료"
        : "원문 계열 자체 작성 변형 · 별도 AI/code 정답 · 공식성·숙달·전이·측정 권한 없음"];
    return Object.freeze({ digest: digest({ mode: "owner-local-r3-unreviewed", installed, selection: [46] }), registry,
      initialReferences: Object.freeze([source.reference]),
      questionAttributions(reference: QuestionReference) { requireRow(reference); return attribution(reference); },
      retryAvailability(reference: QuestionReference, used: readonly string[]) { requireRow(reference);
        return used.includes(variant.reference.questionId) ? "exhausted" as const : "available" as const; },
      explanation(reference: QuestionReference) { const row = requireRow(reference);
        return { text: [`검토 전 제시 정답: ${row.correctChoice}`, row.easyExplanation,
          ...row.choiceExplanations.map((body: string, i: number) => `${i+1}. ${body}`)].join("\n\n"),
          sourceStatus: "human-unreviewed-owner-local-learning-only", learningReferenceDisclaimer: true as const,
          attributions: [...attribution(reference),
            "최종정답 출처: https://www.q-net.or.kr/cst003.do?artlSeq=5246129&boardId=Q004&gId=60&gSite=L&id=cst00302&menuType=cst00310"] }; } });
  } catch { return null; } // Never disclose bodies, private paths or raw parser errors.
}

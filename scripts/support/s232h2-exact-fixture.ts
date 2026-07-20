import { createHash, randomUUID } from "node:crypto";

import {
  buildLearnerAnswerSubmissionDerivedMetadata,
  buildLearnerAnswerSubmissionPersistenceContract,
} from "../../lib/review-os/answer-submission-contract";
import {
  buildCaptureLearningSignal,
  buildCaptureReviewReason,
  computeCaptureQueuePriority,
} from "../../lib/review-os/capture-learning-signals";
import {
  buildCaptureNoteSignals,
  structureCaptureNote,
} from "../../lib/review-os/capture-note-engine";
import { sanitizeDerivedMetadata } from "../../lib/review-os/data-boundary";
import {
  resolveReviewSchedule,
  resolveScheduleOverrideDate,
} from "../../lib/review-os/scheduling";
import { buildSecondAnswerRewriteSignal } from "../../lib/review-os/second-answer-rewrite";
import { classifyWrongAnswerTaxonomy } from "../../lib/review-os/taxonomy-classification";
import { sanitizeCaptureTelemetryMetadata } from "../../lib/review-os/telemetry-sanitizer";
import type { WrongAnswerItemInput } from "../../lib/review-os/types";

export const syntheticOwnerId = "s232h2:v3-visual:v1";
export const syntheticFixtureSource = "S232H2 synthetic visual acceptance";
export const syntheticFixtureTitle = "사업인정의 처분성";
export const syntheticFixtureProblemIdentifier =
  "s232h2:v3-visual:ledger:v2";
export const syntheticFixtureQuestion =
  "사업인정의 처분성을 검토하시오. 시각 검증용 합성 문제입니다.";
export const syntheticLedgerAnswer =
  "사업인정은 수용권을 발생시키므로 처분성이 인정된다.";
export const syntheticLedgerCorrectAnswer =
  "사업인정은 특정 사업에 수용권을 설정하여 국민의 권리·의무에 직접 영향을 미친다.";
export const syntheticLedgerGap =
  "처분성 판단 기준과 수용권 발생의 연결이 빠졌습니다.";
export const syntheticFixtureAnswer =
  "행정청의 공적 견해표명과 보호가치 있는 신뢰를 차례로 검토합니다. 이 문장은 시각 검증용 합성 기록입니다.";
export const syntheticFixtureCorrectAnswer =
  "공적 견해표명, 귀책사유 부재, 신뢰에 따른 행위, 보호가치를 순서대로 확인합니다.";
export const syntheticFixtureGap =
  "요건과 대응 사실을 잇는 문장 하나가 빠져 있습니다.";
export const syntheticQueueAnchorSource =
  syntheticFixtureSource + " · queue anchor";
export const syntheticCaptureReviewDate = "2026-07-18";

export type ExactFixtureRole = "ledger" | "queue-anchor";

export type SyntheticItem = {
  id?: string;
  itemId?: string;
  userId?: string;
  examName?: string;
  subjectLabel?: string;
  sourceType?: string;
  sourceLabel?: string;
  problemTitle?: string;
  problemIdentifier?: string;
  rawQuestionText?: string;
  rawAnswerText?: string;
  correctAnswer?: string;
  userAnswer?: string;
  userReasonText?: string;
  userReasonPreset?: string;
  confidence?: string;
  timeSpentSeconds?: number | null;
  createdAt?: string;
  rawPayload?: Record<string, unknown>;
  derivedPayload?: Record<string, unknown>;
  [key: string]: unknown;
};

type FixtureRow = Record<string, unknown>;

export type ExactPrimaryFixtureGraph = {
  itemIds: [string, string];
  items: FixtureRow[];
  notes: FixtureRow[];
  tags: FixtureRow[];
  recurrence: FixtureRow[];
  reviewQueue: FixtureRow[];
  learningSignals: FixtureRow[];
  usageEvents: FixtureRow[];
};

export function resolveSyntheticItemId(item: SyntheticItem) {
  return item.id ?? item.itemId ?? "";
}

export function exactFixtureMistakeType(item: SyntheticItem) {
  const reason = item.userReasonText ?? "";
  if (/무효|취소/.test(reason)) return "무효와 취소 구분 / 개념 혼동";
  if (/함정|표현|선지|오독/.test(reason)) return "trap_word";
  if (/예외|원칙/.test(reason)) return "rule_exception_confusion";
  if (/계산|숫자|산식|템플릿/.test(reason)) {
    return "calculation_template_error";
  }
  if (/조건|누락/.test(reason)) return "조건 누락";
  return reason.length <= 32 ? reason : "concept_confusion";
}

export function exactFixtureGeneratedArtifacts(item: SyntheticItem) {
  const topicTag = item.problemTitle ?? "";
  const mistakeType = exactFixtureMistakeType(item);
  return {
    note: {
      ai_summary: `${item.subjectLabel} 답안에서 먼저 보강할 지점은 ${mistakeType}입니다. 전체를 다시 쓰기보다 핵심 논점 하나를 고정해 다시 작성하세요.`,
      key_distinction:
        "참고 정리와 내 답안의 차이는 점수보다 누락된 논점과 답안 구조에서 먼저 봐야 합니다.",
      review_checkpoint: `${topicTag}를 다시 볼 때 목차, 핵심 논점, 사례 적용 문장을 각각 한 번씩 확인하세요.`,
      next_try_tip: `다음 rewrite에서는 ${mistakeType} 하나만 고쳐서 8~10줄로 다시 작성하세요.`,
      generation_source: "fallback",
    },
    tag: {
      topic_tag: topicTag,
      mistake_type: mistakeType,
      task_type: "2차 답안 보강",
      classifier_source: "rules",
      confidence: 0.58,
      recurrence_candidate: true,
    },
  };
}

export function exactFixtureInput(
  item: SyntheticItem,
  role: ExactFixtureRole,
): WrongAnswerItemInput {
  const answer =
    role === "ledger" ? syntheticLedgerAnswer : syntheticFixtureAnswer;
  const correctAnswer =
    role === "ledger"
      ? syntheticLedgerCorrectAnswer
      : syntheticFixtureCorrectAnswer;
  const gap = role === "ledger" ? syntheticLedgerGap : syntheticFixtureGap;
  const keyConcepts =
    role === "ledger"
      ? ["사업인정", "처분성", "수용권"]
      : ["신뢰보호", "공적 견해표명", "보호가치"];
  const weakStructurePoint =
    role === "ledger"
      ? "법률효과와 권리구제 필요성을 같은 순서로 연결해야 합니다."
      : "요건과 사실 적용을 같은 순서로 연결해야 합니다.";
  const weakApplicationSentence =
    role === "ledger"
      ? "사업인정으로 발생하는 구체적 법률효과를 적어야 합니다."
      : "공적 견해표명에 해당하는 합성 사실을 구체적으로 연결해야 합니다.";
  const rewriteInstruction =
    role === "ledger"
      ? "처분의 법률효과와 권리구제 필요성을 한 문단에 연결합니다."
      : "요건, 대응 사실, 소결론을 한 문단에 연결합니다.";
  const referenceStructure =
    role === "ledger"
      ? syntheticLedgerCorrectAnswer
      : "I. 공적 견해표명 II. 신뢰와 귀책 III. 보호가치 IV. 결론";
  const issueRecall =
    role === "ledger"
      ? "사업인정의 처분성을 법률효과 중심으로 검토합니다."
      : "신뢰보호 요건을 순서대로 검토합니다.";
  const outlineDraft =
    role === "ledger"
      ? "I. 사업인정의 성격 II. 수용권 설정 III. 권리구제 IV. 결론"
      : referenceStructure;
  const confirmedFields = {
    subjectLabel: "감정평가 및 보상법규",
    userAnswer: answer,
    production_before_comparison: true,
    reference_answer_added_after_production: true,
    biggest_gap: gap,
    sourceType: "text",
    examMode: "second",
    hasManualCorrection: false,
    ocrConfirmedByLearner: false,
    acceptance_fixture_id: syntheticOwnerId,
    acceptance_fixture_role: role,
  };
  return {
    examName: "감정평가사 2차",
    subjectLabel: "감정평가 및 보상법규",
    sourceType: "text",
    sourceLabel:
      role === "ledger" ? syntheticFixtureSource : syntheticQueueAnchorSource,
    problemTitle: item.problemTitle,
    problemIdentifier: item.problemIdentifier,
    rawQuestionText: item.rawQuestionText,
    rawAnswerText: answer,
    correctAnswer,
    userAnswer: answer,
    userReasonText: gap,
    confidence: role === "ledger" ? "중간" : "낮음",
    timeSpentSeconds: role === "queue-anchor" ? 180 : undefined,
    keyConcepts,
    missingIssue: gap,
    weakStructurePoint,
    weakApplicationSentence,
    rewriteInstruction,
    referenceStructure,
    myAnswerSummary: answer,
    issueRecall,
    outlineDraft,
    productionBeforeComparison: true,
    referenceAnswerAddedAfterProduction: true,
    biggestGap: gap,
    rewriteCompleted: false,
    captureIntent: "save",
    createdFromCapture: true,
    extractionPayload: {
      raw_ocr_text: answer,
      raw_extraction_json: {
        acceptance_fixture_id: syntheticOwnerId,
        acceptance_fixture_role: role,
      },
      normalized_draft: null,
      user_confirmed_fields: confirmedFields,
    },
  };
}

export function exactFixtureProductionMetadata(
  item: SyntheticItem,
  role: ExactFixtureRole,
) {
  const input = exactFixtureInput(item, role);
  const taxonomy = classifyWrongAnswerTaxonomy({
    examName: input.examName,
    mode: "second",
    subjectLabel: input.subjectLabel,
    problemTitle: input.problemTitle,
    rawQuestionText: input.rawQuestionText,
    userReasonText: input.userReasonText,
    userReasonPreset: input.userReasonPreset,
    keyConcepts: input.keyConcepts,
    coreFormula: input.coreFormula,
    comparisonPoint: input.comparisonPoint,
    missingIssue: input.missingIssue,
    weakStructurePoint: input.weakStructurePoint,
    weakApplicationSentence: input.weakApplicationSentence,
  });
  const taxonomyClassification = {
    primaryNodeId: taxonomy.primary?.taxonomyNodeId ?? null,
    candidates: taxonomy.candidates,
    classificationStatus: taxonomy.classificationStatus,
    classificationConfidence: taxonomy.classificationConfidence,
    classifierSource: "local_taxonomy_v1" as const,
  };
  const captureNoteV1 = buildCaptureNoteSignals("second", input);
  const captureNoteV2 = structureCaptureNote({
    mode: "second",
    subject: input.subjectLabel,
    confirmedText: input.rawQuestionText ?? input.userAnswer,
    problemText: input.rawQuestionText,
    userAnswerText: input.userAnswer,
    existingNormalizedDraft: input.extractionPayload?.normalized_draft ?? null,
    userConfirmedFields: input.extractionPayload?.user_confirmed_fields,
    itemInput: input,
  });
  const answerSubmission = buildLearnerAnswerSubmissionPersistenceContract({
    userId: item.userId ?? "",
    mode: "second",
    subject: input.subjectLabel,
    sourceType: input.sourceType,
    pageCount: null,
    lowConfidenceFlag: false,
    captureQualityIssue: null,
    hasManualCorrection: false,
    ocrConfirmedByLearner: false,
    confirmedText: input.rawQuestionText ?? input.userAnswer,
  });
  return {
    taxonomyClassification,
    captureNoteV1,
    captureNoteV2,
    answerSubmission,
    answerSubmissionDerived:
      buildLearnerAnswerSubmissionDerivedMetadata(answerSubmission),
  };
}

export function buildExactFixtureLearningSignal(
  item: SyntheticItem,
  role: ExactFixtureRole,
) {
  const itemId = resolveSyntheticItemId(item);
  const gap = role === "ledger" ? syntheticLedgerGap : syntheticFixtureGap;
  const keyConcepts =
    role === "ledger"
      ? ["사업인정", "처분성", "수용권"]
      : ["신뢰보호", "공적 견해표명", "보호가치"];
  const weakStructurePoint =
    role === "ledger"
      ? "법률효과와 권리구제 필요성을 같은 순서로 연결해야 합니다."
      : "요건과 사실 적용을 같은 순서로 연결해야 합니다.";
  const rewriteInstruction =
    role === "ledger"
      ? "처분의 법률효과와 권리구제 필요성을 한 문단에 연결합니다."
      : "요건, 대응 사실, 소결론을 한 문단에 연결합니다.";
  return buildCaptureLearningSignal({
    itemId,
    examName: "감정평가사 2차",
    subject: "감정평가 및 보상법규",
    sourceType: "text",
    confidence: role === "ledger" ? "중간" : "낮음",
    timeSpentSeconds: role === "queue-anchor" ? 180 : undefined,
    biggestGap: gap,
    mistakeReason: exactFixtureMistakeType(item),
    keyConcepts,
    weakStructurePoint,
    missingIssue: gap,
    rewriteInstruction,
    createdFromCapture: true,
  });
}

function createDedupeKey(userId: string, input: WrongAnswerItemInput) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        userId,
        examName: input.examName.trim(),
        subjectLabel: input.subjectLabel.trim(),
        problemTitle: input.problemTitle?.trim() ?? "",
        rawQuestionText: input.rawQuestionText?.trim() ?? "",
        correctAnswer: input.correctAnswer.trim(),
        userAnswer: input.userAnswer.trim(),
      }),
    )
    .digest("hex");
}

function buildFixtureItem(
  userId: string,
  role: ExactFixtureRole,
  now: Date,
) {
  const id = randomUUID();
  const serial = "001";
  const createdAt = now.toISOString();
  const item: SyntheticItem = {
    id,
    userId,
    examName: "감정평가사 2차",
    subjectLabel: "감정평가 및 보상법규",
    sourceType: "text",
    sourceLabel:
      role === "ledger" ? syntheticFixtureSource : syntheticQueueAnchorSource,
    problemTitle:
      role === "ledger"
        ? syntheticFixtureTitle
        : "S232H2 합성 복습 앵커 " + serial,
    problemIdentifier:
      role === "ledger"
        ? syntheticFixtureProblemIdentifier
        : "s232h2:v3-visual:queue:" + serial,
    rawQuestionText:
      role === "ledger"
        ? syntheticFixtureQuestion
        : "S232H2 합성 복습 앵커 " +
          serial +
          ": 신뢰보호 요건을 다시 연결합니다.",
    rawAnswerText:
      role === "ledger" ? syntheticLedgerAnswer : syntheticFixtureAnswer,
    correctAnswer:
      role === "ledger"
        ? syntheticLedgerCorrectAnswer
        : syntheticFixtureCorrectAnswer,
    userAnswer:
      role === "ledger" ? syntheticLedgerAnswer : syntheticFixtureAnswer,
    userReasonText:
      role === "ledger" ? syntheticLedgerGap : syntheticFixtureGap,
    confidence: role === "ledger" ? "중간" : "낮음",
    timeSpentSeconds: role === "queue-anchor" ? 180 : null,
    createdAt,
  };
  const input = exactFixtureInput(item, role);
  const artifacts = exactFixtureGeneratedArtifacts(item);
  const production = exactFixtureProductionMetadata(item, role);
  const learningSignal = buildExactFixtureLearningSignal(item, role);
  const learningMetadata = learningSignal.metadataJson as Record<
    string,
    unknown
  >;
  const conceptNodeCandidate = learningMetadata.concept_node_candidate;
  if (
    !conceptNodeCandidate ||
    typeof conceptNodeCandidate !== "object" ||
    Array.isArray(conceptNodeCandidate)
  ) {
    throw new Error("S232H2 exact fixture concept grammar is invalid.");
  }
  const rewriteSignal = buildSecondAnswerRewriteSignal(input);
  const schedule = resolveReviewSchedule({
    mode: "second",
    isCorrect: false,
    confidence: input.confidence,
    mistakeType: artifacts.tag.mistake_type,
    recurrenceCount: 1,
    hasWeakParagraph: true,
    now,
  });
  const priorityScore = computeCaptureQueuePriority({
    examName: input.examName,
    confidence: input.confidence,
    timeSpentSeconds: input.timeSpentSeconds ?? null,
    mistakeOrWeakPoint: `${artifacts.tag.mistake_type} ${input.weakStructurePoint ?? ""} ${input.missingIssue ?? ""}`,
    weakStructurePoint: input.weakStructurePoint,
    missingIssue: input.missingIssue,
  });
  const reviewReason = buildCaptureReviewReason({
    examName: input.examName,
    confidence: input.confidence,
    mistakeReason: artifacts.tag.mistake_type,
    weakStructurePoint: input.weakStructurePoint,
    missingIssue: input.missingIssue,
  });
  const effectiveNextReviewDate = schedule.nextReviewDate;
  const queueDueAt = resolveScheduleOverrideDate(
    effectiveNextReviewDate,
    schedule.reviewDueAt,
  );
  const rawPayload = {
    captureMethod: input.sourceType,
    nextReviewDate: effectiveNextReviewDate,
    raw_ocr_text: input.extractionPayload?.raw_ocr_text ?? null,
    raw_extraction_json: input.extractionPayload?.raw_extraction_json ?? {},
    normalized_draft: input.extractionPayload?.normalized_draft ?? null,
    user_confirmed_fields:
      input.extractionPayload?.user_confirmed_fields ?? {},
    mode: "second",
    artifactType: "second_correction",
    noteKind: "교정노트",
    subjectLabel: input.subjectLabel,
    aiDraft: {
      keyConcepts: input.keyConcepts ?? [],
      coreFormula: input.coreFormula ?? null,
      comparisonPoint: input.comparisonPoint ?? null,
      missingIssue: input.missingIssue ?? null,
      weakStructurePoint: input.weakStructurePoint ?? null,
      weakApplicationSentence: input.weakApplicationSentence ?? null,
      rewriteInstruction: input.rewriteInstruction ?? null,
      calculationRisk: rewriteSignal.calculationRisk ?? null,
      unitRisk: rewriteSignal.unitRisk ?? null,
      rewriteTaskType: rewriteSignal.rewriteTaskType,
      supportedCalculatorTemplateId:
        rewriteSignal.supportedCalculatorTemplateId ?? null,
      referenceStructure: input.referenceStructure ?? null,
      myAnswerSummary: input.myAnswerSummary ?? null,
      caseSummary: input.caseSummary ?? null,
    },
    taxonomyClassification: production.taxonomyClassification,
    rewrite_source_item_id: null,
    rewrite_source_gap: null,
    rewrite_instruction: input.rewriteInstruction ?? null,
    rewrite_paragraph: null,
    rewrite_completed: false,
    concept_card: null,
    review_stage: null,
    due_at: null,
    issue_recall: input.issueRecall ?? null,
    outline_draft: input.outlineDraft ?? null,
    production_before_comparison: true,
    produced_answer_before_reference: true,
    reference_answer_added_after_production: true,
    biggest_gap: input.biggestGap ?? input.missingIssue ?? null,
    created_from_capture: true,
    capture_intent: "save",
    learner_answer_submission: production.answerSubmission,
  };
  const derivedPayload = sanitizeDerivedMetadata({
    topicTag: artifacts.tag.topic_tag,
    mistakeType: artifacts.tag.mistake_type,
    recurrenceCount: 1,
    taxonomyClassification: production.taxonomyClassification,
    created_from_capture: true,
    capture_note_engine_v1: production.captureNoteV1,
    capture_note_engine_v2: production.captureNoteV2,
    concept_node_candidate: conceptNodeCandidate,
    conceptNodeId: learningMetadata.conceptNodeId,
    conceptFamily: learningMetadata.conceptFamily,
    retrievalPrompt: learningMetadata.retrievalPrompt,
    conceptNextTaskType: learningMetadata.conceptNextTaskType,
    concept_card: null,
    review_stage: null,
    cloze_candidate: input.keyConcepts?.[0] ?? null,
    rewriteTaskType: rewriteSignal.rewriteTaskType,
    missingIssueCandidate: rewriteSignal.missingIssueCandidate,
    weakStructurePoint: rewriteSignal.weakStructurePoint,
    calculationRisk: rewriteSignal.calculationRisk ?? null,
    unitRisk: rewriteSignal.unitRisk ?? null,
    supportedCalculatorTemplateId:
      rewriteSignal.supportedCalculatorTemplateId ?? null,
    learner_answer_submission: production.answerSubmissionDerived,
  });
  item.rawPayload = rawPayload;
  item.derivedPayload = derivedPayload;

  const itemRow = {
    id,
    user_id: userId,
    exam_name: input.examName,
    subject_label: input.subjectLabel,
    source_type: input.sourceType,
    source_label: input.sourceLabel ?? null,
    problem_title: input.problemTitle ?? null,
    problem_identifier: input.problemIdentifier ?? null,
    raw_question_text: input.rawQuestionText ?? null,
    raw_answer_text: input.rawAnswerText ?? null,
    correct_answer: input.correctAnswer,
    user_answer: input.userAnswer,
    user_reason_text: input.userReasonText ?? null,
    user_reason_preset: input.userReasonPreset ?? null,
    confidence: input.confidence,
    time_spent_seconds: input.timeSpentSeconds ?? null,
    dedupe_key: createDedupeKey(userId, input),
    processing_status: "completed",
    raw_payload: rawPayload,
    derived_payload: derivedPayload,
    created_at: createdAt,
    updated_at: createdAt,
  };
  const noteRow = {
    id: randomUUID(),
    wrong_answer_item_id: id,
    ...artifacts.note,
    created_at: createdAt,
  };
  const tagRow = {
    id: randomUUID(),
    wrong_answer_item_id: id,
    ...artifacts.tag,
    created_at: createdAt,
  };
  const recurrenceRow = {
    id: randomUUID(),
    user_id: userId,
    exam_name: input.examName,
    subject_label: input.subjectLabel,
    topic_tag: artifacts.tag.topic_tag,
    mistake_type: artifacts.tag.mistake_type,
    recurrence_count: 1,
    last_seen_at: createdAt,
    risk_level: "stable",
    created_at: createdAt,
    updated_at: createdAt,
  };
  const reviewQueueRow = {
    id: randomUUID(),
    user_id: userId,
    exam_id: "wrong_answer_os",
    subject_id: input.subjectLabel,
    stage: "alpha",
    source_submission_id: id,
    source_kind: "wrong_answer",
    status: "pending",
    priority_score: priorityScore,
    raw_payload: {
      dueAt: queueDueAt,
      reviewReason,
    },
    derived_payload: sanitizeDerivedMetadata({
      topicTag: artifacts.tag.topic_tag,
      mistakeType: artifacts.tag.mistake_type,
      recurrenceCount: 1,
      concept_node_candidate: conceptNodeCandidate,
      conceptNodeId: learningMetadata.conceptNodeId,
      conceptFamily: learningMetadata.conceptFamily,
      retrievalPrompt: learningMetadata.retrievalPrompt,
      conceptNextTaskType: learningMetadata.conceptNextTaskType,
      schedulingPolicy: schedule.policy,
      retryDueAt: schedule.retryDueAt,
      followUpReviewAt: schedule.followUpReviewAt,
      nextReviewDate: effectiveNextReviewDate,
    }),
    created_at: createdAt,
    updated_at: createdAt,
  };
  const learningSignalRow = {
    id: randomUUID(),
    user_id: userId,
    exam_mode: learningSignal.examMode,
    subject: learningSignal.subject,
    source_type: learningSignal.sourceType,
    derived_tags: learningSignal.derivedTags,
    related_formulas: learningSignal.relatedFormulas,
    next_task_type: learningSignal.nextTaskType,
    next_task: learningSignal.nextTask,
    metadata_json: learningSignal.metadataJson ?? {},
    created_at: createdAt,
  };
  const captureSavedMetadata = sanitizeCaptureTelemetryMetadata({
    mode: "second",
    subject: input.subjectLabel,
    sourceType: input.sourceType,
    confidence: input.confidence,
    nextTaskType: "rewrite",
    topicCandidate: artifacts.tag.topic_tag,
    mistakeType: artifacts.tag.mistake_type,
    weakStructurePoint: input.weakStructurePoint ?? null,
    missingIssue: input.missingIssue ?? null,
    createdFromCapture: true,
  });
  const executionStartedMetadata = sanitizeCaptureTelemetryMetadata({
    mode: "second",
    nextTaskType: "rewrite",
    createdFromCapture: true,
  });
  const executionCompletedMetadata = sanitizeCaptureTelemetryMetadata({
    mode: "second",
    createdFromCapture: true,
  });
  const usageEvents = [
    {
      event_name: "capture_saved",
      entity_type: "wrong_answer_item",
      metadata_json: captureSavedMetadata,
    },
    {
      event_name: "post_save_execution_started",
      entity_type: "wrong_answer_item",
      metadata_json: executionStartedMetadata,
    },
    {
      event_name: "post_save_execution_completed",
      entity_type: "wrong_answer_item",
      metadata_json: executionCompletedMetadata,
    },
    {
      event_name: "review_followup_scheduled",
      entity_type: "review_queue_item",
      metadata_json: executionStartedMetadata,
    },
  ].map((event) => ({
    id: randomUUID(),
    user_id: userId,
    entity_id: id,
    created_at: createdAt,
    ...event,
  }));

  return {
    id,
    itemRow,
    noteRow,
    tagRow,
    recurrenceRow,
    reviewQueueRow,
    learningSignalRow,
    usageEvents,
  };
}

export function buildExactPrimaryFixtureGraph(
  userId: string,
  now = new Date(),
): ExactPrimaryFixtureGraph {
  const ledger = buildFixtureItem(userId, "ledger", now);
  const queueAnchor = buildFixtureItem(userId, "queue-anchor", now);
  return {
    itemIds: [ledger.id, queueAnchor.id],
    items: [ledger.itemRow, queueAnchor.itemRow],
    notes: [ledger.noteRow, queueAnchor.noteRow],
    tags: [ledger.tagRow, queueAnchor.tagRow],
    recurrence: [ledger.recurrenceRow, queueAnchor.recurrenceRow],
    reviewQueue: [ledger.reviewQueueRow, queueAnchor.reviewQueueRow],
    learningSignals: [
      ledger.learningSignalRow,
      queueAnchor.learningSignalRow,
    ],
    usageEvents: [...ledger.usageEvents, ...queueAnchor.usageEvents],
  };
}

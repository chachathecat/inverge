import {
  buildQnetReferenceSignalsForMetadata,
  type QnetAppraiserExamMode,
  type QnetAppraiserOfficialMaterialsReference,
} from "./qnet-official-materials-reference";

export type QnetReferenceTodayPlanActionInput = {
  examMode?: QnetAppraiserExamMode | string;
  subject?: string;
  subjectId?: string;
  unitId?: string;
  taskType?: string;
  title?: string;
  rationale?: string;
  prioritySignals?: string[];
  [key: string]: unknown;
};

export type QnetTodayPlanReference = {
  matchedSourceIds: string[];
  matchedTopics: string[];
  matchedCurriculumNodeCandidates: string[];
  trapPatternCandidates: string[];
  answerSkeletonTags: string[];
  calculationTemplateCandidates: string[];
  casioRelevant: boolean;
  metadataOnly: true;
  safeUse: "metadata_reference_only";
};

export type QnetReferenceEnrichedTodayPlanAction<T extends QnetReferenceTodayPlanActionInput> = T & {
  qnetReference?: QnetTodayPlanReference;
  prioritySignals: string[];
};

const MAX_METADATA_LABELS = 8;
const MAX_SAFE_LABEL_LENGTH = 120;

const FORBIDDEN_ACTION_FIELD_NAMES = new Set([
  "rawText",
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "rawProblemText",
  "rawQuestionText",
  "problemText",
  "questionText",
  "answerText",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "explanationBody",
  "ocrText",
  "ocrFullText",
  "fullText",
  "sourceExcerpt",
  "sourceText",
  "copyrightedText",
  "originalText",
  "sourceUrl",
  "localFileName",
  "localRawFileName",
  "score",
  "planningScore",
  "priorityScore",
  "passFail",
  "passGuarantee",
  "officialScore",
  "predictedScore",
  "instructorComment",
]);

const FORBIDDEN_CLAIM_PATTERNS = [
  /official\s+grading/i,
  /official\s+score/i,
  /score\s*prediction/i,
  /pass\s*\/\s*fail/i,
  /pass[-\s]*fail/i,
  /model\s+answer/i,
  /pass\s*guarantee/i,
  /공식\s*채점/,
  /공식\s*점수/,
  /점수\s*예측/,
  /합불/,
  /공식\s*모범\s*답안/,
  /모범\s*답안/,
  /합격\s*보장/,
];

const SUBJECT_HINTS: Record<string, { subject?: string; topics: string[]; curriculumNodes: string[] }> = {
  civil: { subject: "감정평가사 1차", topics: ["민법"], curriculumNodes: ["first_civil_law"] },
  "civil-law": { subject: "감정평가사 1차", topics: ["민법"], curriculumNodes: ["first_civil_law"] },
  first_civil_law: { subject: "감정평가사 1차", topics: ["민법"], curriculumNodes: ["first_civil_law"] },
  first_economics: { subject: "감정평가사 1차", topics: ["경제학원론"], curriculumNodes: ["first_economics"] },
  first_real_estate_studies: { subject: "감정평가사 1차", topics: ["부동산학원론"], curriculumNodes: ["first_real_estate_studies"] },
  first_appraisal_law: { subject: "감정평가사 1차", topics: ["감정평가관계법규"], curriculumNodes: ["first_appraisal_related_law"] },
  first_appraisal_related_law: { subject: "감정평가사 1차", topics: ["감정평가관계법규"], curriculumNodes: ["first_appraisal_related_law"] },
  accounting: { subject: "감정평가사 1차", topics: ["회계학"], curriculumNodes: ["first_accounting"] },
  first_accounting: { subject: "감정평가사 1차", topics: ["회계학"], curriculumNodes: ["first_accounting"] },
  second_practice: { subject: "감정평가실무", topics: ["감정평가실무"], curriculumNodes: ["second_practice"] },
  second_theory: { subject: "감정평가이론", topics: ["감정평가이론"], curriculumNodes: ["second_theory"] },
  second_law: { subject: "감정평가 및 보상법규", topics: ["감정평가 및 보상법규"], curriculumNodes: ["second_law"] },
};

const EXACT_REFERENCE_SUBJECTS = new Set([
  "감정평가사 1차",
  "감정평가실무",
  "감정평가이론",
  "감정평가 및 보상법규",
]);

const KNOWN_REFERENCE_LABELS = new Set([
  ...Object.values(SUBJECT_HINTS).flatMap((hint) => [...hint.topics, ...hint.curriculumNodes, hint.subject ?? ""]),
  "민법",
  "경제학원론",
  "부동산학원론",
  "감정평가관계법규",
  "회계학",
  "감정평가실무",
  "감정평가이론",
  "감정평가 및 보상법규",
  "계산 조건 확인",
  "검산 누락",
  "요건 누락",
  "사안 포섭",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertNoForbiddenActionFields(value: unknown, path = "action") {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_CLAIM_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) {
      throw new Error(`Q-Net Today Plan adapter rejects official grading/score/model-answer claims at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenActionFields(entry, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) return;

  for (const [key, nested] of Object.entries(value)) {
    if (FORBIDDEN_ACTION_FIELD_NAMES.has(key)) {
      throw new Error(`Q-Net Today Plan adapter accepts metadata only; rejected field ${path}.${key}`);
    }
    assertNoForbiddenActionFields(nested, `${path}.${key}`);
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function safeLabel(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized || normalized.length > MAX_SAFE_LABEL_LENGTH || /[\r\n]/.test(normalized)) return "";
  return normalized;
}

function unique(values: string[]) {
  return [...new Set(values.map(safeLabel).filter(Boolean))];
}

function limited(values: string[]) {
  return unique(values).slice(0, MAX_METADATA_LABELS);
}

function supportedExamMode(value: unknown): QnetAppraiserExamMode | undefined {
  return value === "first" || value === "second" ? value : undefined;
}

function hintForSubjectId(subjectId: unknown) {
  const normalized = safeLabel(subjectId);
  if (!normalized) return undefined;
  if (SUBJECT_HINTS[normalized]) return SUBJECT_HINTS[normalized];
  const prefix = Object.keys(SUBJECT_HINTS).find((candidate) => normalized.startsWith(`${candidate}_`));
  return prefix ? SUBJECT_HINTS[prefix] : undefined;
}

function subjectForAction(action: QnetReferenceTodayPlanActionInput, subjectHint: ReturnType<typeof hintForSubjectId>) {
  const explicitSubject = safeLabel(action.subject);
  if (EXACT_REFERENCE_SUBJECTS.has(explicitSubject)) return explicitSubject;
  return subjectHint?.subject;
}

function hasKnownReferenceLabel(value: string) {
  return [...KNOWN_REFERENCE_LABELS].some((label) => value.includes(label));
}

function labelsFromPrioritySignals(prioritySignals: unknown) {
  if (!Array.isArray(prioritySignals)) return { topics: [], curriculumNodes: [], trapWords: [], answerSkeletonTags: [] };

  const topics: string[] = [];
  const curriculumNodes: string[] = [];
  const trapWords: string[] = [];
  const answerSkeletonTags: string[] = [];

  for (const signal of prioritySignals.map(safeLabel)) {
    if (/accounting/i.test(signal)) {
      topics.push("회계학");
      curriculumNodes.push("first_accounting");
      trapWords.push("계산 조건 확인", "회계 말문제 함정");
    }
    if (/calculator|casio/i.test(signal)) {
      trapWords.push("계산 조건 확인", "검산 누락");
      answerSkeletonTags.push("계산과정", "검토");
    }
    if (/issue|spotting|law|requirement/i.test(signal)) {
      trapWords.push("요건 누락", "절차 누락", "사안 포섭 부족");
      answerSkeletonTags.push("문제점", "요건 검토", "사안 포섭", "결론");
    }
    if (/rewrite/i.test(signal)) {
      answerSkeletonTags.push("의의", "근거", "적용", "결론");
    }
  }

  return {
    topics,
    curriculumNodes,
    trapWords,
    answerSkeletonTags,
  };
}

function metadataInputForAction(action: QnetReferenceTodayPlanActionInput) {
  const examMode = supportedExamMode(action.examMode);
  if (!examMode) return null;

  const subjectHint = hintForSubjectId(action.subjectId);
  const priorityHints = labelsFromPrioritySignals(action.prioritySignals);
  const title = safeLabel(action.title);
  const rationale = safeLabel(action.rationale);
  const taskType = safeLabel(action.taskType);
  const subjectId = safeLabel(action.subjectId);
  const unitId = safeLabel(action.unitId);
  const exactSubject = subjectForAction(action, subjectHint);
  const hasSpecificReferenceHint = Boolean(
    subjectHint
    || exactSubject
    || /^first_|^second_/.test(unitId)
    || priorityHints.topics.length
    || priorityHints.curriculumNodes.length
    || priorityHints.trapWords.length
    || priorityHints.answerSkeletonTags.length
    || [taskType, title, rationale].some(hasKnownReferenceLabel)
  );

  if (!hasSpecificReferenceHint) return null;

  return {
    examMode,
    subject: exactSubject,
    topicCandidates: limited([
      ...priorityHints.topics,
      ...(subjectHint?.topics ?? []),
      taskType,
      title,
      rationale,
    ]),
    curriculumNodeCandidates: limited([
      ...priorityHints.curriculumNodes,
      ...(subjectHint?.curriculumNodes ?? []),
      subjectId,
      unitId,
    ]),
    trapWordCandidates: limited([
      ...priorityHints.trapWords,
      taskType,
      title,
      rationale,
    ]),
    answerSkeletonTags: limited([
      ...priorityHints.answerSkeletonTags,
      taskType,
      title,
      rationale,
    ]),
  };
}

function prioritySignalsForQnetReference(reference: QnetTodayPlanReference) {
  return unique([
    reference.matchedSourceIds.length > 0 ? "official_reference_source_verified" : "",
    reference.matchedTopics.length > 0 ? "official_reference_topic_match" : "",
    reference.trapPatternCandidates.length > 0 ? "official_reference_trap_pattern_candidate" : "",
    reference.answerSkeletonTags.length > 0 ? "official_reference_answer_skeleton_candidate" : "",
    reference.calculationTemplateCandidates.length > 0 ? "official_reference_calculation_template_candidate" : "",
    reference.casioRelevant ? "official_reference_casio_relevant" : "",
  ]);
}

export function buildQnetReferenceSignalsForTodayPlanAction(
  action: QnetReferenceTodayPlanActionInput,
  reference?: QnetAppraiserOfficialMaterialsReference,
): QnetTodayPlanReference | null {
  assertNoForbiddenActionFields(action);
  const input = metadataInputForAction(action);
  if (!input) return null;

  const signals = buildQnetReferenceSignalsForMetadata(input, reference);
  if (signals.materialCount === 0 || signals.sourceIds.length === 0) return null;

  const matchedTopics = signals.topicFrequencySignals.length > 0
    ? signals.topicFrequencySignals.map((signal) => signal.topic)
    : signals.topicCandidates;

  return {
    matchedSourceIds: limited(signals.sourceIds),
    matchedTopics: limited(matchedTopics),
    matchedCurriculumNodeCandidates: limited(signals.curriculumNodeCandidates),
    trapPatternCandidates: limited(signals.trapPatternCandidates),
    answerSkeletonTags: limited(signals.answerSkeletonTags),
    calculationTemplateCandidates: limited(signals.calculationTemplateCandidates),
    casioRelevant: signals.casioRelevant,
    metadataOnly: true,
    safeUse: "metadata_reference_only",
  };
}

export function enrichTodayPlanActionWithQnetReference<T extends QnetReferenceTodayPlanActionInput>(
  action: T,
  reference?: QnetAppraiserOfficialMaterialsReference,
): QnetReferenceEnrichedTodayPlanAction<T> {
  const originalSignals = Array.isArray(action.prioritySignals) ? action.prioritySignals.map(safeLabel).filter(Boolean) : [];
  const qnetReference = buildQnetReferenceSignalsForTodayPlanAction(action, reference);
  if (!qnetReference) {
    const output = {
      ...action,
      prioritySignals: unique(originalSignals),
    };
    assertNoForbiddenActionFields(output, "output");
    return output;
  }

  const output = {
    ...action,
    qnetReference,
    prioritySignals: unique([...originalSignals, ...prioritySignalsForQnetReference(qnetReference)]),
  };
  assertNoForbiddenActionFields(output, "output");
  return output;
}

export function enrichTodayPlanActionsWithQnetReference<T extends QnetReferenceTodayPlanActionInput>(
  actions: T[],
  reference?: QnetAppraiserOfficialMaterialsReference,
): Array<QnetReferenceEnrichedTodayPlanAction<T>> {
  return actions.map((action) => enrichTodayPlanActionWithQnetReference(action, reference));
}

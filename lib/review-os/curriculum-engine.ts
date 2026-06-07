import {
  type AppraiserCurriculumReference,
  type AppraiserExamMode,
  type CurriculumUnitPlanningMetadata,
  type CurriculumSubject,
  type CurriculumUnit,
  type CurriculumVerificationStatus,
  loadAppraiserCurriculumReference,
} from "./curriculum-reference";

export type CurriculumSignalConfidence = "unknown" | "low" | "medium" | "high";
export type CurriculumSignalResult = "wrong" | "unknown" | "correct" | "needs_rewrite" | "missed";
export type CurriculumSignalSourceType =
  | "capture"
  | "ox"
  | "cloze"
  | "accounting_template"
  | "rewrite"
  | "casio"
  | "issue_spotting";
export type CurriculumMatchedBy = "unitId" | "unitName" | "subjectId" | "subjectName" | "fallback";

export type CurriculumLearningSignal = {
  examMode: AppraiserExamMode;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  taskType?: string;
  confidence?: CurriculumSignalConfidence;
  result?: CurriculumSignalResult;
  sourceType?: CurriculumSignalSourceType;
  daysUntilExam?: number;
  recentMissCount?: number;
  isFailRiskSubject?: boolean;
  isDue?: boolean;
  missingIssueCandidate?: string;
  weakStructurePoint?: string;
};

export type CurriculumClassification = {
  examMode: AppraiserExamMode;
  subjectId: string | null;
  subjectName: string | null;
  unitId: string | null;
  unitName: string | null;
  allowedTaskTypes: string[];
  planningMetadata: CurriculumUnitPlanningMetadata | null;
  matchedBy: CurriculumMatchedBy;
  verificationStatus: CurriculumVerificationStatus;
  warnings: string[];
};

export type CurriculumTaskCandidate = {
  id: string;
  examMode: AppraiserExamMode;
  subjectId: string | null;
  unitId: string | null;
  taskType: string;
  title: string;
  rationale: string;
  prioritySignals: string[];
  estimatedMinutes: number;
  isPrimaryCandidate: boolean;
  metadata: {
    defaultReviewPattern?: string;
    coreConcepts?: string[];
    trapWords?: string[];
    mistakePatterns?: string[];
    importance?: string;
    riskLevel?: string;
  };
};

export type CurriculumNextAction = {
  classification: CurriculumClassification;
  candidates: CurriculumTaskCandidate[];
  topCandidate: CurriculumTaskCandidate | null;
  todayPlanPreview: CurriculumTaskCandidate[];
};

const DRAFT_VERIFICATION_WARNING = "Curriculum reference is draft metadata and must not be treated as officially verified.";
const FIRST_FALLBACK_TASK_TYPES = ["O/X", "cloze"];
const SECOND_FALLBACK_TASK_TYPES = ["rewrite", "issue spotting"];
const MAX_TODAY_PLAN_PRIMARY_TASKS = 3;

const TASK_TYPE_ALIASES: Record<string, string> = {
  ox: "O/X",
  "o/x": "O/X",
  cloze: "cloze",
  accounting: "accounting template",
  accounting_template: "accounting template",
  "accounting template": "accounting template",
  rewrite: "rewrite",
  casio: "CASIO",
  issue: "issue spotting",
  issue_spotting: "issue spotting",
  "issue spotting": "issue spotting",
};

export function normalizeCurriculumTaskType(taskType: string | undefined | null) {
  if (!taskType) return null;
  return TASK_TYPE_ALIASES[taskType.trim().toLowerCase()] ?? taskType.trim();
}

function assertSupportedExamMode(examMode: unknown): asserts examMode is AppraiserExamMode {
  if (examMode !== "first" && examMode !== "second") {
    throw new Error(`Unsupported examMode ${String(examMode)}`);
  }
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

function normalizeAllowedTaskTypes(taskTypes: string[]) {
  return unique(taskTypes.map((taskType) => normalizeCurriculumTaskType(taskType)));
}

function curriculumForMode(reference: AppraiserCurriculumReference, examMode: AppraiserExamMode) {
  return examMode === "first" ? reference.firstExam : reference.secondExam;
}

function findSubjectAndUnit(
  subjects: CurriculumSubject[],
  predicate: (subject: CurriculumSubject, unit: CurriculumUnit) => boolean,
) {
  for (const subject of subjects) {
    const unit = subject.units.find((entry) => predicate(subject, entry));
    if (unit) return { subject, unit };
  }
  return null;
}

function findSubject(subjects: CurriculumSubject[], predicate: (subject: CurriculumSubject) => boolean) {
  return subjects.find(predicate) ?? null;
}

function verificationWarnings(reference: AppraiserCurriculumReference) {
  return reference.verificationStatus.isOfficiallyVerified ? [] : [DRAFT_VERIFICATION_WARNING];
}

function planningMetadataForUnit(unit: CurriculumUnit): CurriculumUnitPlanningMetadata {
  return {
    importance: unit.importance,
    coreConcepts: [...unit.coreConcepts],
    ...(unit.trapWords ? { trapWords: [...unit.trapWords] } : {}),
    ...(unit.mistakePatterns ? { mistakePatterns: [...unit.mistakePatterns] } : {}),
    defaultReviewPattern: unit.defaultReviewPattern,
    riskLevel: unit.riskLevel,
    ...(unit.secondExamBridge ? { secondExamBridge: unit.secondExamBridge } : {}),
  };
}

export function classifyLearningSignalToCurriculum(
  signal: CurriculumLearningSignal,
  reference = loadAppraiserCurriculumReference(),
): CurriculumClassification {
  assertSupportedExamMode(signal.examMode);
  const curriculum = curriculumForMode(reference, signal.examMode);
  const subjects = curriculum.subjects;
  const base = {
    examMode: signal.examMode,
    verificationStatus: reference.verificationStatus,
    warnings: verificationWarnings(reference),
  };

  if (signal.unitId) {
    const match = findSubjectAndUnit(subjects, (_subject, unit) => unit.id === signal.unitId);
    if (match) {
      return {
        ...base,
        subjectId: match.subject.id,
        subjectName: match.subject.name,
	        unitId: match.unit.id,
	        unitName: match.unit.name,
	        allowedTaskTypes: normalizeAllowedTaskTypes(match.unit.taskTypes),
	        planningMetadata: planningMetadataForUnit(match.unit),
	        matchedBy: "unitId",
	      };
    }
  }

  if (signal.unitName) {
    const match = findSubjectAndUnit(subjects, (_subject, unit) => unit.name === signal.unitName);
    if (match) {
      return {
        ...base,
        subjectId: match.subject.id,
        subjectName: match.subject.name,
	        unitId: match.unit.id,
	        unitName: match.unit.name,
	        allowedTaskTypes: normalizeAllowedTaskTypes(match.unit.taskTypes),
	        planningMetadata: planningMetadataForUnit(match.unit),
	        matchedBy: "unitName",
	      };
    }
  }

  if (signal.subjectId) {
    const subject = findSubject(subjects, (entry) => entry.id === signal.subjectId);
    if (subject) {
      return {
        ...base,
        subjectId: subject.id,
        subjectName: subject.name,
	        unitId: null,
	        unitName: null,
	        allowedTaskTypes: normalizeAllowedTaskTypes(subject.units.flatMap((unit) => unit.taskTypes)),
	        planningMetadata: null,
	        matchedBy: "subjectId",
	      };
    }
  }

  if (signal.subjectName) {
    const subject = findSubject(subjects, (entry) => entry.name === signal.subjectName);
    if (subject) {
      return {
        ...base,
        subjectId: subject.id,
        subjectName: subject.name,
	        unitId: null,
	        unitName: null,
	        allowedTaskTypes: normalizeAllowedTaskTypes(subject.units.flatMap((unit) => unit.taskTypes)),
	        planningMetadata: null,
	        matchedBy: "subjectName",
	      };
    }
  }

  return {
    ...base,
    subjectId: null,
    subjectName: null,
    unitId: null,
    unitName: null,
    allowedTaskTypes: signal.examMode === "first" ? FIRST_FALLBACK_TASK_TYPES : SECOND_FALLBACK_TASK_TYPES,
    planningMetadata: null,
    matchedBy: "fallback",
  };
}

function hasAllowedTaskType(classification: CurriculumClassification, taskType: string) {
  return classification.allowedTaskTypes.includes(taskType);
}

function idPart(value: string | null) {
  return value ?? "fallback";
}

function makeCandidate(
  classification: CurriculumClassification,
  ruleKey: string,
  taskType: string,
  title: string,
  rationale: string,
  estimatedMinutes: number,
  prioritySignals: string[],
): CurriculumTaskCandidate {
  return {
    id: [classification.examMode, idPart(classification.subjectId), idPart(classification.unitId), ruleKey, taskType]
      .join(":")
      .replace(/[^\w:/-]+/g, "_")
      .replace(/_+/g, "_"),
    examMode: classification.examMode,
    subjectId: classification.subjectId,
    unitId: classification.unitId,
    taskType,
    title,
    rationale,
    prioritySignals: unique(prioritySignals),
    estimatedMinutes,
    isPrimaryCandidate: true,
    metadata: candidateMetadata(classification),
  };
}

function candidateMetadata(classification: CurriculumClassification): CurriculumTaskCandidate["metadata"] {
  const planning = classification.planningMetadata;
  if (!planning) return {};
  return {
    defaultReviewPattern: planning.defaultReviewPattern,
    coreConcepts: planning.coreConcepts.slice(0, 3),
    ...(planning.trapWords ? { trapWords: planning.trapWords.slice(0, 3) } : {}),
    ...(planning.mistakePatterns ? { mistakePatterns: planning.mistakePatterns.slice(0, 3) } : {}),
    importance: planning.importance,
    riskLevel: planning.riskLevel,
  };
}

function basePrioritySignals(classification: CurriculumClassification, signal: CurriculumLearningSignal, taskType: string) {
  const signals: string[] = [];
  if (signal.result === "wrong" || signal.result === "unknown") signals.push("wrong/unknown");
  if (signal.result === "missed" || signal.recentMissCount && signal.recentMissCount > 0 || signal.isDue) signals.push("due/recovery");
  if (signal.confidence === "unknown" || signal.confidence === "low") signals.push("confidence");
  if (signal.isFailRiskSubject) signals.push("과락 위험");
  if (typeof signal.daysUntilExam === "number" && signal.daysUntilExam <= 30) signals.push("exam date proximity");
  if (signal.recentMissCount && signal.recentMissCount > 0) signals.push("recent missed tasks");
  if (hasAllowedTaskType(classification, taskType)) signals.push("allowed task type match");
  if (classification.planningMetadata?.importance === "high") signals.push("high importance");
  if (classification.planningMetadata?.importance === "medium") signals.push("medium importance");
  if (classification.planningMetadata?.riskLevel === "high") signals.push("high risk unit");
  if (classification.planningMetadata?.riskLevel === "medium") signals.push("medium risk unit");
  return signals;
}

function planningRationaleSuffix(classification: CurriculumClassification, taskType: string) {
  const planning = classification.planningMetadata;
  if (!planning) return "";
  const review = `복습 패턴: ${planning.defaultReviewPattern}.`;
  if (classification.examMode === "first" && (taskType === "O/X" || taskType === "cloze") && planning.trapWords?.[0]) {
    return ` ${review} 메타 함정: ${planning.trapWords[0]}.`;
  }
  if (classification.examMode === "second" && (taskType === "rewrite" || taskType === "issue spotting" || taskType === "CASIO") && planning.mistakePatterns?.[0]) {
    return ` ${review} 흔한 실수 패턴: ${planning.mistakePatterns[0]}.`;
  }
  return ` ${review}`;
}

function recoveryRationale(signal: CurriculumLearningSignal) {
  if (signal.result === "missed" || signal.isDue || (signal.recentMissCount ?? 0) > 0) {
    return "최근 놓친 항목을 학습 입력으로 보고, 부담을 줄여 짧게 다시 회수합니다.";
  }
  return "지금 확인한 신호를 다음 행동으로 바로 연결합니다.";
}

function firstExamCandidates(classification: CurriculumClassification, signal: CurriculumLearningSignal) {
  const candidates: CurriculumTaskCandidate[] = [];
  const target = classification.unitName ?? classification.subjectName ?? "확인한 단원";
  const add = (ruleKey: string, taskType: string, title: string, rationale: string, minutes: number) => {
    if (hasAllowedTaskType(classification, taskType)) {
      candidates.push(makeCandidate(
        classification,
        ruleKey,
        taskType,
        title,
        `${rationale}${planningRationaleSuffix(classification, taskType)}`,
        minutes,
        basePrioritySignals(classification, signal, taskType),
      ));
    }
  };

  if (signal.result === "wrong" || signal.result === "unknown") {
    add("wrong_ox", "O/X", `${target} O/X 재확인`, `${recoveryRationale(signal)} 먼저 맞다/아니다 판단으로 기준을 세웁니다.`, 8);
    add("wrong_cloze", "cloze", `${target} 빈칸 회상`, `${recoveryRationale(signal)} 핵심어를 직접 꺼내며 설명보다 회상을 먼저 둡니다.`, 10);
  }
  if (signal.confidence === "unknown" || signal.confidence === "low") {
    add("low_confidence_cloze", "cloze", `${target} 개념 회상`, "확신이 낮은 부분은 짧은 빈칸 회상으로 한 가지 기준부터 복구합니다.", 10);
  }
  if (
    hasAllowedTaskType(classification, "accounting template")
    && (classification.subjectId === "first_accounting" || classification.unitId?.startsWith("acct_") || normalizeCurriculumTaskType(signal.taskType) === "accounting template" || signal.sourceType === "accounting_template")
  ) {
    add("accounting_template", "accounting template", `${target} 계산 틀 재확인`, "회계 계산은 풀이 전문이 아니라 입력값과 산식 틀을 분리해 다시 확인합니다.", 12);
  }
  if (candidates.length === 0) {
    add("fallback_ox", "O/X", `${target} O/X 확인`, `${recoveryRationale(signal)} 짧은 판단 문항으로 다음 복습 여부를 정합니다.`, 8);
    add("fallback_cloze", "cloze", `${target} 개념 회상`, "한 가지 기준을 직접 떠올린 뒤 필요한 설명만 확인합니다.", 10);
  }
  return candidates;
}

function secondExamCandidates(classification: CurriculumClassification, signal: CurriculumLearningSignal) {
  const candidates: CurriculumTaskCandidate[] = [];
  const target = classification.unitName ?? classification.subjectName ?? "확인한 쟁점";
  const normalizedTaskType = normalizeCurriculumTaskType(signal.taskType);
  const add = (ruleKey: string, taskType: string, title: string, rationale: string, minutes: number) => {
    if (hasAllowedTaskType(classification, taskType)) {
      candidates.push(makeCandidate(
        classification,
        ruleKey,
        taskType,
        title,
        `${rationale}${planningRationaleSuffix(classification, taskType)}`,
        minutes,
        basePrioritySignals(classification, signal, taskType),
      ));
    }
  };

  if (signal.result === "needs_rewrite") {
    add("needs_rewrite", "rewrite", `${target} 10분 다시 쓰기`, "가장 큰 빈틈 하나를 정해 문단 구조를 다시 세웁니다.", 10);
  }
  if (signal.sourceType === "casio" || normalizedTaskType === "CASIO") {
    add("casio_sequence", "CASIO", `${target} CASIO 순서 확인`, "계산 흐름은 단위와 입력 순서를 분리해 차분히 재확인합니다.", 8);
  }
  if (
    classification.subjectId === "second_theory"
    || classification.subjectId === "second_compensation_law"
    || signal.sourceType === "issue_spotting"
    || Boolean(signal.missingIssueCandidate)
  ) {
    add("issue_spotting", "issue spotting", `${target} 쟁점 찾기`, "누락 가능성이 있는 쟁점 하나를 먼저 표시한 뒤 답안화 여부를 정합니다.", 12);
  }
  if (signal.weakStructurePoint || signal.confidence === "low" || signal.confidence === "unknown") {
    add("structure_rewrite", "rewrite", `${target} 구조 보정`, "약한 구조 지점 하나만 골라 짧게 다시 씁니다.", 10);
  }
  if (candidates.length === 0) {
    add("fallback_issue_spotting", "issue spotting", `${target} 쟁점 찾기`, `${recoveryRationale(signal)} 답안 전에 빠진 쟁점 후보를 먼저 확인합니다.`, 12);
    add("fallback_rewrite", "rewrite", `${target} 짧은 다시 쓰기`, "확인한 기준을 한 문단으로 다시 써 실행 흐름을 이어갑니다.", 10);
  }
  return candidates;
}

export function recommendCurriculumTaskCandidates(
  classification: CurriculumClassification,
  signal: CurriculumLearningSignal,
) {
  const candidates = classification.examMode === "first"
    ? firstExamCandidates(classification, signal)
    : secondExamCandidates(classification, signal);
  return rankCurriculumTaskCandidates(candidates);
}

function candidateScore(candidate: CurriculumTaskCandidate) {
  const weights: Record<string, number> = {
    "wrong/unknown": 50,
    confidence: 28,
    "과락 위험": 45,
    "exam date proximity": 20,
    "recent missed tasks": 24,
    "due/recovery": 26,
    "allowed task type match": 12,
    "high importance": 18,
    "medium importance": 8,
    "high risk unit": 22,
    "medium risk unit": 10,
  };
  return candidate.prioritySignals.reduce((score, signal) => score + (weights[signal] ?? 0), 0);
}

export function rankCurriculumTaskCandidates(candidates: CurriculumTaskCandidate[]) {
  return [...candidates].sort((a, b) => {
    const scoreDelta = candidateScore(b) - candidateScore(a);
    if (scoreDelta !== 0) return scoreDelta;
    return a.estimatedMinutes - b.estimatedMinutes;
  });
}

export function buildCurriculumNextAction(
  signal: CurriculumLearningSignal,
  reference = loadAppraiserCurriculumReference(),
): CurriculumNextAction {
  const classification = classifyLearningSignalToCurriculum(signal, reference);
  const candidates = recommendCurriculumTaskCandidates(classification, signal);
  const todayPlanPreview = candidates.filter((candidate) => candidate.isPrimaryCandidate).slice(0, MAX_TODAY_PLAN_PRIMARY_TASKS);
  return {
    classification,
    candidates,
    topCandidate: candidates[0] ?? null,
    todayPlanPreview,
  };
}

export type AppraiserCurriculumKernelNode = {
  id: string;
  examMode: AppraiserExamMode;
  subject: string;
  unit: string;
  topic?: string;
  issue?: string;
  importance: "low" | "medium" | "high" | "critical";
  passRiskContribution?: string;
  firstExamTaskTypes?: string[];
  coreConcepts?: string[];
  trapWords?: string[];
  defaultReviewPattern: string;
  secondExamBridge?: string;
  answerSkeleton?: string[];
  keyTerms?: string[];
  rewriteTask?: string;
  taskTypes?: string[];
  sourceStatus: "draft" | string;
  needsOfficialVerification: boolean;
  lastReviewedAt: string;
};

type CurriculumCandidateInput = {
  examMode: AppraiserExamMode;
  subject?: string;
  text?: string;
  taskType?: string;
};

function metadataNodesForMode(reference: AppraiserCurriculumReference, mode: AppraiserExamMode): AppraiserCurriculumKernelNode[] {
  const document = mode === "first" ? reference.firstExam : reference.secondExam;
  const explicitNodes = (document as unknown as { nodes?: AppraiserCurriculumKernelNode[] }).nodes;
  if (Array.isArray(explicitNodes)) {
    return explicitNodes.map((node) => ({ ...node, examMode: mode }));
  }

  return document.subjects.flatMap((subject) => subject.units.map((unit) => ({
    id: unit.id,
    examMode: mode,
    subject: subject.name,
    unit: unit.name,
    ...(mode === "first" ? { topic: unit.name, firstExamTaskTypes: unit.taskTypes } : { issue: unit.name, taskTypes: unit.taskTypes }),
    importance: unit.importance,
    passRiskContribution: unit.riskLevel ? `${unit.riskLevel} risk metadata node` : undefined,
    coreConcepts: [...unit.coreConcepts],
    trapWords: unit.trapWords ? [...unit.trapWords] : undefined,
    defaultReviewPattern: unit.defaultReviewPattern,
    secondExamBridge: unit.secondExamBridge,
    sourceStatus: unit.sourceStatus ?? "draft",
    needsOfficialVerification: unit.needsOfficialVerification ?? true,
    lastReviewedAt: document.lastReviewedAt,
  } satisfies AppraiserCurriculumKernelNode)));
}

export function getAppraiserCurriculumNodes(mode?: AppraiserExamMode, reference = loadAppraiserCurriculumReference()): AppraiserCurriculumKernelNode[] {
  const modes: AppraiserExamMode[] = mode ? [mode] : ["first", "second"];
  return modes.flatMap((entry) => metadataNodesForMode(reference, entry)).map((node) => ({
    ...node,
    coreConcepts: node.coreConcepts ? [...node.coreConcepts] : undefined,
    trapWords: node.trapWords ? [...node.trapWords] : undefined,
    firstExamTaskTypes: node.firstExamTaskTypes ? [...node.firstExamTaskTypes] : undefined,
    taskTypes: node.taskTypes ? [...node.taskTypes] : undefined,
    answerSkeleton: node.answerSkeleton ? [...node.answerSkeleton] : undefined,
    keyTerms: node.keyTerms ? [...node.keyTerms] : undefined,
  }));
}

export function findCurriculumNodeById(id: string, reference = loadAppraiserCurriculumReference()): AppraiserCurriculumKernelNode | null {
  if (!id.trim()) return null;
  return getAppraiserCurriculumNodes(undefined, reference).find((node) => node.id === id) ?? null;
}

function normalizedSearchText(value: string | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function nodeTaskTypes(node: AppraiserCurriculumKernelNode) {
  return node.examMode === "first" ? (node.firstExamTaskTypes ?? []) : (node.taskTypes ?? []);
}

export function findCurriculumCandidates(input: CurriculumCandidateInput, reference = loadAppraiserCurriculumReference()): AppraiserCurriculumKernelNode[] {
  if (input.examMode !== "first" && input.examMode !== "second") return [];
  const subject = normalizedSearchText(input.subject);
  const text = normalizedSearchText(input.text);
  const taskType = normalizedSearchText(input.taskType);
  if (!subject && !text && !taskType) return [];

  return getAppraiserCurriculumNodes(input.examMode, reference).filter((node) => {
    const subjectMatches = !subject || node.subject.toLowerCase() === subject || node.subject.toLowerCase().includes(subject) || subject.includes(node.subject.toLowerCase());
    if (!subjectMatches) return false;
    const searchable = [node.subject, node.unit, node.topic, node.issue, ...(node.coreConcepts ?? []), ...(node.trapWords ?? []), ...(node.keyTerms ?? [])]
      .filter((value): value is string => typeof value === "string")
      .join(" ")
      .toLowerCase();
    const textMatches = !text || searchable.includes(text) || text.split(/\s+/).filter(Boolean).some((token) => searchable.includes(token));
    const taskMatches = !taskType || nodeTaskTypes(node).some((entry) => entry.toLowerCase() === taskType || entry.toLowerCase().includes(taskType));
    return textMatches && taskMatches;
  });
}

export function getDefaultTaskTypesForNode(nodeId: string, reference = loadAppraiserCurriculumReference()): string[] {
  const node = findCurriculumNodeById(nodeId, reference);
  return node ? [...nodeTaskTypes(node)] : [];
}

export function getDefaultReviewPatternForNode(nodeId: string, reference = loadAppraiserCurriculumReference()): string | null {
  return findCurriculumNodeById(nodeId, reference)?.defaultReviewPattern ?? null;
}

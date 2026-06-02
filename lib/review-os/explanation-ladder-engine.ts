import { normalizeCurriculumTaskType } from "./curriculum-engine";
import {
  getExplanationLabels,
  loadExplanationLadder,
  type AppraiserExamMode,
  type CurriculumReferenceLoaderConfig,
  type ExplanationLadderDocument,
} from "./curriculum-reference";
import { type ExecutionLearningSignal } from "./execution-learning-signal";
import { type ReviewQueueItem } from "./execution-review-queue";
import { type TodayPlanTask } from "./today-plan-prioritization";

export type ExplanationLadderLabel = "1타 쉬운풀이" | "합격 한 줄" | "출제자 함정" | "10초 확인";

export type ExplanationLadderEntry = {
  label: ExplanationLadderLabel;
  text: string;
};

export type ExplanationLadderWarning = {
  code: "reference_needs_verification" | "fallback_template";
  message: string;
  sourceStatus?: string;
  lastReviewedAt?: string;
};

export type ExplanationLadderOutput = {
  labels: ExplanationLadderLabel[];
  entries: ExplanationLadderEntry[];
  nextAction: string;
  warnings: ExplanationLadderWarning[];
};

export type ExplanationLadderContext = CurriculumReferenceLoaderConfig & {
  concept?: string;
  subjectName?: string;
  unitName?: string;
  nextAction?: string;
};

type LadderSource = {
  examMode: AppraiserExamMode;
  taskType: string;
  subjectName?: string;
  unitName?: string;
  nextAction?: string;
};

const LABELS: ExplanationLadderLabel[] = ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"];
const MAX_ENTRY_CHARS = 96;
const RAW_TEXT_FIELD_NAMES = new Set([
  "rawText",
  "rawOcrText",
  "ocrText",
  "userAnswer",
  "userAnswerText",
  "answerText",
  "rawAnswerText",
  "problemText",
  "questionText",
  "rawQuestionText",
  "uploadedProblemText",
  "fullText",
  "sourceText",
  "copyrightedText",
  "originalText",
]);
const RAW_TEXT_FIELD_PATTERN = /(raw|ocr|answer|problem|question|fulltext|sourceText|userText|originalText|copyright)/i;
const FORBIDDEN_COPY_PATTERNS = [
  /공식\s*채점/,
  /공식\s*점수/,
  /공식\s*예측/,
  /모범\s*답안/,
  /정답\s*전문/,
  /instructor/i,
  /\/instructor/i,
  /학원용/,
  /강사/,
  /결제/,
  /payment/i,
  /archive/i,
  /아카이브/,
  /native app/i,
  /네이티브 앱/,
];

function assertNoRawTextKeys(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoRawTextKeys);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (RAW_TEXT_FIELD_NAMES.has(key) || RAW_TEXT_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw text field is not accepted by explanation ladder helper: ${key}`);
    }
    assertNoRawTextKeys(nestedValue);
  }
}

function assertSafeCopy(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Forbidden learner copy is not accepted by explanation ladder helper: ${String(forbidden)}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertSafeCopy);
    return;
  }
  Object.values(value as Record<string, unknown>).forEach(assertSafeCopy);
}

function normalizeTaskType(taskType: string | undefined) {
  const normalized = normalizeCurriculumTaskType(taskType ?? "") ?? taskType?.trim();
  return normalized && normalized.length > 0 ? normalized : "review";
}

function isOxTask(taskType: string) {
  return /^O\/X$/i.test(normalizeTaskType(taskType));
}

function cleanText(value: string | undefined) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return normalized.length > 0 ? normalized : undefined;
}

function clip(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= MAX_ENTRY_CHARS ? normalized : `${normalized.slice(0, MAX_ENTRY_CHARS - 1).trim()}…`;
}

function topicOf(source: LadderSource, context?: ExplanationLadderContext) {
  return cleanText(context?.unitName) ?? cleanText(source.unitName) ?? cleanText(context?.subjectName) ?? cleanText(source.subjectName) ?? "오늘 항목";
}

function findTemplate(ladder: ExplanationLadderDocument, taskType: string, context?: ExplanationLadderContext) {
  const normalizedTaskType = normalizeTaskType(taskType);
  const concept = cleanText(context?.concept)?.toLowerCase();
  const byConcept = concept
    ? ladder.templates.find((template) => template.concept.toLowerCase().includes(concept) || concept.includes(template.concept.toLowerCase()))
    : undefined;
  if (byConcept && byConcept.taskTypes.map(normalizeTaskType).includes(normalizedTaskType)) return byConcept;
  return ladder.templates.find((template) => template.taskTypes.map(normalizeTaskType).includes(normalizedTaskType));
}

function buildWarnings(ladder: ExplanationLadderDocument, usedFallback: boolean): ExplanationLadderWarning[] {
  const warnings: ExplanationLadderWarning[] = [];
  if (ladder.needsOfficialVerification) {
    warnings.push({
      code: "reference_needs_verification",
      message: "참고 메타데이터 검수 상태라서, 오늘은 짧은 학습 점검용으로만 사용합니다.",
      sourceStatus: ladder.sourceStatus,
      lastReviewedAt: ladder.lastReviewedAt,
    });
  }
  if (usedFallback) {
    warnings.push({
      code: "fallback_template",
      message: "해당 과제에 맞는 기본 사다리 문장으로 구성했습니다.",
    });
  }
  return warnings;
}

export function selectTenSecondCheck(taskType: string, examMode: AppraiserExamMode) {
  const normalizedTaskType = normalizeTaskType(taskType);
  if (examMode === "first" && isOxTask(normalizedTaskType)) return "판단 기준 1개를 가리고 O/X로 다시 답합니다.";
  if (examMode === "first" && normalizedTaskType === "cloze") return "핵심어 3개를 가리고 소리 내어 회상합니다.";
  if (examMode === "first" && normalizedTaskType === "accounting template") return "입력값, 공식, 검산 방향을 빈칸에 다시 넣습니다.";
  if (examMode === "second" && normalizedTaskType === "CASIO") return "CASIO 입력 순서, 단위, 검산점을 10초 안에 말합니다.";
  if (examMode === "second" && normalizedTaskType === "issue spotting") return "빠진 쟁점 후보 1개와 목차 위치를 적습니다.";
  if (examMode === "second" && normalizedTaskType === "rewrite") return "쟁점, 구조, 결론 중 고칠 1곳을 표시합니다.";
  return examMode === "first" ? "정답을 보기 전 핵심 기준 1개를 회상합니다." : "다시 쓸 한 문장과 확인 기준 1개를 고릅니다.";
}

export function selectTrapFocus(taskType: string, examMode: AppraiserExamMode) {
  const normalizedTaskType = normalizeTaskType(taskType);
  if (examMode === "first" && isOxTask(normalizedTaskType)) return "문장 끝의 예외 표현과 개념 구분을 먼저 봅니다.";
  if (examMode === "first" && normalizedTaskType === "cloze") return "비슷한 핵심어를 바꿔 쓰지 않았는지 확인합니다.";
  if (examMode === "first" && normalizedTaskType === "accounting template") return "공식 방향, 부호, 단위가 뒤집히는 지점을 확인합니다.";
  if (examMode === "second" && normalizedTaskType === "CASIO") return "입력 순서, 단위, 반올림 위치가 흔들리는 지점을 봅니다.";
  if (examMode === "second" && normalizedTaskType === "issue spotting") return "큰 논점 아래 빠진 하위 쟁점 후보를 봅니다.";
  if (examMode === "second" && normalizedTaskType === "rewrite") return "쟁점 제시 없이 결론으로 건너뛰는 흐름을 확인합니다.";
  return "헷갈린 기준 1개만 분리합니다.";
}

function fallbackEntryText(label: ExplanationLadderLabel, source: LadderSource, context?: ExplanationLadderContext) {
  const taskType = normalizeTaskType(source.taskType);
  const topic = topicOf(source, context);

  if (label === "10초 확인") return selectTenSecondCheck(taskType, source.examMode);
  if (label === "출제자 함정") return selectTrapFocus(taskType, source.examMode);

  if (source.examMode === "first" && isOxTask(taskType)) {
    return label === "1타 쉬운풀이"
      ? `${topic}의 판단 기준을 한 문장으로 먼저 세웁니다.`
      : `${topic}는 기준어 1개로 O/X 판단을 고정합니다.`;
  }
  if (source.examMode === "first" && taskType === "cloze") {
    return label === "1타 쉬운풀이"
      ? `${topic}는 설명보다 핵심어 회상을 먼저 확인합니다.`
      : `${topic} 핵심어를 빈칸 없이 말할 수 있어야 합니다.`;
  }
  if (source.examMode === "first" && taskType === "accounting template") {
    return label === "1타 쉬운풀이"
      ? `${topic}는 입력값, 공식, 검산 순서로 짧게 풉니다.`
      : "계산틀은 입력값 → 공식 → 검산 방향 순서로 고정합니다.";
  }
  if (source.examMode === "second" && taskType === "CASIO") {
    return label === "1타 쉬운풀이"
      ? `${topic}는 입력 순서를 작게 나누고 단위를 끝에 확인합니다.`
      : "CASIO는 입력 순서, 단위, 검산점을 한 번에 확인합니다.";
  }
  if (source.examMode === "second" && taskType === "issue spotting") {
    return label === "1타 쉬운풀이"
      ? `${topic}는 빠진 쟁점 후보를 먼저 찾고 목차에 붙입니다.`
      : "쟁점 후보를 잡은 뒤 목차 위치를 정합니다.";
  }
  if (source.examMode === "second" && taskType === "rewrite") {
    return label === "1타 쉬운풀이"
      ? `${topic}는 쟁점, 구조, 결론 중 하나만 고쳐 다시 씁니다.`
      : "답안은 쟁점 제시 → 구조화 → 짧은 결론 순서로 다듬습니다.";
  }

  return label === "1타 쉬운풀이"
    ? `${topic}의 가장 큰 빈틈 1개만 짧게 확인합니다.`
    : `${topic}는 회상 후 바로 재시도합니다.`;
}

function templateTextFor(label: ExplanationLadderLabel, source: LadderSource, ladder: ExplanationLadderDocument, context?: ExplanationLadderContext) {
  const template = findTemplate(ladder, source.taskType, context);
  const raw = template?.ladder[label];
  if (!raw) return fallbackEntryText(label, source, context);

  if (label === "10초 확인") return selectTenSecondCheck(source.taskType, source.examMode);
  if (label === "출제자 함정") return selectTrapFocus(source.taskType, source.examMode);

  const taskType = normalizeTaskType(source.taskType);
  if (source.examMode === "first" && taskType === "accounting template" && label === "1타 쉬운풀이") {
    return fallbackEntryText(label, source, context);
  }
  if (source.examMode === "second" && ["rewrite", "CASIO", "issue spotting"].includes(taskType) && label === "1타 쉬운풀이") {
    return fallbackEntryText(label, source, context);
  }
  return raw;
}

function nextActionFor(source: LadderSource, context?: ExplanationLadderContext) {
  const explicit = cleanText(context?.nextAction) ?? cleanText(source.nextAction);
  if (explicit) return explicit;
  const taskType = normalizeTaskType(source.taskType);
  if (source.examMode === "first" && isOxTask(taskType)) return "해설 전에 O/X 5문항을 다시 판단하기";
  if (source.examMode === "first" && taskType === "cloze") return "핵심어 3개를 가리고 다시 말하기";
  if (source.examMode === "first" && taskType === "accounting template") return "계산틀 1개를 입력값부터 다시 채우기";
  if (source.examMode === "second" && taskType === "CASIO") return "CASIO 입력 순서 1개를 다시 실행하기";
  if (source.examMode === "second" && taskType === "issue spotting") return "쟁점 후보 3개를 적고 목차에 붙이기";
  if (source.examMode === "second" && taskType === "rewrite") return "한 문단을 짧게 다시 쓰기";
  return source.examMode === "first" ? "기준 1개를 회상하고 다시 풀기" : "고칠 문장 1개를 다시 쓰기";
}

function buildExplanationLadder(source: LadderSource, context?: ExplanationLadderContext): ExplanationLadderOutput {
  assertNoRawTextKeys({ source, context });
  if (source.examMode !== "first" && source.examMode !== "second") throw new Error(`Unsupported examMode ${String(source.examMode)}`);

  const ladder = loadExplanationLadder(context);
  const loadedLabels = getExplanationLabels({ explanationLadder: ladder } as Parameters<typeof getExplanationLabels>[0])
    .map((entry) => entry.label)
    .filter((label): label is ExplanationLadderLabel => LABELS.includes(label as ExplanationLadderLabel));
  const labels = LABELS.every((label) => loadedLabels.includes(label)) ? LABELS : loadedLabels;
  const usedFallback = !findTemplate(ladder, source.taskType, context);
  const entries = labels.map((label) => ({
    label,
    text: clip(templateTextFor(label, source, ladder, context)),
  }));
  const output: ExplanationLadderOutput = {
    labels,
    entries,
    nextAction: nextActionFor(source, context),
    warnings: buildWarnings(ladder, usedFallback),
  };

  assertNoRawTextKeys(output);
  assertSafeCopy(output);
  return output;
}

export function buildExplanationLadderForSignal(signal: ExecutionLearningSignal, context?: ExplanationLadderContext): ExplanationLadderOutput {
  assertNoRawTextKeys(signal);
  return buildExplanationLadder({
    examMode: signal.examMode,
    taskType: signal.nextRecommendedTaskType ?? signal.taskType,
    subjectName: signal.subjectName,
    unitName: signal.unitName,
  }, context);
}

export function buildExplanationLadderForReviewQueueItem(item: ReviewQueueItem, context?: ExplanationLadderContext): ExplanationLadderOutput {
  assertNoRawTextKeys(item);
  return buildExplanationLadder({
    examMode: item.examMode,
    taskType: item.taskType,
    subjectName: item.subjectName,
    unitName: item.unitName,
    nextAction: item.primaryAction,
  }, context);
}

export function buildExplanationLadderForTodayPlanTask(task: TodayPlanTask, context?: ExplanationLadderContext): ExplanationLadderOutput {
  assertNoRawTextKeys(task);
  return buildExplanationLadder({
    examMode: task.examMode,
    taskType: task.taskType,
    subjectName: task.subjectName,
    unitName: task.unitName,
    nextAction: task.primaryAction,
  }, context);
}

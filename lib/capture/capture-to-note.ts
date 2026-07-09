import { buildCaptureLegalGroundingHint } from "./legal-grounding-hook";
import { buildCognitiveLearningActionUnit } from "../review-os/cognitive-learning-actions";
import type {
  CaptureToNoteDraft,
  CaptureToNoteInput,
  CaptureToNoteLegalGroundingSummary,
  CaptureToNoteNextTaskType,
  CaptureToNoteReviewQueueCandidate,
  CaptureToNoteSourceType,
  CaptureToNoteTodayPlanCandidate,
} from "./capture-to-note-types";

const MAX_EDITABLE_TEXT_LENGTH = 8000;
const MAX_SUMMARY_LENGTH = 96;
const LEGAL_SUBJECT_PATTERN = /민법|법규|보상법규|관계법규|행정|law/i;
const LEGAL_TEXT_PATTERN = /조문|법령|법적|요건|포섭|처분|수용|사업인정|행정절차|행정소송|행정심판|무효|취소/;

export type { CaptureToNoteDraft, CaptureToNoteInput } from "./capture-to-note-types";

function normalizeText(value: unknown, fallback = "") {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  return normalized || fallback;
}

function normalizeEditableText(value: string) {
  return value.replace(/\u0000/g, " ").trim().slice(0, MAX_EDITABLE_TEXT_LENGTH);
}

function firstLine(value: string, fallback: string) {
  return (
    value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, MAX_SUMMARY_LENGTH) ?? fallback
  );
}

function normalizeSourceType(value: CaptureToNoteInput["sourceType"]): CaptureToNoteSourceType {
  if (value === "photo" || value === "pdf" || value === "text") return value;
  return "text";
}

function normalizeConfidence(value: CaptureToNoteInput["confidence"]) {
  const text = normalizeText(value, "unknown").toLowerCase();
  if (text === "낮음" || text === "low") return "low";
  if (text === "중간" || text === "medium") return "medium";
  if (text === "높음" || text === "high") return "high";
  return "unknown";
}

function normalizeMinutes(value: CaptureToNoteInput["timeSpentMin"], fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string") {
    const match = value.match(/\d+/);
    if (match) return Math.max(0, Number(match[0]));
  }
  return fallback;
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function deriveTopicCandidates(input: { subject: string; text: string; problemSummary: string }) {
  const tokens = `${input.subject} ${input.problemSummary} ${input.text}`
    .replace(/[^\p{L}\p{N}\s/.-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && token.length <= 18);

  return unique(tokens).slice(0, 5).length > 0 ? unique(tokens).slice(0, 5) : [input.subject];
}

function deriveFirstNextTaskType(text: string): CaptureToNoteNextTaskType {
  if (/빈칸|cloze|암기|정의/.test(text)) return "cloze";
  if (/개념|요건|효과|무효|취소|조건/.test(text)) return "concept_review";
  return "ox";
}

function deriveSecondNextTaskType(text: string): CaptureToNoteNextTaskType {
  if (/쟁점|누락|issue/i.test(text)) return "issue_recall";
  if (/목차|outline/i.test(text)) return "outline_review";
  return "paragraph_rewrite";
}

function formatNextTaskTypeLabel(taskType: CaptureToNoteNextTaskType) {
  if (taskType === "paragraph_rewrite") return "문단 다시쓰기";
  if (taskType === "issue_recall") return "쟁점 회상";
  if (taskType === "outline_review") return "목차 점검";
  if (taskType === "concept_review") return "개념 확인";
  if (taskType === "cloze") return "빈칸 회상";
  return "O/X 재확인";
}

function deriveBiggestGap(input: { examMode: "first" | "second"; subject: string; text: string; confidence: string }) {
  const text = `${input.subject} ${input.text}`;
  if (input.examMode === "first") {
    if (input.confidence === "low" || input.confidence === "unknown") return "확신이 낮은 개념 1개를 먼저 확인해야 합니다.";
    if (/무효|취소/.test(text)) return "무효와 취소의 효과 구분이 흔들립니다.";
    if (/요건|조건/.test(text)) return "요건과 결론을 연결하는 기준이 약합니다.";
    return "선택한 답과 개념 근거의 연결이 약합니다.";
  }

  if (/목차|구조|outline/i.test(text)) return "목차와 문단의 연결이 약합니다.";
  if (/쟁점|누락|issue/i.test(text)) return "핵심 쟁점 1개가 답안에서 분리되어 보입니다.";
  if (/법|조문|요건|포섭/.test(text)) return "법적 요건과 사안 포섭의 연결이 약합니다.";
  return "문단 안에서 근거와 결론의 연결이 약합니다.";
}

function deriveNextAction(input: { examMode: "first" | "second"; subject: string; biggestGap: string; nextTaskType: CaptureToNoteNextTaskType }) {
  if (input.examMode === "first") {
    if (input.nextTaskType === "cloze") return `${input.subject} 핵심 정의 1개를 빈칸으로 다시 떠올립니다.`;
    if (input.nextTaskType === "concept_review") return `${input.biggestGap} 기준을 3줄로 다시 정리합니다.`;
    return `${input.subject} O/X 5문항으로 같은 개념을 다시 확인합니다.`;
  }

  if (input.nextTaskType === "issue_recall") return `${input.subject} 쟁점 1개를 3줄 목차로 먼저 회상합니다.`;
  if (input.nextTaskType === "outline_review") return `${input.subject} 목차 3줄을 다시 쓰고 문단 1개로 연결합니다.`;
  return `${input.subject} 문단 1개를 다시 쓰며 빠진 연결을 보강합니다.`;
}

function deriveMistakeType(input: { examMode: "first" | "second"; text: string; confidence: string }) {
  if (input.examMode === "first") {
    if (input.confidence === "low" || input.confidence === "unknown") return "low_confidence_concept";
    if (/요건|조건/.test(input.text)) return "condition_miss";
    return "concept_confusion";
  }

  if (/목차|구조|outline/i.test(input.text)) return "structure_gap";
  if (/쟁점|누락|issue/i.test(input.text)) return "missing_issue";
  return "paragraph_connection_gap";
}

function deriveWeakStructurePoint(input: { examMode: "first" | "second"; mistakeType: string }) {
  if (input.examMode === "first") {
    if (input.mistakeType === "condition_miss") return "요건 1개를 빠뜨리기 쉬운 상태";
    return "개념 근거를 답 선택 전에 고정하는 단계";
  }

  if (input.mistakeType === "structure_gap") return "목차와 문단 첫 문장의 연결";
  if (input.mistakeType === "missing_issue") return "쟁점 회상 후 문단 배치";
  return "근거 문장과 결론 문장의 연결";
}

function buildId(seed: string) {
  return seed
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "capture-to-note";
}

function buildTodayPlanCandidate(input: {
  examMode: "first" | "second";
  subject: string;
  topicCandidates: string[];
  biggestGap: string;
  nextAction: string;
  nextTaskType: CaptureToNoteNextTaskType;
  estimatedMinutes: number;
  confidence: string;
}): CaptureToNoteTodayPlanCandidate {
  const idSeed = [input.examMode, input.subject, input.nextTaskType, input.topicCandidates[0]].join("-");
  return {
    id: `capture-today-${buildId(idSeed)}`,
    metadataOnly: true,
    source: "capture_to_note",
    sourceMode: "learner_capture",
    examMode: input.examMode,
    subject: input.subject,
    title: `${input.subject} ${formatNextTaskTypeLabel(input.nextTaskType)} ${input.estimatedMinutes}분`,
    topicCandidates: input.topicCandidates.slice(0, 3),
    biggestGap: input.biggestGap,
    nextAction: input.nextAction,
    nextTaskType: input.nextTaskType,
    estimatedMinutes: input.estimatedMinutes,
    priority: input.confidence === "low" || input.confidence === "unknown" ? 80 : 60,
  };
}

function buildReviewQueueCandidate(input: {
  examMode: "first" | "second";
  subject: string;
  biggestGap: string;
  nextAction: string;
  nextTaskType: CaptureToNoteNextTaskType;
  confidence: string;
}): CaptureToNoteReviewQueueCandidate {
  const idSeed = [input.examMode, input.subject, input.nextTaskType, input.biggestGap].join("-");
  return {
    id: `capture-review-${buildId(idSeed)}`,
    metadataOnly: true,
    source: "capture_to_note",
    sourceMode: "learner_capture",
    examMode: input.examMode,
    subject: input.subject,
    reviewReason: input.biggestGap,
    biggestGap: input.biggestGap,
    nextAction: input.nextAction,
    nextTaskType: input.nextTaskType,
    dueInDays: input.confidence === "high" ? 3 : 1,
    priority: input.confidence === "low" || input.confidence === "unknown" ? 85 : 65,
  };
}

function inferLegalConceptCandidates(input: CaptureToNoteInput, text: string) {
  const explicit = Array.isArray(input.conceptKeyCandidates) ? input.conceptKeyCandidates : [];
  const inferred: string[] = [];
  const joined = `${input.subject} ${text}`;

  if (/민법|무효|취소|물권|채권/.test(joined)) inferred.push("civil_law_capture_candidate");
  if (/법규|보상|사업인정|처분|수용/.test(joined)) inferred.push("compensation_law_capture_candidate");
  if (/행정절차|행정소송|행정심판/.test(joined)) inferred.push("administrative_law_capture_candidate");

  return unique([...explicit, ...inferred]).slice(0, 5);
}

function toLegalGroundingSummary(hint: CaptureToNoteInput["legalGroundingHint"]): CaptureToNoteLegalGroundingSummary | undefined {
  if (!hint) return undefined;
  return {
    status: hint.status,
    canDraftLegalExplanation: hint.canDraftLegalExplanation,
    needsReview: hint.needsReview,
    unsupported: hint.unsupported,
    learnerSafeMessage: hint.learnerSafeMessage,
    sourceAnchorCount: hint.sourceAnchors.sourceAnchorCount,
    verifiedAnchorCount: hint.sourceAnchors.verifiedAnchorCount,
  };
}

async function resolveLegalGroundingHint(input: CaptureToNoteInput, editableText: string) {
  if (input.legalGroundingHint) return input.legalGroundingHint;
  const conceptKeyCandidates = inferLegalConceptCandidates(input, editableText);
  const shouldCheckLegalGrounding = LEGAL_SUBJECT_PATTERN.test(input.subject) || conceptKeyCandidates.length > 0;

  if (!shouldCheckLegalGrounding) return null;

  try {
    return await buildCaptureLegalGroundingHint({
      conceptKeyCandidates,
      examSubject: input.subject,
      subject: input.subject,
      sourceMode: "learner_capture",
      keywordCandidates: conceptKeyCandidates.length > 0 ? conceptKeyCandidates.map((conceptKey) => ({ conceptKey })) : [],
      client: input.legalGroundingClient ?? null,
    });
  } catch {
    return null;
  }
}

export async function buildCaptureToNoteDraft(input: CaptureToNoteInput): Promise<CaptureToNoteDraft> {
  const examMode = input.examMode === "second" ? "second" : "first";
  const subject = normalizeText(input.subject, examMode === "second" ? "감정평가사 2차" : "감정평가사 1차");
  const sourceType = normalizeSourceType(input.sourceType);
  const userEditableText = normalizeEditableText(input.editableText);
  const problemSummary = normalizeText(input.problemSummary, firstLine(userEditableText, `${subject} 학습 기록`));
  const answerSummary = firstLine(userEditableText, examMode === "second" ? "내 답안 구조 초안" : "선택 이유 초안");
  const confidence = normalizeConfidence(input.confidence);
  const topicCandidates = deriveTopicCandidates({ subject, text: userEditableText, problemSummary });
  const nextTaskType = examMode === "first" ? deriveFirstNextTaskType(userEditableText) : deriveSecondNextTaskType(userEditableText);
  const biggestGap = deriveBiggestGap({ examMode, subject, text: userEditableText, confidence });
  const nextAction = deriveNextAction({ examMode, subject, biggestGap, nextTaskType });
  const mistakeType = deriveMistakeType({ examMode, text: userEditableText, confidence });
  const weakStructurePoint = deriveWeakStructurePoint({ examMode, mistakeType });
  const estimatedMinutes = normalizeMinutes(input.timeSpentMin, examMode === "first" ? 7 : 12);
  const legalGroundingHint = toLegalGroundingSummary(await resolveLegalGroundingHint(input, userEditableText));
  const todayPlanCandidate = buildTodayPlanCandidate({
    examMode,
    subject,
    topicCandidates,
    biggestGap,
    nextAction,
    nextTaskType,
    estimatedMinutes,
    confidence,
  });
  const reviewQueueCandidate = buildReviewQueueCandidate({
    examMode,
    subject,
    biggestGap,
    nextAction,
    nextTaskType,
    confidence,
  });
  const cognitiveLearningAction = buildCognitiveLearningActionUnit({
    mode: examMode,
    subjectLabel: subject,
    biggestGap,
    nextAction,
    nextTaskType,
  });

  return {
    examMode,
    subject,
    sourceType,
    userEditableText,
    problemSummary,
    answerSummary,
    biggestGap,
    nextAction,
    derivedSignals: {
      subject,
      topicCandidates,
      mistakeType,
      weakStructurePoint,
      nextTaskType,
    },
    todayPlanCandidate,
    todayPlanCandidates: [todayPlanCandidate].slice(0, 3),
    reviewQueueCandidate,
    cognitiveLearningAction,
    ...(legalGroundingHint ? { legalGroundingHint } : {}),
    dataBoundary: {
      learnerOwnedRawText: true,
      derivedSignalsOnlyForPlanning: true,
      globalReferenceWrite: false,
    },
  };
}

export function isLegalCaptureCandidate(input: Pick<CaptureToNoteInput, "subject" | "conceptKeyCandidates"> & { editableText?: string }) {
  return LEGAL_SUBJECT_PATTERN.test(input.subject) || LEGAL_TEXT_PATTERN.test(input.editableText ?? "") || Boolean(input.conceptKeyCandidates?.length);
}

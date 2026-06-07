import {
  findCurriculumCandidates,
  getDefaultReviewPatternForNode,
  type AppraiserCurriculumKernelNode,
} from "./curriculum-engine";
import { buildExplanationLadder, validateExplanationLadder, type ExplanationLadderV1 } from "./explanation-ladder";
import { assertNoRawUserDataInDerived } from "./data-boundary";
import type { AppraiserExamMode } from "./curriculum-reference";

type CaptureConfidence = "낮음" | "중간" | "높음" | "unknown" | "low" | "medium" | "high" | string;

type CurriculumAnchoredCaptureInput = {
  userId: string;
  examMode: AppraiserExamMode | string;
  subject: string;
  learnerText?: string;
  derivedSummary?: string;
  mistakeReason?: string;
  confidence?: CaptureConfidence;
  timeSpent?: number | string | null;
  captureSourceType: string;
  taskType?: string;
};

type CurriculumCandidateSummary = {
  id: string;
  examMode: AppraiserExamMode;
  subject: string;
  topicLabel: string;
  taskTypes: string[];
  importance: AppraiserCurriculumKernelNode["importance"];
  sourceStatus: string;
  needsOfficialVerification: boolean;
};

type ExplanationLadderSummary = {
  metadataOnly: true;
  conceptLabel: string;
  subject: string;
  examMode: AppraiserExamMode;
  labels: ExplanationLadderV1["entries"][number]["label"][];
  tenSecondCheckLabel: "10초 확인";
  sourceStatus: string;
  needsOfficialVerification: boolean;
};

export type CurriculumAnchoredTodayPlanCandidate = {
  id: string;
  metadataOnly: true;
  source: "curriculum_capture";
  examMode: AppraiserExamMode;
  subject: string;
  curriculumNodeId?: string;
  title: string;
  topicLabel: string;
  gapLabel: string;
  nextTaskType: string;
  nextAction: string;
  estimatedMinutes: number;
  reviewPattern: string | null;
  dueReview: boolean;
  recentWrong: boolean;
  confidence: "unknown" | "low" | "medium" | "high";
  confidenceGap: number;
  weakStructure: boolean;
  priority: number;
};

export type CurriculumAnchoredReviewQueueCandidate = {
  id: string;
  metadataOnly: true;
  source: "curriculum_capture";
  examMode: AppraiserExamMode;
  subject: string;
  curriculumNodeId?: string;
  topicLabel: string;
  gapLabel: string;
  nextTaskType: string;
  nextAction: string;
  reviewReason: string;
  reviewPattern: string | null;
  priority: number;
};

export type CurriculumAnchoredCaptureSignal = {
  metadataOnly: true;
  examMode?: AppraiserExamMode;
  subject: string;
  curriculumCandidates: CurriculumCandidateSummary[];
  primaryConceptNodeId?: string;
  safeFallbackReason?: string;
  topicLabel: string;
  gapLabel: string;
  nextTaskType: string;
  nextAction: string;
  estimatedMinutes: number;
  explanationLadderSummary: ExplanationLadderSummary | null;
  reviewPattern: string | null;
  todayPlanCandidate: CurriculumAnchoredTodayPlanCandidate;
  reviewQueueCandidate: CurriculumAnchoredReviewQueueCandidate;
};

const FALLBACK_UNSUPPORTED_EXAM_MODE = "지원 범위 밖 시험 모드는 커리큘럼 연결 없이 안전 후보만 생성합니다.";
const FALLBACK_NO_NODE = "일치하는 커리큘럼 노드를 찾지 못해 과목 기반 안전 후보로 유지합니다.";
const FORBIDDEN_SHARED_COPY_PATTERNS = [
  /공식\s*채점/,
  /공식\s*정답/,
  /최종\s*점수/,
  /점수\s*(?:예측|확정|보장)/,
  /합격\s*(?:보장|예측|확정)/,
  /불합격\s*(?:예측|확정)/,
  /모범\s*답안/,
  /model\s*answer/i,
  /pass\s*fail/i,
];

function isSupportedExamMode(value: unknown): value is AppraiserExamMode {
  return value === "first" || value === "second";
}

function cleanLabel(value: unknown, fallback: string) {
  const normalized = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!normalized) return fallback;
  const withoutForbidden = FORBIDDEN_SHARED_COPY_PATTERNS.reduce((text, pattern) => text.replace(pattern, ""), normalized).trim();
  return withoutForbidden || fallback;
}

function shortLabel(value: unknown, fallback: string, max = 24) {
  const cleaned = cleanLabel(value, fallback);
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

function normalizeConfidence(confidence: CaptureConfidence | undefined): "unknown" | "low" | "medium" | "high" {
  if (confidence === "낮음" || confidence === "low") return "low";
  if (confidence === "중간" || confidence === "medium") return "medium";
  if (confidence === "높음" || confidence === "high") return "high";
  return "unknown";
}

function textForMatching(input: CurriculumAnchoredCaptureInput) {
  return [input.learnerText, input.derivedSummary, input.mistakeReason, input.taskType]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
}

function normalizeTaskType(input: CurriculumAnchoredCaptureInput) {
  const text = `${input.subject} ${textForMatching(input)}`;
  if (input.taskType) return input.taskType;
  if (input.examMode === "first") {
    if (/빈칸|암기|정의/.test(text)) return "cloze";
    return "ox";
  }
  if (/법규/.test(input.subject)) return /사업인정|처분성|권리구제|요건|포섭|법적|쟁점/.test(text) ? "legal_application" : "paragraph_rewrite";
  if (/실무/.test(input.subject)) return /계산|산식|검산|수익환원|환원이율|CASIO|카시오|단위|수익가액/.test(text) ? "calculation_template" : "paragraph_rewrite";
  if (/이론/.test(input.subject)) return /키워드|논리|정의|개념|연결/.test(text) ? "theory_keyword" : "paragraph_rewrite";
  return "paragraph_rewrite";
}

function candidateTopic(node: AppraiserCurriculumKernelNode | null, subject: string) {
  return shortLabel(node?.topic ?? node?.issue ?? node?.unit, subject);
}

function candidateTaskTypes(node: AppraiserCurriculumKernelNode) {
  return node.examMode === "first" ? [...(node.firstExamTaskTypes ?? [])] : [...(node.taskTypes ?? [])];
}


function candidateMatchScore(node: AppraiserCurriculumKernelNode, input: { text: string; taskType: string }) {
  const topic = `${node.topic ?? ""} ${node.issue ?? ""} ${node.unit}`;
  const searchable = [topic, ...(node.coreConcepts ?? []), ...(node.trapWords ?? []), ...(node.keyTerms ?? [])].join(" ");
  let score = 0;
  if (input.text && searchable.includes(input.text.trim())) score += 50;
  const compactText = input.text.replace(/\s+/g, "");
  const compactTopic = topic.replace(/\s+/g, "");
  if (compactText && compactTopic && (compactText.includes(compactTopic) || compactTopic.includes(compactText))) score += 45;
  for (const token of input.text.split(/\s+/).filter(Boolean)) {
    if (topic.includes(token)) score += 12;
    else if (searchable.includes(token)) score += 5;
  }
  if (candidateTaskTypes(node).some((task) => task.toLowerCase().includes(input.taskType.toLowerCase()))) score += 8;
  if (node.importance === "critical") score += 4;
  return score;
}

function rankCaptureCandidates(nodes: AppraiserCurriculumKernelNode[], input: { text: string; taskType: string }) {
  return [...nodes].sort((a, b) => candidateMatchScore(b, input) - candidateMatchScore(a, input) || a.id.localeCompare(b.id));
}

function summarizeCandidates(nodes: AppraiserCurriculumKernelNode[]): CurriculumCandidateSummary[] {
  return nodes.slice(0, 5).map((node) => ({
    id: node.id,
    examMode: node.examMode,
    subject: node.subject,
    topicLabel: candidateTopic(node, node.subject),
    taskTypes: candidateTaskTypes(node),
    importance: node.importance,
    sourceStatus: node.sourceStatus,
    needsOfficialVerification: node.needsOfficialVerification,
  }));
}

function estimatedMinutesFor(input: { examMode: AppraiserExamMode; subject: string; taskType: string; text: string; confidence: "unknown" | "low" | "medium" | "high" }) {
  if (input.examMode === "first") return input.taskType === "cloze" ? 7 : 5;
  if (/법규/.test(input.subject)) return /사업인정|처분성/.test(input.text) ? 10 : 12;
  if (/실무/.test(input.subject)) return /계산|산식|검산|수익환원|환원이율|CASIO|카시오/.test(input.text) ? 12 : 15;
  if (/이론/.test(input.subject)) return 10;
  return input.confidence === "low" || input.confidence === "unknown" ? 12 : 10;
}

function gapLabelFor(input: { examMode: AppraiserExamMode; subject: string; topicLabel: string; mistakeReason?: string; text: string }) {
  if (input.examMode === "first" && /무효|취소/.test(`${input.topicLabel} ${input.text}`)) return "무효·취소 구분";
  if (/법규/.test(input.subject) && /사업인정|처분성/.test(`${input.topicLabel} ${input.text}`)) return "처분성 문단";
  if (/실무/.test(input.subject) && /계산|산식|검산|수익환원|환원이율|CASIO|카시오/.test(`${input.topicLabel} ${input.text}`)) return "산식 검산";
  if (/이론/.test(input.subject)) return "키워드 논리";
  return shortLabel(input.mistakeReason, input.examMode === "first" ? "개념 구분" : "구조 보강", 18);
}

function nextTaskTypeFor(input: { examMode: AppraiserExamMode; subject: string; taskType: string; text: string }) {
  if (input.examMode === "first") return /빈칸|cloze/.test(input.taskType) ? "cloze_review" : "first_ox_retry";
  if (/법규/.test(input.subject)) return "paragraph_rewrite";
  if (/실무/.test(input.subject) && /계산|산식|검산|수익환원|환원이율|CASIO|카시오/.test(`${input.taskType} ${input.text}`)) return "calculation_template";
  if (/이론/.test(input.subject)) return "theory_keyword";
  return "paragraph_rewrite";
}

function nextActionFor(input: { examMode: AppraiserExamMode; subject: string; topicLabel: string; gapLabel: string; nextTaskType: string; estimatedMinutes: number }) {
  if (input.examMode === "first") return `${input.gapLabel} ${input.estimatedMinutes}분 O/X 재시도`;
  if (/법규/.test(input.subject)) return `${input.topicLabel} 문단 ${input.estimatedMinutes}분 다시쓰기`;
  if (/실무/.test(input.subject) && input.nextTaskType === "calculation_template") return `${input.topicLabel} 산식 검산 ${input.estimatedMinutes}분`;
  if (/이론/.test(input.subject)) return `${input.topicLabel} 키워드 3개 회상 후 한 문단`;
  return `${input.topicLabel} ${input.estimatedMinutes}분 다시쓰기`;
}

function todayPlanTitle(input: { examMode: AppraiserExamMode; subject: string; topicLabel: string; gapLabel: string; nextAction: string; estimatedMinutes: number; nextTaskType: string }) {
  if (input.examMode === "first") return `${input.subject} ${input.gapLabel} ${input.estimatedMinutes}분 O/X 재시도`;
  if (/법규/.test(input.subject) && /사업인정|처분성/.test(`${input.topicLabel} ${input.gapLabel} ${input.nextAction}`)) return `법규 사업인정 처분성 문단 ${input.estimatedMinutes}분 다시쓰기`;
  if (/실무/.test(input.subject) && /산식|검산|수익환원/.test(`${input.topicLabel} ${input.gapLabel} ${input.nextAction}`)) return `실무 ${input.topicLabel} 산식 검산 ${input.estimatedMinutes}분`;
  if (/이론/.test(input.subject)) return `이론 ${input.topicLabel} 키워드 논리 한 문단`;
  return `${input.subject} ${input.topicLabel} ${input.estimatedMinutes}분 다시쓰기`;
}

function explanationSummary(ladder: ExplanationLadderV1): ExplanationLadderSummary {
  return {
    metadataOnly: true,
    conceptLabel: ladder.conceptLabel,
    subject: ladder.subject,
    examMode: ladder.examMode,
    labels: ladder.entries.map((entry) => entry.label),
    tenSecondCheckLabel: "10초 확인",
    sourceStatus: ladder.sourceStatus,
    needsOfficialVerification: ladder.needsOfficialVerification,
  };
}

function priorityFor(input: { confidence: "unknown" | "low" | "medium" | "high"; examMode: AppraiserExamMode; subject: string; text: string; primaryNode: AppraiserCurriculumKernelNode | null }) {
  let priority = input.primaryNode ? 50 : 30;
  if (input.primaryNode?.importance === "critical") priority += 25;
  else if (input.primaryNode?.importance === "high") priority += 15;
  if (input.confidence === "low" || input.confidence === "unknown") priority += 20;
  else if (input.confidence === "medium") priority += 8;
  if (input.examMode === "second" && /누락|구조|목차|문단|포섭/.test(input.text)) priority += 15;
  if (/틀림|오답|wrong|모름/.test(input.text)) priority += 10;
  return Math.min(100, priority);
}

function assertSafeOutput(signal: CurriculumAnchoredCaptureSignal) {
  assertNoRawUserDataInDerived(signal);
  const joined = JSON.stringify(signal);
  if (FORBIDDEN_SHARED_COPY_PATTERNS.some((pattern) => pattern.test(joined))) {
    throw new Error("forbidden-shared-curriculum-copy");
  }
}

export function toCurriculumAnchoredTodayPlanCandidate(signal: Pick<CurriculumAnchoredCaptureSignal, "todayPlanCandidate">) {
  return { ...signal.todayPlanCandidate };
}

export function toCurriculumAnchoredReviewQueueCandidate(signal: Pick<CurriculumAnchoredCaptureSignal, "reviewQueueCandidate">) {
  return { ...signal.reviewQueueCandidate };
}

export function buildCurriculumAnchoredCaptureSignal(input: CurriculumAnchoredCaptureInput): CurriculumAnchoredCaptureSignal {
  const subject = shortLabel(input.subject, "감정평가 과목", 30);
  const confidence = normalizeConfidence(input.confidence);
  if (!isSupportedExamMode(input.examMode)) {
    const fallback: CurriculumAnchoredCaptureSignal = {
      metadataOnly: true,
      subject,
      curriculumCandidates: [],
      safeFallbackReason: FALLBACK_UNSUPPORTED_EXAM_MODE,
      topicLabel: subject,
      gapLabel: "커리큘럼 연결 보류",
      nextTaskType: "manual_review",
      nextAction: "과목과 모드를 확인한 뒤 다시 연결합니다.",
      estimatedMinutes: 5,
      explanationLadderSummary: null,
      reviewPattern: null,
      todayPlanCandidate: {
        id: `curriculum-capture-${input.userId}-unsupported`,
        metadataOnly: true,
        source: "curriculum_capture",
        examMode: "first",
        subject,
        title: `${subject} 커리큘럼 연결 확인 5분`,
        topicLabel: subject,
        gapLabel: "커리큘럼 연결 보류",
        nextTaskType: "manual_review",
        nextAction: "과목과 모드를 확인한 뒤 다시 연결합니다.",
        estimatedMinutes: 5,
        reviewPattern: null,
        dueReview: false,
        recentWrong: false,
        confidence,
        confidenceGap: confidence === "low" || confidence === "unknown" ? 2 : 0,
        weakStructure: false,
        priority: 10,
      },
      reviewQueueCandidate: {
        id: `curriculum-review-${input.userId}-unsupported`,
        metadataOnly: true,
        source: "curriculum_capture",
        examMode: "first",
        subject,
        topicLabel: subject,
        gapLabel: "커리큘럼 연결 보류",
        nextTaskType: "manual_review",
        nextAction: "과목과 모드를 확인한 뒤 다시 연결합니다.",
        reviewReason: FALLBACK_UNSUPPORTED_EXAM_MODE,
        reviewPattern: null,
        priority: 10,
      },
    };
    assertSafeOutput(fallback);
    return fallback;
  }

  const taskType = normalizeTaskType(input);
  const searchText = textForMatching(input);
  const candidates = findCurriculumCandidates({ examMode: input.examMode, subject, text: searchText, taskType });
  const relaxedCandidates = rankCaptureCandidates(candidates.length > 0 ? candidates : findCurriculumCandidates({ examMode: input.examMode, subject, text: searchText }), { text: searchText, taskType });
  const primaryNode = relaxedCandidates[0] ?? null;
  const topicLabel = candidateTopic(primaryNode, subject);
  const gapLabel = gapLabelFor({ examMode: input.examMode, subject, topicLabel, mistakeReason: input.mistakeReason, text: searchText });
  const nextTaskType = nextTaskTypeFor({ examMode: input.examMode, subject, taskType, text: searchText });
  const estimatedMinutes = estimatedMinutesFor({ examMode: input.examMode, subject, taskType, text: searchText, confidence });
  const nextAction = nextActionFor({ examMode: input.examMode, subject, topicLabel, gapLabel, nextTaskType, estimatedMinutes });
  const reviewPattern = primaryNode ? getDefaultReviewPatternForNode(primaryNode.id) : null;
  const ladder = buildExplanationLadder({ conceptLabel: topicLabel, subject, examMode: input.examMode });
  const ladderSummary = validateExplanationLadder(ladder) ? explanationSummary(ladder) : null;
  const priority = priorityFor({ confidence, examMode: input.examMode, subject, text: searchText, primaryNode });
  const idBase = primaryNode?.id ?? `${input.examMode}-${subject.replace(/\s+/g, "-")}-fallback`;

  const todayPlanCandidate: CurriculumAnchoredTodayPlanCandidate = {
    id: `curriculum-capture-${input.userId}-${idBase}`,
    metadataOnly: true,
    source: "curriculum_capture",
    examMode: input.examMode,
    subject,
    ...(primaryNode ? { curriculumNodeId: primaryNode.id } : {}),
    title: todayPlanTitle({ examMode: input.examMode, subject, topicLabel, gapLabel, nextAction, estimatedMinutes, nextTaskType }),
    topicLabel,
    gapLabel,
    nextTaskType,
    nextAction,
    estimatedMinutes,
    reviewPattern,
    dueReview: true,
    recentWrong: /틀림|오답|wrong|모름/.test(searchText),
    confidence,
    confidenceGap: confidence === "low" || confidence === "unknown" ? 2 : confidence === "medium" ? 1 : 0,
    weakStructure: input.examMode === "second" && /구조|목차|문단|포섭|누락/.test(searchText),
    priority,
  };

  const reviewQueueCandidate: CurriculumAnchoredReviewQueueCandidate = {
    id: `curriculum-review-${input.userId}-${idBase}`,
    metadataOnly: true,
    source: "curriculum_capture",
    examMode: input.examMode,
    subject,
    ...(primaryNode ? { curriculumNodeId: primaryNode.id } : {}),
    topicLabel,
    gapLabel,
    nextTaskType,
    nextAction,
    reviewReason: primaryNode ? `${topicLabel} ${gapLabel} 재시도 예약` : FALLBACK_NO_NODE,
    reviewPattern,
    priority,
  };

  const signal: CurriculumAnchoredCaptureSignal = {
    metadataOnly: true,
    examMode: input.examMode,
    subject,
    curriculumCandidates: summarizeCandidates(relaxedCandidates),
    ...(primaryNode ? { primaryConceptNodeId: primaryNode.id } : { safeFallbackReason: FALLBACK_NO_NODE }),
    topicLabel,
    gapLabel,
    nextTaskType,
    nextAction,
    estimatedMinutes,
    explanationLadderSummary: ladderSummary,
    reviewPattern,
    todayPlanCandidate,
    reviewQueueCandidate,
  };
  assertSafeOutput(signal);
  return signal;
}

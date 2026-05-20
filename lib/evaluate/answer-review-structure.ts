export type AnswerReviewExplanationLevel = "easy" | "standard" | "exam";

export type AnswerReviewStructureDraft = {
  questionSummary: string;
  coreConcepts: string[];
  requiredIssues: string;
  userAnswerSummary: string;
  userAnswerStructure: string;
  referenceStructure: string;
  strengths: string[];
  missingIssueCandidates: string[];
  weakParagraphPoint: string;
  weakLogicPoint: string;
  rewriteTarget: string;
  rewriteDraftSuggestion: string;
  nextAction: string;
  caution: string;
  plainExplanation: string;
  keyTermExplanations: string[];
  stepByStepExplanation: string[];
  examAnswerHints: string[];
};

const CARD_TEXT_MAX_LENGTH = 220;
const DETAIL_TEXT_MAX_LENGTH = 1200;

const BANNED_TERMS = ["점수", "합격 가능성", "합격 판정", "최종 채점", "AI 판정", "등급"];

const STRING_FALLBACKS: Record<keyof AnswerReviewStructureDraft, string> = {
  questionSummary: "문제 요구를 더 입력하면 구조화를 보강할 수 있습니다.",
  coreConcepts: "",
  requiredIssues: "기준답안과 문제 요구를 더 입력하면 보강할 간극이 선명해집니다.",
  userAnswerSummary: "내 답안의 핵심을 한 줄로 정리해 주세요.",
  userAnswerStructure: "문단별 주장과 근거를 정리하면 구조 분석이 선명해집니다.",
  referenceStructure: "기준답안의 목차를 입력하면 비교가 정확해집니다.",
  strengths: "",
  missingIssueCandidates: "",
  weakParagraphPoint: "보강할 문단 포인트를 검토자가 직접 확인해 주세요.",
  weakLogicPoint: "논리 연결이 약한 지점을 검토자가 직접 확인해 주세요.",
  rewriteTarget: "교정 문단을 직접 작성해 다음 답안에 반영해 주세요.",
  rewriteDraftSuggestion: "교정 문단을 직접 작성해 다음 답안에 반영해 주세요.",
  nextAction: "문단 하나를 다시 쓰고 검토자 확인을 진행하세요.",
  caution: "구조화 결과는 검토 보조 초안이며 검토자 확인이 필요합니다.",
  plainExplanation: "핵심은 문제에서 묻는 조건을 먼저 나누고, 답안에서 빠진 조건 1개를 보강하는 것입니다.",
  keyTermExplanations: "",
  stepByStepExplanation: "",
  examAnswerHints: "",
};

function sanitizeBannedPhrases(input: string): string {
  let text = input;
  for (const term of BANNED_TERMS) {
    text = text.replaceAll(term, "검토 의견");
  }
  return text.replace(/\s+/g, " ").trim();
}

function truncateText(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength).trimEnd()}…`;
}

function normalizeText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }

  return "";
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return [item];
        if (item == null) return [];
        if (typeof item === "number" || typeof item === "boolean") return [String(item)];
        return [];
      })
      .map((item) => truncateText(sanitizeBannedPhrases(item), DETAIL_TEXT_MAX_LENGTH))
      .filter(Boolean);
  }

  const text = truncateText(sanitizeBannedPhrases(normalizeText(value)), DETAIL_TEXT_MAX_LENGTH);
  return text ? [text] : [];
}

function normalizeStringField(field: keyof AnswerReviewStructureDraft, value: unknown): string {
  const sanitized = sanitizeBannedPhrases(normalizeText(value));
  const normalized = sanitized || STRING_FALLBACKS[field];
  const maxLength =
    field === "questionSummary" ||
    field === "requiredIssues" ||
    field === "userAnswerSummary" ||
    field === "userAnswerStructure" ||
    field === "referenceStructure" ||
    field === "weakParagraphPoint" ||
    field === "weakLogicPoint" ||
    field === "caution"
      ? DETAIL_TEXT_MAX_LENGTH
      : CARD_TEXT_MAX_LENGTH;

  return truncateText(normalized, maxLength);
}

export function normalizeAnswerReviewStructureDraft(input: unknown): AnswerReviewStructureDraft {
  const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    questionSummary: normalizeStringField("questionSummary", source.questionSummary),
    coreConcepts: normalizeArray(source.coreConcepts),
    requiredIssues: normalizeStringField("requiredIssues", source.requiredIssues),
    userAnswerSummary: normalizeStringField("userAnswerSummary", source.userAnswerSummary),
    userAnswerStructure: normalizeStringField("userAnswerStructure", source.userAnswerStructure),
    referenceStructure: normalizeStringField("referenceStructure", source.referenceStructure),
    strengths: normalizeArray(source.strengths),
    missingIssueCandidates: normalizeArray(source.missingIssueCandidates),
    weakParagraphPoint: normalizeStringField("weakParagraphPoint", source.weakParagraphPoint),
    weakLogicPoint: normalizeStringField("weakLogicPoint", source.weakLogicPoint),
    rewriteTarget: normalizeStringField("rewriteTarget", source.rewriteTarget),
    rewriteDraftSuggestion: normalizeStringField("rewriteDraftSuggestion", source.rewriteDraftSuggestion),
    nextAction: normalizeStringField("nextAction", source.nextAction),
    caution: normalizeStringField("caution", source.caution),
    plainExplanation: normalizeStringField("plainExplanation", source.plainExplanation),
    keyTermExplanations: normalizeArray(source.keyTermExplanations),
    stepByStepExplanation: normalizeArray(source.stepByStepExplanation),
    examAnswerHints: normalizeArray(source.examAnswerHints),
  };
}

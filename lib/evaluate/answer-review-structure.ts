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


function resolveNextAction(source: Record<string, unknown>): unknown {
  if (source.nextAction != null) return source.nextAction;

  const nextTask = normalizeText(source.nextTask);
  const nextTaskType = normalizeText(source.nextTaskType);
  const relatedFormulas = normalizeArray(source.relatedFormulas);

  if (nextTask) return nextTask;
  if (relatedFormulas.length > 0) {
    return `관련 공식 점검: ${relatedFormulas.join(", ")}`;
  }
  if (nextTaskType) {
    return `${nextTaskType} 기준으로 문단 하나를 다시 작성해 보세요.`;
  }

  return source.nextAction;
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
    nextAction: normalizeStringField("nextAction", resolveNextAction(source)),
    caution: normalizeStringField("caution", source.caution),
  };
}

export type AnswerReviewExplanationLevel = "easy" | "standard" | "exam";

export type AnswerReviewStructureDraft = {
  diagnosticStatus?: "finding" | "no_clear_gap" | "insufficient_evidence" | "analysis_failed";
  questionRequirementQuote?: string;
  reviewedAnswerScope?: "entire_submitted_answer";
  questionSummary: string;
  coreConcepts: string[];
  requiredIssues: string;
  userAnswerSummary: string;
  answerEvidenceQuote?: string;
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
  diagnosticStatus: "", questionRequirementQuote: "", reviewedAnswerScope: "",
  questionSummary: "문제 요구를 더 입력하면 구조화를 보강할 수 있습니다.",
  coreConcepts: "",
  requiredIssues: "",
  userAnswerSummary: "",
  answerEvidenceQuote: "",
  userAnswerStructure: "",
  referenceStructure: "",
  strengths: "",
  missingIssueCandidates: "",
  weakParagraphPoint: "",
  weakLogicPoint: "",
  rewriteTarget: "",
  rewriteDraftSuggestion: "",
  nextAction: "",
  caution: "구조화 결과는 검토 보조 초안이며 검토자 확인이 필요합니다.",
  plainExplanation: "",
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
    ...(["finding", "no_clear_gap", "insufficient_evidence", "analysis_failed"].includes(String(source.diagnosticStatus)) ? { diagnosticStatus: source.diagnosticStatus as AnswerReviewStructureDraft["diagnosticStatus"] } : {}),
    ...(typeof source.questionRequirementQuote === "string" ? { questionRequirementQuote: source.questionRequirementQuote.trim().slice(0, 240) } : {}),
    ...(source.reviewedAnswerScope === "entire_submitted_answer" ? { reviewedAnswerScope: "entire_submitted_answer" as const } : {}),
    questionSummary: normalizeStringField("questionSummary", source.questionSummary),
    coreConcepts: normalizeArray(source.coreConcepts),
    requiredIssues: normalizeStringField("requiredIssues", source.requiredIssues),
    userAnswerSummary: normalizeStringField("userAnswerSummary", source.userAnswerSummary),
    ...(typeof source.answerEvidenceQuote === "string" && source.answerEvidenceQuote.trim().length >= 4 && source.answerEvidenceQuote.trim().length <= 120
      ? { answerEvidenceQuote: source.answerEvidenceQuote.trim() } : {}),
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

/** Provider assertions become a personal finding only with exact submitted evidence. */
export function groundAnswerReviewDiagnosis(draft: AnswerReviewStructureDraft, question: string, answer: string): AnswerReviewStructureDraft {
  let status = draft.diagnosticStatus ?? "insufficient_evidence";
  const questionQuote = draft.questionRequirementQuote?.trim() ?? "";
  const answerQuote = draft.answerEvidenceQuote?.trim() ?? "";
  const grounded = questionQuote.length >= 4 && question.includes(questionQuote) && answerQuote.length >= 4 && answer.includes(answerQuote) && draft.reviewedAnswerScope === "entire_submitted_answer";
  if ((status === "finding" || status === "no_clear_gap") && !grounded) status = "insufficient_evidence";
  if (status === "finding" && !draft.missingIssueCandidates.length && !draft.weakLogicPoint && !draft.weakParagraphPoint) status = "insufficient_evidence";
  if (status !== "finding") return { ...draft, diagnosticStatus: status, missingIssueCandidates: [], weakLogicPoint: "", weakParagraphPoint: "", rewriteTarget: "", rewriteDraftSuggestion: "",
    ...(!grounded ? { answerEvidenceQuote: undefined, questionRequirementQuote: undefined } : {}) };
  return { ...draft, diagnosticStatus: status };
}

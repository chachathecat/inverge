import { sanitizeLearningSignalMetadata, sanitizeReferenceRequest } from "./data-boundary";
import type { LearningSignalEventInput, WrongAnswerItemInput } from "@/lib/review-os/types";
import type { ReferenceSnippet } from "./reference-context";

export type OxValue = "O" | "X" | "unknown";
export type OxCertainty = "certain" | "confused" | "unknown";
export type OxResult = "correct" | "incorrect" | "unknown";

export type FirstExamStatement = {
  id: string;
  sourceLearningItemId?: string;
  subject: string;
  stem?: string;
  statementText: string;
  expectedOx?: Exclude<OxValue, "unknown">;
  trapWords: string[];
  topicCandidate?: string;
  conceptCandidate?: string;
};

export type OxAttempt = {
  statementId: string;
  userOx: OxValue;
  certainty: OxCertainty;
  result: OxResult;
  createdAt: string;
};

export type FiveChoiceItemInput = {
  id?: string;
  subject: string;
  stem?: string;
  choices: string[];
  expectedOxByChoice?: Array<Exclude<OxValue, "unknown"> | undefined>;
  topicCandidate?: string;
  conceptCandidate?: string;
};

export type FirstOxLearningSignalKind = "none" | "wrong_answer_retry" | "weak_confidence" | "needs_concept_review";
export type FirstOxReviewStage = "O/X" | "빈칸" | "설명/수정";

export type FirstOxConceptCardPayload = {
  sourceType: "first_ox";
  examMode: "감정평가사 1차";
  subject: string;
  statement_id: string;
  trapWords: string[];
  coreRule: string;
  minimalExplanation: string;
  examTrapExplanation: string;
  nextReviewAction: string;
  reviewStage: FirstOxReviewStage;
  dueAt: string;
  topic_candidate?: string | null;
  concept_candidate?: string | null;
  official_answer_authority: false;
  referenceSnippets?: ReferenceSnippet[];
};

export const FIRST_OX_TRAP_WORD_GROUPS = [
  ["할 수 있다", "하여야 한다"],
  ["원칙", "예외"],
  ["전부", "일부"],
  ["항상", "원칙적으로"],
  ["무효", "취소"],
  ["원시취득", "승계취득"],
  ["과세", "비과세"],
  ["인식", "측정", "평가"],
] as const;

export const FIRST_OX_TRAP_WORDS = FIRST_OX_TRAP_WORD_GROUPS.flat();

function stableId(...parts: Array<string | undefined>) {
  const source = parts.filter(Boolean).join("|");
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }
  return `first-ox-${hash.toString(36)}`;
}

function cleanChoicePrefix(text: string) {
  return text
    .replace(/^\s*(?:[①②③④⑤]|[1-5][).]|\([1-5]\)|[ㄱ-ㅎ][).])\s*/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractFirstOxTrapWords(statementText: string): string[] {
  return FIRST_OX_TRAP_WORDS.filter((word) => statementText.includes(word));
}

export function normalizeFiveChoiceItemToStatements(input: FiveChoiceItemInput): FirstExamStatement[] {
  return input.choices.slice(0, 5).map((choice, index) => {
    const statementText = cleanChoicePrefix(choice);
    return {
      id: stableId(input.id, input.subject, input.stem, statementText, String(index)),
      sourceLearningItemId: input.id,
      subject: input.subject,
      stem: input.stem?.trim() || undefined,
      statementText,
      expectedOx: input.expectedOxByChoice?.[index],
      trapWords: extractFirstOxTrapWords(statementText),
      topicCandidate: input.topicCandidate,
      conceptCandidate: input.conceptCandidate,
    };
  });
}

export function shuffleFirstOxStatements(statements: FirstExamStatement[]): FirstExamStatement[] {
  return [...statements].sort((left, right) => {
    const leftKey = stableId(left.id, left.statementText, "practice-order");
    const rightKey = stableId(right.id, right.statementText, "practice-order");
    return leftKey.localeCompare(rightKey);
  });
}

export function evaluateFirstOxAttempt(statement: FirstExamStatement, userOx: OxValue, certainty: OxCertainty, createdAt = new Date().toISOString()): OxAttempt {
  const result: OxResult = userOx === "unknown" || !statement.expectedOx ? "unknown" : userOx === statement.expectedOx ? "correct" : "incorrect";
  return {
    statementId: statement.id,
    userOx,
    certainty: userOx === "unknown" ? "unknown" : certainty,
    result,
    createdAt,
  };
}

export function resolveFirstOxLearningSignalKind(attempt: OxAttempt): FirstOxLearningSignalKind {
  if (attempt.userOx === "unknown" || attempt.certainty === "unknown" || attempt.result === "unknown") return "needs_concept_review";
  if (attempt.result === "incorrect") return "wrong_answer_retry";
  if (attempt.certainty === "confused") return "weak_confidence";
  return "none";
}

function dueSoonIso(createdAt: string) {
  const base = Date.parse(createdAt);
  const ts = Number.isFinite(base) ? base : Date.now();
  return new Date(ts + 86_400_000).toISOString();
}

function summarizeTrapWords(statement: FirstExamStatement) {
  if (statement.trapWords.length > 0) return statement.trapWords;
  return statement.conceptCandidate ? [statement.conceptCandidate] : [];
}

export function buildFirstOxConceptCardPayload(statement: FirstExamStatement, attempt: OxAttempt, referenceSnippets: ReferenceSnippet[] = []): FirstOxConceptCardPayload | null {
  const kind = resolveFirstOxLearningSignalKind(attempt);
  if (kind === "none") return null;

  const trapWords = summarizeTrapWords(statement);
  const trapText = trapWords.length > 0 ? trapWords.join(" · ") : "선지의 조건 표현";
  const coreRule = statement.conceptCandidate
    ? `${statement.conceptCandidate} 기준 1개를 먼저 고정합니다.`
    : `${statement.subject} 판단 기준 1개를 먼저 고정합니다.`;
  const minimalExplanation = kind === "wrong_answer_retry"
    ? `${trapText} 때문에 판단 방향이 바뀌었습니다.`
    : kind === "weak_confidence"
      ? `${trapText}에서 확신이 흔들렸습니다.`
      : `${trapText}를 판단할 기준이 아직 비어 있습니다.`;
  const examTrapExplanation = trapWords.length > 0
    ? `이 선지는 ${trapText} 같은 표현을 바꿔 O/X 판단을 흔듭니다.`
    : "이 선지는 조건 표현 하나가 바뀌면 O/X 판단이 달라질 수 있습니다.";
  const nextReviewAction = kind === "wrong_answer_retry"
    ? "같은 선지를 근거 1줄로 다시 판단합니다."
    : kind === "weak_confidence"
      ? "핵심어 1개를 가리고 다시 회상합니다."
      : "핵심 개념 1개를 확인한 뒤 O/X를 다시 판단합니다.";

  return {
    sourceType: "first_ox",
    examMode: "감정평가사 1차",
    subject: statement.subject,
    statement_id: statement.id,
    trapWords,
    coreRule,
    minimalExplanation,
    examTrapExplanation,
    nextReviewAction,
    reviewStage: kind === "weak_confidence" ? "빈칸" : "O/X",
    dueAt: dueSoonIso(attempt.createdAt),
    topic_candidate: statement.topicCandidate ?? null,
    concept_candidate: statement.conceptCandidate ?? null,
    official_answer_authority: false,
    referenceSnippets: referenceSnippets.slice(0, 2),
  };
}

export function buildFirstOxLearningSignalInput(statement: FirstExamStatement, attempt: OxAttempt, referenceSnippets: ReferenceSnippet[] = []): LearningSignalEventInput | null {
  const kind = resolveFirstOxLearningSignalKind(attempt);
  if (kind === "none") return null;
  const nextTask = kind === "wrong_answer_retry"
    ? "틀린 선지의 판단 근거 1개를 다시 말하고 O/X를 재시도합니다."
    : kind === "weak_confidence"
      ? "맞혔지만 헷갈린 표현을 표시하고 같은 개념을 한 번 더 회상합니다."
      : "모르는 선지의 핵심 개념 1개를 확인한 뒤 O/X를 다시 판단합니다.";

  return {
    examMode: "감정평가사 1차",
    subject: statement.subject,
    sourceType: "first-ox",
    derivedTags: [kind, "first_ox_retry", ...(statement.trapWords.length > 0 ? ["trap_word"] : [])],
    relatedFormulas: statement.conceptCandidate ? [statement.conceptCandidate] : [],
    nextTaskType: kind === "weak_confidence" ? "cloze_review" : kind === "needs_concept_review" ? "concept_review" : "retry",
    nextTask,
    metadataJson: sanitizeLearningSignalMetadata({
      statement_id: statement.id,
      result: attempt.result,
      certainty: attempt.certainty,
      trap_words: statement.trapWords,
      topic_candidate: statement.topicCandidate ?? null,
      concept_candidate: statement.conceptCandidate ?? null,
      official_answer_authority: false,
      concept_card: buildFirstOxConceptCardPayload(statement, attempt, referenceSnippets),
    }),
  };
}

export function buildFirstOxWrongAnswerItemInput(statement: FirstExamStatement, attempt: OxAttempt, referenceSnippets: ReferenceSnippet[] = []): WrongAnswerItemInput | null {
  const kind = resolveFirstOxLearningSignalKind(attempt);
  if (kind === "none") return null;
  const reasonPreset = kind === "wrong_answer_retry" ? "선지 오독" : kind === "weak_confidence" ? "찍음/확신 부족" : "개념 부족";
  const expected = statement.expectedOx ?? "확인 필요";
  const user = attempt.userOx === "unknown" ? "모름" : attempt.userOx;
  return {
    examName: "감정평가사 1차",
    subjectLabel: statement.subject,
    sourceType: "manual",
    sourceLabel: "1차 O/X 역공학",
    problemTitle: statement.topicCandidate ?? "1차 O/X 선지 판단",
    problemIdentifier: statement.id,
    rawQuestionText: [statement.stem, statement.statementText].filter(Boolean).join("\n"),
    correctAnswer: expected,
    userAnswer: user,
    userReasonText: kind === "wrong_answer_retry"
      ? "독립 O/X 판단이 기대 판단과 달랐습니다."
      : kind === "weak_confidence"
        ? "정답 여부와 별개로 확신이 낮았습니다."
        : "판단을 보류했습니다.",
    userReasonPreset: reasonPreset,
    confidence: attempt.certainty === "certain" ? "중간" : "낮음",
    keyConcepts: [statement.conceptCandidate, ...statement.trapWords].filter((value): value is string => Boolean(value)),
    conceptCard: buildFirstOxConceptCardPayload(statement, attempt, referenceSnippets) ?? undefined,
    comparisonPoint: "근거 1줄을 먼저 회상하고 같은 선지를 다시 판단합니다.",
    biggestGap: reasonPreset,
    createdFromCapture: false,
  };
}

export function buildFirstOxReferenceRequest(statement: FirstExamStatement) {
  return sanitizeReferenceRequest({
    examMode: "first" as const,
    subject: statement.subject,
    topicCandidate: statement.topicCandidate ?? null,
    conceptCandidate: statement.conceptCandidate ?? null,
    taskType: "first_ox" as const,
    maxSnippets: 2,
    derivedTags: ["first_ox", ...statement.trapWords],
    safeSkeletonIds: [statement.id],
  });
}

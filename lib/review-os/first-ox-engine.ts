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
  ["항상", "언제나", "원칙적으로"],
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
  const trapWords = statement.trapWords.includes("원칙적으로")
    ? statement.trapWords.filter((word) => word !== "원칙")
    : statement.trapWords;
  if (trapWords.length > 0) return trapWords;
  return statement.conceptCandidate ? [statement.conceptCandidate] : [];
}

type FirstOxConceptRule = {
  coreRule: string;
  minimalExplanation: string;
  examTrapExplanation: string;
};

function includesAny(values: string[], candidates: string[]) {
  return candidates.some((candidate) => values.includes(candidate));
}

function statementIncludesAll(statement: FirstExamStatement, candidates: string[]) {
  return candidates.every((candidate) => statement.statementText.includes(candidate));
}

function buildCivilLawSpecificRule(statement: FirstExamStatement): FirstOxConceptRule | null {
  if (statementIncludesAll(statement, ["의사무능력자", "무효"])) {
    return {
      coreRule: "의사능력이 없는 상태의 법률행위는 무효로 판단합니다.",
      minimalExplanation: "주체가 의사무능력자인지 먼저 보고, 법률행위의 효과가 무효인지 확인합니다.",
      examTrapExplanation: "원칙적으로 같은 표현보다 먼저 의사능력 유무와 무효 효과를 확인하세요.",
    };
  }
  return null;
}

function buildTrapSpecificRule(trapWords: string[]): FirstOxConceptRule | null {
  if (includesAny(trapWords, ["할 수 있다", "하여야 한다"])) {
    return {
      coreRule: "재량 표현인지 의무 표현인지 먼저 가릅니다.",
      minimalExplanation: "할 수 있다는 가능·재량, 하여야 한다는 의무·강행으로 판단 방향이 달라질 수 있습니다.",
      examTrapExplanation: "가능 규정을 의무처럼 읽거나 의무 규정을 재량처럼 읽으면 O/X 판단이 뒤집힙니다.",
    };
  }
  if (includesAny(trapWords, ["원칙", "예외", "항상", "언제나", "원칙적으로"])) {
    return {
      coreRule: "절대 표현인지, 예외가 붙은 원칙 표현인지 먼저 확인합니다.",
      minimalExplanation: "원칙·예외·항상·언제나는 예외 유무 하나로 판단이 바뀌는 표현입니다.",
      examTrapExplanation: "항상/언제나처럼 예외를 닫는 표현과 원칙적으로처럼 예외를 남기는 표현을 구별합니다.",
    };
  }
  if (includesAny(trapWords, ["전부", "일부"])) {
    return {
      coreRule: "효과가 전부에 미치는지 일부에만 미치는지 범위를 먼저 자릅니다.",
      minimalExplanation: "전부와 일부는 결론의 범위를 바꾸는 표현입니다.",
      examTrapExplanation: "부분 효력을 전체 효력처럼 읽으면 범위 판단에서 O/X가 흔들립니다.",
    };
  }
  if (includesAny(trapWords, ["무효", "취소"])) {
    return {
      coreRule: "처음부터 효력이 없는지, 취소 전까지 효력이 움직이는지 먼저 구별합니다.",
      minimalExplanation: "무효와 취소는 효력 발생 시점과 사후 확정 가능성에서 갈립니다.",
      examTrapExplanation: "무효를 취소처럼, 취소를 무효처럼 읽으면 추인·확정 시점 판단이 달라집니다.",
    };
  }
  if (includesAny(trapWords, ["원시취득", "승계취득"])) {
    return {
      coreRule: "권리가 새로 생기는지, 이전 권리가 이전되는지 먼저 판단합니다.",
      minimalExplanation: "원시취득은 새 취득, 승계취득은 기존 권리의 이전 여부가 핵심입니다.",
      examTrapExplanation: "권리 승계 여부를 놓치면 취득 원인과 항변 승계 판단까지 함께 흔들립니다.",
    };
  }
  if (includesAny(trapWords, ["인식", "측정", "평가"])) {
    return {
      coreRule: "회계 처리 단계가 인식·측정·평가 중 어디인지 먼저 분류합니다.",
      minimalExplanation: "인식·측정·평가는 같은 계산 문제가 아니라 분류 단계가 다른 함정입니다.",
      examTrapExplanation: "재무제표에 잡는 시점, 금액을 정하는 기준, 이후 평가 기준을 섞지 않습니다.",
    };
  }
  return null;
}

function buildFirstOxConceptRule(statement: FirstExamStatement, trapWords: string[]): FirstOxConceptRule {
  const civilLawRule = buildCivilLawSpecificRule(statement);
  if (civilLawRule) return civilLawRule;

  const trapRule = buildTrapSpecificRule(trapWords);
  if (trapRule) return trapRule;

  if (statement.conceptCandidate) {
    return {
      coreRule: `${statement.conceptCandidate}에서 조건 표현 1개를 먼저 확인합니다.`,
      minimalExplanation: `${statement.conceptCandidate} 판단은 요건·효과·예외 중 빠진 조건 1개를 고정해야 안정됩니다.`,
      examTrapExplanation: "개념명을 외우는 것보다 선지의 조건 표현이 그 개념의 요건과 맞는지 먼저 대조합니다.",
    };
  }

  if (statement.topicCandidate || statement.subject) {
    const topic = statement.topicCandidate ?? statement.subject;
    return {
      coreRule: `${topic}에서 선지 조건 표현 1개를 먼저 확인합니다.`,
      minimalExplanation: `${topic} 항목은 결론보다 조건 표현을 먼저 회상해야 합니다.`,
      examTrapExplanation: "주제명만 보고 판단하지 말고, 선지가 바꾼 조건·범위·예외 표현을 먼저 표시합니다.",
    };
  }

  return {
    coreRule: "정답 확정 전 임시 개념 힌트입니다. 조건 표현 1개를 먼저 확인하세요.",
    minimalExplanation: "정답 확정 전 임시 개념 힌트입니다. 조건 표현 1개를 먼저 확인하세요.",
    examTrapExplanation: "조건 표현 1개를 확인한 뒤 같은 선지를 다시 판단합니다.",
  };
}

export function buildFirstOxConceptCardPayload(statement: FirstExamStatement, attempt: OxAttempt, referenceSnippets: ReferenceSnippet[] = []): FirstOxConceptCardPayload | null {
  const kind = resolveFirstOxLearningSignalKind(attempt);
  if (kind === "none") return null;

  const trapWords = summarizeTrapWords(statement);
  const rule = buildFirstOxConceptRule(statement, trapWords);
  const { coreRule, minimalExplanation, examTrapExplanation } = rule;
  const nextReviewAction = kind === "weak_confidence"
    ? "핵심어 1개를 가리고 같은 선지를 다시 판단합니다."
    : "같은 선지를 근거 1줄로 다시 판단합니다.";

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

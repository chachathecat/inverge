import type { AppraisalMode } from "./appraisal";

export type RetrievalPracticePattern =
  | "ox"
  | "keyword_recall"
  | "issue_recall"
  | "outline_recall"
  | "paragraph_rewrite"
  | "calculation_process_check";

export type CognitiveLearningActionInput = {
  mode: AppraisalMode;
  subjectLabel?: string | null;
  biggestGap?: string | null;
  nextAction?: string | null;
  nextTaskType?: string | null;
};

export type CognitiveLearningActionUnit = {
  unitLabel: "s220e_cognitive_learning_action";
  oneBiggestGap: string;
  nextRewriteAction: string;
  retrievalCheck: {
    label: "10초 확인";
    pattern: RetrievalPracticePattern;
    prompt: string;
  };
  continuation: {
    label: "내일 복습에 남길 내용";
    reviewQueueCandidate: string;
    todayPlanCandidate: string;
    notesCandidate: string;
    todayPlanMaxPrimaryTasks: 3;
  };
  secondRoundPriorityOrder: RetrievalPracticePattern[];
  dataBoundary: {
    metadataOnly: true;
    learnerOwnedContentCopied: false;
    globalReferenceWrite: false;
  };
};

const SECOND_ROUND_PRIORITY_ORDER: RetrievalPracticePattern[] = [
  "paragraph_rewrite",
  "issue_recall",
  "outline_recall",
  "calculation_process_check",
];

const FORBIDDEN_INPUT_FIELD_PATTERN =
  /(raw|ocr|answerText|problemText|questionText|copyrightedText|originalText|fullText|sourceText|officialAnswer|modelAnswer|providerPayload|paymentData|billingData|credential|secret)/i;

const FORBIDDEN_OUTPUT_TERMS = [
  "공식 채점",
  "공식 모범답안",
  "공식 모델답안",
  "확정 점수",
  "점수",
  "점수 예측",
  "합격 가능성",
  "합격 확률",
  "합격 보장",
  "정답 보장",
  "official grading",
  "official model answer",
  "pass probability",
  "guarantee",
];

function assertMetadataOnlyInput(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertMetadataOnlyInput);
    return;
  }

  for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_INPUT_FIELD_PATTERN.test(key)) {
      throw new Error(`S220E cognitive action accepts metadata only; raw/private field is not allowed: ${key}`);
    }
    assertMetadataOnlyInput(nestedValue);
  }
}

function clean(value: unknown, fallback: string) {
  let text = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  for (const term of FORBIDDEN_OUTPUT_TERMS) {
    text = text.replaceAll(term, "검토 의견");
  }
  return text || fallback;
}

function truncate(value: string, maxLength = 120) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}...`;
}

function classifySecondRetrievalPattern(input: CognitiveLearningActionInput): RetrievalPracticePattern {
  const subject = clean(input.subjectLabel, "");
  const task = clean(input.nextTaskType, "");
  const action = clean(input.nextAction, "");
  const gap = clean(input.biggestGap, "");
  const text = `${subject} ${task} ${action} ${gap}`;

  if (/CASIO|계산|산식|단위|반올림|process|calculation/i.test(text) || subject.includes("감정평가실무")) {
    return "calculation_process_check";
  }
  if (/쟁점|논점|법규|보상|조문|요건|issue|law/i.test(text)) {
    return "issue_recall";
  }
  if (/목차|구조|outline|이론/i.test(text)) {
    return "outline_recall";
  }
  return "paragraph_rewrite";
}

function classifyRetrievalPattern(input: CognitiveLearningActionInput): RetrievalPracticePattern {
  if (input.mode === "second") return classifySecondRetrievalPattern(input);
  const task = clean(input.nextTaskType, "");
  if (/keyword|빈칸|cloze|개념/i.test(task)) return "keyword_recall";
  return "ox";
}

function getRetrievalPrompt(pattern: RetrievalPracticePattern) {
  if (pattern === "calculation_process_check") {
    return "산식, 단위, 반올림 기준 중 하나를 손으로 재현할 순서로 확인하세요.";
  }
  if (pattern === "issue_recall") {
    return "답안 보기 전 쟁점 1개와 조문/요건/사안 포섭 순서를 먼저 말해 보세요.";
  }
  if (pattern === "outline_recall") {
    return "답안 보기 전 목차 3줄과 각 줄의 핵심 키워드 1개를 먼저 적어 보세요.";
  }
  if (pattern === "paragraph_rewrite") {
    return "다시 쓸 문단의 첫 문장과 결론 문장을 먼저 떠올려 보세요.";
  }
  if (pattern === "keyword_recall") {
    return "해설 보기 전 핵심 키워드 1개를 먼저 떠올려 보세요.";
  }
  return "해설 보기 전 O/X로 기준 하나를 먼저 판단해 보세요.";
}

function buildRewriteAction(input: CognitiveLearningActionInput) {
  const fallback =
    input.mode === "second"
      ? "오늘 다시 쓸 문단 1개를 정하고 누락 논점만 보강합니다."
      : "오늘 다시 풀 기준 1개를 정하고 짧게 재시도합니다.";
  const action = clean(input.nextAction, fallback);
  if (input.mode !== "second") return truncate(action);
  if (/문단|다시쓰기|다시 쓰|rewrite/i.test(action)) return truncate(action);
  return truncate(`${action} 후 오늘 다시 쓸 문단 1개로 남깁니다.`);
}

export function buildCognitiveLearningActionUnit(input: CognitiveLearningActionInput): CognitiveLearningActionUnit {
  assertMetadataOnlyInput(input);

  const mode = input.mode === "second" ? "second" : "first";
  const subject = clean(input.subjectLabel, mode === "second" ? "감정평가사 2차" : "감정평가사 1차");
  const oneBiggestGap = truncate(
    clean(
      input.biggestGap,
      mode === "second" ? "가장 큰 간극 후보 1개를 먼저 확인합니다." : "가장 큰 약점 후보 1개를 먼저 확인합니다.",
    ),
  );
  const nextRewriteAction = buildRewriteAction({ ...input, mode });
  const pattern = classifyRetrievalPattern({ ...input, mode });
  const retrievalPrompt = getRetrievalPrompt(pattern);

  return {
    unitLabel: "s220e_cognitive_learning_action",
    oneBiggestGap,
    nextRewriteAction,
    retrievalCheck: {
      label: "10초 확인",
      pattern,
      prompt: retrievalPrompt,
    },
    continuation: {
      label: "내일 복습에 남길 내용",
      reviewQueueCandidate: `복습: ${oneBiggestGap}을 ${retrievalPrompt}`,
      todayPlanCandidate: `오늘 할 일: ${subject} ${nextRewriteAction}`,
      notesCandidate: `학습 노트: ${oneBiggestGap} / ${nextRewriteAction}`,
      todayPlanMaxPrimaryTasks: 3,
    },
    secondRoundPriorityOrder: SECOND_ROUND_PRIORITY_ORDER,
    dataBoundary: {
      metadataOnly: true,
      learnerOwnedContentCopied: false,
      globalReferenceWrite: false,
    },
  };
}

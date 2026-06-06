import { sanitizeReferenceRequest } from "./data-boundary";
import type { ReferenceSnippet } from "./reference-context";
import type { WrongAnswerItemInput } from "./types";

export const SECOND_REWRITE_CASIO_UNSUPPORTED_MESSAGE = "타건 순서는 지원되는 계산 템플릿에 한해 제공됩니다.";

export const SECOND_REWRITE_TASK_TYPE = "second_answer_rewrite" as const;

export type SecondAnswerRewriteSignal = {
  caseSummary: string;
  userAnswerSummary: string;
  missingIssueCandidate: string;
  weakStructurePoint: string;
  calculationRisk?: string | null;
  unitRisk?: string | null;
  rewriteInstruction: string;
  nextRewriteAction: string;
  rewriteTaskType: typeof SECOND_REWRITE_TASK_TYPE;
  supportedCalculatorTemplateId?: SecondCasioTemplateId | null;
  casioKeystrokes?: string[] | null;
  casioUnsupportedMessage?: string;
  referenceSnippets?: ReferenceSnippet[];
};

export type SecondCasioTemplateId = keyof typeof SECOND_CASIO_TEMPLATE_REGISTRY;

type SecondCasioTemplate = {
  templateId: string;
  displayName: string;
  formulaLabel: string;
  deterministicKeystrokes: string[];
  calculationRisk: string;
  unitRisk: string;
};

export const SECOND_CASIO_TEMPLATE_REGISTRY = {
  appraisal_income_capitalization: {
    templateId: "appraisal_income_capitalization",
    displayName: "수익환원법 직접환원",
    formulaLabel: "순영업소득 ÷ 환원이율",
    deterministicKeystrokes: ["MENU", "1:RUN-MAT", "AC/ON", "순영업소득", "÷", "환원이율", "EXE"],
    calculationRisk: "환원이율을 %가 아닌 소수로 입력했는지 확인",
    unitRisk: "순영업소득과 결과 금액 단위 일치 확인",
  },
  appraisal_unit_price: {
    templateId: "appraisal_unit_price",
    displayName: "단가 산정",
    formulaLabel: "총액 ÷ 면적",
    deterministicKeystrokes: ["MENU", "1:RUN-MAT", "AC/ON", "총액", "÷", "면적", "EXE"],
    calculationRisk: "면적 0 또는 전용/공용 면적 혼동 확인",
    unitRisk: "원/㎡, 원/평 단위 표시 확인",
  },
  appraisal_weighted_average: {
    templateId: "appraisal_weighted_average",
    displayName: "가중평균 보정",
    formulaLabel: "Σ(값×가중치) ÷ Σ가중치",
    deterministicKeystrokes: ["MENU", "1:RUN-MAT", "AC/ON", "(", "값1", "×", "가중치1", "+", "값2", "×", "가중치2", ")", "÷", "(", "가중치1", "+", "가중치2", ")", "EXE"],
    calculationRisk: "가중치 합계와 보정치 부호 확인",
    unitRisk: "비교값 단위가 같은지 확인",
  },
} as const satisfies Record<string, SecondCasioTemplate>;

function clean(value: string | null | undefined, fallback: string) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

export function isSupportedSecondCasioTemplateId(value: unknown): value is SecondCasioTemplateId {
  return typeof value === "string" && value in SECOND_CASIO_TEMPLATE_REGISTRY;
}

export function getSecondCasioKeystrokeMapping(templateId: unknown) {
  if (!isSupportedSecondCasioTemplateId(templateId)) {
    return {
      supportedCalculatorTemplateId: null,
      casioKeystrokes: null,
      casioUnsupportedMessage: SECOND_REWRITE_CASIO_UNSUPPORTED_MESSAGE,
    };
  }
  const template = SECOND_CASIO_TEMPLATE_REGISTRY[templateId];
  return {
    supportedCalculatorTemplateId: template.templateId,
    casioKeystrokes: [...template.deterministicKeystrokes],
    casioUnsupportedMessage: undefined,
  };
}

export function buildSecondAnswerRewriteSignal(input: Pick<WrongAnswerItemInput,
  | "caseSummary"
  | "myAnswerSummary"
  | "missingIssue"
  | "biggestGap"
  | "weakStructurePoint"
  | "calculationRisk"
  | "unitRisk"
  | "rewriteInstruction"
  | "supportedCalculatorTemplateId"
> & Partial<Pick<WrongAnswerItemInput, "subjectLabel" | "rawQuestionText">>, referenceSnippets: ReferenceSnippet[] = []): SecondAnswerRewriteSignal {
  const isPractice = input.subjectLabel === "감정평가실무";
  const isTheory = input.subjectLabel === "감정평가이론";
  const isLaw = input.subjectLabel === "감정평가 및 보상법규";
  const explicitCalculation = /계산|산식|단위|검산|CASIO|casio/.test(`${input.rawQuestionText ?? ""} ${input.missingIssue ?? ""} ${input.biggestGap ?? ""} ${input.weakStructurePoint ?? ""}`);
  const casio = isPractice || explicitCalculation ? getSecondCasioKeystrokeMapping(input.supportedCalculatorTemplateId) : getSecondCasioKeystrokeMapping(null);
  const lawFallback = /사업인정|처분성/.test(`${input.rawQuestionText ?? ""} ${input.missingIssue ?? ""} ${input.biggestGap ?? ""}`)
    ? "사업인정 처분성·권리구제 관계 구분"
    : "법적 성질/요건/포섭 구조 보강";
  const theoryFallback = "키워드와 논리 연결 보강";
  const missingIssueCandidate = clean(input.missingIssue ?? input.biggestGap, isLaw ? lawFallback : isTheory ? theoryFallback : "핵심 논점 후보 1개를 다시 확인합니다.");
  const weakStructurePoint = clean(input.weakStructurePoint, isLaw ? "법적 성질 → 처분성 → 권리구제 → 사안 해결" : isTheory ? "키워드 → 비교 → 원리 → 예시 → 평가 논리" : "근거와 결론 연결이 약합니다.");
  const defaultRewriteInstruction = isLaw
    ? (/처분성|사업인정/.test(missingIssueCandidate) ? "처분성 판단 문단 보강" : "목차 3줄 회상 후 10분 다시쓰기")
    : isTheory
      ? "키워드 3개를 회상하고 한 문단으로 설명"
      : `${missingIssueCandidate}을 먼저 쓰고, ${weakStructurePoint}을 한 문장으로 보강합니다.`;
  const rewriteInstruction = clean(input.rewriteInstruction, defaultRewriteInstruction);

  return {
    caseSummary: clean(input.caseSummary, "사례 요약은 노트 세부에서 확인합니다."),
    userAnswerSummary: clean(input.myAnswerSummary, "내 답안 요약은 노트 세부에서 확인합니다."),
    missingIssueCandidate,
    weakStructurePoint,
    calculationRisk: isLaw || (isTheory && !explicitCalculation) ? null : input.calculationRisk ?? (casio.supportedCalculatorTemplateId ? SECOND_CASIO_TEMPLATE_REGISTRY[casio.supportedCalculatorTemplateId].calculationRisk : null),
    unitRisk: isLaw || (isTheory && !explicitCalculation) ? null : input.unitRisk ?? (casio.supportedCalculatorTemplateId ? SECOND_CASIO_TEMPLATE_REGISTRY[casio.supportedCalculatorTemplateId].unitRisk : null),
    rewriteInstruction,
    nextRewriteAction: isLaw ? "10분 다시쓰기" : isTheory ? "한 문단 설명 다시쓰기" : "10분 다시 쓰기",
    rewriteTaskType: SECOND_REWRITE_TASK_TYPE,
    supportedCalculatorTemplateId: casio.supportedCalculatorTemplateId,
    casioKeystrokes: casio.casioKeystrokes,
    casioUnsupportedMessage: casio.casioUnsupportedMessage,
    referenceSnippets: referenceSnippets.slice(0, 2),
  };
}


export function buildSecondAnswerRewriteReferenceRequest(input: { examName: string; subjectLabel: string; topicTag?: string | null; missingIssue?: string | null; biggestGap?: string | null; supportedCalculatorTemplateId?: string | null }) {
  return sanitizeReferenceRequest({
    examMode: "second" as const,
    subject: input.subjectLabel,
    topicCandidate: input.topicTag ?? input.missingIssue ?? input.biggestGap ?? null,
    conceptCandidate: input.missingIssue ?? input.biggestGap ?? null,
    taskType: "second_answer_rewrite" as const,
    maxSnippets: 2,
    derivedTags: ["second_answer_rewrite", input.supportedCalculatorTemplateId].filter((value): value is string => Boolean(value)),
    safeSkeletonIds: [input.examName, input.subjectLabel].filter(Boolean),
  });
}

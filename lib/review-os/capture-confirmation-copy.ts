import type { AppraisalMode } from "@/lib/review-os/appraisal";

export type CaptureConfirmationCopyInput = {
  mode: AppraisalMode;
  subjectLabel?: string;
  rawQuestionText?: string;
  rawAnswerText?: string;
  userAnswer?: string;
  issueRecall?: string;
  outlineDraft?: string;
  rewriteParagraph?: string;
  myAnswerSummary?: string;
  userReasonText?: string;
  userReasonPreset?: string;
  biggestGap?: string;
  missingIssue?: string;
  comparisonPoint?: string;
  rewriteInstruction?: string;
  problemTitle?: string;
  caseSummary?: string;
};

export type CaptureConfirmationCopy = {
  biggestGap: string;
  nextAction: string;
};

const GENERAL_GAP = "오늘 입력에서 가장 큰 약점 후보 1개를 확인해 주세요.";
const GENERAL_SECOND_ACTION = "가장 큰 약점 후보를 반영해 한 문단만 다시 써 보세요.";
const GENERAL_FIRST_ACTION = "헷갈리는 개념을 O/X로 한 번 더 회상해 보세요.";

const CALCULATION_PATTERN = /계산|산식|단위|검산|수치|금액|환원|수익환원|원가|보정|면적|단가/;
const LAW_PATTERN = /감정평가\s*및\s*보상법규|보상법규|법규|사업인정|처분성|권리구제|항고소송|수용재결|조문|요건|포섭/;
const THEORY_PATTERN = /감정평가이론|이론|정의|논거|키워드|비교|원리|목차|문단/;

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function combinedText(input: CaptureConfirmationCopyInput) {
  return [
    input.subjectLabel,
    input.problemTitle,
    input.rawQuestionText,
    input.rawAnswerText,
    input.userAnswer,
    input.issueRecall,
    input.outlineDraft,
    input.rewriteParagraph,
    input.myAnswerSummary,
    input.userReasonText,
    input.biggestGap,
    input.missingIssue,
    input.comparisonPoint,
    input.rewriteInstruction,
    input.caseSummary,
  ]
    .map(clean)
    .filter(Boolean)
    .join(" ");
}

function firstCandidate(values: unknown[], options: { allowCalculation: boolean }) {
  for (const value of values.map(clean)) {
    if (!value) continue;
    if (!options.allowCalculation && CALCULATION_PATTERN.test(value)) continue;
    return value;
  }
  return "";
}

function classifySecondContext(input: CaptureConfirmationCopyInput) {
  const subject = clean(input.subjectLabel);
  const text = combinedText(input);

  if (/보상법규|법규/.test(subject) || LAW_PATTERN.test(text)) return "law";
  if (/이론/.test(subject) || THEORY_PATTERN.test(`${subject} ${text}`)) return "theory";
  if (/실무/.test(subject) || CALCULATION_PATTERN.test(text)) return "practice";
  return "general";
}

function buildLawCopy(input: CaptureConfirmationCopyInput): CaptureConfirmationCopy {
  const text = combinedText(input);
  const hasDisposition = /처분성/.test(text);
  const hasProjectApproval = /사업인정/.test(text);
  const hasJudgmentStandard = /판단\s*기준|기준/.test(text);

  if (hasDisposition && hasProjectApproval) {
    return {
      biggestGap: hasJudgmentStandard ? "사업인정 처분성 판단 기준 혼동" : "사업인정 처분성 판단 구조 혼동",
      nextAction: hasJudgmentStandard
        ? "사업인정 처분성 판단 기준을 한 문단으로 다시 써보기"
        : "사업인정 처분성 판단 문단을 다시 써보기",
    };
  }

  if (hasDisposition) {
    return {
      biggestGap: hasJudgmentStandard ? "처분성 판단 기준 혼동" : "처분성 판단 구조 혼동",
      nextAction: hasJudgmentStandard ? "처분성 판단 기준을 한 문단으로 다시 써보기" : "처분성 판단 문단을 다시 써보기",
    };
  }

  if (hasProjectApproval) {
    return {
      biggestGap: "사업인정의 법적 성질과 권리구제 관계 혼동",
      nextAction: "사업인정 쟁점을 법적 성질-요건-권리구제 순서로 한 문단 다시 써보기",
    };
  }

  if (/요건|조문|포섭/.test(text)) {
    return {
      biggestGap: "조문·요건과 사안 포섭 연결 부족",
      nextAction: "요건 1개와 사안 포섭 문장 1개를 다시 써보기",
    };
  }

  const explicitGap = firstCandidate([input.biggestGap, input.missingIssue, input.userReasonText], { allowCalculation: false });
  const explicitAction = firstCandidate([input.rewriteInstruction, input.comparisonPoint], { allowCalculation: false });

  return {
    biggestGap: explicitGap || "법적 성질·요건·포섭 중 핵심 쟁점 1개 혼동",
    nextAction: explicitAction || "핵심 쟁점 1개를 한 문단으로 다시 써보기",
  };
}

function buildTheoryCopy(input: CaptureConfirmationCopyInput): CaptureConfirmationCopy {
  const text = combinedText(input);
  const explicitGap = firstCandidate([input.biggestGap, input.missingIssue, input.userReasonText], { allowCalculation: false });
  const explicitAction = firstCandidate([input.rewriteInstruction, input.comparisonPoint], { allowCalculation: false });

  if (/목차|문단/.test(text)) {
    return {
      biggestGap: explicitGap || "이론 목차와 논거 연결 부족",
      nextAction: explicitAction || "목차 3줄 뒤 핵심 논거 문단 1개를 다시 써보기",
    };
  }

  if (/정의|개념|키워드/.test(text)) {
    return {
      biggestGap: explicitGap || "핵심 키워드와 정의 연결 부족",
      nextAction: explicitAction || "키워드 1개를 정의-논거-예시 순서로 다시 정리하기",
    };
  }

  return {
    biggestGap: explicitGap || "핵심 키워드와 논거 연결 부족",
    nextAction: explicitAction || "주장-논거-예시 순서로 한 문단 다시 써보기",
  };
}

function buildPracticeCopy(input: CaptureConfirmationCopyInput): CaptureConfirmationCopy {
  const text = combinedText(input);
  const explicitGap = firstCandidate([input.biggestGap, input.missingIssue, input.userReasonText], { allowCalculation: true });
  const explicitAction = firstCandidate([input.rewriteInstruction, input.comparisonPoint], { allowCalculation: true });

  if (/단위/.test(text)) {
    return {
      biggestGap: explicitGap || "단위 표기와 계산 흐름 확인 필요",
      nextAction: explicitAction || "단위를 먼저 고정하고 산식-결론 순서로 다시 써보기",
    };
  }

  return {
    biggestGap: explicitGap || "계산 근거 누락",
    nextAction: explicitAction || "산식과 계산 근거를 먼저 쓰고 결론 문장까지 다시 연결하기",
  };
}

export function resolveCaptureConfirmationCopy(input: CaptureConfirmationCopyInput): CaptureConfirmationCopy {
  if (input.mode === "second") {
    const context = classifySecondContext(input);
    if (context === "law") return buildLawCopy(input);
    if (context === "theory") return buildTheoryCopy(input);
    if (context === "practice") return buildPracticeCopy(input);

    return {
      biggestGap: firstCandidate([input.biggestGap, input.missingIssue, input.userReasonText], { allowCalculation: false }) || GENERAL_GAP,
      nextAction: firstCandidate([input.rewriteInstruction, input.comparisonPoint], { allowCalculation: false }) || GENERAL_SECOND_ACTION,
    };
  }

  return {
    biggestGap:
      firstCandidate([input.userReasonText, input.userReasonPreset, input.comparisonPoint, input.biggestGap], {
        allowCalculation: false,
      }) || GENERAL_GAP,
    nextAction: firstCandidate([input.comparisonPoint, input.rewriteInstruction], { allowCalculation: false }) || GENERAL_FIRST_ACTION,
  };
}

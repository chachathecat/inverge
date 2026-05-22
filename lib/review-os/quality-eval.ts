export type QualityEvalInput = {
  mode: "first" | "second";
  ocrUncertain?: boolean;
  output: Record<string, unknown>;
};

export type QualityEvalResult = {
  hasOneBiggestGap: boolean;
  hasOneNextAction: boolean;
  nextActionIsShort: boolean;
  hasModeSpecificFields: boolean;
  hasNoForbiddenClaims: boolean;
  hasOcrCautionWhenNeeded: boolean;
  koreanToneScore: "pass" | "needs_review";
};

const FORBIDDEN_COPY = [
  "공식 채점",
  "합격 예측",
  "합격/불합격",
  "점수 보장",
  "완벽한 정답",
  "official grading",
  "pass/fail",
] as const;

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function hasKoreanTone(text: string): boolean {
  return /[가-힣]/.test(text) && !/[!]{2,}/.test(text);
}

export function evaluateReviewOutputQuality(input: QualityEvalInput): QualityEvalResult {
  const gap = readString(input.output, "biggestGap");
  const nextAction = readString(input.output, "nextAction");
  const caution = readString(input.output, "caution");

  const joined = Object.values(input.output)
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  const hasModeSpecificFields =
    input.mode === "first"
      ? Boolean(readString(input.output, "conceptTag") || readString(input.output, "retrievalPrompt"))
      : Boolean(readString(input.output, "rewriteInstruction") || readString(input.output, "missingIssue"));

  const hasForbidden = FORBIDDEN_COPY.some((phrase) => joined.includes(phrase.toLowerCase()));

  const hasOneBiggestGap = gap.length > 0 && gap.split(/[\n•]/).filter((part) => part.trim().length > 0).length === 1;
  const hasOneNextAction = nextAction.length > 0 && nextAction.split(/[\n•]/).filter((part) => part.trim().length > 0).length === 1;

  return {
    hasOneBiggestGap,
    hasOneNextAction,
    nextActionIsShort: nextAction.length > 0 && nextAction.length <= 80,
    hasModeSpecificFields,
    hasNoForbiddenClaims: !hasForbidden,
    hasOcrCautionWhenNeeded: input.ocrUncertain ? caution.length > 0 : true,
    koreanToneScore: hasKoreanTone(`${gap} ${nextAction}`) ? "pass" : "needs_review",
  };
}

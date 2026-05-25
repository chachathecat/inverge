export type QualityEvalInput = {
  mode: "first" | "second";
  ocrUncertain?: boolean;
  output: Record<string, unknown>;
};

export type QualityEvalResult = {
  hasOneBiggestGap: boolean;
  hasOneNextAction: boolean;
  nextActionIsShort: boolean;
  nextActionIsConcrete: boolean;
  hasModeSpecificFields: boolean;
  hasNoForbiddenClaims: boolean;
  hasNoOfficialAnswerHallucination: boolean;
  respectsSubjectStructure: boolean;
  outputIsConciseForTiredLearner: boolean;
  hasOcrCautionWhenNeeded: boolean;
  koreanToneScore: "pass" | "needs_review";
  retrievalBeforeExplanation: boolean;
  secondAnswerBeforeReference: boolean;
  hasSinglePrimaryAction: boolean;
  advancedFieldsAreProgressive: boolean;
};

const FORBIDDEN_COPY = [
  "공식 채점",
  "합격 예측",
  "합격/불합격",
  "점수 보장",
  "완벽한 정답",
  "official grading",
  "pass/fail",
  "합격 가능성",
  "점수",
] as const;

const OFFICIAL_ANSWER_HALLUCINATION = ["공식 정답", "official answer", "출제위원 정답", "확정 정답"] as const;

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value.trim() : "";
}

function hasKoreanTone(text: string): boolean {
  return /[가-힣]/.test(text) && !/[!]{2,}/.test(text);
}

function isConcreteAction(text: string): boolean {
  return /(다시|재작성|회상|비교|검토|확인|정리|작성|풉니다|써봅니다|고정)/.test(text) && /\d/.test(text);
}

export function evaluateReviewOutputQuality(input: QualityEvalInput): QualityEvalResult {
  const gap = readString(input.output, "biggestGap");
  const nextAction = readString(input.output, "nextAction");
  const caution = readString(input.output, "caution");

  const joined = Object.values(input.output)
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  const firstFlow = readString(input.output, "firstModeFlow");
  const secondFlow = readString(input.output, "secondModeFlow");
  const primaryActions = Array.isArray(input.output.primaryActions)
    ? input.output.primaryActions.filter((v): v is string => typeof v === "string")
    : [];
  const advancedFields = Array.isArray(input.output.advancedFields)
    ? input.output.advancedFields.filter((v): v is string => typeof v === "string")
    : [];
  const progressiveSection = readString(input.output, "advancedSection");

  const hasModeSpecificFields =
    input.mode === "first"
      ? Boolean(readString(input.output, "conceptTag") || readString(input.output, "retrievalPrompt"))
      : Boolean(readString(input.output, "rewriteInstruction") || readString(input.output, "missingIssue"));

  const hasForbidden = FORBIDDEN_COPY.some((phrase) => joined.includes(phrase.toLowerCase()));
  const hasOfficialAnswerHallucination = OFFICIAL_ANSWER_HALLUCINATION.some((phrase) => joined.includes(phrase.toLowerCase()));

  const hasOneBiggestGap =
    gap.length > 0 &&
    gap.split(/[\n•]/).filter((part) => part.trim().length > 0).length === 1 &&
    !/(전반적으로|전체적으로|두루|대체로)/.test(gap);
  const hasOneNextAction = nextAction.length > 0 && nextAction.split(/[\n•]/).filter((part) => part.trim().length > 0).length === 1;

  const respectsSubjectStructure =
    input.mode === "first"
      ? Boolean(readString(input.output, "conceptTag") && readString(input.output, "retrievalPrompt"))
      : Boolean(readString(input.output, "rewriteInstruction") && readString(input.output, "missingIssue"));

  return {
    hasOneBiggestGap,
    hasOneNextAction,
    nextActionIsShort: nextAction.length > 0 && nextAction.length <= 80,
    nextActionIsConcrete: hasOneNextAction && isConcreteAction(nextAction),
    hasModeSpecificFields,
    hasNoForbiddenClaims: !hasForbidden,
    hasNoOfficialAnswerHallucination: !hasOfficialAnswerHallucination,
    respectsSubjectStructure,
    outputIsConciseForTiredLearner: `${gap} ${nextAction}`.length <= 140,
    hasOcrCautionWhenNeeded: input.ocrUncertain ? caution.length > 0 && /(원문|수기|직접 입력|manual)/i.test(caution) : true,
    koreanToneScore: hasKoreanTone(`${gap} ${nextAction}`) ? "pass" : "needs_review",
    retrievalBeforeExplanation:
      input.mode === "first" ? /recall.*explanation|retry.*hint|회상.*해설|재풀이.*해설/i.test(firstFlow) : true,
    secondAnswerBeforeReference:
      input.mode === "second" ? /own answer.*reference|answer.*reference|내 답안.*기준답안|작성.*비교/i.test(secondFlow) : true,
    hasSinglePrimaryAction: primaryActions.length === 1,
    advancedFieldsAreProgressive:
      advancedFields.length === 0 || /details|quiet|선택|접기|더보기/i.test(progressiveSection),
  };
}

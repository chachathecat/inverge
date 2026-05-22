type SecondRewriteComparisonInput = {
  subject: string;
  beforeWeakPoint?: string | null;
  missingIssue?: string | null;
  skeletonKeywordHint?: string | null;
  commonGaps?: string[];
  rewriteParagraph?: string | null;
};

type SubjectHintMap = Record<string, string[]>;

const SECOND_SUBJECT_HINTS: SubjectHintMap = {
  "감정평가실무": ["계산근거", "단위/반올림", "평가방법 선택", "결론 수치 명확성"],
  "감정평가이론": ["정의", "논거", "사례 적용", "결론 구체성"],
  "감정평가 및 보상법규": ["조문/요건", "절차", "법리", "사안 포섭", "결론"],
};

export function buildSecondRewriteComparison(input: SecondRewriteComparisonInput) {
  const hints = SECOND_SUBJECT_HINTS[input.subject] ?? ["정의", "근거", "사실 연결", "결론"];
  const beforeGap = (input.beforeWeakPoint ?? input.missingIssue ?? hints[0] ?? "핵심 논점").trim();
  const missingKeywordCandidate = (input.skeletonKeywordHint ?? hints[0] ?? "핵심 키워드").trim();
  const commonGap = input.commonGaps?.find((gap) => gap.trim().length > 0) ?? hints[1] ?? hints[0] ?? "근거 연결";
  const rewritten = (input.rewriteParagraph ?? "").trim();
  const hasKeyword = rewritten.length > 0 && rewritten.includes(missingKeywordCandidate);
  return {
    improvedPoint: `${beforeGap} 중심으로 문단 초점을 좁혀 핵심 흐름이 이전보다 선명해졌습니다.`,
    remainingRisk: `${commonGap} 점검이 부족하면 다음 문단에서도 같은 누락이 반복될 수 있습니다.`,
    missingKeywordCandidate,
    nextSentenceAction: `${hints[hints.length - 1] ?? "결론"} 문장을 1문장으로 다시 써서 '${missingKeywordCandidate}'를 포함해 마무리하세요.`,
    caution: hasKeyword
      ? "점수 판정이 아니라 문단 보강을 돕는 참고 결과입니다."
      : `점수 판정이 아니라 문단 보강을 돕는 참고 결과입니다. '${missingKeywordCandidate}'를 다음 문장에 직접 넣어 확인하세요.`,
  };
}

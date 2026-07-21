import {
  OWNER_ALPHA_PRACTICE_CONTRACT_VERSION,
  type OwnerAlphaClaimState,
  type OwnerAlphaMethodFamily,
  type OwnerAlphaPracticeProblemModel,
  type OwnerAlphaRoleType,
} from "./owner-alpha-practice-contract";

const NUMBER_WITH_UNIT =
  /(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)\s*(억원|백만원|천만원|만원|천원|원|㎡|m²|m2|평|ha|%|년|개월|일|개)?/g;
const COMPOSITE_KOREAN_CURRENCY =
  /(-?\d{1,3}(?:,\d{3})*(?:\.\d+)?|-?\d+(?:\.\d+)?)\s*억(?:\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\s*(천|백|십)?\s*만)?\s*원?/g;
const DATE_PATTERN = /\b(19|20)\d{2}[.\-/년]\s*\d{1,2}(?:[.\-/월]\s*\d{1,2}일?)?\b/g;
const REQUIREMENT_SENTENCE =
  /[^\n.!?]*(?:구하시오|산정하시오|평가하시오|계산하시오|검토하시오|기술하시오|제시하시오)[^\n.!?]*/g;

function compact(values: string[], limit: number) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(
    0,
    limit,
  );
}

function normalizeNumericValue(raw: string, unit: string | null) {
  const value = Number(raw.replaceAll(",", ""));
  if (!Number.isFinite(value)) return null;
  if (unit === "억원") return value * 100_000_000;
  if (unit === "백만원") return value * 100_000_000;
  if (unit === "천만원") return value * 10_000_000;
  if (unit === "만원") return value * 10_000;
  if (unit === "천원") return value * 1_000;
  if (unit === "%") return value;
  return value;
}

function methodFamilyFromText(text: string): OwnerAlphaMethodFamily {
  const cost =
    /(원가법|원가방식|재조달원가|재생산원가|감가수정|내용연수|잔존내용연수|관찰감가|분해법)/i.test(
      text,
    );
  const comparison =
    /(거래사례비교|비교방식|사정보정|시점수정|지역요인|개별요인|배분법|시장추출|비준가격)/i.test(
      text,
    );
  const income =
    /(수익환원|수익방식|직접환원|할인현금흐름|현재가치|환원이율|할인율|순수익|연금현가|임대손실)/i.test(
      text,
    );
  const count = [cost, comparison, income].filter(Boolean).length;
  if (count !== 1) return "mixed_or_uncertain";
  if (cost) return "cost_approach";
  if (comparison) return "comparison_approach";
  return "income_approach";
}

function topicCandidates(text: string, family: OwnerAlphaMethodFamily) {
  const candidates: string[] = [];
  if (family === "cost_approach") candidates.push("원가방식", "감가수정");
  if (family === "comparison_approach")
    candidates.push("비교방식", "배분·사정보정");
  if (family === "income_approach")
    candidates.push("수익방식", "환원·현재가치");
  for (const [pattern, label] of [
    [/재조달원가|재생산원가/i, "재조달원가"],
    [/기능적\s*감가|과잉개량|부족개량/i, "기능적 감가"],
    [/사정보정/i, "사정보정"],
    [/시점수정|지수/i, "시점수정"],
    [/배분법/i, "배분법"],
    [/환원이율|직접환원/i, "직접환원"],
    [/현재가치|할인율|연금현가/i, "현재가치"],
    [/임대손실/i, "임대손실 환원"],
  ] as const) {
    if (pattern.test(text)) candidates.push(label);
  }
  return compact(candidates.length > 0 ? candidates : ["방법 확인 필요"], 8);
}

function subMethodCandidates(text: string) {
  const candidates: string[] = [];
  for (const [pattern, label] of [
    [/직접법/i, "직접법"],
    [/간접법/i, "간접법"],
    [/관찰감가/i, "관찰감가법"],
    [/분해법/i, "분해법"],
    [/배분법/i, "배분법"],
    [/시장추출/i, "시장추출법"],
    [/직접환원/i, "직접환원법"],
    [/할인현금흐름|DCF/i, "할인현금흐름법"],
  ] as const) {
    if (pattern.test(text)) candidates.push(label);
  }
  return compact(candidates, 8);
}

function entitiesAndRoles(text: string) {
  const entities: Array<{
    entityId: string;
    label: string;
    role: OwnerAlphaRoleType;
    sourceState: "problem_given";
  }> = [];
  const definitions: Array<[RegExp, string, OwnerAlphaRoleType]> = [
    [/대상(?:물건|부동산|토지|건물)|본건/i, "대상물건", "subject_property"],
    [/거래사례|비교사례|임대사례|사례\s*[A-Z0-9가-힣]?/i, "비교사례", "comparable_property"],
    [/표준지|표준주택|표준자료|기준자료/i, "표준·기준자료", "standard_reference"],
    [/지수|통계|공식\s*계열/i, "공식 지수·계열", "official_series"],
    [/법률|시행령|시행규칙|조문/i, "법령 자료", "legal_source"],
  ];
  for (const [pattern, label, role] of definitions) {
    if (pattern.test(text)) {
      entities.push({
        entityId: `entity-${entities.length + 1}`,
        label,
        role,
        sourceState: "problem_given",
      });
    }
  }
  return entities;
}

function requirements(text: string) {
  const matched = [...text.matchAll(REQUIREMENT_SENTENCE)].map((entry) =>
    entry[0].trim(),
  );
  const fallback = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /구하|산정|평가|계산|검토|기술|제시/.test(line));
  return compact(matched.length > 0 ? matched : fallback, 12).map(
    (requirement, index) => ({
      requirementId: `requirement-${index + 1}`,
      text: requirement.slice(0, 500),
    }),
  );
}

function sentenceFacts(text: string) {
  return compact(
    text
      .split(/(?:\n+|(?<=[.!?])\s+)/)
      .map((value) => value.trim())
      .filter(
        (value) =>
          value.length >= 4 &&
          !/(?:구하시오|산정하시오|평가하시오|계산하시오|검토하시오|기술하시오|제시하시오)/.test(
            value,
          ),
      ),
    16,
  ).map((value, index) => ({
    factId: `fact-${index + 1}`,
    label: `문제 제시 사실 ${index + 1}`,
    value: value.slice(0, 800),
    sourceState: "problem_given" as const,
  }));
}

function assumptions(text: string) {
  return compact(
    text
      .split(/(?:\n+|(?<=[.!?])\s+)/)
      .map((value) => value.trim())
      .filter((value) => /가정|전제|단,|단\s/.test(value)),
    12,
  ).map((value, index) => ({
    assumptionId: `assumption-${index + 1}`,
    text: value.slice(0, 800),
    state: "problem_given" as const,
  }));
}

function overlaps(
  start: number,
  end: number,
  excluded: Array<{ start: number; end: number }>,
) {
  return excluded.some((range) => start < range.end && end > range.start);
}

function givenNumbers(text: string) {
  const numbers: OwnerAlphaPracticeProblemModel["givenNumbers"] = [];
  const excluded = [...text.matchAll(DATE_PATTERN)].map((match) => ({
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length,
  }));
  for (const match of text.matchAll(COMPOSITE_KOREAN_CURRENCY)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const major = Number(match[1].replaceAll(",", ""));
    const minor = match[2] ? Number(match[2].replaceAll(",", "")) : 0;
    const minorScale =
      match[3] === "천"
        ? 1_000
        : match[3] === "백"
          ? 100
          : match[3] === "십"
            ? 10
            : 1;
    const value =
      major * 100_000_000 +
      (major < 0 ? -1 : 1) * minor * minorScale * 10_000;
    if (!Number.isFinite(value)) continue;
    numbers.push({
      numberId: `number-${numbers.length + 1}`,
      label: `문제 제시 수치 ${numbers.length + 1}`,
      value,
      unit: "원",
      sourceState: "problem_given",
    });
    excluded.push({ start, end });
    if (numbers.length === 40) return numbers;
  }
  for (const match of text.matchAll(NUMBER_WITH_UNIT)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    if (overlaps(start, end, excluded)) continue;
    const unit = match[2] ?? null;
    const value = normalizeNumericValue(match[1], unit);
    if (value === null) continue;
    numbers.push({
      numberId: `number-${numbers.length + 1}`,
      label: `문제 제시 수치 ${numbers.length + 1}`,
      value,
      unit,
      sourceState: "problem_given",
    });
    if (numbers.length === 40) break;
  }
  return numbers;
}

function datesAndTimePoints(text: string) {
  return compact([...text.matchAll(DATE_PATTERN)].map((entry) => entry[0]), 20).map(
    (value, index) => ({
      timePointId: `time-${index + 1}`,
      label: `문제 제시 시점 ${index + 1}`,
      value,
      sourceState: "problem_given" as const,
    }),
  );
}

function methodClaim(
  family: OwnerAlphaMethodFamily,
): OwnerAlphaClaimState {
  const uncertain = family === "mixed_or_uncertain";
  return {
    claimId: "claim-method-family",
    claimType: "method",
    summary: uncertain ? "적용 방법을 추가 확인해야 합니다." : "문제 문언상 방법군 후보입니다.",
    state: uncertain ? "unresolved_needs_review" : "ai_inference",
    critical: true,
    evidenceRefIds: [],
    calculationNodeId: null,
    resolutionCode: uncertain ? "multiple_reasonable_approaches" : "provider_only",
  };
}

export function compileOwnerAlphaPracticeProblem(input: {
  problemId: string;
  problemText: string;
}): OwnerAlphaPracticeProblemModel {
  const normalized = input.problemText
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .trim();
  const family = methodFamilyFromText(normalized);
  const compiledRequirements = requirements(normalized);
  const resolvedRequirements =
    compiledRequirements.length > 0
      ? compiledRequirements
      : [
          {
            requirementId: "requirement-1",
            text: "문제의 요구사항을 직접 확인해 주세요.",
          },
        ];
  const numbers = givenNumbers(normalized);
  const dates = datesAndTimePoints(normalized);
  return {
    contractVersion: OWNER_ALPHA_PRACTICE_CONTRACT_VERSION,
    problemId: input.problemId,
    subject: "감정평가실무",
    topicCandidates: topicCandidates(normalized, family),
    methodFamily: family,
    subMethodCandidates: subMethodCandidates(normalized),
    requirements: resolvedRequirements,
    requestedOutputs: resolvedRequirements.map((requirement, index) => ({
      outputId: `output-${index + 1}`,
      label: requirement.text.slice(0, 160),
      unit: null,
    })),
    pointAllocation: resolvedRequirements.map((requirement) => ({
      requirementId: requirement.requirementId,
      points: null,
    })),
    entitiesAndRoles: entitiesAndRoles(normalized),
    givenFacts: sentenceFacts(normalized),
    givenNumbers: numbers,
    units: compact(numbers.map((number) => number.unit ?? ""), 20),
    datesAndTimePoints: dates,
    assumptions: assumptions(normalized),
    methodCandidates: [
      {
        methodId: family,
        label:
          family === "mixed_or_uncertain"
            ? "방법 확인 필요"
            : family,
        state:
          family === "mixed_or_uncertain"
            ? "unresolved_needs_review"
            : "ai_inference",
        confidence: family === "mixed_or_uncertain" ? "low" : "medium",
      },
    ],
    rejectionReasons: [],
    calculationGraph: { nodes: [] },
    sourceStates: [
      {
        sourceId: "source-problem-given",
        label: "사용자가 확인한 문제 원문",
        state: "problem_given",
        sourceRefId: input.problemId,
        effectiveAt: null,
        unresolvedReason: null,
      },
    ],
    claimVerificationStates: [
      methodClaim(family),
      ...numbers.map((number) => ({
        claimId: `claim-${number.numberId}`,
        claimType: "number" as const,
        summary: `${number.label}: ${number.value}${number.unit ?? ""}`,
        state: "problem_given" as const,
        critical: true,
        evidenceRefIds: ["source-problem-given"],
        calculationNodeId: null,
        resolutionCode: "supported" as const,
      })),
      ...dates.map((date) => ({
        claimId: `claim-${date.timePointId}`,
        claimType: "source" as const,
        summary: `${date.label}: ${date.value}`,
        state: "problem_given" as const,
        critical: true,
        evidenceRefIds: ["source-problem-given"],
        calculationNodeId: null,
        resolutionCode: "supported" as const,
      })),
    ],
  };
}

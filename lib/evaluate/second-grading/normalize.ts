import {
  ISSUE_SPOTTING_FAILURE_ROOT_CAUSE,
  RUBRIC_CATEGORY_FALLBACKS,
  SECOND_GRADING_DEDUCTIONS,
  SECOND_GRADING_RUBRIC_BY_TYPE,
} from "./schema";
import type {
  DeductionItem,
  RubricCategory,
  RubricScore,
  SecondExamQuestionType,
  SecondGradingResult,
  SkeletonOutlineItem,
} from "./types";

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeRubricScores(questionType: SecondExamQuestionType, source: unknown): RubricScore[] {
  const maxByCategory = SECOND_GRADING_RUBRIC_BY_TYPE[questionType];
  const input = Array.isArray(source) ? source : [];
  const byCategory = new Map<RubricCategory, RubricScore>();

  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const category = (item as RubricScore).category;
    if (!(category in maxByCategory)) continue;

    const maxScore = maxByCategory[category as keyof typeof maxByCategory];
    byCategory.set(category, {
      category,
      maxScore,
      score: clampScore(Math.min(toNumber((item as RubricScore).score, 0), maxScore)),
      rationale: (item as RubricScore).rationale || RUBRIC_CATEGORY_FALLBACKS[category],
      evidence: Array.isArray((item as RubricScore).evidence) ? (item as RubricScore).evidence : [],
    });
  }

  return (Object.keys(maxByCategory) as RubricCategory[]).map((category) => {
    const existing = byCategory.get(category);
    if (existing) return existing;
    return {
      category,
      maxScore: maxByCategory[category as keyof typeof maxByCategory],
      score: 0,
      rationale: RUBRIC_CATEGORY_FALLBACKS[category],
      evidence: [],
    };
  });
}

function normalizeDeductions(source: unknown): DeductionItem[] {
  const input = Array.isArray(source) ? source : [];
  const seenRootCause = new Set<string>();
  const output: DeductionItem[] = [];

  for (const item of input) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Partial<DeductionItem>;
    if (!candidate.code || !(candidate.code in SECOND_GRADING_DEDUCTIONS)) continue;

    const rootCauseId = candidate.rootCauseId || `cause_${candidate.code}`;
    const independent = rootCauseId === ISSUE_SPOTTING_FAILURE_ROOT_CAUSE;
    if (!independent && seenRootCause.has(rootCauseId)) continue;

    seenRootCause.add(rootCauseId);
    output.push({
      code: candidate.code,
      label: candidate.label || candidate.code,
      points: SECOND_GRADING_DEDUCTIONS[candidate.code],
      rootCauseId,
      reason: candidate.reason || "판단 불가",
      evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
      cumulative: true,
      independentlyCumulative: independent || undefined,
    });
  }

  return output;
}

function normalizeSkeleton(source: unknown) {
  const input = source && typeof source === "object" ? (source as Record<string, unknown>) : {};
  const outline = Array.isArray(input.outline) ? input.outline : [];

  const normalizedOutline: SkeletonOutlineItem[] = outline.map((item) => {
    const sourceItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      heading: typeof sourceItem.heading === "string" ? sourceItem.heading : "소제목 필요",
      bullets: Array.isArray(sourceItem.bullets) ? sourceItem.bullets.filter((v): v is string => typeof v === "string") : [],
      requiredKeywords: Array.isArray(sourceItem.requiredKeywords)
        ? sourceItem.requiredKeywords.filter((v): v is string => typeof v === "string")
        : [],
      statutesOrCases: Array.isArray(sourceItem.statutesOrCases)
        ? sourceItem.statutesOrCases.filter((v): v is string => typeof v === "string")
        : [],
      formulasLatex: Array.isArray(sourceItem.formulasLatex)
        ? sourceItem.formulasLatex.filter((v): v is string => typeof v === "string")
        : [],
      applicationDirection:
        typeof sourceItem.applicationDirection === "string" ? sourceItem.applicationDirection : "판단 불가",
    };
  });

  return {
    format: "outline_only" as const,
    caution: "완성형 문단 답안 금지. 개요 기반 학습용 초안입니다.",
    outline: normalizedOutline,
  };
}

export function normalizeSecondGradingResult(input: unknown): SecondGradingResult {
  const source = input && typeof input === "object" ? (input as Record<string, any>) : {};
  const questionType: SecondExamQuestionType = source.questionType || "theory";
  const rubricScores = normalizeRubricScores(questionType, source.rubricScores);
  const rubricSubtotal = rubricScores.reduce((sum, item) => sum + item.score, 0);
  const baseScore = clampScore(toNumber(source.baseScore, rubricSubtotal));

  const deductions = normalizeDeductions(source.deductions);
  const deductionTotal = deductions.reduce((sum, item) => sum + item.points, 0);

  const issueGate = {
    triggered: Boolean(source.issueGate?.triggered),
    reason: source.issueGate?.reason || "판단 불가",
    lockScoreTo: source.issueGate?.lockScoreTo == null ? undefined : clampScore(toNumber(source.issueGate.lockScoreTo, 0)),
  };

  const scoreAfterDeduction = baseScore + deductionTotal;
  const lockedScore = issueGate.triggered ? issueGate.lockScoreTo ?? scoreAfterDeduction : scoreAfterDeduction;

  return {
    mode: source.mode || "problem_only",
    subject: source.subject || "감정평가이론",
    questionType,
    issueGate,
    rubricScores,
    rubricSubtotal,
    baseScore,
    deductions,
    deductionTotal,
    finalScore: clampScore(lockedScore),
    passProbabilitySimulation: source.passProbabilitySimulation || {
      band: "very_low",
      estimatedRange: [0, 20],
      rationale: "판단 불가",
      caveat: "입력 근거 부족",
    },
    skeletonModelAnswer: normalizeSkeleton(source.skeletonModelAnswer),
    weaknessDrill: source.weaknessDrill || {
      targetWeakness: "핵심 쟁점 식별",
      improvementGoalPercent: 15,
      durationMinutes: 5,
      prompt: "핵심 쟁점 1개를 3문장으로 재정의하세요.",
      expectedOutputChecklist: ["쟁점 1개", "법규/기준 1개", "사안적용 1개"],
    },
    notes: Array.isArray(source.notes) ? source.notes : [],
  };
}

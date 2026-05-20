import type { AnswerReviewStructureDraft } from "./answer-review-structure";

type PrimaryFix = {
  gap: string;
  whyItMatters: string;
  howToFix: string;
};

type Skeleton = {
  issue: string[];
  rule: string[];
  application: string[];
  conclusion: string[];
};

export type AnswerReviewQualityView = {
  primaryFix: PrimaryFix;
  skeleton: Skeleton;
  nextAction: string;
  qualityWarnings: string[];
};

const KOREAN_WARNING = "한국어 검토 문장이 부족합니다. 결과를 다시 확인해 주세요.";
const PRIMARY_MAX = 160;

const SAFETY_TERMS = [
  "공식 채점",
  "합격 판정",
  "확정 점수",
  "모범답안 확정",
  "official grader",
  "pass/fail judge",
  "정답 보장",
  "합격 보장",
  "합격 확률",
];

function normalizeLine(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function trimTo(text: string, max = PRIMARY_MAX) {
  const normalized = normalizeLine(text);
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max).trimEnd()}…`;
}

function mostlyEnglish(text: string) {
  const sample = normalizeLine(text);
  if (!sample) return false;
  const letters = sample.match(/[A-Za-z]/g)?.length ?? 0;
  const korean = sample.match(/[가-힣]/g)?.length ?? 0;
  return letters >= 20 && letters > korean * 2;
}

function sanitizeSafety(text: string) {
  let next = text;
  for (const term of SAFETY_TERMS) {
    next = next.replaceAll(term, "검토 필요");
  }
  return next;
}

function fallbackIfNeeded(text: string, fallback: string, warnings: Set<string>) {
  const clean = sanitizeSafety(trimTo(text || ""));
  if (!clean) return fallback;
  if (mostlyEnglish(clean)) {
    warnings.add(KOREAN_WARNING);
    return fallback;
  }
  return clean;
}

function uniqueBullets(items: string[], fallback: string) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const clean = normalizeLine(sanitizeSafety(raw));
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= 3) break;
  }
  if (out.length === 0) return [fallback];
  return out;
}

export function buildAnswerReviewQualityView(draft: AnswerReviewStructureDraft): AnswerReviewQualityView {
  const warnings = new Set<string>();
  const gapSource =
    draft.missingIssueCandidates.find((item) => normalizeLine(item).length > 0) ||
    draft.weakLogicPoint ||
    draft.weakParagraphPoint ||
    draft.requiredIssues;

  const primaryFix: PrimaryFix = {
    gap: fallbackIfNeeded(gapSource, "누락 논점 1개를 먼저 지정해 보강하세요.", warnings),
    whyItMatters: fallbackIfNeeded(
      draft.weakLogicPoint || draft.requiredIssues,
      "핵심 논점을 놓치면 답안의 설득력이 크게 떨어집니다.",
      warnings,
    ),
    howToFix: fallbackIfNeeded(
      draft.weakParagraphPoint || draft.rewriteTarget,
      "누락 논점 1개를 표시하고 결론 문장만 다시 쓰세요.",
      warnings,
    ),
  };

  const issue = uniqueBullets(
    [...draft.missingIssueCandidates, draft.requiredIssues],
    "핵심 논점 1개를 먼저 적고 용어를 짧게 정리하세요.",
  );
  const rule = uniqueBullets(
    [draft.requiredIssues, draft.referenceStructure],
    "기준 문구와 법리 키워드 2개를 먼저 배치하세요.",
  ).filter((item) => !issue.includes(item));

  const safeRule = rule.length > 0 ? rule : ["기준/법리 키워드를 논점과 분리해 한 줄로 적으세요."];

  const application = uniqueBullets(
    [draft.weakParagraphPoint, draft.weakLogicPoint],
    "사안 적용 근거를 한 문장 더 추가해 연결하세요.",
  );

  const conclusion = uniqueBullets(
    [draft.rewriteTarget, draft.rewriteDraftSuggestion, draft.nextAction],
    "10분 동안 이 문단만 다시 써보세요.",
  );

  const nextAction = fallbackIfNeeded(
    draft.nextAction,
    "10분 동안 이 문단만 다시 써보세요.",
    warnings,
  );

  return {
    primaryFix: {
      gap: trimTo(primaryFix.gap),
      whyItMatters: trimTo(primaryFix.whyItMatters),
      howToFix: trimTo(primaryFix.howToFix),
    },
    skeleton: {
      issue,
      rule: safeRule,
      application,
      conclusion,
    },
    nextAction,
    qualityWarnings: Array.from(warnings),
  };
}

import { loadExplanationLadder, type AppraiserExamMode } from "./curriculum-reference";

export type ExplanationLadderInput = {
  conceptLabel: string;
  subject: string;
  examMode: AppraiserExamMode;
  learnerLevel?: "beginner" | "intermediate" | "advanced" | string;
};

export type ExplanationLadderV1 = {
  conceptLabel: string;
  subject: string;
  examMode: AppraiserExamMode;
  learnerLevel?: string;
  entries: Array<{ label: "1타 쉬운풀이" | "합격 한 줄" | "출제자 함정" | "10초 확인"; text: string }>;
  metadataOnly: true;
  sourceStatus: string;
  needsOfficialVerification: boolean;
};

const REQUIRED_LABELS = ["1타 쉬운풀이", "합격 한 줄", "출제자 함정", "10초 확인"] as const;
const FORBIDDEN_CLAIM_PATTERNS = [/공식\s*정답/, /최종\s*정답/, /자동\s*채점/, /점수\s*보장/, /합격\s*보장/, /불합격\s*확정/, /모범답안\s*확정/];

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isSupportedMode(mode: unknown): mode is AppraiserExamMode {
  return mode === "first" || mode === "second";
}

function findTemplate(conceptLabel: string) {
  const normalized = clean(conceptLabel).toLowerCase();
  return loadExplanationLadder().templates.find((template) => {
    const concept = template.concept.toLowerCase();
    return concept.includes(normalized) || normalized.includes(concept);
  });
}

function fallbackText(label: (typeof REQUIRED_LABELS)[number], input: ExplanationLadderInput) {
  const concept = clean(input.conceptLabel) || "확인한 개념";
  if (label === "1타 쉬운풀이") return `${concept}는 먼저 기준어 1개를 떠올린 뒤 짧게 설명합니다.`;
  if (label === "합격 한 줄") return `${concept}는 정의와 효과를 한 문장으로 회상합니다.`;
  if (label === "출제자 함정") return `${concept}에서 예외 표현과 반대 효과 표현을 분리합니다.`;
  return input.examMode === "first"
    ? `O/X: ${concept}의 핵심 기준을 반대로 바꾸어도 같은 결론이다.`
    : `cloze: ${concept} 답안은 쟁점 제시 → ____ → 결론 순서로 점검한다.`;
}

function normalizeTenSecondCheck(text: string, input: ExplanationLadderInput) {
  if (/O\/X|cloze|____|빈칸/.test(text)) return text;
  return input.examMode === "first" ? `O/X: ${text}` : `cloze: ${text} ____`;
}

export function buildExplanationLadder(input: ExplanationLadderInput): ExplanationLadderV1 {
  if (!isSupportedMode(input.examMode)) throw new Error(`Unsupported appraiser exam mode: ${String(input.examMode)}`);
  const reference = loadExplanationLadder();
  const template = findTemplate(input.conceptLabel);
  const entries = REQUIRED_LABELS.map((label) => {
    const templateText = template?.ladder[label];
    const text = label === "10초 확인"
      ? normalizeTenSecondCheck(templateText ?? fallbackText(label, input), input)
      : (templateText ?? fallbackText(label, input));
    return { label, text: clean(text) };
  });

  const ladder: ExplanationLadderV1 = {
    conceptLabel: clean(input.conceptLabel),
    subject: clean(input.subject),
    examMode: input.examMode,
    learnerLevel: input.learnerLevel,
    entries,
    metadataOnly: true,
    sourceStatus: reference.sourceStatus,
    needsOfficialVerification: reference.needsOfficialVerification,
  };
  validateExplanationLadder(ladder);
  return ladder;
}

export function toTenSecondCheck(ladder: ExplanationLadderV1) {
  const entry = ladder.entries.find((item) => item.label === "10초 확인");
  return entry ? { ...entry, compatibleWith: /O\/X/.test(entry.text) ? "ox" as const : "cloze" as const } : null;
}

export function validateExplanationLadder(ladder: ExplanationLadderV1) {
  const labels = new Set(ladder.entries.map((entry) => entry.label));
  for (const label of REQUIRED_LABELS) {
    if (!labels.has(label)) return false;
  }
  const tenSecond = ladder.entries.find((entry) => entry.label === "10초 확인")?.text ?? "";
  if (!/O\/X|cloze|____|빈칸/.test(tenSecond)) return false;
  const merged = JSON.stringify(ladder);
  if (FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(merged))) return false;
  return true;
}

import { loadExplanationLadder, type AppraiserExamMode } from "./curriculum-reference";
import { assertExplanationQuality, evaluateExplanationLadderQuality } from "./explanation-quality-eval";

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
const FORBIDDEN_CLAIM_PATTERNS = [
  /공식\s*(?:정답|해설|모범\s*답안|모범답안|채점|점수)/i,
  /최종\s*정답/i,
  /확정\s*(?:정답|점수|모범\s*답안|모범답안)/i,
  /official\s+(?:answer|solution|grading|score|model\s+answer)/i,
  /model\s+answer/i,
  /자동\s*채점/i,
  /AI\s*(?:최종\s*)?(?:판정|채점)/i,
  /점수\s*(?:보장|예측|확정|판정|산출|채점)/i,
  /합격\s*(?:보장|예측|확정|판정)/i,
  /합격보장/i,
  /불합격\s*(?:예측|확정|판정)/i,
];
const RAW_TEXT_LEAK_PATTERNS = [
  /rawOcrText|raw_ocr_text|ocrText|problemText|questionText|rawQuestionText|userAnswerText|answerText|rawAnswerText|sourceText|copyrightedText|originalText/i,
  /다음\s+(?:중|제시문|자료)|옳은\s+것은|틀린\s+것은|정답\s*[:：]|답안\s*원문|문제\s*원문|OCR\s*원문/i,
];

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isSupportedMode(mode: unknown): mode is AppraiserExamMode {
  return mode === "first" || mode === "second";
}

function containsForbiddenClaim(value: string) {
  return FORBIDDEN_CLAIM_PATTERNS.some((pattern) => pattern.test(value));
}

function containsRawTextLeak(value: string) {
  return RAW_TEXT_LEAK_PATTERNS.some((pattern) => pattern.test(value));
}

function safeLearnerLabel(value: string, fallback: string) {
  const normalized = clean(value);
  if (!normalized || containsForbiddenClaim(normalized) || containsRawTextLeak(normalized) || normalized.length > 80) return fallback;
  return normalized;
}

function safeOptionalLearnerLabel(value: string | undefined) {
  if (value === undefined) return undefined;
  const normalized = clean(value);
  if (!normalized || containsForbiddenClaim(normalized) || containsRawTextLeak(normalized) || normalized.length > 40) return undefined;
  return normalized;
}

function findTemplate(conceptLabel: string) {
  const normalized = clean(conceptLabel).toLowerCase();
  return loadExplanationLadder().templates.find((template) => {
    const concept = template.concept.toLowerCase();
    return concept.includes(normalized) || normalized.includes(concept);
  });
}

function fallbackText(label: (typeof REQUIRED_LABELS)[number], input: ExplanationLadderInput) {
  const concept = safeLearnerLabel(input.conceptLabel, "확인할 개념");
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
  const conceptLabel = safeLearnerLabel(input.conceptLabel, "확인할 개념");
  const subject = safeLearnerLabel(input.subject, "해당 과목");
  const learnerLevel = safeOptionalLearnerLabel(input.learnerLevel);
  const template = findTemplate(conceptLabel);
  const entries = REQUIRED_LABELS.map((label) => {
    const templateText = template?.ladder[label];
    const text = label === "10초 확인"
      ? normalizeTenSecondCheck(templateText ?? fallbackText(label, input), input)
      : (templateText ?? fallbackText(label, input));
    return { label, text: clean(text) };
  });

  const ladder: ExplanationLadderV1 = {
    conceptLabel,
    subject,
    examMode: input.examMode,
    learnerLevel,
    entries,
    metadataOnly: true,
    sourceStatus: reference.sourceStatus,
    needsOfficialVerification: reference.needsOfficialVerification,
  };
  const quality = evaluateExplanationLadderQuality(ladder, { conceptLabel, subject, examMode: input.examMode });
  if (quality.status !== "pass") {
    const fallbackConcept = "확인할 개념";
    const fallbackSubject = "해당 과목";
    const safeFallback: ExplanationLadderV1 = {
      conceptLabel: fallbackConcept,
      subject: fallbackSubject,
      examMode: input.examMode,
      learnerLevel: undefined,
      entries: REQUIRED_LABELS.map((label) => ({ label, text: clean(fallbackText(label, { ...input, conceptLabel: fallbackConcept, subject: fallbackSubject })) })),
      metadataOnly: true,
      sourceStatus: reference.sourceStatus,
      needsOfficialVerification: reference.needsOfficialVerification,
    };
    const fallbackQuality = evaluateExplanationLadderQuality(safeFallback, { conceptLabel: fallbackConcept, subject: fallbackSubject, examMode: input.examMode });
    assertExplanationQuality(fallbackQuality);
    return safeFallback;
  }
  assertExplanationQuality(quality);
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
  if (RAW_TEXT_LEAK_PATTERNS.some((pattern) => pattern.test(merged))) return false;
  return evaluateExplanationLadderQuality(ladder, { conceptLabel: ladder.conceptLabel, subject: ladder.subject, examMode: ladder.examMode }).status === "pass";
}

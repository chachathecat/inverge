import type { SecondExamAiInput, SecondExamAiOutput } from "@/lib/inverge/second-exam-ai";

export type SecondExamAiValidationFailureCode =
  | "invalid-json"
  | "invalid-status"
  | "missing-public-text"
  | "missing-required-field"
  | "unexpected-field"
  | "too-long"
  | "too-many-items"
  | "forbidden-expression"
  | "score-or-pass-claim"
  | "threatening-tone"
  | "not-actionable"
  | "evidence-drift"
  | "unsafe-internal";

export type SecondExamAiValidationResult =
  | { ok: true; output: SecondExamAiOutput; failureCodes: [] }
  | { ok: false; output: SecondExamAiOutput; failureCodes: SecondExamAiValidationFailureCode[] };

const FORBIDDEN_EXPRESSIONS = [
  "합격 가능성",
  "예상 점수",
  "점수",
  "상위권",
  "하위권",
  "등급",
  "정답은",
  "반드시",
  "치명적",
  "심각",
  "탈락",
  "불합격",
  "망쳤",
  "완전히 틀",
];

const ACTION_MARKERS = [
  "고정",
  "붙",
  "바꾸",
  "이어",
  "작성",
  "다시",
  "문장",
  "첫",
  "마지막",
  "조문",
  "계산",
  "논점",
  "결론",
  "사안",
  "적용",
  "마무리",
  "fix",
  "rewrite",
  "add",
  "start",
  "close",
  "link",
  "keep",
];

const SUBJECT_TERMS: Record<string, string[]> = {
  practice: ["계산", "결론", "판단", "수치", "평가", "calculation", "judgment", "closing", "conclusion"],
  theory: ["논점", "첫 문장", "정의", "근거", "문단", "issue", "opening", "reasoning"],
  law: ["조문", "사안", "적용", "요건", "결론", "rule", "case", "application", "conclusion"],
};

export const SECOND_EXAM_AI_INVALID_RESPONSE_SAMPLES = [
  {
    reason: "score-or-pass-claim",
    output: { publicText: { gapTitle: "이 답안은 합격 가능성이 낮습니다." } },
  },
  {
    reason: "too-long",
    output: { publicText: { rewriteInstruction: "전체 답안의 논리와 문장과 결론과 구조를 모두 다시 점검하면서 전반적으로 개선하세요." } },
  },
  {
    reason: "evidence-drift",
    output: { publicText: { gapSummary: "사용자가 누락한 판례번호와 조문을 추가해야 합니다." } },
  },
] as const;

function errorOutput(failureCodes: SecondExamAiValidationFailureCode[]): SecondExamAiOutput {
  return {
    status: "error",
    publicText: {},
    internal: {
      usedEvidenceIds: [],
      confidenceAdjustment: 0,
      safetyFlags: failureCodes,
    },
  };
}

function readObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const items = value.map((item) => readString(item)).filter((item): item is string => !!item);
  return items;
}

export function parseSecondExamAiOutput(raw: unknown): SecondExamAiOutput {
  const root = readObject(raw);
  if (!root) return errorOutput(["invalid-json"]);

  const status = root.status === "ok" || root.status === "insufficient-evidence" || root.status === "error" ? root.status : "error";
  const publicText = readObject(root.publicText) ?? {};
  const internal = readObject(root.internal) ?? {};
  const confidenceAdjustment =
    internal.confidenceAdjustment === -0.1 || internal.confidenceAdjustment === 0.1 ? internal.confidenceAdjustment : 0;

  return {
    status,
    publicText: {
      gapTitle: readString(publicText.gapTitle),
      gapSummary: readString(publicText.gapSummary),
      rewriteInstruction: readString(publicText.rewriteInstruction),
      guidance: readStringArray(publicText.guidance),
      placeholder: readString(publicText.placeholder),
      starter: readString(publicText.starter),
      recordsNote: readString(publicText.recordsNote),
      nextActionLabel: readString(publicText.nextActionLabel),
    },
    internal: {
      usedEvidenceIds: readStringArray(internal.usedEvidenceIds)?.slice(0, 5) ?? [],
      confidenceAdjustment,
      safetyFlags: readStringArray(internal.safetyFlags)?.slice(0, 8) ?? [],
    },
  };
}

function collectPublicText(output: SecondExamAiOutput) {
  return [
    output.publicText.gapTitle,
    output.publicText.gapSummary,
    output.publicText.rewriteInstruction,
    ...(output.publicText.guidance ?? []),
    output.publicText.placeholder,
    output.publicText.starter,
    output.publicText.recordsNote,
    output.publicText.nextActionLabel,
  ].filter((item): item is string => !!item);
}

function hasForbiddenExpression(text: string) {
  return FORBIDDEN_EXPRESSIONS.some((expression) => text.includes(expression));
}

function hasActionMarker(text: string) {
  return ACTION_MARKERS.some((marker) => text.includes(marker));
}

function hasEvidenceAnchor(text: string, input: SecondExamAiInput) {
  const anchors = [
    input.ruleResult.focusLabel,
    input.ruleResult.rewriteTarget,
    input.existingSeed.gapTitle,
    input.existingSeed.gapSummary,
    input.existingSeed.rewriteInstruction,
    ...(input.existingSeed.guidance ?? []),
    input.existingSeed.placeholder,
    input.existingSeed.starter,
    input.existingSeed.recordsNote,
    input.existingSeed.nextActionLabel,
    ...(SUBJECT_TERMS[input.productContext.subjectId] ?? []),
  ]
    .filter((item): item is string => !!item)
    .flatMap((item) => item.split(/[\s·/-]+/))
    .map((item) => item.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((item) => item.length >= 2);

  const normalized = text.replace(/[^\p{L}\p{N}]/gu, "");
  return anchors.some((anchor) => normalized.includes(anchor));
}

function validateCompareOutput(input: SecondExamAiInput, output: SecondExamAiOutput) {
  const failures: SecondExamAiValidationFailureCode[] = [];
  const { gapTitle, gapSummary, rewriteInstruction, guidance, placeholder, starter } = output.publicText;

  if (guidance || placeholder || starter) failures.push("unexpected-field");
  if (!gapTitle || !gapSummary || !rewriteInstruction) failures.push("missing-required-field");
  if (gapTitle && gapTitle.length > input.outputLimits.maxGapTitleChars) failures.push("too-long");
  if (gapSummary && gapSummary.split(/[.!?。]/).filter(Boolean).length > input.outputLimits.maxSummarySentences) {
    failures.push("too-long");
  }
  if (gapSummary && gapSummary.length > 160) failures.push("too-long");
  if (rewriteInstruction && rewriteInstruction.length > 90) failures.push("too-long");
  if (rewriteInstruction && !hasActionMarker(rewriteInstruction)) failures.push("not-actionable");

  return failures;
}

function validateRewriteOutput(input: SecondExamAiInput, output: SecondExamAiOutput) {
  const failures: SecondExamAiValidationFailureCode[] = [];
  const { gapTitle, gapSummary, rewriteInstruction, guidance, placeholder, starter } = output.publicText;

  if (gapTitle || gapSummary || rewriteInstruction) failures.push("unexpected-field");
  if (!guidance || guidance.length === 0 || !placeholder) failures.push("missing-required-field");
  if (guidance && guidance.length > input.outputLimits.maxGuidanceItems) failures.push("too-many-items");
  if (guidance?.some((item) => item.length > input.outputLimits.maxGuidanceCharsEach)) failures.push("too-long");
  if (placeholder && placeholder.length > 120) failures.push("too-long");
  if (starter && starter.length > 32) failures.push("too-long");
  if (guidance?.some((item) => !hasActionMarker(item))) failures.push("not-actionable");

  return failures;
}

function validateRecordsOutput(input: SecondExamAiInput, output: SecondExamAiOutput) {
  const failures: SecondExamAiValidationFailureCode[] = [];
  const { gapTitle, gapSummary, rewriteInstruction, guidance, placeholder, starter, recordsNote, nextActionLabel } =
    output.publicText;

  if (gapTitle || gapSummary || rewriteInstruction || guidance || placeholder || starter) failures.push("unexpected-field");
  if (!recordsNote || !nextActionLabel) failures.push("missing-required-field");
  if (recordsNote && recordsNote.length > 140) failures.push("too-long");
  if (nextActionLabel && nextActionLabel.length > 90) failures.push("too-long");
  if (nextActionLabel && !hasActionMarker(nextActionLabel)) failures.push("not-actionable");

  return failures;
}

export function validateSecondExamAiOutput(
  input: SecondExamAiInput,
  output: SecondExamAiOutput,
): SecondExamAiValidationResult {
  const failures: SecondExamAiValidationFailureCode[] = [];

  if (output.status !== "ok") failures.push("invalid-status");
  if (output.internal.safetyFlags.length > 0) failures.push("unsafe-internal");

  const texts = collectPublicText(output);
  if (texts.length === 0) failures.push("missing-public-text");

  if (texts.some((text) => hasForbiddenExpression(text))) failures.push("forbidden-expression");
  if (texts.some((text) => /합격|불합격|점수|등급|상위|하위/.test(text))) failures.push("score-or-pass-claim");
  if (texts.some((text) => /심각|치명|위험|탈락|망쳤/.test(text))) failures.push("threatening-tone");
  if (texts.some((text) => !hasEvidenceAnchor(text, input))) failures.push("evidence-drift");

  if (input.task === "compare-copy") {
    failures.push(...validateCompareOutput(input, output));
  } else if (input.task === "rewrite-seed-copy") {
    failures.push(...validateRewriteOutput(input, output));
  } else {
    failures.push(...validateRecordsOutput(input, output));
  }

  const uniqueFailures = [...new Set(failures)];

  if (uniqueFailures.length > 0) {
    return {
      ok: false,
      output: errorOutput(uniqueFailures),
      failureCodes: uniqueFailures,
    };
  }

  return {
    ok: true,
    output,
    failureCodes: [],
  };
}

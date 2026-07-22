import "server-only";

import crypto from "node:crypto";

import { GoogleGenerativeAI } from "@google/generative-ai";

import {
  OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION,
  isOwnerAlphaExplanationLadderV1,
  ownerAlphaExpectedExplanationBlocks,
  type OwnerAlphaExplanationLadderV1,
} from "./owner-alpha-explanation-ladder-contract";
import {
  OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
  OWNER_ALPHA_AI_REFERENCE_LABEL,
  type OwnerAlphaBiggestGap,
  type OwnerAlphaCalculationNode,
  type OwnerAlphaClaimState,
  type OwnerAlphaMisconceptionGraph,
  type OwnerAlphaNumericExpression,
  type OwnerAlphaPracticeProblemModel,
  type OwnerAlphaRootCauseCandidate,
} from "./owner-alpha-practice-contract";
import {
  OwnerAlphaProviderError,
  type OwnerAlphaPracticeProviderPort,
  type OwnerAlphaProviderFile,
  type OwnerAlphaReferenceDraft,
} from "./owner-alpha-practice-provider-contract";
import {
  ownerAlphaSubjectProviderInstructions,
} from "./owner-alpha-practice-subject-adapters";
import {
  ownerAlphaGapTypeForSubject,
  ownerAlphaSubjectLabel,
  type OwnerAlphaPracticeSubject,
} from "./owner-alpha-subject-adapter-contract";

const DEFAULT_MODEL = "gemini-2.5-flash";
const PROVIDER_TIMEOUT_MS = 25_000;
const MAX_TEXT_LENGTH = 24_000;
const MAX_SECTION_BODY_LENGTH = 4_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value: unknown, fallback: string, limit = 800) {
  if (typeof value !== "string") return fallback;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, limit) : fallback;
}

function identifier(value: unknown, fallback: string) {
  const normalized = textValue(value, "", 120)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) return fallback;
  return `provider-${crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 24)}`;
}

function stringArray(value: unknown, limit: number, itemLimit = 800) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, itemLimit))
    .filter(Boolean)
    .slice(0, limit);
}

function identifierArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => identifier(item, ""))
    .filter(Boolean)
    .slice(0, limit);
}

function normalizeExplanationLadder(
  value: unknown,
): OwnerAlphaExplanationLadderV1 | undefined {
  if (value === undefined) return undefined;
  if (!isOwnerAlphaExplanationLadderV1(value)) {
    throw new OwnerAlphaProviderError("invalid_output");
  }
  const normalized = {
    ...value,
    parentReferenceId: identifier(value.parentReferenceId, ""),
    blocks: value.blocks.map((block) => ({
      ...block,
      claimIds: identifierArray(block.claimIds, 40),
      calculationNodeIds: identifierArray(block.calculationNodeIds, 60),
      checkQuestionId: block.checkQuestionId,
    })),
  };
  if (!isOwnerAlphaExplanationLadderV1(normalized)) {
    throw new OwnerAlphaProviderError("invalid_output");
  }
  return normalized;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function finiteArray(value: unknown, limit = 100) {
  if (!Array.isArray(value)) return null;
  const values = value.slice(0, limit).map(finiteNumber);
  return values.every((item): item is number => item !== null) ? values : null;
}

function normalizeSections(value: unknown, fallbackHeading: string) {
  const rows = Array.isArray(value) ? value : [];
  const sections = rows
    .filter(isRecord)
    .map((row, index) => ({
      heading: textValue(row.heading, `${fallbackHeading} ${index + 1}`, 160),
      body: textValue(row.body, "검토가 필요합니다.", MAX_SECTION_BODY_LENGTH),
    }))
    .slice(0, 12);
  return sections.length > 0
    ? sections
    : [{ heading: fallbackHeading, body: "검토가 필요합니다." }];
}

function normalizeClaim(value: unknown, index: number): OwnerAlphaClaimState | null {
  if (!isRecord(value)) return null;
  const claimType = ["number", "formula", "method", "concept", "source"].includes(
    String(value.claimType),
  )
    ? (String(value.claimType) as OwnerAlphaClaimState["claimType"])
    : "concept";
  const unresolved = value.state === "unresolved_needs_review";
  return {
    claimId: identifier(value.claimId, `ai-claim-${index + 1}`),
    claimType,
    summary: textValue(value.summary, "검토가 필요한 AI 추론입니다.", 1_000),
    // Provider output can never promote itself to problem/official/deterministic evidence.
    state: unresolved ? "unresolved_needs_review" : "ai_inference",
    critical: value.critical === true,
    evidenceRefIds: stringArray(value.evidenceRefIds, 12, 120),
    calculationNodeId:
      typeof value.calculationNodeId === "string"
        ? identifier(value.calculationNodeId, "") || null
        : null,
    resolutionCode: unresolved
      ? value.resolutionCode === "multiple_reasonable_approaches"
        ? "multiple_reasonable_approaches"
        : "missing_source"
      : "provider_only",
  };
}

function baseNode(value: Record<string, unknown>, index: number) {
  const claimedResult = finiteNumber(value.claimedResult);
  if (claimedResult === null) return null;
  return {
    nodeId: identifier(value.nodeId, `calc-${index + 1}`),
    claimId:
      typeof value.claimId === "string"
        ? identifier(value.claimId, "") || null
        : null,
    label: textValue(value.label, `계산 ${index + 1}`, 240),
    claimedResult,
    resultUnit:
      typeof value.resultUnit === "string"
        ? textValue(value.resultUnit, "", 40) || null
        : null,
    critical: value.critical !== false,
  };
}

function normalizeExpression(
  value: unknown,
  depth = 0,
): OwnerAlphaNumericExpression | null {
  if (!isRecord(value) || depth > 12) return null;
  if (value.kind === "literal") {
    const literal = finiteNumber(value.value);
    return literal === null ? null : { kind: "literal", value: literal };
  }
  if (value.kind !== "operation") return null;
  const operator = String(value.operator);
  if (!["add", "subtract", "multiply", "divide", "power"].includes(operator)) {
    return null;
  }
  if (!Array.isArray(value.operands) || value.operands.length < 1 || value.operands.length > 20) {
    return null;
  }
  const operands = value.operands.map((item) => normalizeExpression(item, depth + 1));
  if (operands.some((item) => item === null)) return null;
  return {
    kind: "operation",
    operator: operator as "add" | "subtract" | "multiply" | "divide" | "power",
    operands: operands as OwnerAlphaNumericExpression[],
  };
}

function normalizeCalculationNode(
  value: unknown,
  index: number,
): OwnerAlphaCalculationNode | null {
  if (!isRecord(value)) return null;
  const base = baseNode(value, index);
  if (!base) return null;
  const primitive = String(value.primitive);
  if (primitive === "expression_order") {
    const expression = normalizeExpression(value.expression);
    return expression ? { ...base, primitive, expression } : null;
  }
  if (primitive === "sum") {
    const values = finiteArray(value.values);
    return values ? { ...base, primitive, values } : null;
  }
  if (primitive === "subtraction") {
    const minuend = finiteNumber(value.minuend);
    const subtrahends = finiteArray(value.subtrahends);
    return minuend !== null && subtrahends
      ? { ...base, primitive, minuend, subtrahends }
      : null;
  }
  if (primitive === "ratio") {
    const numerator = finiteNumber(value.numerator);
    const denominator = finiteNumber(value.denominator);
    return numerator !== null && denominator !== null
      ? { ...base, primitive, numerator, denominator }
      : null;
  }
  if (primitive === "percentage_direction") {
    const baseValue = finiteNumber(value.baseValue);
    const rate = finiteNumber(value.rate);
    const direction = value.direction === "decrease" ? "decrease" : "increase";
    const rateInput = value.rateInput === "percent" ? "percent" : "decimal";
    return baseValue !== null && rate !== null
      ? { ...base, primitive, baseValue, rate, direction, rateInput }
      : null;
  }
  if (primitive === "unit_conversion") {
    const amount = finiteNumber(value.value);
    const fromUnit = textValue(value.fromUnit, "", 40);
    const toUnit = textValue(value.toUnit, "", 40);
    return amount !== null && fromUnit && toUnit
      ? { ...base, primitive, value: amount, fromUnit, toUnit }
      : null;
  }
  if (primitive === "elapsed_period") {
    const fromDate = textValue(value.fromDate, "", 20);
    const toDate = textValue(value.toDate, "", 20);
    const basis = ["days", "months", "years"].includes(String(value.basis))
      ? (String(value.basis) as "days" | "months" | "years")
      : "days";
    return fromDate && toDate ? { ...base, primitive, fromDate, toDate, basis } : null;
  }
  if (primitive === "rounding") {
    const amount = finiteNumber(value.value);
    const digits = finiteNumber(value.digits);
    const mode = value.mode === "truncate" ? "truncate" : "round";
    return amount !== null && digits !== null
      ? { ...base, primitive, value: amount, digits, mode }
      : null;
  }
  if (primitive === "significant_digits") {
    const amount = finiteNumber(value.value);
    const digits = finiteNumber(value.digits);
    return amount !== null && digits !== null
      ? { ...base, primitive, value: amount, digits }
      : null;
  }
  if (primitive === "area_times_unit_price") {
    const area = finiteNumber(value.area);
    const unitPrice = finiteNumber(value.unitPrice);
    return area !== null && unitPrice !== null
      ? { ...base, primitive, area, unitPrice }
      : null;
  }
  if (primitive === "allocation") {
    const total = finiteNumber(value.total);
    const ratio = finiteNumber(value.ratio);
    const ratioInput = value.ratioInput === "percent" ? "percent" : "decimal";
    return total !== null && ratio !== null
      ? { ...base, primitive, total, ratio, ratioInput }
      : null;
  }
  if (primitive === "residual") {
    const total = finiteNumber(value.total);
    const deductions = finiteArray(value.deductions);
    return total !== null && deductions
      ? { ...base, primitive, total, deductions }
      : null;
  }
  if (primitive === "index_ratio") {
    const targetIndex = finiteNumber(value.targetIndex);
    const baseIndex = finiteNumber(value.baseIndex);
    return targetIndex !== null && baseIndex !== null
      ? { ...base, primitive, targetIndex, baseIndex }
      : null;
  }
  if (primitive === "present_value") {
    const futureValue = finiteNumber(value.futureValue);
    const rate = finiteNumber(value.rate);
    const periods = finiteNumber(value.periods);
    const rateInput = value.rateInput === "percent" ? "percent" : "decimal";
    return futureValue !== null && rate !== null && periods !== null
      ? { ...base, primitive, futureValue, rate, periods, rateInput }
      : null;
  }
  if (primitive === "annuity_factor") {
    const rate = finiteNumber(value.rate);
    const periods = finiteNumber(value.periods);
    const rateInput = value.rateInput === "percent" ? "percent" : "decimal";
    return rate !== null && periods !== null
      ? { ...base, primitive, rate, periods, rateInput }
      : null;
  }
  if (primitive === "capitalization") {
    const netIncome = finiteNumber(value.netIncome);
    const capitalizationRate = finiteNumber(value.capitalizationRate);
    const rateInput = value.rateInput === "percent" ? "percent" : "decimal";
    return netIncome !== null && capitalizationRate !== null
      ? { ...base, primitive, netIncome, capitalizationRate, rateInput }
      : null;
  }
  if (primitive === "remaining_life_ratio") {
    const remainingLife = finiteNumber(value.remainingLife);
    const totalLife = finiteNumber(value.totalLife);
    return remainingLife !== null && totalLife !== null
      ? { ...base, primitive, remainingLife, totalLife }
      : null;
  }
  return null;
}

function normalizeReferenceDraft(
  value: unknown,
  input: {
    sessionId: string;
    generatedAt: string;
    modelProfileId: string;
    problemModel: OwnerAlphaPracticeProblemModel;
  },
): OwnerAlphaReferenceDraft {
  if (!isRecord(value)) throw new OwnerAlphaProviderError("invalid_output");
  const rawReference = isRecord(value.reference) ? value.reference : value;
  const rawClaims = Array.isArray(rawReference.claims) ? rawReference.claims : [];
  const claims = rawClaims
    .map(normalizeClaim)
    .filter((claim): claim is OwnerAlphaClaimState => Boolean(claim))
    .slice(0, 40);
  const rawGraph = isRecord(rawReference.calculationGraph)
    ? rawReference.calculationGraph
    : {};
  const nodes = (Array.isArray(rawGraph.nodes) ? rawGraph.nodes : [])
    .map(normalizeCalculationNode)
    .filter((node): node is OwnerAlphaCalculationNode => Boolean(node))
    .slice(0, 60);
  const referenceId = identifier(
    rawReference.referenceId,
    `${input.sessionId}-reference`,
  );
  const explanationLadder = normalizeExplanationLadder(
    rawReference.explanationLadder,
  );

  const hints = (Array.isArray(rawReference.hints) ? rawReference.hints : [])
    .filter(isRecord)
    .map((hint, index) => ({
      hintId: identifier(hint.hintId, `hint-${index + 1}`),
      level: Math.min(4, Math.max(1, Number(hint.level) || index + 1)) as 1 | 2 | 3 | 4,
      text: textValue(hint.text, "문제의 요구사항과 단위를 다시 확인하세요.", 1_200),
    }))
    .slice(0, 4);
  while (hints.length < 4) {
    const level = (hints.length + 1) as 1 | 2 | 3 | 4;
    hints.push({
      hintId: `hint-${level}`,
      level,
      text: "문제의 요구사항·자료 역할·시점·단위를 차례로 확인하세요.",
    });
  }

  const rawGap = isRecord(value.biggestGap) ? value.biggestGap : {};
  const conceptIds = stringArray(rawGap.conceptIds, 8, 120);
  const subject =
    input.problemModel.subjectAdapter?.subject ?? "appraisal_practical";
  const biggestGap: OwnerAlphaBiggestGap = {
    gapId: identifier(rawGap.gapId, `${input.sessionId}-gap-1`),
    title: textValue(rawGap.title, "가장 큰 간극 확인 필요", 240),
    reasonSelected: textValue(
      rawGap.reasonSelected,
      "독립 시도와 기준안의 차이가 가장 큰 한 지점입니다.",
      800,
    ),
    inferredMisunderstanding: textValue(
      rawGap.inferredMisunderstanding,
      "현재 근거만으로는 혼동 개념을 확정할 수 없습니다.",
      800,
    ),
    successCriteria: textValue(
      rawGap.successCriteria,
      "같은 조건에서 산식 선택 이유와 단위를 직접 설명합니다.",
      800,
    ),
    conceptIds,
    state: "ai_candidate",
    gapType: ownerAlphaGapTypeForSubject(subject, rawGap.gapType),
  };

  const rawMisconception = isRecord(value.misconceptionGraph)
    ? value.misconceptionGraph
    : {};
  const misconceptionNodes = (Array.isArray(rawMisconception.nodes)
    ? rawMisconception.nodes
    : [])
    .filter(isRecord)
    .map((node, index): OwnerAlphaMisconceptionGraph["nodes"][number] => {
      const state: OwnerAlphaMisconceptionGraph["nodes"][number]["state"] =
        node.state === "observed" || node.state === "suspected"
          ? node.state
          : "unresolved";
      return {
        conceptId: identifier(node.conceptId, `concept-${index + 1}`),
        label: textValue(node.label, `혼동 후보 ${index + 1}`, 240),
        state,
        evidenceRefIds: stringArray(node.evidenceRefIds, 12, 120),
      };
    })
    .slice(0, 16);
  const misconceptionEdges = (Array.isArray(rawMisconception.edges)
    ? rawMisconception.edges
    : [])
    .filter(isRecord)
    .map((edge, index) => {
      const relation = [
        "confuses_with",
        "prerequisite_gap",
        "misapplied_rule",
        "direction_error",
      ].includes(String(edge.relation))
        ? (String(edge.relation) as OwnerAlphaMisconceptionGraph["edges"][number]["relation"])
        : "misapplied_rule";
      return {
        edgeId: identifier(edge.edgeId, `edge-${index + 1}`),
        fromConceptId: identifier(edge.fromConceptId, "concept-1"),
        toConceptId: identifier(edge.toConceptId, "concept-2"),
        relation,
        evidenceRefIds: stringArray(edge.evidenceRefIds, 12, 120),
      };
    })
    .slice(0, 24);

  const roots = (Array.isArray(value.rootCauseCandidates)
    ? value.rootCauseCandidates
    : [])
    .filter(isRecord)
    .map((root, index): OwnerAlphaRootCauseCandidate => {
      const confidence: OwnerAlphaRootCauseCandidate["confidence"] =
        root.confidence === "high" || root.confidence === "medium"
          ? root.confidence
          : "low";
      return {
        rootCauseId: identifier(root.rootCauseId, `root-cause-${index + 1}`),
        label: textValue(root.label, `근본 원인 후보 ${index + 1}`, 240),
        rationale: textValue(root.rationale, "현재 독립 시도에서 추정한 후보입니다.", 800),
        confidence,
        evidenceRefIds: stringArray(root.evidenceRefIds, 12, 120),
        conceptIds: stringArray(root.conceptIds, 8, 120),
        state: "candidate",
      };
    })
    .slice(0, 6);

  const rawVariant = isRecord(value.variant) ? value.variant : {};
  const variantGraph = isRecord(rawVariant.calculationGraph)
    ? rawVariant.calculationGraph
    : {};
  const variantNodes = (Array.isArray(variantGraph.nodes) ? variantGraph.nodes : [])
    .map(normalizeCalculationNode)
    .filter((node): node is OwnerAlphaCalculationNode => Boolean(node))
    .slice(0, 20);

  return {
    reference: {
      referenceId,
      label: OWNER_ALPHA_AI_REFERENCE_LABEL,
      disclaimer: OWNER_ALPHA_AI_REFERENCE_DISCLAIMER,
      modelProfileId: input.modelProfileId,
      promptVersion: "owner-alpha-practice-reference.v1",
      schemaVersion: "owner-alpha-practice-reference.v0",
      generatedAt: input.generatedAt,
      hints,
      l1: {
        title:
          subject === "appraisal_practical"
            ? "L1 · 방법과 답안 뼈대"
            : subject === "appraisal_theory"
              ? "L1 · 쟁점과 목차"
              : "L1 · 쟁점과 법적 근거 후보",
        sections: normalizeSections(rawReference.l1, "L1 회상 뼈대"),
      },
      l2: {
        title:
          subject === "appraisal_practical"
            ? "L2 · 계산·답안 경로"
            : subject === "appraisal_theory"
              ? "L2 · 논증 지도"
              : "L2 · 요건·포섭 구조",
        sections: normalizeSections(rawReference.l2, "L2 학습 답안"),
      },
      l3: {
        title: "L3 · 전체 구조화 학습 기준안",
        sections: normalizeSections(rawReference.l3, "L3 개념 주석"),
      },
      claims,
      calculationGraph: { nodes },
      ...(explanationLadder ? { explanationLadder } : {}),
      releaseStatus: "released",
      blockerCodes: [],
    },
    biggestGap,
    misconceptionGraph: {
      graphId: identifier(rawMisconception.graphId, `${input.sessionId}-misconception`),
      nodes: misconceptionNodes,
      edges: misconceptionEdges,
    },
    rootCauseCandidates:
      roots.length > 0
        ? roots
        : [
            {
              rootCauseId: `${input.sessionId}-root-unresolved`,
              label: "근본 원인 확인 필요",
              rationale: "현재 자료만으로 근본 원인을 확정하지 않습니다.",
              confidence: "low",
              evidenceRefIds: [],
              conceptIds,
              state: "candidate",
            },
          ],
    variant: {
      variantId: identifier(rawVariant.variantId, `${input.sessionId}-variant-1`),
      kind: rawVariant.kind === "numeric" ? "numeric" : "condition",
      changedOneThing: textValue(
        rawVariant.changedOneThing,
        "핵심 조건 하나를 반대로 바꿈",
        300,
      ),
      prompt: textValue(
        rawVariant.prompt,
        "핵심 조건 하나가 달라질 때 적용 방법과 계산 순서가 어떻게 바뀌는지 설명하세요.",
        1_200,
      ),
      verificationState: variantNodes.length > 0 ? "ai_inference" : "unresolved_needs_review",
      calculationGraph: { nodes: variantNodes },
    },
  };
}

function parseJson(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new OwnerAlphaProviderError("invalid_output");
  }
}

function classifyProviderError(error: unknown) {
  if (error instanceof OwnerAlphaProviderError) return error;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("timeout") || message.includes("aborted")) {
    return new OwnerAlphaProviderError("timeout");
  }
  if (message.includes("quota") || message.includes("429") || message.includes("resource_exhausted")) {
    return new OwnerAlphaProviderError("quota");
  }
  return new OwnerAlphaProviderError("unavailable");
}

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new OwnerAlphaProviderError("timeout")),
          PROVIDER_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function modelProfileId() {
  return process.env.OWNER_ALPHA_PRACTICE_MODEL ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
}

function createModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new OwnerAlphaProviderError("unavailable");
  return new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: modelProfileId(),
  });
}

export class GeminiOwnerAlphaPracticeProvider
  implements OwnerAlphaPracticeProviderPort
{
  async extractProblem(input: {
    problemText: string;
    files: OwnerAlphaProviderFile[];
    subject: OwnerAlphaPracticeSubject;
  }) {
    try {
      const response = await withTimeout(
        createModel().generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: [
                    `${ownerAlphaSubjectLabel(input.subject)} 연습문제의 원문을 OCR·정리한다.`,
                    "문제, 제시 자료, 표, 수치, 단위, 날짜, 요구사항을 빠뜨리지 않는다.",
                    "풀이·정답·추론을 추가하지 않는다.",
                    "JSON만 출력: {\"extractedText\":\"...\"}",
                    `사용자 입력 텍스트:\n${input.problemText.slice(0, MAX_TEXT_LENGTH) || "[없음]"}`,
                  ].join("\n"),
                },
                ...input.files.map((file) => ({
                  inlineData: {
                    data: Buffer.from(file.bytes).toString("base64"),
                    mimeType: file.mimeType,
                  },
                })),
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      );
      const parsed = parseJson(response.response.text());
      if (!isRecord(parsed)) throw new OwnerAlphaProviderError("invalid_output");
      const extractedText = textValue(parsed.extractedText, "", MAX_TEXT_LENGTH);
      if (!extractedText) throw new OwnerAlphaProviderError("invalid_output");
      return { extractedText, modelProfileId: modelProfileId() };
    } catch (error) {
      throw classifyProviderError(error);
    }
  }

  async generateReference(input: {
    sessionId: string;
    problemText: string;
    problemModel: OwnerAlphaPracticeProblemModel;
    independentAttempt: string;
    questionText: string | null;
    checkQuestionIds: string[];
    generatedAt: string;
  }) {
    try {
      const subjectAdapter = input.problemModel.subjectAdapter;
      const explanationLadderInstructions = subjectAdapter
        ? [
            `reference.explanationLadder는 ${OWNER_ALPHA_EXPLANATION_LADDER_CONTRACT_VERSION}이며 기존 L1/L2/L3를 가리키는 metadata-only projection이다.`,
            `explanationLadder.blocks는 이 순서의 정확히 네 개만 쓴다: ${ownerAlphaExpectedExplanationBlocks(subjectAdapter.subject).join(", ")}.`,
            "각 block은 blockType, level(l1/l2/l3), sectionIndex(0부터), 기존 reference.claims의 claimIds, 해당 시 기존 calculationNodeIds, 기존 checkQuestionId 또는 null만 담는다.",
            "explanationLadder에 L1/L2/L3 body, 문제, 답안, 새 원문, releaseStatus를 복사하지 않는다. 공개 여부는 부모 reference.releaseStatus만 따른다.",
            `허용 checkQuestionId: ${JSON.stringify(input.checkQuestionIds)}`,
          ]
        : [
            "subjectAdapter가 없는 기존 v0 세션이므로 reference.explanationLadder를 출력하지 않는다.",
          ];
      const explanationLadderOutputShape = subjectAdapter
        ? ",explanationLadder{contractVersion,parentReferenceId,subject,blocks[]}"
        : "";
      const response = await withTimeout(
        createModel().generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: [
                    `너는 ${ownerAlphaSubjectLabel(input.problemModel.subjectAdapter?.subject ?? "appraisal_practical")} 학습 코치다. 모든 출력은 한국어 JSON이다.`,
                    `표시는 반드시 '${OWNER_ALPHA_AI_REFERENCE_LABEL}'이며 공식 정답·확정 채점기준·합격 보장이 아니다.`,
                    "제3자 답안은 전제하지 않는다. 독립 시도와 문제 문언을 비교해 학습용 기준안을 만든다.",
                    "L1/L2/L3의 역할은 전달된 subject adapter 계약을 따르며 모두 AI 학습용 기준안이다.",
                    ...explanationLadderInstructions,
                    ...ownerAlphaSubjectProviderInstructions(input.problemModel),
                    "method choice나 핵심 개념이 불확실하면 단정하지 말고 state=unresolved_needs_review, resolutionCode=multiple_reasonable_approaches로 둔다.",
                    "claim state는 ai_inference 또는 unresolved_needs_review만 출력한다. 공식 출처를 꾸며내지 않는다.",
                    "계산은 지원 primitive만 구조화한다: expression_order, sum, subtraction, ratio, percentage_direction, unit_conversion, elapsed_period, rounding, significant_digits, area_times_unit_price, allocation, residual, index_ratio, present_value, annuity_factor, capitalization, remaining_life_ratio.",
                    "calculation node에는 primitive 입력값과 claimedResult를 모두 넣는다. 검증 불가능한 계산은 node로 만들지 않고 claim을 unresolved로 둔다.",
                    "가장 큰 간극은 정확히 하나만 고른다. 오개념 그래프와 근본 원인 후보는 관찰 근거가 있을 때만 suspected/observed로 둔다.",
                    "변형은 숫자 또는 조건 딱 하나만 바꾼다.",
                    `출력 키: reference{referenceId,hints[{hintId,level,text}],l1[],l2[],l3[],claims[],calculationGraph{nodes[]}${explanationLadderOutputShape}}, biggestGap{gapType 포함}, misconceptionGraph{nodes[],edges[]}, rootCauseCandidates[], variant.`,
                    `문제 원문:\n${input.problemText.slice(0, MAX_TEXT_LENGTH)}`,
                    `구조화 모델:\n${JSON.stringify(input.problemModel)}`,
                    `학습자 독립 시도:\n${input.independentAttempt.slice(0, 12_000)}`,
                    `현재 질문:\n${input.questionText?.slice(0, 2_000) || "[없음]"}`,
                  ].join("\n"),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      );
      return normalizeReferenceDraft(parseJson(response.response.text()), {
        sessionId: input.sessionId,
        generatedAt: input.generatedAt,
        modelProfileId: modelProfileId(),
        problemModel: input.problemModel,
      });
    } catch (error) {
      throw classifyProviderError(error);
    }
  }
}

export const ownerAlphaPracticeProvider = new GeminiOwnerAlphaPracticeProvider();

export const ownerAlphaProviderTestUtils = {
  normalizeReferenceDraft,
};

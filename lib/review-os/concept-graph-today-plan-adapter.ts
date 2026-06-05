import {
  rankConceptGraphNodesForToday,
  type PersonalConceptNode,
  type PersonalConceptTodayContext,
  type PersonalConceptTodayRecommendation,
} from "./personal-concept-graph";

export type ConceptGraphTodayPlanContext = PersonalConceptTodayContext;

export type ConceptGraphTodayPlanAction = PersonalConceptTodayRecommendation & {
  source: "personal_concept_graph";
  estimatedMinutes: number;
  metadataOnly: true;
};

const FORBIDDEN_RAW_FIELD_PATTERN = /(raw|ocr|answer|problem|question|copyright|fulltext|sourceText|userText|originalText)/i;
const FORBIDDEN_COPY_PATTERNS = [/공식\s*채점/, /공식\s*점수\s*예측/, /공식\s*모범\s*답안/, /official\s+grading/i, /official\s+score/i, /official\s+model\s+answer/i];

function assertNoRawFields(value: unknown, path = "input"): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoRawFields(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_RAW_FIELD_PATTERN.test(key)) {
      throw new Error(`Raw text field is not accepted by Concept Graph Today Plan adapter: ${path}.${key}`);
    }
    assertNoRawFields(nested, `${path}.${key}`);
  }
}

function assertNoOfficialClaims(value: unknown): void {
  if (typeof value === "string") {
    const forbidden = FORBIDDEN_COPY_PATTERNS.find((pattern) => pattern.test(value));
    if (forbidden) throw new Error(`Official grading/score/model-answer claim is not accepted in Concept Graph Today Plan: ${String(forbidden)}`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach(assertNoOfficialClaims);
    return;
  }
  Object.values(value as Record<string, unknown>).forEach(assertNoOfficialClaims);
}

function estimateMinutes(taskType: string) {
  if (taskType === "rewrite") return 15;
  if (taskType === "CASIO" || taskType === "accounting template") return 12;
  return 10;
}

export function buildTodayPlanFromConceptGraphNodes(nodes: PersonalConceptNode[], context: ConceptGraphTodayPlanContext = {}): ConceptGraphTodayPlanAction[] {
  assertNoRawFields({ nodes, context });
  const actions = rankConceptGraphNodesForToday(nodes, context)
    .slice(0, 3)
    .map((recommendation) => {
      const action: ConceptGraphTodayPlanAction = {
        ...recommendation,
        source: "personal_concept_graph",
        estimatedMinutes: estimateMinutes(recommendation.taskType),
        metadataOnly: true,
      };
      assertNoRawFields(action);
      assertNoOfficialClaims(action);
      return action;
    });

  assertNoOfficialClaims(actions);
  return actions;
}

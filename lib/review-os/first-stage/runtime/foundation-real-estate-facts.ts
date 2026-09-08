import crypto from "node:crypto";
import { exactObject, requiredIdentifier } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { applicabilityFailure as fail, requireSame as same, requiredHash, type FoundationEvidence } from "./foundation-applicability";
import { releaseContext, rows, sourcePair, type Row } from "./foundation-release-rights";

// Closed consumption projection inside the EXISTING server-installed snapshot.
// This code cannot issue or install it. A specific subject reviewer binds the
// exact source/question/choice bytes; generic six-check approval is insufficient.
export const REAL_ESTATE_PROJECTION_FIELDS = ("receipt_id receipt_version receipt_sha256 item_id item_version subject_id exam_date " +
  "question_body_sha256 choice_texts_sha256 concept_binding_digest source_anchor_ids source_post_rights_receipt_reference " +
  "source_asset_rights_receipt_reference concept_or_null calculation_or_null reviewer reviewed_at decision").split(" ");
export const REAL_ESTATE_METHOD = Object.freeze({ method: "foundation-real-estate-bound-subject-projection", version: "1",
  examDate: "2026-04-04", canonicalization: "RFC8785", arithmetic: "bounded-exact-rational-binary-expression-v1",
  rounding: ["none", "half_up", "toward_zero"], unitBases: ["COUNT", "KRW", "M", "YEAR"] });
const sha = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
type Rational = { n: bigint; d: bigint };
type Quantity = Rational & { unit: Record<string, number> };
function rational(n: bigint, d = BigInt(1)): Rational {
  if (d === BigInt(0) || n.toString().length > 180 || d.toString().length > 180) fail();
  if (d < BigInt(0)) { n = -n; d = -d; }
  let a = n < BigInt(0) ? -n : n, b = d;
  while (b !== BigInt(0)) { const next = a % b; a = b; b = next; }
  return { n: n / a, d: d / a };
}
function decimal(value: unknown): Rational {
  if (typeof value !== "string" || !/^-?(?:0|[1-9]\d{0,37})(?:\.\d{1,12})?$/u.test(value)) fail();
  const scale = value.split(".")[1]?.length ?? 0;
  return rational(BigInt(value.replace(".", "")), BigInt(10) ** BigInt(scale));
}
function unitText(value: Record<string, number>) {
  return Object.entries(value).filter(([, power]) => power !== 0).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([name, power]) => power === 1 ? name : `${name}^${power}`).join("*") || "1";
}
function unit(value: unknown): Record<string, number> {
  if (value === "1") return {};
  if (typeof value !== "string" || value.length > 100) fail();
  const result: Record<string, number> = {};
  for (const part of value.split("*")) {
    const match = /^(COUNT|KRW|M|YEAR)(?:\^(-?[1-9]\d?))?$/u.exec(part); if (!match) fail();
    if (Object.hasOwn(result, match[1])) fail();
    result[match[1]] = Number(match[2] ?? 1);
    if (Math.abs(result[match[1]]) > 12) fail();
  }
  if (unitText(result) !== value) fail(); return result;
}
function printed(value: Rational, rounding: unknown): string {
  const rule = exactObject(rounding, ["mode", "decimal_places"]);
  if (!REAL_ESTATE_METHOD.rounding.includes(String(rule.mode))) fail();
  let scale = rule.decimal_places;
  if (rule.mode === "none") {
    if (scale !== null) fail();
    let denominator = value.d, twos = 0, fives = 0;
    while (denominator % BigInt(2) === BigInt(0)) { denominator /= BigInt(2); twos++; }
    while (denominator % BigInt(5) === BigInt(0)) { denominator /= BigInt(5); fives++; }
    if (denominator !== BigInt(1)) fail(); scale = Math.max(twos, fives);
  }
  if (!Number.isSafeInteger(scale) || Number(scale) < 0 || Number(scale) > 12) fail();
  const digits = Number(scale), magnitude = (value.n < BigInt(0) ? -value.n : value.n) * BigInt(10) ** BigInt(digits);
  let rounded = magnitude / value.d;
  if (rule.mode === "half_up" && (magnitude % value.d) * BigInt(2) >= value.d) rounded++;
  const text = rounded.toString().padStart(digits + 1, "0");
  const body = digits ? `${text.slice(0, -digits)}.${text.slice(-digits)}`.replace(/\.?0+$/u, "") : text;
  return value.n < BigInt(0) && rounded !== BigInt(0) ? `-${body}` : body;
}
function quantity(value: unknown): Quantity {
  const row = exactObject(value, ["decimal", "unit"]), number = decimal(row.decimal);
  if (printed(number, { mode: "none", decimal_places: null }) !== row.decimal) fail();
  return { ...number, unit: unit(row.unit) };
}
function calculate(expression: unknown, inputs: Map<string, Quantity>, used: Set<string>, counter = { count: 0 }, depth = 0, allowBounds = false): Quantity {
  if (++counter.count > 80 || depth > 12) fail();
  if (typeof expression === "string") {
    const input = inputs.get(requiredIdentifier(expression)); if (!input) fail(); used.add(expression); return input;
  }
  const row = exactObject(expression, ["operator", "operands"]);
  if (!["add", "subtract", "multiply", "divide", ...(allowBounds ? ["minimum", "maximum", "select_greater"] : [])].includes(String(row.operator))) fail();
  const count = row.operator === "select_greater" ? 4 : 2;
  const operands = rows(row.operands, count, count).map(value => calculate(value, inputs, used, counter, depth + 1, allowBounds));
  const [a, b] = operands;
  if (["minimum", "maximum", "select_greater"].includes(String(row.operator))) {
    same(unitText(a.unit), unitText(b.unit));
    const greater = a.n * b.d > b.n * a.d;
    if (row.operator === "select_greater") {
      same(unitText(operands[2].unit), unitText(operands[3].unit));
      return greater ? operands[2] : operands[3];
    }
    return (row.operator === "maximum" ? greater : !greater) ? a : b;
  }
  let number: Rational, dimensions = { ...a.unit };
  if (row.operator === "add" || row.operator === "subtract") {
    same(unitText(a.unit), unitText(b.unit));
    number = rational(a.n * b.d + (row.operator === "add" ? BigInt(1) : -BigInt(1)) * b.n * a.d, a.d * b.d);
  } else {
    const divide = row.operator === "divide";
    number = divide ? rational(a.n * b.d, a.d * b.n) : rational(a.n * b.n, a.d * b.d);
    for (const [key, power] of Object.entries(b.unit)) dimensions[key] = (dimensions[key] ?? 0) + (divide ? -power : power);
    dimensions = unit(unitText(dimensions));
  }
  return { ...number, unit: dimensions };
}

/** Reuse the existing bounded exact arithmetic. Default behavior remains the
 * four-operator real-estate contract. Only the economics caller opts into closed
 * boundary/corner comparisons; there is no eval, external call or client input. */
export function evaluateReviewedArithmetic(value: unknown, allowBounds = false) {
  const calculation = exactObject(value, ["canonical_formula_expression", "ordered_input_values_and_units", "declared_rounding_rule"]);
  if (typeof calculation.canonical_formula_expression !== "string" || calculation.canonical_formula_expression.length > 4000) fail();
  const expression: unknown = JSON.parse(calculation.canonical_formula_expression);
  same(calculation.canonical_formula_expression, JSON.stringify(expression));
  const inputRows = rows(calculation.ordered_input_values_and_units, 1, 32).map(value => exactObject(value, ["symbol", "decimal", "unit"]));
  const symbols = inputRows.map(row => requiredIdentifier(row.symbol)); same(symbols, [...new Set(symbols)].sort());
  const inputs = new Map(inputRows.map(row => [String(row.symbol), quantity({ decimal: row.decimal, unit: row.unit })]));
  const used = new Set<string>(), result = calculate(expression, inputs, used, { count: 0 }, 0, allowBounds);
  if (used.size !== inputs.size) fail();
  return { formula: calculation.canonical_formula_expression, inputRows, rounding: calculation.declared_rounding_rule,
    result: { decimal: printed(result, calculation.declared_rounding_rule), unit: unitText(result.unit) } };
}
export function compareReviewedQuantities(left: unknown, right: unknown, comparison: unknown) {
  const a = quantity(left), b = quantity(right); same(unitText(a.unit), unitText(b.unit));
  const delta = a.n * b.d - b.n * a.d;
  switch (comparison) {
    case "equal": return delta === BigInt(0);
    case "not_equal": return delta !== BigInt(0);
    case "less": return delta < BigInt(0);
    case "less_or_equal": return delta <= BigInt(0);
    case "greater": return delta > BigInt(0);
    case "greater_or_equal": return delta >= BigInt(0);
    default: return fail();
  }
}
function anchors(value: unknown, allowed: readonly string[]) {
  const result = rows(value, 1, 100).map(value => requiredIdentifier(value));
  same(result, [...new Set(result)].sort());
  if (result.some(value => !allowed.includes(value))) fail(); return result;
}
function choiceRows(value: unknown, fields: string[], question: Row) {
  const texts = rows(question.choices, 5, 5);
  return rows(value, 5, 5).map((value, index) => {
    const row = exactObject(value, fields);
    same(row.position_1_to_5, index + 1); same(row.choice_text_sha256, sha(String(texts[index]))); return row;
  });
}

export function realEstateFacts(evidence: FoundationEvidence, projectionReference: unknown, question: Row, choices: readonly unknown[]) {
  const projection = evidence.resolve(projectionReference, REAL_ESTATE_PROJECTION_FIELDS), ref = question.reference as Row;
  same(projection.item_id, ref.questionId); same(projection.item_version, ref.questionVersion);
  if (projection.subject_id !== "real_estate_principles" || ref.subjectId !== projection.subject_id ||
    projection.exam_date !== REAL_ESTATE_METHOD.examDate) fail();
  same(requiredHash(projection.question_body_sha256), sha(JSON.stringify({ stem: question.stem, choices: question.choices })));
  same(requiredHash(projection.choice_texts_sha256), digest(question.choices)); same(projection.concept_binding_digest, digest(question.concept));
  const expectedAnchors = [...new Set(choices.flatMap(value => rows((value as Row).source_anchor_ids).map(value => requiredIdentifier(value))))].sort();
  same(projection.source_anchor_ids, expectedAnchors);
  evidence.reviewer(projection, "named_owner_authorized_human_subject_reviewer", "verified_exact_subject_source_projection");
  const source = sourcePair(releaseContext(evidence, projection), projection.source_post_rights_receipt_reference, projection.source_asset_rights_receipt_reference);
  evidence.reviewer(projection, "named_owner_authorized_human_subject_reviewer", "verified_exact_subject_source_projection", source.asset.row.reviewed_at);
  const values = new Map<string, { features: Row; facts: Row | null; assertions: Row | null }>();
  const conceptId = "real_estate_source_grounded_concept_check", calculationId = "real_estate_calculation_check";
  values.set(conceptId, { features: { concept_claim_task_present: projection.concept_or_null !== null }, facts: null, assertions: null });
  values.set(calculationId, { features: { calculation_or_formula_present: projection.calculation_or_null !== null }, facts: null, assertions: null });
  if (projection.concept_or_null === null && projection.calculation_or_null === null) fail();
  if (projection.concept_or_null !== null) {
    const concept = exactObject(projection.concept_or_null, ["selection_rule", "canonical_concept_relations", "ordered_choice_claims"]);
    if (!["true_statement", "false_statement"].includes(String(concept.selection_rule))) fail();
    const relations = rows(concept.canonical_concept_relations, 1, 100).map(value => {
      const row = exactObject(value, ["relation_id", "subject", "predicate", "object", "holds", "source_anchor_ids"]);
      for (const key of ["relation_id", "subject", "predicate", "object"]) requiredIdentifier(row[key]);
      if (typeof row.holds !== "boolean") fail(); anchors(row.source_anchor_ids, expectedAnchors); return row;
    });
    const relationIds = relations.map(row => row.relation_id);
    same(relationIds, [...new Set(relationIds)].sort());
    if (new Set(relations.map(row => digest([row.subject, row.predicate, row.object]))).size !== relations.length) fail();
    const claims = choiceRows(concept.ordered_choice_claims, ["position_1_to_5", "choice_text_sha256", "relation_id", "asserted_holds"], question);
    const correct: number[] = [], contradictions: Row[] = [], used = new Set<unknown>();
    for (const [index, claim] of claims.entries()) {
      const relation = relations.find(row => row.relation_id === claim.relation_id);
      if (!relation || typeof claim.asserted_holds !== "boolean") fail(); used.add(relation.relation_id);
      same((choices[index] as Row).source_anchor_ids, relation.source_anchor_ids);
      if ((claim.asserted_holds === relation.holds) === (concept.selection_rule === "true_statement")) correct.push(index + 1);
      else contradictions.push({ position_1_to_5: index + 1, evidence_references: [projectionReference], evidence_references_digest: digest([projectionReference]) });
    }
    if (used.size !== relations.length) fail(); same(correct, [question.correctChoice]);
    values.set(conceptId, { features: { concept_claim_task_present: true }, facts: { source_anchor_ids: expectedAnchors,
      canonical_concept_relations: relations, ordered_choice_claims: claims, distractor_contradiction_evidence: contradictions },
    assertions: { source_anchor_set_exact: expectedAnchors, concept_relation_exact: relations, distractor_contradiction_check_complete: contradictions.length === 4 } });
  }
  if (projection.calculation_or_null !== null) {
    const calculation = exactObject(projection.calculation_or_null, ["canonical_formula_expression", "ordered_input_values_and_units", "declared_rounding_rule", "ordered_choice_values"]);
    const evaluated = evaluateReviewedArithmetic({ canonical_formula_expression: calculation.canonical_formula_expression,
      ordered_input_values_and_units: calculation.ordered_input_values_and_units, declared_rounding_rule: calculation.declared_rounding_rule });
    const inputRows = evaluated.inputRows, expected = evaluated.result;
    const choices = choiceRows(calculation.ordered_choice_values, ["position_1_to_5", "choice_text_sha256", "decimal", "unit"], question);
    const correct = choices.flatMap((row, index) => {
      quantity({ decimal: row.decimal, unit: row.unit }); return row.decimal === expected.decimal && row.unit === expected.unit ? [index + 1] : [];
    });
    same(correct, [question.correctChoice]);
    values.set(calculationId, { features: { calculation_or_formula_present: true }, facts: {
      canonical_formula_expression: calculation.canonical_formula_expression, ordered_input_values_and_units: inputRows,
      declared_rounding_rule: calculation.declared_rounding_rule, expected_result_and_unit: expected },
    assertions: { formula_identity_exact: calculation.canonical_formula_expression, substitution_exact: expected.decimal, result_and_unit_exact: expected } });
  }
  return { projection, values };
}

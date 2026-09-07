import crypto from "node:crypto";
import { exactObject, requiredIdentifier } from "../kernel/domain";
import { privateSessionDigest as digest } from "./session-service";
import { applicabilityFailure as fail, requireSame as same, requiredHash, type FoundationEvidence } from "./foundation-applicability";
import { rows, sourcePair, releaseContext, type Row } from "./foundation-release-rights";
import { evaluateReviewedArithmetic, compareReviewedQuantities } from "./foundation-real-estate-facts";
import { ECONOMICS_R3_PROFILE } from "./foundation-official-profile";

// An exact subject-reviewed source projection inside the EXISTING installation,
// not an issuer or an assertion supplied by the learner/private content file.
export const ECONOMICS_PROJECTION_FIELDS = ("receipt_id receipt_version receipt_sha256 item_id item_version subject_id exam_date " +
  "question_body_sha256 choice_texts_sha256 concept_binding_digest source_anchor_ids source_post_rights_receipt_reference " +
  "source_asset_rights_receipt_reference formula graph_or_null reviewer reviewed_at decision").split(" ");
export const ECONOMICS_METHOD = Object.freeze({ method: "foundation-economics-bound-subject-projection", version: "1",
  examDate: ECONOMICS_R3_PROFILE.examDate, canonicalization: "RFC8785", arithmetic: "bounded-exact-rational-binary-and-corner-comparison-v1",
  operations: ["add", "subtract", "multiply", "divide", "minimum", "maximum", "select_greater"],
  rounding: ["none", "half_up", "toward_zero"], unitBases: ["COUNT", "KRW", "M", "YEAR"],
  conversions: "canonical-input-units-only-identity-rational", graph: "reviewed-absence-only", choiceSemantics: "five-bound-quantity-comparisons" });
const sha = (value: string) => crypto.createHash("sha256").update(value, "utf8").digest("hex");

export function economicsFacts(evidence: FoundationEvidence, projectionReference: unknown, question: Row, choices: readonly unknown[]) {
  const projection = evidence.resolve(projectionReference, ECONOMICS_PROJECTION_FIELDS), ref = question.reference as Row;
  same(projection.item_id, ref.questionId); same(projection.item_version, ref.questionVersion);
  if (projection.subject_id !== "economics_principles" || ref.subjectId !== projection.subject_id ||
    projection.exam_date !== ECONOMICS_METHOD.examDate || ref.examYear !== 2025 || ref.examRound !== 36) fail();
  same(requiredHash(projection.question_body_sha256), sha(JSON.stringify({ stem: question.stem, choices: question.choices })));
  same(requiredHash(projection.choice_texts_sha256), digest(question.choices)); same(projection.concept_binding_digest, digest(question.concept));
  const anchors = [...new Set(choices.flatMap(value => rows((value as Row).source_anchor_ids).map(value => requiredIdentifier(value))))].sort();
  same(projection.source_anchor_ids, anchors);
  evidence.reviewer(projection, "named_owner_authorized_human_subject_reviewer", "verified_exact_subject_source_projection");
  const source = sourcePair(releaseContext(evidence, projection), projection.source_post_rights_receipt_reference, projection.source_asset_rights_receipt_reference);
  evidence.reviewer(projection, "named_owner_authorized_human_subject_reviewer", "verified_exact_subject_source_projection", source.asset.row.reviewed_at);
  // Graph interpretation is unsupported in this small consumer. Only exact
  // separately reviewed absence is supported, never an input 'not applicable'.
  if (projection.graph_or_null !== null) fail();
  const formula = exactObject(projection.formula, ["canonical_formula_expression", "ordered_input_values_and_units", "declared_rounding_rule", "ordered_choice_comparisons"]);
  const evaluated = evaluateReviewedArithmetic({ canonical_formula_expression: formula.canonical_formula_expression,
    ordered_input_values_and_units: formula.ordered_input_values_and_units, declared_rounding_rule: formula.declared_rounding_rule }, true);
  const texts = rows(question.choices, 5, 5), correct: number[] = [];
  rows(formula.ordered_choice_comparisons, 5, 5).forEach((value, index) => {
    const claim = exactObject(value, ["position_1_to_5", "choice_text_sha256", "comparison", "quantity", "source_anchor_ids"]);
    same(claim.position_1_to_5, index + 1); same(claim.choice_text_sha256, sha(String(texts[index])));
    same(claim.source_anchor_ids, (choices[index] as Row).source_anchor_ids);
    if (compareReviewedQuantities(evaluated.result, claim.quantity, claim.comparison)) correct.push(index + 1);
  });
  same(correct, [question.correctChoice]);
  const units = evaluated.inputRows.map(row => row.unit);
  const dimensioned = units.some(unit => unit !== "1") || evaluated.result.unit !== "1";
  // Inputs are already canonical, with no implicit kilo/percent conversion.
  // Unknown unit names fail in the shared arithmetic instead of assuming a scale.
  const factors = evaluated.inputRows.map(row => ({ input_symbol: row.symbol, from_unit: row.unit, to_unit: row.unit, numerator: "1", denominator: "1" }));
  const values = new Map<string, { features: Row; facts: Row | null; assertions: Row | null }>();
  values.set("economics_formula_check", { features: { calculation_or_formula_present: true }, facts: {
    source_anchor_ids: anchors, canonical_formula_expression: evaluated.formula, ordered_input_values_and_units: evaluated.inputRows,
    declared_rounding_rule: evaluated.rounding, expected_result_and_unit: evaluated.result },
  assertions: { formula_identity_exact: evaluated.formula, substitution_exact: evaluated.result.decimal, result_exact_after_declared_rounding: evaluated.result.decimal } });
  values.set("economics_graph_check", { features: { graph_present: false }, facts: null, assertions: null });
  values.set("economics_unit_check", { features: { dimensioned_values_present: dimensioned },
    facts: dimensioned ? { ordered_input_units: units, ordered_conversion_factors: factors, expected_result_unit: evaluated.result.unit } : null,
    assertions: dimensioned ? { input_units_declared: [...new Set(units)].sort(), conversion_factors_exact: factors, result_unit_exact: evaluated.result.unit } : null });
  return { projection, values };
}

import { exactObject, FirstStageKernelError, type ChoiceId } from "../kernel/domain";
import { ownerContentBundle } from "./owner-content-registration.mjs";
import { marketCalculation } from "./owner-market-calculation";
import { evaluateReviewedArithmetic } from "./foundation-real-estate-facts";

const fail = (): never => { throw new FirstStageKernelError("adapter_mismatch"); };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const equilibriumConditions = ["positive_slopes", "positive_clearing_equilibria", "fixed_other_coefficients", "parallel_intercept_changes", "delta_a_positive"];
const rules = {
  fixed_demand_price_change: { conditions: ["fixed_a_b", "b_positive", "price_increases", "positive_demand"], conclusion: "same_demand_curve_quantity_decreases", relation: "deltaQd=-b*deltaP<0; fixed demand only, no clearing assumption" },
  positive_demand_intercept_shift: { conditions: [...equilibriumConditions, "delta_c_zero"], conclusion: "demand_right_fixed_supply_price_quantity_increase", relation: "deltaP=deltaA/(b+d)>0; deltaQ=d*deltaA/(b+d)>0" },
  both_intercepts_increase: { conditions: [...equilibriumConditions, "delta_c_positive"], conclusion: "price_indeterminate_quantity_increases", relation: "deltaP=(deltaA-deltaC)/(b+d); deltaQ=(d*deltaA+b*deltaC)/(b+d)>0" },
  demand_increases_supply_decreases: { conditions: [...equilibriumConditions, "delta_c_negative"], conclusion: "price_increases_quantity_indeterminate", relation: "deltaP=(deltaA-deltaC)/(b+d)>0; deltaQ=(d*deltaA+b*deltaC)/(b+d)" },
} as const;
type Pattern = keyof typeof rules;
const op = (operator: string, ...operands: unknown[]) => ({ operator, operands });
function quantityAt(a: number, price: string) {
  return evaluateReviewedArithmetic({ canonical_formula_expression: JSON.stringify(op("subtract", "a", op("multiply", "b", "p"))),
    ordered_input_values_and_units: [{ symbol: "a", decimal: String(a), unit: "COUNT" }, { symbol: "b", decimal: "1", unit: "COUNT*KRW^-1" }, { symbol: "p", decimal: price, unit: "KRW" }],
    declared_rounding_rule: { mode: "none", decimal_places: null } }).result;
}
function equilibrium(a: number, c: number) {
  const price = marketCalculation("linear_rent_equilibrium", { demandIntercept: String(a), supplyIntercept: String(c), demandSlopePerKrw: "1", supplySlopePerKrw: "1" }).result;
  return { price, quantity: quantityAt(a, price.decimal) };
}
/** Four closed symbolic sign rules, not a text/causality/concept solver.
 * Universal conclusions follow from the stated signs and positive denominator.
 * Numeric witnesses demonstrate each direction of an indeterminate result;
 * they do not substitute finite samples for the universal sign argument. */
export function verifyStatedMarketRelation(value: unknown) {
  const row = exactObject(value, ["pattern", "conditions"]);
  if (typeof row.pattern !== "string" || !Object.hasOwn(rules, row.pattern)) fail();
  const pattern = row.pattern as Pattern, rule = rules[pattern];
  if (!same(row.conditions, rule.conditions)) fail();
  const witnesses = pattern === "fixed_demand_price_change"
    ? [{ before: quantityAt(100, "20"), after: quantityAt(100, "30") }]
    : (pattern === "positive_demand_intercept_shift" ? [[10, 0]] : pattern === "both_intercepts_increase" ? [[20, 10], [10, 10], [10, 20]] : [[20, -10], [10, -10], [10, -20]])
      .map(([deltaA, deltaC]) => ({ deltaA, deltaC, before: equilibrium(100, 30), after: equilibrium(100 + deltaA, 30 + deltaC) }));
  return { schemaVersion: "owner_stated_market_relation_proof.v1", pattern, conditions: [...rule.conditions], conclusion: rule.conclusion, relation: rule.relation, witnesses, scope: "stated_model_only", humanReviewed: false };
}
const text = (value: unknown): string => typeof value === "string" && value.trim().length > 0 && value.length <= 8000 ? value : fail();
export type RelationItem = { id: string; role: string; model: string; prompt: string; choices: { id: ChoiceId; label: string }[]; answerChoice: ChoiceId; explanation: string; choiceFeedback: { choice: ChoiceId; text: string }[] };
/** Schema/domain validation grants no runtime authority. Only the common loader's
 * exact server-approved byte hash admits text and its audited enum binding. */
export function validateRegisteredRelationItems(key: string, value: unknown) {
  const registration = ownerContentBundle(key);
  if (registration?.validator !== "stated_market_relation" || !registration.relationBindings) return fail();
  const packet = exactObject(value, ["schemaVersion", "bundleId", "status", "source", "humanReviewer", "officialExam", "assumptions", "assumptionsApplyTo", "concepts", "items", "verificationLabel", "limits"]);
  if (packet.schemaVersion !== "owner_stated_market_relation_candidate.v1" || packet.bundleId !== registration.version || packet.source !== "independently_authored_stated_model" || packet.humanReviewer !== null || packet.officialExam !== null || !Array.isArray(packet.items) || packet.items.length !== registration.ids.length || !same(packet.assumptionsApplyTo, registration.ids.slice(1))) fail();
  text(packet.assumptions);
  if (!Array.isArray(packet.concepts) || packet.concepts.length !== 2) fail();
  const concepts = (packet.concepts as unknown[]).map(c => { const row = exactObject(c, ["id", "text"]); return { id: text(row.id), text: text(row.text) }; });
  if (!same(concepts.map(c => c.id), ["movement", "joint"])) fail();
  const proofs: ReturnType<typeof verifyStatedMarketRelation>[] = [];
  const items: RelationItem[] = (packet.items as unknown[]).map((value, index) => {
    const row = exactObject(value, ["id", "role", "pair", "model", "prompt", "choices", "answerChoice", "explanation", "choiceReasons", "retryId"]);
    if (row.id !== registration.ids[index] || row.model !== registration.models![index] || row.role !== (index % 2 ? "practice_retry" : "initial") || row.pair !== concepts[Math.floor(index / 2)].id || row.retryId !== (index % 2 ? null : registration.ids[index + 1]) || !Array.isArray(row.choices) || row.choices.length !== 5 || !Array.isArray(row.choiceReasons) || row.choiceReasons.length !== 5) fail();
    const binding = registration.relationBindings![index], proof = verifyStatedMarketRelation({ pattern: row.model, conditions: binding.conditions });
    if (binding.conclusions.length !== 5 || binding.conclusions.filter(c => c === proof.conclusion).length !== 1 || row.answerChoice !== binding.conclusions.indexOf(proof.conclusion) + 1) fail();
    proofs.push(proof);
    const choices = (row.choices as unknown[]).map((c, i) => { const choice = exactObject(c, ["id", "label"]); if (choice.id !== i + 1) fail(); return { id: (i + 1) as ChoiceId, label: text(choice.label) }; });
    return { id: text(row.id), role: text(row.role), model: text(row.model), prompt: text(row.prompt), choices, answerChoice: row.answerChoice as ChoiceId,
      explanation: [text(row.explanation), concepts[Math.floor(index / 2)].text].join("\n\n"), choiceFeedback: (row.choiceReasons as unknown[]).map((reason, i) => ({ choice: (i + 1) as ChoiceId, text: text(reason) })) };
  });
  return { items, proofs };
}

import { evaluateReviewedArithmetic, compareReviewedQuantities } from "./foundation-real-estate-facts";

/** Checks on EXISTING exact-bound AI/code observations, not source interpretation,
 * human approval, or a general economic model. The caller must first validate
 * all nine installed artifacts and original/variant key correspondence. */
export const R3_PAIR_EVIDENCE_POLICY = "owner-local-r3-recorded-model-checks-v1";
const METHOD = "exact_rational_and_independent_objective_or_area_crosscheck";
type Expression = string | { operator: string; operands: Expression[] };
const op = (operator: string, ...operands: Expression[]): Expression => ({ operator, operands });
const calc = (expression: Expression, inputs: Record<string,string>) => evaluateReviewedArithmetic({
  canonical_formula_expression: JSON.stringify(expression),
  ordered_input_values_and_units: Object.entries(inputs).sort(([a],[b])=>a.localeCompare(b)).map(([symbol,decimal])=>({symbol,decimal,unit:"1"})),
  declared_rounding_rule: {mode:"none",decimal_places:null},
}).result.decimal;
const compare = (a: string,b: string,rule: string) => compareReviewedQuantities({decimal:a,unit:"1"},{decimal:b,unit:"1"},rule);
function number(value: unknown): string {
  if (typeof value !== "string" || value.length > 45 || !/^-?\d+(?:\.\d+)?(?:\/[1-9]\d*)?$/u.test(value)) throw new Error("unsupported_recorded_number");
  const [numerator,denominator] = value.split("/");
  return denominator ? calc(op("divide","a","b"),{a:numerator,b:denominator}) : calc("a",{a:numerator});
}
function recordedValues(row: unknown, fields: string[]): Record<string,string> {
  if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("invalid_recorded_model");
  const value = row as Record<string,unknown>;
  if (Object.keys(value).sort().join() !== ["id","method","computedChoice","checksPassed","values","humanReview","runtimeAuthorityGranted"].sort().join() ||
    value.method !== METHOD || value.checksPassed !== true || value.humanReview !== false || value.runtimeAuthorityGranted !== false ||
    !value.values || typeof value.values !== "object" || Array.isArray(value.values) ||
    Object.keys(value.values).sort().join() !== [...fields].sort().join()) throw new Error("invalid_recorded_model");
  return Object.fromEntries(Object.entries(value.values).map(([key,entry])=>[key,number(entry)]));
}
export function supportsR3RecordedPair(questionNumber: number, original: {correctChoice:number; choices:string[]},
  variant: {correctChoice:number; choices:string[]}, results: unknown[]): boolean {
  // 46 retains its already installed exact-evidence path. 52's report proves a
  // symbolic identity but does not independently map all five textual choices;
  // that source/claim gap is pending, not a successful five-pair implementation.
  if (questionNumber === 46) return true;
  if (![49,51,53].includes(questionNumber)) return false;
  try {
    for (const [index,item] of [original,variant].entries()) {
      const id = index === 0 ? `original-${questionNumber}` : `r${questionNumber}`;
      const matched = results.filter(row=>row && typeof row === "object" && (row as {id?:unknown}).id === id);
      if (matched.length !== 1) return false;
      const row = matched[0] as {computedChoice:unknown};
      if (row.computedChoice !== item.correctChoice) return false;
      let target: string;
      if (questionNumber === 49) {
        const v = recordedValues(row,["leader","follower","price","profit","zeroFollowerThreshold","zeroRegimeBestQuantity","zeroRegimeBestProfit","zeroRegimeDerivativeAtBest"]);
        if (!compare(v.leader,"0","greater") || !compare(v.follower,"0","greater") || !compare(v.price,"0","greater") ||
          !compare(v.follower,calc(op("divide",op("subtract","threshold","leader"),"two"),{threshold:v.zeroFollowerThreshold,leader:v.leader,two:"2"}),"equal") ||
          !compare(v.zeroRegimeBestQuantity,v.zeroFollowerThreshold,"equal") || !compare(v.zeroRegimeDerivativeAtBest,"0","less_or_equal") ||
          !compare(v.profit,"0","greater") || !compare(v.profit,v.zeroRegimeBestProfit,"greater")) return false;
        // The fixed r3 models have unit demand slope and separately bound
        // follower marginal costs. Its FOC gives P = MC_f + q_f; neither a
        // positive reported price nor a matching answer choice proves that.
        const followerCost=index===0?"20":"10";
        const price=calc(op("add","cost","follower"),{cost:followerCost,follower:v.follower});
        // Reduced leader objective at the stationary quantity is q_l^2 / 2.
        // In the zero-follower region a-c_l = q_l + threshold/2. Check its
        // objective AND derivative, not merely their favorable signs.
        const profit=calc(op("divide",op("multiply","leader","leader"),"two"),{leader:v.leader,two:"2"});
        const zeroProfit=calc(op("multiply",op("subtract","leader",op("divide","threshold","two")),"threshold"),
          {leader:v.leader,threshold:v.zeroFollowerThreshold,two:"2"});
        const zeroDerivative=calc(op("subtract","leader",op("divide",op("multiply","threshold","three"),"two")),
          {leader:v.leader,threshold:v.zeroFollowerThreshold,three:"3",two:"2"});
        if (!compare(v.price,price,"equal") || !compare(v.profit,profit,"equal") ||
          !compare(v.zeroRegimeBestProfit,zeroProfit,"equal") || !compare(v.zeroRegimeDerivativeAtBest,zeroDerivative,"equal")) return false;
        target=index===0?v.leader:v.price;
      } else if (questionNumber === 51) {
        const v=recordedValues(row,["cartelTotal","follower","deviator","profit"]);
        if (Object.values(v).some(value=>!compare(value,"0","greater")) ||
          !compare(v.cartelTotal,calc(op("multiply","follower","two"),{follower:v.follower,two:"2"}),"equal") ||
          !compare(v.deviator,calc(op("divide",op("multiply","follower","three"),"two"),{follower:v.follower,three:"3",two:"2"}),"equal")) return false;
        // Fixed r3 models: the original and variant have different demand
        // slopes. Recover (intercept - marginal cost) from the cartel optimum,
        // then evaluate the unilateral-deviation objective at its stationary
        // quantity. A positive choice-matching profit alone is not evidence.
        const slope=index===0?"1":"2";
        const netIntercept=calc(op("multiply","two",op("multiply","slope","cartel")),{two:"2",slope,cartel:v.cartelTotal});
        const inputs={netIntercept,slope,qa:v.deviator,qb:v.follower};
        const derivative=calc(op("subtract","netIntercept",op("multiply","slope",op("add",op("multiply","two","qa"),"qb"))),{...inputs,two:"2"});
        const profit=calc(op("multiply",op("subtract","netIntercept",op("multiply","slope",op("add","qa","qb"))),"qa"),inputs);
        if (!compare(derivative,"0","equal") || !compare(v.profit,profit,"equal")) return false;
        target=index===0?v.profit:v.deviator;
      } else {
        const v=recordedValues(row,["marketQuantity","socialQuantity","unitTax","welfareImprovement"]);
        if (Object.values(v).some(value=>!compare(value,"0","greater")) || !compare(v.marketQuantity,v.socialQuantity,"greater")) return false;
        // These ratios describe the fixed r3 recorded models, not universal laws.
        const scaled=calc(op("divide",op("multiply","social","three"),"two"),{social:v.socialQuantity,three:"3",two:"2"});
        const gap=calc(op("subtract","market","social"),{market:v.marketQuantity,social:v.socialQuantity});
        if (!compare(v.marketQuantity,scaled,"equal") || !compare(v.unitTax,scaled,"equal") ||
          !compare(v.welfareImprovement,calc(op("multiply",op("multiply","gap","gap"),"two"),{gap,two:"2"}),"equal")) return false;
        target=index===0?v.welfareImprovement:v.unitTax;
      }
      const choices=item.choices.map(choice=>{
        if (!/^-?(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?$/u.test(choice)) throw new Error("unsupported_numeric_choice");
        return number(choice.replaceAll(",", ""));
      });
      const matching=choices.flatMap((choice,i)=>compare(choice,target,"equal")?[i+1]:[]);
      if (matching.length!==1 || matching[0]!==item.correctChoice) return false;
    }
    return true;
  } catch { return false; }
}

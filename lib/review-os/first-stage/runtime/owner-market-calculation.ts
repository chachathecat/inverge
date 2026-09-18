import { exactObject, FirstStageKernelError } from "../kernel/domain";
import { evaluateReviewedArithmetic, compareReviewedQuantities } from "./foundation-real-estate-facts";
export type MarketModel = "linear_rent_equilibrium" | "demand_intercept_shift" | "midpoint_arc_elasticity" | "midpoint_target_quantity";
const fail=():never=>{throw new FirstStageKernelError("adapter_mismatch");};
const op=(operator:string,...operands:unknown[])=>({operator,operands});
type Inputs=Record<string,[string,string]>;
const quantity=(s:string):[string,string]=>[s,"COUNT"],price=(s:string):[string,string]=>[s,"KRW"],slope=(s:string):[string,string]=>[s,"COUNT*KRW^-1"],ratio=(s:string):[string,string]=>[s,"1"];
function calculate(expression:unknown,values:Inputs) {
  return evaluateReviewedArithmetic({canonical_formula_expression:JSON.stringify(expression),
    ordered_input_values_and_units:Object.entries(values).sort(([a],[b])=>a<b?-1:1).map(([symbol,[decimal,unit]])=>({symbol,decimal,unit})),
    declared_rounding_rule:{mode:"none",decimal_places:null}});
}
/** Only the four exact stated models; no market prediction or general solver. */
export function marketCalculation(model:MarketModel,facts:unknown) {
  const equilibrium=model==="linear_rent_equilibrium",shift=model==="demand_intercept_shift",arc=model==="midpoint_arc_elasticity";
  if(!equilibrium&&!shift&&!arc&&model!=="midpoint_target_quantity")fail();
  const fields=equilibrium||shift?["demandIntercept","supplyIntercept","demandSlopePerKrw","supplySlopePerKrw",...(shift?["targetRent"]:[])]:
    ["oldRent","newRent","oldQuantity",arc?"newQuantity":"targetElasticity"];
  const row=exactObject(facts,fields),f:Record<string,string>={};
  for(const key of fields){const value=typeof row[key]==="string"?row[key]:fail();
    if(key.endsWith("PerKrw")||key==="targetElasticity") {if(!/^(?:0|[1-9]\d{0,8})(?:\.\d{1,8})?$/u.test(value)||Number(value)<=0)fail();}
    else if(!/^[1-9]\d{0,11}$/u.test(value))fail();f[key]=value;
  }
  if(equilibrium||shift){
    if(BigInt(f.demandIntercept)<=BigInt(f.supplyIntercept))fail();
    const inputs={a:quantity(f.demandIntercept),c:quantity(f.supplyIntercept),b:slope(f.demandSlopePerKrw),d:slope(f.supplySlopePerKrw)};
    const initial=calculate(op("divide",op("subtract","a","c"),op("add","b","d")),inputs);
    if(equilibrium)return initial;
    if(!compareReviewedQuantities({decimal:f.targetRent,unit:"KRW"},initial.result,"greater"))fail();
    return calculate(op("subtract",op("add","c",op("multiply",op("add","b","d"),"p")),"a"),{...inputs,p:price(f.targetRent)});
  }
  if(BigInt(f.newRent)<=BigInt(f.oldRent))fail();
  const change=op("divide",op("subtract","p1","p0"),op("divide",op("add","p0","p1"),"two"));
  const inputs={p0:price(f.oldRent),p1:price(f.newRent),two:ratio("2")};
  if(arc){
    if(BigInt(f.newQuantity)>=BigInt(f.oldQuantity))fail();
    return calculate(op("divide",op("divide",op("subtract","q0","q1"),op("divide",op("add","q0","q1"),"two")),change),{...inputs,q0:quantity(f.oldQuantity),q1:quantity(f.newQuantity)});
  }
  const k=calculate(change,inputs).result.decimal;
  const h=calculate(op("multiply","e","k"),{e:ratio(f.targetElasticity),k:ratio(k)}).result;
  if(!compareReviewedQuantities(h,{decimal:"2",unit:"1"},"less"))fail();
  return calculate(op("multiply","q0",op("divide",op("subtract","two","h"),op("add","two","h"))),{q0:quantity(f.oldQuantity),two:ratio("2"),h:ratio(h.decimal)});
}

import { exactObject, FirstStageKernelError } from "../kernel/domain";
import { evaluateReviewedArithmetic } from "./foundation-real-estate-facts";
export type InvestmentModel = "npv_two_years" | "npv_zero_price" | "equity_cash_yield" | "equity_required_income";
const fail=():never=>{throw new FirstStageKernelError("adapter_mismatch");};
const op=(operator:string,...operands:unknown[])=>({operator,operands});
type Inputs=Record<string,[string,string]>;
const money=(s:string):[string,string]=>[s,"KRW"],flow=(s:string):[string,string]=>[s,"KRW*YEAR^-1"];
function calculate(expression:unknown,values:Inputs) {
  return evaluateReviewedArithmetic({canonical_formula_expression:JSON.stringify(expression),
    ordered_input_values_and_units:Object.entries(values).sort(([a],[b])=>a<b?-1:1).map(([symbol,[decimal,unit]])=>({symbol,decimal,unit})),
    declared_rounding_rule:{mode:"none",decimal_places:null}});
}
/** Four closed, stated models; no natural-language interpretation or approval. */
export function investmentCalculation(model:InvestmentModel,facts:unknown) {
  const initial=model==="npv_two_years"||model==="equity_cash_yield";
  const npv=model==="npv_two_years"||model==="npv_zero_price";
  if(!npv && model!=="equity_cash_yield" && model!=="equity_required_income")fail();
  const fields=npv?["end1Income","end2Income","end2Sale","oneYearDiscountRate",...(initial?["initialPrice"]:[])]:
    ["purchasePrice","loanPrincipal","annualInterestRate",initial?"annualNetOperatingIncome":"targetAnnualCashYield"];
  const row=exactObject(facts,fields),f:Record<string,string>={};
  for(const field of fields){
    const value=typeof row[field]==="string"?row[field]:fail();
    if(field.endsWith("Rate")||field==="targetAnnualCashYield") {
      if(!/^0\.[0-9]{1,6}$/u.test(value)||Number(value)<=0||Number(value)>=1)fail();
    }else if(!/^[1-9]\d{0,11}$/u.test(value))fail();
    f[field]=value;
  }
  if(npv){
    // t1/t2 are lump amounts in KRW. The discount is a one-year period ratio.
    const factor=op("add","one","discount");
    const pv=op("add",op("divide","end1",factor),op("divide",op("add","end2","sale"),op("multiply",factor,factor)));
    const values:Inputs={end1:money(f.end1Income),end2:money(f.end2Income),sale:money(f.end2Sale),one:["1","1"],discount:[f.oneYearDiscountRate,"1"]};
    return calculate(initial?op("subtract",pv,"price"):pv,initial?{...values,price:money(f.initialPrice)}:values);
  }
  if(BigInt(f.purchasePrice)<=BigInt(f.loanPrincipal))fail();
  const equity=calculate(op("subtract","purchase","loan"),{purchase:money(f.purchasePrice),loan:money(f.loanPrincipal)}).result.decimal;
  const interest=calculate(op("multiply","loan","rate"),{loan:money(f.loanPrincipal),rate:[f.annualInterestRate,"YEAR^-1"]}).result.decimal;
  return initial?calculate(op("divide",op("subtract","noi","interest"),"equity"),{noi:flow(f.annualNetOperatingIncome),interest:flow(interest),equity:money(equity)}):
    calculate(op("add",op("multiply","target","equity"),"interest"),{target:[f.targetAnnualCashYield,"YEAR^-1"],equity:money(equity),interest:flow(interest)});
}

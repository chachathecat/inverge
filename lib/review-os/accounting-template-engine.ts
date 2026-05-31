import { sanitizeDerivedMetadata } from "./data-boundary";

export const ACCOUNTING_TEMPLATE_IDS = [
  "accounting_ppe_depreciation",
  "accounting_impairment_loss",
  "accounting_bond_payable",
  "accounting_inventory",
  "accounting_cost_volume_profit",
  "economics_elasticity_basic",
] as const;

export type AccountingTemplateId = (typeof ACCOUNTING_TEMPLATE_IDS)[number];
export type AccountingTemplateSubject = "회계학" | "경제학";
export type TemplateInputValue = number | string | boolean | null | undefined;
export type TemplateInput = Record<string, TemplateInputValue>;

export type AccountingParseResult = {
  subject: AccountingTemplateSubject;
  templateId: AccountingTemplateId | null;
  confidence: number;
  extractedInputs: TemplateInput;
  extractedLabels: string[];
  unsupportedReason?: string;
  needsHumanConfirmation: boolean;
};

export type AccountingTemplateCalculation = {
  templateId: AccountingTemplateId;
  displayName: string;
  resultLabel: string;
  resultValue: number;
  unit?: string;
  intermediateValues: Array<{ label: string; value: number | string }>;
  formulaSteps: string[];
  calculationRisk: "none" | "rounding" | "confirmation_required";
  source: "deterministic_template";
};

export type AccountingTemplateDefinition = {
  templateId: AccountingTemplateId;
  displayName: string;
  requiredInputs: string[];
  optionalInputs: string[];
  allowedLabels: string[];
  validationRules: string[];
  renderHints: {
    primaryResultLabel: string;
    collapsedDetailTitle: string;
    inputHelp: string;
  };
  calculate(input: TemplateInput): AccountingTemplateCalculation;
};

export type TemplateValidationResult = {
  ok: boolean;
  missingInputKeys: string[];
  unknownLabels: string[];
  lowConfidenceFlag: boolean;
  calculationRisk: "none" | "missing_input" | "low_confidence" | "unknown_label" | "unsupported_template" | "invalid_input";
  message?: string;
};

const LOW_CONFIDENCE_THRESHOLD = 0.72;

function toNumber(value: TemplateInputValue, key: string): number {
  const numberValue = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(numberValue)) throw new Error(`필수 입력값 ${key}가 숫자가 아닙니다.`);
  return numberValue;
}

function optionalNumber(input: TemplateInput, key: string, fallback: number): number {
  const value = input[key];
  if (value === undefined || value === null || value === "") return fallback;
  return toNumber(value, key);
}

function isFiniteNumericInput(value: TemplateInputValue) {
  const numberValue = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  return Number.isFinite(numberValue);
}

function getFiniteNumericInput(input: TemplateInput, key: string) {
  const value = input[key];
  return isFiniteNumericInput(value) ? Number(value) : null;
}

function resolveInvalidInputKeys(template: AccountingTemplateDefinition, input: TemplateInput) {
  return [...template.requiredInputs, ...template.optionalInputs].filter((key) => {
    const value = input[key];
    if (key === "useMidpoint") return false;
    if (value === undefined || value === null || value === "") return false;
    if (typeof value === "boolean") return false;
    return !isFiniteNumericInput(value);
  });
}

function resolveCalculationInputRisk(template: AccountingTemplateDefinition, input: TemplateInput): TemplateValidationResult["calculationRisk"] {
  const invalidInputKeys = resolveInvalidInputKeys(template, input);
  if (invalidInputKeys.length > 0) return "invalid_input";

  if (template.templateId === "accounting_cost_volume_profit") {
    const sellingPricePerUnit = getFiniteNumericInput(input, "sellingPricePerUnit");
    const variableCostPerUnit = getFiniteNumericInput(input, "variableCostPerUnit");
    if (sellingPricePerUnit === null || variableCostPerUnit === null) return "invalid_input";
    if (sellingPricePerUnit - variableCostPerUnit <= 0) return "invalid_input";
  }

  if (template.templateId === "economics_elasticity_basic") {
    const quantityBefore = getFiniteNumericInput(input, "quantityBefore");
    const quantityAfter = getFiniteNumericInput(input, "quantityAfter");
    const priceBefore = getFiniteNumericInput(input, "priceBefore");
    const priceAfter = getFiniteNumericInput(input, "priceAfter");
    if (quantityBefore === null || quantityAfter === null || priceBefore === null || priceAfter === null) return "invalid_input";
    const useMidpoint = input.useMidpoint === true || input.useMidpoint === "true";
    const quantityBase = useMidpoint ? (quantityBefore + quantityAfter) / 2 : quantityBefore;
    const priceBase = useMidpoint ? (priceBefore + priceAfter) / 2 : priceBefore;
    if (quantityBase === 0 || priceBase === 0 || priceAfter - priceBefore === 0) return "invalid_input";
  }

  return "none";
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function labels(...values: string[]) {
  return values;
}

export const ACCOUNTING_TEMPLATE_REGISTRY: Record<AccountingTemplateId, AccountingTemplateDefinition> = {
  accounting_ppe_depreciation: {
    templateId: "accounting_ppe_depreciation",
    displayName: "유형자산 감가상각",
    requiredInputs: ["cost", "salvageValue", "usefulLifeYears"],
    optionalInputs: ["months", "accumulatedDepreciationBefore"],
    allowedLabels: labels("유형자산", "취득원가", "잔존가치", "내용연수", "감가상각비", "감가상각누계액", "장부금액"),
    validationRules: ["취득원가·잔존가치·내용연수 확인 전 계산 금지", "월할 조건이 있으면 months로 분리"],
    renderHints: {
      primaryResultLabel: "감가상각비",
      collapsedDetailTitle: "감가상각 산식 보기",
      inputHelp: "취득원가, 잔존가치, 내용연수를 먼저 확인합니다.",
    },
    calculate(input) {
      const cost = toNumber(input.cost, "cost");
      const salvageValue = toNumber(input.salvageValue, "salvageValue");
      const usefulLifeYears = toNumber(input.usefulLifeYears, "usefulLifeYears");
      const months = optionalNumber(input, "months", 12);
      const accumulatedBefore = optionalNumber(input, "accumulatedDepreciationBefore", 0);
      const annualDepreciation = (cost - salvageValue) / usefulLifeYears;
      const depreciationExpense = annualDepreciation * (months / 12);
      const endingCarryingAmount = cost - accumulatedBefore - depreciationExpense;
      return {
        templateId: "accounting_ppe_depreciation",
        displayName: "유형자산 감가상각",
        resultLabel: "감가상각비",
        resultValue: round(depreciationExpense),
        unit: "원",
        intermediateValues: [
          { label: "연간 감가상각비", value: round(annualDepreciation) },
          { label: "월할 개월 수", value: months },
          { label: "계산 후 장부금액", value: round(endingCarryingAmount) },
        ],
        formulaSteps: ["(취득원가 - 잔존가치) / 내용연수", "연간 감가상각비 × 월할 개월 수 / 12"],
        calculationRisk: months !== 12 ? "rounding" : "none",
        source: "deterministic_template",
      };
    },
  },
  accounting_impairment_loss: {
    templateId: "accounting_impairment_loss",
    displayName: "손상차손",
    requiredInputs: ["carryingAmount", "recoverableAmount"],
    optionalInputs: [],
    allowedLabels: labels("장부금액", "회수가능액", "사용가치", "순공정가치", "손상차손"),
    validationRules: ["회수가능액은 사용가치와 순공정가치 중 큰 금액", "음수 손상차손은 0으로 처리"],
    renderHints: { primaryResultLabel: "손상차손", collapsedDetailTitle: "손상 판단 보기", inputHelp: "장부금액과 회수가능액을 확인합니다." },
    calculate(input) {
      const carryingAmount = toNumber(input.carryingAmount, "carryingAmount");
      const recoverableAmount = toNumber(input.recoverableAmount, "recoverableAmount");
      const impairmentLoss = Math.max(0, carryingAmount - recoverableAmount);
      return {
        templateId: "accounting_impairment_loss",
        displayName: "손상차손",
        resultLabel: "손상차손",
        resultValue: round(impairmentLoss),
        unit: "원",
        intermediateValues: [{ label: "손상 후 장부금액", value: round(Math.min(carryingAmount, recoverableAmount)) }],
        formulaSteps: ["장부금액 - 회수가능액", "음수이면 손상차손 0"],
        calculationRisk: "none",
        source: "deterministic_template",
      };
    },
  },
  accounting_bond_payable: {
    templateId: "accounting_bond_payable",
    displayName: "사채 발행가액",
    requiredInputs: ["faceValue", "couponRate", "marketRate", "periods"],
    optionalInputs: ["paymentsPerYear"],
    allowedLabels: labels("사채", "액면금액", "표시이자율", "시장이자율", "유효이자율", "이자비용", "현금이자", "사채할인발행차금", "사채할증발행차금"),
    validationRules: ["AI가 최종 발행가액을 제시해도 사용하지 않음", "이자율과 기간 단위를 확인"],
    renderHints: { primaryResultLabel: "발행가액", collapsedDetailTitle: "현재가치 산식 보기", inputHelp: "액면, 표시이자율, 시장이자율, 기간을 확인합니다." },
    calculate(input) {
      const faceValue = toNumber(input.faceValue, "faceValue");
      const couponRate = toNumber(input.couponRate, "couponRate");
      const marketRate = toNumber(input.marketRate, "marketRate");
      const periods = toNumber(input.periods, "periods");
      const paymentsPerYear = optionalNumber(input, "paymentsPerYear", 1);
      const periodCoupon = faceValue * (couponRate / paymentsPerYear);
      const periodMarketRate = marketRate / paymentsPerYear;
      const totalPeriods = periods * paymentsPerYear;
      const annuityFactor = periodMarketRate === 0 ? totalPeriods : (1 - (1 + periodMarketRate) ** -totalPeriods) / periodMarketRate;
      const principalPv = faceValue * (1 + periodMarketRate) ** -totalPeriods;
      const couponPv = periodCoupon * annuityFactor;
      return {
        templateId: "accounting_bond_payable",
        displayName: "사채 발행가액",
        resultLabel: "발행가액",
        resultValue: round(principalPv + couponPv),
        unit: "원",
        intermediateValues: [
          { label: "기간별 현금이자", value: round(periodCoupon) },
          { label: "원금 현재가치", value: round(principalPv) },
          { label: "이자 현재가치", value: round(couponPv) },
        ],
        formulaSteps: ["원금 현재가치 + 이자 현금흐름 현재가치", "표시이자율과 시장이자율은 기간 단위로 환산"],
        calculationRisk: "rounding",
        source: "deterministic_template",
      };
    },
  },
  accounting_inventory: {
    templateId: "accounting_inventory",
    displayName: "재고자산/매출원가",
    requiredInputs: ["beginningInventory", "purchases", "endingInventory"],
    optionalInputs: ["purchaseReturns", "freightIn"],
    allowedLabels: labels("기초재고", "당기매입", "매입환출", "매입운임", "기말재고", "매출원가", "재고자산"),
    validationRules: ["기말재고가 없으면 매출원가 계산 금지", "차감 항목 부호 확인"],
    renderHints: { primaryResultLabel: "매출원가", collapsedDetailTitle: "재고 흐름 보기", inputHelp: "기초, 매입, 기말 재고를 분리합니다." },
    calculate(input) {
      const beginningInventory = toNumber(input.beginningInventory, "beginningInventory");
      const purchases = toNumber(input.purchases, "purchases");
      const endingInventory = toNumber(input.endingInventory, "endingInventory");
      const purchaseReturns = optionalNumber(input, "purchaseReturns", 0);
      const freightIn = optionalNumber(input, "freightIn", 0);
      const netPurchases = purchases - purchaseReturns + freightIn;
      const goodsAvailable = beginningInventory + netPurchases;
      const costOfGoodsSold = goodsAvailable - endingInventory;
      return {
        templateId: "accounting_inventory",
        displayName: "재고자산/매출원가",
        resultLabel: "매출원가",
        resultValue: round(costOfGoodsSold),
        unit: "원",
        intermediateValues: [
          { label: "순매입액", value: round(netPurchases) },
          { label: "판매가능상품", value: round(goodsAvailable) },
        ],
        formulaSteps: ["기초재고 + 순매입액", "판매가능상품 - 기말재고"],
        calculationRisk: "none",
        source: "deterministic_template",
      };
    },
  },
  accounting_cost_volume_profit: {
    templateId: "accounting_cost_volume_profit",
    displayName: "CVP 손익분기점",
    requiredInputs: ["sellingPricePerUnit", "variableCostPerUnit", "fixedCosts"],
    optionalInputs: ["targetProfit"],
    allowedLabels: labels("판매단가", "단위당 변동비", "고정비", "공헌이익", "손익분기점", "목표이익"),
    validationRules: ["공헌이익이 0 이하이면 계산 중단", "목표이익은 선택 입력"],
    renderHints: { primaryResultLabel: "손익분기점 판매량", collapsedDetailTitle: "CVP 산식 보기", inputHelp: "단위당 공헌이익부터 확인합니다." },
    calculate(input) {
      const sellingPricePerUnit = toNumber(input.sellingPricePerUnit, "sellingPricePerUnit");
      const variableCostPerUnit = toNumber(input.variableCostPerUnit, "variableCostPerUnit");
      const fixedCosts = toNumber(input.fixedCosts, "fixedCosts");
      const targetProfit = optionalNumber(input, "targetProfit", 0);
      const contributionMarginPerUnit = sellingPricePerUnit - variableCostPerUnit;
      if (contributionMarginPerUnit <= 0) throw new Error("단위당 공헌이익이 0 이하라 손익분기점 계산을 확정할 수 없습니다.");
      const units = (fixedCosts + targetProfit) / contributionMarginPerUnit;
      return {
        templateId: "accounting_cost_volume_profit",
        displayName: "CVP 손익분기점",
        resultLabel: targetProfit > 0 ? "목표이익 판매량" : "손익분기점 판매량",
        resultValue: round(units),
        unit: "개",
        intermediateValues: [{ label: "단위당 공헌이익", value: round(contributionMarginPerUnit) }],
        formulaSteps: ["판매단가 - 단위당 변동비", "(고정비 + 목표이익) / 단위당 공헌이익"],
        calculationRisk: "rounding",
        source: "deterministic_template",
      };
    },
  },
  economics_elasticity_basic: {
    templateId: "economics_elasticity_basic",
    displayName: "탄력성 기본 계산",
    requiredInputs: ["quantityBefore", "quantityAfter", "priceBefore", "priceAfter"],
    optionalInputs: ["useMidpoint"],
    allowedLabels: labels("수요량", "공급량", "가격", "가격탄력성", "수요의 가격탄력성", "변화율"),
    validationRules: ["수량과 가격의 전후 값을 확인", "중간점 방식 여부 확인"],
    renderHints: { primaryResultLabel: "탄력성", collapsedDetailTitle: "탄력성 산식 보기", inputHelp: "수량 변화율과 가격 변화율을 분리합니다." },
    calculate(input) {
      const quantityBefore = toNumber(input.quantityBefore, "quantityBefore");
      const quantityAfter = toNumber(input.quantityAfter, "quantityAfter");
      const priceBefore = toNumber(input.priceBefore, "priceBefore");
      const priceAfter = toNumber(input.priceAfter, "priceAfter");
      const useMidpoint = input.useMidpoint === true || input.useMidpoint === "true";
      const quantityBase = useMidpoint ? (quantityBefore + quantityAfter) / 2 : quantityBefore;
      const priceBase = useMidpoint ? (priceBefore + priceAfter) / 2 : priceBefore;
      if (quantityBase === 0) throw new Error("수량 변화율 기준값이 0이라 탄력성을 계산할 수 없습니다.");
      if (priceBase === 0) throw new Error("가격 변화율 기준값이 0이라 탄력성을 계산할 수 없습니다.");
      if (priceAfter - priceBefore === 0) throw new Error("가격 변화가 0이라 탄력성을 계산할 수 없습니다.");
      const quantityChangeRate = (quantityAfter - quantityBefore) / quantityBase;
      const priceChangeRate = (priceAfter - priceBefore) / priceBase;
      const elasticity = Math.abs(quantityChangeRate / priceChangeRate);
      if (!Number.isFinite(elasticity)) throw new Error("탄력성 계산값을 확정할 수 없습니다.");
      return {
        templateId: "economics_elasticity_basic",
        displayName: "탄력성 기본 계산",
        resultLabel: "탄력성 절댓값",
        resultValue: round(elasticity, 4),
        intermediateValues: [
          { label: "수량 변화율", value: round(quantityChangeRate, 4) },
          { label: "가격 변화율", value: round(priceChangeRate, 4) },
        ],
        formulaSteps: ["수량 변화율 / 가격 변화율", useMidpoint ? "중간점 기준 적용" : "초기값 기준 적용"],
        calculationRisk: useMidpoint ? "none" : "confirmation_required",
        source: "deterministic_template",
      };
    },
  },
};

export function getAccountingTemplate(templateId: AccountingTemplateId | null | undefined) {
  return templateId ? ACCOUNTING_TEMPLATE_REGISTRY[templateId] ?? null : null;
}

export function validateAccountingParseResult(parseResult: AccountingParseResult, confirmed = false): TemplateValidationResult {
  const template = getAccountingTemplate(parseResult.templateId);
  if (!template) {
    return {
      ok: false,
      missingInputKeys: [],
      unknownLabels: [],
      lowConfidenceFlag: parseResult.confidence < LOW_CONFIDENCE_THRESHOLD,
      calculationRisk: "unsupported_template",
      message: "아직 지원하지 않는 계산 유형입니다. OCR/분류 결과만 저장할 수 있습니다.",
    };
  }

  const missingInputKeys = template.requiredInputs.filter((key) => parseResult.extractedInputs[key] === undefined || parseResult.extractedInputs[key] === null || parseResult.extractedInputs[key] === "");
  const allowed = new Set(template.allowedLabels);
  const unknownLabels = parseResult.extractedLabels.filter((label) => !allowed.has(label));
  const lowConfidenceFlag = parseResult.confidence < LOW_CONFIDENCE_THRESHOLD || parseResult.needsHumanConfirmation;
  let calculationRisk: TemplateValidationResult["calculationRisk"] = "none";
  if (unknownLabels.length > 0) calculationRisk = "unknown_label";
  else if (missingInputKeys.length > 0) calculationRisk = "missing_input";
  else if (lowConfidenceFlag && !confirmed) calculationRisk = "low_confidence";
  else calculationRisk = resolveCalculationInputRisk(template, parseResult.extractedInputs);

  return {
    ok: calculationRisk === "none",
    missingInputKeys,
    unknownLabels,
    lowConfidenceFlag,
    calculationRisk,
    message:
      calculationRisk === "unknown_label"
        ? "확인되지 않은 계정명이 있어 계산을 확정하지 않습니다."
        : calculationRisk === "missing_input"
          ? "필수 숫자가 빠져 계산하지 않습니다."
          : calculationRisk === "low_confidence"
            ? "신뢰도가 낮아 숫자 확인 후 계산합니다."
            : calculationRisk === "invalid_input"
              ? "입력값을 다시 확인해야 계산할 수 있습니다."
              : undefined,
  };
}

export function calculateFromAccountingParseResult(parseResult: AccountingParseResult, confirmed = false) {
  const validation = validateAccountingParseResult(parseResult, confirmed);
  if (!validation.ok) return { validation, calculation: null };
  const template = getAccountingTemplate(parseResult.templateId);
  if (!template) return { validation, calculation: null };

  try {
    return { validation, calculation: template.calculate(parseResult.extractedInputs) };
  } catch {
    return {
      validation: {
        ...validation,
        ok: false,
        calculationRisk: "invalid_input" as const,
        message: "입력값을 다시 확인해야 계산할 수 있습니다.",
      },
      calculation: null,
    };
  }
}

export function buildAccountingDerivedMetadata(parseResult: AccountingParseResult, validation: TemplateValidationResult) {
  return sanitizeDerivedMetadata({
    templateId: parseResult.templateId,
    confidence: parseResult.confidence,
    missingInputKeys: validation.missingInputKeys,
    lowConfidenceFlag: validation.lowConfidenceFlag,
    calculationRisk: validation.calculationRisk,
    subject: parseResult.subject,
  });
}

export function normalizeAccountingParseResultFromAi(payload: Record<string, unknown>): AccountingParseResult {
  const templateId = ACCOUNTING_TEMPLATE_IDS.includes(payload.templateId as AccountingTemplateId)
    ? (payload.templateId as AccountingTemplateId)
    : null;
  const subject = payload.subject === "경제학" ? "경제학" : "회계학";
  const extractedInputs =
    payload.extractedInputs && typeof payload.extractedInputs === "object" && !Array.isArray(payload.extractedInputs)
      ? (payload.extractedInputs as TemplateInput)
      : {};
  const extractedLabels = Array.isArray(payload.extractedLabels)
    ? payload.extractedLabels.filter((label): label is string => typeof label === "string")
    : [];
  const confidence = typeof payload.confidence === "number" && Number.isFinite(payload.confidence) ? Math.max(0, Math.min(1, payload.confidence)) : 0;
  return {
    subject,
    templateId,
    confidence,
    extractedInputs,
    extractedLabels,
    unsupportedReason: typeof payload.unsupportedReason === "string" ? payload.unsupportedReason : templateId ? undefined : "unsupported_template",
    needsHumanConfirmation: payload.needsHumanConfirmation === true || confidence < LOW_CONFIDENCE_THRESHOLD,
  };
}

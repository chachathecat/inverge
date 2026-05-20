export type CasioFx9860GiiiMode =
  | "RUN-MAT"
  | "EQUA"
  | "MAT"
  | "STAT"
  | "TVM"
  | "Spreadsheet"
  | "검토 필요";

export type CasioFx9860GiiiGuide = {
  calculatorModel: "CASIO fx-9860GIII";
  calculationPurpose: string;
  recommendedMode: CasioFx9860GiiiMode;
  keystrokeSteps: string[];
  expectedDisplay?: string;
  answerRounding?: string;
  caution: string;
};

type BuildGuideInput = {
  calculationPurpose?: string;
  recommendedMode?: CasioFx9860GiiiMode;
  keystrokeSteps?: string[];
  expectedDisplay?: string;
  answerRounding?: string;
};

const DEFAULT_CAUTION = "계산기 설정과 OS 버전에 따라 메뉴명이나 표시가 다를 수 있습니다. 시험 전 본인 계산기에서 같은 방식으로 확인해 주세요.";

function sanitizeText(input?: string) {
  if (!input) return undefined;
  return input
    .replaceAll("CASIO 공식 보증", "공식 보증 아님")
    .replaceAll("CASIO 공식 인증", "공식 인증 아님")
    .replaceAll("공식 보증", "보증 아님")
    .trim();
}

export function buildCasioFx9860GiiiGuide(input: BuildGuideInput): CasioFx9860GiiiGuide {
  const recommendedMode = input.recommendedMode ?? "검토 필요";
  const keystrokeSteps = (input.keystrokeSteps ?? []).filter(Boolean);

  return {
    calculatorModel: "CASIO fx-9860GIII",
    calculationPurpose: sanitizeText(input.calculationPurpose) ?? "계산기 입력이 필요한 문제인지 검토가 필요합니다.",
    recommendedMode,
    keystrokeSteps: keystrokeSteps.length > 0 ? keystrokeSteps : ["MENU", "RUN-MAT", "계산식 입력", "EXE"],
    expectedDisplay: sanitizeText(input.expectedDisplay),
    answerRounding: sanitizeText(input.answerRounding),
    caution: DEFAULT_CAUTION,
  };
}

export function presentValue(amount: number, rate: number, periods: number) {
  return amount / (1 + rate) ** periods;
}

export function unitPrice(total: number, area: number) {
  return area === 0 ? NaN : total / area;
}

export function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? NaN : numerator / denominator;
}

export function percentage(numerator: number, denominator: number) {
  return ratio(numerator, denominator) * 100;
}

export function sum(values: number[]) {
  return values.reduce((acc, value) => acc + value, 0);
}

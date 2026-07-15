export type CalculatorWorkflowContext = "accounting" | "practice";

export type CalculatorWorkflowCard = {
  id: string;
  title: string;
  whenToUse: string;
  valuesToWriteFirst: string[];
  calculationOrder: string[];
  buttonPath: {
    common: string;
    fx9860giiiDraft: string;
    verificationStatus: "common-verified" | "device-draft";
  };
  commonMistakes: string[];
  verificationCheck: string;
  copyToAnswer: string;
};

export type CalculatorWorkflow = {
  context: CalculatorWorkflowContext;
  mode: "first" | "second";
  subject: "회계학" | "감정평가실무";
  title: string;
  subtitle: string;
  preExamChecks: string[];
  basicSetup: string[];
  problemTypes: Array<{ id: string; label: string; description: string }>;
  stepCards: CalculatorWorkflowCard[];
  commonMistakes: string[];
  verificationChecks: string[];
  oneMinuteDrill: string[];
};

export const CALCULATOR_WORKFLOWS: Record<CalculatorWorkflowContext, CalculatorWorkflow> = {
  accounting: {
    context: "accounting",
    mode: "first",
    subject: "회계학",
    title: "회계학 계산기 스텝",
    subtitle: "정답을 맞히기보다, 중간값을 남기고 검산할 순서를 고정합니다.",
    preExamChecks: [
      "계산기 배터리와 화면 대비를 확인합니다.",
      "계산기 사용 가능 여부는 최신 시험 공지와 감독 안내를 따릅니다.",
      "문제지 여백에 중간값을 적을 위치를 먼저 정합니다.",
    ],
    basicSetup: [
      "계산 시작 전 표시 형식과 소수 처리 상태를 확인합니다.",
      "이전 계산값이 남아 있으면 새 문제 시작 전 초기화합니다.",
      "분개, 금액, 표시 항목을 한 줄씩 나눠 적을 준비를 합니다.",
    ],
    problemTypes: [
      { id: "inventory", label: "재고자산", description: "수량, 단가, 기말 재고 값을 먼저 고정합니다." },
      { id: "depreciation", label: "감가상각", description: "취득원가, 잔존가치, 내용연수, 월할 여부를 분리합니다." },
      { id: "present-value", label: "현재가치", description: "이자율, 기간, 현금흐름 시점을 먼저 적습니다." },
    ],
    stepCards: [
      {
        id: "write-values",
        title: "1. 숫자를 바로 누르지 않습니다",
        whenToUse: "문제에 수량, 단가, 기간, 이자율, 월할 조건이 2개 이상 섞여 있을 때 사용합니다.",
        valuesToWriteFirst: ["구할 값: 재고액, 감가상각비, 현재가치 등", "입력값: 수량, 단가, 기간, 이자율, 잔존가치", "조건: 월할, 반올림, 부호, 차감 항목"],
        calculationOrder: ["계산기 입력 전 문제지에 입력값을 한 줄씩 적습니다.", "단위가 다른 값은 같은 줄에 쓰지 않습니다.", "첫 계산은 최종값이 아니라 중간값 확인용으로 둡니다."],
        buttonPath: {
          common: "일반 계산 모드에서 숫자와 사칙연산만 사용합니다. 메모리 기능은 alpha 기본 경로에서 제외합니다.",
          fx9860giiiDraft: "RUN-MAT 계열 기본 계산 화면에서 입력하는 경로로 검증 예정입니다.",
          verificationStatus: "device-draft",
        },
        commonMistakes: ["수량과 금액을 같은 입력값처럼 취급함", "월할 개월 수를 표시하지 않고 바로 입력함", "차감 항목의 부호를 마지막에 놓침"],
        verificationCheck: "계산기에 입력한 첫 숫자가 문제지에 적은 첫 입력값과 같은지 확인합니다.",
        copyToAnswer: "구할 값 이름과 핵심 입력값 2-3개를 답 근거로 남깁니다.",
      },
      {
        id: "order",
        title: "2. 식의 순서를 먼저 씁니다",
        whenToUse: "재고자산, 감가상각, 현재가치처럼 계산 순서가 바뀌면 값이 달라지는 문제에서 사용합니다.",
        valuesToWriteFirst: ["큰 식의 이름", "괄호가 필요한 묶음", "중간값을 적을 위치"],
        calculationOrder: ["문제지에 큰 식을 먼저 씁니다.", "괄호 안 계산을 먼저 처리합니다.", "중간값을 적고, 그 값으로 다음 계산을 이어갑니다.", "최종값은 마지막 한 번만 선지와 비교합니다."],
        buttonPath: {
          common: "괄호가 필요한 식은 계산기 입력 전 종이에 괄호 위치를 표시합니다. 입력 중 괄호가 불확실하면 AC 후 재입력합니다.",
          fx9860giiiDraft: "괄호 입력과 DEL/AC 동작은 실제 FX-9860GIII 키 배열로 검증 예정입니다.",
          verificationStatus: "device-draft",
        },
        commonMistakes: ["괄호 없이 연속 입력해 연산 우선순위가 바뀜", "중간값을 적지 않아 마지막 오입력을 찾지 못함", "선지를 먼저 보고 계산 순서를 맞춰버림"],
        verificationCheck: "계산기 화면의 중간값이 문제지의 중간값 칸에 남아 있는지 확인합니다.",
        copyToAnswer: "중간값이 정답 판단의 근거라면 최종값만 쓰지 말고 중간값도 남깁니다.",
      },
      {
        id: "verify",
        title: "3. 최종값을 믿기 전에 한 번 줄입니다",
        whenToUse: "최종값이 나왔지만 선지와 바로 비교하기 전에 사용합니다.",
        valuesToWriteFirst: ["최종값", "단위", "반올림 기준", "선지 비교 기준"],
        calculationOrder: ["최종값의 자릿수와 단위를 확인합니다.", "상식적으로 너무 크거나 작은 값인지 봅니다.", "가능하면 한 단계 전 중간값으로 되돌아가 다시 계산합니다."],
        buttonPath: {
          common: "같은 식을 처음부터 다시 누르기보다 중간값부터 재계산합니다. 반복 입력 중 결과가 다르면 문제지 식을 먼저 확인합니다.",
          fx9860giiiDraft: "직전 입력 재사용, 기록 호출, 메모리 사용은 alpha 기본 경로에서 제외하고 별도 검증 예정입니다.",
          verificationStatus: "device-draft",
        },
        commonMistakes: ["자릿수 하나 차이를 선지 차이로 착각함", "반올림 전 값과 반올림 후 값을 섞음", "검산 없이 가장 가까운 선지를 고름"],
        verificationCheck: "최종값, 단위, 반올림 기준이 같은 줄에 적혀 있는지 확인합니다.",
        copyToAnswer: "최종값 옆에 단위 또는 선택 근거를 짧게 붙입니다.",
      },
    ],
    commonMistakes: [
      "월할 계산에서 개월 수를 한 번 더 곱하거나 빠뜨림",
      "재고 수량과 금액을 같은 줄에서 섞음",
      "현재가치 기간을 현금흐름 시점과 다르게 잡음",
      "음수 처리 또는 차감 항목을 마지막에 놓침",
    ],
    verificationChecks: [
      "내가 적은 구할 값과 최종값의 단위가 같은가",
      "중간값 하나 이상이 문제지에 남아 있는가",
      "선지와 비교하기 전 자릿수와 반올림 기준을 봤는가",
    ],
    oneMinuteDrill: [
      "20초: 입력값과 구할 값을 적습니다.",
      "25초: 식 순서와 괄호 위치를 적습니다.",
      "15초: 최종값의 단위, 자릿수, 부호를 확인합니다.",
    ],
  },
  practice: {
    context: "practice",
    mode: "second",
    subject: "감정평가실무",
    title: "실무 계산기 스텝",
    subtitle: "계산 결과를 답안 판단으로 연결하기 위한 최소 흐름을 고정합니다.",
    preExamChecks: [
      "계산기 사용 가능 여부는 최신 시험 공지와 감독 안내를 따릅니다.",
      "답안지에 계산 근거, 중간값, 최종 판단을 나눠 적을 공간을 확보합니다.",
      "계산 과정이 길어질 때 버릴 계산과 남길 계산을 구분합니다.",
    ],
    basicSetup: [
      "새 사례 시작 전 이전 계산값을 초기화합니다.",
      "이자율, 기간, 면적, 단가, 보정률을 같은 순서로 적습니다.",
      "계산기는 결과 확인 도구이고, 답안에는 근거와 판단 문장이 남아야 합니다.",
    ],
    problemTypes: [
      { id: "valuation-adjustment", label: "보정 계산", description: "기준값, 보정률, 적용 순서를 먼저 고정합니다." },
      { id: "income", label: "수익방식", description: "순수익, 환원율, 기간 또는 할인 구조를 분리합니다." },
      { id: "comparison", label: "거래사례비교", description: "사례값, 사정보정, 시점수정, 지역/개별요인을 순서대로 둡니다." },
    ],
    stepCards: [
      {
        id: "lock-assumptions",
        title: "1. 계산 전 전제를 잠급니다",
        whenToUse: "사례에서 보정률, 면적, 단가, 기간, 환원율 등 계산 전제가 여러 개 나올 때 사용합니다.",
        valuesToWriteFirst: ["문제 요구: 구할 가격/단가/총액", "입력값: 면적, 단가, 보정률, 기간, 이자율", "적용 순서: 어떤 보정을 먼저 할지"],
        calculationOrder: ["문제 요구를 한 줄로 적습니다.", "사용할 값과 보정률을 표처럼 분리합니다.", "계산 대상이 가격, 단가, 총액 중 무엇인지 표시합니다.", "계산기에 입력하기 전 답안에 남길 산식 이름을 정합니다."],
        buttonPath: {
          common: "기본 계산 화면에서 보정률은 소수 또는 비율 중 하나로 통일해 입력합니다. 입력 전 종이에 표기 방식을 먼저 고정합니다.",
          fx9860giiiDraft: "RUN-MAT 계열 기본 계산 화면과 비율 입력 방식은 실제 기기로 검증 예정입니다.",
          verificationStatus: "device-draft",
        },
        commonMistakes: ["보정률을 1.05와 5% 사이에서 섞음", "가격, 단가, 총액 대상을 바꿔 계산함", "계산 전제를 답안에 남기지 않음"],
        verificationCheck: "계산 대상이 문제 요구와 같은지, 보정률 표기가 한 방식으로 통일됐는지 확인합니다.",
        copyToAnswer: "사용한 전제와 산식 이름을 답안 첫 문장에 남깁니다.",
      },
      {
        id: "calculate-in-blocks",
        title: "2. 계산을 블록으로 끊습니다",
        whenToUse: "거래사례비교, 수익방식, 보정 계산처럼 한 줄 계산이 길어지는 실무 문제에서 사용합니다.",
        valuesToWriteFirst: ["보정 전 값", "각 보정 후 중간값", "최종값 전 단계", "단위"],
        calculationOrder: ["보정 전 값과 보정 후 값을 따로 적습니다.", "중간값마다 단위를 붙입니다.", "최종값 전 단계에서 한 번 멈추고 보정 방향을 확인합니다.", "최종값을 답안 판단 문장에 연결합니다."],
        buttonPath: {
          common: "각 블록이 끝날 때 = 로 중간값을 확정하고 종이에 옮긴 뒤 다음 블록을 입력합니다.",
          fx9860giiiDraft: "중간 결과 재사용, Ans 키, 메모리 기능 사용 여부는 검증 전까지 권장하지 않습니다.",
          verificationStatus: "device-draft",
        },
        commonMistakes: ["계산기 화면값만 보고 중간값을 답안에 남기지 않음", "보정 방향을 한 블록에서 반대로 적용함", "단위가 가격인지 단가인지 흐려짐"],
        verificationCheck: "각 블록마다 종이에 남은 중간값이 하나 이상 있는지 확인합니다.",
        copyToAnswer: "답안에는 모든 입력을 쓰기보다 판단에 필요한 중간값만 남깁니다.",
      },
      {
        id: "close-judgment",
        title: "3. 결과를 판단 문장으로 닫습니다",
        whenToUse: "계산값이 나왔지만 결론 문장이 약하거나 빠질 때 사용합니다.",
        valuesToWriteFirst: ["최종값", "단위", "반올림 기준", "문제 요구에 대한 판단어"],
        calculationOrder: ["최종값의 단위와 반올림을 확인합니다.", "값이 문제 요구에 답하는지 확인합니다.", "계산 결과 뒤에 평가 판단 문장 1개를 붙입니다."],
        buttonPath: {
          common: "계산기 추가 조작보다 종이에 쓴 최종값과 문제 요구를 대조합니다.",
          fx9860giiiDraft: "표시 자릿수와 반올림 표시 방식은 실제 기기 설정으로 검증 예정입니다.",
          verificationStatus: "device-draft",
        },
        commonMistakes: ["숫자만 쓰고 평가 판단을 닫지 않음", "반올림 전 값을 결론에 옮김", "문제 요구와 다른 단위로 결론을 씀"],
        verificationCheck: "최종값 뒤에 판단 문장이 한 문장 붙어 있는지 확인합니다.",
        copyToAnswer: "최종값 + 판단 문장 1개를 한 묶음으로 옮깁니다.",
      },
    ],
    commonMistakes: [
      "보정 방향을 반대로 적용함",
      "중간값 단위를 생략해 최종값이 무엇인지 흐려짐",
      "계산은 했지만 평가 판단 문장을 쓰지 않음",
      "반올림 기준을 답안 안에서 일관되게 유지하지 못함",
    ],
    verificationChecks: [
      "최종값이 문제에서 요구한 대상과 같은가",
      "보정 방향을 말로 설명할 수 있는가",
      "답안에 계산 근거와 판단 문장이 모두 남아 있는가",
    ],
    oneMinuteDrill: [
      "20초: 문제 요구와 계산 대상을 적습니다.",
      "25초: 입력값, 보정률, 중간값 위치를 표시합니다.",
      "15초: 최종값 뒤에 붙일 판단 문장을 씁니다.",
    ],
  },
};

export const DEVICE_APPENDIX_FX_9860GIII = {
  title: "FX-9860GIII 부록 Draft/Beta",
  caution:
    "아래 내용은 기기별 조작을 정리하기 위한 Draft/Beta 부록입니다. 시험 허용 여부를 주장하지 않으며, 버튼 경로와 표시 설정은 실제 기기 또는 공식 매뉴얼로 확인하기 전까지 확정 지침으로 사용하지 않습니다.",
  sections: [
    {
      title: "Reset",
      items: ["Draft/Beta: 시험 전 개인 설정과 메모리 상태를 확인합니다.", "초기화 경로는 실제 기기 메뉴에서 검증한 뒤 팀 문서에 고정합니다."],
    },
    {
      title: "Setup",
      items: ["Draft/Beta: 표시 형식, 소수 표시, 각도/단위 관련 설정을 확인합니다.", "계산 결과 표기 방식이 답안 반올림 기준과 충돌하지 않는지 봅니다."],
    },
    {
      title: "Mode switch",
      items: ["Draft/Beta: 기본 계산 모드와 표/통계 관련 모드 전환 위치를 확인합니다.", "문제 풀이 중 모드를 바꿨다면 다음 문제 전 기본 계산 상태로 돌아옵니다."],
    },
    {
      title: "Button path examples",
      items: ["Draft/Beta: 정확한 버튼 경로는 검증 전까지 placeholder로 둡니다.", "예시는 실제 기기 캡처나 검수된 수험 메모로 교체합니다."],
    },
  ],
};

export function parseCalculatorContext(value?: string | null): CalculatorWorkflowContext {
  return value === "practice" ? "practice" : "accounting";
}

export function getCalculatorWorkflow(context?: string | null) {
  return CALCULATOR_WORKFLOWS[parseCalculatorContext(context)];
}

export function getCalculatorWorkflowForSubject(subjectLabel?: string | null) {
  if (subjectLabel === "회계학") return CALCULATOR_WORKFLOWS.accounting;
  if (subjectLabel === "감정평가실무") return CALCULATOR_WORKFLOWS.practice;
  return null;
}

export function getCalculatorWorkflowHref(workflow: Pick<CalculatorWorkflow, "context" | "mode">) {
  const params = new URLSearchParams({
    context: workflow.context,
    mode: workflow.mode,
    focus: workflow.mode === "second" ? "casio" : "accounting_template",
  });
  return `/app/calculator?${params.toString()}`;
}

export function hasCalculationSignal(values: Array<string | undefined | null>) {
  return values.some((value) => /계산|산식|금액|숫자|검산|보정|현가|현재가치|환원|분개/.test(value ?? ""));
}

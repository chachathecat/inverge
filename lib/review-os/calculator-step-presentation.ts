import type {
  CalculatorRoutineDraftV1,
  CalculatorRoutineMistakeType,
  CalculatorRoutineStepId,
  CalculatorRoutineTextStepId,
} from "./calculator-routine";

export type CalculatorStepPresentationVariant = "KeyInput" | "Display" | "Transfer";

type CalculatorStepPresentationBase = Readonly<{
  step: CalculatorStepPresentationVariant;
  stepLabel: string;
  formula: string;
  displayValue: string;
  keySequence: string;
  hint: string;
  verification: "기기 검증 전";
  showHint: true;
  showStateLabel: false;
  showVerification: true;
}>;

export type CalculatorStepPresentation =
  | (CalculatorStepPresentationBase & {
      state: "Current";
      stateEvidence: Readonly<{ kind: "active-step"; active: true }>;
    })
  | (CalculatorStepPresentationBase & {
      state: "Error";
      stateEvidence: Readonly<{
        kind: "input-error";
        invalidInput: true;
        detail: string;
      }>;
    })
  | (CalculatorStepPresentationBase & {
      state: "Complete";
      stateEvidence: Readonly<{ kind: "learner-record"; recorded: true }>;
    });

type MappedStepContract = Readonly<{
  variant: CalculatorStepPresentationVariant;
  position: 4 | 5 | 6;
  label: string;
  mistakeType: CalculatorRoutineMistakeType;
  mistakeDetail: string;
  hint: string;
}>;

const MAPPED_STEP_CONTRACTS: Partial<Record<CalculatorRoutineStepId, MappedStepContract>> = {
  casio_input: {
    variant: "KeyInput",
    position: 4,
    label: "CASIO 입력",
    mistakeType: "casio_input",
    mistakeDetail: "학습자가 CASIO 입력 오류를 기록했습니다.",
    hint: "입력식과 키 순서는 실제 기기에서 직접 대조해 주세요.",
  },
  display_value: {
    variant: "Display",
    position: 5,
    label: "화면값 확인",
    mistakeType: "display_reading",
    mistakeDetail: "학습자가 화면값 판독 오류를 기록했습니다.",
    hint: "계산기 화면값을 원문 숫자·단위와 직접 대조해 주세요.",
  },
  answer_value: {
    variant: "Transfer",
    position: 6,
    label: "답안 기재값 확인",
    mistakeType: "answer_transfer",
    mistakeDetail: "학습자가 답안 기재값 옮김 오류를 기록했습니다.",
    hint: "기록한 화면값과 답안 기재값을 직접 대조해 주세요.",
  },
};

const honestValue = (value: string | undefined, fallback: string) => {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
};

export function getCalculatorStepPresentationVariant(
  stepId: CalculatorRoutineStepId,
): CalculatorStepPresentationVariant | null {
  return MAPPED_STEP_CONTRACTS[stepId]?.variant ?? null;
}

export function buildCalculatorStepPresentation(
  draft: Pick<CalculatorRoutineDraftV1, "entries" | "mistakeTypes" | "stuckStepIds">,
  stepId: CalculatorRoutineStepId,
): CalculatorStepPresentation | null {
  const contract = MAPPED_STEP_CONTRACTS[stepId];
  if (!contract) return null;

  const textStepId = stepId as CalculatorRoutineTextStepId;
  const hasLearnerRecord = Boolean(draft.entries[textStepId]?.trim());
  const hasExplicitInputError = draft.mistakeTypes.includes(contract.mistakeType);
  const base: CalculatorStepPresentationBase = {
    step: contract.variant,
    stepLabel: `${contract.position} / 9 · ${contract.label}`,
    formula: honestValue(draft.entries.formula, "산식 미기록"),
    displayValue: honestValue(draft.entries.display_value, "화면값 미기록"),
    keySequence: honestValue(draft.entries.casio_input, "키 순서 미기록"),
    hint: contract.hint,
    verification: "기기 검증 전",
    showHint: true,
    showStateLabel: false,
    showVerification: true,
  };

  if (hasExplicitInputError) {
    return {
      ...base,
      state: "Error",
      stateEvidence: {
        kind: "input-error",
        invalidInput: true,
        detail: contract.mistakeDetail,
      },
    };
  }

  if (hasLearnerRecord) {
    return {
      ...base,
      state: "Complete",
      stateEvidence: { kind: "learner-record", recorded: true },
    };
  }

  return {
    ...base,
    state: "Current",
    stateEvidence: { kind: "active-step", active: true },
  };
}

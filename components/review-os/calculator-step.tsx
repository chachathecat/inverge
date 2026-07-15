import { cn } from "@/lib/utils";

export const CALCULATOR_STEP_VARIANTS = ["KeyInput", "Display", "Transfer"] as const;
export const CALCULATOR_STEP_STATES = ["Current", "Error", "Complete"] as const;

export type CalculatorStepVariant = (typeof CALCULATOR_STEP_VARIANTS)[number];
export type CalculatorStepState = (typeof CALCULATOR_STEP_STATES)[number];

type CalculatorStepStateContract =
  | {
      state: "Current";
      stateEvidence: Readonly<{ kind: "active-step"; active: true }>;
    }
  | {
      state: "Error";
      stateEvidence: Readonly<{
        kind: "input-error";
        invalidInput: true;
        detail: string;
      }>;
    }
  | {
      state: "Complete";
      stateEvidence: Readonly<{ kind: "learner-record"; recorded: true }>;
    };

export type CalculatorStepProps = Readonly<{
  step: CalculatorStepVariant;
  stepLabel?: string;
  formula?: string;
  displayValue?: string;
  keySequence?: string;
  hint?: string;
  verification?: "기기 검증 전";
  showHint?: boolean;
  showStateLabel?: boolean;
  showVerification?: boolean;
  className?: string;
  testId?: string;
}> & CalculatorStepStateContract;

const STATE_PRESENTATION: Record<
  CalculatorStepState,
  Readonly<{
    label: string;
    shellClassName: string;
    emphasisClassName: string;
    hintClassName: string;
  }>
> = {
  Current: {
    label: "현재 단계",
    shellClassName:
      "bg-[var(--color-background-focus)] outline-[var(--color-border-focus)]",
    emphasisClassName: "text-[var(--color-text-link)]",
    hintClassName:
      "bg-[var(--color-background-elevated)] text-[var(--color-text-link)]",
  },
  Error: {
    label: "입력 오류",
    shellClassName:
      "bg-[var(--color-background-risk)] outline-[var(--color-border-risk)]",
    emphasisClassName: "text-[var(--color-text-risk)]",
    hintClassName:
      "bg-[var(--color-background-surface)] text-[var(--color-text-risk)]",
  },
  Complete: {
    label: "확인 완료",
    shellClassName:
      "bg-[var(--color-background-stable)] outline-[var(--color-border-stable)]",
    emphasisClassName: "text-[var(--color-text-stable)]",
    hintClassName:
      "bg-[var(--color-background-surface)] text-[var(--color-text-stable)]",
  },
};

const DEFAULT_CONTENT = {
  stepLabel: "3 / 5 · 계산기 입력",
  formula: "120000000 ÷ 0.055",
  displayValue: "2181818181.81818",
  keySequence: "1 2 0 0 0 0 0 0 0 ÷ 0 . 0 5 5 EXE",
  hint: "입력값과 소수점 위치를 확인하세요.",
  verification: "기기 검증 전" as const,
};

function nonEmpty(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`CalculatorStep requires non-empty ${field}.`);
  return normalized;
}

export function CalculatorStep({
  step,
  state,
  stateEvidence,
  stepLabel = DEFAULT_CONTENT.stepLabel,
  formula = DEFAULT_CONTENT.formula,
  displayValue = DEFAULT_CONTENT.displayValue,
  keySequence = DEFAULT_CONTENT.keySequence,
  hint = DEFAULT_CONTENT.hint,
  verification = DEFAULT_CONTENT.verification,
  showHint = true,
  showStateLabel = true,
  showVerification = true,
  className,
  testId = "calculator-step-v3",
}: CalculatorStepProps) {
  if (state === "Current" && (stateEvidence.kind !== "active-step" || stateEvidence.active !== true)) {
    throw new Error("CalculatorStep Current requires explicit active-step evidence.");
  }
  if (state === "Error") {
    if (stateEvidence.kind !== "input-error" || stateEvidence.invalidInput !== true) {
      throw new Error("CalculatorStep Error requires explicit input-error evidence.");
    }
    nonEmpty(stateEvidence.detail, "input-error detail");
  }
  if (state === "Complete" && (stateEvidence.kind !== "learner-record" || stateEvidence.recorded !== true)) {
    throw new Error("CalculatorStep Complete requires an explicit learner record.");
  }

  const presentation = STATE_PRESENTATION[state];
  const normalizedStepLabel = nonEmpty(stepLabel, "step label");
  const normalizedFormula = nonEmpty(formula, "formula");
  const normalizedDisplayValue = nonEmpty(displayValue, "display value");
  const normalizedKeySequence = nonEmpty(keySequence, "key sequence");
  const normalizedHint = nonEmpty(hint, "hint");

  return (
    <article
      data-v3-component="CalculatorStep"
      data-v3-step={step}
      data-v3-state={state}
      data-hint-visible={showHint ? "true" : "false"}
      data-state-label-visible={showStateLabel ? "true" : "false"}
      data-verification-visible={showVerification ? "true" : "false"}
      data-device-verified="false"
      data-testid={testId}
      aria-label={`${normalizedStepLabel} · ${presentation.label}`}
      className={cn(
        "flex min-h-[380px] w-full max-w-[552px] flex-col gap-3 rounded-[var(--v3-radius-panel)] p-6 outline outline-1 outline-offset-[-1px] sm:min-h-[350px]",
        presentation.shellClassName,
        className,
      )}
    >
      <header className="flex min-h-[22px] flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="v3-type-label-strong min-w-0 text-[var(--color-text-primary)]">
          {normalizedStepLabel}
        </h3>
        <span className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          {showStateLabel ? (
            <span className={cn("v3-type-label", presentation.emphasisClassName)} data-calculator-step-state-label>
              {presentation.label}
            </span>
          ) : null}
          {showVerification ? (
            <span className="v3-type-caption text-[var(--color-text-secondary)]" data-calculator-step-verification>
              {verification}
            </span>
          ) : null}
        </span>
      </header>

      <section
        aria-label="계산기 표시"
        className="flex min-h-[124px] flex-col justify-center gap-2 rounded-[var(--v3-radius-control)] bg-[var(--color-background-brand)] p-4 text-[var(--color-text-inverse)]"
        data-calculator-step-display
      >
        <code className="v3-mono-small block break-all text-[var(--color-text-inverse)]">
          {normalizedFormula}
        </code>
        <output className="v3-mono-display block break-all text-[var(--color-text-inverse)]">
          {normalizedDisplayValue}
        </output>
      </section>

      <section
        aria-label="키 순서"
        className="min-h-[66px] rounded-[var(--v3-radius-control)] bg-[var(--color-background-surface)] p-3 text-[var(--color-text-primary)]"
        data-calculator-step-key-sequence
      >
        <p className="v3-type-caption">키 순서</p>
        <code className="v3-mono-small mt-1 block whitespace-break-spaces break-words">
          {normalizedKeySequence}
        </code>
      </section>

      {showHint ? (
        <aside
          aria-label="입력 확인 힌트"
          className={cn(
            "v3-type-compact min-h-[46px] rounded-[var(--v3-radius-control)] p-3",
            presentation.hintClassName,
          )}
          data-calculator-step-hint
        >
          {normalizedHint}
        </aside>
      ) : null}
    </article>
  );
}

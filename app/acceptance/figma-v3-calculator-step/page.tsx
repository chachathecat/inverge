import { notFound } from "next/navigation";

import {
  CALCULATOR_STEP_STATES,
  CALCULATOR_STEP_VARIANTS,
  CalculatorStep,
  type CalculatorStepState,
  type CalculatorStepVariant,
} from "@/components/review-os/calculator-step";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "S232C.1 CalculatorStep acceptance",
  robots: { index: false, follow: false },
};

function SyntheticCalculatorStep({
  step,
  state,
}: {
  step: CalculatorStepVariant;
  state: CalculatorStepState;
}) {
  const shared = { step, testId: `calculator-step-${step}-${state}` } as const;
  switch (state) {
    case "Current":
      return (
        <CalculatorStep
          {...shared}
          state="Current"
          stateEvidence={{ kind: "active-step", active: true }}
        />
      );
    case "Error":
      return (
        <CalculatorStep
          {...shared}
          state="Error"
          stateEvidence={{
            kind: "input-error",
            invalidInput: true,
            detail: "합성 입력 불일치",
          }}
        />
      );
    case "Complete":
      return (
        <CalculatorStep
          {...shared}
          state="Complete"
          stateEvidence={{ kind: "learner-record", recorded: true }}
        />
      );
  }
}

export default function S232C1CalculatorStepAcceptancePage() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main
      className="mx-auto w-full max-w-[var(--layout-content-max)] space-y-10 px-[var(--layout-page-edge)] py-10"
      data-s232c1-calculator-step-acceptance
      data-private-learner-data="absent"
    >
      <header className="max-w-[var(--layout-reading-column)] space-y-3">
        <p className="v3-type-caption text-[var(--color-text-secondary)]">
          S232C.1 · SYNTHETIC ACCEPTANCE
        </p>
        <h1 className="v3-type-screen text-[var(--color-text-primary)]">
          Figma V3 계산기 단계
        </h1>
        <p className="v3-type-body ko-keep text-[var(--color-text-secondary)]">
          개인 데이터 없이 Figma 표본 문구만 사용하는 Preview 전용 3×3 상태 매트릭스입니다.
        </p>
      </header>

      <div className="space-y-8">
        {CALCULATOR_STEP_VARIANTS.flatMap((step) =>
          CALCULATOR_STEP_STATES.map((state) => (
            <section key={`${step}-${state}`} className="space-y-2" aria-label={`${step} ${state}`}>
              <p className="v3-type-caption text-[var(--color-text-secondary)]">
                {step} · {state}
              </p>
              <SyntheticCalculatorStep step={step} state={state} />
            </section>
          )),
        )}
      </div>

      <section className="space-y-3" aria-labelledby="calculator-step-real-mobile-heading">
        <h2 id="calculator-step-real-mobile-heading" className="v3-type-section text-[var(--color-text-primary)]">
          실제 모바일 속성 조합
        </h2>
        <div className="w-full max-w-[350px]">
          <CalculatorStep
            step="KeyInput"
            state="Current"
            stateEvidence={{ kind: "active-step", active: true }}
            stepLabel="3 / 5 · 계산기 입력"
            displayValue="입력 후  EXE"
            keySequence="1 2 0 0 0 0 0 0 0 ÷ 0 . 0 5 5 EXE"
            hint="0.55가 아니라 0.055인지 확인하세요."
            showHint
            showStateLabel={false}
            showVerification
            className="min-h-[380px] sm:min-h-[380px]"
            testId="calculator-step-real-mobile"
          />
        </div>
      </section>
    </main>
  );
}

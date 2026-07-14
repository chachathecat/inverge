"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { AccountingTemplateCard } from "@/components/review-os/accounting-template-card";
import { ExecutionResultControls } from "@/components/review-os/execution-result-controls";
import { CalculatorRoutineTrainer } from "@/components/review-os/calculator-routine-trainer";
import {
  CalculatorRoutineSyncStatusLine,
  useCalculatorRoutineLearningSignalSync,
} from "@/components/review-os/calculator-routine-sync-status";
import { DEVICE_APPENDIX_FX_9860GIII, type CalculatorWorkflow } from "@/lib/review-os/calculator-workflow";
import type { CalculatorRoutineRecoveryReference } from "@/lib/review-os/calculator-routine-learning-signal";

type CalculatorWorkflowPageProps = {
  focus?: string | null;
  workflow: CalculatorWorkflow;
  recoveryReference?: CalculatorRoutineRecoveryReference | null;
};

const ROUTINE_STEPS = [
  {
    id: "capture-demand",
    title: "문제 요구와 계산 대상을 적습니다",
    cue: "20초",
  },
  {
    id: "block-values",
    title: "입력값과 중간값을 블록으로 끊습니다",
    cue: "25초",
  },
  {
    id: "close-judgment",
    title: "최종값 뒤에 판단 문장 1개를 붙입니다",
    cue: "15초",
  },
] as const;

const TYPE_TO_STAGE: Record<string, number> = {
  "valuation-adjustment": 0,
  income: 1,
  comparison: 1,
  inventory: 0,
  depreciation: 1,
  "present-value": 2,
};

export function CalculatorWorkflowPage({ focus, workflow, recoveryReference = null }: CalculatorWorkflowPageProps) {
  const [selectedType, setSelectedType] = useState(workflow.problemTypes[0]?.id ?? "");
  const [activeStageIndex, setActiveStageIndex] = useState(() => TYPE_TO_STAGE[workflow.problemTypes[0]?.id ?? ""] ?? 0);
  const calculatorRoutineSync = useCalculatorRoutineLearningSignalSync();

  const activeCard = workflow.stepCards[Math.min(activeStageIndex, workflow.stepCards.length - 1)];
  const selectedTypeMeta = workflow.problemTypes.find((type) => type.id === selectedType) ?? workflow.problemTypes[0];
  const isCasioFocus = workflow.mode === "second" && focus === "casio";
  const isRecoveryMode = Boolean(recoveryReference);
  const resultTaskType = isCasioFocus ? "CASIO" : workflow.context === "accounting" ? "accounting template" : "calculation routine";

  const deviceDraftPaths = useMemo(
    () => workflow.stepCards.map((card) => ({ title: card.title, common: card.buttonPath.common, draft: card.buttonPath.fx9860giiiDraft })),
    [workflow.stepCards],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-[70ch]">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[color:var(--brand-700)] bg-[color:var(--bg-surface)] px-3 py-1 text-xs text-[color:var(--brand-700)]">
                {workflow.mode === "first" ? "감평 1차" : "감평 2차"}
              </span>
              <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-1 text-xs text-[color:var(--muted)]">
                {workflow.subject}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.035em] text-[color:var(--foreground-strong)]">{workflow.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{isCasioFocus ? "CASIO 계산형 연습입니다. 답안 전문 작성이 아니라 계산기 입력 순서, 단위 확인, 판단 문장 연결만 고정합니다." : "계산 결과를 답안 판단으로 연결합니다. 지금은 한 번에 한 루틴만 고정합니다."}</p>
          </div>
          <Link href={`/app?mode=${workflow.mode}`}>
            <Button type="button" variant="outline">
              오늘로 돌아가기
            </Button>
          </Link>
        </div>
      </section>

      {recoveryReference ? (
        <section
          className="rounded-[var(--radius-card)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-5 md:p-6"
          data-calculator-routine-recovery-section
        >
          <p className="text-caption text-[color:var(--brand-700)]">계산·검산 복구</p>
          <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">계산·검산 다시 하기</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            이전 계산·검산 기록에서 남은 신호를 다시 확인합니다.
          </p>
          <div className="mt-4 space-y-3">
            <CalculatorRoutineTrainer
              source={recoveryReference.source}
              examMode="second"
              subject={workflow.subject}
              routineId={recoveryReference.routineId}
              eligibility={{
                eligible: true,
                manualEligible: false,
                hasStrongSignal: true,
                reason: "eligible",
              }}
              onComplete={calculatorRoutineSync.syncCompletion}
            />
            <CalculatorRoutineSyncStatusLine
              status={calculatorRoutineSync.status}
              retryAvailable={calculatorRoutineSync.retryAvailable}
              onRetry={calculatorRoutineSync.retry}
            />
          </div>
        </section>
      ) : null}

      {isCasioFocus && !isRecoveryMode ? (
        <section data-calculator-routine-v3 aria-label="fx-9860GIII 계산·검산 실행">
          <CalculatorRoutineTrainer
            source="answer-review"
            examMode="second"
            subject={workflow.subject}
            eligibility={{
              eligible: false,
              manualEligible: true,
              hasStrongSignal: false,
              reason: "manual_practice",
            }}
            onComplete={calculatorRoutineSync.syncCompletion}
          />
          <div className="mt-3">
            <CalculatorRoutineSyncStatusLine
              status={calculatorRoutineSync.status}
              retryAvailable={calculatorRoutineSync.retryAvailable}
              onRetry={calculatorRoutineSync.retry}
            />
          </div>
        </section>
      ) : null}

      {workflow.context === "accounting" ? <AccountingTemplateCard /> : null}

      {!isCasioFocus ? (
        <section className="rounded-[var(--radius-card)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-5 md:p-6">
          <p className="text-caption text-[color:var(--brand-700)]">오늘 계산 루틴 1개</p>
        <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">계산 실수 방지 3단계</h3>
        <ol className="mt-4 space-y-2">
          {ROUTINE_STEPS.map((step, index) => (
            <li key={step.id} className="flex gap-3 rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2 text-sm leading-6 text-[color:var(--foreground-strong)]">
              <span className="tabular-nums text-[color:var(--muted)]">{index + 1}</span>
              <span>{step.title}</span>
            </li>
          ))}
        </ol>
        </section>
      ) : null}

      {!isCasioFocus ? (
        <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-4">
        <div className="flex flex-wrap gap-2">
          {workflow.problemTypes.map((type) => {
            const isActive = type.id === selectedType;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setSelectedType(type.id);
                  setActiveStageIndex(TYPE_TO_STAGE[type.id] ?? 0);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  isActive
                    ? "border-[color:var(--brand-700)] bg-[color:var(--brand-050)] text-[color:var(--brand-700)]"
                    : "border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] text-[color:var(--muted)]"
                }`}
                aria-pressed={isActive}
              >
                {type.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">{selectedTypeMeta?.description}</p>
        </section>
      ) : null}

      {activeCard && !isCasioFocus ? (
        <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
          <p className="text-caption text-[color:var(--cue-focus)]">지금 할 일</p>
          <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">{activeCard.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{activeCard.whenToUse}</p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CardList label="먼저 적을 값" items={activeCard.valuesToWriteFirst} />
            <CardList label="계산 순서" items={activeCard.calculationOrder} ordered />
          </div>

          <div className="mt-3 rounded-2xl border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-4 py-3">
            <p className="text-caption text-[color:var(--cue-focus)]">답안에 옮길 문장</p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-strong)]">{activeCard.copyToAnswer}</p>
          </div>

          <details className="mt-3 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">실수 방지 보기</summary>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-[color:var(--foreground-strong)]">
              {activeCard.commonMistakes.map((mistake) => (
                <li key={mistake}>• {mistake}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">검산 체크: {activeCard.verificationCheck}</p>
          </details>
        </section>
      ) : null}

      {!isCasioFocus ? (
        <section className="rounded-[var(--radius-card)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-5">
          <p className="text-caption text-[color:var(--brand-700)]">마무리 실행</p>
        <h3 className="mt-1 text-title text-[color:var(--foreground-strong)]">1분 드릴 시작</h3>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--foreground-strong)]">
          {ROUTINE_STEPS.map((step) => (
            <li key={step.id} className="rounded-xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] px-3 py-2">
              {step.cue}: {step.title}
            </li>
          ))}
        </ul>
        </section>
      ) : null}

      {!isRecoveryMode && !isCasioFocus ? (
        <ExecutionResultControls
          examMode={workflow.mode}
          executionSource="calculator"
          subjectName={workflow.subject}
          taskType={resultTaskType}
        />
      ) : null}

      <details className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
        <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">시험 전 체크 / 기본 세팅 보기</summary>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SimpleListCard title="시험 전 체크" items={workflow.preExamChecks} />
          <SimpleListCard title="기본 세팅" items={workflow.basicSetup} />
        </div>
      </details>

      <details className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-surface)] p-5">
        <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">기기 부록 보기 (Draft/Beta)</summary>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          기기별 조작은 Draft/Beta 부록입니다. 지금은 답안에 남길 값과 문장을 먼저 고정합니다.
        </p>
        <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">{DEVICE_APPENDIX_FX_9860GIII.caution}</p>

        <div className="mt-4 grid gap-3">
          {deviceDraftPaths.map((path) => (
            <div key={path.title} className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{path.title}</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">공통 조작 원칙: {path.common}</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">FX-9860GIII Draft: {path.draft}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {DEVICE_APPENDIX_FX_9860GIII.sections.map((section) => (
            <div key={section.title} className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{section.title}</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-[color:var(--muted)]">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function CardList({ label, items, ordered = false }: { label: string; items: string[]; ordered?: boolean }) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <ListTag className="mt-2 space-y-2">
        {items.map((item, index) => (
          <li key={item} className="flex gap-3 text-sm leading-6 text-[color:var(--foreground-strong)]">
            {ordered ? <span className="tabular-nums text-[color:var(--muted)]">{index + 1}</span> : null}
            <span>{item}</span>
          </li>
        ))}
      </ListTag>
    </div>
  );
}

function SimpleListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
      <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{title}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-[color:var(--foreground-strong)]">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </section>
  );
}

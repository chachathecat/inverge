"use client";

import { useEffect, useMemo, useState, useId } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  appendCalculatorRoutineCompletionSignal,
  buildCalculatorRoutineCompletionSignal,
  CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY,
  CALCULATOR_ROUTINE_MISTAKE_OPTIONS,
  CALCULATOR_ROUTINE_STEPS,
  CALCULATOR_ROUTINE_VERIFICATION_OPTIONS,
  createCalculatorRoutineDraft,
  getCalculatorRoutineDraftStorageKey,
  getCalculatorRoutineIdFromDraftStorageKey,
  getCalculatorRoutineProgress,
  isCalculatorRoutineStepComplete,
  normalizeCalculatorRoutineMistakeTypes,
  parseCalculatorRoutineCompletionHistory,
  parseCalculatorRoutineDraftFromSession,
  serializeCalculatorRoutineCompletionHistoryForLocalStorage,
  serializeCalculatorRoutineDraftForSession,
  updateCalculatorRoutineDraftCurrentStep,
  updateCalculatorRoutineDraftStep,
  type CalculatorRoutineCompletionSignalV1,
  type CalculatorRoutineDraftV1,
  type CalculatorRoutineEligibility,
  type CalculatorRoutineExamMode,
  type CalculatorRoutineMistakeType,
  type CalculatorRoutineSource,
  type CalculatorRoutineStepId,
  type CalculatorRoutineTextStepId,
  type CalculatorRoutineVerificationMethod,
} from "@/lib/review-os/calculator-routine";
import { cn } from "@/lib/utils";

export type CalculatorRoutineReferenceHints = Partial<Record<CalculatorRoutineStepId, string[]>>;

export type CalculatorRoutineDraftReference = {
  routineId: string;
  draftKey: string;
};

export type CalculatorRoutineReferenceAccess = {
  routineId: string;
  unlocked: boolean;
  completed: boolean;
};

type CalculatorRoutineTrainerProps = {
  source: CalculatorRoutineSource;
  examMode: CalculatorRoutineExamMode;
  subject: string;
  eligibility: CalculatorRoutineEligibility;
  referenceHints?: CalculatorRoutineReferenceHints;
  routineId?: string | null;
  resumeDraftKey?: string | null;
  className?: string;
  onDraftReferenceChange?: (reference: CalculatorRoutineDraftReference) => void;
  onReferenceAccessChange?: (access: CalculatorRoutineReferenceAccess) => void;
  onComplete?: (signal: CalculatorRoutineCompletionSignalV1) => void;
};

type TrainerState = "collapsed" | "active" | "completed";
type StorageStatus = "idle" | "session" | "saved" | "failed";

const textStepIds = new Set<CalculatorRoutineStepId>([
  "conditions",
  "formula",
  "numbers_units",
  "casio_input",
  "display_value",
  "answer_value",
  "unit_rounding",
]);

const stepInputPrompts: Record<CalculatorRoutineStepId, string> = {
  conditions: "문제에서 실제로 쓸 조건을 내 말로 적어 주세요.",
  formula: "선택한 산식과 선택 이유를 짧게 적어 주세요.",
  numbers_units: "대입할 숫자와 단위를 원문과 대조하며 적어 주세요.",
  casio_input: "계산기에 누를 순서 또는 입력식을 적어 주세요.",
  display_value: "계산기 화면에 나온 값을 그대로 적어 주세요.",
  answer_value: "답안에 옮겨 적을 값을 반올림 전후로 구분해 적어 주세요.",
  unit_rounding: "단위와 반올림 기준을 적어 주세요.",
  verification: "수행한 검산 방법을 선택하고 필요하면 메모를 남겨 주세요.",
  mistake_type: "이번 루틴에서 확인한 실수 유형을 선택해 주세요.",
};

const fallbackReferenceHints: Partial<Record<CalculatorRoutineStepId, string>> = {
  casio_input: "RUN-MAT을 기본으로 두고, 특수 모드가 필요하다고 단정하지 않습니다.",
  verification: "역산, 단위 검산, 크기 검산 중 하나 이상을 직접 수행해 보세요.",
  mistake_type: "실수가 없으면 ‘실수 없음’을 단독으로 선택할 수 있습니다.",
};

const noReferenceHintFallback = "제공할 참고 신호가 없습니다. 원문 조건과 숫자·단위를 직접 대조해 주세요.";

const safeHintsForStep = (referenceHints: CalculatorRoutineReferenceHints | undefined, stepId: CalculatorRoutineStepId) => {
  const values = (referenceHints?.[stepId] ?? []).map((item) => item.trim()).filter(Boolean);
  const fallback = fallbackReferenceHints[stepId];
  return fallback ? [...values, fallback] : values;
};

const isTextStepId = (stepId: CalculatorRoutineStepId): stepId is CalculatorRoutineTextStepId => textStepIds.has(stepId);

const readDraftFromStorage = (storageKey: string, fallbackDraft: CalculatorRoutineDraftV1) => {
  if (typeof window === "undefined") return fallbackDraft;
  const parsed = parseCalculatorRoutineDraftFromSession(window.sessionStorage.getItem(storageKey));
  return parsed ?? fallbackDraft;
};

export function CalculatorRoutineTrainer({
  source,
  examMode,
  subject,
  eligibility,
  referenceHints,
  routineId,
  resumeDraftKey,
  className,
  onDraftReferenceChange,
  onReferenceAccessChange,
  onComplete,
}: CalculatorRoutineTrainerProps) {
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const storageRoutineId = useMemo(
    () => routineId ?? getCalculatorRoutineIdFromDraftStorageKey(resumeDraftKey) ?? `${source}-${examMode}-${generatedId}`,
    [examMode, generatedId, resumeDraftKey, routineId, source],
  );
  const draftStorageKey = getCalculatorRoutineDraftStorageKey(storageRoutineId);
  const draftLoadKey = resumeDraftKey ?? draftStorageKey;
  const [trainerState, setTrainerState] = useState<TrainerState>("collapsed");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("idle");
  const [liveMessage, setLiveMessage] = useState("계산·검산 루틴을 시작할 수 있습니다.");
  const [revealedHintStepIds, setRevealedHintStepIds] = useState<CalculatorRoutineStepId[]>([]);
  const [draft, setDraft] = useState<CalculatorRoutineDraftV1>(() => {
    const fallbackDraft = createCalculatorRoutineDraft({
      source,
      examMode,
      subject,
      routineId: storageRoutineId,
    });
    return readDraftFromStorage(draftLoadKey, fallbackDraft);
  });
  const [completionSignal, setCompletionSignal] = useState<CalculatorRoutineCompletionSignalV1 | null>(null);

  const canRender = eligibility.eligible || eligibility.manualEligible;
  const currentStepIndex = Math.max(0, CALCULATOR_ROUTINE_STEPS.findIndex((step) => step.id === draft.currentStepId));
  const currentStep = CALCULATOR_ROUTINE_STEPS[currentStepIndex] ?? CALCULATOR_ROUTINE_STEPS[0];
  const progress = getCalculatorRoutineProgress(draft);
  const currentStepComplete = isCalculatorRoutineStepComplete(draft, currentStep.id);
  const currentTextStepId = isTextStepId(currentStep.id) ? currentStep.id : null;
  const activeHints = safeHintsForStep(referenceHints, currentStep.id);
  const hasActiveHints = activeHints.length > 0;
  const visibleHints = hasActiveHints ? activeHints : [noReferenceHintFallback];
  const currentTextValue = currentTextStepId ? draft.entries[currentTextStepId] ?? "" : draft.entries[currentStep.id] ?? "";
  const isCurrentStepStuck = draft.stuckStepIds.includes(currentStep.id);
  const hasAttemptForReveal =
    currentTextValue.trim().length > 0 ||
    isCurrentStepStuck ||
    (currentStep.id === "verification" && draft.verificationMethods.length > 0) ||
    (currentStep.id === "mistake_type" && draft.mistakeTypes.length > 0);
  const isHintRevealed = revealedHintStepIds.includes(currentStep.id);
  const entryButtonLabel = eligibility.eligible ? "계산·검산 루틴 시작" : "계산형 문제라면 루틴 시작";
  const hasAnyRoutineAttempt =
    Object.values(draft.entries).some((value) => value?.trim()) ||
    draft.verificationMethods.length > 0 ||
    draft.mistakeTypes.length > 0 ||
    draft.stuckStepIds.length > 0;
  const isReferenceUnlocked = trainerState === "completed" || hasAnyRoutineAttempt;

  useEffect(() => {
    if (!canRender || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(draftStorageKey, serializeCalculatorRoutineDraftForSession(draft));
    } catch {
      // Session storage is a local convenience only; routine completion must not depend on it.
    }
    onDraftReferenceChange?.({ routineId: draft.routineId, draftKey: draftStorageKey });
  }, [canRender, draft, draftStorageKey, onDraftReferenceChange]);

  useEffect(() => {
    if (!canRender) return;
    onReferenceAccessChange?.({
      routineId: draft.routineId,
      unlocked: isReferenceUnlocked,
      completed: trainerState === "completed",
    });
  }, [canRender, draft.routineId, isReferenceUnlocked, onReferenceAccessChange, trainerState]);

  if (!canRender) return null;

  const moveToStep = (stepId: CalculatorRoutineStepId) => {
    setDraft((current) => updateCalculatorRoutineDraftCurrentStep(current, stepId));
    const step = CALCULATOR_ROUTINE_STEPS.find((item) => item.id === stepId);
    setLiveMessage(step ? `${step.label} 단계입니다.` : "계산·검산 루틴 단계입니다.");
  };

  const updateTextEntry = (stepId: CalculatorRoutineTextStepId, value: string) => {
    setDraft((current) => updateCalculatorRoutineDraftStep(current, stepId, value));
  };

  const toggleVerificationMethod = (method: CalculatorRoutineVerificationMethod) => {
    setDraft((current) => {
      const hasMethod = current.verificationMethods.includes(method);
      const verificationMethods = hasMethod
        ? current.verificationMethods.filter((item) => item !== method)
        : [...current.verificationMethods, method];
      const stuckStepIds = verificationMethods.length > 0
        ? current.stuckStepIds.filter((item) => item !== "verification")
        : current.stuckStepIds;
      return { ...current, verificationMethods, stuckStepIds, updatedAt: new Date().toISOString() };
    });
  };

  const toggleMistakeType = (mistakeType: CalculatorRoutineMistakeType) => {
    setDraft((current) => {
      const currentValues = normalizeCalculatorRoutineMistakeTypes(current.mistakeTypes);
      let mistakeTypes: CalculatorRoutineMistakeType[];
      if (mistakeType === "none") {
        mistakeTypes = currentValues.includes("none") ? [] : ["none"];
      } else {
        const withoutNone = currentValues.filter((item) => item !== "none");
        mistakeTypes = withoutNone.includes(mistakeType)
          ? withoutNone.filter((item) => item !== mistakeType)
          : [...withoutNone, mistakeType];
      }
      const stuckStepIds = mistakeTypes.length > 0
        ? current.stuckStepIds.filter((item) => item !== "mistake_type")
        : current.stuckStepIds;
      return { ...current, mistakeTypes, stuckStepIds, updatedAt: new Date().toISOString() };
    });
  };

  const markStuckAndReveal = () => {
    setDraft((current) => ({
      ...current,
      stuckStepIds: current.stuckStepIds.includes(currentStep.id)
        ? current.stuckStepIds
        : [...current.stuckStepIds, currentStep.id],
      hintUsedStepIds: current.hintUsedStepIds.includes(currentStep.id)
        ? current.hintUsedStepIds
        : [...current.hintUsedStepIds, currentStep.id],
      updatedAt: new Date().toISOString(),
    }));
    setRevealedHintStepIds((current) => current.includes(currentStep.id) ? current : [...current, currentStep.id]);
    setLiveMessage("막힌 단계로 표시하고 참고 신호를 열었습니다. 실패 기록이 아닙니다.");
  };

  const revealReferenceHint = () => {
    if (!hasAttemptForReveal) return;
    setDraft((current) => ({
      ...current,
      hintUsedStepIds: current.hintUsedStepIds.includes(currentStep.id)
        ? current.hintUsedStepIds
        : [...current.hintUsedStepIds, currentStep.id],
      updatedAt: new Date().toISOString(),
    }));
    setRevealedHintStepIds((current) => current.includes(currentStep.id) ? current : [...current, currentStep.id]);
    setLiveMessage("참고 신호를 열었습니다. 입력값은 바뀌지 않습니다.");
  };

  const goBack = () => {
    const previousStep = CALCULATOR_ROUTINE_STEPS[Math.max(0, currentStepIndex - 1)];
    moveToStep(previousStep.id);
  };

  const goNext = () => {
    if (!currentStepComplete) return;
    if (currentStepIndex < CALCULATOR_ROUTINE_STEPS.length - 1) {
      const nextStep = CALCULATOR_ROUTINE_STEPS[currentStepIndex + 1];
      moveToStep(nextStep.id);
      return;
    }
    let signal: CalculatorRoutineCompletionSignalV1;
    try {
      signal = buildCalculatorRoutineCompletionSignal(draft);
    } catch {
      setLiveMessage("루틴 완료 조건을 먼저 확인해 주세요.");
      return;
    }

    setCompletionSignal(signal);
    setTrainerState("completed");
    onComplete?.(signal);

    try {
      if (typeof window !== "undefined") {
        const history = parseCalculatorRoutineCompletionHistory(window.localStorage.getItem(CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY));
        const nextHistory = appendCalculatorRoutineCompletionSignal(history, signal);
        window.localStorage.setItem(
          CALCULATOR_ROUTINE_COMPLETION_STORAGE_KEY,
          serializeCalculatorRoutineCompletionHistoryForLocalStorage(nextHistory),
        );
        setStorageStatus("saved");
      }
      setLiveMessage("계산·검산 루틴 완료 상태입니다.");
    } catch {
      setStorageStatus("failed");
      setLiveMessage("루틴 완료, 기기 학습 기록 저장 실패");
    }
  };

  return (
    <article
      className={cn("rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4", className)}
      data-calculator-routine-trainer
      data-calculator-routine-source={source}
      data-calculator-routine-state={trainerState}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-caption font-medium text-[color:var(--muted)]">계산·검산 루틴</p>
          <h3 className="text-base font-semibold text-[color:var(--foreground-strong)]">계산·검산 루틴</h3>
          <p className="text-caption leading-5 text-[color:var(--muted)]">
            정답 판정이 아니라 내 계산 과정을 점검하는 훈련입니다.
          </p>
          {!eligibility.eligible ? (
            <p className="text-caption leading-5 text-[color:var(--muted)]">계산형 문제라면 루틴 시작</p>
          ) : null}
        </div>
        <p className="text-caption text-[color:var(--muted)]">
          {trainerState === "active" ? `단계 ${currentStepIndex + 1}/${CALCULATOR_ROUTINE_STEPS.length}` : `${progress.completedCount}/${progress.totalCount} 완료`}
        </p>
      </div>

      <p className="sr-only" aria-live="polite">{liveMessage}</p>

      {trainerState === "collapsed" ? (
        <div className="mt-4">
          <button
            type="button"
            className={cn(buttonVariants({ variant: eligibility.eligible ? "default" : "outline" }), "h-10 w-full sm:w-auto")}
            onClick={() => {
              setTrainerState("active");
              setStorageStatus((prev) => (prev === "saved" ? prev : "session"));
              setLiveMessage("조건 정리 단계입니다.");
            }}
          >
            {entryButtonLabel}
          </button>
        </div>
      ) : null}

      {trainerState === "active" ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
            <p className="text-caption font-medium text-[color:var(--muted)]">단계 {currentStepIndex + 1}/{CALCULATOR_ROUTINE_STEPS.length}</p>
            <h4 className="mt-1 text-sm font-semibold text-[color:var(--foreground-strong)]">{currentStep.label}</h4>
            <p className="mt-1 text-caption leading-5 text-[color:var(--muted)]">{stepInputPrompts[currentStep.id]}</p>
          </div>

          {currentTextStepId ? (
            <label className="block text-caption font-medium text-[color:var(--muted)]">
              {currentStep.label} 입력
              <Textarea
                className="mt-2 min-h-[116px] border-[var(--border)] bg-[color:var(--surface)] focus:border-[color:var(--brand-700)]"
                value={draft.entries[currentTextStepId] ?? ""}
                onChange={(event) => updateTextEntry(currentTextStepId, event.target.value)}
              />
            </label>
          ) : null}

          {currentStep.id === "verification" ? (
            <div className="space-y-3">
              <fieldset className="space-y-2">
                <legend className="text-caption font-medium text-[color:var(--muted)]">검산 방법</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CALCULATOR_ROUTINE_VERIFICATION_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-2 text-caption text-[color:var(--foreground-strong)]">
                      <input
                        type="checkbox"
                        checked={draft.verificationMethods.includes(option.id)}
                        onChange={() => toggleVerificationMethod(option.id)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {isCurrentStepStuck && draft.verificationMethods.length === 0 ? (
                <p className="text-caption leading-5 text-[color:var(--muted)]">
                  참고 신호를 확인한 뒤 실제로 수행한 검산 방법을 하나 이상 선택해 주세요.
                </p>
              ) : null}
              <label className="block text-caption font-medium text-[color:var(--muted)]">
                검산 메모 (선택)
                <Textarea
                  className="mt-2 min-h-[84px] border-[var(--border)] bg-[color:var(--surface)] focus:border-[color:var(--brand-700)]"
                  value={draft.entries.verification ?? ""}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    entries: { ...current.entries, verification: event.target.value },
                    updatedAt: new Date().toISOString(),
                  }))}
                />
              </label>
            </div>
          ) : null}

          {currentStep.id === "mistake_type" ? (
            <div className="space-y-3">
              <fieldset className="space-y-2">
                <legend className="text-caption font-medium text-[color:var(--muted)]">실수 유형</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {CALCULATOR_ROUTINE_MISTAKE_OPTIONS.map((option) => (
                    <label key={option.id} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] p-2 text-caption text-[color:var(--foreground-strong)]">
                      <input
                        type="checkbox"
                        checked={draft.mistakeTypes.includes(option.id)}
                        onChange={() => toggleMistakeType(option.id)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {isCurrentStepStuck && draft.mistakeTypes.length === 0 ? (
                <p className="text-caption leading-5 text-[color:var(--muted)]">
                  확인된 실수 유형을 고르거나, 실수가 없었다면 ‘실수 없음’을 선택해 주세요.
                </p>
              ) : null}
              <label className="block text-caption font-medium text-[color:var(--muted)]">
                기타 메모 (선택)
                <Textarea
                  className="mt-2 min-h-[84px] border-[var(--border)] bg-[color:var(--surface)] focus:border-[color:var(--brand-700)]"
                  value={draft.entries.mistake_type ?? ""}
                  onChange={(event) => setDraft((current) => ({
                    ...current,
                    entries: { ...current.entries, mistake_type: event.target.value },
                    updatedAt: new Date().toISOString(),
                  }))}
                />
              </label>
            </div>
          ) : null}

          <div className="space-y-2" data-calculator-routine-reference-hints>
            <div className="flex flex-wrap gap-2">
              {!currentStepComplete ? (
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "ghost" }), "h-9 px-3")}
                  onClick={markStuckAndReveal}
                >
                  막힘
                </button>
              ) : null}
              <button
                type="button"
                className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3")}
                onClick={revealReferenceHint}
                disabled={!hasAttemptForReveal}
              >
                참고 신호 보기
              </button>
            </div>
            {isHintRevealed ? (
              <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] p-3">
                <p className="text-caption font-medium text-[color:var(--muted)]">
                  AI 생성 초안입니다. 원문·숫자·단위를 직접 대조해 주세요.
                </p>
                <ul className="mt-2 space-y-1 text-caption leading-5 text-[color:var(--foreground-strong)]">
                  {visibleHints.map((hint, index) => <li key={`${hint}-${index}`}>• {hint}</li>)}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-10")}
              onClick={goBack}
              disabled={currentStepIndex === 0}
            >
              뒤로
            </button>
            <button
              type="button"
              className={cn(buttonVariants({ variant: "default" }), "h-10")}
              onClick={goNext}
              disabled={!currentStepComplete}
            >
              {currentStepIndex === CALCULATOR_ROUTINE_STEPS.length - 1 ? "계산·검산 루틴 완료" : "다음 단계"}
            </button>
          </div>
          <p className="text-caption leading-5 text-[color:var(--muted)]">
            {storageStatus === "failed" ? "저장 실패" : storageStatus === "session" ? "임시 세션 상태로 유지됨" : "입력은 이 화면에서만 사용됩니다."}
          </p>
        </div>
      ) : null}

      {trainerState === "completed" ? (
        <div className="mt-4 space-y-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3">
          <p className="text-sm font-medium text-[color:var(--foreground-strong)]">계산·검산 루틴 완료</p>
          <p className="text-caption leading-5 text-[color:var(--muted)]">
            완료는 계산 과정 점검을 수행했다는 뜻이며, 정답 판정이나 결과 확정이 아닙니다.
          </p>
          <p className="text-caption leading-5 text-[color:var(--muted)]">
            {storageStatus === "saved" ? "이 기기의 학습 기록에 저장됨" : "루틴 완료, 기기 학습 기록 저장 실패"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "outline" }), "h-9")}
              onClick={() => {
                setTrainerState("active");
                setLiveMessage("완료된 루틴을 다시 편집합니다.");
              }}
            >
              수정
            </button>
            {completionSignal ? <p className="self-center text-caption text-[color:var(--muted)]">복습 신호로 사용할 수 있습니다.</p> : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

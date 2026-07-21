"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { V3ActionButton, V3Surface } from "@/components/learner";
import { StickyAction } from "@/components/learner/study-ledger-ui";
import { CalculatorStep } from "@/components/review-os/calculator-step";
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
import { buildCalculatorStepPresentation } from "@/lib/review-os/calculator-step-presentation";
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
  presentation?: "embedded" | "embedded-v3" | "focus";
  onDraftReferenceChange?: (reference: CalculatorRoutineDraftReference) => void;
  onReferenceAccessChange?: (access: CalculatorRoutineReferenceAccess) => void;
  onComplete?: (signal: CalculatorRoutineCompletionSignalV1) => void;
};

type TrainerState = "collapsed" | "active" | "completed";
type StorageStatus = "idle" | "session" | "saved" | "failed";
type RunnerViewState = "loading" | "empty" | "error" | "offline" | "active" | "completed";

const interactiveFocusClass =
  "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-700)] focus-visible:ring-offset-2";

function RoutineActionButton({
  focusPresentation,
  tone = "primary",
  legacyVariant = "default",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  focusPresentation: boolean;
  tone?: "primary" | "secondary" | "quiet";
  legacyVariant?: "default" | "outline" | "ghost";
}) {
  if (focusPresentation) return <V3ActionButton tone={tone} className={className} type={type} {...props} />;
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant: legacyVariant }), interactiveFocusClass, className)}
      {...props}
    />
  );
}

function RoutineCompletedSurface({
  focusPresentation,
  storageFailed,
  children,
}: {
  focusPresentation: boolean;
  storageFailed: boolean;
  children: ReactNode;
}) {
  if (focusPresentation) {
    return <V3Surface tone={storageFailed ? "attention" : "stable"} className="space-y-4">{children}</V3Surface>;
  }
  return (
    <div className="space-y-4 rounded-[var(--radius-md)] border border-[color:var(--brand-700)] bg-[color:var(--brand-050)] p-4 sm:p-5">
      {children}
    </div>
  );
}

const subscribeToHydration = () => () => undefined;
const getHydratedSnapshot = () => true;
const getServerHydratedSnapshot = () => false;
const subscribeToConnectivity = (onStoreChange: () => void) => {
  window.addEventListener("online", onStoreChange);
  window.addEventListener("offline", onStoreChange);
  return () => {
    window.removeEventListener("online", onStoreChange);
    window.removeEventListener("offline", onStoreChange);
  };
};
const getOnlineSnapshot = () => window.navigator.onLine;
const getServerOnlineSnapshot = () => true;

const textStepIds = new Set<CalculatorRoutineStepId>([
  "conditions",
  "formula",
  "numbers_units",
  "casio_input",
  "display_value",
  "answer_value",
  "unit_rounding",
]);

const calculatorNotationStepIds = new Set<CalculatorRoutineStepId>([
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
  casio_input: "실제 기기에서 누를 순서 또는 입력식을 그대로 적어 주세요.",
  display_value: "실제 계산기 화면에 나온 값을 그대로 적어 주세요.",
  answer_value: "답안에 옮겨 적을 값을 반올림 전후로 구분해 적어 주세요.",
  unit_rounding: "단위와 반올림 기준을 적어 주세요.",
  verification: "직접 수행한 검산 방법을 선택하고 필요하면 메모를 남겨 주세요.",
  mistake_type: "이번 루틴에서 확인한 실수 유형을 선택해 주세요.",
};

const fallbackReferenceHints: Partial<Record<CalculatorRoutineStepId, string>> = {
  casio_input: "특수 모드나 정확한 타건을 단정하지 않습니다. 실제 기기의 초기 상태와 원문 숫자·단위를 기준으로 직접 확인해 주세요.",
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
  presentation = "embedded",
  onDraftReferenceChange,
  onReferenceAccessChange,
  onComplete,
}: CalculatorRoutineTrainerProps) {
  const isFocusPresentation = presentation === "focus";
  const isEmbeddedV3Presentation = presentation === "embedded-v3";
  const isV3Presentation = isFocusPresentation || isEmbeddedV3Presentation;
  const generatedId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const storageRoutineId = useMemo(
    () => routineId ?? getCalculatorRoutineIdFromDraftStorageKey(resumeDraftKey) ?? `${source}-${examMode}-${generatedId}`,
    [examMode, generatedId, resumeDraftKey, routineId, source],
  );
  const draftStorageKey = getCalculatorRoutineDraftStorageKey(storageRoutineId);
  const draftLoadKey = resumeDraftKey ?? draftStorageKey;
  const [trainerState, setTrainerState] = useState<TrainerState>("collapsed");
  const [storageStatus, setStorageStatus] = useState<StorageStatus>("idle");
  const isHydrated = useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getServerHydratedSnapshot);
  const isOffline = !useSyncExternalStore(subscribeToConnectivity, getOnlineSnapshot, getServerOnlineSnapshot);
  const [liveMessage, setLiveMessage] = useState("계산·검산 루틴을 시작할 수 있습니다.");
  const [revealedHintStepIds, setRevealedHintStepIds] = useState<CalculatorRoutineStepId[]>([]);
  const [draft, setDraft] = useState<CalculatorRoutineDraftV1>(() =>
    createCalculatorRoutineDraft({
      source,
      examMode,
      subject,
      routineId: storageRoutineId,
    }),
  );
  const [restoredDraftKey, setRestoredDraftKey] = useState<string | null>(null);
  const [completionSignal, setCompletionSignal] = useState<CalculatorRoutineCompletionSignalV1 | null>(null);
  const isDraftRestored = restoredDraftKey === draftLoadKey;

  useEffect(() => {
    const fallbackDraft = createCalculatorRoutineDraft({
      source,
      examMode,
      subject,
      routineId: storageRoutineId,
    });
    const restoredDraft = readDraftFromStorage(draftLoadKey, fallbackDraft);
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setDraft(restoredDraft);
      setRestoredDraftKey(draftLoadKey);
    });
    return () => {
      cancelled = true;
    };
  }, [draftLoadKey, examMode, source, storageRoutineId, subject]);

  const canRender = eligibility.eligible || eligibility.manualEligible;
  const currentStepIndex = Math.max(0, CALCULATOR_ROUTINE_STEPS.findIndex((step) => step.id === draft.currentStepId));
  const currentStep = CALCULATOR_ROUTINE_STEPS[currentStepIndex] ?? CALCULATOR_ROUTINE_STEPS[0];
  const usesCalculatorNotation = calculatorNotationStepIds.has(currentStep.id);
  const progress = getCalculatorRoutineProgress(draft);
  const currentStepComplete = isCalculatorRoutineStepComplete(draft, currentStep.id);
  const currentTextStepId = isTextStepId(currentStep.id) ? currentStep.id : null;
  const activeHints = safeHintsForStep(referenceHints, currentStep.id);
  const hasActiveHints = activeHints.length > 0;
  const visibleHints = hasActiveHints ? activeHints : [noReferenceHintFallback];
  const currentTextValue = currentTextStepId ? draft.entries[currentTextStepId] ?? "" : draft.entries[currentStep.id] ?? "";
  const isCurrentStepStuck = draft.stuckStepIds.includes(currentStep.id);
  const calculatorStepPresentation = buildCalculatorStepPresentation(draft, currentStep.id);
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
  const viewState: RunnerViewState = !isHydrated || !isDraftRestored
    ? "loading"
    : !canRender
      ? "error"
      : trainerState === "completed"
        ? "completed"
        : isOffline
          ? "offline"
          : trainerState === "active"
            ? "active"
            : "empty";

  useEffect(() => {
    if (!canRender || !isDraftRestored || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(draftStorageKey, serializeCalculatorRoutineDraftForSession(draft));
    } catch {
      // Session storage is a local convenience only; routine completion must not depend on it.
    }
    onDraftReferenceChange?.({ routineId: draft.routineId, draftKey: draftStorageKey });
  }, [canRender, draft, draftStorageKey, isDraftRestored, onDraftReferenceChange]);

  useEffect(() => {
    if (!canRender || !isDraftRestored) return;
    onReferenceAccessChange?.({
      routineId: draft.routineId,
      unlocked: isReferenceUnlocked,
      completed: trainerState === "completed",
    });
  }, [canRender, draft.routineId, isDraftRestored, isReferenceUnlocked, onReferenceAccessChange, trainerState]);

  if (!canRender) {
    if (isV3Presentation) {
      return (
        <article
          className={cn(
            "rounded-[var(--v3-radius-panel)] border border-[var(--color-border-risk)] bg-[var(--color-background-risk)] p-5 sm:p-6",
            className,
          )}
          data-calculator-routine-trainer
          data-calculator-routine-source={source}
          data-calculator-routine-state="collapsed"
          data-calculator-routine-view-state="error"
          data-calculator-routine-presentation={presentation}
          data-v3-component="UtilityState"
          data-v3-system-state="error"
          role="alert"
        >
          <p className="v3-type-label-strong text-[var(--color-text-risk)]">지원 범위 확인</p>
          <h3 className="v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]">
            지원하지 않는 계산 유형
          </h3>
          <p className="v3-type-compact ko-keep mt-2 text-[var(--color-text-secondary)]">
            이 유형은 아직 안전한 계산·검산 루틴을 제공할 근거가 없습니다. 자동 계산이나 공식 타건 안내를 만들지 않습니다.
          </p>
        </article>
      );
    }

    return (
      <article
        className={cn("rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4", className)}
        data-calculator-routine-trainer
        data-calculator-routine-source={source}
        data-calculator-routine-state="collapsed"
        data-calculator-routine-view-state="error"
        role="status"
      >
        <p className="text-xs font-semibold text-[color:var(--foreground-strong)]">지원하지 않는 계산 유형</p>
        <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
          이 유형은 아직 안전한 계산·검산 루틴을 제공할 근거가 없습니다. 자동 계산이나 공식 타건 안내를 만들지 않습니다.
        </p>
      </article>
    );
  }

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

  const startRoutine = () => {
    setTrainerState("active");
    setStorageStatus((previous) => (previous === "saved" ? previous : "session"));
    setLiveMessage("조건 정리 단계입니다.");
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

  const focusActionLabel = trainerState === "collapsed"
    ? entryButtonLabel
    : currentStepIndex === CALCULATOR_ROUTINE_STEPS.length - 1
      ? "계산·검산 루틴 완료"
      : currentStep.id === "casio_input"
        ? "입력값 확인"
        : `${currentStep.label} 확인`;
  const focusActionStatus = storageStatus === "failed"
    ? "저장 실패 · 입력은 이 탭에 유지됨"
    : isOffline
      ? "오프라인 · 입력은 이 탭에 유지됨"
      : "기기 검증 전 · 수정 가능";

  return (
    <article
      className={cn(
        "overflow-hidden",
        isV3Presentation
          ? "border-0 bg-transparent"
          : "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)]",
        className,
      )}
      data-calculator-routine-trainer
      data-calculator-routine-source={source}
      data-calculator-routine-state={trainerState}
      data-calculator-routine-view-state={viewState}
      data-calculator-routine-presentation={presentation}
    >
      {!isV3Presentation ? (
        <div className="border-b border-[var(--color-border-default)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-2.5 py-1 text-xs font-medium text-[color:var(--foreground-strong)]">
                  CASIO fx-9860GIII
                </span>
                <span className="rounded-full border border-[color:var(--cue-focus)] bg-[color:var(--cue-focus-bg)] px-2.5 py-1 text-xs font-medium text-[color:var(--cue-focus)]">
                  기기 검증 전
                </span>
              </div>
              <h3 className="v3-type-section text-[color:var(--foreground-strong)]">한 단계씩 계산·검산</h3>
              <p className="max-w-[62ch] text-xs leading-5 text-[color:var(--muted)]">
                정답 판정이 아니라 내 계산 과정을 점검하는 훈련입니다. 자동으로 계산하거나 권위 있는 판정·검증된 타건을 제공하지 않습니다.
              </p>
              {!eligibility.eligible ? (
                <p className="text-xs leading-5 text-[color:var(--muted)]">계산형 문제라면 루틴 시작</p>
              ) : null}
            </div>
            <p className="v3-mono-small shrink-0 text-[color:var(--muted)]">
              {trainerState === "active" ? `단계 ${currentStepIndex + 1}/${CALCULATOR_ROUTINE_STEPS.length}` : `${progress.completedCount}/${progress.totalCount} 완료`}
            </p>
          </div>

          <ol className="mt-4 grid grid-cols-9 gap-1.5" aria-label="계산·검산 9단계 진행">
            {CALCULATOR_ROUTINE_STEPS.map((step, index) => {
              const isCurrent = trainerState === "active" && index === currentStepIndex;
              const isComplete = progress.completedStepIds.includes(step.id);
              return (
                <li key={step.id} className="min-w-0">
                  <span
                    className={cn(
                      "block h-1.5 rounded-full bg-[color:var(--border)]",
                      isComplete && "bg-[color:var(--brand-700)]",
                      isCurrent && "h-2 bg-[color:var(--cue-focus)]",
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span className="sr-only">{index + 1}. {step.label}{isComplete ? " 완료" : ""}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : isEmbeddedV3Presentation ? (
        <div
          className="border-y border-[var(--color-border-default)] bg-[var(--color-background-subtle)] px-4 py-4 sm:px-5"
          data-v3-component="CalculatorRoutineEmbedded"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="v3-type-caption text-[var(--color-text-brand)]">
                CASIO fx-9860GIII · 기기 검증 전
              </p>
              <h3 className="v3-type-section ko-keep text-[var(--color-text-primary)]">
                한 단계씩 계산·검산
              </h3>
              <p className="v3-type-compact ko-keep max-w-[62ch] text-[var(--color-text-secondary)]">
                정답 판정이 아니라 내 계산 과정을 점검하는 훈련입니다. 자동 계산이나 검증된 공식 타건을 제공하지 않습니다.
              </p>
            </div>
            <p className="v3-mono-small shrink-0 text-[var(--color-text-secondary)]" role="status">
              {trainerState === "active" ? `단계 ${currentStepIndex + 1}/${CALCULATOR_ROUTINE_STEPS.length}` : `${progress.completedCount}/${progress.totalCount} 완료`}
            </p>
          </div>
          <ol className="mt-4 grid grid-cols-9 gap-1.5" aria-label="계산·검산 9단계 진행">
            {CALCULATOR_ROUTINE_STEPS.map((step, index) => {
              const isCurrent = trainerState === "active" && index === currentStepIndex;
              const isComplete = progress.completedStepIds.includes(step.id);
              return (
                <li key={step.id} className="min-w-0">
                  <span
                    className={cn(
                      "block h-1.5 rounded-full bg-[var(--color-border-default)]",
                      isComplete && "bg-[var(--color-background-brand)]",
                      isCurrent && "h-2 bg-[var(--color-icon-attention)]",
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span className="sr-only">{index + 1}. {step.label}{isComplete ? " 완료" : ""}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <p className="sr-only" role="status">
          {trainerState === "active"
            ? `계산·검산 ${currentStepIndex + 1}/${CALCULATOR_ROUTINE_STEPS.length} · ${currentStep.label}`
            : `계산·검산 ${progress.completedCount}/${progress.totalCount} 완료`}
        </p>
      )}

      <div
        className={cn(
          isV3Presentation
            ? "p-0"
            : "p-4 sm:p-5",
        )}
      >
        <p className="sr-only" aria-live="polite">{liveMessage}</p>
        {!isHydrated || !isDraftRestored ? <p className="sr-only" role="status">루틴을 불러오는 중입니다.</p> : null}
        {isOffline ? (
          <p className={cn(
            "mb-4 border p-3",
            isV3Presentation
              ? "v3-type-compact rounded-[var(--v3-radius-control)] border-[var(--color-border-attention)] bg-[var(--color-background-attention)] text-[var(--color-text-attention)]"
              : "rounded-[var(--radius-sm)] border-[var(--border)] bg-[color:var(--surface-soft)] text-xs leading-5 text-[color:var(--muted)]",
          )} role="status">
            오프라인 상태입니다. 입력은 이 탭의 임시 세션에 유지되며 서버 학습 기록 동기화는 연결 후 다시 확인해 주세요.
          </p>
        ) : null}

        {trainerState === "collapsed" ? (
          <div className={cn(isV3Presentation && "rounded-[var(--v3-radius-panel)] border border-[var(--color-border-focus)] bg-[var(--color-background-focus)] p-5 sm:p-6")}>
            <p className={cn(isV3Presentation ? "v3-type-body ko-keep text-[var(--color-text-primary)]" : "text-xs leading-5 text-[color:var(--muted)]")}>
              조건부터 실수 유형까지 아홉 단계를 한 번에 하나씩 진행합니다. 입력 내용은 이 브라우저 세션에서만 사용합니다.
            </p>
            {isEmbeddedV3Presentation ? (
              <V3ActionButton
                tone="secondary"
                className="mt-4"
                disabled={!isDraftRestored}
                onClick={startRoutine}
              >
                {entryButtonLabel}
              </V3ActionButton>
            ) : !isFocusPresentation ? (
              <button
                type="button"
                className={cn(buttonVariants({ variant: "default" }), interactiveFocusClass, "mt-4 w-full px-5 sm:w-auto")}
                disabled={!isDraftRestored}
                onClick={startRoutine}
              >
                {entryButtonLabel}
              </button>
            ) : null}
          </div>
        ) : null}

        {trainerState === "active" ? (
          <div className="space-y-5">
            <section
              className={cn(
                "rounded-[var(--v3-radius-panel)] bg-[var(--color-background-surface)]",
                isV3Presentation
                  ? calculatorStepPresentation
                    ? "border-0 p-0 shadow-none"
                    : "border border-[var(--color-border-default)] p-5 shadow-none sm:p-6"
                  : "border border-[color:var(--brand-700)] p-4 shadow-sm sm:p-5",
              )}
              data-calculator-routine-active-step={currentStep.id}
              aria-labelledby={`calculator-routine-step-${currentStep.id}`}
            >
              {calculatorStepPresentation ? (
                <CalculatorStep
                  {...calculatorStepPresentation}
                  className="mb-5 max-w-none"
                  testId="calculator-step-runner-v3"
                />
              ) : null}
              <p className={cn("v3-type-caption font-semibold", isV3Presentation ? "text-[var(--color-text-brand)]" : "text-[color:var(--brand-700)]")}>지금 할 일 · {currentStepIndex + 1}/{CALCULATOR_ROUTINE_STEPS.length}</p>
              <h4 id={`calculator-routine-step-${currentStep.id}`} className={cn("v3-type-item mt-1", isV3Presentation ? "text-[var(--color-text-primary)]" : "text-[color:var(--foreground-strong)]")}>{currentStep.label}</h4>
              <p className={cn("mt-2", isV3Presentation ? "v3-type-compact ko-keep text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]")}>{stepInputPrompts[currentStep.id]}</p>

              {currentTextStepId ? (
                <label className={cn("mt-5 block", isV3Presentation ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-xs font-medium text-[color:var(--foreground-strong)]")}>
                  {currentStep.label} 입력
                  <Textarea
                    className={cn(
                      isV3Presentation
                        ? "v3-type-body min-h-[132px] rounded-[var(--v3-radius-control)] border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        : "mt-2 min-h-[132px] border-[var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--brand-700)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand-700)]",
                      isV3Presentation && "mt-2",
                      usesCalculatorNotation && "v3-calculator-input",
                    )}
                    data-v3-typography-role={usesCalculatorNotation ? "calculator-mono" : "ui-body"}
                    value={draft.entries[currentTextStepId] ?? ""}
                    onChange={(event) => updateTextEntry(currentTextStepId, event.target.value)}
                  />
                </label>
              ) : null}

              {currentStep.id === "verification" ? (
                <div className="mt-5 space-y-4">
                  <fieldset className="space-y-2">
                    <legend className={isV3Presentation ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-xs font-medium text-[color:var(--foreground-strong)]"}>직접 수행한 검산 방법</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CALCULATOR_ROUTINE_VERIFICATION_OPTIONS.map((option) => (
                        <label key={option.id} className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2",
                          isV3Presentation
                            ? "v3-type-compact rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] focus-within:ring-2 focus-within:ring-[var(--focus-ring)]"
                            : "rounded-[var(--radius-sm)] border-[var(--border)] text-xs text-[color:var(--foreground-strong)] focus-within:ring-2 focus-within:ring-[color:var(--brand-700)]",
                        )}>
                          <input
                            type="checkbox"
                            className="size-4 focus-visible:outline-none"
                            checked={draft.verificationMethods.includes(option.id)}
                            onChange={() => toggleVerificationMethod(option.id)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {isCurrentStepStuck && draft.verificationMethods.length === 0 ? (
                    <p className={isV3Presentation ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]"}>
                      참고 신호를 확인한 뒤 실제로 수행한 검산 방법을 하나 이상 선택해 주세요.
                    </p>
                  ) : null}
                  <label className={isV3Presentation ? "v3-type-label-strong block text-[var(--color-text-primary)]" : "block text-xs font-medium text-[color:var(--foreground-strong)]"}>
                    검산 메모 (선택)
                    <Textarea
                      className={isV3Presentation
                        ? "v3-type-body mt-2 min-h-[96px] rounded-[var(--v3-radius-control)] border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        : "mt-2 min-h-[96px] border-[var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--brand-700)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand-700)]"}
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
                <div className="mt-5 space-y-4">
                  <fieldset className="space-y-2">
                    <legend className={isV3Presentation ? "v3-type-label-strong text-[var(--color-text-primary)]" : "text-xs font-medium text-[color:var(--foreground-strong)]"}>확인한 실수 유형</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {CALCULATOR_ROUTINE_MISTAKE_OPTIONS.map((option) => (
                        <label key={option.id} className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 border px-3 py-2",
                          isV3Presentation
                            ? "v3-type-compact rounded-[var(--v3-radius-control)] border-[var(--color-border-default)] bg-[var(--color-background-surface)] text-[var(--color-text-primary)] focus-within:ring-2 focus-within:ring-[var(--focus-ring)]"
                            : "rounded-[var(--radius-sm)] border-[var(--border)] text-xs text-[color:var(--foreground-strong)] focus-within:ring-2 focus-within:ring-[color:var(--brand-700)]",
                        )}>
                          <input
                            type="checkbox"
                            className="size-4 focus-visible:outline-none"
                            checked={draft.mistakeTypes.includes(option.id)}
                            onChange={() => toggleMistakeType(option.id)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {isCurrentStepStuck && draft.mistakeTypes.length === 0 ? (
                    <p className={isV3Presentation ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]"}>
                      확인된 실수 유형을 고르거나, 실수가 없었다면 ‘실수 없음’을 선택해 주세요.
                    </p>
                  ) : null}
                  <label className={isV3Presentation ? "v3-type-label-strong block text-[var(--color-text-primary)]" : "block text-xs font-medium text-[color:var(--foreground-strong)]"}>
                    기타 메모 (선택)
                    <Textarea
                      className={isV3Presentation
                        ? "v3-type-body mt-2 min-h-[96px] rounded-[var(--v3-radius-control)] border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] focus:border-[var(--color-border-focus)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                        : "mt-2 min-h-[96px] border-[var(--border)] bg-[color:var(--surface)] text-sm focus:border-[color:var(--brand-700)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand-700)]"}
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
            </section>

            <div className="space-y-3" data-calculator-routine-reference-hints>
              <div className="flex flex-wrap gap-2">
                {!currentStepComplete ? (
                  <RoutineActionButton
                    focusPresentation={isV3Presentation}
                    tone="quiet"
                    legacyVariant="ghost"
                    className={isV3Presentation ? undefined : "px-3"}
                    onClick={markStuckAndReveal}
                  >
                    이 단계에서 막힘
                  </RoutineActionButton>
                ) : null}
                <RoutineActionButton
                  focusPresentation={isV3Presentation}
                  tone="secondary"
                  legacyVariant="outline"
                  className={isV3Presentation ? undefined : "px-3"}
                  onClick={revealReferenceHint}
                  disabled={!hasAttemptForReveal}
                >
                  참고 신호 보기
                </RoutineActionButton>
              </div>
              {isHintRevealed ? (
                <div
                  className={isV3Presentation
                    ? "rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-subtle)] p-4"
                    : "rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-3"}
                  data-v3-component={isV3Presentation ? "Surface" : undefined}
                >
                  <p className={isV3Presentation ? "v3-type-label text-[var(--color-text-secondary)]" : "text-xs font-medium text-[color:var(--muted)]"}>
                    AI 생성 초안입니다. 원문·숫자·단위를 직접 대조해 주세요.
                  </p>
                  <ul className={isV3Presentation ? "v3-type-compact mt-2 space-y-1 text-[var(--color-text-primary)]" : "mt-2 space-y-1 text-xs leading-5 text-[color:var(--foreground-strong)]"}>
                    {visibleHints.map((hint, index) => <li key={`${hint}-${index}`}>• {hint}</li>)}
                  </ul>
                </div>
              ) : null}
            </div>

            {isFocusPresentation ? (
              <div className="space-y-2" data-calculator-routine-adjacent-steps>
                <button
                  type="button"
                  className="v3-type-compact flex min-h-12 w-full items-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-4 text-left text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
                  onClick={goBack}
                  disabled={currentStepIndex === 0}
                >
                  <span className="min-w-0 flex-1 truncate">
                    이전 · {CALCULATOR_ROUTINE_STEPS[Math.max(0, currentStepIndex - 1)]?.label}
                  </span>
                  <span className="v3-type-caption ml-3 shrink-0 text-[var(--color-text-stable)]">
                    {currentStepIndex === 0 ? "없음" : "완료"}
                  </span>
                </button>
                <div className="v3-type-compact flex min-h-12 w-full items-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-4 text-[var(--color-text-primary)]">
                  <span className="min-w-0 flex-1 truncate">
                    다음 · {CALCULATOR_ROUTINE_STEPS[currentStepIndex + 1]?.label ?? "루틴 완료"}
                  </span>
                  <span className="v3-type-caption ml-3 shrink-0 text-[var(--color-text-secondary)]">
                    대기
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <RoutineActionButton
                  focusPresentation={isV3Presentation}
                  tone="secondary"
                  legacyVariant="outline"
                  className={isV3Presentation ? undefined : "w-full px-4 sm:w-auto"}
                  onClick={goBack}
                  disabled={currentStepIndex === 0}
                >
                  이전 단계
                </RoutineActionButton>
                <RoutineActionButton
                  focusPresentation={isV3Presentation}
                  tone={isEmbeddedV3Presentation ? "secondary" : "primary"}
                  className={isV3Presentation ? undefined : "w-full px-5 sm:w-auto"}
                  onClick={goNext}
                  disabled={!currentStepComplete}
                >
                  {currentStepIndex === CALCULATOR_ROUTINE_STEPS.length - 1
                    ? "계산·검산 루틴 완료"
                    : `다음 · ${CALCULATOR_ROUTINE_STEPS[currentStepIndex + 1]?.label ?? "계속"}`}
                </RoutineActionButton>
              </div>
            )}
            <p className={isV3Presentation ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]"}>
              {storageStatus === "failed" ? "저장 실패" : storageStatus === "session" ? "임시 세션 상태로 유지됨" : "입력은 이 화면에서만 사용됩니다."}
            </p>
          </div>
        ) : null}

        {isFocusPresentation && trainerState !== "completed" ? (
          trainerState === "collapsed" && isDraftRestored ? (
            <StickyAction
              label={focusActionLabel}
              status={focusActionStatus}
              responsive
              onAction={startRoutine}
              testId="calculator-focus-action"
            />
          ) : trainerState === "active" && currentStepComplete ? (
            <StickyAction
              label={focusActionLabel}
              status={focusActionStatus}
              responsive
              onAction={goNext}
              testId="calculator-focus-action"
            />
          ) : (
            <StickyAction
              label={focusActionLabel}
              status={focusActionStatus}
              responsive
              state="Disabled"
              controllerEvidence={{
                kind: "action-disabled",
                disabled: true,
                reason: trainerState === "collapsed" ? "루틴을 불러오는 중" : "현재 단계 입력 필요",
              }}
              testId="calculator-focus-action"
            />
          )
        ) : null}

        {trainerState === "completed" ? (
          <RoutineCompletedSurface
            focusPresentation={isV3Presentation}
            storageFailed={storageStatus === "failed"}
          >
            <div>
              <p className={isV3Presentation ? `v3-type-caption ${storageStatus === "failed" ? "text-[var(--color-text-attention)]" : "text-[var(--color-text-stable)]"}` : "text-xs font-semibold text-[color:var(--brand-700)]"}>9/9 단계 기록됨</p>
              <p className={isV3Presentation ? "v3-type-section ko-keep mt-1 text-[var(--color-text-primary)]" : "mt-1 text-lg font-semibold text-[color:var(--foreground-strong)]"}>계산·검산 루틴 완료</p>
            </div>
            <p className={isV3Presentation ? "v3-type-compact ko-keep text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]"}>
              완료는 계산 과정 점검을 수행했다는 뜻이며, 정답 판정이나 결과 확정이 아닙니다. 실제 fx-9860GIII 동작은 아직 기기 검증 전입니다.
            </p>
            <p className={isV3Presentation ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs leading-5 text-[color:var(--muted)]"}>
              {storageStatus === "saved" ? "이 기기의 학습 기록에 저장됨" : "루틴 완료, 기기 학습 기록 저장 실패"}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <RoutineActionButton
                focusPresentation={isV3Presentation}
                tone="secondary"
                legacyVariant="outline"
                className={isV3Presentation ? undefined : "w-full px-4 sm:w-auto"}
                onClick={() => {
                  setTrainerState("active");
                  setLiveMessage("완료된 루틴을 다시 편집합니다.");
                }}
              >
                입력 수정
              </RoutineActionButton>
              {completionSignal ? <p className={isV3Presentation ? "v3-type-caption text-[var(--color-text-secondary)]" : "text-xs text-[color:var(--muted)]"}>복습 신호로 사용할 수 있습니다.</p> : null}
            </div>
          </RoutineCompletedSurface>
        ) : null}
      </div>
    </article>
  );
}

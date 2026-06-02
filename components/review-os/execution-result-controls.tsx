"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildLearningSignalFromExecutionResult,
  buildNextPlanSignalFromExecution,
  buildReviewCandidateFromExecutionSignal,
  type ExecutionLearningSignalResult,
  type ExecutionLearningSignalSource,
  type ExecutionNextPlanCandidate,
  type ExecutionReviewCandidate,
} from "@/lib/review-os/execution-learning-signal";
import type { AppraiserExamMode } from "@/lib/review-os/curriculum-reference";

export type ExecutionResultControlsProps = {
  examMode: AppraiserExamMode;
  taskType: string;
  subjectId?: string;
  subjectName?: string;
  unitId?: string;
  unitName?: string;
  executionSource: ExecutionLearningSignalSource;
  daysUntilExam?: number;
  isFailRiskSubject?: boolean;
};

type ResultControlOption = {
  result: ExecutionLearningSignalResult;
  label: string;
  description: string;
};

const RESULT_CONTROL_OPTIONS: ResultControlOption[] = [
  { result: "done", label: "완료", description: "추가 판단 없이 완료로 닫기" },
  { result: "wrong", label: "틀림", description: "짧은 복습 후보로 남기기" },
  { result: "unknown", label: "모르겠음", description: "확신 낮은 회상 후보로 남기기" },
  { result: "needs_rewrite", label: "다시쓰기 필요", description: "한 문단 보강 후보로 남기기" },
  { result: "skipped", label: "나중에", description: "부담 낮은 복구 후보로 남기기" },
];

function dueHintCopy(dueHint: string) {
  if (dueHint === "none") return "추가 예약 없음";
  if (dueHint === "soon") return "곧 다시 보기";
  if (dueHint === "tomorrow") return "내일 다시 보기";
  if (dueHint === "three_days") return "3일 안에 다시 보기";
  return "다음 주 다시 보기";
}

function nextActionCopy(candidate: ExecutionReviewCandidate | ExecutionNextPlanCandidate | null, fallback: string) {
  if (!candidate) return fallback;
  return "primaryAction" in candidate ? candidate.primaryAction : candidate.taskType;
}

export function ExecutionResultControls({
  examMode,
  taskType,
  subjectId,
  subjectName,
  unitId,
  unitName,
  executionSource,
  daysUntilExam,
  isFailRiskSubject,
}: ExecutionResultControlsProps) {
  const [selectedResult, setSelectedResult] = useState<ExecutionLearningSignalResult | null>(null);

  const selectedSignal = useMemo(() => {
    if (!selectedResult) return null;
    return buildLearningSignalFromExecutionResult({
      examMode,
      taskType,
      subjectId,
      subjectName,
      unitId,
      unitName,
      executionSource,
      daysUntilExam,
      isFailRiskSubject,
      result: selectedResult,
    });
  }, [daysUntilExam, examMode, executionSource, isFailRiskSubject, selectedResult, subjectId, subjectName, taskType, unitId, unitName]);

  const reviewCandidate = selectedSignal ? buildReviewCandidateFromExecutionSignal(selectedSignal) : null;
  const nextPlanSignal = selectedSignal ? buildNextPlanSignalFromExecution(selectedSignal) : null;
  const nextCandidate = reviewCandidate ?? nextPlanSignal?.candidates[0] ?? null;
  const selectedNextAction = selectedSignal ? nextActionCopy(nextCandidate, dueHintCopy(selectedSignal.reviewDueHint)) : "";

  return (
    <Card className="border-[color:var(--border-subtle)] bg-[color:var(--surface-soft)] shadow-none">
      <CardHeader className="space-y-2 p-4 pb-3">
        <p className="text-caption text-[color:var(--muted)]">실행 결과</p>
        <CardTitle className="text-base">방금 한 작업을 한 번만 표시해 주세요.</CardTitle>
        <CardDescription className="mt-0">
          문제 원문이나 답안 입력 없이, 결과 메타데이터만 다음 학습 신호로 바꿉니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="grid gap-2 sm:grid-cols-5" role="group" aria-label="실행 결과 선택">
          {RESULT_CONTROL_OPTIONS.map((option, index) => {
            const selected = selectedResult === option.result;
            return (
              <Button
                key={option.result}
                type="button"
                variant={selected ? "default" : index === 0 ? "outline" : "ghost"}
                className="h-auto min-h-11 flex-col gap-1 rounded-[var(--radius-md)] px-3 py-2 text-center"
                aria-pressed={selected}
                onClick={() => setSelectedResult(option.result)}
              >
                <span>{option.label}</span>
                <span className="text-[11px] font-normal opacity-75">{option.description}</span>
              </Button>
            );
          })}
        </div>

        {selectedSignal ? (
          <div className="space-y-3 rounded-[var(--radius-md)] border border-[color:var(--border-hairline)] bg-[color:var(--bg-surface)] px-4 py-3">
            <p className="text-sm font-medium leading-6 text-[color:var(--foreground-strong)]">{selectedSignal.feedbackCopy}</p>
            <div className="grid gap-2 text-sm text-[color:var(--foreground-strong)] sm:grid-cols-2">
              <div>
                <p className="text-xs text-[color:var(--muted)]">다음 후보</p>
                <p className="mt-1">{nextCandidate?.title ?? "오늘 계획에서 조용히 이어가기"}</p>
              </div>
              <div>
                <p className="text-xs text-[color:var(--muted)]">권장 행동</p>
                <p className="mt-1">{selectedNextAction}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs leading-5 text-[color:var(--muted)]">
            기본값은 완료입니다. 필요하면 틀림, 모르겠음, 다시쓰기 필요, 나중에 중 하나로 바꿀 수 있습니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, FileText, Loader2, PenLine, RotateCcw } from "lucide-react";

import { FocusAudioControl } from "@/components/inverge/focus-audio-control";
import { UpgradeNudge } from "@/components/inverge/upgrade-nudge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFeatureAccess } from "@/lib/inverge/billing-client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { getWorkContext } from "@/lib/inverge/mock-data";
import { fetchSecondExamSource, readLocalSecondExamSource, subscribeSecondExamStorage } from "@/lib/inverge/second-exam-client";
import { diagnoseSecondExamAnswer, summarizeSecondExamAnswer } from "@/lib/inverge/second-exam-diagnosis";
import { applyCompareAiOutput, buildCompareAiInput, type SecondExamAiOutput } from "@/lib/inverge/second-exam-ai";
import { applySeedTemplateToDiagnosis } from "@/lib/inverge/second-exam-seed-template";
import { useSecondExamSeedTemplate } from "@/lib/inverge/second-exam-seed-template-client";
import { cn } from "@/lib/utils";

type WorkScreenProps = {
  examId?: string;
  sessionId?: string;
  subjectId?: string;
  submissionId?: string;
};

type AiAssistResponse = {
  output: SecondExamAiOutput;
  meta?: {
    provider?: string;
    fallbackUsed: boolean;
    errorReason?: string;
    elapsedMs?: number;
  };
};

type AiEnhancementState = {
  key: string;
  output: SecondExamAiOutput;
};

function formatElapsed(totalSeconds?: number) {
  if (!totalSeconds) return "작성 시간 기록 없음";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds.toString().padStart(2, "0")}초`;
}

function getReferenceSummary(subjectId: string) {
  if (subjectId === "theory") {
    return "기준 답안은 첫 문장에서 쟁점을 먼저 고정하고, 그 뒤에 정의와 근거를 붙입니다.";
  }

  if (subjectId === "law") {
    return "기준 답안은 조문 근거, 사안 적용, 결론이 같은 흐름 안에서 이어집니다.";
  }

  return "기준 답안은 계산 결과를 평가 판단으로 연결하고, 마지막에 결론 위치를 분명하게 고정합니다.";
}

export function ComparisonView({ examId, sessionId, subjectId, submissionId = "latest" }: WorkScreenProps) {
  const { exam, session, subject } = getWorkContext({ examId, sessionId, subjectId });
  const [submission, setSubmission] = useState(() =>
    readLocalSecondExamSource(submissionId, { examId: exam.id, sessionId: session.id, subjectId: subject.id }),
  );
  const [sourceStatus, setSourceStatus] = useState<"loading" | "ready" | "empty" | "error">(submission ? "ready" : "loading");
  const rewriteHref = `/exams/${exam.id}/${session.id}/${subject.id}/rewrite/${submissionId}`;
  const writeHref = `/exams/${exam.id}/${session.id}/${subject.id}/write`;
  const recordsHref = `/exams/${exam.id}/${session.id}/${subject.id}/records`;
  const currentPath = `/exams/${exam.id}/${session.id}/${subject.id}/compare/${submissionId}`;
  const aiAccess = useFeatureAccess("second.ai_enhancement");

  const loadSource = useCallback(async () => {
    try {
      const serverSource = await fetchSecondExamSource(submissionId, {
        examId: exam.id,
        sessionId: session.id,
        subjectId: subject.id,
      });
      setSubmission(serverSource);
      setSourceStatus("ready");
    } catch {
      const localSource = readLocalSecondExamSource(submissionId, {
        examId: exam.id,
        sessionId: session.id,
        subjectId: subject.id,
      });
      setSubmission(localSource);
      setSourceStatus(localSource ? "ready" : submissionId === "latest" ? "empty" : "error");
    }
  }, [exam.id, session.id, subject.id, submissionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadWithGuard() {
      if (cancelled) return;
      await loadSource();
    }

    void loadWithGuard();
    const unsubscribe = subscribeSecondExamStorage(() => {
      void loadWithGuard();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [loadSource]);

  const diagnosis = useMemo(
    () =>
      diagnoseSecondExamAnswer({
        subjectId: subject.id,
        userAnswerText: submission?.answerText,
        submittedAt: submission?.submittedAt,
      }),
    [subject.id, submission?.answerText, submission?.submittedAt],
  );
  const seedTemplate = useSecondExamSeedTemplate({
    subjectId: diagnosis.subjectId,
    gapType: diagnosis.selectedGap.type,
    focusLabel: diagnosis.selectedGap.focusLabel,
  });
  const patchedDiagnosis = useMemo(() => applySeedTemplateToDiagnosis(diagnosis, seedTemplate), [diagnosis, seedTemplate]);

  const selectedGap = useMemo(() => patchedDiagnosis.selectedGap, [patchedDiagnosis.selectedGap]);
  const enhancementKey = `${patchedDiagnosis.subjectId}:${selectedGap.id}:${selectedGap.evidence.join("|")}`;
  const [aiEnhancement, setAiEnhancement] = useState<AiEnhancementState | null>(null);
  const enhancedGap = useMemo(() => {
    if (aiEnhancement?.key !== enhancementKey) return selectedGap;
    return applyCompareAiOutput(selectedGap, aiEnhancement.output);
  }, [aiEnhancement, enhancementKey, selectedGap]);

  useEffect(() => {
    logInvergeEvent("second.compare.viewed", {
      examId: exam.id,
      sessionId: session.id,
      subjectId: subject.id,
      submissionId,
      stage: "second",
      properties: {
        gapId: selectedGap.id,
        hasStoredSubmission: Boolean(submission),
        sourceType: submission?.sourceType ?? "none",
      },
    });
  }, [exam.id, selectedGap.id, session.id, subject.id, submission, submissionId]);

  useEffect(() => {
    let cancelled = false;

    const aiInput = buildCompareAiInput({
      examId: exam.id,
      subjectId: patchedDiagnosis.subjectId,
      diagnosis: patchedDiagnosis,
    });

    async function refineCompareCopy() {
      if (!aiAccess.allowed) return;

      try {
        const response = await fetch("/api/inverge/second-exam/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiInput),
        });

        if (!response.ok) return;

        const result = (await response.json()) as AiAssistResponse;
        if (!cancelled) {
          setAiEnhancement({ key: enhancementKey, output: result.output });
          logInvergeEvent(result.meta?.fallbackUsed ? "ai.enhancement.fallback" : "ai.enhancement.succeeded", {
            examId: exam.id,
            sessionId: session.id,
            subjectId: subject.id,
            submissionId,
            stage: "system",
            properties: {
              task: "compare-copy",
              provider: result.meta?.provider ?? "unknown",
              errorReason: result.meta?.errorReason ?? null,
              elapsedMs: result.meta?.elapsedMs ?? null,
            },
          });
        }
      } catch (error) {
        logInvergeEvent("ai.enhancement.fallback", {
          examId: exam.id,
          sessionId: session.id,
          subjectId: subject.id,
          submissionId,
          stage: "system",
          properties: {
            task: "compare-copy",
            errorReason: "client-fetch-error",
          },
        });
        if (process.env.NODE_ENV !== "production") {
          console.debug("second-exam compare AI fallback", error);
        }
      }
    }

    void refineCompareCopy();

    return () => {
      cancelled = true;
    };
  }, [aiAccess.allowed, enhancementKey, exam.id, patchedDiagnosis, session.id, subject.id, submissionId]);

  const userAnswerSummary = useMemo(() => summarizeSecondExamAnswer(submission?.answerText, 140), [submission?.answerText]);

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col px-5 py-8 sm:px-8 lg:py-10">
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-medium text-[color:var(--muted)]">
              {exam.shortName} · {session.label} · {subject.name}
            </p>
            <h1 className="mt-2 text-h1 font-medium text-[color:var(--foreground-strong)]">비교 · 간극 1개</h1>
            <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
              점수 대신 보강할 한 가지에 집중합니다. 이 화면에서 바로 다시 쓰기로 이어집니다.
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <FocusAudioControl />
            <div className="text-sm text-[color:var(--muted)]">{formatElapsed(submission?.elapsedSeconds)}</div>
          </div>
        </header>

        {sourceStatus === "loading" ? (
          <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-8">
            <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              비교 기준 답안을 불러오는 중입니다.
            </div>
          </section>
        ) : null}

        {sourceStatus === "empty" ? (
          <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-8">
            <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">아직 비교할 답안이 없습니다.</h2>
            <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
              답안을 먼저 제출하면 가장 큰 차이 하나를 바로 비교할 수 있습니다.
            </p>
            <div className="mt-6">
              <Link href={writeHref}>
                <Button size="lg">
                  답안 작성으로 이동
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>
        ) : null}

        {sourceStatus === "error" ? (
          <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-4 w-4 text-[color:var(--status-red)]" />
              <div>
                <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">비교 기준 답안을 찾지 못했습니다.</h2>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                  저장이 아직 끝나지 않았을 수 있습니다. 다시 불러오거나 답안 작성 화면으로 돌아가세요.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void loadSource()}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    다시 불러오기
                  </Button>
                  <Link href={writeHref} className={buttonVariants()}>
                    답안 작성으로 이동
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {sourceStatus === "ready" ? (
          <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[1fr_280px]">
            <article className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
              <div className="px-6 py-7 sm:px-8 lg:px-10 lg:py-10">
                <p className="text-caption font-medium text-[color:var(--muted)]">이번 답안의 가장 큰 간극</p>
                <h2 className="mt-3 max-w-3xl text-h2 font-medium leading-tight text-[color:var(--foreground-strong)]">
                  {enhancedGap.title}
                </h2>
                <p className="mt-4 max-w-2xl text-body leading-7 text-[color:var(--muted-strong)]">
                  {enhancedGap.summary}
                </p>

                <div className="mt-7 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-5 py-4">
                  <p className="text-caption font-medium text-[color:var(--muted)]">다음 rewrite 지시</p>
                  <p className="mt-2 text-body leading-7 text-[color:var(--foreground-strong)]">
                    {enhancedGap.rewriteInstruction}
                  </p>
                </div>

                <div className="mt-8">
                  <Link href={rewriteHref}>
                    <Button size="lg">
                      <PenLine className="mr-2 h-4 w-4" />
                      이번 간극 반영해 문단 다시 쓰기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </article>

            <aside className="space-y-5">
              <section className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-4">
                <p className="text-caption font-medium text-[color:var(--muted)]">다음 행동</p>
                <p className="mt-2 text-sm leading-7 text-[color:var(--foreground-strong)]">
                  누락 논점 하나를 보강하는 문장을 바로 작성합니다.
                </p>
              </section>

              <section className="border-b border-[var(--border)] pb-5">
                <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground-strong)]">
                  <FileText className="h-4 w-4" />
                  작성 답안 요약
                </div>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{userAnswerSummary}</p>
              </section>

              <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-4">
                <summary className="cursor-pointer text-sm font-medium text-[color:var(--foreground-strong)]">기준 답안 구조 보기</summary>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{getReferenceSummary(subject.id)}</p>
              </details>

              <UpgradeNudge
                feature="second.ai_enhancement"
                title="AI 보조 문장 다듬기"
                helper="무료 플랜에서는 규칙 기반 결과만 보여줍니다. Core부터는 비교와 다시 쓰기 문장을 더 정교하게 다듬습니다."
                returnPath={currentPath}
                context={{ examId: exam.id, sessionId: session.id, subjectId: subject.id, submissionId }}
              />

              <nav className="flex flex-col items-start gap-3 text-sm">
                <Link href={writeHref} className={cn(buttonVariants({ variant: "ghost" }), "px-0 hover:bg-transparent")}>
                  답안 다시 작성
                </Link>
                <Link href={recordsHref} className="text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]">
                  기록으로 이동
                </Link>
              </nav>
            </aside>
          </section>
        ) : null}
      </div>
    </main>
  );
}

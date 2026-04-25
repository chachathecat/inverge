"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, FileText, Loader2, PenLine, RefreshCw, RotateCcw } from "lucide-react";

import { ContextBar } from "@/components/inverge/context-bar";
import { RefinedBadge } from "@/components/inverge/refined-primitives";
import { Button, buttonVariants } from "@/components/ui/button";
import { useFeatureAccess } from "@/lib/inverge/billing-client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { getWorkContext } from "@/lib/inverge/mock-data";
import {
  applyRecordsAiOutput,
  buildRecordsSummaryAiInput,
  type SecondExamAiOutput,
} from "@/lib/inverge/second-exam-ai";
import { fetchSecondExamHistory, readLocalSecondExamHistory } from "@/lib/inverge/second-exam-client";
import { buildSecondExamRecordsSummary, diagnoseSecondExamAnswer } from "@/lib/inverge/second-exam-diagnosis";
import type {
  SecondExamRewriteRecord as StoredRewrite,
  SecondExamSubmissionRecord as StoredSubmission,
} from "@/lib/inverge/second-exam-types";
import { UI_TERMS } from "@/lib/inverge/ui-terms";
import { cn } from "@/lib/utils";

type WorkScreenProps = {
  examId?: string;
  sessionId?: string;
  subjectId?: string;
};

type RecordsState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; submissions: StoredSubmission[]; rewrites: StoredRewrite[] };

type TimelineEntry = {
  id: string;
  type: "write" | "compare" | "rewrite";
  title: string;
  description: string;
  meta: string;
  href?: string;
  createdAt: string;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatElapsed(totalSeconds?: number) {
  if (!totalSeconds) return "시간 기록 없음";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}분 ${seconds.toString().padStart(2, "0")}초`;
}

function summarizeText(value: string, limit = 110) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "내용 없음";
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit)}...`;
}

function addSeconds(value: string, seconds: number) {
  return new Date(Date.parse(value) + seconds * 1000).toISOString();
}

function getEntryIcon(type: TimelineEntry["type"]) {
  if (type === "write") return <FileText className="h-4 w-4" />;
  if (type === "compare") return <RefreshCw className="h-4 w-4" />;
  return <PenLine className="h-4 w-4" />;
}

export function RecordsView({ examId, sessionId, subjectId }: WorkScreenProps) {
  const { exam, session, subject } = getWorkContext({ examId, sessionId, subjectId });
  const writeHref = `/exams/${exam.id}/${session.id}/${subject.id}/write`;
  const [records, setRecords] = useState<RecordsState>({ status: "loading" });
  const aiAccess = useFeatureAccess("second.ai_enhancement");
  const [recordsAiOutput, setRecordsAiOutput] = useState<SecondExamAiOutput | null>(null);

  const loadRecords = useCallback(async () => {
    try {
      const serverHistory = await fetchSecondExamHistory({
        examId: exam.id,
        sessionId: session.id,
        subjectId: subject.id,
      });
      setRecords({
        status: "ready",
        submissions: serverHistory.submissions,
        rewrites: serverHistory.rewrites,
      });
    } catch {
      try {
        const localHistory = readLocalSecondExamHistory({
          examId: exam.id,
          sessionId: session.id,
          subjectId: subject.id,
        });
        setRecords({
          status: "ready",
          submissions: localHistory.submissions,
          rewrites: localHistory.rewrites,
        });
      } catch {
        setRecords({
          status: "error",
          message: "기록을 불러오지 못했습니다.",
        });
      }
    }
  }, [exam.id, session.id, subject.id]);

  useEffect(() => {
    logInvergeEvent("second.records.viewed", {
      examId: exam.id,
      sessionId: session.id,
      subjectId: subject.id,
      stage: "second",
    });

    const timer = window.setTimeout(() => {
      void loadRecords();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [exam.id, session.id, subject.id, loadRecords]);

  const viewModel = useMemo(() => {
    if (records.status !== "ready") return null;

    const diagnoses = records.submissions.map((submission) =>
      diagnoseSecondExamAnswer({
        subjectId: subject.id,
        userAnswerText: submission.answerText,
        submittedAt: submission.submittedAt,
      }),
    );
    const rewriteBySubmission = new Map(records.rewrites.map((rewrite) => [rewrite.sourceSubmissionId, rewrite]));
    const recordsSeed = buildSecondExamRecordsSummary({
      subjectId: subject.id,
      diagnoses,
      rewriteCount: records.rewrites.length,
      createdAt: records.submissions[0]?.submittedAt ?? records.rewrites[0]?.submittedAt,
    });
    const timeline: TimelineEntry[] = [];

    records.submissions.forEach((submission, index) => {
      const diagnosis = diagnoses[index];

      timeline.push({
        id: `write-${submission.submissionId}`,
        type: "write",
        title: "작성 제출",
        description: summarizeText(submission.answerText),
        meta: `${submission.answerLength.toLocaleString("ko-KR")}자 · ${formatElapsed(submission.elapsedSeconds)}`,
        href: `/exams/${exam.id}/${session.id}/${subject.id}/compare/${submission.submissionId}`,
        createdAt: submission.submittedAt,
      });

      timeline.push({
        id: `compare-${submission.submissionId}`,
        type: "compare",
        title: "주요 차이 확인",
        description: diagnosis.selectedGap.title,
        meta: diagnosis.selectedGap.focusLabel,
        href: `/exams/${exam.id}/${session.id}/${subject.id}/compare/${submission.submissionId}`,
        createdAt: addSeconds(submission.submittedAt, 1),
      });

      const rewrite = rewriteBySubmission.get(submission.submissionId);
      if (rewrite) {
        timeline.push({
          id: `rewrite-${rewrite.rewriteId}`,
          type: "rewrite",
          title: "다시 쓰기 제출",
          description: rewrite.gapTitle,
          meta: `${rewrite.focusLabel} · ${rewrite.rewrittenAnswerLength.toLocaleString("ko-KR")}자`,
          href: `/exams/${exam.id}/${session.id}/${subject.id}/rewrite/${submission.submissionId}`,
          createdAt: rewrite.submittedAt,
        });
      }
    });

    records.rewrites
      .filter((rewrite) => !records.submissions.some((submission) => submission.submissionId === rewrite.sourceSubmissionId))
      .forEach((rewrite) => {
        timeline.push({
          id: `rewrite-${rewrite.rewriteId}`,
          type: "rewrite",
          title: "다시 쓰기 제출",
          description: rewrite.gapTitle,
          meta: `${rewrite.focusLabel} · ${rewrite.rewrittenAnswerLength.toLocaleString("ko-KR")}자`,
          href: `/exams/${exam.id}/${session.id}/${subject.id}/rewrite/${rewrite.sourceSubmissionId}`,
          createdAt: rewrite.submittedAt,
        });
      });

    return {
      timeline: timeline.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      summary: {
        writes: records.submissions.length,
        compares: records.submissions.length,
        rewrites: records.rewrites.length,
      },
      recordsSeed,
      isEmpty: records.submissions.length === 0 && records.rewrites.length === 0,
      isSparse: records.submissions.length + records.rewrites.length > 0 && records.submissions.length + records.rewrites.length < 3,
    };
  }, [exam.id, records, session.id, subject.id]);

  const enhancedRecordsSeed = useMemo(() => {
    if (!viewModel) return null;
    return recordsAiOutput ? applyRecordsAiOutput(viewModel.recordsSeed, recordsAiOutput) : viewModel.recordsSeed;
  }, [recordsAiOutput, viewModel]);

  useEffect(() => {
    if (!aiAccess.allowed || !viewModel || records.status !== "ready") return;

    let cancelled = false;
    const latestDiagnosis = records.submissions[0]
      ? diagnoseSecondExamAnswer({
          subjectId: subject.id,
          userAnswerText: records.submissions[0].answerText,
          submittedAt: records.submissions[0].submittedAt,
        })
      : diagnoseSecondExamAnswer({ subjectId: subject.id });

    const aiInput = buildRecordsSummaryAiInput({
      examId: exam.id,
      subjectId: latestDiagnosis.subjectId,
      diagnosis: latestDiagnosis,
      recordsSummarySeed: viewModel.recordsSeed,
    });

    async function refineRecordsSummary() {
      try {
        const response = await fetch("/api/inverge/second-exam/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(aiInput),
        });
        if (!response.ok) return;

        const result = (await response.json()) as AiAssistResponse;
        if (!cancelled) {
          setRecordsAiOutput(result.output);
          logInvergeEvent(result.meta?.fallbackUsed ? "ai.enhancement.fallback" : "ai.enhancement.succeeded", {
            examId: exam.id,
            sessionId: session.id,
            subjectId: subject.id,
            stage: "system",
            properties: {
              task: "records-summary-copy",
              provider: result.meta?.provider ?? "unknown",
              errorReason: result.meta?.errorReason ?? null,
              elapsedMs: result.meta?.elapsedMs ?? null,
            },
          });
        }
      } catch {
        logInvergeEvent("ai.enhancement.fallback", {
          examId: exam.id,
          sessionId: session.id,
          subjectId: subject.id,
          stage: "system",
          properties: {
            task: "records-summary-copy",
            errorReason: "client-fetch-error",
          },
        });
      }
    }

    void refineRecordsSummary();

    return () => {
      cancelled = true;
    };
  }, [aiAccess.allowed, exam.id, records, session.id, subject.id, viewModel]);

  return (
    <>
      <ContextBar exam={exam} session={session} subject={subject} screen="records" />
      <main className="mx-auto w-full max-w-[1080px] px-5 py-8 sm:px-8 lg:py-10">
        <header className="border-b border-[var(--border)] pb-6">
          <p className="text-caption font-medium text-[color:var(--muted)]">{UI_TERMS.records}</p>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">{subject.name} 기록</h1>
              <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
                작성, 비교, 다시 쓰기 흐름을 조용하게 확인합니다. 기록 화면은 분석판이 아니라 다음 진입을 돕는 보조 화면입니다.
              </p>
            </div>
            <Link href={writeHref}>
              <Button size="lg">
                다시 작성하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </header>

        {records.status === "loading" ? (
          <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-10">
            <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              기록을 불러오는 중입니다.
            </div>
          </section>
        ) : null}

        {records.status === "error" ? (
          <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-8">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-4 w-4 text-[color:var(--status-red)]" />
              <div>
                <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">기록을 확인할 수 없습니다.</h2>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{records.message}</p>
                <div className="mt-4">
                  <Button type="button" variant="outline" onClick={() => void loadRecords()}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    다시 시도
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {records.status === "ready" && viewModel?.isEmpty ? (
          <section className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-10 sm:px-8">
            <p className="text-caption font-medium text-[color:var(--muted)]">아직 기록이 없습니다.</p>
            <h2 className="mt-2 text-h2 font-medium text-[color:var(--foreground-strong)]">첫 작성이 기록 흐름의 시작입니다.</h2>
            <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
              기록은 보조 화면으로만 남겨 둡니다. 루프가 어떻게 쌓이고 있는지만 차분하게 확인하면 됩니다.
            </p>
            <div className="mt-6">
              <Link href={writeHref} className={buttonVariants()}>
                작성 시작
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </section>
        ) : null}

        {records.status === "ready" && viewModel && !viewModel.isEmpty ? (
          <div className="grid gap-7 py-7 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-5">
              <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-5">
                <p className="text-caption font-medium text-[color:var(--muted)]">{UI_TERMS.summary}</p>
                <div className="mt-5 space-y-4">
                  <SummaryLine label="작성" value={`${viewModel.summary.writes}`} />
                  <SummaryLine label={UI_TERMS.compare} value={`${viewModel.summary.compares}`} />
                  <SummaryLine label={UI_TERMS.rewrite} value={`${viewModel.summary.rewrites}`} />
                </div>
              </section>

              <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-5">
                <p className="text-caption font-medium text-[color:var(--muted)]">{UI_TERMS.correctionTarget}</p>
                <div className="mt-3">
                  <p className="text-sm font-medium leading-6 text-[color:var(--foreground-strong)]">
                    {enhancedRecordsSeed?.gapTitle ?? viewModel.recordsSeed.gapTitle}
                  </p>
                  <p className="mt-2 text-caption text-[color:var(--muted)]">
                    {enhancedRecordsSeed?.focusLabel ?? viewModel.recordsSeed.focusLabel}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{enhancedRecordsSeed?.note ?? viewModel.recordsSeed.note}</p>
                </div>
              </section>

              {viewModel.isSparse ? (
                <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-5 py-5">
                  <p className="text-sm leading-7 text-[color:var(--muted-strong)]">
                    {enhancedRecordsSeed?.recurringHint ?? viewModel.recordsSeed.recurringHint ?? "아직 기록이 짧습니다. 한 번 더 돌면 반복되는 패턴이 더 선명해집니다."}
                  </p>
                </section>
              ) : null}

              <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-5">
                <p className="text-caption font-medium text-[color:var(--muted)]">{UI_TERMS.nextAction}</p>
                <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{enhancedRecordsSeed?.nextActionLabel ?? viewModel.recordsSeed.nextActionLabel}</p>
                <div className="mt-4">
                  <Link href={writeHref} className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
                    다시 작성하기
                  </Link>
                </div>
              </section>
            </aside>

            <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
              <div className="border-b border-[var(--border)] px-6 py-5 sm:px-7">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-caption font-medium text-[color:var(--muted)]">타임라인</p>
                    <h2 className="mt-1 text-h2 font-medium text-[color:var(--foreground-strong)]">최근 루프 기록</h2>
                  </div>
                  <RefinedBadge>최근 {Math.min(viewModel.timeline.length, 8)}개</RefinedBadge>
                </div>
              </div>

              <ol className="divide-y divide-[var(--border)]">
                {viewModel.timeline.slice(0, 8).map((entry) => (
                  <li key={entry.id} className="grid gap-4 px-6 py-5 sm:grid-cols-[130px_1fr_auto] sm:px-7">
                    <time className="text-caption text-[color:var(--muted)]">{formatDateTime(entry.createdAt)}</time>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--foreground-strong)]">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--surface-soft)] text-[color:var(--muted-strong)]">
                          {getEntryIcon(entry.type)}
                        </span>
                        {entry.title}
                      </div>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{entry.description}</p>
                      <p className="mt-2 text-caption text-[color:var(--muted)]">{entry.meta}</p>
                    </div>
                    {entry.href ? (
                      <Link href={entry.href} className="self-start text-sm font-medium text-[color:var(--foreground-strong)] hover:underline">
                        열기
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        ) : null}
      </main>
    </>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-[color:var(--muted-strong)]">
        <Check className="h-4 w-4 text-[color:var(--muted)]" />
        {label}
      </div>
      <span className="text-sm font-medium text-[color:var(--foreground-strong)]">{value}</span>
    </div>
  );
}

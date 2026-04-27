"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Check, Loader2, RotateCcw, Save, Send } from "lucide-react";

import { FeedbackPrompt } from "@/components/inverge/feedback-prompt";
import { FocusAudioControl } from "@/components/inverge/focus-audio-control";
import { UpgradeNudge } from "@/components/inverge/upgrade-nudge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useFeatureAccess } from "@/lib/inverge/billing-client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { getWorkContext } from "@/lib/inverge/mock-data";
import {
  cacheSecondExamRewrite,
  fetchSecondExamSource,
  readLocalSecondExamSource,
  saveSecondExamRewrite,
  subscribeSecondExamStorage,
} from "@/lib/inverge/second-exam-client";
import { diagnoseSecondExamAnswer, summarizeSecondExamAnswer } from "@/lib/inverge/second-exam-diagnosis";
import { applyRewriteSeedAiOutput, buildRewriteSeedAiInput, type SecondExamAiOutput } from "@/lib/inverge/second-exam-ai";
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

function formatSavedAt(value: string) {
  if (!value) return "아직 저장 전";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getRewriteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `rewrite-${Date.now()}`;
}

export function RewriteView({ examId, sessionId, subjectId, submissionId = "latest" }: WorkScreenProps) {
  const { exam, session, subject } = getWorkContext({ examId, sessionId, subjectId });
  const currentPath = `/exams/${exam.id}/${session.id}/${subject.id}/rewrite/${submissionId}`;
  const aiAccess = useFeatureAccess("second.ai_enhancement");
  const [submission, setSubmission] = useState(() =>
    readLocalSecondExamSource(submissionId, { examId: exam.id, sessionId: session.id, subjectId: subject.id }),
  );
  const [sourceStatus, setSourceStatus] = useState<"loading" | "ready" | "empty" | "error">(submission ? "ready" : "loading");
  const writeHref = `/exams/${exam.id}/${session.id}/${subject.id}/write`;

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

  const baseSeed = useMemo(() => patchedDiagnosis.rewriteSeed, [patchedDiagnosis.rewriteSeed]);
  const enhancementKey = `${patchedDiagnosis.subjectId}:${baseSeed.sourceGapId}:${patchedDiagnosis.selectedGap.evidence.join("|")}`;
  const [aiEnhancement, setAiEnhancement] = useState<AiEnhancementState | null>(null);
  const enhancedSeed = useMemo(() => {
    if (aiEnhancement?.key !== enhancementKey) return baseSeed;
    return applyRewriteSeedAiOutput(baseSeed, aiEnhancement.output);
  }, [aiEnhancement, baseSeed, enhancementKey]);

  useEffect(() => {
    let cancelled = false;

    const aiInput = buildRewriteSeedAiInput({
      examId: exam.id,
      subjectId: patchedDiagnosis.subjectId,
      diagnosis: patchedDiagnosis,
    });

    async function refineRewriteSeed() {
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
              task: "rewrite-seed-copy",
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
            task: "rewrite-seed-copy",
            errorReason: "client-fetch-error",
          },
        });
        if (process.env.NODE_ENV !== "production") {
          console.debug("second-exam rewrite AI fallback", error);
        }
      }
    }

    void refineRewriteSeed();

    return () => {
      cancelled = true;
    };
  }, [aiAccess.allowed, enhancementKey, exam.id, patchedDiagnosis, session.id, subject.id, submissionId]);

  const seed = enhancedSeed;

  const draftKey = `inverge:second-exam:rewrite-draft:${submissionId}:${subject.id}`;
  const [rewrite, setRewrite] = useState(() => {
    if (typeof window === "undefined") return "";

    try {
      return window.localStorage.getItem(draftKey) ?? "";
    } catch {
      return "";
    }
  });
  const [hasCustomRewrite, setHasCustomRewrite] = useState(() => {
    if (typeof window === "undefined") return false;

    try {
      return window.localStorage.getItem(draftKey) !== null;
    } catch {
      return false;
    }
  });
  const [savedAt, setSavedAt] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "submitted" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [rewriteId, setRewriteId] = useState("");
  const rewriteValue = hasCustomRewrite ? rewrite : seed.starter;

  const recordsHref = `/exams/${exam.id}/${session.id}/${subject.id}/records`;
  const nextCompareHref = `/exams/${exam.id}/${session.id}/${subject.id}/compare/${rewriteId || submissionId}`;

  const derived = useMemo(() => {
    const trimmed = rewriteValue.trim();
    const original = (submission?.answerText ?? "").trim();
    const changedFromOriginal = original ? trimmed !== original : trimmed !== seed.starter.trim();

    return {
      length: trimmed.length,
      changedFromOriginal,
      remainingLength: Math.max(seed.minimumLength - trimmed.length, 0),
      canSubmit: trimmed.length >= seed.minimumLength && changedFromOriginal && status !== "submitting",
    };
  }, [rewriteValue, seed.minimumLength, seed.starter, status, submission?.answerText]);

  function handleSaveDraft() {
    const nextSavedAt = new Date().toISOString();
    window.localStorage.setItem(draftKey, rewriteValue);
    setSavedAt(nextSavedAt);
    setRewrite(rewriteValue);
    setHasCustomRewrite(true);
    setStatus("saved");
    setErrorMessage("");
  }

  async function handleSubmit() {
    if (!derived.canSubmit) {
      setStatus("error");
      setErrorMessage(
        derived.changedFromOriginal
          ? `문단을 조금 더 보강해 주세요. 최소 ${seed.minimumLength}자 기준입니다.`
          : "이전 답안과 다른 보강 문장을 먼저 작성해 주세요.",
      );
      return;
    }

    const nextRewriteId = getRewriteId();
    const submittedAt = new Date().toISOString();
    const payload = {
      rewriteId: nextRewriteId,
      sourceSubmissionId: submissionId,
      examId: exam.id,
      sessionId: session.id,
      subjectId: subject.id,
      focusLabel: seed.focusLabel,
      gapTitle: seed.gapTitle,
      rewrittenAnswerText: rewriteValue,
      rewrittenAnswerLength: derived.length,
      submittedAt,
    };

    setStatus("submitting");
    try {
      const saved = await saveSecondExamRewrite(payload);
      cacheSecondExamRewrite(saved);
    } catch {
      cacheSecondExamRewrite(payload);
    }
    window.localStorage.setItem(draftKey, rewriteValue);
    setRewrite(rewriteValue);
    setHasCustomRewrite(true);
    logInvergeEvent("second.rewrite.submitted", {
      examId: exam.id,
      sessionId: session.id,
      subjectId: subject.id,
      submissionId,
      rewriteId: nextRewriteId,
      stage: "second",
      properties: {
        sourceGapId: seed.sourceGapId,
        rewrittenAnswerLength: derived.length,
      },
    });
    setRewriteId(nextRewriteId);
    setStatus("submitted");
    setSavedAt(submittedAt);
  }

  return (
    <main className="min-h-screen bg-[color:var(--background)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1080px] flex-col px-5 py-8 sm:px-8 lg:py-10">
        <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-caption font-medium text-[color:var(--muted)]">
              {exam.shortName} · {session.label} · {subject.name}
            </p>
            <h1 className="mt-2 text-h1 font-medium text-[color:var(--foreground-strong)]">rewrite · 문단 하나 보강</h1>
            <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
              문단 하나를 다시 쓰고 저장하면 오늘의 보강 루프를 마무리합니다.
            </p>
          </div>
          <div className="flex justify-end">
            <FocusAudioControl />
          </div>
        </header>

        {sourceStatus === "loading" ? (
          <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-8">
            <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              다시 쓰기 기준 답안을 불러오는 중입니다.
            </div>
          </section>
        ) : null}

        {sourceStatus === "empty" ? (
          <section className="mt-6 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-6 py-8">
            <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">교정할 답안이 아직 없습니다.</h2>
            <p className="mt-3 max-w-2xl text-body text-[color:var(--muted)]">
              먼저 답안을 제출하면 compare를 거쳐 rewrite로 이어집니다.
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
                <h2 className="text-h3 font-medium text-[color:var(--foreground-strong)]">교정 기준 답안을 찾지 못했습니다.</h2>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">
                  저장이 아직 끝나지 않았을 수 있습니다. 다시 불러오거나 write 화면으로 돌아가세요.
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
          <>
            <section className="border-b border-[var(--border)] py-7">
              <p className="text-caption font-medium text-[color:var(--muted)]">이번 rewrite 목표</p>
              <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_280px] lg:items-end">
                <div>
                  <h2 className="max-w-3xl text-h2 font-medium leading-tight text-[color:var(--foreground-strong)]">{seed.gapTitle}</h2>
                  <p className="mt-3 max-w-3xl text-body text-[color:var(--muted-strong)]">{seed.gapSummary}</p>
                </div>
                <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3">
                  <p className="text-caption text-[color:var(--muted)]">지금 할 일</p>
                  <p className="mt-1 text-sm font-medium text-[color:var(--foreground-strong)]">{seed.rewriteTarget}</p>
                </div>
              </div>
            </section>

            <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[300px_1fr]">
              <aside className="space-y-5 lg:pt-2">
                <section>
                  <p className="text-caption font-medium text-[color:var(--muted)]">보강 기준</p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--muted-strong)]">
                    {seed.guidance.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-[11px] h-1 w-1 flex-none rounded-full bg-[color:var(--muted)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <UpgradeNudge
                  feature="second.ai_enhancement"
                  title="rewrite 문장 보조"
                  helper="무료 플랜에서는 규칙 기반 seed를 보여줍니다. Core부터는 문장 흐름 보조를 추가로 제공합니다."
                  returnPath={currentPath}
                  context={{ examId: exam.id, sessionId: session.id, subjectId: subject.id, submissionId }}
                />

                <details className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-4">
                  <summary className="cursor-pointer text-caption font-medium text-[color:var(--muted)]">이전 답안 요약 보기</summary>
                  <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                    {summarizeSecondExamAnswer(submission?.answerText, 180)}
                  </p>
                </details>

                <section className="border-t border-[var(--border)] pt-5">
                  <p className="text-caption text-[color:var(--muted)]">상태</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[color:var(--foreground-strong)]">
                    {status === "saved" || status === "submitted" ? <Check className="h-4 w-4" /> : null}
                    <span>
                      {status === "submitted" ? "저장 완료" : status === "submitting" ? "저장 중" : `최근 저장 ${formatSavedAt(savedAt)}`}
                    </span>
                  </div>
                  <p className="mt-2 text-caption text-[color:var(--muted)]">
                    {derived.length.toLocaleString("ko-KR")}자
                    {derived.remainingLength > 0 ? ` · ${derived.remainingLength.toLocaleString("ko-KR")}자 더 필요` : ""}
                  </p>
                </section>
              </aside>

              <section className="flex min-h-[60vh] flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)]">
                <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{seed.focusLabel}</p>
                  <p className="text-caption text-[color:var(--muted)]">문단 하나만 다시 씁니다</p>
                </div>
                <Textarea
                  value={rewriteValue}
                  onChange={(event) => {
                    setRewrite(event.target.value);
                    setHasCustomRewrite(true);
                    if (status !== "idle") setStatus("idle");
                    if (errorMessage) setErrorMessage("");
                  }}
                  className="min-h-[56vh] flex-1 resize-none rounded-none border-0 bg-transparent px-5 py-5 text-[16px] leading-8 text-[color:var(--foreground-strong)] shadow-none outline-none placeholder:text-[color:var(--muted)] focus:border-transparent focus:ring-0 sm:px-6"
                  placeholder={seed.placeholder}
                />
              </section>
            </section>

            {errorMessage ? (
              <p className="pb-3 text-sm text-[color:var(--status-red)]" role="alert">
                {errorMessage}
              </p>
            ) : null}

            {status === "submitted" ? (
              <section className="mb-5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-[color:var(--foreground-strong)]">문단 보강을 저장했습니다.</p>
                    <p className="mt-1 text-caption text-[color:var(--muted)]">
                      오늘 작업은 여기까지입니다. 다음 review에 이 문단을 다시 확인합니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={recordsHref} className={cn(buttonVariants({ variant: "ghost" }), "px-4")}>
                      기록 보기
                    </Link>
                    <Link href={nextCompareHref} className={buttonVariants()}>
                      다시 비교 확인
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </section>
            ) : null}

            {status === "submitted" ? (
              <FeedbackPrompt
                trigger="second_rewrite_completed"
                context={{
                  examId: exam.id,
                  stage: "second",
                  sessionId: session.id,
                  subjectId: subject.id,
                  submissionId,
                  rewriteId: rewriteId || undefined,
                }}
                className="mb-5"
              />
            ) : null}

            <footer className="sticky bottom-0 -mx-5 border-t border-[var(--border)] bg-[color:color-mix(in_srgb,var(--background)_92%,transparent)] px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
              <div className="mx-auto flex max-w-[1080px] items-center justify-between gap-3">
                <Button type="button" variant="ghost" onClick={handleSaveDraft} disabled={status === "submitting"}>
                  <Save className="mr-2 h-4 w-4" />
                  임시 저장
                </Button>
                <Button
                  type="button"
                  size="lg"
                  onClick={() => void handleSubmit()}
                  disabled={status === "submitting" || status === "submitted"}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {status === "submitting" ? "저장 중" : "문단 보강 저장"}
                </Button>
              </div>
            </footer>
          </>
        ) : null}
      </div>
    </main>
  );
}

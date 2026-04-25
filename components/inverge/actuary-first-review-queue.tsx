"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

import { FocusAudioControl } from "@/components/inverge/focus-audio-control";
import { Button, buttonVariants } from "@/components/ui/button";
import { postActuaryFirst } from "@/lib/actuary-first/client";
import type { ChoiceId, ReviewQueueCandidate } from "@/lib/actuary-first/types";
import { getProbabilitySampleSet } from "@/lib/actuary-first/sample-data";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

type ReviewPageStatus = "loading" | "ready" | "completed" | "error" | "submitting";

export function ActuaryFirstReviewQueuePage({ subjectId }: { subjectId: string }) {
  const [status, setStatus] = useState<ReviewPageStatus>("loading");
  const [items, setItems] = useState<ReviewQueueCandidate[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<ChoiceId | null>(null);
  const [memo, setMemo] = useState("");

  useEffect(() => {
    void loadQueue();
  }, []);

  async function loadQueue() {
    setStatus("loading");
    try {
      const response = await fetch("/api/actuary-first/review-queue?subjectId=probability", { cache: "no-store" });
      const result = (await response.json()) as { ok: boolean; data?: ReviewQueueCandidate[] };
      const queue = result.data ?? [];
      setItems(queue);
      setActiveId(queue[0]?.id ?? null);
      setStatus(queue.length ? "ready" : "completed");
    } catch {
      setStatus("error");
    }
  }

  const activeItem = useMemo(() => items.find((item) => item.id === activeId) ?? null, [activeId, items]);
  const activeQuestion = useMemo(() => {
    if (!activeItem) return null;
    return getProbabilitySampleSet(activeItem.setId).questions.find((question) => question.question_id === activeItem.questionId) ?? null;
  }, [activeItem]);

  async function submitReview() {
    if (!activeItem || !selectedChoiceId) return;
    setStatus("submitting");
    const payload = {
      reviewId: activeItem.id,
      setId: activeItem.setId,
      questionId: activeItem.questionId,
      selectedChoiceId,
      memo,
    };
    await postActuaryFirst("/api/actuary-first/review-completions", payload);
    logInvergeEvent("first.review_item.completed", {
      examId: "actuary_first",
      stage: "first",
      subjectId,
      setId: activeItem.setId,
      questionId: activeItem.questionId,
      reviewId: activeItem.id,
      properties: {
        priority: activeItem.reviewPriority,
        rootCauseTag: activeItem.rootCauseTags[0],
      },
    });
    const nextItems = items.filter((item) => item.id !== activeItem.id);
    setItems(nextItems);
    setActiveId(nextItems[0]?.id ?? null);
    setSelectedChoiceId(null);
    setMemo("");
    setStatus(nextItems.length ? "ready" : "completed");
  }

  if (status === "loading") {
    return (
      <main className="mx-auto w-full max-w-[880px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
          <p className="text-sm text-[color:var(--muted)]">리뷰 후보를 정리하고 있습니다.</p>
        </section>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="mx-auto w-full max-w-[880px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
          <h1 className="text-h2 font-medium text-[color:var(--foreground-strong)]">리뷰 후보를 불러오지 못했습니다.</h1>
          <Button type="button" onClick={() => void loadQueue()} className="mt-6">
            다시 시도
            <RotateCcw className="ml-2 h-4 w-4" />
          </Button>
        </section>
      </main>
    );
  }

  if (status === "completed" || !activeItem || !activeQuestion) {
    return (
      <main className="mx-auto w-full max-w-[880px] px-5 py-10">
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8 sm:p-10">
          <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">지금 바로 볼 리뷰 항목은 없습니다.</h1>
          <p className="mt-4 text-body text-[color:var(--muted)]">방금 제출한 세트가 있으면 기록에서 반복되는 포인트를 먼저 확인하면 됩니다.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/exams/actuary-first/probability/records" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
              기록 보기
            </Link>
            <Link href="/exams/actuary-first/probability/past-set/intro-12" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}>
              세트 다시 풀기
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[880px] px-5 py-10">
      <div className="space-y-6">
        <div className="flex justify-end">
          <FocusAudioControl />
        </div>
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
            <div>
              <p className="text-caption text-[color:var(--muted)]">리뷰 후보 · {activeItem.reviewPriority}</p>
              <h1 className="mt-3 text-h2 font-medium text-[color:var(--foreground-strong)]">{activeItem.reviewReasonSentence}</h1>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{activeItem.recommendedReviewAction}</p>
            </div>
            <div className="rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption text-[color:var(--muted-strong)]">
              {items.length}개 남음
            </div>
          </div>

          <div className="mt-6">
            <p className="text-caption text-[color:var(--muted)]">{activeQuestion.problem_family}</p>
            <h2 className="mt-3 text-base font-medium leading-7 text-[color:var(--foreground-strong)]">{activeQuestion.stem}</h2>
            <div className="mt-5 space-y-2">
              {activeQuestion.choices.map((choice) => {
                const selected = selectedChoiceId === choice.id;
                const correct = choice.id === activeQuestion.correct_choice_id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setSelectedChoiceId(choice.id)}
                    className={cn(
                      "flex w-full gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition",
                      selected
                        ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)]"
                        : "border-[var(--border)] hover:border-[var(--border-strong)]",
                      correct && status === "submitting" ? "border-[color:var(--status-green)]" : "",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-sm font-medium">
                      {choice.id}
                    </span>
                    <span className="text-sm leading-6 text-[color:var(--foreground-strong)]">{choice.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mt-6 block">
            <span className="text-caption font-medium text-[color:var(--muted)]">짧은 메모</span>
            <input
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="다음에 먼저 볼 포인트만 짧게 적습니다."
              className="mt-2 h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-3 text-sm outline-none transition placeholder:text-[color:var(--muted)] focus:border-[var(--primary)]"
            />
          </label>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[color:var(--muted)]">{activeItem.rootCauseTags[0]?.replaceAll("_", " ") ?? "review"}</p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setActiveId(items[1]?.id ?? activeItem.id)} disabled={items.length < 2}>
                다음 후보 보기
              </Button>
              <Button type="button" onClick={() => void submitReview()} disabled={!selectedChoiceId || status === "submitting"}>
                {status === "submitting" ? "저장 중" : "리뷰 완료"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

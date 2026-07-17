"use client";

import { useMemo, useState } from "react";

import { V3ActionButton } from "@/components/learner";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FeedbackRating = "helpful" | "unclear" | "not_helpful";

type ResultFeedbackPromptProps = {
  route?: string;
  pageContext?: Record<string, unknown>;
  presentation?: "legacy" | "v3";
};

export function ResultFeedbackPrompt({
  route = "unknown",
  pageContext = {},
  presentation = "legacy",
}: ResultFeedbackPromptProps) {
  const [selected, setSelected] = useState<FeedbackRating | null>(null);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmitNote = useMemo(() => Boolean(selected) && note.trim().length > 0 && !isSubmitting, [selected, note, isSubmitting]);

  const submitFeedback = async (rating: FeedbackRating, noteValue?: string) => {
    setIsSubmitting(true);
    setStatus("idle");
    try {
      const response = await fetch("/api/review-os/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route,
          rating,
          note: noteValue,
          pageContext,
        }),
      });
      if (!response.ok) throw new Error("feedback_submit_failed");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (presentation === "v3") {
    return (
      <section
        className="space-y-4 border-t border-[var(--color-border-default)] pt-4"
        aria-labelledby="result-feedback-heading"
        data-v3-component="ResultFeedbackPrompt"
      >
        <p id="result-feedback-heading" className="v3-type-label-strong text-[var(--color-text-primary)]">
          이 결과가 도움이 되었나요?
        </p>
        <div className="grid gap-2 sm:grid-cols-3" role="group" aria-label="결과 도움 정도">
          {[
            ["helpful", "도움됨"],
            ["unclear", "애매함"],
            ["not_helpful", "도움 안 됨"],
          ].map(([value, label]) => (
            <V3ActionButton
              key={value}
              type="button"
              tone="secondary"
              disabled={isSubmitting}
              aria-pressed={selected === value}
              onClick={() => {
                const rating = value as FeedbackRating;
                setSelected(rating);
                void submitFeedback(rating, note.trim() || undefined);
              }}
              className={selected === value ? "border-[var(--color-border-focus)] bg-[var(--color-background-focus)]" : undefined}
            >
              {label}
            </V3ActionButton>
          ))}
        </div>
        <label className="block space-y-2">
          <span className="v3-type-caption text-[var(--color-text-secondary)]">무엇이 부족했나요?</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="v3-type-body min-h-24 w-full rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--focus-ring)]"
            placeholder="선택 입력"
          />
        </label>
        <div className="space-y-2">
          <V3ActionButton
            type="button"
            tone="secondary"
            disabled={!canSubmitNote}
            onClick={() => {
              if (!selected) return;
              void submitFeedback(selected, note.trim() || undefined);
            }}
          >
            의견 보내기
          </V3ActionButton>
          {status === "success" ? (
            <p role="status" className="v3-type-caption text-[var(--color-text-secondary)]">의견이 저장되었습니다.</p>
          ) : null}
          {status === "error" ? (
            <p role="alert" className="v3-type-caption text-[var(--color-text-risk)]">의견을 저장하지 못했습니다. 나중에 다시 시도해 주세요.</p>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-3">
      <p className="text-caption font-medium text-[color:var(--foreground-strong)]">이 결과가 도움이 되었나요?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          ["helpful", "도움됨"],
          ["unclear", "애매함"],
          ["not_helpful", "도움 안 됨"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              const rating = value as FeedbackRating;
              setSelected(rating);
              void submitFeedback(rating, note.trim() || undefined);
            }}
            className={cn(buttonVariants({ variant: selected === value ? "default" : "outline" }), "min-h-11 px-3 text-xs")}
          >
            {label}
          </button>
        ))}
      </div>
      <label className="mt-2 block">
        <span className="text-xs text-[color:var(--muted)]">무엇이 부족했나요?</span>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-[72px] text-xs" placeholder="선택 입력" />
      </label>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={!canSubmitNote}
          onClick={() => {
            if (!selected) return;
            void submitFeedback(selected, note.trim() || undefined);
          }}
          className={cn(buttonVariants({ variant: "outline" }), "min-h-11 px-2 text-xs")}
        >
          의견 보내기
        </button>
        {status === "success" ? <p className="text-xs text-[color:var(--muted)]">의견이 저장되었습니다.</p> : null}
        {status === "error" ? <p className="text-xs text-[color:var(--muted)]">의견을 저장하지 못했습니다. 나중에 다시 시도해 주세요.</p> : null}
      </div>
    </article>
  );
}

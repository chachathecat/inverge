"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  dismissFeedbackPrompt,
  markFeedbackPromptShown,
  shouldShowFeedbackPrompt,
  snoozeFeedbackPrompt,
  submitFeedbackResponse,
} from "@/lib/inverge/feedback-client";
import { getFeedbackQuestion, type FeedbackContext, type FeedbackRating, type FeedbackTrigger } from "@/lib/inverge/feedback";
import { cn } from "@/lib/utils";

type FeedbackPromptProps = {
  trigger: FeedbackTrigger;
  context: FeedbackContext;
  className?: string;
};

export function FeedbackPrompt({ trigger, context, className }: FeedbackPromptProps) {
  const question = getFeedbackQuestion(trigger);
  const [visible, setVisible] = useState(false);
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [freeText, setFreeText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const selectedOption = useMemo(
    () => question.options.find((option) => option.rating === selectedRating) ?? null,
    [question.options, selectedRating],
  );

  useEffect(() => {
    if (!shouldShowFeedbackPrompt(trigger, context)) return;

    markFeedbackPromptShown(trigger, context);
    const timer = window.setTimeout(() => setVisible(true), 0);

    return () => window.clearTimeout(timer);
  }, [context, trigger]);

  if (!visible) return null;

  function submit(rating: FeedbackRating, text = freeText) {
    submitFeedbackResponse({
      trigger,
      context,
      rating,
      freeText: text,
    });
    setSubmitted(true);
    window.setTimeout(() => setVisible(false), 900);
  }

  function handleRating(rating: FeedbackRating) {
    const option = question.options.find((item) => item.rating === rating);
    if (!option) return;

    setSelectedRating(rating);
    if (!option.requiresText) {
      submit(rating, "");
    }
  }

  function handleSnooze() {
    snoozeFeedbackPrompt(trigger, context);
    setVisible(false);
  }

  function handleDismiss() {
    dismissFeedbackPrompt(trigger, context);
    setVisible(false);
  }

  return (
    <section
      className={cn(
        "rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-4",
        className,
      )}
      aria-live="polite"
    >
      {submitted ? (
        <p className="text-sm leading-6 text-[color:var(--muted-strong)]">고맙습니다. 제품 운영 리뷰에 반영하겠습니다.</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{question.title}</p>
              <p className="mt-1 text-caption text-[color:var(--muted)]">{question.helper}</p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[color:var(--muted)] transition hover:bg-[color:var(--surface-soft)] hover:text-[color:var(--foreground-strong)]"
              aria-label="피드백 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {question.options.map((option) => (
              <button
                key={option.rating}
                type="button"
                onClick={() => handleRating(option.rating)}
                className={cn(
                  "h-9 rounded-full border px-3.5 text-[13px] font-medium transition",
                  selectedRating === option.rating
                    ? "border-[color:var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--foreground-strong)]"
                    : "border-[var(--border)] bg-transparent text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {selectedOption?.requiresText ? (
            <div className="mt-4">
              <textarea
                value={freeText}
                onChange={(event) => setFreeText(event.target.value)}
                maxLength={500}
                className="min-h-20 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-3 text-sm leading-6 text-[color:var(--foreground-strong)] outline-none transition placeholder:text-[color:var(--muted)] focus:border-[color:var(--primary)]"
                placeholder="어떤 지점이 애매했는지만 짧게 남겨 주세요."
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-caption text-[color:var(--muted)]">운영자가 확인할 신호로만 사용합니다.</p>
                <Button type="button" variant="outline" onClick={() => submit(selectedOption.rating)} className="w-full sm:w-auto">
                  보내기
                </Button>
              </div>
            </div>
          ) : null}

          {!selectedOption?.requiresText ? (
            <button
              type="button"
              onClick={handleSnooze}
              className="mt-3 text-caption text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]"
            >
              나중에 답하기
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

"use client";

import { useId, useState } from "react";

import { V3ActionButton } from "@/components/learner";
import { Button } from "@/components/ui/button";

type FeedbackButtonProps = {
  route: string;
  pageContext: Record<string, unknown>;
  presentation?: "legacy" | "v3";
};

export function ReviewOsFeedbackButton({
  route,
  pageContext,
  presentation = "legacy",
}: FeedbackButtonProps) {
  const feedbackFieldId = useId();
  const feedbackHelpId = `${feedbackFieldId}-help`;
  const feedbackPanelId = `${feedbackFieldId}-panel`;
  const feedbackErrorId = `${feedbackFieldId}-error`;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isV3 = presentation === "v3";

  async function handleSubmit() {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/os/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ route, pageContext, message }),
      });

      if (!response.ok) {
        setError("전송이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setSubmitted(true);
      setMessage("");
      window.setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 900);
    } catch {
      setError("전송이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isV3) {
    return (
      <div className="space-y-3">
        <Button type="button" variant="outline" onClick={() => setOpen((prev) => !prev)}>
          답안길 피드백 보내기
        </Button>

        {open ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="감평사 학습 흐름에서 어색한 문장, 부족한 기능, 다음 행동이 불분명한 지점을 적어 주세요."
              className="min-h-24 w-full resize-none rounded-2xl border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-3 text-sm leading-7 outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-[color:var(--muted)]">답안길 개선용으로만 사용합니다.</p>
              <Button type="button" onClick={() => void handleSubmit()} disabled={!message.trim() || submitting}>
                {submitted ? "보냈습니다" : submitting ? "보내는 중..." : "보내기"}
              </Button>
            </div>
            {error ? <p className="mt-2 text-xs text-[color:var(--muted)]">{error}</p> : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3" data-feedback-presentation="v3">
      <V3ActionButton
        type="button"
        tone="secondary"
        aria-expanded={open}
        aria-controls={feedbackPanelId}
        onClick={() => setOpen((prev) => !prev)}
      >
        답안길 피드백 보내기
      </V3ActionButton>

      {open ? (
        <section
          id={feedbackPanelId}
          className="rounded-[var(--v3-radius-panel)] border border-[var(--color-border-default)] bg-[var(--color-background-surface)] p-4 sm:p-5"
          data-v3-component="Surface"
          data-v3-tone="surface"
        >
          <label htmlFor={feedbackFieldId} className="sr-only">
            답안길 개선 피드백
          </label>
          <textarea
            id={feedbackFieldId}
            aria-describedby={`${feedbackHelpId}${error ? ` ${feedbackErrorId}` : ""}`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="감평사 학습 흐름에서 어색한 문장, 부족한 기능, 다음 행동이 불분명한 지점을 적어 주세요."
            className="v3-type-body min-h-24 w-full resize-none rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-border-focus)] focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-background-canvas)]"
          />
          <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p id={feedbackHelpId} className="v3-type-caption text-[var(--color-text-secondary)]">
              답안길 개선용으로만 사용합니다.
            </p>
            <V3ActionButton
              type="button"
              tone="secondary"
              onClick={() => void handleSubmit()}
              disabled={!message.trim() || submitting}
            >
              {submitted ? "보냈습니다" : submitting ? "보내는 중..." : "보내기"}
            </V3ActionButton>
          </div>
          {error ? (
            <p
              id={feedbackErrorId}
              role="alert"
              className="v3-type-caption mt-3 rounded-[var(--v3-radius-control)] border border-[var(--color-border-risk)] bg-[var(--color-background-risk)] p-3 text-[var(--color-text-risk)]"
            >
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

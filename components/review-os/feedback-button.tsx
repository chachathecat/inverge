"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type FeedbackButtonProps = {
  route: string;
  pageContext: Record<string, unknown>;
};

export function ReviewOsFeedbackButton({ route, pageContext }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={() => setOpen((prev) => !prev)}>
        closed beta 피드백 보내기
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
            <p className="text-xs text-[color:var(--muted)]">closed beta 개선용으로만 사용합니다.</p>
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

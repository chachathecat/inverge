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

  async function handleSubmit() {
    if (!message.trim()) return;

    const response = await fetch("/api/os/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route, pageContext, message }),
    });

    if (response.ok) {
      setSubmitted(true);
      setMessage("");
      window.setTimeout(() => {
        setSubmitted(false);
        setOpen(false);
      }, 900);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" variant="outline" onClick={() => setOpen((prev) => !prev)}>
        beta 피드백 보내기
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
            <Button type="button" onClick={() => void handleSubmit()} disabled={!message.trim()}>
              {submitted ? "보냈습니다" : "보내기"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

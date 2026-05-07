"use client";

import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ResultFeedbackPrompt() {
  const [selected, setSelected] = useState<"helpful" | "unclear" | "not_helpful" | null>(null);
  const [note, setNote] = useState("");

  return (
    <article className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-3">
      <p className="text-caption font-medium text-[color:var(--foreground-strong)]">이 결과가 도움이 되었나요?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          ["helpful", "도움됨"],
          ["unclear", "애매함"],
          ["not_helpful", "도움 안 됨"],
        ].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setSelected(value as "helpful" | "unclear" | "not_helpful")} className={cn(buttonVariants({ variant: selected === value ? "default" : "outline" }), "h-8 px-3 text-xs")}>
            {label}
          </button>
        ))}
      </div>
      <label className="mt-2 block">
        <span className="text-[11px] text-[color:var(--muted)]">무엇이 부족했나요?</span>
        <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-1 min-h-[72px] text-xs" placeholder="선택 입력" />
      </label>
      <p className="mt-1 text-[11px] text-[color:var(--muted)]">TODO(v1): beta feedback API 연결 전까지 로컬 상태만 저장합니다.</p>
    </article>
  );
}

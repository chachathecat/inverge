"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { MODE_MIGRATION_CONFIRMATION_COPY } from "@/lib/review-os/mode-migration";

export function ModeMigrationConfirmation() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function confirmMigration() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/os/mode-migration", { method: "POST" });
      const result = (await response.json()) as { ok?: boolean };
      if (!response.ok || !result.ok) {
        setError("전환을 완료하지 못했습니다. 1차 기록은 그대로 보관되어 있습니다.");
        return;
      }
      router.push("/app?mode=second&migrated=1");
      router.refresh();
    } catch {
      setError("전환을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-5">
      <div className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-5 shadow-none sm:p-6">
        <p className="text-caption text-[color:var(--muted)]">학습 모드 전환</p>
        <h1 className="mt-2 text-title-md text-[color:var(--foreground-strong)]">2차 준비로 전환</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted-strong)]">{MODE_MIGRATION_CONFIRMATION_COPY}</p>
        <p className="mt-3 text-xs leading-6 text-[color:var(--muted)]">
          외부 결과를 판단하지 않습니다. 원하실 때 직접 전환하는 설정입니다.
        </p>

        <details className="mt-5 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[color:var(--foreground-strong)]">보관되는 것</summary>
          <div className="space-y-2 border-t border-[color:var(--border-subtle)] px-4 py-3 text-sm leading-6 text-[color:var(--muted)]">
            <p>1차 O/X 시도, 개념 카드, 빈칸 복습 이력은 삭제하지 않습니다.</p>
            <p>회계·경제 템플릿 재시도, 약한 과목, 민법·법규 개념 카드도 1차 기록으로 남습니다.</p>
            <p>보관된 1차 노트는 노트 화면에서 계속 확인할 수 있습니다.</p>
          </div>
        </details>

        <details className="mt-3 rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[color:var(--foreground-strong)]">2차에서 이어지는 것</summary>
          <div className="space-y-2 border-t border-[color:var(--border-subtle)] px-4 py-3 text-sm leading-6 text-[color:var(--muted)]">
            <p>법 관련 개념 후보, 반복 약점 주제, 확신 패턴, 복습 단계 요약만 안전한 파생 신호로 이어집니다.</p>
            <p>원문 OCR, 사용자 답안, 문제 지문 같은 원자료 텍스트는 전환 메타데이터로 복사하지 않습니다.</p>
            <p>오늘 계획은 답안 다시쓰기, 쟁점 찾기, CASIO 연습, 2차 review queue 중심으로 바뀝니다.</p>
          </div>
        </details>

        {error ? <p className="mt-4 text-sm text-[color:var(--status-red)]">{error}</p> : null}

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <Link href="/app?mode=first" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] px-4 text-sm font-medium text-[color:var(--foreground-strong)]">
            취소
          </Link>
          <Link href="/app?mode=first" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border-subtle)] px-4 text-sm font-medium text-[color:var(--muted-strong)]">
            나중에 전환
          </Link>
          <Button type="button" onClick={confirmMigration} disabled={submitting} className="min-h-11 w-full">
            {submitting ? "전환 중" : "2차 준비로 전환"}
          </Button>
        </div>
      </div>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type StudyLedgerFocusChromeProps = {
  title?: string | null;
  mobileStatus: string;
  desktopStatus?: string;
};

export function StudyLedgerFocusChrome({
  title,
  mobileStatus,
  desktopStatus = mobileStatus,
}: StudyLedgerFocusChromeProps) {
  const searchParams = useSearchParams();
  if (searchParams.get("mode") !== "second") return null;

  const breadcrumb = title?.trim() ? `학습 노트 / ${title.trim()}` : "학습 노트";

  return (
    <header
      className="h-[calc(56px+env(safe-area-inset-top))] w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] lg:h-[calc(72px+env(safe-area-inset-top))]"
      data-s232d1-ledger-chrome
      data-v3-mobile-node="56:3"
      data-v3-desktop-node="59:63"
    >
      <div
        className="grid h-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 pb-0 pl-[max(0.25rem,env(safe-area-inset-left))] pr-[max(0.25rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] lg:hidden"
        data-s232d1-mobile-chrome
      >
        <Link
          href="/app/notes?mode=second"
          aria-label="학습 노트로 돌아가기"
          className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-2xl leading-none text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
          data-s232d1-ledger-back
        >
          <span aria-hidden="true">‹</span>
        </Link>
        <p className="truncate text-center text-sm font-semibold text-[var(--text-primary)]">학습 노트</p>
        <p className="pr-3 text-xs font-medium text-[var(--text-secondary)]" role="status">
          {mobileStatus}
        </p>
      </div>

      <div
        className="hidden h-full min-w-0 items-center gap-6 pb-0 pl-[max(4rem,env(safe-area-inset-left))] pr-[max(4rem,env(safe-area-inset-right))] pt-[env(safe-area-inset-top)] lg:flex"
        data-s232d1-desktop-chrome
      >
        <Link
          href="/app?mode=second"
          aria-label="답안길 오늘 할 일로 이동"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]"
        >
          <span>답안길</span>
          <span className="text-xs font-medium text-[var(--text-secondary)]">by Inverge</span>
        </Link>
        <p
          className="min-w-0 flex-1 truncate text-sm text-[var(--text-secondary)]"
          title={breadcrumb}
          data-s232d1-ledger-breadcrumb
        >
          {breadcrumb}
        </p>
        <p className="shrink-0 text-xs font-medium text-[var(--text-secondary)]" role="status">
          {desktopStatus}
        </p>
      </div>
    </header>
  );
}

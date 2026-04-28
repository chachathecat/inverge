"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

import { RefinedShell } from "@/components/inverge/refined-primitives";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { getModeConfig, parseAppraisalMode, type AppraisalMode } from "@/lib/review-os/appraisal";
import { cn } from "@/lib/utils";

type AppShellProps = {
  email: string | null;
  mode: AppraisalMode;
  children: ReactNode;
  rightSlot?: ReactNode;
};

const NAV_ITEMS = [
  { href: "/app/capture", label: "입력" },
  { href: "/app", label: "오늘 실행" },
  { href: "/app/review", label: "다시 볼 항목" },
  { href: "/app/items", label: "기록" },
  { href: "/app/weekly", label: "주간 정리" },
  { href: "/app/settings", label: "수험 설정" },
] as const;

export function ReviewOsAppShell({ email, mode, children, rightSlot }: AppShellProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentMode = parseAppraisalMode(searchParams.get("mode")) ?? mode;
  const config = getModeConfig(currentMode);
  const homeHref = `/app?mode=${currentMode}`;

  return (
    <RefinedShell className="space-y-8 py-7 sm:py-10">
      <div className="flex flex-col gap-6 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href={homeHref} className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--brand-900)] text-sm font-medium text-[color:var(--text-inverse)]">
                IV
              </span>
              <span className="text-title text-[color:var(--foreground-strong)]">Inverge</span>
            </Link>
            <span className="rounded-full border border-[var(--border)] bg-[color:var(--bg-elevated)] px-3 py-1 text-xs text-[color:var(--muted)]">
              {config.shortLabel}
            </span>
          </div>
          <p className="text-xs text-[color:var(--muted)]">{config.label} 운영 화면</p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          {rightSlot}
          <div className="flex items-center gap-3">
            <span className="max-w-[220px] truncate text-sm text-[color:var(--muted)]">{email ?? "로그인한 사용자"}</span>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-[color:var(--muted)]">{config.label} 입력 기반 학습 실행 화면</div>
        <nav className="overflow-x-auto">
          <div className="flex min-w-max gap-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={`${item.href}?mode=${currentMode}`}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  pathname === item.href
                    ? "border-[color:var(--brand-700)] bg-[color:var(--brand-050)] text-[color:var(--brand-900)]"
                    : "border-[var(--border)] text-[color:var(--muted)] hover:bg-[color:var(--bg-elevated)] hover:text-[color:var(--foreground-strong)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {children}
    </RefinedShell>
  );
}

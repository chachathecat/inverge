import Link from "next/link";

import { SignOutButton } from "@/components/shared/sign-out-button";
import { getServerSessionUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const session = await getServerSessionUser();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color:color-mix(in_srgb,var(--surface)_92%,transparent)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-5 px-5 py-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--primary)] text-sm font-semibold text-white">
            답
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="text-base font-semibold tracking-normal text-[color:var(--foreground-strong)]">답안길</p>
              <p className="text-[11px] font-medium text-[color:var(--muted)]">by Inverge</p>
            </div>
            <p className="truncate text-caption text-[color:var(--muted)]">감정평가사 2차 답안 훈련 OS</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          {session.authEnabled && session.isAuthenticated ? (
            <>
              <Link
                href="/app"
                className="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
              >
                오늘
              </Link>
              <span className="max-w-[180px] truncate text-sm text-[color:var(--muted)]">{session.email ?? "로그인됨"}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/"
                className="rounded-full px-3 py-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]"
              >
                소개
              </Link>
              <Link href="/answer-review?mode=second" className="rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-white">
                오늘 답안 올리기
              </Link>
              {session.authEnabled ? (
                <Link
                  href="/login"
                  className="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
                >
                  로그인
                </Link>
              ) : (
                <span className="rounded-full border border-[var(--border)] px-3 py-2 text-sm text-[color:var(--muted)]">demo</span>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

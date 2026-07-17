import Link from "next/link";

import { SignOutButton } from "@/components/shared/sign-out-button";
import { getServerSessionUser } from "@/lib/auth/session";

const DEMO_CAPTURE_HREF = "/app/capture?mode=second";
const AUTH_CAPTURE_HREF = "/login?returnTo=/app/capture?mode=second";

export async function SiteHeader() {
  const session = await getServerSessionUser();
  const publicCaptureHref = session.authEnabled ? AUTH_CAPTURE_HREF : DEMO_CAPTURE_HREF;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border-default)] bg-[var(--color-background-surface)]" data-v3-shell="public-header">
      <div className="mx-auto flex h-14 w-full max-w-[var(--layout-content-max)] items-center justify-between gap-5 px-[var(--layout-page-edge)] md:h-[72px]">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-3 rounded-[var(--v3-radius-control)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2">
          <div className="v3-type-label-strong flex h-9 w-9 items-center justify-center rounded-[var(--v3-radius-control)] bg-[var(--color-background-brand)] text-[var(--color-text-inverse)]">
            답
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <p className="v3-type-body-strong text-[var(--color-text-primary)]">답안길</p>
              <p className="v3-type-caption text-[var(--color-text-secondary)]">by Inverge</p>
            </div>
            <p className="v3-type-caption truncate text-[var(--color-text-secondary)]">감정평가사 2차 답안 훈련 OS</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex" aria-label="공개 메뉴">
          {session.authEnabled && session.isAuthenticated ? (
            <>
              <Link
                href="/app"
                className="v3-type-label-strong inline-flex min-h-11 items-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] px-4 text-[var(--color-text-primary)]"
              >
                오늘
              </Link>
              <span className="v3-type-caption max-w-[180px] truncate text-[var(--color-text-secondary)]">{session.email ?? "로그인됨"}</span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/"
                className="v3-type-label inline-flex min-h-11 items-center rounded-[var(--v3-radius-control)] px-3 text-[var(--color-text-secondary)] hover:bg-[var(--color-background-subtle)] hover:text-[var(--color-text-primary)]"
              >
                소개
              </Link>
              <Link
                href={publicCaptureHref}
                className="v3-type-label-strong inline-flex min-h-11 items-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-strong)] bg-[var(--color-background-surface)] px-4 text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
              >
                답안 1개 올리기
              </Link>
              {session.authEnabled ? (
                <Link
                  href="/login"
                  className="v3-type-label inline-flex min-h-11 items-center rounded-[var(--v3-radius-control)] px-3 text-[var(--color-text-primary)] hover:bg-[var(--color-background-subtle)]"
                >
                  로그인
                </Link>
              ) : (
                <span className="v3-type-caption rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] px-3 py-2 text-[var(--color-text-secondary)]">demo</span>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

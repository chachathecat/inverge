"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { SignOutButton } from "@/components/shared/sign-out-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { getModeConfig, type AppraisalMode } from "@/lib/review-os/appraisal";
import { pushLocalLearnerAnalyticsEvent } from "@/lib/review-os/local-analytics";
import { cn } from "@/lib/utils";

type LearnerShellProps = {
  email: string | null;
  children: ReactNode;
  rightSlot?: ReactNode;
};

type LearnerNavItem = {
  href: string;
  label: string;
  mobileLabel: string;
  preserveMode: true;
  activeHrefs?: readonly string[];
  analyticsAction: string;
};

const LEARNER_NAV_ITEMS: readonly LearnerNavItem[] = [
  {
    href: "/app",
    label: "오늘 할 일",
    mobileLabel: "오늘",
    preserveMode: true,
    activeHrefs: ["/app", "/app/today", "/app/session", "/app/weekly"],
    analyticsAction: "today",
  },
  {
    href: "/app/capture",
    label: "오늘 한 것",
    mobileLabel: "답안",
    preserveMode: true,
    activeHrefs: ["/app/capture", "/app/input", "/app/entry", "/app/write"],
    analyticsAction: "input",
  },
  {
    href: "/app/notes",
    label: "학습 노트",
    mobileLabel: "교정 노트",
    preserveMode: true,
    activeHrefs: ["/app/notes", "/app/items", "/app/calculator"],
    analyticsAction: "notes",
  },
  { href: "/app/review", label: "복습", mobileLabel: "복습", preserveMode: true, analyticsAction: "review" },
  {
    href: "/app/agenda",
    label: "학습 기록",
    mobileLabel: "기록",
    preserveMode: true,
    activeHrefs: ["/app/agenda", "/app/study-log"],
    analyticsAction: "agenda",
  },
] as const;

function matchesLearnerNavPath(pathname: string, item: LearnerNavItem) {
  const activeHrefs = item.activeHrefs ?? [item.href];
  return activeHrefs.some((activeHref) => pathname === activeHref || (activeHref !== "/app" && pathname.startsWith(`${activeHref}/`)));
}

export function LearnerShell({ email, children, rightSlot }: LearnerShellProps) {
  const pathname = usePathname();
  // The authenticated learner shell intentionally exposes only the second-round Answer Road OS.
  // First-round code remains compatibility-only and is not surfaced in learner navigation.
  const currentMode: AppraisalMode = "second";
  const config = getModeConfig(currentMode);
  const homeHref = `/app?mode=${currentMode}`;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[color:var(--bg-canvas)]" data-learner-shell>
      <a
        href="#learner-main"
        className="fixed left-[max(1rem,env(safe-area-inset-left))] top-[max(1rem,env(safe-area-inset-top))] z-[60] inline-flex min-h-11 -translate-y-[200%] items-center rounded-[var(--radius-md)] bg-[color:var(--brand-900)] px-4 text-sm font-semibold text-[color:var(--text-inverse)] transition-transform focus:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]"
      >
        학습 내용으로 바로가기
      </a>
      <div className="mx-auto flex w-full max-w-[1120px] flex-col pb-[calc(6rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pt-[calc(1.5rem+env(safe-area-inset-top))] lg:pb-12 lg:pl-[max(2rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))]">
        <header className="space-y-4 border-b border-[var(--border-subtle)] pb-4 sm:pb-5" aria-label="학습 공간 헤더">
          <div className="flex items-start justify-between gap-3">
            <Link href={homeHref} className="flex min-h-11 min-w-0 items-center gap-3 rounded-[var(--radius-md)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]" aria-label="답안길 오늘 학습으로 이동">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-900)] text-sm font-semibold text-[color:var(--text-inverse)]">
                답
              </span>
              <span className="min-w-0">
                <span className="flex items-baseline gap-2">
                  <span className="text-base font-semibold tracking-normal text-[color:var(--foreground-strong)]">답안길</span>
                  <span className="text-xs font-medium text-[color:var(--muted)]">by Inverge</span>
                </span>
                <span className="block truncate text-xs text-[color:var(--muted)]">감정평가사 2차 답안 훈련 OS</span>
              </span>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              {rightSlot ? <div className="hidden sm:block">{rightSlot}</div> : null}
              <SignOutButton />
            </div>
          </div>

          <nav aria-label="학습 메뉴" className="grid grid-cols-5 gap-1 sm:flex sm:flex-wrap sm:gap-1.5">
            {LEARNER_NAV_ITEMS.map((item) => {
              const href = item.href;
              const nextHref = item.preserveMode ? `${href}?mode=${currentMode}` : href;
              const active = matchesLearnerNavPath(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={nextHref}
                  onClick={() => {
                    pushLocalLearnerAnalyticsEvent({
                      event: "learner_navigation",
                      surface: "learner_shell",
                      route: href,
                      mode: currentMode,
                      action: item.analyticsAction,
                      status: "clicked",
                    });
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border px-0.5 text-xs font-medium leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)] sm:px-3.5 sm:text-sm",
                    active
                      ? "border-[color:var(--brand-700)] bg-[color:var(--brand-050)] text-[color:var(--brand-900)]"
                      : "border-transparent bg-transparent text-[color:var(--muted)] hover:bg-[color:var(--surface)] hover:text-[color:var(--foreground-strong)]",
                  )}
                >
                  <span className="sm:hidden">{item.mobileLabel}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[color:var(--muted)]" data-s224v-learner-mode-entry="second-only">
            <span>{config.label} · 실무·이론·법규</span>
            <span className="max-w-full truncate">{email ?? "로그인한 사용자"}</span>
          </div>
        </header>

        <main id="learner-main" tabIndex={-1} className="w-full min-w-0 py-5 sm:py-7" aria-label="학습 내용">
          {children}
        </main>
      </div>
    </div>
  );
}

export function LearnerProgressBar({
  current,
  total,
  label = "진행",
  helper,
}: {
  current: number;
  total: number;
  label?: string;
  helper?: string;
}) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 0), safeTotal);
  const percent = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <section className="space-y-2" aria-label={`${label} ${percent}%`}>
      <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--muted)]">
        <span>{label}</span>
        <span className="tabular-nums">{safeCurrent} / {safeTotal}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color:var(--bg-subtle)]" role="progressbar" aria-valuemin={0} aria-valuemax={safeTotal} aria-valuenow={safeCurrent} aria-label={label}>
        <div className="h-full rounded-full bg-[color:var(--brand-900)] transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      {helper ? <p className="text-xs leading-5 text-[color:var(--muted)]">{helper}</p> : null}
    </section>
  );
}

export function SingleFocusCard({ eyebrow, title, description, children, footer, className }: { eyebrow?: string; title: string; description?: string; children: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <section className={cn("w-full min-w-0 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] p-5 shadow-[var(--shadow-focus)] sm:p-7", className)}>
      <div className="space-y-2">
        {eyebrow ? <p className="text-xs font-medium text-[color:var(--muted)]">{eyebrow}</p> : null}
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.035em] text-[color:var(--foreground-strong)] sm:text-[30px]">{title}</h1>
        {description ? <p className="text-[15px] leading-7 text-[color:var(--muted)]">{description}</p> : null}
      </div>
      <div className="mt-6 min-w-0">{children}</div>
      {footer ? <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">{footer}</div> : null}
    </section>
  );
}

export function BottomPrimaryAction({ children, secondary, className }: { children: ReactNode; secondary?: ReactNode; className?: string }) {
  return (
    <div className={cn("fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-subtle)] bg-[color:var(--bg-surface)] pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-3 sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0", className)}>
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-2 sm:max-w-none sm:flex-row sm:items-center">
        {children}
        {secondary ? <div className="sm:ml-2">{secondary}</div> : null}
      </div>
    </div>
  );
}

export function LearnerPrimaryLink({ className, ...props }: ComponentPropsWithoutRef<typeof Link>) {
  return <Link className={cn(buttonVariants({ size: "lg" }), "min-h-11 w-full sm:w-auto", className)} {...props} />;
}

export function LearnerPrimaryButton({ className, ...props }: ComponentPropsWithoutRef<typeof Button>) {
  return <Button className={cn("min-h-11 w-full sm:w-auto", className)} size="lg" {...props} />;
}

type FeedbackTone = "correct" | "incorrect" | "warning" | "saved" | "neutral";

const FEEDBACK_TONE_CLASS: Record<FeedbackTone, string> = {
  correct: "border-[color:rgba(46,110,88,0.24)] bg-[color:var(--cue-stable-bg)] text-[color:var(--foreground-strong)]",
  incorrect: "border-[color:rgba(178,77,69,0.24)] bg-[color:var(--cue-risk-bg)] text-[color:var(--foreground-strong)]",
  warning: "border-[color:rgba(181,107,22,0.24)] bg-[color:var(--cue-review-bg)] text-[color:var(--foreground-strong)]",
  saved: "border-[color:rgba(46,110,88,0.24)] bg-[color:var(--cue-stable-bg)] text-[color:var(--foreground-strong)]",
  neutral: "border-[var(--border-subtle)] bg-[color:var(--bg-elevated)] text-[color:var(--foreground-strong)]",
};

const FEEDBACK_LABEL: Record<FeedbackTone, string> = {
  correct: "확인",
  incorrect: "수정 필요",
  warning: "주의",
  saved: "저장됨",
  neutral: "안내",
};

export function InlineFeedback({ tone = "neutral", title, children, action }: { tone?: FeedbackTone; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className={cn("rounded-[var(--radius-md)] border px-4 py-3", FEEDBACK_TONE_CLASS[tone])} role={tone === "incorrect" || tone === "warning" ? "alert" : "status"} aria-live="polite">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold">{FEEDBACK_LABEL[tone]}</p>
          <p className="mt-1 text-sm font-semibold leading-6">{title}</p>
          {children ? <div className="mt-1 text-sm leading-7 text-[color:var(--muted-strong)]">{children}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function CollapsibleDetails({ title, children, helper }: { title: string; children: ReactNode; helper?: string }) {
  return (
    <details className="group rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[color:var(--foreground-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2">
        <span>{title}</span>
        <span aria-hidden="true" className="text-[color:var(--muted)] transition group-open:rotate-180">⌄</span>
      </summary>
      {helper ? <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">{helper}</p> : null}
      <div className="mt-3 border-t border-[var(--border-subtle)] pt-3 text-sm leading-7 text-[color:var(--muted-strong)]">{children}</div>
    </details>
  );
}

export function DraftSavedIndicator({ state = "idle" }: { state?: "idle" | "saving" | "saved" | "error" }) {
  const copy = {
    idle: "초안 대기",
    saving: "초안 저장 중…",
    saved: "초안 저장됨",
    error: "저장 실패 · 다시 입력하면 재시도합니다",
  }[state];

  return (
    <p className="min-h-6 text-xs leading-6 text-[color:var(--muted)]" role="status" aria-live="polite">
      {copy}
    </p>
  );
}

export function LearnerEmptyState({ title = "아직 학습 기록이 없습니다.", description = "오늘 할 수 있는 가장 작은 행동부터 시작하세요.", action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[color:var(--bg-surface)] px-5 py-8 text-center">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--foreground-strong)]">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-7 text-[color:var(--muted)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}

export function LearnerLoadingState({ title = "학습 내용을 불러오는 중입니다.", description = "오늘 이어갈 순서를 정리하고 있습니다." }: { title?: string; description?: string }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[color:var(--bg-surface)] px-5 py-6" role="status" aria-live="polite">
      <div className="h-2 w-24 rounded-full bg-[color:var(--brand-050)]" />
      <h2 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-[color:var(--foreground-strong)]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{description}</p>
    </section>
  );
}

export function LearnerErrorState({ title = "학습 화면을 열지 못했습니다.", description = "잠시 후 다시 시도하거나 오늘 기록 화면으로 돌아가세요.", action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[color:rgba(181,107,22,0.24)] bg-[color:var(--cue-review-bg)] px-5 py-6" role="alert">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--foreground-strong)]">{title}</h2>
      <p className="mt-2 text-sm leading-7 text-[color:var(--muted-strong)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

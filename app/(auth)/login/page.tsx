import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { PublicShell } from "@/components/shared/public-shell";
import { getServerSessionUser } from "@/lib/auth/session";
import { parseAppraisalMode } from "@/lib/review-os/appraisal";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{ returnTo?: string; mode?: string }>;
};

function safeReturnTo(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  try {
    const parsed = new URL(value, "http://inverge.local");
    if (parsed.pathname !== "/app") return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const mode = parseAppraisalMode(parsed.searchParams.get("mode"));
    return mode ? `/app?mode=${mode}` : "/app";
  } catch {
    return "/app";
  }
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params?.returnTo);
  const session = await getServerSessionUser();
  if (session.isAuthenticated) redirect(returnTo);

  const authEnabled = isSupabaseConfigured();
  const selectedMode = parseAppraisalMode(params?.mode) ?? parseAppraisalMode(new URL(returnTo, "http://inverge.local").searchParams.get("mode"));
  const modeLabel = selectedMode === "second" ? "감정평가사 2차" : null;

  return (
    <PublicShell>
      <div className="mx-auto grid min-h-[calc(100vh-96px)] w-full max-w-[1040px] items-center gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="max-w-xl">
          <p className="text-caption font-medium text-[color:var(--muted)]">by Inverge</p>
          <h1 className="mt-3 text-h1 font-semibold text-[color:var(--foreground-strong)]">답안길</h1>
          <p className="hero-balance ko-keep mt-5 text-[28px] font-semibold leading-tight text-[color:var(--foreground-strong)]">
            오늘 쓴 답안을 내일 다시 쓸 문단으로.
          </p>
          <p className="ko-keep mt-4 max-w-lg text-body text-[color:var(--muted)]">
            초대받은 감정평가사 수험생을 위한 2차 답안 훈련 OS
          </p>
        </section>

        <section className="rounded-[var(--radius-card)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-focus)] sm:p-7">
          <div className="space-y-2">
            <h2 className="ko-keep text-title text-[color:var(--foreground-strong)]">초대 계정으로 시작하기</h2>
            <p className="ko-keep text-sm leading-6 text-[color:var(--muted)]">
              {authEnabled ? "로그인하면 오늘 할 일로 이어집니다." : "현재 환경에서는 demo mode만 확인할 수 있습니다."}
            </p>
            {modeLabel ? (
              <p className="text-xs text-[color:var(--muted)]">
                선택한 범위: <span className="font-medium text-[color:var(--foreground-strong)]">{modeLabel}</span>
              </p>
            ) : null}
          </div>
          <div className="mt-6">
            {authEnabled ? (
              <Suspense fallback={null}>
                <AuthForm />
              </Suspense>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[color:var(--muted)]">인증 환경이 연결되면 계정별 학습 기록을 분리해서 사용할 수 있습니다.</p>
                <Link
                  href="/app?mode=second"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[color:var(--primary)] px-4 text-sm font-medium text-white"
                >
                  demo로 계속하기
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </PublicShell>
  );
}

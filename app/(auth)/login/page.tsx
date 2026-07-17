import { Suspense } from "react";
import { redirect } from "next/navigation";

import { V3ActionLink, V3RouteFrame, V3RouteHeader, V3Surface } from "@/components/learner";
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
      <V3RouteFrame
        width="content"
        className="mx-auto grid min-h-[calc(100vh-168px)] items-center gap-10 px-[var(--layout-page-edge)] py-12 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:gap-16 lg:py-16"
      >
        <section className="max-w-[var(--layout-reading-column)]">
          <V3RouteHeader
            eyebrow="by Inverge"
            title="답안길"
            description={
              <span className="block space-y-3">
                <span className="v3-type-section hero-balance ko-keep block text-[var(--color-text-primary)]">
                  오늘 쓴 답안을 내일 다시 쓸 문단으로.
                </span>
                <span className="v3-type-body ko-keep block text-[var(--color-text-secondary)]">
                  초대받은 감정평가사 수험생을 위한 2차 답안 훈련 OS
                </span>
              </span>
            }
          />
        </section>

        <V3Surface as="section" labelledBy="login-panel-title">
          <div className="space-y-2">
            <h2 id="login-panel-title" className="v3-type-section ko-keep text-[var(--color-text-primary)]">초대 계정으로 시작하기</h2>
            <p className="v3-type-compact ko-keep text-[var(--color-text-secondary)]">
              {authEnabled ? "로그인하면 오늘 할 일로 이어집니다." : "현재 환경에서는 demo mode만 확인할 수 있습니다."}
            </p>
            {modeLabel ? (
              <p className="v3-type-caption text-[var(--color-text-secondary)]">
                선택한 범위: <span className="font-medium text-[var(--color-text-primary)]">{modeLabel}</span>
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
                <p className="v3-type-compact text-[var(--color-text-secondary)]">인증 환경이 연결되면 계정별 학습 기록을 분리해서 사용할 수 있습니다.</p>
                <V3ActionLink
                  href="/app?mode=second"
                  fullWidth
                >
                  demo로 계속하기
                </V3ActionLink>
              </div>
            )}
          </div>
        </V3Surface>
      </V3RouteFrame>
    </PublicShell>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { PublicShell } from "@/components/shared/public-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const modeLabel = selectedMode === "first" ? "감정평가사 1차" : selectedMode === "second" ? "감정평가사 2차" : null;

  return (
    <PublicShell>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md items-center px-4 py-12">
        <Card className="w-full border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>초대 계정으로 시작합니다</CardTitle>
            <CardDescription>
              {authEnabled
                ? "Inverge closed beta는 초대 기반으로 운영합니다. 로그인 후 선택한 모드로 바로 이어집니다."
                : "현재 환경에서는 demo mode만 확인할 수 있습니다."}
            </CardDescription>
            {modeLabel ? (
              <p className="text-sm text-[color:var(--foreground-strong)]">
                선택한 모드: <span className="font-medium">{modeLabel}</span>
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {authEnabled ? (
              <Suspense fallback={null}>
                <AuthForm />
              </Suspense>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[color:var(--muted)]">
                  인증 환경이 연결되면 계정별 감평 학습 기록을 분리해서 사용할 수 있습니다.
                </p>
                <Link
                  href="/app"
                  className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[color:var(--primary)] px-4 text-sm font-medium text-white"
                >
                  demo로 계속하기
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicShell>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/shared/auth-form";
import { PublicShell } from "@/components/shared/public-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type PageProps = {
  searchParams?: Promise<{ returnTo?: string }>;
};

function safeReturnTo(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/app";
  return value;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const returnTo = safeReturnTo((await searchParams)?.returnTo);
  const session = await getServerSessionUser();
  if (session.isAuthenticated) redirect(returnTo);

  const authEnabled = isSupabaseConfigured();

  return (
    <PublicShell>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-md items-center px-4 py-12">
        <Card className="w-full border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>Inverge 로그인</CardTitle>
            <CardDescription>
              {authEnabled
                ? "감정평가사 1차 오답과 2차 답안 보강 흐름으로 이어집니다."
                : "현재 환경에서는 demo mode만 확인할 수 있습니다."}
            </CardDescription>
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

import { redirect } from "next/navigation";

import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";

import SecondGradingClient from "./second-grading-client";

export const dynamic = "force-dynamic";

function AccessDeniedPanel() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6 py-14">
      <section className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--foreground-strong)]">접근 권한이 필요합니다</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-muted)]">
          이 화면은 학원용 답안 운영 콘솔 전용입니다. 권한이 없는 계정으로 로그인한 경우 <span className="font-medium">/exams</span>에서 학습을 이어가 주세요.
        </p>
      </section>
    </main>
  );
}

export default async function InstructorSecondGradingPage() {
  const session = await getServerSessionUser();

  if (session.authEnabled && !session.isAuthenticated) {
    redirect("/login?returnTo=%2Finstructor%2Fsecond-grading");
  }

  if (!session.isAuthenticated || !isAllowedAdminEmail(session.email)) {
    return <AccessDeniedPanel />;
  }

  return <SecondGradingClient />;
}

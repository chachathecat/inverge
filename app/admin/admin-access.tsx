import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";

export async function hasAdminPageAccess() {
  const session = await getServerSessionUser();
  return session.isAuthenticated && isAllowedAdminEmail(session.email);
}

export function AdminAccessDeniedPanel() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-2xl items-center px-6 py-14">
      <section className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8 text-center shadow-sm">
        <p className="text-sm text-[color:var(--muted)]">Inverge 운영 전용</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--foreground-strong)]">접근 권한이 필요합니다</h1>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          이 화면은 운영자 권한이 있는 계정에서만 열립니다. 학습자는 감정평가사 1차·2차 학습 화면에서 이어서 진행해 주세요.
        </p>
      </section>
    </main>
  );
}

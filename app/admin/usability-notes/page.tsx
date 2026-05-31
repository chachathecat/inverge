import { UsabilityNotesAdmin } from "@/components/admin/usability-notes-admin";
import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminUsabilityNotesPage() {
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !isAllowedAdminEmail(session.email)) {
    return <div className="mx-auto max-w-3xl px-5 py-12 text-sm text-[color:var(--muted)]">접근 권한이 없습니다.</div>;
  }
  return <UsabilityNotesAdmin />;
}

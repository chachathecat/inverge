import { SetDetailAdmin } from "@/components/admin/set-detail-admin";

import { AdminAccessDeniedPanel, hasAdminPageAccess } from "../../admin-access";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ setId: string }>;
};

export default async function AdminSetDetailPage({ params }: PageProps) {
  if (!(await hasAdminPageAccess())) return <AdminAccessDeniedPanel />;
  const { setId } = await params;
  return <SetDetailAdmin setId={setId} />;
}

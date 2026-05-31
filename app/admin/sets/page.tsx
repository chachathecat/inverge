import { SetMetadataAdmin } from "@/components/admin/set-metadata-admin";

import { AdminAccessDeniedPanel, hasAdminPageAccess } from "../admin-access";

export const dynamic = "force-dynamic";

export default async function AdminSetsPage() {
  if (!(await hasAdminPageAccess())) return <AdminAccessDeniedPanel />;
  return <SetMetadataAdmin />;
}

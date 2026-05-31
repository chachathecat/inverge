import { RootCauseTagAdmin } from "@/components/admin/root-cause-tag-admin";

import { AdminAccessDeniedPanel, hasAdminPageAccess } from "../admin-access";

export const dynamic = "force-dynamic";

export default async function AdminRootCauseTagsPage() {
  if (!(await hasAdminPageAccess())) return <AdminAccessDeniedPanel />;
  return <RootCauseTagAdmin />;
}

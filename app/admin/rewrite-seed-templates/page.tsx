import { RewriteSeedTemplateAdmin } from "@/components/admin/rewrite-seed-template-admin";

import { AdminAccessDeniedPanel, hasAdminPageAccess } from "../admin-access";

export const dynamic = "force-dynamic";

export default async function AdminRewriteSeedTemplatesPage() {
  if (!(await hasAdminPageAccess())) return <AdminAccessDeniedPanel />;
  return <RewriteSeedTemplateAdmin />;
}

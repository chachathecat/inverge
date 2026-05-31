import { CurriculumMappingAdmin } from "@/components/admin/curriculum-mapping-admin";

import { AdminAccessDeniedPanel, hasAdminPageAccess } from "../admin-access";

export const dynamic = "force-dynamic";

export default async function AdminCurriculumPage() {
  if (!(await hasAdminPageAccess())) return <AdminAccessDeniedPanel />;
  return <CurriculumMappingAdmin />;
}

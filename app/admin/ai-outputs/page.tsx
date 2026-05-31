import { AiOutputReviewAdmin } from "@/components/admin/ai-output-review-admin";

import { AdminAccessDeniedPanel, hasAdminPageAccess } from "../admin-access";

export const dynamic = "force-dynamic";

export default async function AdminAiOutputsPage() {
  if (!(await hasAdminPageAccess())) return <AdminAccessDeniedPanel />;
  return <AiOutputReviewAdmin />;
}

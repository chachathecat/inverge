import type { ReactNode } from "react";

import { requireServerSession } from "@/lib/auth/session";

export default async function ExamsLayout({ children }: { children: ReactNode }) {
  await requireServerSession("/exams");
  return children;
}

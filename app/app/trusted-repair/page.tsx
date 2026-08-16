import { notFound } from "next/navigation";

import { TrustedRepairLoop } from "@/components/review-os/trusted-repair-loop";
import {
  isTrustedRepairAccessError,
  requireTrustedRepairAccess,
} from "@/lib/review-os/trusted-repair-access";

export const dynamic = "force-dynamic";

export default async function TrustedRepairPage() {
  try {
    await requireTrustedRepairAccess();
  } catch (error) {
    if (isTrustedRepairAccessError(error)) {
      notFound();
    }
    throw error;
  }
  return <TrustedRepairLoop />;
}

import { notFound } from "next/navigation";

import { TrustedRepairLoop } from "@/components/review-os/trusted-repair-loop";
import {
  isTrustedRepairAccessError,
  requireTrustedRepairAccess,
} from "@/lib/review-os/trusted-repair-access";
import type { TrustedRepairSubject } from "@/lib/review-os/trusted-repair-contract";

export const dynamic = "force-dynamic";

export default async function TrustedRepairPage() {
  let ownerScope: string;
  let availableSubjects: readonly TrustedRepairSubject[];
  try {
    const access = await requireTrustedRepairAccess();
    ownerScope = access.userId;
    availableSubjects = access.trustedRepairSubjects;
  } catch (error) {
    if (isTrustedRepairAccessError(error)) {
      notFound();
    }
    throw error;
  }
  return (
    <TrustedRepairLoop
      ownerScope={ownerScope}
      availableSubjects={availableSubjects}
    />
  );
}

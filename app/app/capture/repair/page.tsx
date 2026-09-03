import { notFound } from "next/navigation";

import { App1CaptureRepairLoop } from "@/components/owner-study/app1-capture-repair-loop";
import {
  isTrustedRepairAccessError,
  requireTrustedRepairAccess,
} from "@/lib/review-os/trusted-repair-access";

export const dynamic = "force-dynamic";

const ITEM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type PageProps = {
  searchParams?: Promise<{ itemId?: string }>;
};

export default async function App1CaptureRepairPage({ searchParams }: PageProps) {
  const itemId = (await searchParams)?.itemId?.trim() ?? "";
  if (!ITEM_ID_PATTERN.test(itemId)) notFound();

  let access: Awaited<ReturnType<typeof requireTrustedRepairAccess>>;
  try {
    access = await requireTrustedRepairAccess();
  } catch (error) {
    if (isTrustedRepairAccessError(error)) notFound();
    throw error;
  }

  return (
    <App1CaptureRepairLoop
      ownerScope={access.userId}
      itemId={itemId}
      availableSubjects={access.trustedRepairSubjects}
    />
  );
}

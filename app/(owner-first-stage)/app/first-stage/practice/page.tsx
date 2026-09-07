import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReviewOsAppShell } from "@/components/review-os/app-shell";
import { FirstStagePrivatePractice } from "@/components/review-os/first-stage-private-practice";
import { requirePrivateFirstStageOwner } from "@/lib/review-os/first-stage/runtime/session-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function FirstStagePrivatePracticePage() {
  const owner = await requirePrivateFirstStageOwner();
  if (!owner) notFound();
  // No content/catalog reads and no assisted projections in initial HTML/RSC props.
  return <ReviewOsAppShell email={owner.email}><FirstStagePrivatePractice /></ReviewOsAppShell>;
}

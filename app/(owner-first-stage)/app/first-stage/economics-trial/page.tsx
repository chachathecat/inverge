import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ReviewOsAppShell } from "@/components/review-os/app-shell";
import { FirstStagePrivatePractice } from "@/components/review-os/first-stage-private-practice";
import { requireOwnerLocalTrialPage } from "@/lib/review-os/first-stage/runtime/owner-local-trial-server";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { referrer: "no-referrer", robots: { index:false, follow:false } };
export default async function OwnerLocalEconomicsTrialPage() {
  const owner = await requireOwnerLocalTrialPage(); if (!owner) notFound();
  // No catalog/question/key/explanation in the initial HTML/RSC payload.
  return <ReviewOsAppShell email={owner.email}><FirstStagePrivatePractice ownerLocalTrial /></ReviewOsAppShell>;
}

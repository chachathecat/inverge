import { notFound } from "next/navigation";
import { OwnerLegalEvidence } from "@/components/review-os/owner-legal-evidence";
import { requireOwnerLegalEvidencePage } from "@/lib/legal/owner-snapshot-bridge-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "보유 법령 근거 | 답안길", robots: { index: false, follow: false } };

export default async function OwnerLegalEvidencePage() {
  if (!await requireOwnerLegalEvidencePage()) notFound();
  // This separate reference workspace receives no attempt/question context.
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8"><OwnerLegalEvidence /></main>;
}

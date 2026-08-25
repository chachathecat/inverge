import { notFound } from "next/navigation";

import { C3RLLawLoop } from "@/components/review-os/c3r-l-law-loop";
import { C3RLError } from "@/lib/review-os/c3r-l-contract";
import { requireC3RLAccess } from "@/lib/review-os/c3r-l-service";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ recordId?: string }> };

export default async function C3RLLawPage({ searchParams }: PageProps) {
  try {
    await requireC3RLAccess();
  } catch (error) {
    if (error instanceof C3RLError) notFound();
    throw error;
  }
  const params = (await searchParams) ?? {};
  return <C3RLLawLoop initialRecordId={params.recordId ?? null} />;
}

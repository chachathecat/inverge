import { notFound } from "next/navigation";

import { C3RTTheoryLoop } from "@/components/review-os/c3r-t-theory-loop";
import { C3RTError } from "@/lib/review-os/c3r-t-contract";
import { requireC3RTAccess } from "@/lib/review-os/c3r-t-service";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ recordId?: string }> };

export default async function C3RTTheoryPage({ searchParams }: PageProps) {
  try {
    await requireC3RTAccess();
  } catch (error) {
    if (error instanceof C3RTError) notFound();
    throw error;
  }
  const params = (await searchParams) ?? {};
  return <C3RTTheoryLoop initialRecordId={params.recordId ?? null} />;
}

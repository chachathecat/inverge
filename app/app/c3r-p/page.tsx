import { notFound } from "next/navigation";

import { C3RPPracticeLoop } from "@/components/review-os/c3r-p-practice-loop";
import { C3RPError } from "@/lib/review-os/c3r-p-contract";
import { requireC3RPAccess } from "@/lib/review-os/c3r-p-service";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ recordId?: string }>;
};

export default async function C3RPPracticePage({ searchParams }: PageProps) {
  try {
    await requireC3RPAccess();
  } catch (error) {
    if (error instanceof C3RPError) notFound();
    throw error;
  }
  const params = (await searchParams) ?? {};
  return <C3RPPracticeLoop initialRecordId={params.recordId ?? null} />;
}

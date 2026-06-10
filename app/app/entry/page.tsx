import { redirect } from "next/navigation";

import { parseAppraisalMode } from "@/lib/review-os/appraisal";

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string }>;
};

export default async function ReviewOsEntryAliasPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const params = new URLSearchParams();
  const mode = parseAppraisalMode(query?.mode);
  if (mode) params.set("mode", mode);
  if (query?.subject) params.set("subject", query.subject);

  const suffix = params.toString();
  redirect(`/app/capture${suffix ? `?${suffix}` : ""}`);
}

import { redirect } from "next/navigation";

import { ModeMigrationConfirmation } from "@/components/review-os/mode-migration-confirmation";
import { resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ModeMigrationPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/mode-migration", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  if (mode === "second") redirect("/app?mode=second");

  return <ModeMigrationConfirmation />;
}

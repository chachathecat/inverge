import type { ReactNode } from "react";
import { headers } from "next/headers";

import { ReviewOsAppShell } from "@/components/review-os/app-shell";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { getReviewOsServerContext } from "@/lib/review-os/server";

export default async function ReviewOsLayout({ children }: { children: ReactNode }) {
  const currentPath = (await headers()).get("x-inverge-current-path") ?? "";
  const isMetadataOnlyTrustAcceptance = currentPath.startsWith(
    "/app/acceptance/trust-provenance/",
  );
  const { session, access, usage } = await getReviewOsServerContext("/app", {
    includeProfile: !isMetadataOnlyTrustAcceptance,
    includeUsage: !isMetadataOnlyTrustAcceptance,
  });

  if (access.status !== "allowed") {
    return <ReviewOsAccessState access={access} />;
  }

  return (
    <ReviewOsAppShell
      email={session.email}
      rightSlot={
        usage && !isMetadataOnlyTrustAcceptance ? (
          <div
            className="v3-type-caption flex min-h-11 items-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] px-3 text-[var(--color-text-secondary)]"
            data-private-account-usage
          >
            이번 달 {usage.monthlyUsed} / {usage.monthlyLimit}
          </div>
        ) : null
      }
    >
      {children}
    </ReviewOsAppShell>
  );
}

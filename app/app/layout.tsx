import { Suspense, type ReactNode } from "react";
import { headers } from "next/headers";

import { ReviewOsAppShell } from "@/components/review-os/app-shell";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import type { ReviewOsAccessResult } from "@/lib/review-os/access-result";
import { getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";

async function PrivateAccountUsage({
  userId,
  access,
}: {
  userId: string;
  access: ReviewOsAccessResult;
}) {
  const usage = await reviewOsService
    .getUsageSummaryAfterAccessCheck(
      userId,
      access,
    )
    .catch(() => null);
  if (!usage) return null;

  return (
    <div
      className="v3-type-caption flex min-h-11 items-center rounded-[var(--v3-radius-control)] border border-[var(--color-border-default)] bg-[var(--color-background-elevated)] px-3 text-[var(--color-text-secondary)]"
      data-private-account-usage
    >
      이번 달 {usage.monthlyUsed} / {usage.monthlyLimit}
    </div>
  );
}

export default async function ReviewOsLayout({ children }: { children: ReactNode }) {
  const currentPath = (await headers()).get("x-inverge-current-path") ?? "";
  const isMetadataOnlyTrustAcceptance = currentPath.startsWith(
    "/app/acceptance/trust-provenance/",
  );
  const { session, access } = await getReviewOsServerContext("/app", {
    includeProfile: false,
    includeUsage: false,
  });

  if (access.status !== "allowed") {
    return <ReviewOsAccessState access={access} />;
  }

  return (
    <ReviewOsAppShell
      email={session.email}
      rightSlot={
        session.userId && !isMetadataOnlyTrustAcceptance ? (
          <Suspense fallback={null}>
            <PrivateAccountUsage userId={session.userId} access={access} />
          </Suspense>
        ) : null
      }
    >
      {children}
    </ReviewOsAppShell>
  );
}

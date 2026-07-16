import { FirstOxPracticeClient } from "@/components/review-os/first-ox/first-ox-practice-client";
import { FirstOxRequestedSourceClient } from "@/components/review-os/first-ox/first-ox-requested-source-client";
import { RequestedSourceReadState } from "@/components/review-os/requested-source-read-state";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { isSafeRequestedSourceId } from "@/lib/review-os/first-ox-source-read";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ retryItemId?: string; sourceItemId?: string }>;
};

export default async function FirstOxPracticePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const hasRetryRequest = typeof params?.retryItemId === "string";
  const hasCaptureRequest = !hasRetryRequest && typeof params?.sourceItemId === "string";
  const sourceKind = hasRetryRequest
    ? ("retry" as const)
    : hasCaptureRequest
      ? ("capture" as const)
      : null;
  const requestedItemId = hasRetryRequest
    ? params?.retryItemId?.trim() ?? ""
    : hasCaptureRequest
      ? params?.sourceItemId?.trim() ?? ""
      : "";
  const returnTo = sourceKind
    ? `/app/first/ox?${sourceKind === "retry" ? "retryItemId" : "sourceItemId"}=${encodeURIComponent(requestedItemId)}`
    : buildReviewOsReturnTo("/app/first/ox", "first");
  const { session, access } = await getReviewOsServerContext(returnTo, {
    includeProfile: false,
    includeUsage: false,
  });
  if (access.status !== "allowed") {
    return <ReviewOsAccessState access={access} embedded />;
  }
  if (!session.userId) return null;

  if (!sourceKind) {
    return <FirstOxPracticeClient key={`generic:${session.userId}`} />;
  }

  if (!requestedItemId || !isSafeRequestedSourceId(requestedItemId)) {
    return (
      <RequestedSourceReadState
        surface="first_ox"
        status="missing"
        returnHref="/app/first/ox"
      />
    );
  }

  return (
    <FirstOxRequestedSourceClient
      key={`${session.userId}:${sourceKind}:${requestedItemId}`}
      expectedUserId={session.userId}
      itemId={requestedItemId}
      sourceKind={sourceKind}
    />
  );
}

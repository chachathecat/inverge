import { FirstOxPracticeClient } from "@/components/review-os/first-ox/first-ox-practice-client";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

export const dynamic = "force-dynamic";

export default async function FirstOxPracticePage() {
  await getReviewOsServerContext(buildReviewOsReturnTo("/app/first/ox", "first"));
  return <FirstOxPracticeClient />;
}

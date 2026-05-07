import { getServerSessionUser } from "@/lib/auth/session";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import AnswerReviewClientPage from "./answer-review-client";

export default async function AnswerReviewPage() {
  const session = await getServerSessionUser();
  const viewerMode = session.authEnabled && !session.isAuthenticated ? "anonymous" : "authenticated";

  return (
    <div className="space-y-4">
      <ClosedBetaBanner />
      <AnswerReviewClientPage viewerMode={viewerMode} userEmail={session.email ?? null} />
    </div>
  );
}

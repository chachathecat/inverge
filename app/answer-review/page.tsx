import { getServerSessionUser } from "@/lib/auth/session";
import AnswerReviewClientPage from "./answer-review-client";

export default async function AnswerReviewPage() {
  const session = await getServerSessionUser();
  const viewerMode = session.authEnabled && !session.isAuthenticated ? "anonymous" : "authenticated";

  return <AnswerReviewClientPage viewerMode={viewerMode} userEmail={session.email ?? null} />;
}

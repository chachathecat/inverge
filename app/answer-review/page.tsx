import { redirect } from "next/navigation";

import AnswerReviewClientPage from "@/app/answer-review/answer-review-client";
import { getServerSessionUser } from "@/lib/auth/session";

export default async function AnswerReviewPage() {
  const session = await getServerSessionUser();

  if (session.authEnabled && !session.isAuthenticated) {
    redirect(`/login?returnTo=${encodeURIComponent("/answer-review")}`);
  }

  return <AnswerReviewClientPage />;
}

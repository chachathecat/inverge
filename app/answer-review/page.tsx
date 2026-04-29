import { redirect } from "next/navigation";

import { getServerSessionUser } from "@/lib/auth/session";
import AnswerReviewClientPage from "./answer-review-client";

export default async function AnswerReviewPage() {
  const session = await getServerSessionUser();
  if (session.authEnabled && !session.isAuthenticated) {
    redirect("/login?returnTo=%2Fanswer-review");
  }

  return <AnswerReviewClientPage />;
}

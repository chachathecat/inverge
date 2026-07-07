import { redirect } from "next/navigation";

import { getServerSessionUser } from "@/lib/auth/session";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { S220CFirstFiveMinuteMagic } from "@/components/review-os/s220c-first-five-minute-magic";
import { normalizeSubjectForMode, parseAppraisalMode } from "@/lib/review-os/appraisal";
import AnswerReviewClientPage from "./answer-review-client";

type AnswerReviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AnswerReviewPage({ searchParams }: AnswerReviewPageProps) {
  const params = (await searchParams) ?? {};
  const rawMode = params.mode;
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  if (!mode) redirect("/answer-review?mode=second");
  const examMode = parseAppraisalMode(mode) ?? "second";
  const rawSubject = params.subject;
  const subjectParam = Array.isArray(rawSubject) ? rawSubject[0] : rawSubject;
  const subject = normalizeSubjectForMode(subjectParam, examMode);

  const session = await getServerSessionUser();
  const viewerMode = session.authEnabled && !session.isAuthenticated ? "anonymous" : "authenticated";

  return (
    <div className="space-y-4">
      <ClosedBetaBanner />
      <S220CFirstFiveMinuteMagic />
      <div id="answer-review-start">
        <AnswerReviewClientPage
          viewerMode={viewerMode}
          userEmail={session.email ?? null}
          initialExamMode={examMode}
          initialSubject={subject}
        />
      </div>
    </div>
  );
}

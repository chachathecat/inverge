import { redirect } from "next/navigation";

import { FirstSetSolvingForm } from "@/components/review-os/first-set-solving-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string }>;
};

export default async function FirstSetSolvingPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/sets", modeParam));
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  if (mode !== "first") {
    redirect(`/app/session?mode=${mode}`);
  }

  const subject = normalizeSubjectForMode(query?.subject, "first");

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">1차 세트 풀이</h2>
        <p className="text-sm leading-7 text-[color:var(--muted)]">
          오늘은 작은 세트 하나만 풉니다. 틀린 문항만 다시 보고, 재시도 큐에 자동으로 연결합니다.
        </p>
      </section>

      <FirstSetSolvingForm initialSubject={subject} />

      <ReviewOsFeedbackButton route="/app/sets" pageContext={{ mode: "first", section: "set-solving" }} />
    </div>
  );
}

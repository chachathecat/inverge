import Link from "next/link";
import { redirect } from "next/navigation";

import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { DailyCommandCard, MinimalStepPanel, QuietDetails } from "@/components/review-os/minimal-study-system";
import { resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsWritePage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/write", modeParam));
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  if (mode !== "second") {
    redirect(`/app/capture?mode=${mode}`);
  }

  return (
    <div className="space-y-7">
      <DailyCommandCard title="2차 답안 작성 워크스페이스" description="누락 논점을 빠르게 확인하고 답안 작성으로 바로 이어갑니다.">
        <div className="space-y-2 text-sm">
          <Link href="/answer-review?mode=second" className="inline-flex text-[color:var(--ink-primary)] underline underline-offset-2">답안 스냅 검토</Link>
          <Link href="/answer-review?mode=second&intent=case" className="inline-flex text-[color:var(--ink-primary)] underline underline-offset-2">사례 스캔</Link>
          <Link href="/problem-snap?mode=second" className="inline-flex text-[color:var(--ink-primary)] underline underline-offset-2">문제 먼저 이해하기</Link>
        </div>
      </DailyCommandCard>

      <MinimalStepPanel title="새 답안 작성하기">
        <QuietDetails>
          <p>쟁점 회상에서 문단 다시쓰기까지 한 흐름으로 진행합니다.</p>
        </QuietDetails>
        <div className="pt-3">
          <WrongAnswerCaptureForm
            userId={session.userId}
            mode={mode}
            workflow="second-write"
            initialPreferredSubjects={profile?.preferredSubjects}
          />
        </div>
      </MinimalStepPanel>

      <ReviewOsFeedbackButton route="/app/write" pageContext={{ section: "write", mode }} />
    </div>
  );
}

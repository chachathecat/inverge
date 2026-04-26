import { redirect } from "next/navigation";

import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">2차 답안 작성 워크스페이스</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            기준 답안 보기 전에 쟁점 3개를 먼저 떠올립니다. 전체 답안보다 목차를 먼저 잡습니다. 비교는 작성 이후에 합니다.
          </p>
        </div>
      </section>

      <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>실행 순서</CardTitle>
          <CardDescription>쟁점 회상 → 목차 작성 → 내 답안 작성 → 기준답안/해설 입력 → 가장 큰 간극 1개 → 문단 다시쓰기</CardDescription>
        </CardHeader>
        <CardContent>
          <WrongAnswerCaptureForm
            userId={session.userId}
            mode={mode}
            workflow="second-write"
            initialPreferredSubjects={profile?.preferredSubjects}
          />
        </CardContent>
      </Card>

      <ReviewOsFeedbackButton route="/app/write" pageContext={{ section: "write", mode }} />
    </div>
  );
}

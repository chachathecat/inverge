import Link from "next/link";
import { redirect } from "next/navigation";

import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Button } from "@/components/ui/button";
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
            새로 작성할 답안이면 여기서 바로 시작하세요. 이미 쓴 답안이 있다면 답안 검토로 바로 정리할 수 있습니다.
          </p>
          <div className="mt-3">
            <Link href="/answer-review?mode=second">
              <Button type="button" variant="outline">답안 검토로 바로 정리</Button>
            </Link>
          </div>
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

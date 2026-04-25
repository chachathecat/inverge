import Link from "next/link";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ReviewQueueClient } from "@/components/review-os/review-queue-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsReviewPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/review", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const items = (await reviewOsService.getReviewQueue(session.userId, session.email)).filter((item) => item.examName === config.label);

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>{mode === "second" ? "다시 볼 교정 포인트" : "오늘 다시 볼 항목"}</CardTitle>
          <CardDescription>
            {mode === "second"
              ? "compare에서 잡힌 누락 논점 중 rewrite로 이어질 항목만 남깁니다."
              : "반복 오답, 시간 초과, 확신 불일치를 줄일 항목만 보여줍니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReviewQueueClient items={items} mode={mode} />
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>{mode === "second" ? "아직 교정 queue가 없습니다" : "아직 다시 볼 오답이 없습니다"}</CardTitle>
            <CardDescription>{config.emptyDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/app/capture?mode=${mode}`}>
              <Button type="button">{config.primaryCta}</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <ReviewOsFeedbackButton route="/app/review" pageContext={{ itemCount: items.length, mode }} />
    </div>
  );
}

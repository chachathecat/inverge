import Link from "next/link";

import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsWeeklyPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/weekly", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const items = (await reviewOsService.listWrongAnswerItems(session.userId, session.email, 50)).filter(
    (item) => item.examName === config.label,
  );
  const recent = items.slice(0, 7);
  const topSubjects = Array.from(new Set(recent.map((item) => item.subjectLabel))).slice(0, 3);
  const topReasons = Array.from(new Set(recent.map((item) => item.userReasonPreset || item.userReasonText).filter(Boolean))).slice(0, 3);

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>{mode === "second" ? "이번 주 2차 답안 정리" : "이번 주 1차 오답 정리"}</CardTitle>
          <CardDescription>
            {mode === "second"
              ? "이번 주 답안에서 반복된 누락 논점과 다음 rewrite 방향만 확인합니다."
              : "이번 주 오답에서 반복된 과목과 실수 유형만 확인합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {recent.length > 0 ? (
            <>
              <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
                {mode === "second"
                  ? `${recent.length}개 교정 기록에서 먼저 보강할 흐름을 정리했습니다.`
                  : `${recent.length}개 오답 기록에서 먼저 줄일 반복 신호를 정리했습니다.`}
              </p>
              <div className="grid gap-3 md:grid-cols-3">
                <WeeklyCue label={mode === "second" ? "반복 과목" : "반복 과목"} value={topSubjects.join(", ") || config.subjects[0]} />
                <WeeklyCue label={mode === "second" ? "반복 논점" : "반복 실수"} value={topReasons.join(", ") || config.priorityCopy} />
                <WeeklyCue label="다음 주 행동" value={config.nextActionFallback} />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm leading-7 text-[color:var(--muted)]">{config.emptyDescription}</p>
              <Link href={`/app/capture?mode=${mode}`}>
                <Button type="button">{config.primaryCta}</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewOsFeedbackButton route="/app/weekly" pageContext={{ itemCount: recent.length, mode }} />
    </div>
  );
}

function WeeklyCue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] p-4">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-sm leading-7 text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

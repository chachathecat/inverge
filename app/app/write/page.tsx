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
            사진/PDF 검토와 새 답안 작성을 같은 흐름에서 선택할 수 있습니다. 먼저 스냅 검토로 누락 논점을 확인하고 작성으로 이어가세요.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href="/answer-review?mode=second" className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3 transition hover:border-[color:var(--border-strong)]">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">답안 스냅 검토</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">이미 쓴 답안을 찍어 누락 논점과 다시 쓸 문장을 확인합니다.</p>
              <p className="mt-1 text-[11px] leading-5 text-[color:var(--muted)]">로그인 없이 1회 체험 가능</p>
            </Link>
            <Link href="/answer-review?mode=second&intent=case" className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] px-4 py-3 transition hover:border-[color:var(--border-strong)]">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">사례 스캔</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">문제/사례를 찍어 조건과 요구사항을 먼저 정리합니다.</p>
              <p className="mt-1 text-[11px] leading-5 text-[color:var(--muted)]">답안 검토실에서 바로 열립니다</p>
            </Link>
            <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
              <p className="text-sm font-medium text-[color:var(--foreground-strong)]">새 답안 작성</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">스냅 검토와 분리된 새 작성 경로입니다.</p>
            </div>
          </div>
        </div>
      </section>

      <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>새 답안 작성하기</CardTitle>
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

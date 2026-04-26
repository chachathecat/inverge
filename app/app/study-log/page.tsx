import Link from "next/link";

import { StudyLogIntakeForm } from "@/components/review-os/study-log-intake-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string }>;
};

export default async function StudyLogPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/study-log", modeParam));
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const initialSubject = normalizeSubjectForMode(query?.subject, mode);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">오늘 공부 기록</h2>
        <p className="text-sm leading-7 text-[color:var(--muted)]">오늘 실제 학습 입력만 남깁니다. 큰 리포트 없이 바로 다음 행동으로 이어집니다.</p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>{config.label} 기록 입력</CardTitle>
          <CardDescription>오늘 실제로 본 범위와 복습 신호만 짧게 남깁니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudyLogIntakeForm mode={mode} initialSubject={initialSubject} subjectOptions={config.subjects} />
          <Link href={`/app?mode=${mode}`} className="mt-3 block text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
            저장하지 않고 오늘 화면으로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

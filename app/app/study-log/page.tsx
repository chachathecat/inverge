import Link from "next/link";

import { StudyLogIntakeForm } from "@/components/review-os/study-log-intake-form";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string; subject?: string }>;
};

export default async function StudyLogPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const { session, access, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/study-log", modeParam));
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const initialSubject = normalizeSubjectForMode(query?.subject, mode);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">오늘 공부 기록</h2>
        <p className="text-sm leading-7 text-[color:var(--muted)]">오늘 실제로 본 범위를 남기면 다음 복습에 남길 내용이 정리됩니다. 짧게 기록하고 바로 마무리하세요.</p>
      </section>
      <Card className="border-[color:var(--border-subtle)] bg-[color:var(--surface)] shadow-none">
        <CardHeader className="space-y-2">
          <CardTitle>{config.label} 실행 기록</CardTitle>
          <CardDescription>한 번에 완성할 필요는 없습니다. 오늘 공부한 흐름만 간결하게 남기면 됩니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <StudyLogIntakeForm mode={mode} initialSubject={initialSubject} subjectOptions={config.subjects} />
          <Link href={`/app?mode=${mode}`} className="block text-xs text-[color:var(--muted)] underline-offset-2 hover:underline">
            저장하지 않고 오늘 화면으로 돌아가기
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

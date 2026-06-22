import Link from "next/link";

import { ProfileSetupForm } from "@/components/review-os/profile-setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEntitlementLimit } from "@/lib/review-os/entitlements";
import { resolveModeState } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsSettingsPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { access, usage, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/settings", modeParam));
  const limits = getEntitlementLimit(access?.entitlementTier ?? "free_trial");
  const modeState = resolveModeState(profile, modeParam);
  const config = modeState.config;

  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>수험 설정</CardTitle>
          <CardDescription>1차와 2차는 운영 방식이 다릅니다. 현재 집중할 흐름을 명확히 고정합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSetupForm
            initialExamName={profile?.examName}
            initialExamDate={profile?.examDate}
            initialPreferredSubjects={profile?.preferredSubjects}
            initialMode={modeState.mode}
            redirectAfterSave="settings"
          />
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>현재 설정</CardTitle>
            <CardDescription>오늘 화면과 입력 기본값에 사용됩니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>현재 화면 모드: {config.label}</p>
            <p>저장된 모드: {profile?.examName ?? "아직 없음"}</p>
            <p>우선 과목: {profile?.preferredSubjects.filter((subject) => (config.subjects as readonly string[]).includes(subject)).join(", ") || config.subjects[0]}</p>
            <p>목표 시험일: {profile?.examDate ?? "설정하지 않음"}</p>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>closed beta 사용량</CardTitle>
            <CardDescription>closed beta 안정성을 위해 처리량을 조용히 제한합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>현재 플랜: {limits.label}</p>
            <p>월간 처리 한도: {limits.monthlyWrongAnswers}개</p>
            <p>이번 달 사용량: {usage?.monthlyUsed ?? 0}개</p>
            <p>남은 처리량: {usage?.remaining ?? limits.monthlyWrongAnswers}개</p>
          </CardContent>
        </Card>
        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>알림 설정</CardTitle>
            <CardDescription>문제·답안·계산 내용 없이 오늘 할 일과 복습 알림만 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/app/settings/notifications?mode=${modeState.mode}`} className="inline-flex min-h-10 items-center rounded-full border border-[color:var(--border-subtle)] px-4 text-sm font-medium text-[color:var(--foreground-strong)]">
              알림 설정 열기
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

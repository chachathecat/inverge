import { ProfileSetupForm } from "@/components/review-os/profile-setup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsOnboardingPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/onboarding", modeParam));
  const mode = resolveAppraisalMode(profile, modeParam);

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>오늘 시작을 위한 3문항 진단</CardTitle>
          <CardDescription>
            긴 설문 없이 오늘 첫 행동만 정합니다. 1분 안에 첫 기록으로 이동합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSetupForm
            initialExamName={profile?.examName}
            initialExamDate={profile?.examDate}
            initialPreferredSubjects={profile?.preferredSubjects}
            initialMode={mode}
            redirectAfterSave="capture"
          />
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>운영 원칙</CardTitle>
          <CardDescription>계획보다 실행을 먼저 남기고, 기록을 바탕으로 다음 루프를 제안합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-7 text-[color:var(--muted)]">
          <p>1차: 과목 선택 → 기출 오답 입력 → review queue → 기록 / 주간 정리</p>
          <p>2차: write → compare → rewrite → correction note / records</p>
          <p>처음엔 계획표보다 오늘 한 것 하나가 더 중요합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}

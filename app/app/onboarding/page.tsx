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
          <CardTitle>먼저 1차 / 2차를 고릅니다</CardTitle>
          <CardDescription>
            Inverge는 감정평가사 전용입니다. 지금 관리할 단계를 고르면 관련 과목과 첫 입력 흐름만 보여줍니다.
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
          <CardTitle>사용 방식</CardTitle>
          <CardDescription>많은 정보를 펼치기보다 오늘 할 행동 1개를 정하는 도구로 사용합니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-7 text-[color:var(--muted)]">
          <p>1차: 과목 선택 → 기출 오답 입력 → review queue → 기록 / 주간 정리</p>
          <p>2차: write → compare → rewrite → correction note / records</p>
          <p>처음에는 민법 오답 1개 또는 2차 답안 1개만 넣어도 충분합니다.</p>
        </CardContent>
      </Card>
    </div>
  );
}

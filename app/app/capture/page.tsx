import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsCapturePage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/capture", modeParam));
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">
            {config.captureTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">{config.captureDescription}</p>
        </div>
      </section>

      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>{mode === "second" ? "교정노트를 위한 최소 입력" : "오답노트를 위한 최소 입력"}</CardTitle>
          <CardDescription>
            {mode === "second"
              ? "텍스트 원문을 기준으로 누락 논점과 rewrite 지시 초안을 정리합니다. 점수 판정은 하지 않습니다."
              : "텍스트 원문을 기준으로 오답노트 초안을 만들고, 정답과 선택 근거는 사용자가 확인한 뒤 저장합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WrongAnswerCaptureForm
            userId={session.userId}
            mode={mode}
            initialPreferredSubjects={profile?.preferredSubjects}
          />
        </CardContent>
      </Card>

      <ReviewOsFeedbackButton route="/app/capture" pageContext={{ section: "capture", mode }} />
    </div>
  );
}

import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";

type PageProps = {
  searchParams?: Promise<{ mode?: string; rewriteFrom?: string }>;
};

export default async function ReviewOsCapturePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const rewriteFrom = typeof query?.rewriteFrom === "string" ? query.rewriteFrom : "";
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/capture", modeParam));
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const rewriteDetail =
    mode === "second" && rewriteFrom && session.email
      ? await reviewOsService.getWrongAnswerDetail(session.userId, session.email, rewriteFrom)
      : null;
  const rewriteNote = rewriteDetail ? buildDetailStudyNote(rewriteDetail) : null;
  const rewriteContext =
    rewriteDetail && rewriteNote
      ? {
          sourceItemId: rewriteDetail.item.id,
          sourceTitle: rewriteDetail.item.problemTitle ?? rewriteDetail.item.problemIdentifier ?? rewriteNote.title,
          biggestGap: rewriteNote.missingIssue ?? rewriteNote.weakPoint,
          rewriteInstruction: rewriteNote.rewriteInstruction ?? rewriteNote.nextAction,
          referenceSummary: rewriteDetail.item.correctAnswer ?? "",
          myAnswerSummary: rewriteDetail.item.userAnswer || "",
        }
      : null;
  const isRewriteFlow = mode === "second" && Boolean(rewriteContext);

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">
            {isRewriteFlow ? "문단 다시쓰기 실행" : config.captureTitle}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            {isRewriteFlow
              ? "기존 비교 기록에서 잡은 한 가지 간극만 보강합니다. 전체 답안이 아니라 문단 1개를 다시 쓰고 저장하세요."
              : config.captureDescription}
          </p>
        </div>
      </section>

      <Card className="border-[color:var(--border-strong)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>
            {isRewriteFlow ? "문단 다시쓰기 입력" : mode === "second" ? "교정노트를 위한 최소 입력" : "오답노트를 위한 최소 입력"}
          </CardTitle>
          <CardDescription>
            {isRewriteFlow
              ? "한 문단 실행 기록만 남깁니다. 비교 컨텍스트는 상단 패널에 고정되어 있습니다."
              : mode === "second"
              ? "쟁점 회상 → 목차 작성 → 답안/비교 입력 → one biggest gap 교정 순서로 기록합니다. 점수 판정은 하지 않습니다."
              : "텍스트 원문을 기준으로 오답노트 초안을 만들고, 정답과 선택 근거는 사용자가 확인한 뒤 저장합니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WrongAnswerCaptureForm
            userId={session.userId}
            mode={mode}
            initialPreferredSubjects={profile?.preferredSubjects}
            rewriteContext={rewriteContext}
          />
        </CardContent>
      </Card>

      <ReviewOsFeedbackButton route="/app/capture" pageContext={{ section: "capture", mode }} />
    </div>
  );
}

import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { DailyCommandCard, MinimalStepPanel, QuietDetails } from "@/components/review-os/minimal-study-system";
import { getModeConfig, normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildDetailStudyNote } from "@/lib/review-os/study-note";

type PageProps = {
  searchParams?: Promise<{ mode?: string; rewriteFrom?: string; subject?: string }>;
};

export default async function ReviewOsCapturePage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const rewriteFrom = typeof query?.rewriteFrom === "string" ? query.rewriteFrom : "";
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/capture", modeParam));
  if (!session.userId) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const initialSubject = normalizeSubjectForMode(query?.subject, mode);
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
    <div className="space-y-6">
      <ClosedBetaBanner />

      <div className="space-y-7">
      <DailyCommandCard title={isRewriteFlow ? "문단 다시쓰기 실행" : "오늘 한 것 올리기"} description={isRewriteFlow ? "먼저 한 문장만 떠올립니다. 문단 1개만 다시 쓰고 저장합니다." : "사진 또는 텍스트 입력을 한 건만 남깁니다."}>
        <QuietDetails>
          <p>저장 전 직접 확인해 주세요.</p>
        </QuietDetails>
      </DailyCommandCard>

      <MinimalStepPanel title={isRewriteFlow ? "문단 다시쓰기 입력" : "오늘 한 것 올리기"}>
        <QuietDetails>
          <p>
            {isRewriteFlow
              ? "한 문단 실행 기록만 남깁니다."
              : mode === "second"
                ? "쟁점 회상부터 간극 1개 교정까지 순서대로 기록합니다."
                : "텍스트 원문을 기준으로 오답노트 초안을 만들고 확인 후 저장합니다."}
          </p>
          <details>
            <summary className="cursor-pointer list-none text-xs font-medium">입력 순서 보기</summary>
            <p className="pt-2">쟁점 회상 → 목차 작성 → 답안/비교 입력 → one biggest gap 교정</p>
          </details>
        </QuietDetails>
        <div className="pt-3">
          <WrongAnswerCaptureForm
            userId={session.userId}
            mode={mode}
            initialPreferredSubjects={profile?.preferredSubjects}
            initialSubject={initialSubject}
            rewriteContext={rewriteContext}
          />
        </div>
      </MinimalStepPanel>

      <ReviewOsFeedbackButton route="/app/capture" pageContext={{ section: "capture", mode }} />
      </div>
    </div>
  );
}

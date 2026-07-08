import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
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
  return (
    <div
      className="space-y-5"
      aria-label="오늘 한 것 올리기"
      data-s224v-surface="/app/capture"
      data-s224v-primary-cta-count-above-fold="1"
      data-s224v-visible-trust-layer-count="1"
      data-s224v-visible-primary-work-items-max="1"
      data-s224v-secondary-diagnostics="quiet-disclosure"
      data-s224v-equal-weight-card-grid="absent"
      data-s224v-repeated-warning-copy="absent"
    >
      <WrongAnswerCaptureForm
        userId={session.userId}
        mode={mode}
        initialPreferredSubjects={profile?.preferredSubjects}
        initialSubject={initialSubject}
        rewriteContext={rewriteContext}
      />

      <div className="space-y-3">
        <ReviewOsFeedbackButton route="/app/capture" pageContext={{ section: "capture", mode }} />
      </div>
    </div>
  );
}

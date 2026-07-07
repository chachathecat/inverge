import { WrongAnswerCaptureForm } from "@/components/review-os/capture-form";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { normalizeSubjectForMode, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { ANSWER_SUBMISSION_OCR_TRUST_COPY } from "@/lib/review-os/answer-submission-contract";
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
  const isRewriteFlow = mode === "second" && Boolean(rewriteContext);

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-elevated)] px-4 py-4 sm:px-6 sm:py-5" data-testid="capture-page-shell">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[58ch]">
            <p className="inline-flex rounded-full border border-[color:var(--border-hairline)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--muted)]">
              {mode === "second" ? "감정평가사 2차" : "감정평가사 1차"}
            </p>
            <h1 className="mt-3 text-2xl font-semibold leading-tight text-[color:var(--textStrong)]">
              {isRewriteFlow ? "문단 다시쓰기 실행" : "오늘 한 것 올리기"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--textBody)]">
              {isRewriteFlow
                ? "문단 1개만 다시 쓰고 저장합니다."
                : "사진/PDF/텍스트 중 하나로 시작하고, OCR/AI 초안은 직접 확인합니다."}
            </p>
          </div>
          <p className="text-xs leading-5 text-[color:var(--textMuted)] sm:max-w-[18rem]" data-trust-layer="capture-page-shell">
            {ANSWER_SUBMISSION_OCR_TRUST_COPY}
            <br />
            OCR/AI 정리는 초안입니다. 저장 전 직접 확인해 주세요.
          </p>
        </div>
      </section>

      <WrongAnswerCaptureForm
        userId={session.userId}
        mode={mode}
        initialPreferredSubjects={profile?.preferredSubjects}
        initialSubject={initialSubject}
        rewriteContext={rewriteContext}
      />

      <div className="space-y-3">
        <ClosedBetaBanner />
        <ReviewOsFeedbackButton route="/app/capture" pageContext={{ section: "capture", mode }} />
      </div>
    </div>
  );
}

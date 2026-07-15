import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { LocalBetaReviewCandidateSection } from "@/components/review-os/local-beta-note-reflection";
import { CalculatorRoutineReviewCandidates } from "@/components/review-os/calculator-routine-review-candidates";
import {
  CoreRouteReadDegradedNotice,
  CoreRouteReadEmptyShell,
  CoreRouteReadErrorPage,
} from "@/components/review-os/core-route-read-state";
import { ReviewQueueClient } from "@/components/review-os/review-queue-client";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import {
  countDegradedCoreRouteReads,
  resolveEssentialCoreRouteRead,
  resolveOptionalCoreRouteRead,
} from "@/lib/review-os/core-route-read-outcome";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";
import { buildReferenceSupportForExecution } from "@/lib/review-os/execution-reference-support";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsReviewPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  const { session, access, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/review", modeParam));
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const [queueRead, calculatorCandidatesRead] = await Promise.all([
    resolveEssentialCoreRouteRead(
      "review_queue",
      reviewOsService.getReviewQueue(session.userId, session.email),
    ),
    resolveEssentialCoreRouteRead("review_calculator_candidates", () =>
      mode === "second"
        ? reviewOsService.listCalculatorRoutineReviewCandidates(session.userId!, session.email!, 3)
        : Promise.resolve([]),
    ),
  ]);
  if (queueRead.status !== "ready" || calculatorCandidatesRead.status !== "ready") {
    return <CoreRouteReadErrorPage surface="review" />;
  }

  const items = queueRead.value.filter((item) => item.examName === config.label);
  const calculatorRoutineCandidates = calculatorCandidatesRead.value;
  const captureDetailsRead = await resolveOptionalCoreRouteRead(
    "review_capture_details",
    async () => {
      const lines: Record<string, string> = {};
      await Promise.all(
        items
          .filter((item) => item.createdFromCapture)
          .map(async (item) => {
            const detail = await reviewOsService.getWrongAnswerDetail(
              session.userId!,
              session.email!,
              item.itemId,
            );
            const support = buildReferenceSupportForExecution(
              detail?.item?.derivedPayload?.capture_note_engine_v2 ??
                detail?.item?.derivedPayload?.capture_note_engine_v1 ??
                null,
            );
            const line = support?.topicCandidate ?? support?.skeletonKeywordHint ?? null;
            if (line) lines[item.itemId] = line;
          }),
      );
      return lines;
    },
    () => ({}),
  );
  const captureReferenceLineByItemId = captureDetailsRead.value;
  const degradedReadCount = countDegradedCoreRouteReads([captureDetailsRead]);

  if (items.length === 0 && calculatorRoutineCandidates.length === 0) {
    return (
      <CoreRouteReadEmptyShell surface="review" mode={mode} degradedCount={degradedReadCount}>
        <ClosedBetaBanner />
        <LocalBetaReviewCandidateSection
          mode={mode}
          hasDurableQueue={false}
          showEmptyMessage={false}
          showReadUnavailableNotice={false}
        />
        <ReviewOsFeedbackButton route="/app/review" pageContext={{ itemCount: 0, mode }} />
      </CoreRouteReadEmptyShell>
    );
  }

  return (
    <div
      className="space-y-6"
      data-s224v-surface="/app/review"
      data-s224v-primary-cta-count-above-fold="1"
      data-s224v-visible-trust-layer-count="0"
      data-s224v-visible-primary-work-items-max="1"
      data-s224v-secondary-diagnostics="quiet-disclosure"
      data-s224v-equal-weight-card-grid="absent"
      data-s224v-repeated-warning-copy="absent"
      data-s232d4-review-page="priority-first"
    >
      <ClosedBetaBanner />

      <header className="space-y-3" data-s232d4-review-header>
        <p className="text-caption font-medium text-[color:var(--muted)]">우선 복습</p>
        <h1 className="v3-type-screen ko-keep text-[color:var(--foreground-strong)]">
          복습
        </h1>
        <p className="max-w-[680px] text-sm leading-7 text-[color:var(--textBody)]">
          {mode === "second"
            ? "학습 노트에서 만든 다시쓰기 후보를 오늘 복습으로 이어갑니다."
            : "학습 노트에서 만든 회상 후보를 오늘 복습으로 이어갑니다."}
        </p>
      </header>

      <CoreRouteReadDegradedNotice count={degradedReadCount} />

      {items.length > 0 ? (
        <section
          className="min-w-0"
          aria-label="우선 복습"
          data-s232d4-review-queue-container
        >
          <ReviewQueueClient items={items} mode={mode} captureReferenceLineByItemId={captureReferenceLineByItemId} />
        </section>
      ) : null}

      <CalculatorRoutineReviewCandidates candidates={calculatorRoutineCandidates} />
      <LocalBetaReviewCandidateSection mode={mode} hasDurableQueue={items.length > 0} showEmptyMessage={false} />
      <ReviewOsFeedbackButton route="/app/review" pageContext={{ itemCount: items.length, mode }} />
    </div>
  );
}

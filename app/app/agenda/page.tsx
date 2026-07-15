import { LearningAgendaClient } from "@/components/review-os/learning-agenda-client";
import { CoreRouteReadErrorPage } from "@/components/review-os/core-route-read-state";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ReviewOsAccessState } from "@/components/review-os/review-os-access-state";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { buildLearningAgendaEvents } from "@/lib/review-os/learning-agenda";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { resolveEssentialCoreRouteRead } from "@/lib/review-os/core-route-read-outcome";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function LearningAgendaPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const { session, access, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/agenda", modeParam));
  if (access.status !== "allowed") return <ReviewOsAccessState access={access} embedded />;
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);

  const [itemsRead, reviewQueueRead, usageEventsRead] = await Promise.all([
    resolveEssentialCoreRouteRead("agenda_items", () =>
      reviewOsService.listWrongAnswerItems(session.userId!, session.email!, 80),
    ),
    resolveEssentialCoreRouteRead("agenda_review_queue", () =>
      reviewOsService.listReviewQueueForAgenda(session.userId!, session.email!, 40),
    ),
    resolveEssentialCoreRouteRead("agenda_usage_events", () =>
      reviewOsService.listLearningAgendaUsageEvents(
        session.userId!,
        session.email!,
        since.toISOString(),
        160,
      ),
    ),
  ]);
  if (
    itemsRead.status !== "ready" ||
    reviewQueueRead.status !== "ready" ||
    usageEventsRead.status !== "ready"
  ) {
    return <CoreRouteReadErrorPage surface="agenda" />;
  }

  const agendaEvents = buildLearningAgendaEvents({
    mode,
    items: itemsRead.value.filter((item) => item.examName === config.label),
    reviewQueue: reviewQueueRead.value.filter((item) => item.examName === config.label),
    usageEvents: usageEventsRead.value,
  });

  return (
    <div className="space-y-5">
      <LearningAgendaClient mode={mode} initialEvents={agendaEvents} />
      <ClosedBetaBanner />
      <ReviewOsFeedbackButton route="/app/agenda" pageContext={{ section: "agenda", mode, eventCount: agendaEvents.length }} />
    </div>
  );
}

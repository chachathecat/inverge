import { LearningAgendaClient } from "@/components/review-os/learning-agenda-client";
import { ReviewOsFeedbackButton } from "@/components/review-os/feedback-button";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { buildLearningAgendaEvents } from "@/lib/review-os/learning-agenda";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function LearningAgendaPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/agenda", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);

  const [items, reviewQueue, usageEvents] = await Promise.all([
    reviewOsService.listWrongAnswerItems(session.userId, session.email, 80).catch(() => []),
    reviewOsService.listReviewQueueForAgenda(session.userId, session.email, 40).catch(() => []),
    reviewOsService.listLearningAgendaUsageEvents(session.userId, session.email, since.toISOString(), 160).catch(() => []),
  ]);

  const agendaEvents = buildLearningAgendaEvents({
    mode,
    items: items.filter((item) => item.examName === config.label),
    reviewQueue: reviewQueue.filter((item) => item.examName === config.label),
    usageEvents,
  });

  return (
    <div className="space-y-5">
      <LearningAgendaClient mode={mode} initialEvents={agendaEvents} />
      <ClosedBetaBanner />
      <ReviewOsFeedbackButton route="/app/agenda" pageContext={{ section: "agenda", mode, eventCount: agendaEvents.length }} />
    </div>
  );
}

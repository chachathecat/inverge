import { NotificationSettingsClient } from "@/components/notifications/notification-settings-client";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function NotificationSettingsPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
  await getReviewOsServerContext(buildReviewOsReturnTo("/app/settings/notifications", modeParam));

  return (
    <div className="space-y-5">
      <NotificationSettingsClient />
      <section className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[color:var(--surface-soft)] px-4 py-3 text-xs leading-6 text-[color:var(--muted)]">
        알림은 일반 안내만 보냅니다. 문제, 답안, 숫자, 단위, 계산기 입력, 검증 메모, 점수나 합격 가능성은 알림에 포함하지 않습니다.
      </section>
    </div>
  );
}

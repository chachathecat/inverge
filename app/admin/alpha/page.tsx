import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsService } from "@/lib/review-os/service";

function isAdminEmail(email: string | null) {
  const allow = (process.env.ALPHA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (allow.length === 0) return process.env.NODE_ENV !== "production";

  return email ? allow.includes(email.toLowerCase()) : false;
}

export default async function AlphaAdminPage() {
  const session = await getServerSessionUser();

  if (!session.isAuthenticated || !isAdminEmail(session.email)) {
    return <div className="mx-auto max-w-3xl px-5 py-12 text-sm text-[color:var(--muted)]">접근 권한이 없습니다.</div>;
  }

  const feed = await reviewOsService.getAdminFeed();

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-10">
      <div className="space-y-2">
        <p className="text-sm text-[color:var(--muted)]">감정평가사 alpha 운영</p>
        <h1 className="text-[30px] font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">
          최근 이벤트와 피드백
        </h1>
        <p className="text-sm text-[color:var(--muted)]">
          실제 사용 흐름이 막히는 지점, 피드백, 항목 생성 상태를 빠르게 확인합니다.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>최근 이벤트</CardTitle>
            <CardDescription>오늘의 우선순위, 기록, review queue 진입이 실제로 이어지는지 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {feed.recentEvents.slice(0, 20).map((event) => (
              <div key={event.id} className="rounded-2xl border border-[var(--border)] px-4 py-3">
                <p className="text-[color:var(--foreground-strong)]">{event.eventName}</p>
                <p className="mt-1 text-[color:var(--muted)]">{event.createdAt}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>최근 피드백</CardTitle>
            <CardDescription>감평사 수험 workflow에서 어색한 문구와 막힌 지점을 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {feed.recentFeedback.slice(0, 20).map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--border)] px-4 py-3">
                <p className="text-[color:var(--foreground-strong)]">{item.message}</p>
                <p className="mt-1 text-[color:var(--muted)]">
                  {item.route} · {item.createdAt}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

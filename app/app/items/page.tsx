import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";

type PageProps = {
  searchParams?: Promise<{ mode?: string; saved?: string }>;
};

export default async function ReviewOsItemsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const modeParam = query?.mode;
  const savedParam = query?.saved;
  const { session, profile } = await getReviewOsServerContext(buildReviewOsReturnTo("/app/items", modeParam));
  if (!session.userId || !session.email) return null;

  const mode = resolveAppraisalMode(profile, modeParam);
  const config = getModeConfig(mode);
  const items = (await reviewOsService.listWrongAnswerItems(session.userId, session.email, 60)).filter(
    (item) => item.examName === config.label,
  );

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>{mode === "second" ? "2차 교정 기록" : "1차 오답 기록"}</CardTitle>
          <CardDescription>{config.recentDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--muted)]">{config.emptyDescription}</p>
              <Link href={mode === "second" ? `/app/write?mode=${mode}` : `/app/capture?mode=${mode}`} className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  {config.primaryCta}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.length <= 3 ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
                  <p className="text-sm text-[color:var(--foreground-strong)]">첫 기록이 쌓였습니다.</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">아직 반복 패턴은 충분하지 않습니다. 기록이 2~3개 더 쌓이면 반복 약점이 보입니다.</p>
                </div>
              ) : null}
              {savedParam ? <p className="text-xs text-[color:var(--muted)]">방금 남긴 기록이 목록에 반영되었습니다.</p> : null}
              {items.map((item) => (
              <Link
                key={item.id}
                href={`/app/items/${item.id}?mode=${mode}`}
                className="block rounded-2xl border border-[var(--border)] px-4 py-4 hover:bg-[color:var(--surface-soft)]"
              >
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                  {item.problemTitle ?? item.problemIdentifier ?? "감평 기록 항목"}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {item.subjectLabel} · {item.confidence}
                </p>
              </Link>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

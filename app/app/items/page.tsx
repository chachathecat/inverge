import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModeConfig, resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { buildReviewOsReturnTo, getReviewOsServerContext } from "@/lib/review-os/server";
import { reviewOsService } from "@/lib/review-os/service";

type PageProps = {
  searchParams?: Promise<{ mode?: string }>;
};

export default async function ReviewOsItemsPage({ searchParams }: PageProps) {
  const modeParam = (await searchParams)?.mode;
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
              <Link href={mode === "second" ? `/app/write?mode=${mode}` : `/app/capture?mode=${mode}`}>
                <Button type="button">{config.primaryCta}</Button>
              </Link>
            </div>
          ) : (
            items.map((item) => (
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

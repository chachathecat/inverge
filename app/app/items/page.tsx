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
  const learningSignals = await reviewOsService.listLearningSignalEvents(session.userId, session.email, mode, 20).catch(() => []);
  const hasItems = items.length > 0;
  const hasLearningSignals = learningSignals.length > 0;
  const signalPrimaryTitle = mode === "second" ? "최근 답안 검토 기록" : "최근 검토 기록";
  const sourceTypeLabel = (sourceType: string) => {
    if (sourceType === "answer_review") return "답안 검토 기록";
    if (sourceType === "wrong_answer") return "오답 기록";
    if (sourceType === "review_queue") return "다시 볼 항목";
    return "학습 기록";
  };
  const formatCreatedDate = (value?: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
  };
  const formatNextAction = (item: (typeof items)[number]) => {
    const reviewReason =
      typeof item.rawPayload?.reviewReason === "string"
        ? item.rawPayload.reviewReason
        : typeof item.derivedPayload?.reviewReason === "string"
          ? item.derivedPayload.reviewReason
          : null;
    const mistakeType =
      typeof item.rawPayload?.mistakeType === "string"
        ? item.rawPayload.mistakeType
        : typeof item.derivedPayload?.mistakeType === "string"
          ? item.derivedPayload.mistakeType
          : null;
    const lines = [
      item.nextReviewDate ? `복습 예정 ${item.nextReviewDate}` : null,
      item.comparisonPoint ? `비교 포인트 ${item.comparisonPoint}` : null,
      mistakeType ? `실수 유형 ${mistakeType}` : null,
      reviewReason ? `검토 이유 ${reviewReason}` : null,
    ].filter(Boolean);
    return lines[0] ?? "오늘 할 일에서 확인";
  };
  const signalFallbackTask = mode === "second" ? "한 번 더 검토하기" : "오늘 할 일에서 확인";
  const signalCta = (sourceType: string) =>
    sourceType === "answer_review"
      ? { label: "답안 검토하기", href: `/answer-review?mode=${mode}` }
      : { label: "오늘에서 보기", href: `/app?mode=${mode}` };

  return (
    <div className="space-y-6">
      <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
        <CardHeader>
          <CardTitle>{hasItems ? (mode === "second" ? "2차 답안노트" : "1차 오답노트") : signalPrimaryTitle}</CardTitle>
          <CardDescription>
            {hasItems
              ? config.recentDescription
              : mode === "second"
                ? "검토 기록을 기준으로 오늘 할 일이 정리됩니다."
                : "답안 검토 기록이 노트에 쌓였습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasItems && !hasLearningSignals ? (
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--muted)]">{config.emptyDescription}</p>
              <Link href={mode === "second" ? `/app/write?mode=${mode}` : `/app/capture?mode=${mode}`} className="w-full sm:w-auto">
                <Button type="button" className="w-full sm:w-auto">
                  {config.primaryCta}
                </Button>
              </Link>
            </div>
          ) : hasItems ? (
            <div className="space-y-4">
              {items.length === 1 ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
                  <p className="text-sm text-[color:var(--foreground-strong)]">첫 기록이 쌓였습니다.</p>
                </div>
              ) : null}
              {items.length >= 2 && items.length <= 3 ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
                  <p className="text-sm text-[color:var(--foreground-strong)]">반복 패턴이 조금씩 보이기 시작합니다.</p>
                </div>
              ) : null}
              {savedParam ? (
                <div className="rounded-[var(--radius-md)] border border-[color:var(--border-subtle)] bg-[color:var(--bg-elevated)] px-4 py-3">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">방금 남긴 기록이 목록에 반영되었습니다.</p>
                  <p className="mt-1 text-sm text-[color:var(--foreground-strong)]">가장 큰 간극 1개와 다음 행동 1개를 먼저 실행하세요.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/app?mode=${mode}`} className="text-xs underline-offset-4 hover:underline">오늘 계획에 반영</Link>
                    <Link href={mode === "second" ? `/app/capture?mode=${mode}&workflow=second-write` : `/app/capture?mode=${mode}`} className="text-xs underline-offset-4 hover:underline">다시 풀기/다시 쓰기</Link>
                    <Link href={`/app/review?mode=${mode}`} className="text-xs underline-offset-4 hover:underline">나중에 복습</Link>
                  </div>
                </div>
              ) : null}
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-[var(--border)] px-4 py-4">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                    {item.problemTitle ?? item.problemIdentifier ?? "감평 기록 항목"}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">
                    {item.subjectLabel} · {item.confidence}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">다음 행동: {formatNextAction(item)}</p>
                  <Link
                    href={`/app/items/${item.id}?mode=${mode}`}
                    className="mt-2 inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline-offset-4 hover:underline"
                  >
                    다시 보기
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {learningSignals.slice(0, 8).map((signal) => (
                <div key={signal.id} className="rounded-2xl border border-[var(--border)] px-4 py-4">
                  <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                    {signal.subject} · {sourceTypeLabel(signal.sourceType)}
                  </p>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">다음 행동: {signal.nextTask || signalFallbackTask}</p>
                  {formatCreatedDate(signal.createdAt) ? (
                    <p className="mt-1 text-xs text-[color:var(--muted)]">{formatCreatedDate(signal.createdAt)}</p>
                  ) : null}
                  <Link
                    href={signalCta(signal.sourceType).href}
                    className="mt-2 inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline-offset-4 hover:underline"
                  >
                    {signalCta(signal.sourceType).label}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      {hasItems && hasLearningSignals ? (
        <Card className="border-[var(--border)] bg-[color:var(--surface)] shadow-none">
          <CardHeader>
            <CardTitle>{signalPrimaryTitle}</CardTitle>
            <CardDescription>최근 검토 기록에서 이어질 다음 행동을 확인합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {learningSignals.slice(0, 8).map((signal) => (
              <div key={signal.id} className="rounded-2xl border border-[var(--border)] px-4 py-4">
                <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
                  {signal.subject} · {sourceTypeLabel(signal.sourceType)}
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">다음 행동: {signal.nextTask || signalFallbackTask}</p>
                {formatCreatedDate(signal.createdAt) ? (
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{formatCreatedDate(signal.createdAt)}</p>
                ) : null}
                <Link
                  href={signalCta(signal.sourceType).href}
                  className="mt-2 inline-flex text-sm font-medium text-[color:var(--foreground-strong)] underline-offset-4 hover:underline"
                >
                  {signalCta(signal.sourceType).label}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

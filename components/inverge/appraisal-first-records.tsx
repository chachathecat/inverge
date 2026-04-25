"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, ClipboardList, RotateCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { normalizeAppraisalFirstSubjectId } from "@/lib/appraisal-first/subject-id";
import { useAuthSession } from "@/lib/auth/client";
import { logInvergeEvent } from "@/lib/inverge/event-client";
import { cn } from "@/lib/utils";

type SubjectId = "civil_law" | "economics" | "real_estate" | "appraisal_law" | "accounting";
type AbilityAxis = "accuracy" | "timeManagement" | "choiceJudgment" | "lawRecall" | "calculationStability";
type RecordsTimelineType = "pastSet" | "review" | "weeklyPlan";
type RecordsPageStatus = "loading" | "ready" | "empty" | "error";
type RecordsFilter = "all" | "pastSet" | "review" | "weeklyPlan";

type RecordsTimelineItemData = {
  id: string;
  type: RecordsTimelineType;
  subjectId?: SubjectId;
  title: string;
  description: string;
  occurredAt: string;
  status?: "completed" | "active" | "skipped";
  linkedAbilityAxes?: AbilityAxis[];
  metadata?: {
    setId?: string;
    answeredCount?: number;
    totalQuestions?: number;
    reviewCompletedCount?: number;
    weeklyTargetSetCount?: number;
    weeklyReviewTargetCount?: number;
  };
};

type RecordsAggregate = {
  pastSetCount?: number;
  reviewCompletedCount?: number;
  recentActivityAt?: string | null;
};

type ServerRecordsResponse = {
  ok: boolean;
  data?: {
    items: RecordsTimelineItemData[];
    aggregate?: RecordsAggregate;
  };
};

const SUBJECT_LABELS: Record<SubjectId, string> = {
  civil_law: "민법",
  economics: "경제학원론",
  real_estate: "부동산학원론",
  appraisal_law: "감정평가관계법규",
  accounting: "회계학",
};

const TYPE_LABELS: Record<RecordsTimelineType, string> = {
  pastSet: "세트",
  review: "리뷰",
  weeklyPlan: "주간 코칭",
};

const ABILITY_LABELS: Record<AbilityAxis, string> = {
  accuracy: "정확도",
  timeManagement: "시간 운영",
  choiceJudgment: "선지 판단",
  lawRecall: "법령 기억",
  calculationStability: "계산 안정성",
};

const FILTERS: { value: RecordsFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pastSet", label: "세트" },
  { value: "review", label: "리뷰" },
  { value: "weeklyPlan", label: "주간 코칭" },
];

function normalizeSubjectId(subjectId: string): SubjectId {
  return normalizeAppraisalFirstSubjectId(subjectId);
}

async function fetchRecords(subjectId: SubjectId) {
  const response = await fetch(`/api/appraisal-first/records?subjectId=${subjectId}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("records-fetch-failed");
  }

  const result = (await response.json()) as ServerRecordsResponse;
  if (!result.ok || !result.data) {
    throw new Error("records-invalid-response");
  }

  return result.data;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildQuietInsight(items: RecordsTimelineItemData[]) {
  const axes = items.flatMap((item) => item.linkedAbilityAxes ?? []);
  const axisCount = axes.reduce<Record<string, number>>((acc, axis) => {
    acc[axis] = (acc[axis] ?? 0) + 1;
    return acc;
  }, {});
  const topAxis = Object.entries(axisCount).sort((a, b) => b[1] - a[1])[0]?.[0] as AbilityAxis | undefined;

  if (!topAxis) {
    return "기록이 아직 적어 반복 패턴을 충분히 보기 전 단계입니다.";
  }

  return `${ABILITY_LABELS[topAxis]} 축이 최근 기록에서 가장 자주 보입니다. 다음 세트에서도 같은 기준으로 확인해 보세요.`;
}

function RecordsHeader({ subjectId }: { subjectId: SubjectId }) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-caption font-medium text-[color:var(--muted)]">{SUBJECT_LABELS[subjectId]} · 기록</p>
        <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">최근 활동이 남긴 흐름만 조용히 확인합니다.</h1>
        <p className="mt-4 max-w-2xl text-body text-[color:var(--muted)]">
          점수판이 아니라, 지금까지 어떤 루프로 이어졌는지와 다음에 어디를 다시 볼지 정리합니다.
        </p>
      </div>
      <Link href={`/exams/appraisal-first/${subjectId}/past-set/intro-10`} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
        기출 세트로 이동
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </header>
  );
}

function SummaryStrip({
  recentActivity,
  pastSetCount,
  reviewCount,
}: {
  recentActivity: string | null;
  pastSetCount: number;
  reviewCount: number;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <SummaryItem label="최근 활동" value={recentActivity ? formatDate(recentActivity) : "아직 없음"} />
      <SummaryItem label="세트 기록" value={`${pastSetCount}개`} />
      <SummaryItem label="완료한 리뷰" value={`${reviewCount}개`} />
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-4">
      <p className="text-caption text-[color:var(--muted)]">{label}</p>
      <p className="mt-2 text-h3 font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function FilterRow({
  selectedFilter,
  onChange,
}: {
  selectedFilter: RecordsFilter;
  onChange: (filter: RecordsFilter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="기록 필터">
      {FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onChange(filter.value)}
          className={cn(
            "shrink-0 rounded-full border px-3 py-2 text-caption transition",
            selectedFilter === filter.value
              ? "border-[var(--primary)] bg-[color:var(--primary-soft)] text-[color:var(--foreground-strong)]"
              : "border-[var(--border)] bg-[color:var(--surface)] text-[color:var(--muted)] hover:border-[var(--border-strong)]",
          )}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function Timeline({ items }: { items: RecordsTimelineItemData[] }) {
  if (!items.length) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
        <p className="text-sm text-[color:var(--muted)]">선택한 조건에 해당하는 기록이 없습니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-3 sm:p-4">
      <div className="divide-y divide-[var(--border)]">
        {items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function TimelineItem({ item }: { item: RecordsTimelineItemData }) {
  const Icon = item.type === "pastSet" ? BookOpen : item.type === "review" ? CheckCircle2 : ClipboardList;

  return (
    <article className="flex gap-4 px-2 py-5 sm:px-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)]">
        <Icon className="h-4 w-4 text-[color:var(--muted-strong)]" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-caption text-[color:var(--muted)]">{TYPE_LABELS[item.type]}</span>
            {item.subjectId ? <span className="text-caption text-[color:var(--muted)]">{SUBJECT_LABELS[item.subjectId]}</span> : null}
          </div>
          <time className="text-caption text-[color:var(--muted)]" dateTime={item.occurredAt}>
            {formatDate(item.occurredAt)}
          </time>
        </div>
        <h2 className="mt-2 text-base font-medium leading-7 text-[color:var(--foreground-strong)]">{item.title}</h2>
        <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">{item.description}</p>
        {item.linkedAbilityAxes?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.linkedAbilityAxes.slice(0, 2).map((axis) => (
              <span key={axis} className="rounded-full bg-[color:var(--surface-soft)] px-2.5 py-1 text-caption text-[color:var(--muted-strong)]">
                {ABILITY_LABELS[axis]}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function QuietInsight({ insight }: { insight: string }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-5 py-4">
      <p className="text-caption font-medium text-[color:var(--muted)]">조용한 요약</p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted-strong)]">{insight}</p>
    </section>
  );
}

function LoadingState() {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
      <div className="h-3 w-28 rounded-full bg-[color:var(--surface-muted)]" />
      <div className="mt-5 h-8 w-2/3 rounded-full bg-[color:var(--surface-muted)]" />
      <div className="mt-6 space-y-3">
        <div className="h-14 rounded-[var(--radius-sm)] bg-[color:var(--surface-muted)]" />
        <div className="h-14 rounded-[var(--radius-sm)] bg-[color:var(--surface-muted)]" />
      </div>
      <p className="mt-6 text-sm text-[color:var(--muted)]">기록을 불러오고 있습니다.</p>
    </section>
  );
}

function EmptyState({ subjectId }: { subjectId: SubjectId }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8 sm:p-10">
      <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">아직 쌓인 기록이 없습니다.</h2>
      <p className="mt-3 max-w-xl text-body text-[color:var(--muted)]">첫 세트를 풀면 최근 리뷰와 코칭 흐름이 이곳에 쌓이기 시작합니다.</p>
      <Link href={`/exams/appraisal-first/${subjectId}/past-set/intro-10`} className={cn(buttonVariants({ size: "lg" }), "mt-7 w-full sm:w-auto")}>
        기출 세트로 이동
      </Link>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
      <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">기록을 불러오지 못했습니다.</h2>
      <p className="mt-3 text-body text-[color:var(--muted)]">운영 데이터는 서버에서 다시 읽습니다. 잠시 뒤 다시 시도해 주세요.</p>
      <Button type="button" onClick={onRetry} className="mt-6">
        다시 시도
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </Button>
    </section>
  );
}

function ActionBar({ subjectId }: { subjectId: SubjectId }) {
  return (
    <section className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-[color:var(--muted)]">기록은 확인용입니다. 다음 작업은 다시 세트를 풀거나 리뷰 큐를 정리하는 흐름으로 이어지는 편이 좋습니다.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Link href={`/exams/appraisal-first/${subjectId}/past-set/intro-10`} className={cn(buttonVariants(), "w-full sm:w-auto")}>
          기출 세트로 이동
        </Link>
        <Link href={`/exams/appraisal-first/${subjectId}/review`} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          리뷰 보기
        </Link>
      </div>
    </section>
  );
}

export function AppraisalFirstRecordsPage({ subjectId }: { subjectId: string }) {
  const safeSubjectId = normalizeSubjectId(subjectId);
  const session = useAuthSession();
  const isAuthBlocked = session.authEnabled && !session.isAuthenticated;
  const [status, setStatus] = useState<RecordsPageStatus>("loading");
  const [timelineItems, setTimelineItems] = useState<RecordsTimelineItemData[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<RecordsFilter>("all");

  useEffect(() => {
    logInvergeEvent("first.records.viewed", {
      examId: "appraisal_first",
      stage: "first",
      subjectId: safeSubjectId,
    });
  }, [safeSubjectId]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      if (isAuthBlocked) {
        if (!cancelled) {
          setTimelineItems([]);
          setStatus("error");
        }
        return;
      }

      if (!cancelled) {
        setStatus("loading");
      }

      try {
        const serverData = await fetchRecords(safeSubjectId);
        if (cancelled) return;

        setTimelineItems(serverData.items ?? []);
        setStatus(serverData.items && serverData.items.length > 0 ? "ready" : "empty");
      } catch {
        if (!cancelled) {
          setTimelineItems([]);
          setStatus("error");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isAuthBlocked, safeSubjectId, session.userId]);

  function retryLoadPageData() {
    setStatus("loading");
  }

  const visibleTimelineItems = useMemo(() => {
    if (selectedFilter === "all") return timelineItems;
    return timelineItems.filter((item) => item.type === selectedFilter);
  }, [selectedFilter, timelineItems]);

  const recentActivity = timelineItems[0]?.occurredAt ?? null;
  const pastSetCount = timelineItems.filter((item) => item.type === "pastSet").length;
  const reviewCount = timelineItems.filter((item) => item.type === "review").length;
  const quietInsight = buildQuietInsight(timelineItems);

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
        <RecordsHeader subjectId={safeSubjectId} />

        {status === "loading" ? <LoadingState /> : null}
        {status === "error" ? <ErrorState onRetry={retryLoadPageData} /> : null}
        {status === "empty" ? <EmptyState subjectId={safeSubjectId} /> : null}

        {status === "ready" ? (
          <>
            <SummaryStrip recentActivity={recentActivity} pastSetCount={pastSetCount} reviewCount={reviewCount} />
            <QuietInsight insight={quietInsight} />
            <FilterRow selectedFilter={selectedFilter} onChange={setSelectedFilter} />
            <Timeline items={visibleTimelineItems} />
            <ActionBar subjectId={safeSubjectId} />
          </>
        ) : null}
      </div>
    </main>
  );
}

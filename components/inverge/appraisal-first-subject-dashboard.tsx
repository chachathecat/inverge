"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, ClipboardList, RotateCcw } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { normalizeAppraisalFirstSubjectId } from "@/lib/appraisal-first/subject-id";
import { useAuthSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

type SubjectId = "civil_law" | "economics" | "real_estate" | "appraisal_law" | "accounting";
type AbilityAxis = "accuracy" | "timeManagement" | "choiceJudgment" | "lawRecall" | "calculationStability";
type SubjectDashboardStatus = "loading" | "ready" | "error";
type SubjectStatusLabel = "cold_start" | "baseline_building" | "review_needed" | "weak_pattern_detected" | "weekly_plan_active" | "stable_practice";
type NextActionType = "solveSet" | "reviewQueue" | "weeklyCoaching" | "records";

type SubjectDashboardSummary = {
  subjectId: SubjectId;
  lastActivityAt: string | null;
  remainingReviewCount: number;
  activeWeeklyPlan: boolean;
  primaryAbilityAxis: AbilityAxis | null;
  pastSetCount: number;
  reviewCompletedCount: number;
  statusLabel?: SubjectStatusLabel;
  statusCopy?: string;
  nextActionReason?: string;
  nextAction: NextActionType;
};

type ServerSummaryResponse = {
  ok: boolean;
  data?: SubjectDashboardSummary;
};

type LinkedSection = {
  id: "pastSet" | "review" | "weeklyCoaching" | "records";
  title: string;
  description: string;
  href: string;
  meta?: string;
};

const SUBJECT_LABELS: Record<SubjectId, string> = {
  civil_law: "민법",
  economics: "경제학원론",
  real_estate: "부동산학원론",
  appraisal_law: "감정평가관계법규",
  accounting: "회계학",
};

const STATUS_LABELS: Record<SubjectStatusLabel, string> = {
  cold_start: "시작 전",
  baseline_building: "기준선 형성 중",
  review_needed: "리뷰 필요",
  weak_pattern_detected: "반복 패턴 확인",
  weekly_plan_active: "주간 계획 진행 중",
  stable_practice: "루프 진행 중",
};

const ABILITY_LABELS: Record<AbilityAxis, string> = {
  accuracy: "정확도",
  timeManagement: "시간 운영",
  choiceJudgment: "선지 판단",
  lawRecall: "법령 기억",
  calculationStability: "계산 안정성",
};

function normalizeSubjectId(subjectId: string): SubjectId {
  return normalizeAppraisalFirstSubjectId(subjectId);
}

async function fetchSubjectSummary(subjectId: SubjectId) {
  const response = await fetch(`/api/appraisal-first/subjects/${subjectId}/summary`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("subject-summary-fetch-failed");
  }

  const result = (await response.json()) as ServerSummaryResponse;
  if (!result.ok || !result.data) {
    throw new Error("subject-summary-invalid-response");
  }

  return result.data;
}

function formatDate(value: string | null) {
  if (!value) return "아직 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildNextAction(subjectId: SubjectId, summary: SubjectDashboardSummary) {
  if (summary.nextAction === "reviewQueue") {
    return {
      label: "리뷰 큐부터 정리하기",
      helperCopy: summary.nextActionReason ?? "열린 리뷰 항목부터 먼저 정리하면 다음 세트가 더 안정됩니다.",
      href: `/exams/appraisal-first/${subjectId}/review`,
    };
  }

  if (summary.nextAction === "weeklyCoaching") {
    return {
      label: "주간 코칭 보기",
      helperCopy: summary.nextActionReason ?? "이번 주 기준과 우선순위를 먼저 정리합니다.",
      href: "/exams/appraisal-first/weekly-coaching",
    };
  }

  if (summary.nextAction === "records") {
    return {
      label: "기록 보기",
      helperCopy: summary.nextActionReason ?? "최근 흐름을 확인한 뒤 다음 세트로 이어갑니다.",
      href: `/exams/appraisal-first/${subjectId}/records`,
    };
  }

  return {
    label: "기출 세트로 이동",
    helperCopy: summary.nextActionReason ?? "다음 세트로 현재 기준을 한 번 더 확인합니다.",
    href: `/exams/appraisal-first/${subjectId}/past-set/intro-10`,
  };
}

function buildLinkedSections(subjectId: SubjectId, summary: SubjectDashboardSummary): LinkedSection[] {
  return [
    {
      id: "pastSet",
      title: "기출 세트",
      description: "세트 단위로 답안과 시간을 기록합니다.",
      href: `/exams/appraisal-first/${subjectId}/past-set/intro-10`,
      meta: summary.pastSetCount > 0 ? `${summary.pastSetCount}개 기록` : "아직 기록 없음",
    },
    {
      id: "review",
      title: "리뷰 큐",
      description: "다시 볼 문제만 따로 정리합니다.",
      href: `/exams/appraisal-first/${subjectId}/review`,
      meta: summary.remainingReviewCount > 0 ? `${summary.remainingReviewCount}개 남음` : "정리 완료",
    },
    {
      id: "records",
      title: "기록",
      description: "최근 세트와 리뷰 흐름을 확인합니다.",
      href: `/exams/appraisal-first/${subjectId}/records`,
      meta: summary.lastActivityAt ? "최근 활동 있음" : "활동 없음",
    },
  ];
}

function SubjectHeader({ subjectId }: { subjectId: SubjectId }) {
  return (
    <header className="space-y-3">
      <p className="text-caption font-medium text-[color:var(--muted)]">감정평가사 1차</p>
      <h1 className="text-h1 font-medium text-[color:var(--foreground-strong)]">{SUBJECT_LABELS[subjectId]}</h1>
      <p className="max-w-2xl text-body text-[color:var(--muted)]">
        이 과목에서 다음으로 할 일을 먼저 정리합니다. 세부 분석보다 바로 이어갈 루프가 보이도록 구성했습니다.
      </p>
    </header>
  );
}

function StatusBlock({ summary }: { summary: SubjectDashboardSummary }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-caption font-medium text-[color:var(--muted)]">현재 상태</p>
          <h2 className="mt-2 text-h2 font-medium text-[color:var(--foreground-strong)]">
            {summary.statusLabel ? STATUS_LABELS[summary.statusLabel] : "진행 중"}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted)]">
            {summary.statusCopy ?? "최근 세트와 리뷰 흐름을 기준으로 다음 행동을 정리합니다."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-caption text-[color:var(--muted)] sm:min-w-60">
          <MetaItem label="최근 활동" value={formatDate(summary.lastActivityAt)} />
          <MetaItem label="리뷰 항목" value={`${summary.remainingReviewCount}개`} />
          <MetaItem label="주간 코칭" value={summary.activeWeeklyPlan ? "진행 중" : "없음"} />
          <MetaItem label="주요 축" value={summary.primaryAbilityAxis ? ABILITY_LABELS[summary.primaryAbilityAxis] : "아직 없음"} />
        </div>
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-sm)] bg-[color:var(--surface-soft)] px-3 py-2">
      <p>{label}</p>
      <p className="mt-1 font-medium text-[color:var(--foreground-strong)]">{value}</p>
    </div>
  );
}

function NextActionPanel({ action }: { action: ReturnType<typeof buildNextAction> }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow-soft)] sm:p-7">
      <p className="text-caption font-medium text-[color:var(--muted)]">다음 행동</p>
      <h2 className="mt-3 text-h2 font-medium text-[color:var(--foreground-strong)]">{action.label}</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted)]">{action.helperCopy}</p>
      <Link href={action.href} className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full sm:w-auto")}>
        {action.label}
      </Link>
    </section>
  );
}

function LinkedSectionList({ sections }: { sections: LinkedSection[] }) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      {sections.map((section) => (
        <Link
          key={section.id}
          href={section.href}
          className="group rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4 transition hover:border-[var(--border-strong)]"
        >
          <div className="flex items-start justify-between gap-3">
            <SectionIcon id={section.id} />
            <span className="text-caption text-[color:var(--muted)]">{section.meta}</span>
          </div>
          <h3 className="mt-4 text-base font-medium text-[color:var(--foreground-strong)]">{section.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{section.description}</p>
        </Link>
      ))}
    </section>
  );
}

function SectionIcon({ id }: { id: LinkedSection["id"] }) {
  const className = "h-4 w-4 text-[color:var(--muted-strong)]";
  if (id === "pastSet") return <BookOpen className={className} aria-hidden="true" />;
  if (id === "review") return <CheckCircle2 className={className} aria-hidden="true" />;
  return <ClipboardList className={className} aria-hidden="true" />;
}

function LoadingState() {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6">
      <div className="h-3 w-28 rounded-full bg-[color:var(--surface-muted)]" />
      <div className="mt-5 h-8 w-2/3 rounded-full bg-[color:var(--surface-muted)]" />
      <div className="mt-5 h-3 w-full rounded-full bg-[color:var(--surface-muted)]" />
      <p className="mt-6 text-sm text-[color:var(--muted)]">과목 상태를 불러오고 있습니다.</p>
    </section>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
      <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">과목 상태를 불러오지 못했습니다.</h2>
      <Button type="button" onClick={onRetry} className="mt-6">
        다시 시도
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
      </Button>
    </section>
  );
}

function QuietFooterNav({ subjectId }: { subjectId: SubjectId }) {
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2 px-1 text-caption text-[color:var(--muted)]" aria-label="보조 이동">
      <Link href="/exams/appraisal-first/starter-diagnosis" className="hover:text-[color:var(--foreground-strong)]">
        스타터 진단
      </Link>
      <Link href="/exams/appraisal-first/weekly-coaching" className="hover:text-[color:var(--foreground-strong)]">
        주간 코칭
      </Link>
      <Link href={`/exams/appraisal-first/${subjectId}/records`} className="hover:text-[color:var(--foreground-strong)]">
        기록 보기
      </Link>
    </nav>
  );
}

export function AppraisalFirstSubjectDashboardPage({ subjectId }: { subjectId: string }) {
  const safeSubjectId = normalizeSubjectId(subjectId);
  const session = useAuthSession();
  const isAuthBlocked = session.authEnabled && !session.isAuthenticated;
  const [status, setStatus] = useState<SubjectDashboardStatus>("loading");
  const [summary, setSummary] = useState<SubjectDashboardSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const timeout = window.setTimeout(async () => {
      if (isAuthBlocked) {
        if (!cancelled) {
          setSummary(null);
          setStatus("error");
        }
        return;
      }

      if (!cancelled) {
        setStatus("loading");
      }

      try {
        const nextSummary = await fetchSubjectSummary(safeSubjectId);
        if (cancelled) return;
        setSummary(nextSummary);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setSummary(null);
          setStatus("error");
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isAuthBlocked, safeSubjectId, session.userId]);

  function retryLoad() {
    setStatus("loading");
  }

  const nextAction = useMemo(
    () => (summary ? buildNextAction(safeSubjectId, summary) : null),
    [safeSubjectId, summary],
  );
  const linkedSections = useMemo(
    () => (summary ? buildLinkedSections(safeSubjectId, summary) : []),
    [safeSubjectId, summary],
  );

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 text-[color:var(--foreground)] sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6">
        <SubjectHeader subjectId={safeSubjectId} />

        {status === "loading" ? <LoadingState /> : null}
        {status === "error" ? <ErrorState onRetry={retryLoad} /> : null}

        {status === "ready" && summary && nextAction ? (
          <>
            <StatusBlock summary={summary} />
            <NextActionPanel action={nextAction} />
            <LinkedSectionList sections={linkedSections} />
            <QuietFooterNav subjectId={safeSubjectId} />
          </>
        ) : null}
      </div>
    </main>
  );
}

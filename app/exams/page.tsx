import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsService } from "@/lib/review-os/service";
import { cn } from "@/lib/utils";

type ExamSelectionCard = {
  testId: "exam-card-first" | "exam-card-second" | "exam-card-answer-review";
  title: string;
  description: string;
  badge?: string;
  helper?: string;
  href: string;
  cta: string;
  disabled?: boolean;
};

function buildModeEntryHref(isAuthenticated: boolean, authEnabled: boolean, mode: "first" | "second") {
  const appHref = `/app?mode=${mode}`;
  if (!authEnabled || isAuthenticated) return appHref;
  return `/login?returnTo=${encodeURIComponent(appHref)}`;
}

function buildModeInputHref(mode: "first" | "second") {
  return mode === "first" ? "/app/capture?mode=first" : "/app/write?mode=second";
}


function buildAnswerReviewHref(isAuthenticated: boolean, authEnabled: boolean) {
  if (!authEnabled || isAuthenticated) return "/answer-review";
  return "/login?returnTo=%2Fanswer-review";
}

function SelectionCard({ card }: { card: ExamSelectionCard }) {
  const ctaClassName = cn(
    buttonVariants({ variant: "outline" }),
    "w-full sm:w-auto",
    card.disabled ? "pointer-events-none opacity-60" : "",
  );

  return (
    <section data-testid={card.testId} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">{card.title}</h2>
        <RefinedBadge>{card.badge ?? "감정평가사"}</RefinedBadge>
      </div>
      <p className="mt-4 text-sm leading-7 text-[color:var(--foreground-strong)]">{card.description}</p>
      {card.helper ? <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{card.helper}</p> : null}

      <div className="mt-7">
        <Link href={card.href} aria-disabled={card.disabled} className={ctaClassName}>
          {card.cta}
        </Link>
      </div>
    </section>
  );
}

export default async function ExamsPage() {
  const session = await getServerSessionUser();
  const modeHrefByData: { first: string; second: string } = {
    first: buildModeEntryHref(session.isAuthenticated, session.authEnabled, "first"),
    second: buildModeEntryHref(session.isAuthenticated, session.authEnabled, "second"),
  };

  if (session.userId) {
    const [hasFirstData, hasSecondData] = await Promise.all([
      reviewOsService.hasMeaningfulLearningData(session.userId, session.email, "first").catch(() => false),
      reviewOsService.hasMeaningfulLearningData(session.userId, session.email, "second").catch(() => false),
    ]);
    modeHrefByData.first = hasFirstData ? "/app?mode=first" : buildModeInputHref("first");
    modeHrefByData.second = hasSecondData ? "/app?mode=second" : buildModeInputHref("second");
  }

  const cards: ExamSelectionCard[] = [
    {
      testId: "exam-card-first",
      title: "감정평가사 1차",
      description: "객관식 세트 풀이, 오답 원인, 회상, 재시도 큐를 운영합니다.",
      href: modeHrefByData.first,
      cta: "이 트랙으로 시작",
    },
    {
      testId: "exam-card-second",
      title: "감정평가사 2차",
      description: "쟁점 회상, 목차, 답안 작성, 기준답안 비교, 문단 다시쓰기를 운영합니다.",
      href: modeHrefByData.second,
      cta: "이 트랙으로 시작",
    },
    {
      testId: "exam-card-answer-review",
      title: "답안 검토실",
      description: "수기 답안 OCR로 텍스트를 추출하고, 기준답안 비교와 누락 논점 확인, 교정 문단 작성을 진행합니다.",
      badge: "운영자용 베타",
      helper: "최종 채점이나 합격 판정이 아니라 답안 검토와 보강을 돕는 운영자용 흐름입니다.",
      href: buildAnswerReviewHref(session.isAuthenticated, session.authEnabled),
      cta: "OCR 답안 검토 시작",
    },
  ];

  return (
    <RefinedShell className="space-y-8 sm:space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>시험 선택</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          감정평가사 트랙을 선택하세요.
        </h1>
        <p className="mt-3 text-body text-[color:var(--muted)] sm:mt-5">
          감정평가사 1차와 2차만 제공합니다. 선택한 모드로 로그인 후 바로 실행 화면으로 이어집니다.
        </p>
      </section>

      <div className="grid gap-5">
        {cards.map((card) => (
          <SelectionCard key={card.title} card={card} />
        ))}
      </div>
    </RefinedShell>
  );
}

import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { getServerSessionUser } from "@/lib/auth/session";
import { buildAppraiserHomeState } from "@/lib/inverge/exam-home";
import { cn } from "@/lib/utils";

type ExamSelectionCard = {
  title: string;
  description: string;
  loop: string;
  href: string;
};

function SelectionCard({ card }: { card: ExamSelectionCard }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">{card.title}</h2>
        <RefinedBadge>감정평가사</RefinedBadge>
      </div>
      <p className="mt-4 text-sm leading-7 text-[color:var(--foreground-strong)]">{card.description}</p>
      <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{card.loop}</p>

      <div className="mt-7">
        <Link href={card.href} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          선택하기
        </Link>
      </div>
    </section>
  );
}

export default async function ExamsPage() {
  const session = await getServerSessionUser();
  const userId = session.userId ?? "mvp-user";
  const appraiserState = await buildAppraiserHomeState(userId);

  const cards: ExamSelectionCard[] = [
    {
      title: "감정평가사 1차",
      description: "객관식 세트 풀이 중심으로 오답 원인을 정리하고 재시도 큐를 운영합니다.",
      loop: "세트 풀이 → 오답 이유 → 회상 → 재시도 큐",
      href: appraiserState.firstCard.ctaHref,
    },
    {
      title: "감정평가사 2차",
      description: "답안을 비교해 가장 큰 간극 하나를 찾고 문단 다시쓰기로 연결합니다.",
      loop: "쟁점 회상 → 답안 비교 → 가장 큰 간극 → 문단 다시쓰기",
      href: appraiserState.secondCard.ctaHref,
    },
  ];

  return (
    <RefinedShell className="space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>시험 선택</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          감정평가사 트랙을 선택하세요.
        </h1>
        <p className="mt-5 text-body text-[color:var(--muted)]">
          감정평가사 1차와 2차만 제공합니다. 점수보다 다음 행동을 정리하는 흐름으로 이어집니다.
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

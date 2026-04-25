import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { getServerSessionUser } from "@/lib/auth/session";
import { buildAppraiserHomeState } from "@/lib/inverge/exam-home";
import { cn } from "@/lib/utils";

type ExamSelectionCard = {
  title: string;
  description: string;
  supportingText: string;
  stageLabel: string;
  firstHref: string;
  secondHref: string;
};

function SelectionCard({ card }: { card: ExamSelectionCard }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-h2 font-medium text-[color:var(--foreground-strong)]">{card.title}</h2>
        <RefinedBadge>{card.stageLabel}</RefinedBadge>
      </div>
      <p className="mt-4 text-base leading-7 text-[color:var(--foreground-strong)]">{card.description}</p>
      <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{card.supportingText}</p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href={card.firstHref} className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}>
          1차 들어가기
        </Link>
        <Link
          href={card.secondHref}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full sm:w-auto")}
        >
          2차 들어가기
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
      title: "감정평가사",
      stageLabel: "운영 단계",
      description: "1차 객관식 학습 운영과 2차 답안 교정 운영을 하나의 흐름으로 관리합니다.",
      supportingText:
        "1차는 온보딩, 초기 진단, 세트 풀이, review, coaching 중심으로 이어지고, 2차는 실무·이론·법규 답안을 쓰고 가장 큰 차이 하나를 교정합니다.",
      firstHref: appraiserState.firstCard.ctaHref,
      secondHref: appraiserState.secondCard.ctaHref,
    },
  ];

  return (
    <RefinedShell className="space-y-10">
      <section className="max-w-3xl">
        <RefinedBadge>시험 선택</RefinedBadge>
        <h1 className="mt-5 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          준비 중인 시험을 선택하세요.
        </h1>
        <p className="mt-5 text-body text-[color:var(--muted)]">
          감정평가사 1차 운영과 2차 답안 교정을 분리해 이어갑니다.
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

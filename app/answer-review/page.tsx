import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AnswerReviewInfoPage() {
  return (
    <RefinedShell className="space-y-8 py-12">
      <section className="max-w-3xl space-y-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-7">
        <RefinedBadge>운영자용 베타</RefinedBadge>
        <h1 className="text-[36px] font-medium leading-[1.15] tracking-[-0.045em] text-[color:var(--foreground-strong)] sm:text-[44px]">
          답안 검토실은 운영자용 베타로 준비 중입니다.
        </h1>
        <p className="text-sm leading-7 text-[color:var(--foreground-strong)]">
          수기 답안을 OCR로 정리하고 기준답안과 비교해 누락논점과 교정 문단을 확인하는 흐름을 준비하고 있습니다.
        </p>
        <p className="text-sm leading-7 text-[color:var(--muted)]">
          이 페이지는 안내 전용이며 업로드, OCR 처리, 채점 확정, 데이터 변경 기능을 제공하지 않습니다. 최종 채점이나 합격 판정을 제공하지
          않습니다.
        </p>
      </section>

      <div>
        <Link href="/exams" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          시험 선택으로 돌아가기
        </Link>
      </div>
    </RefinedShell>
  );
}

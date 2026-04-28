import Link from "next/link";

import { RefinedBadge, RefinedShell } from "@/components/inverge/refined-primitives";
import { buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const flowCards = [
  {
    title: "1) OCR 입력",
    description: "수기 답안 이미지/PDF를 올리고 OCR 초안을 확인합니다.",
  },
  {
    title: "2) 기준답안 비교",
    description: "기준답안 또는 기준 구조를 붙여 넣고 내 답안과 나란히 점검합니다.",
  },
  {
    title: "3) 누락 논점 확인",
    description: "핵심 논점 중 빠진 부분 하나를 우선으로 표시합니다.",
  },
  {
    title: "4) 교정 문단 작성",
    description: "누락 논점을 반영한 교정 문단을 작성해 다음 답안에 바로 반영합니다.",
  },
];

export default function AnswerReviewInfoPage() {
  return (
    <RefinedShell className="space-y-5 py-6 sm:space-y-8 sm:py-10">
      <section className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <RefinedBadge>운영자용 베타</RefinedBadge>
          <RefinedBadge tone="amber">강사 검수 전 확정 금지</RefinedBadge>
        </div>

        <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] p-4 sm:p-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">답안 입력 시작</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <label
                htmlFor="answer-review-file-upload"
                className={cn(buttonVariants({ variant: "default" }), "cursor-pointer justify-center sm:w-auto")}
              >
                답안 이미지 업로드
              </label>
              <input id="answer-review-file-upload" type="file" accept="image/*,.pdf" className="hidden" />
            </div>
            <div className="flex flex-wrap gap-3 text-caption text-[color:var(--muted)]">
              <a href="#answer-review-text" className="underline underline-offset-4">
                텍스트로 답안 입력
              </a>
              <a href="#answer-review-reference" className="underline underline-offset-4">
                기준답안 붙여넣기
              </a>
            </div>
            <p className="text-caption text-[color:var(--muted)]">OCR 결과는 초안이며 저장 전 확인이 필요합니다.</p>
          </div>

          <div className="space-y-2">
            <h1 className="text-[26px] font-medium leading-[1.2] tracking-[-0.03em] text-[color:var(--foreground-strong)] sm:text-[34px]">
              수기 답안을 OCR로 읽고, 기준답안과 비교해 보강할 논점 하나를 정리합니다.
            </h1>
            <p className="text-sm leading-7 text-[color:var(--muted)]">
              최종 채점이나 합격 판정이 아니라 답안 검토와 보강을 돕는 운영형 흐름입니다.
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] bg-[color:var(--surface)] p-3 text-caption text-[color:var(--muted)]">
            업로드한 답안은 OCR 초안 확인용으로 활용하고, 아래 입력칸에서 내 답안과 기준답안을 바로 비교할 수 있습니다.
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2" id="answer-review-text">
              <p className="text-caption font-medium text-[color:var(--muted)]">내 답안 텍스트</p>
              <Textarea
                className="min-h-[160px] bg-[color:var(--surface)]"
                placeholder="OCR 결과를 붙여 넣거나 직접 입력해 주세요. 문단 단위로 나누면 비교가 쉬워집니다."
              />
            </div>
            <div className="space-y-2" id="answer-review-reference">
              <p className="text-caption font-medium text-[color:var(--muted)]">기준답안/기준 구조</p>
              <Textarea
                className="min-h-[160px] bg-[color:var(--surface)]"
                placeholder="기준답안 또는 목차 구조를 붙여 넣어 누락 논점을 확인하세요."
              />
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {flowCards.map((card) => (
          <article key={card.title} className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface)] p-4">
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{card.title}</p>
            <p className="mt-2 text-caption leading-6 text-[color:var(--muted)]">{card.description}</p>
          </article>
        ))}
      </section>

      <div>
        <Link href="/exams" className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          시험 선택으로 돌아가기
        </Link>
      </div>
    </RefinedShell>
  );
}

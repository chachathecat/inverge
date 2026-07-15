import Link from "next/link";

import { AccessCheckUnavailableState } from "@/components/review-os/access-check-unavailable-state";
import { Button } from "@/components/ui/button";
import type { ReviewOsAccessResult } from "@/lib/review-os/access-result";

type NonAllowedReviewOsAccess = Exclude<
  ReviewOsAccessResult,
  Readonly<{ status: "allowed" }>
>;

export function ReviewOsAccessState({
  access,
  embedded = false,
}: Readonly<{ access: NonAllowedReviewOsAccess; embedded?: boolean }>) {
  if (access.status === "unavailable") {
    return <AccessCheckUnavailableState embedded={embedded} />;
  }

  return (
    <div
      className={`mx-auto flex w-full max-w-2xl items-center px-5 py-12 ${embedded ? "min-h-[50vh]" : "min-h-[calc(100vh-96px)]"}`}
      data-review-os-access-status="denied"
    >
      <section className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
        <p className="text-sm text-[color:var(--muted)]">답안길 초대 계정</p>
        <h1 className="hero-balance ko-keep mt-3 text-[28px] font-medium tracking-normal text-[color:var(--foreground-strong)]">
          아직 초대 승인 전입니다.
        </h1>
        <p className="ko-keep mt-4 text-sm leading-7 text-[color:var(--muted)]">
          답안길은 초대 계정부터 순차적으로 열고 있습니다. 감정평가사 2차 답안 훈련 흐름을 안정적으로 준비 중이며,
          승인되면 지금 계정으로 오늘 할 일에서 바로 이어서 사용할 수 있습니다.
        </p>
        <div className="mt-6">
          <Link href="/" className="inline-flex">
            <Button type="button">메인으로 돌아가기</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

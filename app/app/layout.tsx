import type { ReactNode } from "react";
import Link from "next/link";

import { ReviewOsAppShell } from "@/components/review-os/app-shell";
import { Button } from "@/components/ui/button";
import { getProfileMode } from "@/lib/review-os/appraisal";
import { getReviewOsServerContext } from "@/lib/review-os/server";

export default async function ReviewOsLayout({ children }: { children: ReactNode }) {
  const { session, access, profile, usage } = await getReviewOsServerContext("/app");
  const mode = getProfileMode(profile);

  if (!access?.allowed) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-2xl items-center px-5 py-12">
        <section className="w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-8">
          <p className="text-sm text-[color:var(--muted)]">감정평가사 closed beta</p>
          <h1 className="mt-3 text-[28px] font-medium tracking-[-0.04em] text-[color:var(--foreground-strong)]">
            아직 초대된 계정이 아닙니다.
          </h1>
          <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
            Inverge closed beta는 초대 계정만 이용할 수 있습니다. 감정평가사 1차·2차 흐름을 순차적으로 열고 있어,
            초대가 승인되면 지금 계정으로 바로 이어서 사용할 수 있습니다.
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

  return (
    <ReviewOsAppShell
      email={session.email}
      mode={mode}
      rightSlot={
        usage ? (
          <div className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[color:var(--muted)]">
            이번 달 {usage.monthlyUsed} / {usage.monthlyLimit}
          </div>
        ) : null
      }
    >
      {children}
    </ReviewOsAppShell>
  );
}

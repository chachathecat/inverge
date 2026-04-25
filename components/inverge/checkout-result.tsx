"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { notifySubscriptionChanged } from "@/lib/inverge/billing-client";
import { cn } from "@/lib/utils";

export function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? undefined;
  const returnPath = searchParams.get("returnPath") ?? "/exams/appraiser";
  const [message, setMessage] = useState("서버에서 플랜 상태를 반영하고 있습니다.");

  useEffect(() => {
    let cancelled = false;

    async function confirmCheckout() {
      if (!sessionId) {
        setMessage("체크아웃 세션을 찾지 못했습니다.");
        return;
      }

      try {
        const response = await fetch("/api/inverge/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "confirm-checkout",
            checkoutSessionId: sessionId,
          }),
        });
        const result = (await response.json()) as {
          ok: boolean;
          subscription?: {
            planId: string;
            provider: string;
          };
        };

        if (!response.ok || !result.ok || !result.subscription) {
          throw new Error("confirm-failed");
        }

        if (cancelled) return;

        notifySubscriptionChanged();
        setMessage("플랜 상태가 서버에 반영되었습니다.");
      } catch {
        if (!cancelled) {
          setMessage("플랜 상태 반영 중 문제가 있었습니다.");
        }
      }
    }

    void confirmCheckout();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-12 sm:px-8">
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
        <p className="text-caption font-medium text-[color:var(--muted)]">Plan updated</p>
        <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">플랜이 적용되었습니다.</h1>
        <p className="mt-4 text-body text-[color:var(--muted)]">
          이제 2차 compare/rewrite AI 보조와 확장된 학습 운영 기능을 사용할 수 있습니다.
        </p>
        <p className="mt-3 text-caption text-[color:var(--muted)]">{message}</p>
        <Link href={returnPath} className={cn(buttonVariants({ size: "lg" }), "mt-8 w-full sm:w-auto")}>
          돌아가기
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}

export function CheckoutCancel() {
  const searchParams = useSearchParams();
  const returnPath = searchParams.get("returnPath") ?? "/pricing";
  const sessionId = searchParams.get("session_id") ?? undefined;
  const reason = useMemo(() => searchParams.get("reason") ?? "checkout-canceled", [searchParams]);
  const [message, setMessage] = useState("현재 플랜 상태는 변경되지 않았습니다.");

  useEffect(() => {
    let cancelled = false;

    async function cancelCheckout() {
      if (!sessionId) return;

      try {
        await fetch("/api/inverge/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cancel-checkout",
            checkoutSessionId: sessionId,
            reason,
          }),
        });
        if (!cancelled) {
          notifySubscriptionChanged();
          setMessage("체크아웃 상태를 서버에 기록했습니다.");
        }
      } catch {
        if (!cancelled) {
          setMessage("체크아웃 취소 기록 중 문제가 있었습니다.");
        }
      }
    }

    void cancelCheckout();

    return () => {
      cancelled = true;
    };
  }, [reason, sessionId]);

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-12 sm:px-8">
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] p-6 sm:p-10">
        <p className="text-caption font-medium text-[color:var(--muted)]">Checkout</p>
        <h1 className="mt-3 text-h1 font-medium text-[color:var(--foreground-strong)]">결제를 완료하지 않았습니다.</h1>
        <p className="mt-4 text-body text-[color:var(--muted)]">
          지금은 현재 플랜으로 계속 사용할 수 있습니다. 필요한 시점에 다시 업그레이드하면 됩니다.
        </p>
        <p className="mt-3 text-caption text-[color:var(--muted)]">{reason}</p>
        <p className="mt-2 text-caption text-[color:var(--muted)]">{message}</p>
        <Link href={returnPath} className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-8 w-full sm:w-auto")}>
          돌아가기
        </Link>
      </section>
    </main>
  );
}

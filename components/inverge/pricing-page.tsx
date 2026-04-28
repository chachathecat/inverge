"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  INVERGE_PLANS,
  type CheckoutResult,
  type InvergePlanId,
  type InvergeSubscriptionState,
} from "@/lib/inverge/billing";
import { useSubscriptionState } from "@/lib/inverge/billing-client";
import { cn } from "@/lib/utils";

type CheckoutState = {
  planId: InvergePlanId | null;
  status: "idle" | "starting" | "error";
  message?: string;
};

type PricingPageProps = {
  initialSubscriptionState: InvergeSubscriptionState;
};

export function PricingPage({ initialSubscriptionState }: PricingPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnPath = searchParams.get("return") ?? "/app";
  const subscription = useSubscriptionState(initialSubscriptionState);
  const [checkoutState, setCheckoutState] = useState<CheckoutState>({ planId: null, status: "idle" });

  async function startCheckout(planId: InvergePlanId) {
    setCheckoutState({ planId, status: "starting" });

    try {
      const response = await fetch("/api/inverge/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, returnPath }),
      });
      const result = (await response.json()) as CheckoutResult;

      if (!result.ok) {
        setCheckoutState({ planId, status: "error", message: "결제 흐름을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요." });
        router.push(`/checkout/cancel?reason=${encodeURIComponent(result.error)}&returnPath=${encodeURIComponent(returnPath)}`);
        return;
      }

      router.push(result.checkoutUrl);
    } catch {
      setCheckoutState({ planId, status: "error", message: "결제 연결이 불안정합니다. 잠시 후 다시 시도해 주세요." });
      router.push(`/checkout/cancel?reason=checkout-client-error&returnPath=${encodeURIComponent(returnPath)}`);
    }
  }

  return (
    <main className="mx-auto w-full max-w-[1080px] px-5 py-8 sm:px-8 lg:py-12">
      <section className="max-w-3xl">
        <p className="text-caption font-medium text-[color:var(--muted)]">감정평가사 closed beta 플랜</p>
        <h1 className="mt-3 text-[40px] font-medium leading-[1.12] tracking-[-0.05em] text-[color:var(--foreground-strong)] sm:text-[52px]">
          결제보다 먼저, 감평사 수험 운영 흐름을 검증합니다.
        </h1>
        <p className="mt-5 max-w-2xl text-body text-[color:var(--muted)]">
          현재는 invite-only closed beta입니다. 1차 오답과 2차 답안 보강을 안정적으로 처리하는 범위부터 닫아서 운영합니다.
        </p>
      </section>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {INVERGE_PLANS.map((plan) => {
          const current = subscription.planId === plan.id;
          const paid = plan.id !== "free";

          return (
            <section
              key={plan.id}
              className={cn(
                "rounded-[var(--radius-lg)] border bg-[color:var(--surface)] p-6",
                plan.recommended ? "border-[color:var(--primary)] shadow-[var(--shadow-soft)]" : "border-[var(--border)]",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-h2 font-medium text-[color:var(--foreground-strong)]">{plan.name}</p>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{plan.description}</p>
                </div>
                {plan.recommended ? (
                  <span className="rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-1 text-caption text-[color:var(--muted-strong)]">
                    closed beta 기본
                  </span>
                ) : null}
              </div>

              <p className="mt-6 text-h2 font-medium text-[color:var(--foreground-strong)]">{plan.priceLabel}</p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2 text-sm leading-6 text-[color:var(--muted-strong)]">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[color:var(--foreground-strong)]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {paid ? (
                <Button
                  type="button"
                  className="mt-7 w-full"
                  onClick={() => void startCheckout(plan.id)}
                  disabled={current || checkoutState.status === "starting" || plan.id === "premium"}
                >
                  {current
                    ? "현재 플랜"
                    : checkoutState.status === "starting" && checkoutState.planId === plan.id
                      ? "연결 중"
                      : plan.id === "premium"
                        ? "준비 중"
                        : "선택하기"}
                  {!current && plan.id !== "premium" ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                </Button>
              ) : (
                <Link
                  href={returnPath}
                  className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-full border border-[var(--border-strong)] text-sm font-medium text-[color:var(--foreground-strong)]"
                >
                  closed beta 계속 사용
                </Link>
              )}
            </section>
          );
        })}
      </div>

      {checkoutState.status === "error" ? <p className="mt-5 text-sm text-[color:var(--status-red)]">{checkoutState.message}</p> : null}
    </main>
  );
}

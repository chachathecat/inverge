"use client";

import Link from "next/link";
import { useEffect } from "react";

import { logInvergeEvent } from "@/lib/inverge/event-client";
import { useFeatureAccess } from "@/lib/inverge/billing-client";
import type { InvergeFeatureKey } from "@/lib/inverge/billing";
import { cn } from "@/lib/utils";

type UpgradeNudgeProps = {
  feature: InvergeFeatureKey;
  title: string;
  helper: string;
  returnPath: string;
  context?: {
    examId?: string;
    subjectId?: string;
    sessionId?: string;
    submissionId?: string;
  };
  className?: string;
};

export function UpgradeNudge({ feature, title, helper, returnPath, context, className }: UpgradeNudgeProps) {
  const { allowed } = useFeatureAccess(feature);
  const pricingHref = `/pricing?return=${encodeURIComponent(returnPath)}`;

  useEffect(() => {
    if (allowed) return;

    logInvergeEvent("paywall.viewed", {
      examId: context?.examId,
      subjectId: context?.subjectId,
      sessionId: context?.sessionId,
      submissionId: context?.submissionId,
      stage: "commerce",
      properties: {
        feature,
        returnPath,
      },
    });
  }, [allowed, context?.examId, context?.sessionId, context?.subjectId, context?.submissionId, feature, returnPath]);

  if (allowed) return null;

  return (
    <section className={cn("rounded-[var(--radius-md)] border border-[var(--border)] bg-[color:var(--surface-soft)] px-4 py-4", className)}>
      <p className="text-sm font-medium text-[color:var(--foreground-strong)]">{title}</p>
      <p className="mt-1 text-caption leading-5 text-[color:var(--muted)]">{helper}</p>
      <Link href={pricingHref} className="mt-3 inline-flex text-sm font-medium text-[color:var(--foreground-strong)] hover:underline">
        플랜 보기
      </Link>
    </section>
  );
}

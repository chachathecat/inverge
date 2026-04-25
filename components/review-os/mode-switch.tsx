"use client";

import Link from "next/link";

import { APPRAISAL_MODE_CONFIG, type AppraisalMode } from "@/lib/review-os/appraisal";
import { cn } from "@/lib/utils";

type ModeSwitchProps = {
  mode: AppraisalMode;
  basePath: string;
  compact?: boolean;
};

export function ReviewOsModeSwitch({ mode, basePath, compact = false }: ModeSwitchProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-[var(--border)] bg-[color:var(--surface)] p-1",
        compact ? "text-xs" : "text-sm",
      )}
      aria-label="감정평가사 단계 선택"
    >
      {(["first", "second"] as const).map((item) => {
        const config = APPRAISAL_MODE_CONFIG[item];
        return (
          <Link
            key={item}
            href={`${basePath}?mode=${item}`}
            className={cn(
              "rounded-full px-4 py-2 transition",
              mode === item
                ? "bg-[color:var(--primary)] text-white"
                : "text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
            )}
          >
            {compact ? config.shortLabel : config.label}
          </Link>
        );
      })}
    </div>
  );
}

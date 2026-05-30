"use client";

import type { ReactNode } from "react";

import { LearnerShell } from "@/components/learner";
import type { AppraisalMode } from "@/lib/review-os/appraisal";

type AppShellProps = {
  email: string | null;
  mode: AppraisalMode;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function ReviewOsAppShell({ email, mode, children, rightSlot }: AppShellProps) {
  return (
    <LearnerShell email={email} mode={mode} rightSlot={rightSlot}>
      {children}
    </LearnerShell>
  );
}

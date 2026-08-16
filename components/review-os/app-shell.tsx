"use client";

import type { ReactNode } from "react";

import { LearnerShell } from "@/components/learner";

type AppShellProps = {
  email: string | null;
  children: ReactNode;
  rightSlot?: ReactNode;
  trustedRepairEnabled?: boolean;
};

export function ReviewOsAppShell({
  email,
  children,
  rightSlot,
  trustedRepairEnabled = false,
}: AppShellProps) {
  return (
    <LearnerShell
      email={email}
      rightSlot={rightSlot}
      trustedRepairEnabled={trustedRepairEnabled}
    >
      {children}
    </LearnerShell>
  );
}

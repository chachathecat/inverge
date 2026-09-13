"use client";

import type { ReactNode } from "react";

import { LearnerShell } from "@/components/learner";

type AppShellProps = {
  email: string | null;
  children: ReactNode;
  rightSlot?: ReactNode;
  secondStageOwnerHomeEnabled?: boolean;
  trustedRepairEnabled?: boolean;
};

export function ReviewOsAppShell({
  email,
  children,
  rightSlot,
  secondStageOwnerHomeEnabled = false,
  trustedRepairEnabled = false,
}: AppShellProps) {
  return (
    <LearnerShell
      email={email}
      rightSlot={rightSlot}
      secondStageOwnerHomeEnabled={secondStageOwnerHomeEnabled}
      trustedRepairEnabled={trustedRepairEnabled}
    >
      {children}
    </LearnerShell>
  );
}

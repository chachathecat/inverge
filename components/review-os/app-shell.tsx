"use client";

import type { ReactNode } from "react";

import { LearnerShell } from "@/components/learner";

type AppShellProps = {
  email: string | null;
  children: ReactNode;
  rightSlot?: ReactNode;
};

export function ReviewOsAppShell({ email, children, rightSlot }: AppShellProps) {
  return (
    <LearnerShell email={email} rightSlot={rightSlot}>
      {children}
    </LearnerShell>
  );
}

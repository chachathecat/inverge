import type { ReactNode } from "react";

import { DisclaimerFooter } from "@/components/shared/footer";
import { SiteHeader } from "@/components/shared/site-header";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <DisclaimerFooter />
    </div>
  );
}

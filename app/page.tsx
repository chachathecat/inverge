import { FrontPage } from "@/components/inverge/front-page";
import { ClosedBetaBanner } from "@/components/shared/closed-beta-banner";
import { PublicShell } from "@/components/shared/public-shell";

export default function HomePage() {
  return (
    <PublicShell>
      <div className="space-y-4">
        <ClosedBetaBanner />
        <FrontPage />
      </div>
    </PublicShell>
  );
}

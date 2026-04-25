import { INVERGE_DISCLAIMER } from "@/lib/inverge/utils";

export function DisclaimerFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-[color:var(--surface)] px-4 py-5 text-center text-[11px] leading-6 text-[color:var(--muted)] sm:px-6">
      {INVERGE_DISCLAIMER}
    </footer>
  );
}

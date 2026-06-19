import Link from "next/link";

import type { AppraisalMode } from "@/lib/review-os/appraisal";

type StandaloneLearnerToolNavProps = {
  mode: AppraisalMode;
  subject?: string;
};

export function StandaloneLearnerToolNav({ mode, subject }: StandaloneLearnerToolNavProps) {
  const subjectQuery = subject ? `&subject=${encodeURIComponent(subject)}` : "";
  const links = [
    { label: "오늘 홈", href: `/app?mode=${mode}` },
    { label: "오늘 한 것", href: `/app/capture?mode=${mode}${subjectQuery}` },
    { label: "복습", href: `/app/review?mode=${mode}${subjectQuery}` },
    { label: "학습 기록", href: `/app/agenda?mode=${mode}` },
  ];

  return (
    <nav
      aria-label="학습 흐름"
      className="rounded-[var(--radius-lg)] border border-[color:var(--border-subtle)] bg-[color:var(--surface)] p-2"
      data-standalone-learner-tool-nav
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-[var(--radius-sm)] border border-[color:var(--border-hairline)] px-3 py-2 text-center text-sm font-medium text-[color:var(--foreground-strong)] hover:bg-[color:var(--surface-soft)]"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

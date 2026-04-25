import Link from "next/link";

import {
  APPRAISER_FIRST_EXAM,
  firstExamSubjectPath,
  type FirstExamSubject,
} from "@/lib/inverge/first-exam-data";
import { cn } from "@/lib/utils";

type FirstExamShellProps = {
  subject?: FirstExamSubject;
  children: React.ReactNode;
};

export function FirstExamShell({ subject, children }: FirstExamShellProps) {
  return (
    <>
      <div className="mx-auto w-full max-w-[1180px] px-5 pt-5 sm:px-8">
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[color:var(--foreground-strong)]">
              {APPRAISER_FIRST_EXAM.name}
            </p>
            <p className="text-caption text-[color:var(--muted)]">
              {APPRAISER_FIRST_EXAM.sessionLabel} · D-{APPRAISER_FIRST_EXAM.dDay}
            </p>
          </div>
          <div className="flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface-soft)] p-1">
            {APPRAISER_FIRST_EXAM.subjects.map((item) => (
              <Link
                key={item.id}
                href={firstExamSubjectPath(item.id)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm transition",
                  subject?.id === item.id
                    ? "bg-[color:var(--surface)] text-[color:var(--foreground-strong)] shadow-[0_4px_14px_rgba(19,34,56,0.08)]"
                    : "text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
      {children}
    </>
  );
}

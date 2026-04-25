"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import type { InvergeExam, InvergeSession, InvergeSubject } from "@/lib/inverge/mock-data";
import { cn } from "@/lib/utils";

type ContextBarProps = {
  exam: InvergeExam;
  session: InvergeSession;
  subject: InvergeSubject;
  screen: "home" | "write" | "compare" | "rewrite" | "records";
  submissionId?: string;
};

function subjectHref(
  examId: string,
  sessionId: string,
  subjectId: string,
  screen: ContextBarProps["screen"],
  submissionId = "latest",
) {
  const base = `/exams/${examId}/${sessionId}/${subjectId}`;

  if (screen === "compare" || screen === "rewrite") {
    return `${base}/${screen}/${submissionId}`;
  }

  if (screen === "home") {
    return base;
  }

  return `${base}/${screen}`;
}

export function ContextBar({ exam, session, subject, screen, submissionId }: ContextBarProps) {
  const pathname = usePathname();

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pt-5 sm:px-8">
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color:var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
            aria-label="시험 선택"
          >
            {exam.name}
            <ChevronDown className="h-3.5 w-3.5 text-[color:var(--muted)]" />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color:var(--surface-soft)] px-3 py-2 text-sm text-[color:var(--foreground-strong)]"
            aria-label="회차 선택"
          >
            {session.label}
            <ChevronDown className="h-3.5 w-3.5 text-[color:var(--muted)]" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto rounded-full bg-[color:var(--surface-soft)] p-1">
          {exam.subjects.map((item) => {
            const href = subjectHref(exam.id, session.id, item.id, screen, submissionId);
            const active = item.id === subject.id || pathname === href;

            return (
              <Link
                key={item.id}
                href={href}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm transition",
                  active
                    ? "bg-[color:var(--surface)] text-[color:var(--foreground-strong)] shadow-[0_4px_14px_rgba(19,34,56,0.08)]"
                    : "text-[color:var(--muted)] hover:text-[color:var(--foreground-strong)]",
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

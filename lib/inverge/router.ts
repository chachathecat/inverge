import {
  DEFAULT_EXAM_ID,
  DEFAULT_SESSION_ID,
  DEFAULT_SUBJECT_ID,
} from "@/lib/inverge/mock-data";
import type { SubmissionMode } from "@/lib/inverge/types";

export function readWorkRouteParams(params?: {
  examId?: string;
  sessionId?: string;
  subjectId?: string;
  submissionId?: string;
}) {
  return {
    examId: params?.examId ?? DEFAULT_EXAM_ID,
    sessionId: params?.sessionId ?? DEFAULT_SESSION_ID,
    subjectId: params?.subjectId ?? DEFAULT_SUBJECT_ID,
    submissionId: params?.submissionId ?? "latest",
  };
}

export function readSubmissionMode(
  searchParams?: Record<string, string | string[] | undefined>,
): SubmissionMode | undefined {
  const raw = searchParams?.mode;
  const value = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;

  if (
    value === "full-diagnostic" ||
    value === "todays-mission" ||
    value === "weakness-repair" ||
    value === "rewrite-submission"
  ) {
    return value;
  }

  return undefined;
}

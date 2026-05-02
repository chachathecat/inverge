import "server-only";

import { getSupabasePersistenceClient, assertSupabaseOperation } from "@/lib/supabase/persistence";

export type ExamArchiveRow = {
  id: string;
  year: number;
  round: number;
  type: "first" | "second";
};

export type ExamArchiveSubjectRow = {
  subject: string;
  questionCount: number;
};

function isMissingTableError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "PGRST205" || error?.message?.includes("Could not find the table");
}

export async function listExamArchive() {
  const client = getSupabasePersistenceClient();
  if (!client) return [] as ExamArchiveRow[];

  const result = await client
    .from("exams")
    .select("id, year, round, type")
    .order("year", { ascending: false })
    .order("round", { ascending: false })
    .order("type", { ascending: true });

  if (isMissingTableError(result.error)) {
    console.warn("[exam_archive_list] Missing public.exams table; returning empty archive list.", {
      code: result.error?.code,
      message: result.error?.message,
    });
    return [] as ExamArchiveRow[];
  }

  assertSupabaseOperation("exam_archive_list", result);
  return (result.data ?? []) as ExamArchiveRow[];
}

export async function getExamArchiveById(examId: string) {
  const client = getSupabasePersistenceClient();
  if (!client) return null;

  const result = await client.from("exams").select("id, year, round, type").eq("id", examId).maybeSingle();

  if (isMissingTableError(result.error)) {
    console.warn("[exam_archive_get_by_id] Missing public.exams table; returning null exam.", {
      examId,
      code: result.error?.code,
      message: result.error?.message,
    });
    return null;
  }

  assertSupabaseOperation("exam_archive_get_by_id", result);
  return (result.data ?? null) as ExamArchiveRow | null;
}

export async function listExamArchiveSubjects(examId: string) {
  const client = getSupabasePersistenceClient();
  if (!client) return [] as ExamArchiveSubjectRow[];

  const result = await client.from("questions").select("subject").eq("exam_id", examId);

  if (isMissingTableError(result.error)) {
    console.warn("[exam_archive_subjects] Missing public.questions table; returning empty subject list.", {
      examId,
      code: result.error?.code,
      message: result.error?.message,
    });
    return [] as ExamArchiveSubjectRow[];
  }

  assertSupabaseOperation("exam_archive_subjects", result);

  const subjectCountMap = new Map<string, number>();
  for (const row of result.data ?? []) {
    const subject = typeof row.subject === "string" ? row.subject.trim() : "";
    if (!subject) continue;
    subjectCountMap.set(subject, (subjectCountMap.get(subject) ?? 0) + 1);
  }

  return Array.from(subjectCountMap.entries())
    .map(([subject, questionCount]) => ({ subject, questionCount }))
    .sort((a, b) => a.subject.localeCompare(b.subject, "ko-KR"));
}

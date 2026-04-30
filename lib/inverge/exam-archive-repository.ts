import "server-only";

import { getSupabasePersistenceClient, assertSupabaseOperation } from "@/lib/supabase/persistence";

export type ExamArchiveRow = {
  id: string;
  year: number;
  round: number;
  type: "first" | "second";
};

export async function listExamArchive() {
  const client = getSupabasePersistenceClient();
  if (!client) return [] as ExamArchiveRow[];

  const result = await client
    .from("exams")
    .select("id, year, round, type")
    .order("year", { ascending: false })
    .order("round", { ascending: false })
    .order("type", { ascending: true });

  const missingTable =
    result.error?.code === "PGRST205" ||
    result.error?.message?.includes("Could not find the table");

  if (missingTable) {
    console.warn("[exam_archive_list] Missing public.exams table; returning empty archive list.", {
      code: result.error?.code,
      message: result.error?.message,
    });
    return [] as ExamArchiveRow[];
  }

  assertSupabaseOperation("exam_archive_list", result);
  return (result.data ?? []) as ExamArchiveRow[];
}

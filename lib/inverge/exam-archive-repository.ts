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

  assertSupabaseOperation("exam_archive_list", result);
  return (result.data ?? []) as ExamArchiveRow[];
}

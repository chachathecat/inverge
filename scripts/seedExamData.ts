import fs from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

type RawExamRow = {
  year: number;
  round: number;
  type: "first" | "second";
  question_no: number;
  text: string;
  choices?: string[];
  answer?: string;
  explanation?: string;
  descriptive_answer?: string;
};

function parseCsv(content: string): RawExamRow[] {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = lines[0].split(",").map((cell) => cell.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((cell) => cell.trim());
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])) as Record<string, string>;
    return {
      year: Number(row.year),
      round: Number(row.round),
      type: row.type === "second" ? "second" : "first",
      question_no: Number(row.question_no),
      text: row.text,
      choices: row.choices ? row.choices.split("|").map((item) => item.trim()).filter(Boolean) : [],
      answer: row.answer || undefined,
      explanation: row.explanation || undefined,
      descriptive_answer: row.descriptive_answer || undefined,
    };
  });
}

async function loadRows(inputPath: string) {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const content = await fs.readFile(absolutePath, "utf-8");
  if (absolutePath.endsWith(".json")) {
    return JSON.parse(content) as RawExamRow[];
  }
  if (absolutePath.endsWith(".csv")) {
    return parseCsv(content);
  }
  throw new Error("지원 형식은 .json 또는 .csv 입니다.");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase 환경변수가 필요합니다.");

  const inputPath = process.argv[2] ?? "data/exams/exams.seed.json";
  const rows = await loadRows(inputPath);
  if (rows.length === 0) throw new Error("시드 데이터가 비어 있습니다.");

  const client = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const examKeys = new Map<string, { year: number; round: number; type: "first" | "second" }>();
  for (const row of rows) {
    examKeys.set(`${row.year}-${row.round}-${row.type}`, { year: row.year, round: row.round, type: row.type });
  }

  const exams = [...examKeys.values()];
  const upsertExamResult = await client.from("exams").upsert(exams, { onConflict: "year,round,type" }).select("id,year,round,type");
  if (upsertExamResult.error) throw upsertExamResult.error;

  const examIdMap = new Map((upsertExamResult.data ?? []).map((exam) => [`${exam.year}-${exam.round}-${exam.type}`, exam.id as string]));

  for (const row of rows) {
    const examId = examIdMap.get(`${row.year}-${row.round}-${row.type}`);
    if (!examId) continue;

    const upsertQuestionResult = await client
      .from("questions")
      .upsert(
        {
          exam_id: examId,
          question_no: row.question_no,
          text: row.text,
          choices: row.choices ?? [],
          answer: row.answer ?? null,
          explanation: row.explanation ?? null,
        },
        { onConflict: "exam_id,question_no" },
      )
      .select("id")
      .single();

    if (upsertQuestionResult.error) throw upsertQuestionResult.error;

    if (row.descriptive_answer) {
      const answerResult = await client.from("answers").insert({
        question_id: upsertQuestionResult.data.id,
        answer_text: row.descriptive_answer,
      });
      if (answerResult.error && answerResult.error.code !== "23505") throw answerResult.error;
    }
  }

  console.log(`Seed complete: exams=${exams.length}, questions=${rows.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

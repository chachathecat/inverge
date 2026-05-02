import fs from "node:fs/promises";
import path from "node:path";

type ExamType = "first" | "second";

type SeedQuestion = {
  questionNo: number;
  questionText: string;
  choices?: string[];
  answerText?: string;
  modelAnswer?: string;
  gradingPoints?: string[];
  explanation?: string;
  tags?: string[];
  isVerified?: boolean;
};

type SeedSubject = {
  name: string;
  questions: SeedQuestion[];
};

type SeedExam = {
  year: number;
  round: number;
  type: ExamType;
  subjects: SeedSubject[];
};

type SeedPayload = {
  version: 1;
  source?: { name?: string; note?: string };
  exams: SeedExam[];
};

type ValidatedQuestion = SeedQuestion & { answerValue: string; answerType: "objective_answer" | "model_answer"; answerMetadata: Record<string, unknown> };

type SeedStats = { exams: number; subjects: number; questions: number; answers: number };

const DEFAULT_PATH = "data/exams/sample.appraiser.seed.json";

function parseArgs(argv: string[]) {
  let inputPath = DEFAULT_PATH;
  let dryRun = false;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg.startsWith("--")) {
      throw new Error(`알 수 없는 옵션입니다: ${arg}`);
    }
    inputPath = arg;
  }

  return { inputPath, dryRun };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`검증 실패: ${message}`);
  }
}

function readInteger(value: unknown, label: string, options: { min?: number; max?: number } = {}): number {
  ensure(typeof value === "number" && Number.isInteger(value), `${label}는 정수여야 합니다.`);
  if (options.min !== undefined) ensure(value >= options.min, `${label}는 ${options.min} 이상이어야 합니다.`);
  if (options.max !== undefined) ensure(value <= options.max, `${label}는 ${options.max} 이하여야 합니다.`);
  return value;
}

function readString(value: unknown, label: string): string {
  ensure(typeof value === "string", `${label}는 문자열이어야 합니다.`);
  const trimmed = value.trim();
  ensure(trimmed.length > 0, `${label}는 비어있지 않아야 합니다.`);
  return trimmed;
}

function readOptionalString(value: unknown, _label: string): string | undefined {
  if (value === undefined) return undefined;
  if (value === null) return undefined;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readStringArray(value: unknown, label: string): string[] {
  ensure(Array.isArray(value), `${label}는 배열이어야 합니다.`);
  const parsed = value.map((item, index) => readString(item, `${label}[${index}]`));
  ensure(parsed.length > 0, `${label}는 비어있지 않아야 합니다.`);
  return parsed;
}

function readOptionalStringArray(value: unknown, label: string): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  ensure(Array.isArray(value), `${label}가 있으면 배열이어야 합니다.`);
  return value.map((item, index) => readString(item, `${label}[${index}]`));
}

function readExamType(value: unknown, label: string): ExamType {
  ensure(value === "first" || value === "second", `${label}은 first 또는 second여야 합니다.`);
  return value;
}

function validatePayload(input: unknown): SeedPayload {
  ensure(isObject(input), "루트는 객체여야 합니다.");
  ensure(input.version === 1, "version은 1이어야 합니다.");
  ensure(Array.isArray(input.exams), "exams는 배열이어야 합니다.");

  const seen = new Set<string>();

  const exams: SeedExam[] = input.exams.map((exam, examIndex) => {
    ensure(isObject(exam), `exams[${examIndex}]는 객체여야 합니다.`);
    const year = readInteger(exam.year, `exams[${examIndex}].year`, { min: 1900, max: 2100 });
    const round = readInteger(exam.round, `exams[${examIndex}].round`, { min: 1, max: 999 });
    const type = readExamType(exam.type, `exams[${examIndex}].type`);
    ensure(Array.isArray(exam.subjects), `exams[${examIndex}].subjects는 배열이어야 합니다.`);

    const subjects: SeedSubject[] = exam.subjects.map((subject, subjectIndex) => {
      ensure(isObject(subject), `exams[${examIndex}].subjects[${subjectIndex}]는 객체여야 합니다.`);
      const subjectName = readString(subject.name, `exams[${examIndex}].subjects[${subjectIndex}].name`);
      ensure(Array.isArray(subject.questions), `exams[${examIndex}].subjects[${subjectIndex}].questions는 배열이어야 합니다.`);

      const questions: SeedQuestion[] = subject.questions.map((question, questionIndex) => {
        ensure(isObject(question), `question 객체 형식이 잘못되었습니다. (exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}])`);
        const questionNo = readInteger(question.questionNo, `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].questionNo`, { min: 1 });
        const questionText = readString(question.questionText, `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].questionText`);
        const choices = readOptionalStringArray(question.choices, `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].choices`);
        const explanation = readOptionalString(question.explanation, `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].explanation`);
        const tags = readOptionalStringArray(question.tags, `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].tags`);
        const isVerified = question.isVerified === undefined ? undefined : (() => { ensure(typeof question.isVerified === "boolean", `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].isVerified는 boolean이어야 합니다.`); return question.isVerified; })();

        const answerText = readOptionalString(question.answerText, `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].answerText`);
        const modelAnswer = readOptionalString(question.modelAnswer, `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].modelAnswer`);
        const gradingPoints = readOptionalStringArray(
          question.gradingPoints,
          `exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}].gradingPoints`,
        );

        if (type === "first") {
          readString(answerText, "first 문항 answerText");
          if (choices !== undefined) {
            readStringArray(choices, "first 문항 choices");
          }
        }
        if (type === "second") {
          readString(modelAnswer, "second 문항 modelAnswer");
        }

        const duplicateKey = `${year}-${round}-${type}-${subjectName}-${questionNo}`;
        ensure(!seen.has(duplicateKey), `중복 문항 키가 있습니다: ${duplicateKey}`);
        seen.add(duplicateKey);

        return {
          questionNo,
          questionText,
          choices,
          answerText,
          modelAnswer,
          gradingPoints,
          explanation,
          tags,
          isVerified,
        };
      });

      return { name: subjectName, questions };
    });

    return { year, round, type, subjects };
  });

  const source = isObject(input.source)
    ? {
        name: readOptionalString(input.source.name, "source.name"),
        note: readOptionalString(input.source.note, "source.note"),
      }
    : undefined;

  return {
    version: 1,
    source,
    exams,
  };
}

function toValidatedQuestion(type: ExamType, question: SeedQuestion): ValidatedQuestion {
  if (type === "first") {
    return {
      ...question,
      answerValue: question.answerText!.trim(),
      answerType: "objective_answer",
      answerMetadata: {},
    };
  }

  return {
    ...question,
    answerValue: question.modelAnswer!.trim(),
    answerType: "model_answer",
    answerMetadata: { gradingPoints: question.gradingPoints ?? [] },
  };
}

function summarize(payload: SeedPayload): SeedStats {
  let subjects = 0;
  let questions = 0;
  for (const exam of payload.exams) {
    subjects += exam.subjects.length;
    for (const subject of exam.subjects) {
      questions += subject.questions.length;
    }
  }
  return { exams: payload.exams.length, subjects, questions, answers: questions };
}

async function loadPayload(inputPath: string) {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const content = await fs.readFile(absolutePath, "utf-8");
  const parsed = JSON.parse(content) as unknown;
  return { absolutePath, payload: validatePayload(parsed) };
}

async function main() {
  const { inputPath, dryRun } = parseArgs(process.argv.slice(2));
  const { absolutePath, payload } = await loadPayload(inputPath);
  const stats = summarize(payload);
  const sourceName = payload.source?.name ?? "unknown";

  console.log(`[seed:exams] file=${absolutePath}`);
  console.log(`[seed:exams] source=${sourceName}`);
  console.log(`[seed:exams] dryRun=${dryRun}`);
  console.log(`[seed:exams] counts exams=${stats.exams}, subjects=${stats.subjects}, questions=${stats.questions}, answers=${stats.answers}`);

  for (const exam of payload.exams) {
    console.log(`[seed:exams] upsert exam year=${exam.year}, round=${exam.round}, type=${exam.type}`);
    for (const subject of exam.subjects) {
      for (const question of subject.questions) {
        const validatedQuestion = toValidatedQuestion(exam.type, question);
        console.log(`[seed:exams] upsert question subject=${subject.name}, no=${validatedQuestion.questionNo}`);
        console.log(`[seed:exams] upsert answer type=${validatedQuestion.answerType}`);
      }
    }
  }

  if (dryRun) {
    console.log("[seed:exams] dry-run complete. No database writes were performed.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase 환경변수가 필요합니다. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 설정하세요.");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  let examsUpserted = 0;
  let questionsUpserted = 0;
  let answersUpserted = 0;

  for (const exam of payload.exams) {
    const examRes = await client.from("exams").upsert({ year: exam.year, round: exam.round, type: exam.type }, { onConflict: "year,round,type" }).select("id").single();

    if (examRes.error) throw examRes.error;
    examsUpserted += 1;

    for (const subject of exam.subjects) {
      for (const question of subject.questions) {
        const validatedQuestion = toValidatedQuestion(exam.type, question);

        const questionRes = await client
          .from("questions")
          .upsert(
            {
              exam_id: examRes.data.id,
              subject: subject.name,
              question_no: validatedQuestion.questionNo,
              question_text: validatedQuestion.questionText,
              choices: validatedQuestion.choices ?? null,
              explanation: validatedQuestion.explanation ?? null,
              question_metadata: {
                tags: validatedQuestion.tags ?? [],
                isVerified: validatedQuestion.isVerified ?? false,
                sourceName,
                sourceNote: payload.source?.note ?? null,
              },
            },
            { onConflict: "exam_id,subject,question_no" },
          )
          .select("id")
          .single();

        if (questionRes.error) throw questionRes.error;
        questionsUpserted += 1;

        const answerRes = await client.from("answers").upsert(
          {
            question_id: questionRes.data.id,
            answer_text: validatedQuestion.answerValue,
            answer_type: validatedQuestion.answerType,
            answer_metadata: validatedQuestion.answerMetadata,
          },
          { onConflict: "question_id,answer_type" },
        );

        if (answerRes.error) throw answerRes.error;
        answersUpserted += 1;
      }
    }
  }

  console.log(`[seed:exams] complete exams=${examsUpserted}, questions=${questionsUpserted}, answers=${answersUpserted}, source=${sourceName}, dryRun=${dryRun}`);
}

main().catch((error) => {
  console.error(`[seed:exams] failed: ${(error as Error).message}`);
  process.exit(1);
});

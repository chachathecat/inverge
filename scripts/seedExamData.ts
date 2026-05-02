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

function validatePayload(input: unknown): SeedPayload {
  ensure(isObject(input), "루트는 객체여야 합니다.");
  ensure(input.version === 1, "version은 1이어야 합니다.");
  ensure(Array.isArray(input.exams), "exams는 배열이어야 합니다.");

  const seen = new Set<string>();

  const exams: SeedExam[] = input.exams.map((exam, examIndex) => {
    ensure(isObject(exam), `exams[${examIndex}]는 객체여야 합니다.`);
    const year = exam.year;
    const round = exam.round;
    const type = exam.type;
    ensure(Number.isInteger(year) && year >= 1900 && year <= 2100, `exams[${examIndex}].year는 1900~2100 정수여야 합니다.`);
    ensure(Number.isInteger(round) && round > 0, `exams[${examIndex}].round는 양의 정수여야 합니다.`);
    ensure(type === "first" || type === "second", `exams[${examIndex}].type은 first 또는 second여야 합니다.`);
    ensure(Array.isArray(exam.subjects), `exams[${examIndex}].subjects는 배열이어야 합니다.`);

    const subjects: SeedSubject[] = exam.subjects.map((subject, subjectIndex) => {
      ensure(isObject(subject), `exams[${examIndex}].subjects[${subjectIndex}]는 객체여야 합니다.`);
      ensure(typeof subject.name === "string" && subject.name.trim().length > 0, `exams[${examIndex}].subjects[${subjectIndex}].name은 비어있지 않아야 합니다.`);
      ensure(Array.isArray(subject.questions), `exams[${examIndex}].subjects[${subjectIndex}].questions는 배열이어야 합니다.`);

      const questions: SeedQuestion[] = subject.questions.map((question, questionIndex) => {
        ensure(isObject(question), `question 객체 형식이 잘못되었습니다. (exams[${examIndex}].subjects[${subjectIndex}].questions[${questionIndex}])`);
        ensure(Number.isInteger(question.questionNo) && (question.questionNo as number) > 0, "questionNo는 양의 정수여야 합니다.");
        ensure(typeof question.questionText === "string" && question.questionText.trim().length > 0, "questionText는 비어있지 않아야 합니다.");

        if (question.choices !== undefined) {
          ensure(Array.isArray(question.choices), "choices가 있으면 배열이어야 합니다.");
        }

        if (type === "first") {
          ensure(typeof question.answerText === "string" && question.answerText.trim().length > 0, "first 문항은 answerText가 필요합니다.");
        }
        if (type === "second") {
          ensure(typeof question.modelAnswer === "string" && question.modelAnswer.trim().length > 0, "second 문항은 modelAnswer가 필요합니다.");
          if (question.gradingPoints !== undefined) {
            ensure(Array.isArray(question.gradingPoints), "gradingPoints가 있으면 배열이어야 합니다.");
          }
        }

        const duplicateKey = `${year}-${round}-${type}-${subject.name.trim()}-${question.questionNo}`;
        ensure(!seen.has(duplicateKey), `중복 문항 키가 있습니다: ${duplicateKey}`);
        seen.add(duplicateKey);

        return question as SeedQuestion;
      });

      return { name: subject.name.trim(), questions };
    });

    return { year, round, type, subjects } as SeedExam;
  });

  const source = isObject(input.source) ? { name: typeof input.source.name === "string" ? input.source.name : undefined, note: typeof input.source.note === "string" ? input.source.note : undefined } : undefined;

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
    const examRes = await client
      .from("exams")
      .upsert({ year: exam.year, round: exam.round, type: exam.type }, { onConflict: "year,round,type" })
      .select("id")
      .single();

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

import type { SecondExamQuestionType, SecondExamSubject } from "./types";

export type GradeSecondPayloadQuestionType = "theory" | "law" | "practice" | "auto";

const SUBJECT_BY_QUESTION_TYPE: Record<Exclude<GradeSecondPayloadQuestionType, "auto">, SecondExamSubject> = {
  theory: "감정평가이론",
  law: "감정평가및보상법규",
  practice: "감정평가실무",
};

const NORMALIZED_SUBJECT_MAP: Record<string, SecondExamSubject> = {
  "감정평가이론": "감정평가이론",
  "감정평가실무": "감정평가실무",
  "감정평가및보상법규": "감정평가및보상법규",
  "감정평가 및 보상법규": "감정평가및보상법규",
};

export function parseQuestionType(input?: string): GradeSecondPayloadQuestionType | null {
  if (!input || input === "auto") return "auto";
  if (input === "theory" || input === "law" || input === "practice") return input;
  return null;
}

export function parseSubject(input?: string): SecondExamSubject | null {
  if (!input?.trim()) return null;
  return NORMALIZED_SUBJECT_MAP[input.trim()] ?? null;
}

export function resolveQuestionType(
  parsedQuestionType: GradeSecondPayloadQuestionType,
  subject: SecondExamSubject | null,
): Exclude<SecondExamQuestionType, "auto"> | null {
  if (parsedQuestionType !== "auto") return parsedQuestionType;
  if (subject === "감정평가실무") return "practice";
  if (subject === "감정평가이론") return "theory";
  if (subject === "감정평가및보상법규") return "law";
  return null;
}

export function resolveSubject(
  parsedSubject: SecondExamSubject | null,
  resolvedQuestionType: Exclude<SecondExamQuestionType, "auto">,
): SecondExamSubject {
  return parsedSubject ?? SUBJECT_BY_QUESTION_TYPE[resolvedQuestionType];
}

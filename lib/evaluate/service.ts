import "server-only";

import { evaluateWithGeminiImage } from "./gemini";
import { evaluateWithOpenAI } from "./openai";
import { evaluationRepository } from "./repository";
import type { EvaluationResult } from "./types";

type EvaluateSubmissionInput = {
  answer: string;
  imageFiles: File[];
  userId?: string;
};

type EvaluateSubmissionOutput = {
  result: EvaluationResult;
  transcription: string;
};

function isEvaluationResult(value: unknown): value is EvaluationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.total_score === "number" &&
    typeof candidate.structure_score === "number" &&
    typeof candidate.content_score === "number" &&
    typeof candidate.expression_score === "number" &&
    Array.isArray(candidate.weaknesses) &&
    candidate.weaknesses.length === 3 &&
    candidate.weaknesses.every((item) => typeof item === "string") &&
    typeof candidate.next_action === "string"
  );
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(result: EvaluationResult): EvaluationResult {
  return {
    ...result,
    total_score: roundScore(result.total_score),
    structure_score: roundScore(result.structure_score),
    content_score: roundScore(result.content_score),
    expression_score: roundScore(result.expression_score),
  };
}

export async function evaluateSubmission({
  answer,
  imageFiles,
  userId = "anonymous",
}: EvaluateSubmissionInput): Promise<EvaluateSubmissionOutput> {
  let raw: unknown;
  let transcription = answer;

  if (imageFiles.length > 0) {
    const gemini = await evaluateWithGeminiImage(imageFiles, answer);
    raw = gemini.result;
    transcription = gemini.transcription;
  } else {
    raw = await evaluateWithOpenAI(answer);
  }

  if (!isEvaluationResult(raw)) {
    throw new Error("평가 엔진 응답 형식이 올바르지 않습니다.");
  }

  const normalized = normalize(raw);

  await evaluationRepository.save({
    user_id: userId,
    answer,
    transcription,
    result: normalized,
    created_at: new Date().toISOString(),
  });

  return {
    result: normalized,
    transcription,
  };
}

export async function evaluateAnswer(answer: string): Promise<EvaluationResult> {
  const { result } = await evaluateSubmission({
    answer,
    imageFiles: [],
  });
  return result;
}

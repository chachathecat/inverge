import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { Schema } from "@google/generative-ai";

import type { AppraisalMode } from "@/lib/review-os/appraisal";
import { buildExtractionPrompt } from "@/lib/review-os/extraction";

import { buildEvaluationPrompts } from "./prompt";
import type { EvaluationResult } from "./types";

type GeminiEvaluationPayload = {
  result: EvaluationResult;
  transcription: string;
};

export const GEMINI_API_KEY_ERROR_MESSAGE = "GEMINI_API_KEY가 설정되지 않았습니다.";
export const GEMINI_QUOTA_ERROR_MESSAGE =
  "Gemini 사용량 한도에 도달했습니다. 잠시 후 다시 시도하거나 텍스트 입력으로 검토를 계속해 주세요.";

function isGeminiQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    message?: string;
    status?: number;
    code?: number;
    response?: { status?: number };
  };
  const normalizedMessage = candidate.message?.toLowerCase() ?? "";
  return (
    candidate.status === 429 ||
    candidate.code === 429 ||
    candidate.response?.status === 429 ||
    normalizedMessage.includes("429") ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("resource exhausted")
  );
}

function handleGeminiError(error: unknown): never {
  if (isGeminiQuotaError(error)) {
    throw new Error(GEMINI_QUOTA_ERROR_MESSAGE);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error("Gemini 호출에 실패했습니다.");
}

function createModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(GEMINI_API_KEY_ERROR_MESSAGE);
  }

  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: modelName });
}

function fileToPart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return file.arrayBuffer().then((buffer) => ({
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType: file.type || "image/jpeg",
    },
  }));
}

export async function extractTranscriptionFromImages(files: File[]): Promise<string> {
  const model = createModel();
  const imageParts = await Promise.all(files.map((file) => fileToPart(file)));

  let response;
  try {
    response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "첨부된 감정평가사 학습 자료 이미지에서 텍스트를 OCR로 최대한 정확히 추출하라.",
                "문제 번호, 선택지, 정답, 내 답, 해설, 답안 문단의 줄바꿈을 유지하라.",
                "표와 계산식은 행 단위로 보존하라.",
                "보이지 않는 내용은 추정하지 말고 [unclear]로 표시하라.",
                "출력은 순수 텍스트만 반환하라.",
              ].join(" "),
            },
            ...imageParts,
          ],
        },
      ],
    });
  } catch (error) {
    handleGeminiError(error);
  }

  const text = response.response.text();

  if (!text?.trim()) {
    throw new Error("이미지 OCR 결과가 비어 있습니다.");
  }

  return text.trim();
}

export async function extractStructuredDraftWithGemini(mode: AppraisalMode, text: string): Promise<Record<string, unknown>> {
  const model = createModel();
  let result;
  try {
    result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: `${buildExtractionPrompt(mode)}\n\nINPUT:\n${text}` }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: mode === "second" ? secondExtractionSchema() : firstExtractionSchema(),
      },
    });
  } catch (error) {
    handleGeminiError(error);
  }

  const responseText = result.response.text();
  return responseText?.trim() ? (JSON.parse(responseText) as Record<string, unknown>) : {};
}

function firstExtractionSchema(): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      subject_guess: { type: SchemaType.STRING },
      problem_title: { type: SchemaType.STRING },
      source_label: { type: SchemaType.STRING },
      question_summary: { type: SchemaType.STRING },
      correct_answer: { type: SchemaType.STRING },
      user_answer: { type: SchemaType.STRING },
      wrong_reason_candidate: { type: SchemaType.STRING },
      key_concepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      core_formula: { type: SchemaType.STRING },
      comparison_point: { type: SchemaType.STRING },
      review_date_suggestion: { type: SchemaType.STRING },
      needs_review: { type: SchemaType.BOOLEAN },
    },
    required: [
      "subject_guess",
      "problem_title",
      "source_label",
      "question_summary",
      "correct_answer",
      "user_answer",
      "wrong_reason_candidate",
      "key_concepts",
      "core_formula",
      "comparison_point",
      "review_date_suggestion",
      "needs_review",
    ],
  };
}

function secondExtractionSchema(): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      subject_guess: { type: SchemaType.STRING },
      case_title: { type: SchemaType.STRING },
      case_summary: { type: SchemaType.STRING },
      reference_outline: { type: SchemaType.STRING },
      user_answer_summary: { type: SchemaType.STRING },
      missing_issue: { type: SchemaType.STRING },
      weak_sentence: { type: SchemaType.STRING },
      weak_structure_point: { type: SchemaType.STRING },
      rewrite_instruction: { type: SchemaType.STRING },
      review_date_suggestion: { type: SchemaType.STRING },
      needs_review: { type: SchemaType.BOOLEAN },
    },
    required: [
      "subject_guess",
      "case_title",
      "case_summary",
      "reference_outline",
      "user_answer_summary",
      "missing_issue",
      "weak_sentence",
      "weak_structure_point",
      "rewrite_instruction",
      "review_date_suggestion",
      "needs_review",
    ],
  };
}

export async function evaluateWithGemini(answer: string): Promise<EvaluationResult> {
  const model = createModel();
  const prompts = buildEvaluationPrompts(answer);

  let result;
  try {
    result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `${prompts.system}\n\n${prompts.user}` }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            total_score: { type: SchemaType.NUMBER },
            structure_score: { type: SchemaType.NUMBER },
            content_score: { type: SchemaType.NUMBER },
            expression_score: { type: SchemaType.NUMBER },
            weaknesses: {
              type: SchemaType.ARRAY,
              minItems: 3,
              maxItems: 3,
              items: { type: SchemaType.STRING },
            },
            next_action: { type: SchemaType.STRING },
          },
          required: [
            "total_score",
            "structure_score",
            "content_score",
            "expression_score",
            "weaknesses",
            "next_action",
          ],
        },
      },
    });
  } catch (error) {
    handleGeminiError(error);
  }

  const text = result.response.text();

  if (!text) {
    throw new Error("Gemini 응답이 비어 있습니다.");
  }

  return JSON.parse(text) as EvaluationResult;
}

export async function evaluateWithGeminiImage(
  files: File[],
  textAnswer?: string,
): Promise<GeminiEvaluationPayload> {
  if (files.length === 0) {
    throw new Error("이미지가 필요합니다.");
  }

  const transcription = await extractTranscriptionFromImages(files);
  const mergedAnswer = [textAnswer?.trim(), transcription].filter(Boolean).join("\n\n");
  const result = await evaluateWithGemini(mergedAnswer);

  return {
    result,
    transcription,
  };
}

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

import type { AppraisalMode } from "@/lib/review-os/appraisal";
import { buildExtractionPrompt } from "@/lib/review-os/extraction";

import { buildEvaluationPrompts } from "./prompt";
import { buildSecondGradingPrompt } from "./second-grading/prompt";
import { REQUIRED_OUTPUT_KEYS } from "./second-grading/schema";
import type { SecondExamQuestionType, SecondExamSubject } from "./second-grading/types";
import type { EvaluationResult } from "./types";
import {
  normalizeAnswerReviewStructureDraft,
  type AnswerReviewStructureDraft,
} from "./answer-review-structure";

type GeminiEvaluationPayload = {
  result: EvaluationResult;
  transcription: string;
};

export class GeminiEnvError extends Error {
  readonly code = "GEMINI_NOT_CONFIGURED";
}

export class GeminiStructureParseError extends Error {
  readonly code = "GEMINI_STRUCTURE_PARSE_FAILED";

  constructor(
    message: string,
    readonly reason: "empty_response" | "parse_failure" | "schema_mismatch",
  ) {
    super(message);
  }
}

export class GeminiSecondGradingParseError extends Error {
  readonly code = "GEMINI_SECOND_GRADING_PARSE_FAILED";
}


export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function createModel() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new GeminiEnvError("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  const modelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const client = new GoogleGenerativeAI(apiKey);
  return client.getGenerativeModel({ model: modelName });
}

function includesQuotaMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("429") ||
    normalized.includes("too many requests") ||
    normalized.includes("quota") ||
    normalized.includes("resource_exhausted")
  );
}

export function isGeminiQuotaExceededError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    errorDetails?: unknown;
  };

  if (maybeError.status === 429 || maybeError.code === 429) {
    return true;
  }

  if (typeof maybeError.message === "string" && includesQuotaMessage(maybeError.message)) {
    return true;
  }

  if (Array.isArray(maybeError.errorDetails)) {
    return maybeError.errorDetails.some((detail) => typeof detail === "string" && includesQuotaMessage(detail));
  }

  return false;
}

function fileToPart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return file.arrayBuffer().then((buffer) => ({
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType: file.type || "image/jpeg",
    },
  }));
}

type AnswerReviewStructureInput = {
  questionFiles: File[];
  answerFiles: File[];
  referenceFiles: File[];
  questionText: string;
  answerText: string;
  referenceText: string;
};

type SecondGradingInput = {
  subject: SecondExamSubject;
  questionType: SecondExamQuestionType;
  questionText: string;
  userAnswerText?: string;
  referenceText?: string;
};

export async function gradeSecondRoundWithGemini(input: SecondGradingInput): Promise<Record<string, unknown>> {
  const model = createModel();
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: buildSecondGradingPrompt(input) }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  });

  const text = result.response.text();
  if (!text?.trim()) {
    throw new GeminiSecondGradingParseError("2차 채점 결과가 비어 있습니다.");
  }

  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new GeminiSecondGradingParseError("2차 채점 결과 JSON 형식이 올바르지 않습니다.");
    }

    const source = parsed as Record<string, unknown>;
    const hasRequired = REQUIRED_OUTPUT_KEYS.some((key) => key in source);
    if (!hasRequired) {
      throw new GeminiSecondGradingParseError("2차 채점 결과 필수 키가 누락되었습니다.");
    }
    return source;
  } catch (error) {
    if (error instanceof GeminiSecondGradingParseError) throw error;
    throw new GeminiSecondGradingParseError("2차 채점 결과를 파싱하지 못했습니다.");
  }
}

export async function structureAnswerReviewWithGemini({
  questionFiles,
  answerFiles,
  referenceFiles,
  questionText,
  answerText,
  referenceText,
}: AnswerReviewStructureInput): Promise<AnswerReviewStructureDraft> {
  const model = createModel();
  const questionParts = await Promise.all(questionFiles.map((file) => fileToPart(file)));
  const answerParts = await Promise.all(answerFiles.map((file) => fileToPart(file)));
  const referenceParts = await Promise.all(referenceFiles.map((file) => fileToPart(file)));

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "너는 감정평가사 답안 검토실의 구조화 보조다.",
              "절대 수치화 평가나 합격 여부 추정을 하지 마라.",
              "출력은 반드시 JSON 하나만 반환하라.",
              "OCR 결과와 구조화 결과는 초안이며 검토자 확인이 필요하다는 점을 caution에 반영하라.",
              "입력이 부족하면 추정하지 말고 부족한 맥락을 명확히 적어라.",
              "",
              `questionText:\n${questionText.trim() || "[없음]"}`,
              "",
              `answerText:\n${answerText.trim() || "[없음]"}`,
              "",
              `referenceText:\n${referenceText.trim() || "[없음]"}`,
              "",
              "이후에 questionFiles, answerFiles, referenceFiles 순서의 첨부가 이어진다.",
            ].join("\n"),
          },
          { text: "questionFiles 시작" },
          ...questionParts,
          { text: "answerFiles 시작" },
          ...answerParts,
          { text: "referenceFiles 시작" },
          ...referenceParts,
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseSchema: answerReviewStructureSchema(),
    },
  });

  const text = result.response.text();

  if (!text?.trim()) {
    throw new GeminiStructureParseError(
      "구조화 결과를 안전하게 읽지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.",
      "empty_response",
    );
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new GeminiStructureParseError(
        "구조화 결과를 안전하게 읽지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.",
        "schema_mismatch",
      );
    }

    const source = parsed as Record<string, unknown>;
    const hasExpectedField = [
      "questionSummary",
      "coreConcepts",
      "requiredIssues",
      "userAnswerSummary",
      "userAnswerStructure",
      "referenceStructure",
      "strengths",
      "missingIssueCandidates",
      "weakParagraphPoint",
      "weakLogicPoint",
      "rewriteTarget",
      "rewriteDraftSuggestion",
      "nextAction",
      "caution",
    ].some((field) => field in source);

    if (!hasExpectedField) {
      throw new GeminiStructureParseError(
        "구조화 결과를 안전하게 읽지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.",
        "schema_mismatch",
      );
    }

    return normalizeAnswerReviewStructureDraft(parsed);
  } catch (error) {
    if (error instanceof GeminiStructureParseError) throw error;
    throw new GeminiStructureParseError(
      "구조화 결과를 안전하게 읽지 못했습니다. 텍스트 입력으로 검토를 계속해 주세요.",
      "parse_failure",
    );
  }
}

export async function extractTranscriptionFromImages(files: File[]): Promise<string> {
  const model = createModel();
  const imageParts = await Promise.all(files.map((file) => fileToPart(file)));

  const response = await model.generateContent({
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

  const text = response.response.text();

  if (!text?.trim()) {
    throw new Error("이미지 OCR 결과가 비어 있습니다.");
  }

  return text.trim();
}

export async function extractStructuredDraftWithGemini(mode: AppraisalMode, text: string): Promise<Record<string, unknown>> {
  const model = createModel();
  const result = await model.generateContent({
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

function answerReviewStructureSchema(): Schema {
  return {
    type: SchemaType.OBJECT,
    properties: {
      questionSummary: { type: SchemaType.STRING },
      coreConcepts: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      requiredIssues: { type: SchemaType.STRING },
      userAnswerSummary: { type: SchemaType.STRING },
      userAnswerStructure: { type: SchemaType.STRING },
      referenceStructure: { type: SchemaType.STRING },
      strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      missingIssueCandidates: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      weakParagraphPoint: { type: SchemaType.STRING },
      weakLogicPoint: { type: SchemaType.STRING },
      rewriteTarget: { type: SchemaType.STRING },
      rewriteDraftSuggestion: { type: SchemaType.STRING },
      nextAction: { type: SchemaType.STRING },
      caution: { type: SchemaType.STRING },
    },
    required: [
      "questionSummary",
      "coreConcepts",
      "requiredIssues",
      "userAnswerSummary",
      "userAnswerStructure",
      "referenceStructure",
      "strengths",
      "missingIssueCandidates",
      "weakParagraphPoint",
      "weakLogicPoint",
      "rewriteTarget",
      "rewriteDraftSuggestion",
      "nextAction",
      "caution",
    ],
  };
}

export async function evaluateWithGemini(answer: string): Promise<EvaluationResult> {
  const model = createModel();
  const prompts = buildEvaluationPrompts(answer);

  const result = await model.generateContent({
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
import type { Schema } from "@google/generative-ai";

"use client";

import { useState } from "react";

import type { EvaluationApiResponse, EvaluationResult } from "@/types/evaluation";

type EvaluatePayload = {
  answer: string;
  images?: File[];
};

type UseEvaluationReturn = {
  result: EvaluationResult | null;
  transcription: string;
  isLoading: boolean;
  error: string | null;
  evaluate: (payload: EvaluatePayload) => Promise<void>;
};

export function useEvaluation(): UseEvaluationReturn {
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [transcription, setTranscription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function evaluate(payload: EvaluatePayload) {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("answer", payload.answer);
      payload.images?.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/evaluate", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as EvaluationApiResponse | { error: string };

      if (!response.ok) {
        throw new Error("error" in data ? data.error : "분석 요청에 실패했습니다.");
      }

      const evaluated = data as EvaluationApiResponse;
      setResult(evaluated.result);
      setTranscription(evaluated.transcription);
    } catch (errorObject) {
      setError(
        errorObject instanceof Error
          ? errorObject.message
          : "오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return { result, transcription, isLoading, error, evaluate };
}

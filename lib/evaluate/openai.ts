import OpenAI from "openai";

import { buildEvaluationPrompts } from "./prompt";
import type { EvaluationResult } from "./types";

export async function evaluateWithOpenAI(answer: string): Promise<EvaluationResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }

  const prompts = buildEvaluationPrompts(answer);
  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: prompts.system }],
      },
      {
        role: "user",
        content: [{ type: "input_text", text: prompts.user }],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "inverge_analysis_result",
        schema: prompts.schema,
        strict: true,
      },
    },
  });

  if (!response.output_text) {
    throw new Error("OpenAI 응답이 비어 있습니다.");
  }

  return JSON.parse(response.output_text) as EvaluationResult;
}

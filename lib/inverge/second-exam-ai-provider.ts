import "server-only";

import {
  mockSecondExamAiAdapter,
  type SecondExamAiAdapter,
  type SecondExamAiInput,
  type SecondExamAiOutput,
  type SecondExamAiTask,
} from "@/lib/inverge/second-exam-ai";
import { parseSecondExamAiOutput, validateSecondExamAiOutput } from "@/lib/inverge/second-exam-ai-validator";

type ProviderName = "mock" | "openai" | "disabled";

export type SecondExamAiAssistResult = {
  output: SecondExamAiOutput;
  meta: {
    provider: ProviderName;
    fallbackUsed: boolean;
    errorReason?: string;
    elapsedMs: number;
  };
};

function errorOutput(reason: string): SecondExamAiOutput {
  return {
    status: "error",
    publicText: {},
    internal: {
      usedEvidenceIds: [],
      confidenceAdjustment: 0,
      safetyFlags: [reason],
    },
  };
}

function getProviderName(): ProviderName {
  const configured = process.env.INVERGE_SECOND_EXAM_AI_PROVIDER?.toLowerCase();

  if (configured === "disabled") return "disabled";
  if (configured === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

function getTimeoutMs() {
  const parsed = Number(process.env.INVERGE_SECOND_EXAM_AI_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed >= 500) return parsed;
  return 3500;
}

function buildSystemPrompt(task: SecondExamAiTask) {
  const taskLine =
    task === "compare-copy"
      ? "Rewrite only the compare screen copy fields."
      : task === "rewrite-seed-copy"
        ? "Rewrite only the rewrite seed fields."
        : "Rewrite only the records summary note fields.";

  return [
    "You improve Korean product copy for Inverge, a study operations system.",
    taskLine,
    "Use only the provided rule result and evidence.",
    "Do not predict scores, ranking, pass probability, or write a full answer.",
    "Keep output short, calm, and action-oriented.",
    "Return only valid JSON matching the requested shape.",
  ].join(" ");
}

function buildUserPrompt(input: SecondExamAiInput) {
  return JSON.stringify({
    task: input.task,
    productContext: input.productContext,
    ruleResult: input.ruleResult,
    evidence: input.evidence,
    existingSeed: input.existingSeed,
    outputLimits: input.outputLimits,
    requiredOutput: {
      status: "ok | insufficient-evidence",
      publicText:
        input.task === "compare-copy"
          ? {
              gapTitle: "string, optional",
              gapSummary: "string, optional",
              rewriteInstruction: "string, optional",
            }
          : input.task === "rewrite-seed-copy"
            ? {
                guidance: "string[], optional, max 3",
                placeholder: "string, optional",
                starter: "string, optional",
              }
            : {
                recordsNote: "string, optional",
                nextActionLabel: "string, optional",
              },
      internal: {
        usedEvidenceIds: "string[]",
        confidenceAdjustment: "-0.1 | 0 | 0.1",
        safetyFlags: "string[]",
      },
    },
  });
}

const openAiSecondExamAdapter: SecondExamAiAdapter = {
  async refineCompareCopy(input) {
    return requestOpenAi(input);
  },

  async refineRewriteSeed(input) {
    return requestOpenAi(input);
  },

  async refineRecordsSummary(input) {
    return requestOpenAi(input);
  },
};

async function requestOpenAi(input: SecondExamAiInput): Promise<SecondExamAiOutput> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return errorOutput("missing-openai-key");

  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(input.task) },
          { role: "user", content: buildUserPrompt(input) },
        ],
      }),
    });

    if (!response.ok) return errorOutput(`openai-http-${response.status}`);

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return errorOutput("openai-empty-content");

    try {
      return parseSecondExamAiOutput(JSON.parse(content));
    } catch {
      return errorOutput("invalid-json");
    }
  } catch (error) {
    const reason = error instanceof Error && error.name === "AbortError" ? "provider-timeout" : "provider-error";
    return errorOutput(reason);
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

function getAdapter(provider: ProviderName): SecondExamAiAdapter | null {
  if (provider === "disabled") return null;
  if (provider === "openai") return openAiSecondExamAdapter;
  return mockSecondExamAiAdapter;
}

export async function runSecondExamAiAssist(input: SecondExamAiInput): Promise<SecondExamAiAssistResult> {
  const startedAt = Date.now();
  const provider = getProviderName();
  const adapter = getAdapter(provider);

  if (!adapter) {
    return {
      output: errorOutput("provider-disabled"),
      meta: {
        provider,
        fallbackUsed: true,
        errorReason: "provider-disabled",
        elapsedMs: Date.now() - startedAt,
      },
    };
  }

  try {
    const output =
      input.task === "compare-copy"
        ? await adapter.refineCompareCopy(input)
        : input.task === "rewrite-seed-copy"
          ? await adapter.refineRewriteSeed(input)
          : await adapter.refineRecordsSummary(input);
    const validation = validateSecondExamAiOutput(input, output);

    return {
      output: validation.output,
      meta: {
        provider,
        fallbackUsed: !validation.ok,
        errorReason: validation.ok ? undefined : validation.failureCodes[0],
        elapsedMs: Date.now() - startedAt,
      },
    };
  } catch (error) {
    return {
      output: errorOutput("adapter-threw"),
      meta: {
        provider,
        fallbackUsed: true,
        errorReason: error instanceof Error ? error.message : "adapter-threw",
        elapsedMs: Date.now() - startedAt,
      },
    };
  }
}

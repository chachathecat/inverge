import { NextResponse } from "next/server";

import { recordAdminAiReviewItem } from "@/lib/inverge/admin-ai-review-repository";
import { runSecondExamAiAssist } from "@/lib/inverge/second-exam-ai-provider";
import type { SecondExamAiInput } from "@/lib/inverge/second-exam-ai";
import type { SecondExamAiValidationFailureCode } from "@/lib/inverge/second-exam-ai-validator";

const VALIDATION_FAILURE_CODES: SecondExamAiValidationFailureCode[] = [
  "invalid-json",
  "invalid-status",
  "missing-public-text",
  "missing-required-field",
  "unexpected-field",
  "too-long",
  "too-many-items",
  "forbidden-expression",
  "score-or-pass-claim",
  "threatening-tone",
  "not-actionable",
  "evidence-drift",
  "unsafe-internal",
];

function toValidationFailureCodes(errorReason?: string) {
  if (!errorReason) return [];
  return VALIDATION_FAILURE_CODES.includes(errorReason as SecondExamAiValidationFailureCode)
    ? [errorReason as SecondExamAiValidationFailureCode]
    : [];
}

function isSecondExamAiInput(value: unknown): value is SecondExamAiInput {
  if (!value || typeof value !== "object") return false;

  const input = value as Partial<SecondExamAiInput>;
  return (
    (input.task === "compare-copy" || input.task === "rewrite-seed-copy" || input.task === "records-summary-copy") &&
    !!input.productContext &&
    !!input.ruleResult &&
    !!input.evidence &&
    !!input.existingSeed &&
    !!input.outputLimits
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isSecondExamAiInput(body)) {
      return NextResponse.json(
        {
          output: {
            status: "error",
            publicText: {},
            internal: {
              usedEvidenceIds: [],
              confidenceAdjustment: 0,
              safetyFlags: ["invalid-ai-input"],
            },
          },
          meta: {
            provider: "disabled",
            fallbackUsed: true,
            errorReason: "invalid-ai-input",
            elapsedMs: 0,
          },
        },
        { status: 400 },
      );
    }

    const result = await runSecondExamAiAssist(body);
    await recordAdminAiReviewItem({
      input: body,
      output: result.output,
      meta: {
        provider: result.meta.provider,
        fallbackUsed: result.meta.fallbackUsed,
        errorReason: result.meta.errorReason,
      },
      validationFailureCodes: toValidationFailureCodes(result.meta.errorReason),
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        output: {
          status: "error",
          publicText: {},
          internal: {
            usedEvidenceIds: [],
            confidenceAdjustment: 0,
            safetyFlags: ["ai-route-error"],
          },
        },
        meta: {
          provider: "disabled",
          fallbackUsed: true,
          errorReason: "ai-route-error",
          elapsedMs: 0,
        },
      },
      { status: 500 },
    );
  }
}

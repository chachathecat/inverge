import { NextResponse } from "next/server";

import { appendFeedbackResponse, listFeedbackResponses } from "@/lib/inverge/feedback-repository";
import type { FeedbackResponse } from "@/lib/inverge/feedback";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFeedbackResponse(value: unknown): value is FeedbackResponse {
  if (!isRecord(value)) return false;

  return (
    typeof value.feedbackId === "string" &&
    typeof value.trigger === "string" &&
    (value.rating === 1 || value.rating === 2 || value.rating === 3) &&
    isRecord(value.context) &&
    typeof value.operatorReview === "boolean" &&
    typeof value.submittedAt === "string" &&
    value.source === "product" &&
    value.schemaVersion === 1
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isFeedbackResponse(body)) {
      return NextResponse.json({ ok: false, error: "invalid-feedback" }, { status: 400 });
    }

    appendFeedbackResponse(body);
    return NextResponse.json({ ok: true, feedbackId: body.feedbackId });
  } catch {
    return NextResponse.json({ ok: false, error: "feedback-persistence-error" }, { status: 500 });
  }
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);

  return NextResponse.json({
    ok: true,
    responses: listFeedbackResponses(Number.isFinite(limit) ? limit : 100),
  });
}

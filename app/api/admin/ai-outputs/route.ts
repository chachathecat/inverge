import { NextResponse } from "next/server";

import { listAdminAiReviewItems, saveAdminAiReviewNote } from "@/lib/inverge/admin-ai-review-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const screen = searchParams.get("screen") ?? undefined;

  const response = await listAdminAiReviewItems({ screen });
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id: string;
      reviewerNote: string;
      needsReview?: boolean;
      flagged?: boolean;
    };

    const result = await saveAdminAiReviewNote(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "ai-review-note-save-failed" },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";

import { isAuthRequiredError, requireRequestUserId } from "@/lib/auth/session";
import { secondExamRepository } from "@/lib/inverge/second-exam-repository";
import type { SecondExamRewriteRecord } from "@/lib/inverge/second-exam-types";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await requireRequestUserId(request);
    const rewriteId = url.searchParams.get("rewriteId");
    const examId = url.searchParams.get("examId");
    const sessionId = url.searchParams.get("sessionId");
    const subjectId = url.searchParams.get("subjectId");

    if (!examId || !sessionId || !subjectId) {
      return NextResponse.json({ ok: false, error: "missing-context" }, { status: 400 });
    }

    const item =
      rewriteId && rewriteId !== "latest"
        ? await secondExamRepository.getRewrite(userId, rewriteId)
        : await secondExamRepository.getLatestRewrite(userId, { examId, sessionId, subjectId });

    if (!item) {
      return NextResponse.json({ ok: false, error: "rewrite-not-found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "rewrite-fetch-error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
    }

    const input = body as Partial<SecondExamRewriteRecord>;
    if (
      typeof input.rewriteId !== "string" ||
      typeof input.sourceSubmissionId !== "string" ||
      typeof input.examId !== "string" ||
      typeof input.sessionId !== "string" ||
      typeof input.subjectId !== "string" ||
      typeof input.focusLabel !== "string" ||
      typeof input.gapTitle !== "string" ||
      typeof input.rewrittenAnswerText !== "string" ||
      typeof input.rewrittenAnswerLength !== "number" ||
      typeof input.submittedAt !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "missing-required-fields" }, { status: 400 });
    }

    const userId = await requireRequestUserId(request);
    const saved = await secondExamRepository.saveRewrite(userId, {
      rewriteId: input.rewriteId,
      sourceSubmissionId: input.sourceSubmissionId,
      examId: input.examId,
      sessionId: input.sessionId,
      subjectId: input.subjectId,
      focusLabel: input.focusLabel,
      gapTitle: input.gapTitle,
      rewrittenAnswerText: input.rewrittenAnswerText,
      rewrittenAnswerLength: input.rewrittenAnswerLength,
      submittedAt: input.submittedAt,
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "rewrite-save-error" }, { status: 500 });
  }
}

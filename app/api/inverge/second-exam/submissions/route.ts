import { NextResponse } from "next/server";

import { isAuthRequiredError, requireRequestUserId } from "@/lib/auth/session";
import { secondExamRepository } from "@/lib/inverge/second-exam-repository";
import type { SecondExamSubmissionRecord } from "@/lib/inverge/second-exam-types";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await requireRequestUserId(request);
    const submissionId = url.searchParams.get("submissionId");
    const examId = url.searchParams.get("examId");
    const sessionId = url.searchParams.get("sessionId");
    const subjectId = url.searchParams.get("subjectId");

    if (!examId || !sessionId || !subjectId) {
      return NextResponse.json({ ok: false, error: "missing-context" }, { status: 400 });
    }

    const item =
      submissionId && submissionId !== "latest"
        ? await secondExamRepository.getSubmission(userId, submissionId)
        : await secondExamRepository.getLatestSubmission(userId, { examId, sessionId, subjectId });

    if (!item) {
      return NextResponse.json({ ok: false, error: "submission-not-found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: item });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "submission-fetch-error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
    }

    const input = body as Partial<SecondExamSubmissionRecord>;
    if (
      typeof input.submissionId !== "string" ||
      typeof input.examId !== "string" ||
      typeof input.sessionId !== "string" ||
      typeof input.subjectId !== "string" ||
      typeof input.answerText !== "string" ||
      typeof input.answerLength !== "number" ||
      typeof input.elapsedSeconds !== "number" ||
      typeof input.submittedAt !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "missing-required-fields" }, { status: 400 });
    }

    const userId = await requireRequestUserId(request);
    const saved = await secondExamRepository.saveSubmission(userId, {
      submissionId: input.submissionId,
      examId: input.examId,
      sessionId: input.sessionId,
      subjectId: input.subjectId,
      promptId: typeof input.promptId === "string" ? input.promptId : undefined,
      promptTitle: typeof input.promptTitle === "string" ? input.promptTitle : undefined,
      answerText: input.answerText,
      answerLength: input.answerLength,
      elapsedSeconds: input.elapsedSeconds,
      submittedAt: input.submittedAt,
    });

    return NextResponse.json({ ok: true, data: saved });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "submission-save-error" }, { status: 500 });
  }
}

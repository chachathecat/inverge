import { NextResponse } from "next/server";

import { isAuthRequiredError, requireRequestUserId } from "@/lib/auth/session";
import { secondExamRepository } from "@/lib/inverge/second-exam-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await requireRequestUserId(request);
    const examId = url.searchParams.get("examId");
    const sessionId = url.searchParams.get("sessionId");
    const subjectId = url.searchParams.get("subjectId");

    if (!examId || !sessionId || !subjectId) {
      return NextResponse.json({ ok: false, error: "missing-context" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: await secondExamRepository.listHistory(userId, { examId, sessionId, subjectId }),
    });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "history-fetch-error" }, { status: 500 });
  }
}

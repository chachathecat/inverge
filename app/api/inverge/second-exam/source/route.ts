import { NextResponse } from "next/server";

import { isAuthRequiredError, requireRequestUserId } from "@/lib/auth/session";
import { secondExamRepository } from "@/lib/inverge/second-exam-repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = await requireRequestUserId(request);
    const entryId = url.searchParams.get("entryId") ?? "latest";
    const examId = url.searchParams.get("examId");
    const sessionId = url.searchParams.get("sessionId");
    const subjectId = url.searchParams.get("subjectId");

    if (!examId || !sessionId || !subjectId) {
      return NextResponse.json({ ok: false, error: "missing-context" }, { status: 400 });
    }

    const entry = await secondExamRepository.getSourceEntry(userId, entryId, { examId, sessionId, subjectId });
    if (!entry) {
      return NextResponse.json({ ok: false, error: "source-not-found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, data: entry });
  } catch (error) {
    if (isAuthRequiredError(error)) {
      return NextResponse.json({ ok: false, error: "auth-required" }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: "source-fetch-error" }, { status: 500 });
  }
}

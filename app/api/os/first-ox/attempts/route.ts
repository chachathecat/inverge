import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { buildFirstOxLearningSignalInput, buildFirstOxWrongAnswerItemInput, type FirstExamStatement, type OxAttempt } from "@/lib/review-os/first-ox-engine";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

type Body = {
  statement?: FirstExamStatement;
  attempt?: OxAttempt;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const body = (await request.json()) as Body;
    if (!body.statement || !body.attempt || body.statement.id !== body.attempt.statementId) {
      return NextResponse.json({ ok: false, message: "invalid-first-ox-attempt" }, { status: 400 });
    }

    const signal = buildFirstOxLearningSignalInput(body.statement, body.attempt);
    if (!signal) {
      return NextResponse.json({ ok: true, saved: false, reason: "correct-certain-no-queue" });
    }

    await reviewOsService.createLearningSignalEvent(userId, session.email, signal);
    const itemInput = buildFirstOxWrongAnswerItemInput(body.statement, body.attempt);
    if (itemInput) {
      await reviewOsService.createWrongAnswerItem(userId, session.email, itemInput);
    }

    return NextResponse.json({ ok: true, saved: true, nextTaskType: signal.nextTaskType });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

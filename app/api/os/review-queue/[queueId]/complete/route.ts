import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";
import type { ReviewCompletionAction } from "@/lib/review-os/types";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS: ReviewCompletionAction[] = [
  "first_short_retry",
  "first_confirm_recall",
  "first_keep_scheduled_review",
  "second_paragraph_rewrite",
  "second_keep_scheduled_rewrite",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ queueId: string }> },
) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const { queueId } = await params;
    const payload = (await request.json().catch(() => null)) as { action?: ReviewCompletionAction } | null;
    const action = payload?.action;
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json({ message: "다음 행동을 선택해 주세요." }, { status: 400 });
    }
    await reviewOsService.completeReview(userId, session.email, queueId, action);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

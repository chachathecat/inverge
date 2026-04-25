import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ queueId: string }> },
) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const { queueId } = await params;
    await reviewOsService.completeReview(userId, session.email, queueId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

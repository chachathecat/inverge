import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const { itemId } = await params;
    const detail = await reviewOsService.getWrongAnswerDetail(userId, session.email, itemId);
    return NextResponse.json({ ok: true, detail });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

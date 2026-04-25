import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const usage = await reviewOsService.getUsageSummary(userId, session.email);
    return NextResponse.json({ ok: true, usage });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

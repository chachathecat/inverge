import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { resolveAppraisalMode } from "@/lib/review-os/appraisal";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const modeParam = new URL(request.url).searchParams.get("mode");
    const mode = resolveAppraisalMode(null, modeParam);
    const plan = await reviewOsService.getWeeklyPlan(userId, session.email, mode);
    const summary = await reviewOsService.getWeeklySummary(userId, session.email);
    return NextResponse.json({ ok: true, summary, plan });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

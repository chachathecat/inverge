import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const result = await reviewOsService.migrateFirstToSecondMode(userId, session.email);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

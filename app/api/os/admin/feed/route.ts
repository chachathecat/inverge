import { NextResponse } from "next/server";

import { isAllowedAdminEmail } from "@/lib/auth/admin";
import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSessionUser();
    if (!session.isAuthenticated || !isAllowedAdminEmail(session.email)) {
      return NextResponse.json({ ok: false, error: "admin-required" }, { status: 403 });
    }
    const feed = await reviewOsService.getAdminFeed();
    return NextResponse.json({ ok: true, feed });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

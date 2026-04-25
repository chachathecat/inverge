import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

function isAdminEmail(email: string | null) {
  const allow = (process.env.ALPHA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) {
    return process.env.NODE_ENV !== "production";
  }
  return email ? allow.includes(email.toLowerCase()) : false;
}

export async function GET() {
  try {
    const session = await getServerSessionUser();
    if (!session.isAuthenticated || !isAdminEmail(session.email)) {
      return NextResponse.json({ ok: false, error: "admin-required" }, { status: 403 });
    }
    const feed = await reviewOsService.getAdminFeed();
    return NextResponse.json({ ok: true, feed });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

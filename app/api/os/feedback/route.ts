import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const body = (await request.json()) as {
      route: string;
      pageContext?: Record<string, unknown>;
      message: string;
    };
    await reviewOsService.submitFeedback(userId, session.email, {
      route: body.route,
      pageContext: body.pageContext ?? {},
      message: body.message,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

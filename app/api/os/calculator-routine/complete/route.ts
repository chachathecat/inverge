import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const body = await request.json();
    const result = await reviewOsService.completeCalculatorRoutine(userId, session.email, body);
    return NextResponse.json(result);
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

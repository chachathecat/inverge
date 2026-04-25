import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";
import type { WrongAnswerItemInput } from "@/lib/review-os/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const items = await reviewOsService.listWrongAnswerItems(userId, session.email, Number.isFinite(limit) ? limit : 20);
    return NextResponse.json({ ok: true, items });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const body = (await request.json()) as WrongAnswerItemInput;
    const result = await reviewOsService.createWrongAnswerItem(userId, session.email, body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

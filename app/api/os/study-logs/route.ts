import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";
import type { StudyLogInput } from "@/lib/review-os/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const url = new URL(request.url);
    const modeParam = url.searchParams.get("mode");
    const mode = modeParam === "second" ? "second" : modeParam === "first" ? "first" : undefined;
    const limit = Number(url.searchParams.get("limit") ?? 10);
    const logs = await reviewOsService.listStudyLogs(userId, session.email, mode, Number.isFinite(limit) ? limit : 10);
    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const body = (await request.json()) as StudyLogInput;
    const log = await reviewOsService.createStudyLog(userId, session.email, body);
    return NextResponse.json({ ok: true, log });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

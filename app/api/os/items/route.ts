import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import {
  APP1_PERSISTENCE_COMMAND_VERSION,
  isApp1ServerAuthorityError,
} from "@/lib/owner-study/app1-server-authority";
import { materializeApp1C3rReviewOsHandoffV1 } from "@/lib/review-os/app1-c3r-review-os-repository";
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
    const body = (await request.json()) as unknown;
    const app1Command =
      body !== null &&
      typeof body === "object" &&
      !Array.isArray(body) &&
      (Object.hasOwn(body, "verificationReceipt") ||
        Object.hasOwn(body, "analysisBinding") ||
        (body as Record<string, unknown>).commandVersion ===
          APP1_PERSISTENCE_COMMAND_VERSION);
    const result = app1Command
      ? await reviewOsService.createApp1VerifiedRepairItem(
          userId,
          session.email,
          body,
        )
      : await reviewOsService.createWrongAnswerItem(
          userId,
          session.email,
          body as WrongAnswerItemInput,
        );
    const app1C3rHandoff = app1Command
      ? await materializeApp1C3rReviewOsHandoffV1(userId, result.item)
      : null;
    return NextResponse.json({
      ok: true,
      ...result,
      ...(app1C3rHandoff ? { app1C3rHandoff } : {}),
    });
  } catch (error) {
    if (isApp1ServerAuthorityError(error)) {
      const status =
        error.code === "APP1_AUTHORITY_REQUIRED"
          ? 403
          : error.code === "APP1_SIGNING_SECRET_UNAVAILABLE"
            ? 503
            : error.code === "APP1_VERIFICATION_EXPIRED"
              ? 410
              : 400;
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.code,
          error: "복구 저장 권한을 확인할 수 없습니다.",
        },
        { status },
      );
    }
    return reviewOsErrorResponse(error);
  }
}

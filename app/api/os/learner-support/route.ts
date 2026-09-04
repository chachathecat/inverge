import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import {
  LearnerSupportEventError,
  buildLearnerSupportUsageEventV1,
} from "@/lib/core-blitz/learner-support-event";
import { hasCoreBlitzLearnerSupportOwnerAccess } from "@/lib/core-blitz/learner-support-access";
import { recordLearnerSupportUsageEventV1 } from "@/lib/core-blitz/learner-support-repository";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    if (!hasCoreBlitzLearnerSupportOwnerAccess(session)) {
      return NextResponse.json(
        { ok: false, error: "learner-support-unavailable" },
        { status: 404 },
      );
    }
    const userId = await requireRequestUserId(request);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "invalid-json" },
        { status: 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { ok: false, error: "invalid-input" },
        { status: 400 },
      );
    }
    const input = body as Record<string, unknown>;
    const requestKeys = Object.keys(input).sort();
    const expectedRequestKeys = ["choice", "eventId", "itemId", "surface"];
    if (
      requestKeys.length !== expectedRequestKeys.length ||
      requestKeys.some((key, index) => key !== expectedRequestKeys[index])
    ) {
      return NextResponse.json(
        { ok: false, error: "invalid-input" },
        { status: 400 },
      );
    }
    const itemId = typeof input.itemId === "string" ? input.itemId : "";
    const detail = itemId
      ? await reviewOsService.getWrongAnswerDetail(
          userId,
          session.email,
          itemId,
        )
      : null;
    if (
      !detail ||
      detail.item.id !== itemId ||
      detail.item.userId !== userId ||
      detail.item.examName !== "감정평가사 2차"
    ) {
      return NextResponse.json(
        { ok: false, error: "item-not-found" },
        { status: 404 },
      );
    }

    const event = buildLearnerSupportUsageEventV1({
      eventId: input.eventId,
      itemId,
      choice: input.choice,
      surface: input.surface,
      occurredAt: new Date().toISOString(),
    });
    const recorded = await recordLearnerSupportUsageEventV1(userId, event);
    return NextResponse.json({
      ok: true,
      status: recorded.status,
      decision: event.metadataJson,
    });
  } catch (error) {
    if (error instanceof LearnerSupportEventError) {
      return NextResponse.json(
        {
          ok: false,
          error: "invalid-learner-support-event",
          errorCode: error.code,
        },
        { status: 400 },
      );
    }
    return reviewOsErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

type FeedbackRating = "helpful" | "unclear" | "not_helpful";

const VALID_RATINGS: FeedbackRating[] = ["helpful", "unclear", "not_helpful"];

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const body = (await request.json()) as {
      route?: string;
      rating?: FeedbackRating;
      note?: string;
      pageContext?: Record<string, unknown>;
    };

    if (!body.route || !body.rating || !VALID_RATINGS.includes(body.rating)) {
      return NextResponse.json({ ok: false, error: "invalid_feedback_input" }, { status: 400 });
    }

    const messagePayload = {
      rating: body.rating,
      note: typeof body.note === "string" ? body.note.trim() : "",
      pageContext: body.pageContext ?? {},
    };

    if (session.userId && session.email) {
      await reviewOsService.submitFeedback(session.userId, session.email, {
        route: body.route,
        pageContext: body.pageContext ?? {},
        message: JSON.stringify(messagePayload),
      });
    } else {
      console.info("[review-os/feedback] anonymous feedback", {
        route: body.route,
        rating: body.rating,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "feedback_submit_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

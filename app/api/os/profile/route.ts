import { NextResponse } from "next/server";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import {
  getModeLabel,
  normalizePreferredSubjectsForMode,
  resolveAppraisalMode,
} from "@/lib/review-os/appraisal";
import { reviewOsErrorResponse } from "@/lib/review-os/http";
import { reviewOsService } from "@/lib/review-os/service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const [access, profile, usage] = await Promise.all([
      reviewOsService.ensureAccess(userId, session.email),
      reviewOsService.getStudyProfile(userId),
      reviewOsService.getUsageSummary(userId, session.email),
    ]);
    return NextResponse.json({ ok: true, access, profile, usage });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSessionUser();
    const userId = await requireRequestUserId(request);
    const body = (await request.json()) as {
      examName: string;
      examDate?: string | null;
      preferredSubjects?: string[];
    };
    const mode = resolveAppraisalMode(null, body.examName);
    const profile = await reviewOsService.upsertStudyProfile(userId, session.email, {
      examName: getModeLabel(mode),
      examDate: body.examDate ?? null,
      preferredSubjects: normalizePreferredSubjectsForMode(body.preferredSubjects, mode),
    });
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return reviewOsErrorResponse(error);
  }
}

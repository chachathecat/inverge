import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";
import { reviewOsService } from "@/lib/review-os/service";
import { normalizeSubjectForMode, parseAppraisalMode } from "@/lib/review-os/appraisal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await getServerSessionUser();
  if (!session.userId || !session.email) {
    return NextResponse.json({ ok: false, error: "로그인 후 저장할 수 있습니다." }, { status: 401 });
  }
  const payload = (await request.json()) as Record<string, unknown>;
  const mode = parseAppraisalMode(typeof payload.examMode === "string" ? payload.examMode : null) ?? "second";
  const subject = normalizeSubjectForMode(typeof payload.subject === "string" ? payload.subject : "", mode);
  const problemSummary = typeof payload.problemSummary === "string" ? payload.problemSummary : "문제 요약 확인 필요";
  const concepts = Array.isArray(payload.requiredConcepts) ? payload.requiredConcepts.filter((item): item is string => typeof item === "string") : [];
  const formulas = Array.isArray(payload.formulas) ? payload.formulas.filter((item): item is string => typeof item === "string") : [];
  const commonMistakes = Array.isArray(payload.commonMistakes) ? payload.commonMistakes.filter((item): item is string => typeof item === "string") : [];
  const nextPracticeAction = typeof payload.nextPracticeAction === "string" ? payload.nextPracticeAction : "다음 풀이를 1문항 재시도합니다.";

  try {
    await reviewOsService.createLearningSignalEvent(session.userId, session.email, {
      examMode: mode === "second" ? "감정평가사 2차" : "감정평가사 1차",
      subject,
      sourceType: "problem-snap",
      derivedTags: [problemSummary, ...concepts, ...commonMistakes].filter(Boolean).slice(0, 8),
      relatedFormulas: formulas.slice(0, 5),
      nextTaskType: "retry",
      nextTask: nextPracticeAction,
      metadataJson: {
        source: "problem-snap",
        createdAt: typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
      },
    });
    return NextResponse.json({ ok: true, status: "saved" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, status: "failed", error: error instanceof Error ? error.message : "problem-snap-save-failed" },
      { status: 500 },
    );
  }
}

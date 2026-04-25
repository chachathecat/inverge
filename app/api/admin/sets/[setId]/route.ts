import { NextResponse } from "next/server";

import { requireAdminRouteSession } from "@/lib/auth/admin";
import type { AdminQuestionMetadataSaveInput } from "@/lib/inverge/admin-set-metadata";
import { getAdminSetDetail, saveAdminQuestionMetadata, setAdminQuestionActive } from "@/lib/inverge/admin-set-metadata-repository";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ setId: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(_: Request, context: RouteContext) {
  const { setId } = await context.params;
  const detail = getAdminSetDetail(setId);
  if (!detail) {
    return NextResponse.json({ ok: false, error: "set-not-found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function POST(request: Request, context: RouteContext) {
  const adminDenied = await requireAdminRouteSession();
  if (adminDenied) return adminDenied;

  try {
    const { setId } = await context.params;
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
    }

    if (body.action === "set-question-active") {
      const questionId = typeof body.questionId === "string" ? body.questionId : "";
      const active = Boolean(body.active);
      const saved = setAdminQuestionActive({ setId, questionId, active });
      if (!saved) {
        return NextResponse.json({ ok: false, error: "question-not-found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, question: saved, detail: getAdminSetDetail(setId) });
    }

    const input = body as Partial<AdminQuestionMetadataSaveInput>;
    if (
      typeof input.questionId !== "string" ||
      typeof input.subjectId !== "string" ||
      typeof input.unit !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "missing-required-fields" }, { status: 400 });
    }

    const saved = saveAdminQuestionMetadata({
      id: typeof input.id === "string" ? input.id : undefined,
      setId,
      questionId: input.questionId,
      number: Number(input.number) || 1,
      subjectId: input.subjectId as never,
      unit: input.unit,
      difficulty: input.difficulty ?? "medium",
      curriculumNodeIds: Array.isArray(input.curriculumNodeIds)
        ? input.curriculumNodeIds.filter((item): item is string => typeof item === "string")
        : [],
      expectedTimeSeconds: Number(input.expectedTimeSeconds) || 90,
      timeOveruseThresholdSeconds: Number(input.timeOveruseThresholdSeconds) || 120,
      reviewCandidateFlags: {
        lowConfidence: Boolean(input.reviewCandidateFlags?.lowConfidence),
        flagged: Boolean(input.reviewCandidateFlags?.flagged),
        timeOveruse: Boolean(input.reviewCandidateFlags?.timeOveruse),
      },
      active: input.active ?? true,
      operatorNote: typeof input.operatorNote === "string" ? input.operatorNote : undefined,
    });

    return NextResponse.json({ ok: true, question: saved, detail: getAdminSetDetail(setId) });
  } catch {
    return NextResponse.json({ ok: false, error: "question-save-error" }, { status: 500 });
  }
}

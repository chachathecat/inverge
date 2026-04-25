import { NextResponse } from "next/server";

import {
  isAdminCurriculumSubjectId,
  type CurriculumMappingSaveInput,
} from "@/lib/inverge/admin-curriculum";
import {
  listAdminCurriculumMappings,
  saveAdminCurriculumMapping,
  setAdminCurriculumMappingActive,
} from "@/lib/inverge/admin-curriculum-repository";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSubjectId(value: unknown) {
  return isAdminCurriculumSubjectId(value) ? value : "civil_law";
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const subjectId = parseSubjectId(url.searchParams.get("subjectId"));

  return NextResponse.json(listAdminCurriculumMappings(subjectId));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;

    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
    }

    if (body.action === "set-active") {
      const subjectId = parseSubjectId(body.subjectId);
      const id = typeof body.id === "string" ? body.id : "";
      const active = Boolean(body.active);
      const saved = setAdminCurriculumMappingActive({ subjectId, id, active });

      if (!saved) {
        return NextResponse.json({ ok: false, error: "mapping-not-found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, mapping: saved, list: listAdminCurriculumMappings(subjectId) });
    }

    const input = body as Partial<CurriculumMappingSaveInput>;
    const subjectId = parseSubjectId(input.subjectId);

    if (
      typeof input.questionId !== "string" ||
      typeof input.primaryNodeId !== "string" ||
      typeof input.chapterId !== "string" ||
      typeof input.topicId !== "string" ||
      typeof input.subtopicId !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "missing-required-fields" }, { status: 400 });
    }

    const saved = saveAdminCurriculumMapping({
      id: typeof input.id === "string" ? input.id : undefined,
      subjectId,
      questionId: input.questionId,
      primaryNodeId: input.primaryNodeId,
      linkedNodeIds: Array.isArray(input.linkedNodeIds) ? input.linkedNodeIds.filter((item): item is string => typeof item === "string") : [],
      chapterId: input.chapterId,
      chapterName: typeof input.chapterName === "string" ? input.chapterName : input.chapterId,
      topicId: input.topicId,
      topicName: typeof input.topicName === "string" ? input.topicName : input.topicId,
      subtopicId: input.subtopicId,
      subtopicName: typeof input.subtopicName === "string" ? input.subtopicName : input.subtopicId,
      correctChoiceId: input.correctChoiceId ?? "1",
      expectedSeconds: Number(input.expectedSeconds) || 90,
      difficulty: input.difficulty ?? "medium",
      examWeight: Number(input.examWeight) || 3,
      reviewWeight: Number(input.reviewWeight) || 3,
      coachingWeight: Number(input.coachingWeight) || 3,
      testedConceptType: input.testedConceptType ?? "rule",
      requiresArticleMemory: Boolean(input.requiresArticleMemory),
      requiresCaseLogic: Boolean(input.requiresCaseLogic),
      requiresComparison: Boolean(input.requiresComparison),
      mappingConfidence: input.mappingConfidence ?? "medium",
      defaultRootCauseTags: Array.isArray(input.defaultRootCauseTags)
        ? input.defaultRootCauseTags.filter((item): item is never => typeof item === "string")
        : [],
      active: input.active ?? true,
      operatorNote: typeof input.operatorNote === "string" ? input.operatorNote : undefined,
    });

    return NextResponse.json({ ok: true, mapping: saved, list: listAdminCurriculumMappings(subjectId) });
  } catch {
    return NextResponse.json({ ok: false, error: "curriculum-save-error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { isSecondExamGapType, isSecondExamAdminSubjectId } from "@/lib/inverge/admin-rewrite-seed-templates";
import { lookupSecondExamSeedTemplate } from "@/lib/inverge/second-exam-seed-template-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId");
  const gapType = searchParams.get("gapType");
  const focusLabel = searchParams.get("focusLabel") ?? undefined;

  if (!subjectId || !gapType || !isSecondExamAdminSubjectId(subjectId) || !isSecondExamGapType(gapType)) {
    return NextResponse.json({ ok: false, error: "invalid-seed-template-lookup" }, { status: 400 });
  }

  const template = await lookupSecondExamSeedTemplate({ subjectId, gapType, focusLabel });
  return NextResponse.json({ ok: true, template });
}

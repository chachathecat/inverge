import { NextResponse } from "next/server";

import { getRuntimeSetDetail } from "@/lib/inverge/admin-set-metadata-runtime";
import { parseSubjectId } from "@/lib/appraisal-first/http";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ setId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { setId } = await context.params;
  const url = new URL(request.url);
  const subjectId = parseSubjectId(url.searchParams.get("subjectId"));
  const detail = getRuntimeSetDetail(setId, subjectId);

  if (!detail) {
    return NextResponse.json({ ok: false, error: "set-not-found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, detail });
}

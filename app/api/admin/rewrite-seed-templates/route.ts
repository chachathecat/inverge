import { NextResponse } from "next/server";

import { requireAdminRouteSession } from "@/lib/auth/admin";
import {
  listAdminRewriteSeedTemplates,
  saveAdminRewriteSeedTemplate,
  setAdminRewriteSeedTemplateActive,
} from "@/lib/inverge/admin-rewrite-seed-template-repository";
import type { AdminRewriteSeedTemplateSaveInput } from "@/lib/inverge/admin-rewrite-seed-templates";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const subjectId = searchParams.get("subjectId") ?? undefined;
  const gapType = searchParams.get("gapType") ?? undefined;

  const response = await listAdminRewriteSeedTemplates({ subjectId, gapType });
  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const adminDenied = await requireAdminRouteSession();
  if (adminDenied) return adminDenied;

  try {
    const body = (await request.json()) as
      | (AdminRewriteSeedTemplateSaveInput & { action?: undefined })
      | { action: "set-active"; id: string; active: boolean; subjectId?: string; gapType?: string };

    if ("action" in body && body.action === "set-active") {
      const result = await setAdminRewriteSeedTemplateActive({
        id: body.id,
        active: body.active,
        subjectId: body.subjectId as never,
        gapType: body.gapType as never,
      });

      return NextResponse.json({ ok: true, ...result });
    }

    const result = await saveAdminRewriteSeedTemplate(body);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "rewrite-seed-template-save-failed",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";

import { requireAdminRouteSession } from "@/lib/auth/admin";
import { isAdminSetSubjectId, type AdminSetMetadataSaveInput } from "@/lib/inverge/admin-set-metadata";
import { listAdminSets, saveAdminSetMetadata, setAdminSetActive } from "@/lib/inverge/admin-set-metadata-repository";

export const dynamic = "force-dynamic";

function parseSubjectId(value: unknown) {
  if (value === "all") return "all" as const;
  return isAdminSetSubjectId(value) ? value : "all";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function GET(request: Request) {
  const adminDenied = await requireAdminRouteSession();
  if (adminDenied) return adminDenied;

  const url = new URL(request.url);
  const subjectId = parseSubjectId(url.searchParams.get("subjectId"));

  return NextResponse.json(listAdminSets(subjectId));
}

export async function POST(request: Request) {
  const adminDenied = await requireAdminRouteSession();
  if (adminDenied) return adminDenied;

  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "invalid-body" }, { status: 400 });
    }

    if (body.action === "set-active") {
      const setId = typeof body.setId === "string" ? body.setId : "";
      const active = Boolean(body.active);
      const saved = setAdminSetActive({ setId, active });
      if (!saved) {
        return NextResponse.json({ ok: false, error: "set-not-found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, set: saved, list: listAdminSets("all") });
    }

    const input = body as Partial<AdminSetMetadataSaveInput>;
    if (
      typeof input.setId !== "string" ||
      typeof input.setTitle !== "string" ||
      typeof input.examId !== "string" ||
      typeof input.subjectId !== "string" ||
      typeof input.sourceLabel !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "missing-required-fields" }, { status: 400 });
    }

    const saved = saveAdminSetMetadata({
      id: typeof input.id === "string" ? input.id : undefined,
      setId: input.setId,
      setTitle: input.setTitle,
      examId: input.examId,
      subjectId: isAdminSetSubjectId(input.subjectId) ? input.subjectId : "civil_law",
      sourceLabel: input.sourceLabel,
      sourceYear: typeof input.sourceYear === "number" ? input.sourceYear : Number(input.sourceYear) || undefined,
      timeLimitMinutes: Number(input.timeLimitMinutes) || 12,
      active: input.active ?? true,
      operatorNote: typeof input.operatorNote === "string" ? input.operatorNote : undefined,
    });

    return NextResponse.json({ ok: true, set: saved, list: listAdminSets("all") });
  } catch {
    return NextResponse.json({ ok: false, error: "set-save-error" }, { status: 500 });
  }
}

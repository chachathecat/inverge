import { NextResponse } from "next/server";

import { requireAdminRouteSession } from "@/lib/auth/admin";
import {
  isAdminRootCauseSubjectId,
  isRootCauseGroup,
  normalizeRootCauseTagId,
  type AdminRootCauseTagSaveInput,
} from "@/lib/inverge/admin-root-cause-tags";
import {
  listAdminRootCauseTags,
  saveAdminRootCauseTag,
  setAdminRootCauseTagActive,
} from "@/lib/inverge/admin-root-cause-tags-repository";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSubjectId(value: unknown) {
  return isAdminRootCauseSubjectId(value) ? value : "civil_law";
}

export async function GET(request: Request) {
  const adminDenied = await requireAdminRouteSession();
  if (adminDenied) return adminDenied;

  const url = new URL(request.url);
  const subjectId = parseSubjectId(url.searchParams.get("subjectId"));

  return NextResponse.json(listAdminRootCauseTags(subjectId));
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
      const subjectId = parseSubjectId(body.subjectId);
      const id = typeof body.id === "string" ? body.id : "";
      const active = Boolean(body.active);
      const saved = setAdminRootCauseTagActive({ subjectId, id, active });

      if (!saved) {
        return NextResponse.json({ ok: false, error: "tag-not-found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, tag: saved, list: listAdminRootCauseTags(subjectId) });
    }

    const input = body as Partial<AdminRootCauseTagSaveInput>;
    const subjectId = parseSubjectId(input.subjectId);
    const group = isRootCauseGroup(input.group) ? input.group : "concept_gap";

    if (
      typeof input.tagId !== "string" ||
      typeof input.internalName !== "string" ||
      typeof input.userLabel !== "string" ||
      typeof input.summaryLabel !== "string"
    ) {
      return NextResponse.json({ ok: false, error: "missing-required-fields" }, { status: 400 });
    }

    const saved = saveAdminRootCauseTag({
      id: typeof input.id === "string" ? input.id : undefined,
      subjectId,
      tagId: normalizeRootCauseTagId(input.tagId),
      group,
      category: group,
      internalName: input.internalName,
      userLabel: input.userLabel,
      summaryLabel: input.summaryLabel,
      reviewPriorityWeight: Number(input.reviewPriorityWeight) || 50,
      reviewAction: typeof input.reviewAction === "string" ? input.reviewAction : "",
      coachingTemplate: typeof input.coachingTemplate === "string" ? input.coachingTemplate : "",
      isUserVisible: Boolean(input.isUserVisible),
      active: input.active ?? true,
      operatorNote: typeof input.operatorNote === "string" ? input.operatorNote : undefined,
    });

    return NextResponse.json({ ok: true, tag: saved, list: listAdminRootCauseTags(subjectId) });
  } catch {
    return NextResponse.json({ ok: false, error: "tag-save-error" }, { status: 500 });
  }
}

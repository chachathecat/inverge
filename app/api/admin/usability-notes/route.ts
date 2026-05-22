import { NextResponse } from "next/server";

import { requireAdminRouteSession } from "@/lib/auth/admin";
import { createAdminUsabilityNote, listAdminUsabilityNotes, type AdminUsabilityNoteInput } from "@/lib/inverge/admin-usability-notes-repository";

export async function GET() {
  const adminDenied = await requireAdminRouteSession();
  if (adminDenied) return adminDenied;

  return NextResponse.json({ ok: true, notes: listAdminUsabilityNotes() });
}

export async function POST(request: Request) {
  const adminDenied = await requireAdminRouteSession();
  if (adminDenied) return adminDenied;

  try {
    const body = (await request.json()) as AdminUsabilityNoteInput;
    const note = createAdminUsabilityNote(body);
    return NextResponse.json({ ok: true, note });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "usability-note-create-failed" }, { status: 400 });
  }
}

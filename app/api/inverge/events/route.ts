import { NextResponse } from "next/server";

import { appendInvergeEvent, listInvergeEvents } from "@/lib/inverge/event-repository";
import {
  isInvergeEventName,
  normalizeInvergeEventInput,
  type InvergeEventEnvelope,
  type InvergeEventInput,
} from "@/lib/inverge/events";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeServerEvent(body: unknown): InvergeEventEnvelope | null {
  if (!isRecord(body) || !isInvergeEventName(body.eventName)) {
    return null;
  }

  const input: InvergeEventInput = {
    eventName: body.eventName,
    eventId: typeof body.eventId === "string" ? body.eventId : undefined,
    occurredAt: typeof body.occurredAt === "string" ? body.occurredAt : undefined,
    anonymousUserId: typeof body.anonymousUserId === "string" ? body.anonymousUserId : undefined,
    payload: isRecord(body.payload) ? body.payload : undefined,
  };

  return {
    ...normalizeInvergeEventInput(input),
    receivedAt: new Date().toISOString(),
    persistence: "server",
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const event = normalizeServerEvent(body);

    if (!event) {
      return NextResponse.json({ ok: false, error: "invalid-event" }, { status: 400 });
    }

    appendInvergeEvent(event);
    return NextResponse.json({ ok: true, eventId: event.eventId });
  } catch {
    return NextResponse.json({ ok: false, error: "event-persistence-error" }, { status: 500 });
  }
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 100);

  return NextResponse.json({
    ok: true,
    events: listInvergeEvents(Number.isFinite(limit) ? limit : 100),
  });
}

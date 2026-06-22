import "server-only";

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerSessionUser, requireRequestUserId } from "@/lib/auth/session";
import { createOptionalSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export type NotificationRouteContext = {
  userId: string;
  email: string | null;
  client: SupabaseClient;
  json(body: unknown, init?: ResponseInit): NextResponse;
};

export async function getNotificationRouteContext(request: Request): Promise<NotificationRouteContext | NextResponse> {
  const session = await getServerSessionUser();
  const userId = await requireRequestUserId(request);
  const routeClient = await createOptionalSupabaseRouteHandlerClient();
  if (!routeClient) {
    return NextResponse.json(
      {
        ok: false,
        status: "server_unavailable",
        message: "알림 설정 저장에는 Supabase 구성이 필요합니다.",
      },
      { status: 503 },
    );
  }

  return {
    userId,
    email: session.email,
    client: routeClient.client as SupabaseClient,
    json(body, init) {
      return routeClient.applyToResponse(NextResponse.json(body, init));
    },
  };
}

export function isRouteResponse(value: NotificationRouteContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function notificationApiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "notification-api-error";
  const status =
    message === "auth-required"
      ? 401
      : /invalid|rejected|missing|too-long/.test(message)
        ? 400
        : 500;
  return NextResponse.json({ ok: false, message }, { status });
}

import { NextResponse } from "next/server";

import { DEV_SMOKE_AUTH_COOKIE, isDevSmokeAuthEnabled } from "@/lib/auth/session";
import { createOptionalSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createOptionalSupabaseRouteHandlerClient();
  if (supabase) {
    await supabase.client.auth.signOut();
    const response = supabase.applyToResponse(NextResponse.json({ ok: true }));
    if (isDevSmokeAuthEnabled()) {
      response.cookies.set(DEV_SMOKE_AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    }
    return response;
  }

  const response = NextResponse.json({ ok: true });
  if (isDevSmokeAuthEnabled()) {
    response.cookies.set(DEV_SMOKE_AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return response;
}

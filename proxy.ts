import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSupabaseSession } from "@/lib/supabase/proxy";
import { bridgeFailure, localBridgeEnabled } from "@/lib/legal/owner-snapshot-bridge-contract";

export async function proxy(request: NextRequest) {
  let pathname = request.nextUrl.pathname;
  try { pathname = decodeURIComponent(pathname); } catch { /* Preserve unrelated malformed-path handling. */ }
  const bridgePath = ["/app/first-stage/legal-evidence", "/api/review-os/first-stage/legal-evidence"]
    .some(root => pathname === root || pathname.startsWith(root + "/"));
  // Deny only this local-only bridge before the existing global auth proxy can
  // contact Supabase or refresh cookies. Route/page ownership checks still apply.
  if (bridgePath && !localBridgeEnabled(process.env)) {
    return NextResponse.json(bridgeFailure("ACCESS_DENIED"), { status: 404, headers: {
      "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache",
      Vary: "Cookie, Authorization", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
    } });
  }
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

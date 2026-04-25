import { NextResponse } from "next/server";

import { DEMO_USER_IDS, getServerSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSessionUser(DEMO_USER_IDS.appraisalFirst);
  return NextResponse.json({
    ok: true,
    session: {
      authEnabled: session.authEnabled,
      isAuthenticated: session.isAuthenticated,
      isDemo: session.isDemo,
      userId: session.userId,
      email: session.email,
      source: session.source,
    },
  });
}

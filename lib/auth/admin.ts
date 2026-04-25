import { NextResponse } from "next/server";

import { getServerSessionUser } from "@/lib/auth/session";

function getAdminEmailAllowlist() {
  return (process.env.ALPHA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email: string | null) {
  const allow = getAdminEmailAllowlist();
  if (allow.length === 0) return process.env.NODE_ENV !== "production";
  return email ? allow.includes(email.toLowerCase()) : false;
}

export async function requireAdminRouteSession() {
  const session = await getServerSessionUser();
  if (!session.isAuthenticated || !isAllowedAdminEmail(session.email)) {
    return NextResponse.json({ ok: false, error: "admin-required" }, { status: 403 });
  }
  return null;
}

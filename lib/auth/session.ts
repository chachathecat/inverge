import "server-only";

import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

import { createOptionalSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const DEMO_USER_IDS = {
  appraisalFirst: "mvp-user",
  actuaryFirst: "mvp-user",
  actuarySecond: "mvp-user",
  secondExam: "mvp-user",
} as const;

export type InvergeServerSession = {
  userId: string | null;
  email: string | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  authEnabled: boolean;
  source: "demo" | "smoke" | "supabase";
};

export class AuthRequiredError extends Error {
  constructor() {
    super("auth-required");
  }
}

export function isAuthRequiredError(error: unknown) {
  return error instanceof AuthRequiredError || (error instanceof Error && error.message === "auth-required");
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export const DEV_SMOKE_AUTH_COOKIE = "__inverge_dev_smoke_auth";
export const DEV_SMOKE_AUTH_EMAIL = process.env.DEV_SMOKE_AUTH_EMAIL ?? "codex-smoke@localhost.test";
export const DEV_SMOKE_AUTH_PASSWORD = process.env.DEV_SMOKE_AUTH_PASSWORD ?? "inverge-local-smoke-password";

export function isDevSmokeAuthEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_SMOKE_AUTH === "true";
}

export function isLocalhostUrl(url: string) {
  const hostname = new URL(url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function canUseHeaderFallback(request: Request) {
  if (isSupabaseConfigured()) return false;
  if (process.env.NODE_ENV === "production") return false;
  return isLocalhostUrl(request.url);
}

export function createSmokeAuthCookieValue(userId: string, email = DEV_SMOKE_AUTH_EMAIL) {
  return Buffer.from(JSON.stringify({ userId, email }), "utf8").toString("base64url");
}

async function getDevSmokeSession(): Promise<InvergeServerSession | null> {
  if (!isDevSmokeAuthEnabled()) return null;
  const headerStore = await headers();
  const host = headerStore.get("host")?.split(":")[0] ?? "";
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") return null;
  const cookieStore = await cookies();
  const raw = cookieStore.get(DEV_SMOKE_AUTH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      userId?: unknown;
      email?: unknown;
    };
    if (typeof parsed.userId !== "string" || !isUuid(parsed.userId)) return null;
    return {
      userId: parsed.userId,
      email: typeof parsed.email === "string" ? parsed.email : DEV_SMOKE_AUTH_EMAIL,
      isAuthenticated: true,
      isDemo: false,
      authEnabled: true,
      source: "smoke",
    };
  } catch {
    return null;
  }
}

export async function getServerSessionUser(fallbackUserId = DEMO_USER_IDS.appraisalFirst): Promise<InvergeServerSession> {
  const smokeSession = await getDevSmokeSession();
  if (smokeSession) return smokeSession;

  if (!isSupabaseConfigured()) {
    return {
      userId: fallbackUserId,
      email: null,
      isAuthenticated: false,
      isDemo: true,
      authEnabled: false,
      source: "demo",
    };
  }

  try {
    const client = await createOptionalSupabaseServerClient();
    if (!client) {
      return {
        userId: null,
        email: null,
        isAuthenticated: false,
        isDemo: false,
        authEnabled: true,
        source: "supabase",
      };
    }

    const {
      data: { user },
    } = await client.auth.getUser();

    if (user?.id && isUuid(user.id)) {
      return {
        userId: user.id,
        email: user.email ?? null,
        isAuthenticated: true,
        isDemo: false,
        authEnabled: true,
        source: "supabase",
      };
    }
  } catch {
    // Fall through to unauthenticated auth-enabled session.
  }

  return {
    userId: null,
    email: null,
    isAuthenticated: false,
    isDemo: false,
    authEnabled: true,
    source: "supabase",
  };
}

export async function getRequestUserId(request: Request, fallbackUserId = DEMO_USER_IDS.appraisalFirst) {
  const headerUserId = request.headers.get("x-mvp-user-id");
  const smokeSession = await getDevSmokeSession();
  if (smokeSession) return smokeSession.userId;

  if (canUseHeaderFallback(request)) {
    if (headerUserId && isUuid(headerUserId)) return headerUserId;
    return fallbackUserId;
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  const session = await getServerSessionUser(fallbackUserId);
  if (session.isAuthenticated) {
    return session.userId;
  }

  return null;
}

export async function requireRequestUserId(request: Request, fallbackUserId = DEMO_USER_IDS.appraisalFirst) {
  const userId = await getRequestUserId(request, fallbackUserId);
  if (!userId) {
    throw new AuthRequiredError();
  }
  return userId;
}

export async function requireServerSession(returnTo?: string, fallbackUserId = DEMO_USER_IDS.appraisalFirst) {
  const session = await getServerSessionUser(fallbackUserId);
  if (!session.authEnabled) {
    return session;
  }

  if (!session.isAuthenticated) {
    const target = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login";
    redirect(target);
  }

  return session;
}

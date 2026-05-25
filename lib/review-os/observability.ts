import crypto from "node:crypto";

export type CostCategory = "answer_review" | "capture_ocr" | "problem_snap";

export type ServerEventInput = {
  eventName: string;
  userId?: string | null;
  route: string;
  mode?: string | null;
  subject?: string | null;
  costCategory: CostCategory;
  durationMs: number;
  ok: boolean;
  errorCode?: string | null;
};

function hashUserId(userId?: string | null) {
  if (!userId) return "anonymous";
  return crypto.createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function sanitizeErrorCode(code?: string | null) {
  if (!code) return null;
  return code.replace(/[^A-Z0-9_]/gi, "_").slice(0, 48).toUpperCase();
}

export function buildServerEventLog(input: ServerEventInput) {
  return {
    eventName: input.eventName,
    userIdHash: hashUserId(input.userId),
    route: input.route,
    mode: input.mode ?? "unknown",
    subject: input.subject ?? "unknown",
    costCategory: input.costCategory,
    durationMs: Math.max(0, Math.round(input.durationMs)),
    status: input.ok ? "success" : "failure",
    errorCode: sanitizeErrorCode(input.errorCode),
  } as const;
}

export function logServerEvent(input: ServerEventInput) {
  const entry = buildServerEventLog(input);
  console.info("[observability]", entry);
  return entry;
}

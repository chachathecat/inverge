import type { WrongAnswerDetail } from "./types";

export type FirstOxSourceReadOutcome =
  | Readonly<{ status: "ready"; detail: WrongAnswerDetail }>
  | Readonly<{ status: "missing" }>
  | Readonly<{
      status: "unavailable";
      retryable: true;
      safety: Readonly<{ kind: "unknown"; preservationKnown: false }>;
    }>;

type SourceReadResponse = Pick<Response, "json" | "status">;
type SourceReadFetch = (
  input: string,
  init: RequestInit,
) => Promise<SourceReadResponse>;

const MISSING_OUTCOME = Object.freeze({ status: "missing" } as const);
const UNAVAILABLE_OUTCOME = Object.freeze({
  status: "unavailable",
  retryable: true,
  safety: Object.freeze({ kind: "unknown", preservationKnown: false }),
} as const);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isWrongAnswerDetail(value: unknown): value is WrongAnswerDetail {
  if (!isPlainObject(value) || !isPlainObject(value.item)) return false;
  return (
    typeof value.item.id === "string" &&
    typeof value.item.userId === "string" &&
    typeof value.item.examName === "string" &&
    typeof value.item.subjectLabel === "string"
  );
}

export function isSafeRequestedSourceId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

export function classifyFirstOxSourceResponse(
  status: number,
  body: unknown,
): FirstOxSourceReadOutcome {
  if (status !== 200 || !isPlainObject(body) || body.ok !== true) {
    return UNAVAILABLE_OUTCOME;
  }
  if (!Object.hasOwn(body, "detail")) return UNAVAILABLE_OUTCOME;
  if (body.detail === null) return MISSING_OUTCOME;
  if (!isWrongAnswerDetail(body.detail)) return UNAVAILABLE_OUTCOME;
  return Object.freeze({ status: "ready", detail: body.detail });
}

export async function readFirstOxSourceDetail(
  itemId: string,
  signal: AbortSignal,
  fetcher: SourceReadFetch = fetch,
): Promise<FirstOxSourceReadOutcome> {
  if (!isSafeRequestedSourceId(itemId)) return MISSING_OUTCOME;
  try {
    const response = await fetcher(
      `/api/os/items/${encodeURIComponent(itemId)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        signal,
      },
    );
    const body = await response.json();
    return classifyFirstOxSourceResponse(response.status, body);
  } catch (error) {
    void error;
    return UNAVAILABLE_OUTCOME;
  }
}

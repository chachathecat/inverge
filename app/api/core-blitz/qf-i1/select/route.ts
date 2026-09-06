import { NextResponse } from "next/server";

import * as qfI1 from "@/lib/question-foundry/runtime/qf-i1-bank-first";
import {
  isTrustedRepairAccessError,
  requireTrustedRepairAccess,
} from "@/lib/review-os/trusted-repair-access";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 64 * 1024;
const RESPONSE_HEADERS = { "Cache-Control": "private, no-store, max-age=0" };
const SELECTOR_EXPORT_CANDIDATES = Object.freeze([
  "selectQfI1BankFirstAssignmentV1",
  "selectQfI1BankFirstV1",
  "selectQfI1AssignmentV1",
  "selectBankFirstQuestionV1",
  "resolveQfI1BankFirstV1",
] as const);

type QfI1Selector = (input: unknown) => unknown;

function selector(): QfI1Selector {
  const moduleExports = qfI1 as unknown as Record<string, unknown>;
  for (const name of SELECTOR_EXPORT_CANDIDATES) {
    const candidate = moduleExports[name];
    if (typeof candidate === "function") return candidate as QfI1Selector;
  }
  const discovered = Object.entries(moduleExports).filter(
    ([name, value]) =>
      typeof value === "function" &&
      /(?:qf.*i1|bank.*first|first.*bank)/iu.test(name),
  );
  if (discovered.length !== 1) {
    throw new Error("qf-i1:selector-export-ambiguous");
  }
  return discovered[0][1] as QfI1Selector;
}

function contentLength(request: Request) {
  const raw = request.headers.get("content-length");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function qfI1EnabledOutsideProduction() {
  // Same deployment convention as core-blitz/learner-support-access: preview
  // runs a production build, but standalone production and Vercel production
  // are denied. C3R flags are necessary access gates, not QF activation.
  return (
    process.env.CORE_BLITZ_QF_I1_ENABLED === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview")
  );
}

class RequestTooLargeError extends Error {}

async function readBoundedJson(request: Request): Promise<unknown> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const bytes = new Uint8Array(MAX_REQUEST_BYTES);
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > MAX_REQUEST_BYTES - received) {
        // Cancel without awaiting transport cleanup: even a failed or stalled
        // cancellation must not defer the 413 or resume body consumption.
        void reader.cancel().catch(() => undefined);
        throw new RequestTooLargeError();
      }
      bytes.set(value, received);
      received += value.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, received)));
  } catch (error) {
    if (error instanceof RequestTooLargeError) throw error;
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    if (!qfI1EnabledOutsideProduction()) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_OWNER_AUTHORITY_REQUIRED" },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }
    const session = await requireTrustedRepairAccess();
    if (!session.authEnabled || session.isDemo) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_OWNER_AUTHORITY_REQUIRED" },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }
    const length = contentLength(request);
    if (length !== null && length > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_REQUEST_TOO_LARGE" },
        { status: 413, headers: RESPONSE_HEADERS },
      );
    }
    const input = await readBoundedJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_INVALID_INPUT" },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const result = selector()(input);
    return NextResponse.json(
      {
        ok: true,
        result,
        boundary: {
          ownerOnly: true,
          defaultOff: true,
          persisted: false,
          providerExecution: false,
          generatedContentMaximumAuthority: "LEARNING_ONLY",
          verifiedTransferAdmissionForGeneratedContent: false,
          measurementAdmissionForGeneratedContent: false,
          rawGeneratedBodyMetadataPersistence: false,
          productionActivation: false,
          remoteMutation: false,
        },
      },
      {
        status: 200,
        headers: RESPONSE_HEADERS,
      },
    );
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_REQUEST_TOO_LARGE" },
        { status: 413, headers: RESPONSE_HEADERS },
      );
    }
    if (isTrustedRepairAccessError(error)) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_OWNER_AUTHORITY_REQUIRED" },
        { status: 404, headers: RESPONSE_HEADERS },
      );
    }
    return NextResponse.json(
      { ok: false, errorCode: "QF_I1_SELECTION_REJECTED" },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }
}

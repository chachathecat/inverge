import { NextResponse } from "next/server";

import * as qfI1 from "@/lib/question-foundry/runtime/qf-i1-bank-first";
import {
  isTrustedRepairAccessError,
  requireTrustedRepairAccess,
} from "@/lib/review-os/trusted-repair-access";

export const dynamic = "force-dynamic";

const MAX_REQUEST_BYTES = 64 * 1024;
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

export async function POST(request: Request) {
  try {
    await requireTrustedRepairAccess();
    const length = contentLength(request);
    if (length !== null && length > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_REQUEST_TOO_LARGE" },
        { status: 413 },
      );
    }
    const input = await request.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_INVALID_INPUT" },
        { status: 400 },
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
          productionActivation: false,
          remoteMutation: false,
        },
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (isTrustedRepairAccessError(error)) {
      return NextResponse.json(
        { ok: false, errorCode: "QF_I1_OWNER_AUTHORITY_REQUIRED" },
        { status: 404 },
      );
    }
    const errorCode =
      error instanceof Error && error.message.startsWith("qf-i1:")
        ? error.message.toUpperCase().replaceAll(":", "_").replaceAll("-", "_")
        : "QF_I1_SELECTION_REJECTED";
    return NextResponse.json(
      { ok: false, errorCode },
      { status: 400 },
    );
  }
}

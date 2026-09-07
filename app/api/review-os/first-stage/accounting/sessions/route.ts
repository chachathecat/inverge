import { handlePrivateAccountingSession } from "@/lib/review-os/first-stage/runtime/session-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = handlePrivateAccountingSession;
export const POST = handlePrivateAccountingSession;

import { handlePrivateFirstStageSession } from "@/lib/review-os/first-stage/runtime/session-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handlePrivateFirstStageSession;
export const POST = handlePrivateFirstStageSession;

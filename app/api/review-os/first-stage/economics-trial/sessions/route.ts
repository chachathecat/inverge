import { handleOwnerLocalTrialSession } from "@/lib/review-os/first-stage/runtime/owner-local-trial-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleOwnerLocalTrialSession;
export const POST = handleOwnerLocalTrialSession;

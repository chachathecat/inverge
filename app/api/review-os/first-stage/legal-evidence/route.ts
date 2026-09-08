import { handleOwnerLegalEvidence } from "@/lib/legal/owner-snapshot-bridge-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = handleOwnerLegalEvidence;
export const POST = handleOwnerLegalEvidence;

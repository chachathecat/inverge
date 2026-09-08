import "server-only";
import { headers } from "next/headers";
import { getServerSessionUser } from "@/lib/auth/session";
import source from "@/config/legal-snapshot-reader-source-v1.json";
import { loadSnapshotBridge } from "./owner-snapshot-bridge";
import { bridgeOwner, createSnapshotBridgeHandler, localBridgeEnabled } from "./owner-snapshot-bridge-http";

/** Page authentication does not load a catalog or serialize any statute body. */
export async function requireOwnerLegalEvidencePage() {
  if (!localBridgeEnabled(process.env) || (await headers()).get("host") !== "127.0.0.1:3883") return null;
  return bridgeOwner(process.env, getServerSessionUser);
}

export const handleOwnerLegalEvidence = createSnapshotBridgeHandler({
  environment: () => process.env,
  session: getServerSessionUser,
  bridge: async () => {
    const sourceRoot = process.env.INVERGE_OWNER_LEGAL_READER_ROOT;
    const root = process.env.INVERGE_OWNER_LEGAL_SNAPSHOT_ROOT;
    const catalogPath = process.env.INVERGE_OWNER_LEGAL_CATALOG_PATH;
    const catalogSha256 = process.env.INVERGE_OWNER_LEGAL_CATALOG_SHA256;
    if (!sourceRoot || !root || !catalogPath || !catalogSha256) return null;
    return loadSnapshotBridge({ sourceRoot, root, catalogPath, catalogSha256 }, source);
  },
});

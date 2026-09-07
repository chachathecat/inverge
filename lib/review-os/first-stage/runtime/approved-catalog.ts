import "server-only";
import { open } from "node:fs/promises";
import path from "node:path";
import { ECONOMICS_CONTENT_MAX_BYTES, loadEconomicsContent, type EconomicsContentApproval } from "./economics-content";
import { loadAccountingContent, type AccountingContentApproval } from "./accounting-content";
import type { PrivateFirstStageCatalog } from "./session-service";
import type { PrivateContentApproval } from "./private-reviewed-content";
import type { PrivateApplicabilityInstallation } from "./foundation-applicability";
import { loadCivilLawContent, loadRealEstatePrinciplesContent, loadAppraiserRelatedLawContent } from "./remaining-subject-content";

// Intentionally empty. AI review, Q-Net review packets and test receipts are NOT approvals.
// Actual evidence must be installed by reviewed code, separately from the private body.
const APPROVED_ECONOMICS_CONTENT: readonly EconomicsContentApproval[] = Object.freeze([]);
const APPROVED_ACCOUNTING_CONTENT: readonly AccountingContentApproval[] = Object.freeze([]);
const APPROVED_CIVIL_LAW_CONTENT: readonly PrivateContentApproval[] = Object.freeze([]);
// Separately reviewed Foundation objects. No runtime/test flag or content file
// can install these, and generic six-check approval cannot replace them.
const CIVIL_LAW_APPLICABILITY: readonly PrivateApplicabilityInstallation[] = Object.freeze([]);
const APPROVED_REAL_ESTATE_PRINCIPLES_CONTENT: readonly PrivateContentApproval[] = Object.freeze([]);
const APPROVED_APPRAISER_RELATED_LAW_CONTENT: readonly PrivateContentApproval[] = Object.freeze([]);

/** A bounded server-only local file read. No network, public fallback or test flag. */
export async function readPrivateEconomicsContent(file: string): Promise<Uint8Array> {
  if (!path.isAbsolute(file)) throw new Error("private_content_unavailable");
  const relative = path.relative(process.cwd(), file);
  if (!relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative)) throw new Error("private_content_unavailable");
  const handle = await open(file, "r");
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > ECONOMICS_CONTENT_MAX_BYTES) throw new Error("private_content_unavailable");
    const chunks: Buffer[] = [];
    let length = 0;
    while (true) {
      const buffer = Buffer.alloc(Math.min(65_536, ECONOMICS_CONTENT_MAX_BYTES + 1 - length));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      length += bytesRead;
      if (length > ECONOMICS_CONTENT_MAX_BYTES) throw new Error("private_content_unavailable");
      chunks.push(buffer.subarray(0, bytesRead));
    }
    return Buffer.concat(chunks, length);
  } finally { await handle.close(); }
}

export async function loadApprovedPrivateFirstStageCatalog(): Promise<PrivateFirstStageCatalog | null> {
  return loadEconomicsContent({ approvals: APPROVED_ECONOMICS_CONTENT,
    readBytes: () => readPrivateEconomicsContent(process.env.INVERGE_OWNER_ECONOMICS_CONTENT_PATH ?? "") });
}

export async function loadApprovedPrivateAccountingCatalog(): Promise<PrivateFirstStageCatalog | null> {
  return loadAccountingContent({ approvals: APPROVED_ACCOUNTING_CONTENT,
    readBytes: () => readPrivateEconomicsContent(process.env.INVERGE_OWNER_ACCOUNTING_CONTENT_PATH ?? "") });
}

export async function loadApprovedPrivateCivilLawCatalog(): Promise<PrivateFirstStageCatalog | null> {
  return loadCivilLawContent({ approvals: APPROVED_CIVIL_LAW_CONTENT, applicability: CIVIL_LAW_APPLICABILITY,
    readBytes: () => readPrivateEconomicsContent(process.env.INVERGE_OWNER_CIVIL_LAW_CONTENT_PATH ?? "") });
}

export async function loadApprovedPrivateRealEstatePrinciplesCatalog(): Promise<PrivateFirstStageCatalog | null> {
  return loadRealEstatePrinciplesContent({ approvals: APPROVED_REAL_ESTATE_PRINCIPLES_CONTENT,
    readBytes: () => readPrivateEconomicsContent(process.env.INVERGE_OWNER_REAL_ESTATE_PRINCIPLES_CONTENT_PATH ?? "") });
}

export async function loadApprovedPrivateAppraiserRelatedLawCatalog(): Promise<PrivateFirstStageCatalog | null> {
  return loadAppraiserRelatedLawContent({ approvals: APPROVED_APPRAISER_RELATED_LAW_CONTENT,
    readBytes: () => readPrivateEconomicsContent(process.env.INVERGE_OWNER_APPRAISER_RELATED_LAW_CONTENT_PATH ?? "") });
}

import "server-only";

import { headers } from "next/headers";

const AUDIT_SHA_HEADER = "x-s232h2-audit-sha";

export async function isPreviewExactShaReadOnlyRequest(): Promise<boolean> {
  if (process.env.VERCEL_ENV !== "preview") return false;

  const deploymentSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (!deploymentSha) return false;

  const requestHeaders = await headers();
  return requestHeaders.get(AUDIT_SHA_HEADER) === deploymentSha;
}

import "server-only";
import path from "node:path";
import { open, realpath, access } from "node:fs/promises";
import { headers } from "next/headers";
import { getServerSessionUser } from "@/lib/auth/session";
import { getSupabasePersistenceClient } from "@/lib/supabase/persistence";
import { privateFirstStageOwner } from "./session-application";
import { createPrivateSessionRepository } from "./session-repository";
import { createOwnerLocalTrialApplication } from "./owner-local-trial-context";
import { genuineTrialSession, ownerLocalR3TrialEnvironment } from "./owner-local-trial-boundary";
import { loadOwnerLocalR3TrialContent, type TrialInstallation } from "./owner-local-trial-content";

const FILES = { candidate: "economics-runtime-candidate-r3-v1.json",
  review: "issue-883-economics-r3-review/review-packet-r3.json",
  calculations: "issue-883-economics-r3-review/calculation-results.json",
  ai: "additional-ai-review-2026-09-07/review-evidence.json",
  observation: "issue-883-economics-r3-review/source-observation.json",
  checklist: "issue-883-economics-r3-review/REVIEW-r3.md",
  pdf: "qnet-2230215-session1.pdf", key: "qnet-2243629-final-key.hwp",
  keyObservation: "complete-key-observation-r3-ai-v1.json" } as const;
async function privateRoot(value: string | undefined) {
  if (!value || !path.isAbsolute(value)) throw new Error("local_trial_unavailable");
  const root = await realpath(value);
  for (let current = root;; current = path.dirname(current)) {
    if (await access(path.join(current,".git")).then(()=>true,()=>false)) throw new Error("local_trial_unavailable");
    if (current === path.dirname(current)) break;
  }
  return root;
}
async function readBounded(root: string, name: string) {
  const target = await realpath(path.join(root,name)), relative = path.relative(root,target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("local_trial_unavailable");
  const handle = await open(target,"r");
  try {
    const chunks: Buffer[] = []; let total = 0;
    for (;;) {
      const buffer = Buffer.alloc(65536), read = await handle.read(buffer,0,buffer.length,null);
      if (!read.bytesRead) break; total += read.bytesRead;
      if (total > 2*1024*1024) throw new Error("local_trial_unavailable");
      chunks.push(buffer.subarray(0,read.bytesRead));
    }
    return Buffer.concat(chunks);
  } finally { await handle.close(); }
}
async function loadInstalledTrial() {
  try {
    const root = await privateRoot(process.env.INVERGE_OWNER_ECONOMICS_R3_SOURCE_ROOT);
    const installationRoot = await privateRoot(path.join(process.env.LOCALAPPDATA ?? "", "Inverge", "owner-economics"));
    const installation: TrialInstallation = JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(await readBounded(installationRoot,"trial-installation.json")));
    // Real runtime never accepts synthetic_test_only, even if a local file says so.
    return await loadOwnerLocalR3TrialContent({ installation, readArtifact: name => readBounded(root,FILES[name]) });
  } catch { return null; }
}
export async function requireOwnerLocalTrialPage() {
  if (!ownerLocalR3TrialEnvironment(process.env) || (await headers()).get("host") !== "127.0.0.1:3883") return null;
  const session = await getServerSessionUser();
  if (!genuineTrialSession(session)) return null;
  return privateFirstStageOwner(process.env,async()=>session);
}
export const handleOwnerLocalTrialSession = createOwnerLocalTrialApplication({ environment:()=>process.env,
  session: getServerSessionUser, catalog: loadInstalledTrial,
  repository:()=>{ const client=getSupabasePersistenceClient(); if(!client) throw new Error("local_trial_unavailable");
    return createPrivateSessionRepository(client); } });

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { BridgeResult, BridgeState, HeldSnapshot, SnapshotAnchor } from "./owner-snapshot-bridge-contract";
import { bridgeFailure } from "./owner-snapshot-bridge-contract";
export { bridgeFailure } from "./owner-snapshot-bridge-contract";

export type ReaderSource = Readonly<{
  revision: string; tree: string; entry: string;
  dependencyFiles: readonly Readonly<{ path: string; sha256: string; bytes: number }>[];
}>;
export type SnapshotSettings = Readonly<{ sourceRoot: string; root: string; catalogPath: string; catalogSha256: string }>;
export type SnapshotReader = Readonly<{
  listSnapshots(): NativeResult; search(input: unknown): NativeResult; readReference(reference: unknown): NativeResult;
}>;
type NativeResult = { state: string; snapshots?: readonly HeldSnapshot[]; anchors?: readonly SnapshotAnchor[];
  originalReopened?: boolean; totalMatches?: number; returnedCount?: number };
export type SnapshotBridge = Readonly<{
  list(): BridgeResult; search(input: unknown): BridgeResult; reopen(reference: unknown): BridgeResult;
}>;
const states = new Set(["OK", "NO_RESULTS", "LAW_NOT_HELD", "VERSION_NOT_HELD",
  "INVALID_INPUT", "UNSUPPORTED", "INTEGRITY_ERROR", "SEARCH_FAILED"]);
function present(result: NativeResult): BridgeResult {
  const state = states.has(result.state) ? result.state as BridgeState : "SEARCH_FAILED";
  if (state !== "OK") return bridgeFailure(state);
  return { ...bridgeFailure(state), snapshots: result.snapshots,
    // Keep exact native reference. Do not send the entire original JSON fragment to the browser.
    anchors: (result.anchors ?? []).map(({ reference, articleNumber, branchNumber, title, bodyText, deleted, score }) =>
      ({ reference, articleNumber, branchNumber, title, bodyText, deleted, score })),
    originalReopened: result.originalReopened, totalMatches: result.totalMatches, returnedCount: result.returnedCount };
}
export function createSnapshotBridge(reader: SnapshotReader): SnapshotBridge {
  const run = (call: () => NativeResult) => {
    try { return present(call()); } catch { return bridgeFailure("SEARCH_FAILED"); }
  };
  const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const search = (input: unknown) => {
    if (!record(input) || Object.keys(input).some(key => !["lawId", "mst", "effectiveDate", "manifestSha256",
      "articleNumber", "queryText", "section", "matchCount", "applicableOn"].includes(key))) return bridgeFailure("INVALID_INPUT");
    if (input.applicableOn !== undefined) return bridgeFailure("UNSUPPORTED");
    if (!["lawId", "mst", "effectiveDate", "manifestSha256"].every(key => typeof input[key] === "string") ||
      !/^\d{6}$/.test(String(input.lawId)) || !/^[1-9]\d{0,15}$/.test(String(input.mst)) ||
      !/^\d{8}$/.test(String(input.effectiveDate)) || !/^[a-f0-9]{64}$/.test(String(input.manifestSha256)) ||
      (input.articleNumber !== undefined) === (input.queryText !== undefined) ||
      (input.articleNumber !== undefined && (typeof input.articleNumber !== "string" || input.articleNumber.length > 40 || !input.articleNumber.trim())) ||
      (input.queryText !== undefined && (typeof input.queryText !== "string" || input.queryText.length > 500 || !input.queryText.trim())) ||
      (input.section !== undefined && !["MAIN", "SUPPLEMENTARY", "ALL"].includes(String(input.section))) ||
      (input.matchCount !== undefined && (!Number.isInteger(input.matchCount) || Number(input.matchCount) < 1 || Number(input.matchCount) > 20)))
      return bridgeFailure("INVALID_INPUT");
    // Consult current catalog; never let a client choose a file/root or a fallback version.
    const listed = reader.listSnapshots();
    if (listed.state !== "OK") return present(listed);
    const laws = (listed.snapshots ?? []).filter(row => row.lawId === input.lawId);
    if (!laws.length) return bridgeFailure("LAW_NOT_HELD");
    if (!laws.some(row => row.mst === input.mst && row.effectiveDate === input.effectiveDate && row.manifestSha256 === input.manifestSha256))
      return bridgeFailure("VERSION_NOT_HELD");
    return reader.search(input);
  };
  // Native readReference independently reconstructs every reference field from pinned files.
  return Object.freeze({ list: () => run(() => reader.listSnapshots()),
    search: (input: unknown) => run(() => search(input)),
    reopen: (reference: unknown) => run(() => reader.readReference(reference)) });
}
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const samePath = (a: string, b: string) => process.platform === "win32" ?
  path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase() : path.resolve(a) === path.resolve(b);
function within(root: string, file: string) {
  const rel = path.relative(root, file);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
/** Native import occurs at request time only, after checking the complete pinned dependency closure.
 * No body, local path, credential, or supplier source is bundled/copied into the application.
 * Owner-managed source and restore directories must remain read-only while the host is running.
 */
export async function loadSnapshotBridge(settings: SnapshotSettings, source: ReaderSource): Promise<SnapshotBridge> {
  try {
    if (![settings.sourceRoot, settings.root, settings.catalogPath].every(path.isAbsolute) ||
      !/^[a-f0-9]{64}$/.test(settings.catalogSha256) ||
      !within(settings.root, settings.catalogPath)) throw new Error("INVALID_LOCAL_BINDING");
    for (const dir of [settings.sourceRoot, settings.root]) {
      if (!fs.lstatSync(dir).isDirectory() || !samePath(fs.realpathSync(dir), dir)) throw new Error("INVALID_LOCAL_BINDING");
    }
    if (!/^[a-f0-9]{40}$/.test(source.revision) || !/^[a-f0-9]{40}$/.test(source.tree) ||
      source.entry !== "src/statute-snapshot-reader.mjs" || !source.dependencyFiles.length) throw new Error("INVALID_SOURCE_BINDING");
    const seen = new Set<string>();
    for (const file of source.dependencyFiles) {
      if (!/^src\/[a-z0-9/-]+\.mjs$/.test(file.path) || seen.has(file.path) ||
        !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error("INVALID_SOURCE_BINDING");
      seen.add(file.path);
      const location = path.resolve(settings.sourceRoot, file.path), stat = fs.lstatSync(location);
      if (!within(settings.sourceRoot, location) || !stat.isFile() || !samePath(fs.realpathSync(location), location) ||
        stat.size !== file.bytes || digest(fs.readFileSync(location)) !== file.sha256) throw new Error("SOURCE_MISMATCH");
    }
    if (!seen.has(source.entry)) throw new Error("SOURCE_MISMATCH");
    const entry = pathToFileURL(path.join(settings.sourceRoot, source.entry)).href;
    const readerModule = await import(/* webpackIgnore: true */ entry) as {
      createStatuteSnapshotReader(settings: Omit<SnapshotSettings, "sourceRoot">): SnapshotReader;
    };
    return createSnapshotBridge(readerModule.createStatuteSnapshotReader(settings));
  } catch {
    // Never return OS/import errors or configured private paths.
    return Object.freeze({ list: () => bridgeFailure("INTEGRITY_ERROR"),
      search: () => bridgeFailure("INTEGRITY_ERROR"), reopen: () => bridgeFailure("INTEGRITY_ERROR") });
  }
}

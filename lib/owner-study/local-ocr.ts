import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, writeFile, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LOCAL_OCR_REQUEST_MS, LOCAL_OCR_UPLOAD_MS } from "./local-ocr-limits";

const MAX_BYTES = 8 * 1024 * 1024;
const ENGINE = "windows_builtin_ko";
export class LocalOcrError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}
export function isOwnerLocalOcrEnabled(env: NodeJS.ProcessEnv = process.env, platform = process.platform) {
  return platform === "win32" && env.INVERGE_LOCAL_OCR_ENABLED === "true" &&
    env.NODE_ENV === "development" && !env.VERCEL && !env.VERCEL_ENV && env.CI !== "true" &&
    ["http://127.0.0.1:55421", "http://127.0.0.1:55431"].includes(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
}
export function canUseOwnerLocalOcr(email: string | null | undefined, env: NodeJS.ProcessEnv = process.env, platform = process.platform) {
  const owners = (env.ALPHA_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  return isOwnerLocalOcrEnabled(env, platform) && Boolean(email && owners.includes(email.toLowerCase()));
}
// A page opened before a restart must never silently send its local upload to a provider.
export function resolveLocalOcrRequest(engine: string | null, enabled: boolean) {
  if (engine !== null && engine !== ENGINE) throw new LocalOcrError("LOCAL_OCR_UNSUPPORTED_ENGINE");
  if (engine === ENGINE && !enabled) throw new LocalOcrError("LOCAL_OCR_DISABLED");
  return engine === ENGINE;
}
export function assertLocalOcrTime(deadline: number, signal?: AbortSignal) {
  if (Date.now() >= deadline || signal?.aborted) throw new LocalOcrError("LOCAL_OCR_TIMEOUT");
}
export async function readLocalOcrForm(request: Request, requestDeadline = Date.now() + LOCAL_OCR_REQUEST_MS) {
  assertLocalOcrTime(requestDeadline, request.signal);
  const reader = request.body?.getReader();
  if (!reader) throw new LocalOcrError("LOCAL_OCR_INPUT_REQUIRED");
  const chunks: Uint8Array[] = [];
  let length = 0;
  const deadline = Math.min(requestDeadline, Date.now() + LOCAL_OCR_UPLOAD_MS);
  const cancel = () => { void reader.cancel().catch(() => {}); };
  const timer = setTimeout(cancel, Math.max(0, deadline - Date.now()));
  request.signal.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      const next = await reader.read();
      assertLocalOcrTime(deadline, request.signal);
      if (next.done) break;
      length += next.value.byteLength;
      if (length > MAX_BYTES + 65536) throw new LocalOcrError("LOCAL_OCR_SIZE_LIMIT");
      chunks.push(next.value);
    }
    const form = await new Response(Buffer.concat(chunks), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    assertLocalOcrTime(requestDeadline, request.signal);
    return form;
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error instanceof LocalOcrError ? error : new LocalOcrError("LOCAL_OCR_INVALID_FORM");
  } finally { clearTimeout(timer); request.signal.removeEventListener("abort", cancel); reader.releaseLock(); }
}
export function validateLocalOcrFiles(files: readonly Pick<File, "type" | "size">[]) {
  if (files.length < 1 || files.length > 4 || files.reduce((sum, file) => sum + file.size, 0) > MAX_BYTES) throw new LocalOcrError("LOCAL_OCR_SIZE_LIMIT");
  if (files.some(file => file.size <= 0 || !["image/png", "image/jpeg", "application/pdf"].includes(file.type))) throw new LocalOcrError("LOCAL_OCR_UNSUPPORTED_FILE");
  if (files.some(file => file.type === "application/pdf") && files.length !== 1) throw new LocalOcrError("LOCAL_OCR_SINGLE_PDF_REQUIRED");
}
export function validateLocalOcrSignature(type: string, bytes: Buffer) {
  const valid = type === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-" :
    type === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) :
      type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!valid) throw new LocalOcrError("LOCAL_OCR_UNSUPPORTED_FILE");
}
export function validateLocalOcrResponse(value: unknown): string[] {
  const response = value as { schemaVersion?: unknown; engine?: unknown; needsReview?: unknown; texts?: unknown };
  if (!response || response.schemaVersion !== "local_ocr_draft.v1" || response.engine !== ENGINE || response.needsReview !== true ||
    !Array.isArray(response.texts) || response.texts.length !== 1 || response.texts.some(text => typeof text !== "string" || !text.trim() || text.length > 40000)) throw new LocalOcrError("LOCAL_OCR_INVALID_RESPONSE");
  return response.texts as string[];
}
export function readPdfPageCount(info: string) {
  const matches = [...info.matchAll(/^Pages:\s+(\d+)\s*$/gm)];
  const count = matches.length === 1 ? Number(matches[0][1]) : 0;
  if (!Number.isInteger(count) || count < 1 || count > 4) throw new LocalOcrError("LOCAL_OCR_PAGE_LIMIT");
  if (!/^Encrypted:\s+no\s*$/m.test(info)) throw new LocalOcrError("LOCAL_OCR_ENCRYPTED_PDF");
  return count;
}
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function loadBuild() {
  const executable = path.resolve(".agent-factory/local-ocr/windows-ocr.exe");
  try {
    const build = JSON.parse(await readFile(path.resolve(".agent-factory/local-ocr/build.json"), "utf8"));
    if (build.schemaVersion !== "local_ocr_build.v1" ||
      build.sourceSha256 !== hash(await readFile(path.resolve("scripts/local/windows-ocr.cs"))) ||
      build.executableSha256 !== hash(await readFile(executable))) throw new LocalOcrError("LOCAL_OCR_BUILD_MISMATCH");
    return { executable, pdfTools: build.pdfTools as undefined | { renderer: string; info: string; rendererSha256: string; infoSha256: string } };
  } catch (error) { throw error instanceof LocalOcrError ? error : new LocalOcrError("LOCAL_OCR_ENGINE_UNAVAILABLE"); }
}
let active = false;
export async function extractWithLocalWindowsOcr(files: File[], options: { deadline?: number; signal?: AbortSignal } = {}) {
  if (!isOwnerLocalOcrEnabled()) throw new LocalOcrError("LOCAL_OCR_DISABLED");
  const deadline = options.deadline ?? Date.now() + LOCAL_OCR_REQUEST_MS;
  assertLocalOcrTime(deadline, options.signal);
  validateLocalOcrFiles(files);
  if (active) throw new LocalOcrError("LOCAL_OCR_BUSY");
  active = true;
  let directory: string | undefined;
  const tempRoot = path.resolve(os.tmpdir());
  try {
    const build = await loadBuild();
    assertLocalOcrTime(deadline, options.signal);
    directory = await mkdtemp(path.join(tempRoot, "inverge-local-ocr-"));
    const run = async (executable: string, args: string[]) => {
      assertLocalOcrTime(deadline, options.signal);
      return new Promise<string>((resolve, reject) => execFile(executable, args, {
        signal: options.signal,
        windowsHide: true, timeout: Math.min(45000, deadline - Date.now()), maxBuffer: 1024 * 1024, encoding: "utf8",
        env: { NODE_ENV: "development", SystemRoot: process.env.SystemRoot, TEMP: tempRoot, TMP: tempRoot },
      }, (error, stdout) => error ? reject(new LocalOcrError("LOCAL_OCR_PROCESS_FAILED")) : resolve(stdout)));
    };
    const images: string[] = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      const isPdf = file.type === "application/pdf";
      const input = path.join(directory, `input-${index}.${isPdf ? "pdf" : file.type === "image/png" ? "png" : "jpg"}`);
      const bytes = Buffer.from(await file.arrayBuffer());
      validateLocalOcrSignature(file.type, bytes);
      await writeFile(input, bytes, { flag: "wx", mode: 0o600 });
      if (!isPdf) { images.push(input); continue; }
      const tools = build.pdfTools;
      if (!tools) throw new LocalOcrError("LOCAL_OCR_PDF_RENDERER_UNAVAILABLE");
      if (!path.isAbsolute(tools.renderer) || !path.isAbsolute(tools.info) || path.basename(tools.renderer).toLowerCase() !== "pdftoppm.exe" ||
        path.basename(tools.info).toLowerCase() !== "pdfinfo.exe" ||
        tools.rendererSha256 !== hash(await readFile(tools.renderer)) || tools.infoSha256 !== hash(await readFile(tools.info))) throw new LocalOcrError("LOCAL_OCR_BUILD_MISMATCH");
      const count = readPdfPageCount(await run(tools.info, [input]));
      await run(tools.renderer, ["-f", "1", "-l", String(count), "-scale-to", "2000", "-png", input, path.join(directory, "page")]);
      const rendered = (await readdir(directory)).filter(name => /^page-\d+\.png$/.test(name)).sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
      if (rendered.length !== count) throw new LocalOcrError("LOCAL_OCR_PAGE_LIMIT");
      images.push(...rendered.map(name => path.join(directory!, name)));
    }
    const pages: Array<{ pageNumber: number; name: string; text: string }> = [];
    for (const input of images) {
      const output = await run(build.executable, [input]);
      let parsed: unknown;
      try { parsed = JSON.parse(output.replace(/^\uFEFF/, "")); } catch { throw new LocalOcrError("LOCAL_OCR_INVALID_RESPONSE"); }
      const [text] = validateLocalOcrResponse(parsed);
      pages.push({ pageNumber: pages.length + 1, name: `${pages.length + 1}페이지`, text });
    }
    assertLocalOcrTime(deadline, options.signal);
    return pages;
  } finally {
    try {
      // Only this request's freshly created directory is removable, never caller paths.
      if (directory && path.dirname(path.resolve(directory)) === tempRoot && path.basename(directory).startsWith("inverge-local-ocr-")) await rm(directory, { recursive: true, force: true });
    } finally { active = false; }
  }
}

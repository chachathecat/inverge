/** One Owner-approved case. Bodyless, durable, conservative reservations; no refunds/reset. */
import { open, readFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

export const THEORY_POLICY = Object.freeze({
  version: "owner-pc-theory-one-case-20260915-v1",
  model: "gemini-2.5-flash",
  budgetMicros: 5_000_000,
  inputTokenMaximum: 1_048_576,
  maxOutputTokens: 8_192,
  thinkingBudget: 1_024,
  // USD per million tokens: text input $0.30; output INCLUDING thinking $2.50.
  // Reserve the FULL model input window, not a character/token estimate. Also
  // count thinking separately for a conservative upper bound even when included.
  reservationMicros: 337_613,
  maximumCalls: 14,
});
export class OwnerTheoryError extends Error {
  constructor(code) { super(code); this.code = code; }
}
function fail(code) { throw new OwnerTheoryError(code); }
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const digest = value => createHash("sha256").update(value).digest("hex");
export function validateTheorySettings(settings, now = Date.now()) {
  if (!settings || settings.version !== THEORY_POLICY.version ||
      settings.model !== THEORY_POLICY.model || !uuid.test(settings.ownerId) ||
      !/^[a-z][a-z0-9-]{4,62}$/.test(settings.projectId ?? "") ||
      typeof settings.apiKey !== "string" || settings.apiKey.length < 20 ||
      settings.paidProjectVerified !== true || settings.dataSharingEnabled !== false ||
      !Number.isFinite(Date.parse(settings.verifiedAt)) || Date.parse(settings.verifiedAt) > now ||
      now - Date.parse(settings.verifiedAt) > 7 * 86400000 ||
      !/^[a-f0-9]{64}$/.test(settings.verificationEvidenceSha256 ?? "")) fail("OWNER_THEORY_PAID_CONFIGURATION_REQUIRED");
  return settings;
}
function binding(settings) {
  return { version: THEORY_POLICY.version, ownerId: settings.ownerId,
    projectId: settings.projectId, model: settings.model, keySha256: digest(settings.apiKey),
    budgetMicros: THEORY_POLICY.budgetMicros, reservationMicros: THEORY_POLICY.reservationMicros,
    maximumCalls: THEORY_POLICY.maximumCalls };
}
async function durableCreate(file, value) {
  const handle = await open(file, "wx", 0o600);
  try { await handle.writeFile(JSON.stringify(value) + "\n"); await handle.sync(); }
  finally { await handle.close(); }
}
export async function initializeTheoryBudget(root, settings) {
  validateTheorySettings(settings);
  // Explicit installation only. Existing directory, even incomplete, is never reset.
  await mkdir(root);
  await durableCreate(path.join(root, "installation.json"), binding(settings));
}
export async function readTheoryBudget(root, settings) {
  const installed = JSON.parse(await readFile(path.join(root, "installation.json"), "utf8"));
  if (JSON.stringify(installed) !== JSON.stringify(binding(settings))) fail("OWNER_THEORY_BUDGET_BINDING_CHANGED");
  const files = await readdir(root);
  const slots = files.filter(name => /^call-(?:0[1-9]|1[0-4])\.json$/.test(name));
  if (files.some(name => name !== "installation.json" && name !== "case.json" && !slots.includes(name))) fail("OWNER_THEORY_BUDGET_INVALID");
  let caseId = null;
  try { caseId = JSON.parse(await readFile(path.join(root, "case.json"), "utf8")).sourceItemId; }
  catch (error) { if (error.code !== "ENOENT") fail("OWNER_THEORY_CASE_INVALID"); }
  if ((slots.length > 0 && caseId === null) || (caseId !== null && !uuid.test(caseId))) fail("OWNER_THEORY_CASE_INVALID");
  return { usedReservations: slots.length, reservedMicros: slots.length * THEORY_POLICY.reservationMicros,
    remainingMicros: THEORY_POLICY.budgetMicros - slots.length * THEORY_POLICY.reservationMicros,
    remainingCalls: THEORY_POLICY.maximumCalls - slots.length, caseId };
}
export async function reserveTheoryCall(root, settings, authority) {
  validateTheorySettings(settings);
  if (authority?.userId !== settings.ownerId || !uuid.test(authority?.sourceItemId ?? "") ||
      !["app1_initial_analysis", "repair_verification"].includes(authority?.purpose)) fail("OWNER_THEORY_SUBMISSION_REQUIRED");
  await readTheoryBudget(root, settings);
  try { await durableCreate(path.join(root, "case.json"), { sourceItemId: authority.sourceItemId }); }
  catch (error) { if (error.code !== "EEXIST") throw error; }
  // A concurrent incomplete case write fails closed; never select a second case.
  const selected = JSON.parse(await readFile(path.join(root, "case.json"), "utf8"));
  if (selected.sourceItemId !== authority.sourceItemId) fail("OWNER_THEORY_ONE_CASE_ONLY");
  for (let slot = 1; slot <= THEORY_POLICY.maximumCalls; slot++) {
    const name = `call-${String(slot).padStart(2, "0")}.json`;
    try {
      // Atomic exclusive creation across processes; fsync BEFORE any provider I/O.
      // Partial, pending, failed and successful reservations all consume the full cap.
      await durableCreate(path.join(root, name), { slot, purpose: authority.purpose,
        reservedMicros: THEORY_POLICY.reservationMicros, createdAt: new Date().toISOString() });
      return slot;
    } catch (error) { if (error.code !== "EEXIST") throw error; }
  }
  fail("OWNER_THEORY_BUDGET_EXHAUSTED");
}
export async function generateOwnerTheory(root, settings, authority, request, transport = fetch) {
  if (!request || Object.keys(request).some(key => !["contents", "generationConfig"].includes(key)) ||
      request.contents?.length !== 1 || request.contents[0].role !== "user" ||
      !Array.isArray(request.contents[0].parts) || request.contents[0].parts.some(part =>
        !part || Object.keys(part).length !== 1 || typeof part.text !== "string") ||
      Buffer.byteLength(JSON.stringify(request), "utf8") > 131072) fail("OWNER_THEORY_TEXT_ONLY");
  const generationConfig = request.generationConfig;
  if (!generationConfig || Object.keys(generationConfig).some(key =>
    !["temperature", "responseMimeType", "responseSchema"].includes(key))) fail("OWNER_THEORY_REQUEST_INVALID");
  const body = JSON.stringify({ ...request, generationConfig: { ...generationConfig,
    candidateCount: 1, maxOutputTokens: THEORY_POLICY.maxOutputTokens,
    thinkingConfig: { thinkingBudget: THEORY_POLICY.thinkingBudget } } });
  await reserveTheoryCall(root, settings, authority);
  // No SDK retry, batch, cache creation, tools, grounding, file upload or model fallback.
  // A timeout/unknown outcome keeps its reservation. Only a new Owner click can retry.
  const response = await transport(`https://generativelanguage.googleapis.com/v1beta/models/${THEORY_POLICY.model}:generateContent`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": settings.apiKey },
    body, signal: AbortSignal.timeout(60000), redirect: "error",
  });
  if (!response.ok) fail("OWNER_THEORY_PROVIDER_FAILED");
  const result = await response.json();
  if (result.candidates?.length !== 1 || result.candidates[0].finishReason !== "STOP") fail("OWNER_THEORY_RESPONSE_INCOMPLETE");
  const text = result.candidates[0].content?.parts?.filter(part => !part.thought && typeof part.text === "string").map(part => part.text).join("");
  if (!text) fail("OWNER_THEORY_RESPONSE_INCOMPLETE");
  return { response: { text: () => text } };
}

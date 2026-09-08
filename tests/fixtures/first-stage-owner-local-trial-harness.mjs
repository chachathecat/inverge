import { createHash } from "node:crypto";
import { NextRequest } from "next/server.js";
import { syntheticReviewInputs } from "./economics-runtime-candidate-harness.mjs";
import { prepareEconomicsRuntimeCandidate } from "../../scripts/content-review/prepare-economics-runtime-candidate.mjs";
import { loadOwnerLocalR3TrialContent } from "../../lib/review-os/first-stage/runtime/owner-local-trial-content.ts";
import { createOwnerLocalTrialApplication } from "../../lib/review-os/first-stage/runtime/owner-local-trial-context.ts";
import { harness as storeHarness } from "./first-stage-private-session-harness.mjs";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
export function syntheticTrialInput(options) {
  const inputs = syntheticReviewInputs(options);
  inputs.sourceObservationSource = JSON.stringify({ posts: [
    { articleId: "5231525", displayedLicense: "KOGL_TYPE_1_ATTRIBUTION", downloadedAttachmentIds: ["2230215"] },
    { articleId: "5246129", displayedLicense: "KOGL_TYPE_1_ATTRIBUTION", downloadedAttachmentIds: ["2243629"] }] });
  const { candidate } = prepareEconomicsRuntimeCandidate(inputs); candidate.dataClass = "synthetic_test_only";
  const key = JSON.stringify("synthetic-key-asset-bytes");
  const keyObservation = { schemaVersion: "issue883.r3.ai_key_observation.v1", humanReview: false,
    method: "AI_visual_transcription_of_preserved_official_key_images", keyBookletExplicit: null,
    keyFileSha256: sha(key), groups: ["civil_law","economics_principles","real_estate_principles","appraiser_related_law","accounting"]
      .map((subject,i) => ({ subject, session: i < 3 ? 1 : 2, firstQuestion: [1,41,81,1,41][i], answers: Array.from({length:40},()=>[2]) })) };
  const artifacts = Object.fromEntries(Object.entries({ candidate: JSON.stringify(candidate), review: inputs.reviewSource,
    calculations: inputs.calculationSource, ai: inputs.aiEvidenceSource, observation: inputs.sourceObservationSource,
    checklist: inputs.humanChecklistSource, pdf: JSON.stringify("synthetic-q1-asset-bytes"), key, keyObservation: JSON.stringify(keyObservation) })
    .map(([k,v])=>[k,Buffer.from(v)]));
  const input = { expectedDataClass: "synthetic_test_only", installation: { schemaVersion: "first_stage.owner_local_r3_installation.v1",
    dataClass: "synthetic_test_only", fileSha256: Object.fromEntries(Object.entries(artifacts).map(([k,v])=>[k,sha(v)])) },
    readArtifact: async name => artifacts[name] };
  return { input, artifacts, rebind(name, value) { artifacts[name] = Buffer.from(JSON.stringify(value)); input.installation.fileSha256[name] = sha(artifacts[name]); } };
}
export function trialHarness(options = {}) {
  const fixture = options.fixture ?? syntheticTrialInput(), store = storeHarness({ store: options.store, rows: options.rows });
  const env = { NODE_ENV: "development", NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:55421",
    INVERGE_OWNER_ECONOMICS_R3_TRIAL_ENABLED: "true", INVERGE_OWNER_FIRST_STAGE_KERNEL_ENABLED: "true",
    ALPHA_ADMIN_EMAILS: "synthetic@example.test", INVERGE_OWNER_FIRST_STAGE_EMAILS: "synthetic@example.test", ...options.env };
  let catalogReads = 0;
  const planningRows=options.planningRows ?? new Map();
  const planningStore=options.planningStore ?? {
    async load(ownerId) {return structuredClone(planningRows.get(ownerId) ?? null);},
    async save(value,expected) { if((planningRows.get(value.ownerId)?.revision??0)!==expected)return false;
      planningRows.set(value.ownerId,structuredClone(value));return true; },
  };
  const application = createOwnerLocalTrialApplication({ environment: () => env,
    session: async () => ({ isAuthenticated: true, isDemo: false, source: "supabase", userId: "synthetic-owner", email: "synthetic@example.test", ...options.session }),
    catalog: async () => { catalogReads++; return await loadOwnerLocalR3TrialContent(fixture.input); },
    repository: () => store.store, planningRepository:()=>planningStore, now: store.getClock });
  const send = async (body, query = "") => {
    const response = await application(new NextRequest(`http://127.0.0.1:3883/api/trial${query}`, body === undefined ? {headers:{host:"127.0.0.1:3883"}} : {
      method: "POST", headers: { host:"127.0.0.1:3883", "content-type": "application/json", origin: "http://127.0.0.1:3883" }, body: JSON.stringify(body) }));
    return { status: response.status, headers: response.headers, body: await response.json() };
  };
  return { ...store, fixture, send, application, env, planningRows, planningStore, catalogReads: () => catalogReads };
}
export async function startTrial(h) {
  const created = await h.send({ action: "create", requestId: "create-1", questionId: "qnet-2025-36-s1-A-46" });
  if (created.status !== 200) throw new Error(`synthetic_trial_create_failed_${created.status}`);
  const sessionId = created.body.view.sessionId;
  const begun = await h.send({ sessionId, command: { action: "begin", requestId: "begin-1", expectedRevision: 1,
    questionId: "qnet-2025-36-s1-A-46" } });
  return { sessionId, attemptId: begun.body.view.attempt.attemptId, begun };
}

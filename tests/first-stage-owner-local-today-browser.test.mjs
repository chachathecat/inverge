import test from "node:test";
import { trialHarness, syntheticTrialInput } from "./fixtures/first-stage-owner-local-trial-harness.mjs";
import { verifyOwnerLocalTodayBrowser } from "./fixtures/owner-local-today-browser-harness.mjs";

test("S01/S04/S07/S11/S13 Today browser persists preferences, starts exact action, recovers lost response and replans",{timeout:90_000},async()=>{
  const h=trialHarness({fixture:syntheticTrialInput({numericTrialModels:true})});h.setClock("2026-09-08T00:00:00.000Z");
  await verifyOwnerLocalTodayBrowser(h);
});

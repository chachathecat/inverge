import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/beta-account-durable-target-setup-runbook.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

function expectIncludes(text, phrases) {
  phrases.forEach((phrase) => assert.equal(text.includes(phrase), true, `expected ${phrase}`));
}

test("beta account durable target setup runbook doc exists and preserves Conditional Go", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  expectIncludes(doc, [
    "Beta Account & Durable Target Setup Runbook v1",
    "Unblock durable invited-account persistence proof",
    "3 to 5 trusted invited users",
    "Conditional Go until durable proof is executed",
    "not a runtime implementation plan",
  ]);
});

test("beta account durable target setup runbook includes non-production durable target requirements", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Non-production Durable Target Requirements",
    "be non-production",
    "be clearly labeled as beta, staging, or non-production",
    "contain no real user data",
    "contain no Q-Net raw official materials",
    "contain no local official materials",
    "support safe reset after beta",
    "allow account-level save, refresh, Today Plan, Review Queue, and Notes proof",
  ]);
});

test("beta account durable target setup runbook includes learner-only invited account requirements", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Invited Beta Account Requirements",
    "Create **3 to 5 trusted invited users only**",
    "Use test or beta learner accounts",
    "Use learner role only",
    "Do not grant instructor or admin privileges",
    "Do not commit shared credentials",
    "Do not write credentials in docs",
    "Do not write credentials in the PR body",
    "Assign each account a user alias for reports",
  ]);
});

test("beta account durable target setup runbook includes secret handling rules", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Secret Handling",
    "Store secrets only in an approved local or hosting secret manager",
    "credentials",
    "secrets",
    "`.env`",
    "`.env.local`",
    "session dumps",
    "cookies",
    "auth tokens",
    "database URLs",
    "service role keys",
    "Supabase keys",
    "passwords",
    "rotate the exposed secret immediately",
    "mark beta paused",
  ]);
});

test("beta account durable target setup runbook includes setup checklist and durable proof scenarios A-J", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Setup Checklist",
    "Create or confirm the non-production durable target",
    "Confirm auth mode",
    "Confirm persistence mode can produce `durable_saved`",
    "Confirm browser-local fallback still produces `local_fallback_saved`",
    "Confirm save failure simulation or recovery path",
    "Confirm no instructor/admin route exposure to learners",
    "Durable Proof Scenarios To Run After Setup",
    "| A | invited learner sign-in",
    "| B | capture note save",
    "| C | refresh preserves note",
    "| D | Today Plan reflects saved note",
    "| E | Review Queue reflects saved note",
    "| F | Notes reflects saved note",
    "| G | provider-free telemetry records durable_saved loop evidence",
    "| H | local fallback remains clearly labeled",
    "| I | save_failed remains excluded from ready queue evidence",
    "| J | sign-out / different account isolation check",
  ]);
});

test("beta account durable target setup runbook includes account isolation, reset, cleanup, stop rules, and evidence template", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Account Isolation Checks",
    "Account A must not see Account B learner notes",
    "Local fallback records must not be mislabeled as durable account saves",
    "Reset And Cleanup",
    "Reset beta data only in the non-production durable target",
    "Remove invited accounts after beta",
    "Preserve only metadata-only reports in the repo",
    "Stop Rules",
    "durable target uses production data accidentally",
    "credentials or secrets are committed or exposed",
    "learner sees instructor/admin route",
    "account isolation fails",
    "persistence copy overclaims durable save",
    "`save_failed` appears as ready Review Queue evidence",
    "Evidence Report Template",
    "date:",
    "tester:",
    "target label:",
    "account alias:",
    "auth mode:",
    "persistence mode:",
    "durable_saved evidence:",
    "local_fallback_saved evidence:",
    "save_failed evidence:",
    "account isolation result:",
    "boundary safety result:",
    "follow-up PR:",
    "final status: pass / partial / blocked",
  ]);
});

test("beta account durable target setup runbook includes required safety boundaries and validation commands", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "no credentials committed",
    "no secrets committed",
    "no `.env` committed",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no raw official text",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no payment",
    "no analytics provider calls",
    "no AI provider calls",
    "no raw learner text in reports",
    "no screenshots or raw uploads committed",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ]);
});

test("beta account durable target setup runbook avoids credentials, secrets, token-like placeholders, local paths, screenshots, raw binaries, committed uploads, OCR full text, and raw answer/problem examples", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /[A-Za-z]:\\/);
  assert.doesNotMatch(doc, /file:\/\//i);
  assert.doesNotMatch(doc, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(doc, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(doc, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(doc, /temp(?:orary)? file/i);
  assert.doesNotMatch(doc, /committed uploads?:\s*.+/i);
  assert.doesNotMatch(doc, /(?:password|secret|token|service[_ -]?role|database[_ -]?url|supabase[_ -]?key)\s*[:=]\s*["']?[^,\s`]+/i);
  assert.doesNotMatch(doc, /(?:sk_live|sk_test|eyJ[A-Za-z0-9_-]{8,}|sbp_[A-Za-z0-9_-]+)/i);
  assert.doesNotMatch(doc, /raw official problem text\s*:/i);
  assert.doesNotMatch(doc, /raw official answer text\s*:/i);
  assert.doesNotMatch(doc, /OCR full text\s*:/i);
  assert.doesNotMatch(doc, /raw learner answer text\s*:/i);
  assert.doesNotMatch(doc, /raw learner problem text\s*:/i);
});

test("beta account durable target setup runbook test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/beta-account-durable-target-setup-runbook.test.mjs"), true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/account-backed-review-completion-setup-runbook.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

function expectIncludes(text, phrases) {
  phrases.forEach((phrase) => assert.equal(text.includes(phrase), true, `expected ${phrase}`));
}

test("account-backed Review completion setup runbook doc exists and preserves Conditional Go", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  expectIncludes(doc, [
    "Account-backed Review Completion Setup Runbook v1",
    "Close the account-backed Review completion partial from #382",
    "Prove a durable learner-owned Review Queue item can be completed and stay completed after refresh",
    "Conditional Go until account-backed Review completion proof is executed",
  ]);
});

test("account-backed Review completion setup runbook includes preconditions and safe data requirements", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Preconditions",
    "Approved non-production durable target is ready",
    "Learner-only invited beta account exists",
    "No instructor/admin account is used",
    "No production data is used",
    "No Q-Net/raw official material is used",
    "No raw learner text is committed",
    "Support and stop-rule process from closed beta docs is available",
    "Safe Data Requirements",
    "Use only synthetic learner-owned study note",
    "Use no official problem text",
    "Use no official answer text",
    "Commit no OCR full text",
    "Commit no screenshots",
    "Commit no raw upload",
    "Evidence must be metadata-only",
  ]);
});

test("account-backed Review completion setup runbook includes setup scenarios A-N", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Setup Scenarios",
    "| A | invited learner signs in.",
    "| B | learner creates or has a durable_saved capture note.",
    "| C | note produces or maps to a Review Queue item.",
    "| D | Review Queue item appears under learner account.",
    "| E | Review item shows due/reason copy.",
    "| F | learner completes Review action.",
    "| G | completion state is visible.",
    "| H | completed item no longer behaves like an unstarted primary item.",
    "| I | refresh preserves completion state if durable path supports it.",
    "| J | provider-free telemetry records review_completed.",
    "| K | Account A cannot see Account B review item.",
    "| L | save_failed item does not appear as ready Review Queue evidence.",
    "| M | learner does not see instructor/admin console.",
    "| N | no official grading/model-answer/score/pass-fail appears.",
  ]);
});

test("account-backed Review completion setup runbook includes evidence fields and completion rules", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Evidence Table Fields",
    "scenario",
    "status: pass / partial / blocked / not_applicable",
    "route",
    "account alias",
    "account mode",
    "persistence status:",
    "review item state",
    "telemetry status",
    "evidence summary",
    "follow-up needed",
    "Completion Rules",
    "`durable_saved` review completion can count as account-backed Review completion evidence",
    "`local_fallback_saved` can count as local beta evidence only",
    "`save_failed` cannot count as Review completion evidence",
    "Completed item must not be shown as the same unstarted primary action",
    "Completion copy must not imply score/pass/fail or official grading",
    "Completion must remain learner-owned and action-oriented",
  ]);
});

test("account-backed Review completion setup runbook includes stop rules, follow-up criteria, and evidence template", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "Stop Rules",
    "learner sees official grading/model-answer/score/pass-fail",
    "learner sees instructor/admin console",
    "Account A sees Account B review item",
    "`save_failed` appears as ready Review Queue evidence",
    "persistence copy overclaims durable save",
    "credentials or secrets are exposed",
    "Follow-up Implementation Criteria",
    "missing durable target",
    "missing learner-only invited account",
    "missing durable Review Queue item creation",
    "missing completion UI",
    "missing refresh persistence",
    "missing telemetry reflection",
    "account isolation issue",
    "Evidence Report Template",
    "date:",
    "tester:",
    "target label:",
    "account alias:",
    "capture/note source:",
    "Review Queue item id or safe alias:",
    "before completion state:",
    "after completion state:",
    "refresh result:",
    "telemetry result:",
    "account isolation result:",
    "final status: pass / partial / blocked",
    "follow-up PR:",
  ]);
});

test("account-backed Review completion setup runbook includes required safety boundaries and validation commands", () => {
  const doc = read(docPath);

  expectIncludes(doc, [
    "no credentials committed",
    "no secrets committed",
    "no `.env` committed",
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no raw official text",
    "no raw learner text",
    "no OCR full text",
    "no screenshots committed",
    "no raw uploads committed",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no payment",
    "no analytics provider calls",
    "no AI provider calls",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd run test -- --workers=1",
    "npm.cmd run check:closed-beta-readiness",
    "npm.cmd run verify:learner-loop:ci",
    "npm.cmd run build",
  ]);
});

test("account-backed Review completion setup runbook avoids credentials, secrets, token-like placeholders, local paths, screenshots, transient files, raw binaries, committed uploads, OCR full text examples, and raw learner answer/problem examples", () => {
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

test("account-backed Review completion setup runbook test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/account-backed-review-completion-setup-runbook.test.mjs"), true);
});

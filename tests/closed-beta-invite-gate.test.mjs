import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const docPath = "docs/closed-beta-invite-gate.md";
const runnerPath = "scripts/run-node-tests.mjs";

function read(file) {
  return readFileSync(file, "utf8");
}

test("closed beta invite gate doc exists and states Conditional Go scope", () => {
  assert.equal(existsSync(docPath), true, `${docPath} should exist`);
  const doc = read(docPath);

  assert.equal(doc.includes("Conditional Go, not full production readiness"), true);
  assert.equal(doc.includes("3 to 5 trusted invited users only"), true);
  assert.equal(doc.includes("durable invited-account persistence remains partial"), true);
  assert.equal(doc.includes("full OCR/PDF upload smoke remains partial"), true);
  assert.equal(doc.includes("visible Review completion runtime proof remains partial"), true);
});

test("closed beta invite gate doc includes required operating sections and loop", () => {
  const doc = read(docPath);

  [
    "## Purpose",
    "## Eligible Invited User Profile",
    "## What Users May Test",
    "## What Users Must Not Expect",
    "## Known Limitations",
    "## Safety Boundaries",
    "## Support / Bug Report Template",
    "## Daily Monitoring Checklist",
    "## Weekly Monitoring Checklist",
    "## Stop Rules",
    "## Conditional Go Rules",
    "## No-Go Escalation Rules",
    "## Next Follow-up PRs",
    "Capture -> learner-owned note -> biggest gap -> next action -> Today Plan task -> Review Queue item -> Notes reflection -> loop_closed",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("closed beta invite gate doc includes safety boundaries, stop rules, and metrics", () => {
  const doc = read(docPath);

  [
    "no local_official_materials",
    "no qnet_manifest.json",
    "no raw Q-Net",
    "no official grading/model-answer/score/pass-fail",
    "no public archive UI",
    "no instructor-console learner exposure",
    "no payment",
    "no analytics provider calls",
    "no AI provider calls",
    "persistence copy overclaims durable save",
    "save_failed appears as ready Review Queue evidence",
    "telemetry stores raw learner text or forbidden fields",
    "first capture completed",
    "note saved",
    "biggest gap generated",
    "next action generated",
    "Today Plan task selected",
    "Review Queue item created",
    "Notes reflected",
    "loop_closed",
    "durable_loop_closed",
    "local_fallback_loop",
    "save_failed",
    "OCR correction friction",
    "support issues",
    "user qualitative feedback",
  ].forEach((phrase) => assert.equal(doc.includes(phrase), true, `doc should include ${phrase}`));
});

test("closed beta invite gate doc avoids local raw paths, screenshots, temp files, and official body examples", () => {
  const doc = read(docPath);

  assert.doesNotMatch(doc, /[A-Za-z]:\\/);
  assert.doesNotMatch(doc, /file:\/\//i);
  assert.doesNotMatch(doc, /(?:^|[\\/])(?:Users|AppData|Temp|tmp|Downloads|Desktop)[\\/]/i);
  assert.doesNotMatch(doc, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|gif|webp|bmp|tiff?)\b/i);
  assert.doesNotMatch(doc, /screenshot[s]?[\\/]/i);
  assert.doesNotMatch(doc, /temp(?:orary)? file/i);
  assert.doesNotMatch(doc, /raw official problem text\s*:/i);
  assert.doesNotMatch(doc, /raw official answer text\s*:/i);
  assert.doesNotMatch(doc, /OCR full text\s*:/i);
  assert.doesNotMatch(doc, /official answer body\s*:/i);
});

test("closed beta invite gate test is hooked into the node runner", () => {
  const runner = read(runnerPath);
  assert.equal(runner.includes("tests/closed-beta-invite-gate.test.mjs"), true);
});

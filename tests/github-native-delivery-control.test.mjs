import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const DECISION =
  "docs/decisions/2026-08-16-owner-github-native-delivery-control.md";

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

test("dated Owner decision is installed at the top of repository authority", async () => {
  const [agents, decision] = await Promise.all([
    read("AGENTS.md"),
    read(DECISION),
  ]);

  assert.match(agents, new RegExp(DECISION.replaceAll(".", "\\.")));
  assert.match(decision, /PR #743 is terminally closed unmerged/);
  assert.match(decision, /GitHub is the sole delivery trust boundary/);
});

test("delivery remains native, single-writer and expected-head protected", async () => {
  const decision = await read(DECISION);
  const prose = decision.replace(/\s+/g, " ");

  for (const required of [
    "Exactly one merge-producing writer",
    "feature branch, ordinary non-force push and pull request",
    "current PR head and the latest base required by the ruleset",
    "fresh exact-head Codex review",
    "actionable P0/P1/P2 as `0/0/0`",
    "squash-only and pinned to the reviewed expected head",
  ]) {
    assert.ok(prose.includes(required), `missing delivery rule: ${required}`);
  }

  assert.match(decision, /Direct `main` push, force push, rebase, amend and history rewrite are\s+prohibited/);
});

test("repair and replan budgets fail closed without recursive receipt machinery", async () => {
  const decision = await read(DECISION);

  assert.match(decision, /at most two source corrections and three exact-head review\s+cycles/);
  assert.match(decision, /at most two clean replans/);
  assert.match(decision, /same actionable\s+P0\/P1 persists after both clean replans/);
  assert.match(decision, /An actionable P2 cannot be waived for merge/);
  assert.match(decision, /close that candidate unmerged, record the P2\s+in backlog/);
  assert.match(decision, /not a third replan or an Owner interruption/);
  assert.match(decision, /If the persistent P2 affects mandatory scope/);
  assert.match(decision, /structurally reduce it to a smaller independently complete outcome/);
  assert.match(decision, /not a\s+third clean replan/);
  assert.match(decision, /material product-scope or learner-promise change/);
  assert.match(decision, /must not maintain an alternate delivery receipt/);
  assert.doesNotMatch(decision, /\b[0-9a-f]{40}\b/i);
});

test("automatic continuation remains bounded to authorized non-Production work", async () => {
  const [decision, roadmap] = await Promise.all([
    read(DECISION),
    read("roadmap/active-program.yml"),
  ]);

  assert.match(decision, /begin the dependency-ready non-Production\s+stage/);
  assert.match(decision, /Continue subsequent dependency-ready non-Production stages/);
  assert.match(decision, /Production migration, RLS or Storage apply/);
  assert.match(decision, /actual charge, price, refund, checkout or payment activation/);
  assert.match(decision, /rights-unclear content operation/);
  assert.match(decision, /destructive or irreversible data operation/);

  assert.match(roadmap, /currentReplacementStage: C2R-C-T/);
  assert.match(roadmap, /currentReplacementStageIssue: 703/);
  assert.match(roadmap, /c2rCPState: complete_practice_runtime/);
  assert.match(roadmap, /c2rCTState: authorized_unstarted/);
});

test("focused delivery-control test is registered in the default runner", async () => {
  const runner = await read("scripts/run-node-tests.mjs");
  assert.match(runner, /tests\/github-native-delivery-control\.test\.mjs/);
});

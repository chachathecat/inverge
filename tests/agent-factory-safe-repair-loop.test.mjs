import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  assertSafeRepairPlanOutputSafe,
  createSafeRepairPlan,
} from "../lib/agent-factory/safe-repair-loop.ts";

const BASE_SHA = "a".repeat(40);
const HEAD_SHA = "b".repeat(40);
const REPAIR_SCRIPT = path.resolve("scripts/agent-factory-repair-plan.mjs");

function check(name, conclusion = "FAILURE", overrides = {}) {
  return {
    name,
    workflowName: overrides.workflowName ?? "Fast CI",
    status: overrides.status ?? "COMPLETED",
    conclusion,
    required: overrides.required ?? true,
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    repo: "chachathecat/inverge",
    number: 457,
    title: "[AF004] Safe Repair Loop and Patch Plan Generator v1",
    state: "OPEN",
    isDraft: false,
    baseRefOid: BASE_SHA,
    headRefOid: HEAD_SHA,
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    labels: [],
    files: [{ path: "lib/agent-factory/safe-repair-loop.ts" }],
    statusCheckRollup: [],
    ...overrides,
  };
}

function planForCheck(name, overrides = {}) {
  return createSafeRepairPlan(
    snapshot({
      statusCheckRollup: [check(name, "FAILURE", overrides.checkOverrides ?? {})],
      ...overrides.snapshotOverrides,
    }),
    overrides.options,
  );
}

test("PR Contract failure routes to pr_body_repair with AF003 handoff", () => {
  const plan = planForCheck("Validate PR Contract");

  assert.equal(plan.repairDomain, "pr_body_repair");
  assert.equal(plan.repairAllowed, true);
  assert.equal(plan.validationCommands[0], "npm.cmd run agent-factory:doctor-pr-body -- --body .agent-factory/pr-body.md --issue 457");
  assert.match(plan.repairPrompt, /AF003 PR Contract Doctor handoff/);
  assert.match(plan.repairPrompt, /agent-factory:doctor-pr-body/);
});

test("typecheck failure produces bounded type repair prompt and typecheck validation", () => {
  const plan = planForCheck("typecheck");

  assert.equal(plan.repairDomain, "typecheck_repair");
  assert.equal(plan.repairAllowed, true);
  assert.equal(plan.validationCommands[0], "npm.cmd run typecheck");
  assert.match(plan.repairPrompt, /Fix TypeScript errors/);
  assert.match(plan.repairPrompt, /Do not silence the compiler/);
});

test("lint failure produces lint repair prompt and lint validation", () => {
  const plan = planForCheck("eslint lint");

  assert.equal(plan.repairDomain, "lint_repair");
  assert.equal(plan.repairAllowed, true);
  assert.equal(plan.validationCommands[0], "npm.cmd run lint");
  assert.match(plan.repairPrompt, /Fix ESLint violations/);
  assert.match(plan.repairPrompt, /Do not disable rules globally/);
});

test("focused test failure includes the focused test command first", () => {
  const plan = planForCheck("focused test: tests/agent-factory-safe-repair-loop.test.mjs");

  assert.equal(plan.repairDomain, "focused_test_repair");
  assert.equal(
    plan.validationCommands[0],
    "node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs --test tests/agent-factory-safe-repair-loop.test.mjs",
  );
  assert.match(plan.repairPrompt, /Reproduce the focused failing test first/);
});

test("unit test failure includes full node test rerun", () => {
  const plan = planForCheck("unit tests");

  assert.equal(plan.repairDomain, "unit_test_repair");
  assert.equal(plan.validationCommands[0], "npm.cmd run test -- --workers=1");
  assert.match(plan.repairPrompt, /full node test command/);
});

test("build failure includes build validation and avoids unrelated UI/product rewrites", () => {
  const plan = planForCheck("next build");

  assert.equal(plan.repairDomain, "build_repair");
  assert.equal(plan.validationCommands[0], "npm.cmd run build");
  assert.match(plan.repairPrompt, /without unrelated UI\/product rewrites/);
  assert.match(plan.scopeLimits.join("\n"), /avoid unrelated UI, product copy/);
});

test("closed-beta readiness failure requires human review when runtime evidence is implicated", () => {
  const plan = planForCheck("check:closed-beta-readiness runtime evidence", {
    checkOverrides: { workflowName: "Full CI" },
  });

  assert.equal(plan.repairDomain, "closed_beta_readiness_repair");
  assert.equal(plan.repairAllowed, false);
  assert.equal(plan.humanApprovalRequired, true);
  assert.ok(plan.blockedReasons.some((reason) => reason.includes("runtime evidence")));
  assert.match(plan.repairPrompt, /Do not mark runtime evidence complete/);
});

test("learner-loop quality failure includes quality eval caution and does not weaken thresholds", () => {
  const plan = planForCheck("verify:learner-loop:ci quality eval");

  assert.equal(plan.repairDomain, "learner_loop_repair");
  assert.equal(plan.repairAllowed, true);
  assert.equal(plan.validationCommands[0], "npm.cmd run verify:learner-loop:ci");
  assert.match(plan.repairPrompt, /Do not lower quality\/eval thresholds/);
});

test("rebase or behind-main state produces rebase guidance, not repair prompt", () => {
  const plan = createSafeRepairPlan(
    snapshot({
      mergeability: "behind_main",
      statusCheckRollup: [check("typecheck")],
    }),
  );

  assert.equal(plan.repairDomain, "rebase_required");
  assert.equal(plan.repairAllowed, false);
  assert.match(plan.repairPrompt, /update the branch/i);
  assert.match(plan.repairPrompt, /Do not perform source repair/);
});

test("high-risk path hints force blocked or human approval", () => {
  const plan = createSafeRepairPlan(
    snapshot({
      files: [{ path: "app/api/auth/callback/route.ts" }],
      statusCheckRollup: [check("typecheck")],
    }),
  );

  assert.equal(plan.repairDomain, "blocked");
  assert.equal(plan.repairAllowed, false);
  assert.equal(plan.humanApprovalRequired, true);
  assert.ok(plan.blockedReasons.some((reason) => reason.includes("High-risk path")));
  assert.ok(plan.filesForbidden.some((entry) => entry.includes("matched high-risk path")));
});

test("unknown failure defaults to human review", () => {
  const plan = planForCheck("mystery infrastructure job");

  assert.equal(plan.repairDomain, "human_review_required");
  assert.equal(plan.repairAllowed, false);
  assert.ok(plan.blockedReasons.some((reason) => reason.includes("ambiguous")));
});

test("output contains no secret-looking keys or raw-content fields", () => {
  const plan = createSafeRepairPlan(
    snapshot({
      secretToken: "ghp_should_not_escape",
      rawAnswer: "learner answer must not escape",
      ocrText: "ocr text must not escape",
      providerPayload: { body: "provider payload must not escape" },
      statusCheckRollup: [check("typecheck")],
    }),
  );
  const serialized = JSON.stringify(plan);

  assert.doesNotThrow(() => assertSafeRepairPlanOutputSafe(plan));
  assert.equal(serialized.includes("secretToken"), false);
  assert.equal(serialized.includes("rawAnswer"), false);
  assert.equal(serialized.includes("ocrText"), false);
  assert.equal(serialized.includes("providerPayload"), false);
});

test("generated repair prompt includes non-goals, data boundary notes, validation commands, and rollback steps", () => {
  const plan = planForCheck("typecheck");

  assert.match(plan.repairPrompt, /Non-goals:/);
  assert.match(plan.repairPrompt, /Data-boundary constraints:/);
  assert.match(plan.repairPrompt, /Validation commands:/);
  assert.match(plan.repairPrompt, /Rollback steps:/);
  assert.match(plan.repairPrompt, /Do not weaken, delete, skip, or lower/);
  assert.match(plan.repairPrompt, /Do not include learner answers/);
});

test("CLI writes JSON and Markdown repair plan artifacts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-safe-repair-"));
  const snapshotPath = path.join(directory, "snapshot.json");
  const jsonPath = path.join(directory, "plan.json");
  const markdownPath = path.join(directory, "plan.md");
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      snapshot({
        statusCheckRollup: [check("typecheck")],
      }),
    ),
    "utf8",
  );

  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      "./tests/ts-extension-loader.mjs",
      REPAIR_SCRIPT,
      "--input",
      snapshotPath,
      "--json",
      jsonPath,
      "--markdown",
      markdownPath,
      "--stdout",
      "none",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(jsonPath, "utf8")).repairDomain, "typecheck_repair");
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF004 Safe Repair Plan/);
});

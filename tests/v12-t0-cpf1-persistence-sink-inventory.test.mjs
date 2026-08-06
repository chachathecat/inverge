import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");
const inventory = JSON.parse(read("config/dabangil-cpf1-persistence-sink-inventory-v1.json"));
const safety = JSON.parse(read("config/dabangil-ephemeral-source-safety-contract-v1.json"));
const activePlan = read("docs/strategy/ACTIVE-MASTER-PLAN.md");
const roadmap = read("roadmap/active-program.yml");
const evidence = read("docs/qa/v12-t0-cpf1-persistence-sink-inventory-2026-08-06.md");

test("V13 inherits V12-T0 and keeps CPF-1 fail-closed", () => {
  assert.equal(
    safety.activeMasterPlan,
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06.md",
  );
  assert.equal(
    safety.sourceSafetyAnnex,
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md",
  );
  assert.equal(
    inventory.authority.activeMasterPlan,
    "docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md",
  );
  assert.equal(safety.cpf1Inventory.complete, false);
  assert.match(
    activePlan,
    /dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06\.md/,
  );
  assert.match(activePlan, /CPF-1 remains `blocked_unknown_reachable_sinks`/);
  assert.match(activePlan, /V13 remains the only active strategy entry point\./);
  assert.doesNotMatch(activePlan, /V12 combines the source-safe private Book Tutor/);
  assert.match(
    roadmap,
    /activeMasterPlan: docs\/strategy\/dabangil-professional-exam-reasoning-os-final-master-plan-v13-2026-08-06\.md/,
  );
  assert.match(roadmap, /- id: V12-T0[\s\S]*?status: completed/);
  assert.match(roadmap, /- id: CPF-1[\s\S]*?status: blocked[\s\S]*?cpf1Complete: false/);
  assert.equal(inventory.verdict.cpf1Complete, false);
  assert.equal(inventory.verdict.status, "blocked_unknown_reachable_sinks");
  assert.ok(inventory.unresolvedUnknowns.length > 0);
});

test("every sink carries the mandatory trace and behavior fields", () => {
  const trace = ["entry", "service", "serialization", "adapter", "sink"];
  const behavior = ["retention", "redaction", "retry", "failure", "verdict"];
  assert.ok(inventory.sinks.length >= 25);
  for (const sink of inventory.sinks) {
    for (const field of [...trace, ...behavior]) {
      assert.equal(typeof sink[field], "string", `${sink.id}.${field}`);
      assert.ok(sink[field].trim().length > 0, `${sink.id}.${field}`);
    }
  }
});

test("D0-D6 and required persistence surfaces stay inventoried", () => {
  assert.deepEqual(inventory.dataClasses, [
    "D0_RAW_SOURCE",
    "D1_OCR_SOURCE_EXPRESSION",
    "D2_RECONSTRUCTABLE_DERIVATIVE",
    "D3_SOURCE_BOUND_FULL_OUTPUT",
    "D4_LEARNER_AUTHORED_BODY",
    "D5_CLOSED_LEARNING_EVIDENCE",
    "D6_BODYLESS_OPERATIONAL_METADATA",
  ]);
  const source = JSON.stringify(inventory);
  for (const required of [
    "exam_sessions.raw_payload",
    "owner-alpha-practice-repository.ts",
    "/api/problem-snap/save",
    "containsRawContent",
    "learning_signal_events",
    "request/response",
    "localStorage",
    "sessionStorage",
    "temporary",
    "queue",
    "telemetry",
  ]) {
    assert.ok(source.includes(required) || evidence.includes(required), required);
  }
});

test("confirmed violations and unknowns prevent a false completion claim", () => {
  assert.ok(inventory.confirmedViolations.length >= 16);
  assert.ok(inventory.unresolvedUnknowns.length >= 7);
  assert.equal(
    inventory.verdict.repositorySourceInventoryCoverage,
    "complete_at_baseline_for_reachable_source_paths_and_no-adapter-searches",
  );
  assert.doesNotMatch(evidence, /CPF-1:\s*\*\*complete\*\*/i);
  assert.match(evidence, /CPF-1 itself is \*\*not complete\*\*/);
  assert.equal(inventory.scope.persistenceBehaviorChanged, false);
  assert.equal(inventory.scope.migrationsApplied, false);
  assert.equal(inventory.scope.liveServicesCalled, false);
});

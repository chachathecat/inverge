import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createRoadmapRunnerPlanFromYaml,
} from "../lib/agent-factory/roadmap-runner.ts";
import {
  assertPlannerOutputSafe,
  createCodexTaskFactoryOutput,
  prBodyHeadings,
} from "../lib/agent-factory/codex-task-package.ts";

function item({
  id,
  title = `${id} Title`,
  status = "queued",
  dependencies = [],
  lockGroup = `group-${id}`,
  risk = "high",
  priority,
}) {
  return [
    `  - id: ${id}`,
    `    title: ${title}`,
    `    status: ${status}`,
    `    dependencies: [${dependencies.join(", ")}]`,
    `    lockGroup: ${lockGroup}`,
    `    risk: ${risk}`,
    `    priority: ${priority}`,
  ].join("\n");
}

function roadmap(items, { wipLimit = 2 } = {}) {
  return [
    "version: 1",
    "",
    "program:",
    "  id: test-program",
    "  completionItem: S999",
    `  wipLimit: ${wipLimit}`,
    "",
    "items:",
    ...items,
    "",
  ].join("\n");
}

function byId(plan, itemId) {
  const analysis = plan.analyses.find((entry) => entry.itemId === itemId);
  assert.ok(analysis, `missing analysis for ${itemId}`);
  return analysis;
}

function factoryFrom(source) {
  return createCodexTaskFactoryOutput(createRoadmapRunnerPlanFromYaml(source), {
    roadmapPath: "roadmap/active-program.yml",
  });
}

test("completed dependencies make an item ready", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2 }),
    ]),
  );

  assert.deepEqual(plan.readyItemIds, ["S101"]);
  assert.deepEqual(plan.selectedItemIds, ["S101"]);
  assert.equal(byId(plan, "S101").readinessStatus, "ready");
  assert.deepEqual(byId(plan, "S101").blockedReasons, []);
});

test("missing dependencies block an item", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap([
      item({ id: "S100", status: "queued", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2 }),
    ]),
  );

  assert.deepEqual(plan.readyItemIds, ["S100"]);
  assert.deepEqual(plan.blockedItemIds, ["S101"]);
  assert.deepEqual(byId(plan, "S101").missingDependencies, ["S100"]);
  assert.equal(byId(plan, "S101").blockedReasons[0].code, "missing_dependency");
});

test("wipLimit is honored", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap(
      [
        item({ id: "S100", status: "active", priority: 1 }),
        item({ id: "S101", status: "queued", priority: 2 }),
      ],
      { wipLimit: 1 },
    ),
  );

  assert.equal(plan.wipOccupiedCount, 1);
  assert.equal(plan.availableSlots, 0);
  assert.deepEqual(plan.readyItemIds, ["S101"]);
  assert.deepEqual(plan.selectedItemIds, []);
});

test("active lock group blocks queued items in the same group", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap([
      item({ id: "S100", status: "active", lockGroup: "shared-lock", priority: 1 }),
      item({ id: "S101", status: "queued", lockGroup: "shared-lock", priority: 2 }),
    ]),
  );

  assert.deepEqual(plan.blockedItemIds, ["S101"]);
  assert.equal(byId(plan, "S101").blockedReasons[0].code, "lock_group_in_use");
  assert.equal(byId(plan, "S101").blockedReasons[0].occupyingItemId, "S100");
});

test("priority order is deterministic", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S103", dependencies: ["S100"], priority: 3 }),
      item({ id: "S102", dependencies: ["S100"], priority: 2 }),
      item({ id: "S104", dependencies: ["S100"], priority: 2 }),
    ]),
  );

  assert.deepEqual(plan.readyItemIds, ["S102", "S104", "S103"]);
  assert.deepEqual(plan.selectedItemIds, ["S102", "S104"]);
});

test("two ready tasks touching roadmap produce merge and rebase guidance", () => {
  const output = factoryFrom(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2 }),
      item({ id: "S102", dependencies: ["S100"], priority: 3 }),
    ]),
  );

  assert.deepEqual(output.selectedItemIds, ["S101", "S102"]);

  for (const taskPackage of output.packages) {
    assert.ok(
      taskPackage.mergeOrderNotes.some((note) =>
        note.includes("roadmap/active-program.yml"),
      ),
    );
    assert.ok(
      taskPackage.mergeOrderNotes.some((note) =>
        note.includes("S101 -> S102"),
      ),
    );
  }

  assert.ok(
    output.packages[1].mergeOrderNotes.some((note) =>
      note.includes("rebase this branch after S101 merges"),
    ),
  );
});

test("generated PR body has all required contract headings", () => {
  const output = factoryFrom(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2 }),
    ]),
  );
  const headings = output.packages[0].prBodyTemplate.match(/^## .+$/gm) ?? [];

  assert.deepEqual(headings, [...prBodyHeadings()]);
});

test("generated PR body has exactly one valid risk line", () => {
  const output = factoryFrom(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2, risk: "medium" }),
    ]),
  );
  const riskLines =
    output.packages[0].prBodyTemplate.match(/^[ \t]*-[ \t]*Risk:[ \t]*\[(low|medium|high)\][ \t]*$/gm) ??
    [];

  assert.deepEqual(riskLines, ["- Risk: [medium]"]);
});

test("generated PR body has all merge recommendation checkboxes and exactly one checked", () => {
  const output = factoryFrom(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2 }),
    ]),
  );
  const checkboxLines =
    output.packages[0].prBodyTemplate.match(
      /^[ \t]*-[ \t]*\[[ xX]\][ \t]*(Auto-merge candidate|Human approval required|Blocked)[ \t]*$/gm,
    ) ?? [];
  const checked = checkboxLines.filter((line) => line.includes("[x]"));

  assert.deepEqual(checkboxLines, [
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ]);
  assert.equal(checked.length, 1);
});

test("generated prompt includes non-goals and data-boundary notes", () => {
  const output = factoryFrom(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2 }),
    ]),
  );
  const prompt = output.packages[0].codexPrompt;

  assert.ok(prompt.includes("Non-goals:"));
  assert.ok(prompt.includes("Data boundary reminders:"));
  assert.ok(prompt.includes("Do not broaden learner-facing scope"));
  assert.ok(prompt.includes("Do not place learner answers"));
});

test("planner output contains no secret-looking keys or raw-content fields", () => {
  const output = factoryFrom(
    roadmap([
      item({ id: "S100", status: "completed", priority: 1 }),
      item({ id: "S101", dependencies: ["S100"], priority: 2 }),
    ]),
  );

  assert.doesNotThrow(() => assertPlannerOutputSafe(output));
});

test("invalid roadmap YAML fails safely with an actionable error", () => {
  assert.throws(
    () =>
      createRoadmapRunnerPlanFromYaml([
        "version: 1",
        "program:",
        " badIndent: true",
        "items:",
        "",
      ].join("\n")),
    /Invalid roadmap YAML at line 3: unsupported active-program\.yml structure/,
  );
});

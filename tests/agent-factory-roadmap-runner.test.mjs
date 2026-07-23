import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("flat lock selection permits one ready item per exact lock group", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap([
      item({ id: "S100", lockGroup: "shared-lock", priority: 1 }),
      item({ id: "S101", lockGroup: "shared-lock", priority: 2 }),
      item({ id: "S102", lockGroup: "other-lock", priority: 3 }),
    ]),
  );

  assert.deepEqual(plan.readyItemIds, ["S100", "S101", "S102"]);
  assert.deepEqual(plan.selectedItemIds, ["S100", "S102"]);
});

test("blocked and human_decision statuses consume WIP", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap([
      item({ id: "S100", status: "blocked", priority: 1 }),
      item({ id: "S101", status: "human_decision", priority: 2 }),
      item({ id: "S102", status: "queued", priority: 3 }),
    ]),
  );

  assert.equal(plan.wipOccupiedCount, 2);
  assert.equal(plan.availableSlots, 0);
  assert.deepEqual(plan.selectedItemIds, []);
  assert.equal(byId(plan, "S100").statusCategory, "blocked");
  assert.equal(byId(plan, "S101").statusCategory, "blocked");
});

test("unsupported pseudo-statuses stay unknown and cannot encode future gates", () => {
  const plan = createRoadmapRunnerPlanFromYaml(
    roadmap([
      item({ id: "S100", status: "foundation_queued", priority: 1 }),
      item({ id: "S101", status: "runtime_blocked_until_gate", priority: 2 }),
    ]),
  );

  assert.equal(plan.wipOccupiedCount, 0);
  assert.deepEqual(plan.readyItemIds, []);
  assert.deepEqual(plan.selectedItemIds, []);
  assert.equal(byId(plan, "S100").readinessStatus, "unknown");
  assert.equal(byId(plan, "S101").readinessStatus, "unknown");
});

test("live post-650 roadmap exposes exactly two WIP-free contract slices", () => {
  const source = readFileSync("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(source);
  const supported = new Set(["completed", "active", "queued", "blocked"]);

  assert.equal(plan.programId, "post-650-unified-program-v1");
  assert.equal(plan.completionItem, "S299");
  assert.equal(plan.wipLimit, 2);
  assert.equal(plan.wipOccupiedCount, 0);
  assert.equal(plan.availableSlots, 2);
  assert.deepEqual(plan.readyItemIds, ["S235A", "S235B"]);
  assert.deepEqual(plan.selectedItemIds, ["S235A", "S235B"]);
  assert.deepEqual([...new Set(plan.analyses.map((analysis) => analysis.status))], [
    "completed",
    "queued",
  ]);
  assert.ok(plan.analyses.every((analysis) => supported.has(analysis.statusCategory)));

  const s225 = byId(plan, "S225");
  assert.equal(s225.status, "queued");
  assert.equal(s225.readinessStatus, "blocked");
  assert.deepEqual(s225.missingDependencies, ["O4D"]);

  for (const id of [
    "S236A",
    "O3C",
    "S236B",
    "O4D",
    "S250",
    "S260",
    "O2",
    "S270",
    "O4E",
    "S271",
    "O5",
    "S299",
  ]) {
    const analysis = byId(plan, id);
    assert.equal(analysis.status, "queued", `${id} must remain WIP-free queued work`);
    assert.equal(analysis.readinessStatus, "blocked", `${id} must retain an unmet dependency`);
  }

  assert.deepEqual(byId(plan, "S239A").dependencies, ["O3C"]);
  assert.deepEqual(byId(plan, "O4D").dependencies, ["S241A", "S242V"]);
  assert.deepEqual(byId(plan, "S270").dependencies, ["O2"]);
  assert.deepEqual(byId(plan, "O4E").dependencies, ["S270"]);
  assert.deepEqual(byId(plan, "S271").dependencies, ["O4E"]);
});

test("live TypeScript runner and post-merge selector agree without starting work", () => {
  const source = readFileSync("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(source);
  const directory = mkdtempSync(join(tmpdir(), "inverge-next-task-"));
  const artifactPath = join(directory, "next-task.json");

  try {
    execFileSync(process.execPath, ["scripts/automation/determine-next-task.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_TASK_OUTPUT: artifactPath,
      },
      stdio: "pipe",
    });
    const postMerge = JSON.parse(readFileSync(artifactPath, "utf8"));

    assert.equal(postMerge.activeCount, plan.wipOccupiedCount);
    assert.equal(postMerge.availableSlots, plan.availableSlots);
    assert.deepEqual(
      postMerge.selected.map((item) => item.id),
      plan.selectedItemIds,
    );
    assert.deepEqual(plan.selectedItemIds, ["S235A", "S235B"]);
    assert.deepEqual(postMerge.active, []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
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

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  createRoadmapRunnerPlanFromYaml,
  createRoadmapRunnerPlanFromYamlAt,
} from "../lib/agent-factory/roadmap-runner.ts";
import {
  assertPlannerOutputSafe,
  createCodexTaskFactoryOutput,
  prBodyHeadings,
} from "../lib/agent-factory/codex-task-package.ts";
import {
  createNextTaskResultFromYaml,
} from "../scripts/automation/determine-next-task.mjs";

const O3A_EXPIRY = "2026-08-09T14:59:59.000Z";
const LIVE_PRE_EXPIRY_EVALUATED_AT =
  "2026-07-29T01:00:00.000Z";

function item({
  id,
  title = `${id} Title`,
  status = "queued",
  dependencies = [],
  lockGroup = `group-${id}`,
  risk = "high",
  priority,
  approvalExpiresAt,
}) {
  return [
    `  - id: ${id}`,
    `    title: ${title}`,
    `    status: ${status}`,
    `    dependencies: [${dependencies.join(", ")}]`,
    `    lockGroup: ${lockGroup}`,
    `    risk: ${risk}`,
    `    priority: ${priority}`,
    ...(approvalExpiresAt === undefined
      ? []
      : [`    approvalExpiresAt: ${approvalExpiresAt}`]),
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

function expiryRoadmap({
  approvalExpiresAt = O3A_EXPIRY,
  includeExpiry = true,
} = {}) {
  return roadmap([
    item({
      id: "O3A",
      status: "completed",
      priority: 1,
      approvalExpiresAt:
        includeExpiry
          ? approvalExpiresAt
          : undefined,
    }),
    item({
      id: "S236P",
      status: "completed",
      priority: 2,
    }),
    item({
      id: "S236A",
      dependencies: ["O3A", "S236P"],
      priority: 3,
    }),
    item({
      id: "S236B",
      priority: 4,
    }),
    item({
      id: "O4V",
      priority: 5,
    }),
  ]);
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

test("completed dependency expiry uses a strict instant boundary and preserves unrelated planning", () => {
  const source = expiryRoadmap();
  const cases = [
    {
      name: "one millisecond before expiry",
      evaluatedAt: "2026-08-09T14:59:58.999Z",
      effective: true,
      selectedItemIds: ["S236A", "S236B"],
    },
    {
      name: "exactly at expiry",
      evaluatedAt: O3A_EXPIRY,
      effective: false,
      selectedItemIds: ["S236B", "O4V"],
    },
    {
      name: "one millisecond after expiry",
      evaluatedAt: "2026-08-09T14:59:59.001Z",
      effective: false,
      selectedItemIds: ["S236B", "O4V"],
    },
  ];

  for (const candidate of cases) {
    const evaluatedAt = new Date(candidate.evaluatedAt);
    const plan = createRoadmapRunnerPlanFromYamlAt(
      source,
      evaluatedAt,
    );
    const postMerge = createNextTaskResultFromYaml(
      source,
      evaluatedAt,
    );
    const o3a = byId(plan, "O3A");
    const s236a = byId(plan, "S236A");

    assert.equal(
      plan.generatedAt,
      candidate.evaluatedAt,
      candidate.name,
    );
    assert.equal(
      postMerge.generatedAt,
      candidate.evaluatedAt,
      candidate.name,
    );
    assert.equal(o3a.statusCategory, "completed", candidate.name);
    assert.equal(o3a.readinessStatus, "completed", candidate.name);
    assert.ok(plan.completedItemIds.includes("O3A"), candidate.name);
    assert.deepEqual(
      plan.selectedItemIds,
      candidate.selectedItemIds,
      candidate.name,
    );
    assert.deepEqual(
      postMerge.selected.map((entry) => entry.id),
      candidate.selectedItemIds,
      candidate.name,
    );

    if (candidate.effective) {
      assert.equal(s236a.readinessStatus, "ready", candidate.name);
      assert.deepEqual(s236a.missingDependencies, [], candidate.name);
      assert.equal(
        postMerge.blockedByDependency.some(
          (entry) => entry.id === "S236A",
        ),
        false,
        candidate.name,
      );
    } else {
      assert.equal(s236a.readinessStatus, "blocked", candidate.name);
      assert.deepEqual(
        s236a.missingDependencies,
        ["O3A"],
        candidate.name,
      );
      assert.equal(
        s236a.blockedReasons[0].code,
        "expired_dependency",
        candidate.name,
      );
      assert.equal(
        s236a.blockedReasons[0].dependencyExpiresAt,
        O3A_EXPIRY,
        candidate.name,
      );
      assert.equal(
        s236a.blockedReasons[0].evaluatedAt,
        candidate.evaluatedAt,
        candidate.name,
      );
      assert.ok(
        !plan.selectedItemIds.includes("S236A"),
        candidate.name,
      );
      assert.deepEqual(
        postMerge.blockedByDependency.find(
          (entry) => entry.id === "S236A",
        ),
        {
          id: "S236A",
          missingDependencies: ["O3A"],
          expiredDependencies: ["O3A"],
        },
        candidate.name,
      );
    }
  }
});

test("completed dependency without expiry retains historical behavior", () => {
  const source = expiryRoadmap({
    includeExpiry: false,
  });
  const evaluatedAt = new Date(
    "2030-01-01T00:00:00.000Z",
  );
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const postMerge = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );

  assert.equal(byId(plan, "S236A").readinessStatus, "ready");
  assert.deepEqual(byId(plan, "S236A").missingDependencies, []);
  assert.deepEqual(plan.selectedItemIds, ["S236A", "S236B"]);
  assert.deepEqual(
    postMerge.selected.map((entry) => entry.id),
    plan.selectedItemIds,
  );
});

test("malformed explicit approval expiry fails the whole selection closed", () => {
  const malformed = [
    ["present but empty", ""],
    ["non-string", 123],
    ["timezone-less", "2026-08-09T14:59:59.000"],
    ["invalid calendar instant", "2026-02-30T14:59:59.000Z"],
    ["non-canonical UTC", "2026-08-09T14:59:59Z"],
  ];
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );

  for (const [name, approvalExpiresAt] of malformed) {
    const source = expiryRoadmap({
      approvalExpiresAt,
    });

    assert.throws(
      () =>
        createRoadmapRunnerPlanFromYamlAt(
          source,
          evaluatedAt,
        ),
      /approvalExpiresAt must be/,
      name,
    );
    assert.throws(
      () =>
        createNextTaskResultFromYaml(
          source,
          evaluatedAt,
        ),
      /approvalExpiresAt must be/,
      name,
    );
  }
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

test("live O3A-reconciled roadmap exposes S236B and O4V without starting gated work", () => {
  const source = readFileSync("roadmap/active-program.yml", "utf8");
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const postMerge = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );
  const supported = new Set(["completed", "active", "queued", "blocked"]);

  assert.equal(
    plan.generatedAt,
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );
  assert.equal(
    postMerge.generatedAt,
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );
  assert.equal(plan.programId, "post-650-unified-program-v1");
  assert.equal(plan.completionItem, "S299");
  assert.equal(plan.wipLimit, 2);
  assert.equal(plan.wipOccupiedCount, 0);
  assert.equal(plan.availableSlots, 2);
  assert.deepEqual(plan.readyItemIds, ["S236B", "O4V"]);
  assert.deepEqual(plan.selectedItemIds, ["S236B", "O4V"]);
  assert.deepEqual(
    postMerge.selected.map((entry) => entry.id),
    plan.selectedItemIds,
  );
  assert.deepEqual([...new Set(plan.analyses.map((analysis) => analysis.status))], [
    "completed",
    "queued",
  ]);
  assert.ok(plan.analyses.every((analysis) => supported.has(analysis.statusCategory)));

  const s235a = byId(plan, "S235A");
  assert.equal(s235a.status, "completed");
  assert.equal(s235a.readinessStatus, "completed");

  const s235b = byId(plan, "S235B");
  assert.equal(s235b.status, "completed");
  assert.equal(s235b.readinessStatus, "completed");

  const o3a = byId(plan, "O3A");
  assert.equal(o3a.status, "completed");
  assert.equal(o3a.readinessStatus, "completed");
  assert.deepEqual(o3a.dependencies, ["S235A", "S234R"]);

  const s236b = byId(plan, "S236B");
  assert.equal(s236b.status, "queued");
  assert.equal(s236b.readinessStatus, "ready");
  assert.deepEqual(s236b.dependencies, ["S235B", "S234R"]);

  const o4v = byId(plan, "O4V");
  assert.equal(o4v.status, "queued");
  assert.equal(o4v.readinessStatus, "ready");
  assert.deepEqual(o4v.dependencies, ["S234R"]);

  const s236p = byId(plan, "S236P");
  assert.equal(s236p.status, "queued");
  assert.equal(s236p.readinessStatus, "blocked");
  assert.deepEqual(s236p.missingDependencies, ["O4V"]);

  const s236a = byId(plan, "S236A");
  assert.equal(s236a.status, "queued");
  assert.equal(s236a.readinessStatus, "blocked");
  assert.deepEqual(s236a.missingDependencies, ["S236P"]);

  const s225 = byId(plan, "S225");
  assert.equal(s225.status, "queued");
  assert.equal(s225.readinessStatus, "blocked");
  assert.deepEqual(s225.missingDependencies, ["O4D"]);

  for (const id of [
    "S236A",
    "O3C",
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
  assert.deepEqual(byId(plan, "O4D").dependencies, ["S245C", "S242V"]);
  assert.deepEqual(byId(plan, "S241A").dependencies, ["S240A"]);
  assert.deepEqual(byId(plan, "S237O").dependencies, ["S237P"]);
  assert.deepEqual(byId(plan, "S240O").dependencies, ["S239O"]);
  assert.deepEqual(byId(plan, "S270").dependencies, ["O2"]);
  assert.deepEqual(byId(plan, "O4E").dependencies, ["S270"]);
  assert.deepEqual(byId(plan, "S271").dependencies, ["O4E"]);
});

test("live TypeScript runner and post-merge selector agree without starting work", () => {
  const source = readFileSync("roadmap/active-program.yml", "utf8");
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
    const plan = createRoadmapRunnerPlanFromYamlAt(
      source,
      new Date(postMerge.generatedAt),
    );

    assert.equal(postMerge.generatedAt, plan.generatedAt);
    assert.equal(postMerge.activeCount, plan.wipOccupiedCount);
    assert.equal(postMerge.availableSlots, plan.availableSlots);
    assert.deepEqual(
      postMerge.selected.map((item) => item.id),
      plan.selectedItemIds,
    );
    assert.deepEqual(plan.selectedItemIds, ["S236B", "O4V"]);
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

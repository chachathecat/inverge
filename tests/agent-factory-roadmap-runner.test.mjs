import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
  selectNextTasks,
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

function itemWithRawDependencies({
  id,
  status = "queued",
  rawDependencies,
  lockGroup = `group-${id}`,
  risk = "high",
  priority,
}) {
  return [
    `  - id: ${id}`,
    `    title: ${id} Title`,
    `    status: ${status}`,
    ...(rawDependencies === undefined
      ? []
      : [
          rawDependencies === ""
            ? "    dependencies:"
            : `    dependencies: ${rawDependencies}`,
        ]),
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

function activeExpiryRoadmap({
  activeStatus = "active",
  activeDependencies = ["O3A", "S236P"],
  approvalExpiresAt = O3A_EXPIRY,
  includeExpiry = true,
  s236pStatus = "completed",
  activeLockGroup = "private-authoring",
  extraItems = [],
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
      status: s236pStatus,
      priority: 2,
    }),
    item({
      id: "S236A",
      status: activeStatus,
      dependencies: activeDependencies,
      lockGroup: activeLockGroup,
      priority: 3,
    }),
    item({
      id: "S236B",
      lockGroup: "first-round",
      priority: 4,
    }),
    item({
      id: "O4V",
      lockGroup: "private-plane",
      priority: 5,
    }),
    ...extraItems,
  ]);
}

function dependencyBlockSurface(plan) {
  return plan.analyses
    .filter((analysis) =>
      analysis.missingDependencies.length > 0 &&
      analysis.blockedReasons.some((reason) =>
        reason.code === "missing_dependency" ||
        reason.code === "expired_dependency",
      ),
    )
    .map((analysis) => ({
      id: analysis.itemId,
      missingDependencies: analysis.missingDependencies,
      expiredDependencies: analysis.blockedReasons
        .filter((reason) => reason.code === "expired_dependency")
        .map((reason) => reason.dependencyId),
    }));
}

function effectiveActiveIds(plan) {
  return plan.analyses
    .filter((analysis) =>
      analysis.statusCategory === "active" &&
      analysis.readinessStatus === "active",
    )
    .map((analysis) => analysis.itemId);
}

function assertRunnerSelectorParity(plan, selector) {
  assert.equal(selector.generatedAt, plan.generatedAt);
  assert.equal(selector.activeCount, plan.wipOccupiedCount);
  assert.equal(selector.availableSlots, plan.availableSlots);
  assert.deepEqual(
    selector.selected.map((entry) => entry.id),
    plan.selectedItemIds,
  );
  assert.deepEqual(
    selector.blockedByDependency,
    dependencyBlockSurface(plan),
  );
  assert.deepEqual(
    selector.active.map((entry) => entry.id),
    effectiveActiveIds(plan),
  );
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

test("completed bridges cannot launder malformed dependency shapes", () => {
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );

  for (const [name, rawDependencies] of [
    ["empty scalar", ""],
    ["explicit null", "null"],
    ["scalar dependency", "O3A"],
  ]) {
    const source = roadmap([
      item({
        id: "O3A",
        status: "completed",
        priority: 1,
      }),
      itemWithRawDependencies({
        id: "CompletedBridge",
        status: "completed",
        rawDependencies,
        priority: 2,
      }),
      item({
        id: "Consumer",
        dependencies: ["CompletedBridge"],
        priority: 3,
      }),
    ]);

    for (const [runner, evaluate] of [
      [
        "TypeScript",
        createRoadmapRunnerPlanFromYamlAt,
      ],
      [
        "MJS",
        createNextTaskResultFromYaml,
      ],
    ]) {
      assert.throws(
        () => evaluate(source, evaluatedAt),
        /CompletedBridge\.dependencies must be an inline string array\./,
        `${runner}: ${name}`,
      );
    }
  }
});

test("every dependency-consuming status rejects malformed shapes before selection", () => {
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );

  for (const status of [
    "queued",
    "active",
    "in_progress",
    "in_review",
    "pr_open",
    "blocked",
    "human_decision",
    "completed",
  ]) {
    const source = roadmap([
      item({
        id: "O3A",
        status: "completed",
        priority: 1,
      }),
      itemWithRawDependencies({
        id: "MalformedConsumer",
        status,
        rawDependencies: "null",
        priority: 2,
      }),
    ]);

    for (const evaluate of [
      createRoadmapRunnerPlanFromYamlAt,
      createNextTaskResultFromYaml,
    ]) {
      assert.throws(
        () => evaluate(source, evaluatedAt),
        /MalformedConsumer\.dependencies must be an inline string array\./,
        status,
      );
    }
  }
});

test("MJS selection rejects every non-array dependency shape and non-string entries", () => {
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );

  for (const [name, dependencies] of [
    ["empty scalar", ""],
    ["explicit null", null],
    ["scalar string", "O3A"],
    ["number", 1],
    ["boolean", true],
    ["object", {}],
    ["non-string array entry", ["O3A", 1]],
  ]) {
    assert.throws(
      () =>
        selectNextTasks(
          {
            program: {
              id: "dependency-shape-test",
              wipLimit: 2,
            },
            items: [
              {
                id: "O3A",
                status: "completed",
                dependencies: [],
                priority: 1,
              },
              {
                id: "MalformedConsumer",
                status: "queued",
                dependencies,
                priority: 2,
              },
            ],
          },
          evaluatedAt,
        ),
      /MalformedConsumer\.dependencies must be an inline string array\./,
      name,
    );
  }
});

test("omitted, empty, and valid dependency arrays retain TS and MJS compatibility", () => {
  const source = roadmap([
    itemWithRawDependencies({
      id: "OmittedDependencies",
      status: "completed",
      priority: 1,
    }),
    itemWithRawDependencies({
      id: "ExplicitEmptyDependencies",
      status: "completed",
      rawDependencies: "[]",
      priority: 2,
    }),
    itemWithRawDependencies({
      id: "Consumer",
      rawDependencies:
        "[OmittedDependencies, ExplicitEmptyDependencies]",
      priority: 3,
    }),
  ]);
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const selector = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );

  assert.deepEqual(
    plan.completedItemIds,
    [
      "OmittedDependencies",
      "ExplicitEmptyDependencies",
    ],
  );
  assert.deepEqual(
    plan.selectedItemIds,
    ["Consumer"],
  );
  assert.deepEqual(
    selector.selected.map((entry) => entry.id),
    ["Consumer"],
  );
  assertRunnerSelectorParity(plan, selector);
});

test("unknown, self, and cyclic dependencies remain fail-closed in both runners", () => {
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );
  const cases = [
    {
      name: "unknown",
      source: roadmap([
        item({
          id: "UnknownConsumer",
          dependencies: ["Missing"],
          priority: 1,
        }),
      ]),
      pattern: /unknown|알 수 없는/u,
    },
    {
      name: "self",
      source: roadmap([
        item({
          id: "SelfConsumer",
          dependencies: ["SelfConsumer"],
          priority: 1,
        }),
      ]),
      pattern: /itself|자기 자신/u,
    },
    {
      name: "cycle",
      source: roadmap([
        item({
          id: "CycleA",
          dependencies: ["CycleB"],
          priority: 1,
        }),
        item({
          id: "CycleB",
          dependencies: ["CycleA"],
          priority: 2,
        }),
      ]),
      pattern: /cycle|순환/u,
    },
  ];

  for (const candidate of cases) {
    for (const evaluate of [
      createRoadmapRunnerPlanFromYamlAt,
      createNextTaskResultFromYaml,
    ]) {
      assert.throws(
        () =>
          evaluate(
            candidate.source,
            evaluatedAt,
          ),
        candidate.pattern,
        candidate.name,
      );
    }
  }
});

test("CLI dependency-shape failures write neither artifact nor GitHub output", () => {
  const directory = mkdtempSync(
    join(tmpdir(), "inverge-dependency-shape-"),
  );
  const roadmapPath = join(
    directory,
    "active-program.yml",
  );
  const artifactPath = join(
    directory,
    "next-task.json",
  );
  const githubOutputPath = join(
    directory,
    "github-output.txt",
  );
  const source = roadmap([
    item({
      id: "O3A",
      status: "completed",
      priority: 1,
    }),
    itemWithRawDependencies({
      id: "CompletedBridge",
      status: "completed",
      rawDependencies: "null",
      priority: 2,
    }),
    item({
      id: "Consumer",
      dependencies: ["CompletedBridge"],
      priority: 3,
    }),
  ]);

  try {
    writeFileSync(roadmapPath, source, "utf8");

    assert.throws(() =>
      execFileSync(
        process.execPath,
        [
          "scripts/automation/determine-next-task.mjs",
        ],
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            ROADMAP_PATH: roadmapPath,
            NEXT_TASK_OUTPUT: artifactPath,
            GITHUB_OUTPUT: githubOutputPath,
          },
          stdio: "pipe",
        },
      ),
    );
    assert.equal(existsSync(artifactPath), false);
    assert.equal(
      existsSync(githubOutputPath),
      false,
    );
  } finally {
    rmSync(
      directory,
      { recursive: true, force: true },
    );
  }
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

test("transitive completion expiry is strict, source-order independent, and reports the direct bridge", () => {
  const orderedItems = [
    item({
      id: "O3A",
      status: "completed",
      approvalExpiresAt: O3A_EXPIRY,
      priority: 1,
    }),
    item({
      id: "S236P",
      status: "completed",
      priority: 2,
    }),
    item({
      id: "S236A",
      status: "completed",
      dependencies: ["O3A", "S236P"],
      priority: 3,
    }),
    item({
      id: "S237A",
      dependencies: ["S236A"],
      priority: 4,
    }),
    item({
      id: "S236B",
      priority: 5,
    }),
    item({
      id: "O4V",
      priority: 6,
    }),
  ];
  const cases = [
    {
      name: "one millisecond before expiry",
      evaluatedAt: "2026-08-09T14:59:58.999Z",
      effective: true,
    },
    {
      name: "exactly at expiry",
      evaluatedAt: O3A_EXPIRY,
      effective: false,
    },
    {
      name: "one millisecond after expiry",
      evaluatedAt: "2026-08-09T14:59:59.001Z",
      effective: false,
    },
  ];

  for (const [orderName, items] of [
    ["ancestor first", orderedItems],
    ["completed bridge first", [...orderedItems].reverse()],
  ]) {
    const source = roadmap(items);

    for (const candidate of cases) {
      const evaluatedAt = new Date(candidate.evaluatedAt);
      const plan = createRoadmapRunnerPlanFromYamlAt(
        source,
        evaluatedAt,
      );
      const selector = createNextTaskResultFromYaml(
        source,
        evaluatedAt,
      );
      const o3a = byId(plan, "O3A");
      const s236a = byId(plan, "S236A");
      const s237a = byId(plan, "S237A");
      const label = `${orderName}: ${candidate.name}`;

      for (const completed of [o3a, s236a]) {
        assert.equal(
          completed.statusCategory,
          "completed",
          label,
        );
        assert.equal(
          completed.readinessStatus,
          "completed",
          label,
        );
        assert.deepEqual(
          completed.blockedReasons,
          [],
          label,
        );
        assert.ok(
          plan.completedItemIds.includes(
            completed.itemId,
          ),
          label,
        );
        assert.ok(
          !plan.blockedItemIds.includes(
            completed.itemId,
          ),
          label,
        );
      }

      if (candidate.effective) {
        assert.equal(
          s237a.readinessStatus,
          "ready",
          label,
        );
        assert.deepEqual(
          s237a.missingDependencies,
          [],
          label,
        );
        assert.deepEqual(
          s237a.blockedReasons,
          [],
          label,
        );
        assert.ok(
          plan.selectedItemIds.includes("S237A"),
          label,
        );
        assert.equal(
          selector.blockedByDependency.some(
            (entry) => entry.id === "S237A",
          ),
          false,
          label,
        );
      } else {
        assert.equal(
          s237a.readinessStatus,
          "blocked",
          label,
        );
        assert.deepEqual(
          s237a.missingDependencies,
          ["S236A"],
          label,
        );
        assert.deepEqual(
          s237a.blockedReasons,
          [
            {
              code: "expired_dependency",
              dependencyId: "S236A",
              dependencyExpiresAt: O3A_EXPIRY,
              evaluatedAt: candidate.evaluatedAt,
              message: `S237A is waiting for dependency S236A because its effective completion was invalidated by a prerequisite approval that expired at ${O3A_EXPIRY}.`,
            },
          ],
          label,
        );
        assert.ok(
          plan.blockedItemIds.includes("S237A"),
          label,
        );
        assert.ok(
          !plan.selectedItemIds.includes("S237A"),
          label,
        );
        assert.deepEqual(
          plan.selectedItemIds,
          ["S236B", "O4V"],
          label,
        );
        assert.deepEqual(
          selector.blockedByDependency.find(
            (entry) => entry.id === "S237A",
          ),
          {
            id: "S237A",
            missingDependencies: ["S236A"],
            expiredDependencies: ["S236A"],
          },
          label,
        );
      }

      assertRunnerSelectorParity(
        plan,
        selector,
      );
    }
  }
});

test("completed dependency closure uses the deterministic earliest approval expiry", () => {
  const earlyExpiry =
    "2026-08-09T14:59:58.000Z";
  const lateExpiry =
    "2026-08-09T14:59:59.000Z";
  const evaluatedAt = new Date(earlyExpiry);

  for (const [caseName, leftExpiry, rightExpiry] of [
    ["different boundaries", lateExpiry, earlyExpiry],
    ["tied boundaries", earlyExpiry, earlyExpiry],
  ]) {
    for (const dependencyOrder of [
      ["ApprovalLeft", "ApprovalRight"],
      ["ApprovalRight", "ApprovalLeft"],
    ]) {
      const source = roadmap([
        item({
          id: "ApprovalLeft",
          status: "completed",
          approvalExpiresAt: leftExpiry,
          priority: 1,
        }),
        item({
          id: "ApprovalRight",
          status: "completed",
          approvalExpiresAt: rightExpiry,
          priority: 2,
        }),
        item({
          id: "CompletedBridge",
          status: "completed",
          dependencies: dependencyOrder,
          priority: 3,
        }),
        item({
          id: "Consumer",
          dependencies: ["CompletedBridge"],
          priority: 4,
        }),
      ]);
      const plan = createRoadmapRunnerPlanFromYamlAt(
        source,
        evaluatedAt,
      );
      const selector = createNextTaskResultFromYaml(
        source,
        evaluatedAt,
      );
      const consumer = byId(plan, "Consumer");
      const label =
        `${caseName}: ${dependencyOrder.join(",")}`;

      assert.equal(
        consumer.readinessStatus,
        "blocked",
        label,
      );
      assert.deepEqual(
        consumer.missingDependencies,
        ["CompletedBridge"],
        label,
      );
      assert.deepEqual(
        consumer.blockedReasons.map(
          ({
            code,
            dependencyId,
            dependencyExpiresAt,
          }) => ({
            code,
            dependencyId,
            dependencyExpiresAt,
          }),
        ),
        [
          {
            code: "expired_dependency",
            dependencyId: "CompletedBridge",
            dependencyExpiresAt: earlyExpiry,
          },
        ],
        label,
      );
      assert.deepEqual(
        selector.blockedByDependency,
        [
          {
            id: "Consumer",
            missingDependencies: [
              "CompletedBridge",
            ],
            expiredDependencies: [
              "CompletedBridge",
            ],
          },
        ],
        label,
      );
      assertRunnerSelectorParity(
        plan,
        selector,
      );
    }
  }
});

test("multi-hop and diamond completed chains propagate one direct expired blocker", () => {
  const orderedItems = [
    item({
      id: "O3A",
      status: "completed",
      approvalExpiresAt: O3A_EXPIRY,
      priority: 1,
    }),
    item({
      id: "CompletedA",
      status: "completed",
      dependencies: ["O3A"],
      priority: 2,
    }),
    item({
      id: "CompletedB",
      status: "completed",
      dependencies: ["O3A"],
      priority: 3,
    }),
    item({
      id: "CompletedC",
      status: "completed",
      dependencies: [
        "CompletedA",
        "CompletedB",
      ],
      priority: 4,
    }),
    item({
      id: "DiamondConsumer",
      dependencies: ["CompletedC"],
      priority: 5,
    }),
    item({
      id: "S236A",
      status: "completed",
      dependencies: ["O3A"],
      priority: 6,
    }),
    item({
      id: "S237A",
      status: "completed",
      dependencies: ["S236A"],
      priority: 7,
    }),
    item({
      id: "S237P",
      dependencies: ["S237A"],
      priority: 8,
    }),
  ];

  for (const items of [
    orderedItems,
    [...orderedItems].reverse(),
  ]) {
    const source = roadmap(items);
    const before = createRoadmapRunnerPlanFromYamlAt(
      source,
      new Date("2026-08-09T14:59:58.999Z"),
    );

    assert.equal(
      byId(before, "DiamondConsumer")
        .readinessStatus,
      "ready",
    );
    assert.equal(
      byId(before, "S237P").readinessStatus,
      "ready",
    );

    const evaluatedAt = new Date(O3A_EXPIRY);
    const plan = createRoadmapRunnerPlanFromYamlAt(
      source,
      evaluatedAt,
    );
    const selector = createNextTaskResultFromYaml(
      source,
      evaluatedAt,
    );

    for (const id of [
      "CompletedA",
      "CompletedB",
      "CompletedC",
      "S236A",
      "S237A",
    ]) {
      const completed = byId(plan, id);

      assert.equal(
        completed.statusCategory,
        "completed",
      );
      assert.equal(
        completed.readinessStatus,
        "completed",
      );
      assert.ok(
        plan.completedItemIds.includes(id),
      );
      assert.ok(
        !plan.blockedItemIds.includes(id),
      );
    }

    for (const [
      consumerId,
      directDependency,
    ] of [
      ["DiamondConsumer", "CompletedC"],
      ["S237P", "S237A"],
    ]) {
      const consumer = byId(plan, consumerId);

      assert.equal(
        consumer.readinessStatus,
        "blocked",
      );
      assert.deepEqual(
        consumer.missingDependencies,
        [directDependency],
      );
      assert.deepEqual(
        consumer.blockedReasons.map(
          ({
            code,
            dependencyId,
            dependencyExpiresAt,
          }) => ({
            code,
            dependencyId,
            dependencyExpiresAt,
          }),
        ),
        [
          {
            code: "expired_dependency",
            dependencyId: directDependency,
            dependencyExpiresAt: O3A_EXPIRY,
          },
        ],
      );
      assert.ok(
        !consumer.missingDependencies.includes(
          "O3A",
        ),
      );
      assert.deepEqual(
        selector.blockedByDependency.find(
          (entry) => entry.id === consumerId,
        ),
        {
          id: consumerId,
          missingDependencies: [
            directDependency,
          ],
          expiredDependencies: [
            directDependency,
          ],
        },
      );
    }

    assertRunnerSelectorParity(plan, selector);
  }
});

test("transitive expiry blocks active execution while retaining raw WIP and locks", () => {
  const source = roadmap(
    [
      item({
        id: "O3A",
        status: "completed",
        approvalExpiresAt: O3A_EXPIRY,
        priority: 1,
      }),
      item({
        id: "S236A",
        status: "completed",
        dependencies: ["O3A"],
        priority: 2,
      }),
      item({
        id: "S237A",
        status: "active",
        dependencies: ["S236A"],
        lockGroup: "private-authoring",
        priority: 3,
      }),
      item({
        id: "SameLockQueued",
        lockGroup: "private-authoring",
        priority: 4,
      }),
      item({
        id: "UnrelatedFirst",
        lockGroup: "unrelated-first",
        priority: 5,
      }),
      item({
        id: "UnrelatedSecond",
        lockGroup: "unrelated-second",
        priority: 6,
      }),
    ],
    { wipLimit: 2 },
  );

  for (const evaluatedAtIso of [
    O3A_EXPIRY,
    "2026-08-09T14:59:59.001Z",
  ]) {
    const evaluatedAt = new Date(evaluatedAtIso);
    const plan = createRoadmapRunnerPlanFromYamlAt(
      source,
      evaluatedAt,
    );
    const selector = createNextTaskResultFromYaml(
      source,
      evaluatedAt,
    );
    const active = byId(plan, "S237A");

    assert.equal(active.status, "active");
    assert.equal(
      active.statusCategory,
      "active",
    );
    assert.equal(
      active.readinessStatus,
      "blocked",
    );
    assert.deepEqual(
      active.missingDependencies,
      ["S236A"],
    );
    assert.deepEqual(
      active.blockedReasons.map(
        ({
          code,
          dependencyId,
          dependencyExpiresAt,
        }) => ({
          code,
          dependencyId,
          dependencyExpiresAt,
        }),
      ),
      [
        {
          code: "expired_dependency",
          dependencyId: "S236A",
          dependencyExpiresAt: O3A_EXPIRY,
        },
      ],
    );
    assert.ok(
      plan.blockedItemIds.includes("S237A"),
    );
    assert.equal(plan.wipOccupiedCount, 1);
    assert.equal(plan.availableSlots, 1);
    assert.equal(plan.selectionSlots, 1);
    assert.equal(selector.activeCount, 1);
    assert.equal(selector.availableSlots, 1);
    assert.deepEqual(selector.active, []);
    assert.deepEqual(
      selector.blockedByDependency.find(
        (entry) => entry.id === "S237A",
      ),
      {
        id: "S237A",
        missingDependencies: ["S236A"],
        expiredDependencies: ["S236A"],
      },
    );
    assert.equal(
      byId(plan, "SameLockQueued")
        .readinessStatus,
      "blocked",
    );
    assert.deepEqual(
      selector.blockedByLock.find(
        (entry) =>
          entry.id === "SameLockQueued",
      ),
      {
        id: "SameLockQueued",
        lockGroup: "private-authoring",
      },
    );
    assert.deepEqual(
      plan.selectedItemIds,
      ["UnrelatedFirst"],
    );
    assert.ok(
      !plan.selectedItemIds.includes(
        "UnrelatedSecond",
      ),
    );
    assertRunnerSelectorParity(plan, selector);
  }
});

test("incomplete and non-expiring completed closures retain generic compatibility", () => {
  const evaluatedAt = new Date(
    "2030-01-01T00:00:00.000Z",
  );
  const incompleteSource = roadmap([
    item({
      id: "IncompleteA",
      status: "queued",
      priority: 1,
    }),
    item({
      id: "CompletedB",
      status: "completed",
      dependencies: ["IncompleteA"],
      priority: 2,
    }),
    item({
      id: "ConsumerC",
      dependencies: ["CompletedB"],
      priority: 3,
    }),
  ]);
  const incompletePlan =
    createRoadmapRunnerPlanFromYamlAt(
      incompleteSource,
      evaluatedAt,
    );
  const incompleteSelector =
    createNextTaskResultFromYaml(
      incompleteSource,
      evaluatedAt,
    );
  const consumer =
    byId(incompletePlan, "ConsumerC");

  assert.equal(
    byId(incompletePlan, "CompletedB")
      .readinessStatus,
    "completed",
  );
  assert.deepEqual(
    consumer.missingDependencies,
    ["CompletedB"],
  );
  assert.deepEqual(
    consumer.blockedReasons.map(
      (reason) => reason.code,
    ),
    ["missing_dependency"],
  );
  assert.deepEqual(
    incompleteSelector.blockedByDependency.find(
      (entry) => entry.id === "ConsumerC",
    ),
    {
      id: "ConsumerC",
      missingDependencies: ["CompletedB"],
      expiredDependencies: [],
    },
  );
  assertRunnerSelectorParity(
    incompletePlan,
    incompleteSelector,
  );

  const aliasSource = roadmap([
    item({
      id: "CompletedAlias",
      status: "done",
      priority: 1,
    }),
    item({
      id: "MergedAlias",
      status: "merged",
      dependencies: ["CompletedAlias"],
      priority: 2,
    }),
    item({
      id: "ReleasedAlias",
      status: "released",
      dependencies: ["MergedAlias"],
      priority: 3,
    }),
    item({
      id: "CompletedFinal",
      status: "completed",
      dependencies: ["ReleasedAlias"],
      priority: 4,
    }),
    item({
      id: "FutureConsumer",
      dependencies: ["CompletedFinal"],
      priority: 5,
    }),
  ]);
  const aliasPlan =
    createRoadmapRunnerPlanFromYamlAt(
      aliasSource,
      evaluatedAt,
    );
  const aliasSelector =
    createNextTaskResultFromYaml(
      aliasSource,
      evaluatedAt,
    );

  assert.equal(
    byId(aliasPlan, "FutureConsumer")
      .readinessStatus,
    "ready",
  );
  assert.deepEqual(
    byId(aliasPlan, "FutureConsumer")
      .missingDependencies,
    [],
  );
  assert.deepEqual(
    aliasPlan.completedItemIds,
    [
      "CompletedAlias",
      "MergedAlias",
      "ReleasedAlias",
      "CompletedFinal",
    ],
  );
  assertRunnerSelectorParity(
    aliasPlan,
    aliasSelector,
  );
});

test("malformed expiry behind a completed bridge and dependency cycles still fail closed", () => {
  const malformedSource = roadmap([
    item({
      id: "MalformedApproval",
      status: "completed",
      approvalExpiresAt: "2026-08-09T14:59:59Z",
      priority: 1,
    }),
    item({
      id: "CompletedBridge",
      status: "completed",
      dependencies: ["MalformedApproval"],
      priority: 2,
    }),
    item({
      id: "Consumer",
      dependencies: ["CompletedBridge"],
      priority: 3,
    }),
  ]);
  const cycleSource = roadmap([
    item({
      id: "CompletedA",
      status: "completed",
      dependencies: ["CompletedB"],
      priority: 1,
    }),
    item({
      id: "CompletedB",
      status: "completed",
      dependencies: ["CompletedA"],
      priority: 2,
    }),
    item({
      id: "Consumer",
      dependencies: ["CompletedB"],
      priority: 3,
    }),
  ]);
  const evaluatedAt = new Date(
    LIVE_PRE_EXPIRY_EVALUATED_AT,
  );

  for (const evaluate of [
    createRoadmapRunnerPlanFromYamlAt,
    createNextTaskResultFromYaml,
  ]) {
    assert.throws(
      () => evaluate(malformedSource, evaluatedAt),
      /approvalExpiresAt must be/,
    );
    assert.throws(
      () => evaluate(cycleSource, evaluatedAt),
      /cycle|순환/u,
    );
  }
});

test("active dependency expiry blocks effective execution without releasing WIP or selection capacity", () => {
  const source = activeExpiryRoadmap();
  const cases = [
    {
      name: "one millisecond before expiry",
      evaluatedAt: "2026-08-09T14:59:58.999Z",
      effective: true,
    },
    {
      name: "exactly at expiry",
      evaluatedAt: O3A_EXPIRY,
      effective: false,
    },
    {
      name: "one millisecond after expiry",
      evaluatedAt: "2026-08-09T14:59:59.001Z",
      effective: false,
    },
  ];

  for (const candidate of cases) {
    const evaluatedAt = new Date(candidate.evaluatedAt);
    const plan = createRoadmapRunnerPlanFromYamlAt(
      source,
      evaluatedAt,
    );
    const selector = createNextTaskResultFromYaml(
      source,
      evaluatedAt,
    );
    const s236a = byId(plan, "S236A");

    assert.equal(s236a.status, "active", candidate.name);
    assert.equal(s236a.statusCategory, "active", candidate.name);
    assert.equal(plan.wipOccupiedCount, 1, candidate.name);
    assert.equal(plan.availableSlots, 1, candidate.name);
    assert.equal(plan.selectionSlots, 1, candidate.name);
    assert.equal(selector.activeCount, 1, candidate.name);
    assert.equal(selector.availableSlots, 1, candidate.name);
    assert.deepEqual(plan.selectedItemIds, ["S236B"], candidate.name);
    assert.deepEqual(
      selector.selected.map((entry) => entry.id),
      ["S236B"],
      candidate.name,
    );
    assert.ok(!plan.selectedItemIds.includes("O4V"), candidate.name);

    if (candidate.effective) {
      assert.equal(s236a.readinessStatus, "active", candidate.name);
      assert.deepEqual(s236a.missingDependencies, [], candidate.name);
      assert.deepEqual(s236a.blockedReasons, [], candidate.name);
      assert.ok(!plan.blockedItemIds.includes("S236A"), candidate.name);
      assert.deepEqual(
        selector.active.map((entry) => entry.id),
        ["S236A"],
        candidate.name,
      );
      assert.equal(
        selector.blockedByDependency.some(
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
      assert.deepEqual(
        s236a.blockedReasons,
        [
          {
            code: "expired_dependency",
            dependencyId: "O3A",
            dependencyExpiresAt: O3A_EXPIRY,
            evaluatedAt: candidate.evaluatedAt,
            message: `S236A is waiting for dependency O3A because its completion approval expired at ${O3A_EXPIRY}.`,
          },
        ],
        candidate.name,
      );
      assert.ok(plan.blockedItemIds.includes("S236A"), candidate.name);
      assert.deepEqual(selector.active, [], candidate.name);
      assert.deepEqual(
        selector.blockedByDependency.find(
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

    assertRunnerSelectorParity(plan, selector);
  }
});

test("active items fail closed on ordinary incomplete dependencies", () => {
  const source = activeExpiryRoadmap({
    activeDependencies: ["S236P"],
    includeExpiry: false,
    s236pStatus: "queued",
  });
  const evaluatedAt = new Date(
    "2026-07-29T01:00:00.000Z",
  );
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const selector = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );
  const s236a = byId(plan, "S236A");

  assert.equal(s236a.statusCategory, "active");
  assert.equal(s236a.readinessStatus, "blocked");
  assert.deepEqual(s236a.missingDependencies, ["S236P"]);
  assert.deepEqual(
    s236a.blockedReasons.map((reason) => ({
      code: reason.code,
      dependencyId: reason.dependencyId,
    })),
    [
      {
        code: "missing_dependency",
        dependencyId: "S236P",
      },
    ],
  );
  assert.equal(plan.wipOccupiedCount, 1);
  assert.equal(plan.availableSlots, 1);
  assert.deepEqual(selector.active, []);
  assertRunnerSelectorParity(plan, selector);
});

test("mixed expired and incomplete active dependencies emit one ordered reason per dependency", () => {
  const source = activeExpiryRoadmap({
    s236pStatus: "queued",
  });
  const evaluatedAt = new Date(O3A_EXPIRY);
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const selector = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );
  const s236a = byId(plan, "S236A");

  assert.deepEqual(
    s236a.missingDependencies,
    ["O3A", "S236P"],
  );
  assert.deepEqual(
    s236a.blockedReasons.map((reason) => ({
      code: reason.code,
      dependencyId: reason.dependencyId,
    })),
    [
      {
        code: "expired_dependency",
        dependencyId: "O3A",
      },
      {
        code: "missing_dependency",
        dependencyId: "S236P",
      },
    ],
  );
  assert.deepEqual(
    selector.blockedByDependency.find(
      (entry) => entry.id === "S236A",
    ),
    {
      id: "S236A",
      missingDependencies: ["O3A", "S236P"],
      expiredDependencies: ["O3A"],
    },
  );
  assertRunnerSelectorParity(plan, selector);
});

test("blocked and human-decision items retain status reasons alongside dependency diagnostics", () => {
  const source = roadmap(
    [
      item({
        id: "S100",
        status: "queued",
        priority: 1,
      }),
      item({
        id: "S101",
        status: "blocked",
        dependencies: ["S100"],
        priority: 2,
      }),
      item({
        id: "S102",
        status: "human_decision",
        dependencies: ["S100"],
        priority: 3,
      }),
    ],
    { wipLimit: 2 },
  );
  const evaluatedAt = new Date(
    "2026-07-29T01:00:00.000Z",
  );
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const selector = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );

  for (const id of ["S101", "S102"]) {
    const analysis = byId(plan, id);

    assert.equal(analysis.statusCategory, "blocked");
    assert.equal(analysis.readinessStatus, "blocked");
    assert.deepEqual(analysis.missingDependencies, ["S100"]);
    assert.deepEqual(
      analysis.blockedReasons.map((reason) => reason.code),
      ["missing_dependency", "blocked_status"],
    );
  }

  assert.equal(plan.wipOccupiedCount, 2);
  assert.equal(plan.availableSlots, 0);
  assert.equal(selector.activeCount, 2);
  assert.deepEqual(selector.active, []);
  assertRunnerSelectorParity(plan, selector);
});

test("all raw active aliases use the same dependency fail-closed rule", () => {
  for (const activeStatus of [
    "active",
    "in_progress",
    "in_review",
    "pr_open",
  ]) {
    const source = activeExpiryRoadmap({
      activeStatus,
    });
    const evaluatedAt = new Date(O3A_EXPIRY);
    const plan = createRoadmapRunnerPlanFromYamlAt(
      source,
      evaluatedAt,
    );
    const selector = createNextTaskResultFromYaml(
      source,
      evaluatedAt,
    );
    const s236a = byId(plan, "S236A");

    assert.equal(s236a.status, activeStatus);
    assert.equal(s236a.statusCategory, "active");
    assert.equal(s236a.readinessStatus, "blocked");
    assert.deepEqual(s236a.missingDependencies, ["O3A"]);
    assert.equal(
      s236a.blockedReasons[0].code,
      "expired_dependency",
    );
    assert.equal(plan.wipOccupiedCount, 1);
    assert.equal(selector.activeCount, 1);
    assert.deepEqual(selector.active, []);
    assertRunnerSelectorParity(plan, selector);
  }
});

test("active items with non-expiring completed dependencies retain active behavior", () => {
  const source = activeExpiryRoadmap({
    includeExpiry: false,
  });
  const evaluatedAt = new Date(
    "2030-01-01T00:00:00.000Z",
  );
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const selector = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );
  const s236a = byId(plan, "S236A");

  assert.equal(s236a.statusCategory, "active");
  assert.equal(s236a.readinessStatus, "active");
  assert.deepEqual(s236a.missingDependencies, []);
  assert.deepEqual(s236a.blockedReasons, []);
  assert.deepEqual(
    selector.active.map((entry) => entry.id),
    ["S236A"],
  );
  assertRunnerSelectorParity(plan, selector);
});

test("dependency-blocked active items retain their raw lock and completed records stay terminal", () => {
  const source = activeExpiryRoadmap({
    extraItems: [
      item({
        id: "S236C",
        lockGroup: "private-authoring",
        priority: 6,
      }),
      item({
        id: "S236D",
        status: "completed",
        dependencies: ["O3A"],
        priority: 7,
      }),
    ],
  });
  const evaluatedAt = new Date(O3A_EXPIRY);
  const plan = createRoadmapRunnerPlanFromYamlAt(
    source,
    evaluatedAt,
  );
  const selector = createNextTaskResultFromYaml(
    source,
    evaluatedAt,
  );
  const s236c = byId(plan, "S236C");
  const o3a = byId(plan, "O3A");
  const s236d = byId(plan, "S236D");

  assert.equal(o3a.statusCategory, "completed");
  assert.equal(o3a.readinessStatus, "completed");
  assert.deepEqual(o3a.blockedReasons, []);
  assert.ok(plan.completedItemIds.includes("O3A"));
  assert.equal(s236d.statusCategory, "completed");
  assert.equal(s236d.readinessStatus, "completed");
  assert.deepEqual(s236d.blockedReasons, []);
  assert.ok(plan.completedItemIds.includes("S236D"));
  assert.equal(plan.wipOccupiedCount, 1);
  assert.equal(plan.availableSlots, 1);
  assert.equal(s236c.readinessStatus, "blocked");
  assert.deepEqual(
    s236c.blockedReasons.map((reason) => reason.code),
    ["lock_group_in_use"],
  );
  assert.equal(
    s236c.blockedReasons[0].occupyingItemId,
    "S236A",
  );
  assert.deepEqual(
    selector.blockedByLock.find(
      (entry) => entry.id === "S236C",
    ),
    {
      id: "S236C",
      lockGroup: "private-authoring",
    },
  );
  assert.deepEqual(plan.selectedItemIds, ["S236B"]);
  assertRunnerSelectorParity(plan, selector);
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

test("live blockers reserve two slots while the sole delivery slot selects WCV-C2", () => {
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
  assert.equal(plan.wipLimit, 3);
  assert.equal(plan.wipOccupiedCount, 2);
  assert.equal(plan.availableSlots, 1);
  assert.deepEqual(plan.readyItemIds, ["WCV-C2", "S236B"]);
  assert.deepEqual(plan.selectedItemIds, ["WCV-C2"]);
  assert.deepEqual(
    postMerge.selected.map((entry) => entry.id),
    plan.selectedItemIds,
  );
  assert.deepEqual([...new Set(plan.analyses.map((analysis) => analysis.status))], [
    "completed",
    "queued",
    "blocked",
  ]);
  assert.ok(plan.analyses.every((analysis) => supported.has(analysis.statusCategory)));

  const s235a = byId(plan, "S235A");
  assert.equal(s235a.status, "completed");
  assert.equal(s235a.readinessStatus, "completed");

  const s235b = byId(plan, "S235B");
  assert.equal(s235b.status, "completed");
  assert.equal(s235b.readinessStatus, "completed");

  const wcvC1 = byId(plan, "WCV-C1");
  assert.equal(wcvC1.status, "completed");
  assert.equal(wcvC1.readinessStatus, "completed");

  const wcvC2 = byId(plan, "WCV-C2");
  assert.equal(wcvC2.status, "queued");
  assert.equal(wcvC2.readinessStatus, "ready");
  assert.deepEqual(wcvC2.dependencies, ["WCV-C1"]);
  assert.equal(wcvC2.lockGroup, "wcv-vertical-campaign");

  const o3a = byId(plan, "O3A");
  assert.equal(o3a.status, "completed");
  assert.equal(o3a.readinessStatus, "completed");
  assert.deepEqual(o3a.dependencies, ["S235A", "S234R"]);

  const s236b = byId(plan, "S236B");
  assert.equal(s236b.status, "queued");
  assert.equal(s236b.readinessStatus, "ready");
  assert.deepEqual(s236b.dependencies, ["S235B", "S234R"]);

  const o4v = byId(plan, "O4V");
  assert.equal(o4v.status, "completed");
  assert.equal(o4v.readinessStatus, "completed");
  assert.deepEqual(o4v.dependencies, ["S234R"]);

  const s236p = byId(plan, "S236P");
  assert.equal(s236p.status, "blocked");
  assert.equal(s236p.readinessStatus, "blocked");
  assert.deepEqual(s236p.missingDependencies, []);
  assert.equal(
    s236p.blockedReasons.some((reason) => reason.code === "blocked_status"),
    true,
  );

  const cpf1 = byId(plan, "CPF-1");
  assert.equal(cpf1.status, "blocked");
  assert.equal(cpf1.readinessStatus, "blocked");
  assert.deepEqual(cpf1.missingDependencies, []);
  assert.equal(
    cpf1.blockedReasons.some((reason) => reason.code === "blocked_status"),
    true,
  );

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
    assertRunnerSelectorParity(plan, postMerge);
    assert.equal(plan.wipOccupiedCount, 2);
    assert.equal(plan.availableSlots, 1);
    assert.deepEqual(plan.readyItemIds, ["WCV-C2", "S236B"]);
    assert.deepEqual(plan.selectedItemIds, ["WCV-C2"]);
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

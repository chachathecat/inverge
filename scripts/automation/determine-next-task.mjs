#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const COMPLETED_STATUSES = new Set([
  "completed",
  "done",
  "merged",
  "released",
]);

const ACTIVE_STATUSES = new Set([
  "active",
  "in_progress",
  "in_review",
  "pr_open",
  "blocked",
  "human_decision",
]);

const QUEUED_STATUSES = new Set([
  "queued",
  "ready",
]);

function normalizeStatus(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function stripComment(line) {
  let quote = null;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (
      (character === '"' || character === "'") &&
      line[index - 1] !== "\\"
    ) {
      quote = quote === character ? null : quote ?? character;
    }

    if (character === "#" && quote === null) {
      return line.slice(0, index);
    }
  }

  return line;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (value === "") return "";
  if (value === "[]") return [];

  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();

    if (!body) return [];

    return body
      .split(",")
      .map((entry) => String(parseScalar(entry)).trim());
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;

  return value;
}

function parseActiveProgramYaml(source) {
  const document = {
    program: {},
    items: [],
  };

  let section = null;
  let currentItem = null;

  for (const originalLine of source.split(/\r?\n/)) {
    const line = stripComment(originalLine).replace(/\s+$/, "");

    if (!line.trim()) continue;

    const topLevel = line.match(
      /^([A-Za-z][\w-]*):\s*(.*)$/,
    );

    if (topLevel) {
      const [, key, rawValue] = topLevel;

      if (key === "program" || key === "items") {
        section = key;
        currentItem = null;
      } else {
        document[key] = parseScalar(rawValue);
      }

      continue;
    }

    if (section === "program") {
      const field = line.match(
        /^\s{2}([A-Za-z][\w-]*):\s*(.*)$/,
      );

      if (field) {
        document.program[field[1]] =
          parseScalar(field[2]);

        continue;
      }
    }

    if (section === "items") {
      const itemStart = line.match(
        /^\s{2}-\s+id:\s*(.*)$/,
      );

      if (itemStart) {
        currentItem = {
          id: parseScalar(itemStart[1]),
        };

        document.items.push(currentItem);
        continue;
      }

      const field = line.match(
        /^\s{4}([A-Za-z][\w-]*):\s*(.*)$/,
      );

      if (field && currentItem) {
        currentItem[field[1]] =
          parseScalar(field[2]);

        continue;
      }
    }

    throw new Error(
      `지원하지 않는 roadmap YAML 줄입니다: ${originalLine}`,
    );
  }

  return document;
}

function validateRoadmap(roadmap) {
  if (!roadmap.program) {
    throw new Error("roadmap.program이 필요합니다.");
  }

  if (
    !Array.isArray(roadmap.items) ||
    roadmap.items.length === 0
  ) {
    throw new Error(
      "roadmap.items에는 최소 한 개의 항목이 필요합니다.",
    );
  }

  const ids = new Set();

  for (const item of roadmap.items) {
    if (!item.id || typeof item.id !== "string") {
      throw new Error(
        "모든 roadmap 항목에는 문자열 id가 필요합니다.",
      );
    }

    if (ids.has(item.id)) {
      throw new Error(
        `중복된 roadmap id입니다: ${item.id}`,
      );
    }

    ids.add(item.id);
  }

  for (const item of roadmap.items) {
    const dependencies = Array.isArray(
      item.dependencies,
    )
      ? item.dependencies
      : [];

    for (const dependency of dependencies) {
      if (!ids.has(dependency)) {
        throw new Error(
          `${item.id}의 알 수 없는 의존성: ${dependency}`,
        );
      }

      if (dependency === item.id) {
        throw new Error(
          `${item.id}는 자기 자신에 의존할 수 없습니다.`,
        );
      }
    }
  }

  const byId = new Map(
    roadmap.items.map((item) => [item.id, item]),
  );

  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visited.has(id)) return;

    if (visiting.has(id)) {
      throw new Error(
        `의존성 순환이 발견되었습니다: ${id}`,
      );
    }

    visiting.add(id);

    const item = byId.get(id);

    for (const dependency of item.dependencies ?? []) {
      visit(dependency);
    }

    visiting.delete(id);
    visited.add(id);
  }

  for (const item of roadmap.items) {
    visit(item.id);
  }
}

function selectNextTasks(roadmap) {
  const items = roadmap.items.map(
    (item, order) => ({
      ...item,
      _order: order,
    }),
  );

  const completedIds = new Set(
    items
      .filter((item) =>
        COMPLETED_STATUSES.has(
          normalizeStatus(item.status),
        ),
      )
      .map((item) => item.id),
  );

  const activeItems = items.filter((item) =>
    ACTIVE_STATUSES.has(
      normalizeStatus(item.status),
    ),
  );

  const activeLockGroups = new Set(
    activeItems
      .map((item) => item.lockGroup)
      .filter(Boolean),
  );

  const wipLimit = Math.max(
    1,
    Number(roadmap.program.wipLimit ?? 1),
  );

  const availableSlots = Math.max(
    0,
    wipLimit - activeItems.length,
  );

  const eligible = [];
  const blockedByDependency = [];
  const blockedByLock = [];

  for (const item of items) {
    if (
      !QUEUED_STATUSES.has(
        normalizeStatus(item.status),
      )
    ) {
      continue;
    }

    const dependencies = Array.isArray(
      item.dependencies,
    )
      ? item.dependencies
      : [];

    const missingDependencies =
      dependencies.filter(
        (dependency) =>
          !completedIds.has(dependency),
      );

    if (missingDependencies.length > 0) {
      blockedByDependency.push({
        id: item.id,
        missingDependencies,
      });

      continue;
    }

    if (
      item.lockGroup &&
      activeLockGroups.has(item.lockGroup)
    ) {
      blockedByLock.push({
        id: item.id,
        lockGroup: item.lockGroup,
      });

      continue;
    }

    eligible.push(item);
  }

  eligible.sort((left, right) => {
    const leftPriority = Number.isFinite(
      Number(left.priority),
    )
      ? Number(left.priority)
      : 999999;

    const rightPriority = Number.isFinite(
      Number(right.priority),
    )
      ? Number(right.priority)
      : 999999;

    return (
      leftPriority - rightPriority ||
      left._order - right._order
    );
  });

  const selected = [];
  const selectedLockGroups = new Set();

  for (const item of eligible) {
    if (selected.length >= availableSlots) {
      break;
    }

    if (
      item.lockGroup &&
      selectedLockGroups.has(item.lockGroup)
    ) {
      continue;
    }

    selected.push(item);

    if (item.lockGroup) {
      selectedLockGroups.add(item.lockGroup);
    }
  }

  function removeInternalFields(item) {
    const { _order, ...cleanItem } = item;
    return cleanItem;
  }

  return {
    programId: roadmap.program.id ?? null,
    completionItem:
      roadmap.program.completionItem ?? null,
    wipLimit,
    activeCount: activeItems.length,
    availableSlots,
    active: activeItems.map(
      removeInternalFields,
    ),
    selected: selected.map(
      removeInternalFields,
    ),
    blockedByDependency,
    blockedByLock,
  };
}

function writeGitHubOutputs(
  result,
  artifactPath,
) {
  if (!process.env.GITHUB_OUTPUT) return;

  const output = [
    `has_selection=${result.selected.length > 0}`,
    `selected_count=${result.selected.length}`,
    `selected_ids=${result.selected
      .map((item) => item.id)
      .join(",")}`,
    `artifact_path=${artifactPath}`,
  ];

  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    `${output.join("\n")}\n`,
    "utf8",
  );
}

function main() {
  const roadmapPath = path.resolve(
    process.cwd(),
    process.env.ROADMAP_PATH ??
      "roadmap/active-program.yml",
  );

  const artifactPath = path.resolve(
    process.cwd(),
    process.env.NEXT_TASK_OUTPUT ??
      ".agent-factory/next-task.json",
  );

  if (!fs.existsSync(roadmapPath)) {
    throw new Error(
      `Roadmap 파일을 찾을 수 없습니다: ${roadmapPath}`,
    );
  }

  const roadmap = parseActiveProgramYaml(
    fs.readFileSync(roadmapPath, "utf8"),
  );

  validateRoadmap(roadmap);

  const result = {
    generatedAt: new Date().toISOString(),
    roadmapPath: path.relative(
      process.cwd(),
      roadmapPath,
    ),
    ...selectNextTasks(roadmap),
  };

  fs.mkdirSync(
    path.dirname(artifactPath),
    { recursive: true },
  );

  fs.writeFileSync(
    artifactPath,
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );

  writeGitHubOutputs(
    result,
    path.relative(
      process.cwd(),
      artifactPath,
    ),
  );

  console.log(
    JSON.stringify(result, null, 2),
  );
}

try {
  main();
} catch (error) {
  console.error(
    error instanceof Error
      ? error.stack
      : error,
  );

  process.exitCode = 1;
}

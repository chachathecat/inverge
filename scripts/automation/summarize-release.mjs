#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function stripComment(line) {
  let quote = null;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (
      (character === '"' || character === "'") &&
      line[index - 1] !== "\\"
    ) {
      quote = quote === character
        ? null
        : quote ?? character;
    }

    if (
      character === "#" &&
      quote === null
    ) {
      return line.slice(0, index);
    }
  }

  return line;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();

  if (value === "") return "";
  if (value === "[]") return [];

  if (
    value.startsWith("[") &&
    value.endsWith("]")
  ) {
    const body = value.slice(1, -1).trim();

    if (!body) return [];

    return body
      .split(",")
      .map((entry) =>
        String(parseScalar(entry)).trim(),
      );
  }

  if (
    (value.startsWith('"') &&
      value.endsWith('"')) ||
    (value.startsWith("'") &&
      value.endsWith("'"))
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

  for (
    const originalLine of source.split(/\r?\n/)
  ) {
    const line = stripComment(
      originalLine,
    ).replace(/\s+$/, "");

    if (!line.trim()) continue;

    const topLevel = line.match(
      /^([A-Za-z][\w-]*):\s*(.*)$/,
    );

    if (topLevel) {
      const [, key, rawValue] = topLevel;

      if (
        key === "program" ||
        key === "items"
      ) {
        section = key;
        currentItem = null;
      } else {
        document[key] =
          parseScalar(rawValue);
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

function normalizeStatus(value) {
  return String(value ?? "unknown")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function groupByStatus(items) {
  const groups = new Map();

  for (const item of items) {
    const status = normalizeStatus(
      item.status,
    );

    const currentItems =
      groups.get(status) ?? [];

    currentItems.push(item);
    groups.set(status, currentItems);
  }

  return groups;
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    );
  } catch {
    return null;
  }
}

function escapeCell(value) {
  return String(value ?? "-")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
}

function buildMarkdown({
  roadmap,
  statusGroups,
  nextTaskResult,
  generatedAt,
}) {
  const completed = [
    "completed",
    "done",
    "merged",
    "released",
  ].flatMap(
    (status) =>
      statusGroups.get(status) ?? [],
  );

  const active = [
    "active",
    "in_progress",
    "in_review",
    "pr_open",
  ].flatMap(
    (status) =>
      statusGroups.get(status) ?? [],
  );

  const blocked = [
    "blocked",
    "human_decision",
  ].flatMap(
    (status) =>
      statusGroups.get(status) ?? [],
  );

  const queued =
    statusGroups.get("queued") ?? [];

  const selected =
    nextTaskResult?.selected ?? [];

  const lines = [
    "# Inverge Agent Factory Release Digest",
    "",
    `Generated: ${generatedAt}`,
    `Program: ${
      roadmap.program?.id ?? "unknown"
    }`,
    `Completion target: ${
      roadmap.program?.completionItem ??
      "unknown"
    }`,
    "",
    "## Program status",
    "",
    `- Completed: ${completed.length}`,
    `- Active: ${active.length}`,
    `- Blocked / human decision: ${blocked.length}`,
    `- Queued: ${queued.length}`,
    "",
    "## Active work",
    "",
  ];

  if (active.length === 0) {
    lines.push(
      "No active roadmap item.",
    );
  } else {
    lines.push(
      "| ID | Title | Risk |",
      "|---|---|---|",
    );

    for (const item of active) {
      lines.push(
        `| ${escapeCell(item.id)} | ${escapeCell(
          item.title,
        )} | ${escapeCell(item.risk)} |`,
      );
    }
  }

  lines.push(
    "",
    "## Next eligible work",
    "",
  );

  if (selected.length === 0) {
    lines.push(
      "No roadmap item is currently selected.",
    );
  } else {
    lines.push(
      "| ID | Title | Lock group |",
      "|---|---|---|",
    );

    for (const item of selected) {
      lines.push(
        `| ${escapeCell(item.id)} | ${escapeCell(
          item.title,
        )} | ${escapeCell(
          item.lockGroup,
        )} |`,
      );
    }
  }

  lines.push(
    "",
    "## Blockers requiring human attention",
    "",
  );

  if (blocked.length === 0) {
    lines.push(
      "None recorded in the roadmap.",
    );
  } else {
    for (const item of blocked) {
      lines.push(
        `- ${item.id}: ${
          item.title ?? "Untitled"
        } (${normalizeStatus(item.status)})`,
      );
    }
  }

  lines.push(
    "",
    "## Recently completed roadmap items",
    "",
  );

  if (completed.length === 0) {
    lines.push(
      "None recorded in the roadmap.",
    );
  } else {
    for (
      const item of completed
        .slice(-10)
        .reverse()
    ) {
      lines.push(
        `- ${item.id}: ${
          item.title ?? "Untitled"
        }`,
      );
    }
  }

  lines.push("");

  return lines.join("\n");
}

function main() {
  const roadmapPath = path.resolve(
    process.cwd(),
    process.env.ROADMAP_PATH ??
      "roadmap/active-program.yml",
  );

  const nextTaskPath = path.resolve(
    process.cwd(),
    process.env.NEXT_TASK_OUTPUT ??
      ".agent-factory/next-task.json",
  );

  const markdownPath = path.resolve(
    process.cwd(),
    process.env.RELEASE_DIGEST_OUTPUT ??
      ".agent-factory/release-digest.md",
  );

  const jsonPath = path.resolve(
    process.cwd(),
    process.env.RELEASE_DIGEST_JSON ??
      ".agent-factory/release-digest.json",
  );

  if (!fs.existsSync(roadmapPath)) {
    throw new Error(
      `Roadmap 파일을 찾을 수 없습니다: ${roadmapPath}`,
    );
  }

  const roadmap = parseActiveProgramYaml(
    fs.readFileSync(roadmapPath, "utf8"),
  );

  const statusGroups = groupByStatus(
    roadmap.items ?? [],
  );

  const nextTaskResult =
    readJsonIfPresent(nextTaskPath);

  const generatedAt =
    new Date().toISOString();

  const summary = {
    generatedAt,
    programId:
      roadmap.program?.id ?? null,
    completionItem:
      roadmap.program?.completionItem ??
      null,
    counts: Object.fromEntries(
      [...statusGroups.entries()].map(
        ([status, items]) => [
          status,
          items.length,
        ],
      ),
    ),
    active: [
      "active",
      "in_progress",
      "in_review",
      "pr_open",
    ].flatMap(
      (status) =>
        statusGroups.get(status) ?? [],
    ),
    blocked: [
      "blocked",
      "human_decision",
    ].flatMap(
      (status) =>
        statusGroups.get(status) ?? [],
    ),
    nextSelected:
      nextTaskResult?.selected ?? [],
  };

  const markdown = buildMarkdown({
    roadmap,
    statusGroups,
    nextTaskResult,
    generatedAt,
  });

  fs.mkdirSync(
    path.dirname(markdownPath),
    { recursive: true },
  );

  fs.writeFileSync(
    markdownPath,
    `${markdown}\n`,
    "utf8",
  );

  fs.writeFileSync(
    jsonPath,
    `${JSON.stringify(
      summary,
      null,
      2,
    )}\n`,
    "utf8",
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${markdown}\n`,
      "utf8",
    );
  }

  console.log(markdown);
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

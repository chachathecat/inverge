#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  createRoadmapRunnerPlan,
  parseActiveProgramYaml,
} from "../lib/agent-factory/roadmap-runner.ts";
import {
  buildTaskFactoryMarkdown,
  createCodexTaskFactoryOutput,
} from "../lib/agent-factory/codex-task-package.ts";

function parseArguments(argv) {
  const options = {
    roadmapPath: process.env.ROADMAP_PATH ?? "roadmap/active-program.yml",
    jsonPath:
      process.env.AGENT_FACTORY_JSON ??
      ".agent-factory/codex-task-packages.json",
    markdownPath:
      process.env.AGENT_FACTORY_MARKDOWN ??
      ".agent-factory/codex-task-packages.md",
    stdout: process.env.AGENT_FACTORY_STDOUT ?? "markdown",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--roadmap" && next) {
      options.roadmapPath = next;
      index += 1;
      continue;
    }

    if (arg === "--json" && next) {
      options.jsonPath = next;
      index += 1;
      continue;
    }

    if (arg === "--markdown" && next) {
      options.markdownPath = next;
      index += 1;
      continue;
    }

    if (arg === "--stdout" && next) {
      options.stdout = next;
      index += 1;
      continue;
    }

    if (arg === "--help") {
      options.help = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function helpText() {
  return [
    "Usage: npm run agent-factory:plan -- [options]",
    "",
    "Options:",
    "  --roadmap <path>   Roadmap YAML path. Default: roadmap/active-program.yml",
    "  --json <path>      JSON artifact path. Default: .agent-factory/codex-task-packages.json",
    "  --markdown <path>  Markdown artifact path. Default: .agent-factory/codex-task-packages.md",
    "  --stdout <mode>    markdown, json, or none. Default: markdown",
  ].join("\n");
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.replace(/\s*$/, "")}\n`, "utf8");
}

function main() {
  const options = parseArguments(process.argv.slice(2));

  if (options.help) {
    console.log(helpText());
    return;
  }

  const roadmapPath = path.resolve(process.cwd(), options.roadmapPath);
  if (!fs.existsSync(roadmapPath)) {
    throw new Error(`Roadmap file not found: ${roadmapPath}`);
  }

  const roadmapSource = fs.readFileSync(roadmapPath, "utf8");
  const roadmap = parseActiveProgramYaml(roadmapSource);
  const roadmapPlan = createRoadmapRunnerPlan(roadmap);
  const roadmapPathForOutput = path.relative(process.cwd(), roadmapPath).replaceAll("\\", "/");
  const factoryOutput = createCodexTaskFactoryOutput(roadmapPlan, {
    roadmapPath: roadmapPathForOutput,
  });
  const markdown = buildTaskFactoryMarkdown(factoryOutput);
  const json = JSON.stringify(factoryOutput, null, 2);

  writeFile(path.resolve(process.cwd(), options.jsonPath), json);
  writeFile(path.resolve(process.cwd(), options.markdownPath), markdown);

  if (options.stdout === "json") {
    console.log(json);
  } else if (options.stdout === "markdown") {
    console.log(markdown);
  } else if (options.stdout !== "none") {
    throw new Error("--stdout must be one of: markdown, json, none");
  }
}

try {
  main();
} catch (error) {
  console.error(
    `agent-factory-plan: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}

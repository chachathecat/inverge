import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const defaultTestFiles = [
  "tests/closed-beta-golden-flow-routes.test.mjs",
  "tests/learner-loop-production-gap-audit.test.mjs",
  "tests/capture-to-note-quality-hardening.test.mjs",
  "tests/qnet-historical-materials-batch-plan.test.mjs",
  "tests/qnet-official-materials-reference.test.mjs",
  "tests/qnet-reference-intelligence-report.test.mjs",
];
const rawArgs = process.argv.slice(2);
const nodeTestArgs = [];
const requestedFiles = [];

for (let index = 0; index < rawArgs.length; index += 1) {
  const arg = rawArgs[index];
  if (arg === "--workers") {
    const value = rawArgs[index + 1] ?? "1";
    nodeTestArgs.push(`--test-concurrency=${value}`);
    index += 1;
  } else if (arg.startsWith("--workers=")) {
    nodeTestArgs.push(`--test-concurrency=${arg.slice("--workers=".length)}`);
  } else if (arg.startsWith("tests/") || arg.endsWith(".test.mjs")) {
    requestedFiles.push(arg);
  } else {
    nodeTestArgs.push(arg);
  }
}

const testFiles = requestedFiles.length > 0 ? requestedFiles : defaultTestFiles;
const missingFiles = testFiles.filter((file) => !existsSync(file));

if (missingFiles.length > 0) {
  console.error(`[run-node-tests] Missing test file(s): ${missingFiles.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "--test",
    ...nodeTestArgs,
    ...testFiles,
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);

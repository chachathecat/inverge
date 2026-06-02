import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const nodeCommand = process.execPath;

const steps = [
  {
    label: "learner-loop verification (includes guardrail audit)",
    command: npmCommand,
    args: ["run", "verify:learner-loop:ci"],
  },
  {
    label: "data-boundary tests",
    command: nodeCommand,
    args: ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", "--test", "tests/data-boundary-hardening.test.mjs"],
  },
  {
    label: "question-reference tests",
    command: nodeCommand,
    args: ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", "--test", "tests/question-reference-db.test.mjs"],
  },

  {
    label: "staging learner route checks",
    command: npmCommand,
    args: ["run", "check:staging-learner-routes"],
  },
  {
    label: "route/source guard checks",
    command: nodeCommand,
    args: ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", "--test", "tests/closed-beta-learner-loop-smoke.test.mjs"],
  },
  {
    label: "build",
    command: npmCommand,
    args: ["run", "build"],
  },
];

for (const step of steps) {
  console.log(`\n[closed-beta-readiness] ${step.label}`);
  const result = spawnSync(step.command, step.args, { stdio: "inherit", shell: false });
  if (result.error) {
    console.error(`[closed-beta-readiness] ERROR in ${step.label}:`, result.error);
    process.exitCode = 1;
    break;
  }
  if (result.status !== 0) {
    console.error(`[closed-beta-readiness] FAIL: ${step.label}`);
    process.exitCode = result.status ?? 1;
    break;
  }
}

if (!process.exitCode) {
  console.log("\n[closed-beta-readiness] PASS: closed beta learner loop, guardrail audit, data boundary, route/source guards, question references, and build passed.");
}

import { spawnSync } from "node:child_process";

const nodeCommand = process.execPath;

function npmStep(label, scriptName) {
  return {
    label,
    command: process.platform === "win32" ? "cmd.exe" : "npm",
    args: process.platform === "win32" ? ["/d", "/s", "/c", "npm.cmd", "run", scriptName] : ["run", scriptName],
  };
}

const steps = [
  npmStep("learner-loop verification (includes guardrail audit)", "verify:learner-loop:ci"),
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

  npmStep("staging learner route checks", "check:staging-learner-routes"),
  {
    label: "route/source guard checks",
    command: nodeCommand,
    args: ["--experimental-strip-types", "--loader", "./tests/ts-extension-loader.mjs", "--test", "tests/closed-beta-learner-loop-smoke.test.mjs"],
  },
  npmStep("build", "build"),
];

for (const step of steps) {
  console.log(`\n[closed-beta-readiness] ${step.label}`);
  const result = spawnSync(step.command, step.args, { stdio: "inherit", shell: false, env: process.env });
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

import fs from "node:fs";
import path from "node:path";

const REQUIRED_GATES = [
  "billingConfigured",
  "entitlementEnforced",
  "privacyExportImplemented",
  "privacyDeleteImplemented",
  "supportContactVisible",
  "refundPolicyVisible",
  "aiQualityEvalPassing",
  "learnerLoopHealthPassing",
  "stagingSmokeConfigured",
  "costGuardrailsConfigured",
];

export function evaluateReadiness(config) {
  const missing = [];

  for (const gate of REQUIRED_GATES) {
    if (config?.[gate] !== true) {
      missing.push(gate);
    }
  }

  return {
    passed: missing.length === 0,
    missing,
  };
}

export function loadReadinessConfig(configPath = path.resolve(process.cwd(), "config/paid-launch-readiness.json")) {
  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}

export function run() {
  const config = loadReadinessConfig();
  const result = evaluateReadiness(config);

  if (!result.passed) {
    console.error("[paid-launch-readiness] FAIL: missing or false gates detected.");
    for (const gate of result.missing) {
      console.error(`- ${gate}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[paid-launch-readiness] PASS: all required paid launch gates are enabled.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    run();
  } catch (error) {
    console.error("[paid-launch-readiness] ERROR", error);
    process.exitCode = 1;
  }
}

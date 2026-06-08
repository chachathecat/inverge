import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { evaluateExplanationLadderQuality } from "../lib/review-os/explanation-quality-eval.ts";

const fixtureDir = "tests/fixtures/explanation-quality";
const fixtures = readdirSync(fixtureDir)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => ({ file, ...JSON.parse(readFileSync(join(fixtureDir, file), "utf8")) }));

let passed = 0;
let failedExpected = 0;
const failures = [];

for (const fixture of fixtures) {
  const result = evaluateExplanationLadderQuality(fixture.ladder, fixture.context);
  if (fixture.expectedStatus === "pass") {
    if (result.status === "pass") passed += 1;
    else failures.push({ file: fixture.file, expected: fixture.expectedStatus, actual: result.status, failedChecks: result.failedChecks });
    continue;
  }

  const expectedChecks = fixture.expectedFailedChecks ?? [];
  const hasExpectedChecks = expectedChecks.every((check) => result.failedChecks.includes(check));
  if (result.status !== "pass" && hasExpectedChecks) failedExpected += 1;
  else failures.push({ file: fixture.file, expected: fixture.expectedStatus, actual: result.status, failedChecks: result.failedChecks });
}

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "failed_explanation_quality_eval", failures }, null, 2));
  process.exit(1);
}

const output = {
  status: "passed_explanation_quality_eval",
  fixtures: {
    passed,
    failedExpected,
  },
  verified: [
    "all_four_labels",
    "ten_second_check_convertible",
    "no_forbidden_claims",
    "no_raw_text_leak",
    "trap_point_specific",
  ],
};

console.log(JSON.stringify(output, null, 2));

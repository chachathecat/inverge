import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import {
  assertPrContractDoctorReportSafe,
  createPrContractDoctorReport,
  prContractHeadings,
} from "../lib/agent-factory/pr-contract-doctor.ts";

const VALIDATOR_SCRIPT = path.resolve("scripts/automation/validate-pr-contract.mjs");
const DOCTOR_SCRIPT = path.resolve("scripts/agent-factory-doctor-pr-body.mjs");

function validBody(overrides = {}) {
  const issue = overrides.issue ?? "Closes #455";
  const risk = overrides.risk ?? "- Risk: [low]";
  const mergeRecommendation = overrides.mergeRecommendation ?? [
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");
  const schema = overrides.schema ?? "None recorded.";

  return `## Goal

${issue}

Implement AF003 PR body contract repair.

## Non-goals

- Do not mutate GitHub state.
- Do not change learner-facing product behavior.

## Risk classification

${risk}
- Source-level automation only.

## Data boundary

- Metadata-only PR body text.

## Schema / API / environment changes

${schema}

## Tests and evidence

- Focused AF003 tests.

## Runtime evidence

- Required: Not required for source-level automation.
- Result: Not applicable.
- Artifact: Source-level test output.

## Rollout and rollback

- Rollout: Merge after required checks pass.
- Rollback: Revert this PR.

## Remaining risks

- Human review must confirm the repaired body before pasting.

## Merge recommendation

${mergeRecommendation}
`;
}

function runValidator(body) {
  return spawnSync(process.execPath, [VALIDATOR_SCRIPT], {
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_EVENT_PATH: "",
      PR_BODY: body,
    },
  });
}

function assertValidatorPasses(body) {
  const result = runValidator(body);
  assert.equal(result.status, 0, result.stderr);
}

function headingLines(body) {
  return body.match(/^## .+$/gm) ?? [];
}

test("valid PR contract body remains semantically equivalent", () => {
  const source = validBody();
  const report = createPrContractDoctorReport(source);

  assert.equal(report.validBefore, true);
  assert.equal(report.validAfter, true);
  assert.equal(report.repairedBody.trim(), source.trim());
  assertValidatorPasses(report.repairedBody);
});

test("missing headings are inserted in the required order", () => {
  const report = createPrContractDoctorReport(
    [
      "Closes #455",
      "",
      "Implement the source-level PR body repair.",
      "",
      "[low]",
      "",
      "Human approval required",
    ].join("\n"),
  );

  assert.deepEqual(headingLines(report.repairedBody), [...prContractHeadings()]);
  assert.equal(report.validAfter, true);
  assert.ok(report.headingFindings.some((finding) => finding.status === "missing_inserted"));
  assertValidatorPasses(report.repairedBody);
});

test("Summary Validation Notes body is migrated into required sections", () => {
  const report = createPrContractDoctorReport(
    [
      "## Summary",
      "Closes #455.",
      "Implement the deterministic repair.",
      "",
      "## Validation",
      "- node --test tests/agent-factory-pr-contract-doctor.test.mjs",
      "",
      "## Notes",
      "[low]",
      "Human approval required",
    ].join("\n"),
  );

  assert.equal(report.validAfter, true);
  assert.ok(report.repairedBody.includes("Implement the deterministic repair."));
  assert.ok(report.repairedBody.includes("- node --test tests/agent-factory-pr-contract-doctor.test.mjs"));
  assert.ok(report.headingFindings.some((finding) => finding.heading === "## Summary" && finding.targetHeading === "## Goal"));
  assert.ok(report.headingFindings.some((finding) => finding.heading === "## Validation" && finding.targetHeading === "## Tests and evidence"));
  assert.ok(report.headingFindings.some((finding) => finding.heading === "## Notes" && finding.targetHeading === "## Remaining risks"));
  assertValidatorPasses(report.repairedBody);
});

test("Closes trailing period is normalized", () => {
  const report = createPrContractDoctorReport(validBody({ issue: "Closes #123." }));

  assert.equal(report.issueReferenceStatus.status, "normalized");
  assert.match(report.repairedBody, /\nCloses #123\n/);
  assert.doesNotMatch(report.repairedBody, /Closes #123\./);
  assertValidatorPasses(report.repairedBody);
});

test("risk shorthand is repaired to required risk line", () => {
  const report = createPrContractDoctorReport(validBody({ risk: "[low]" }));

  assert.equal(report.riskLineStatus.status, "repaired");
  assert.match(report.repairedBody, /^- Risk: \[low\]$/m);
  assertValidatorPasses(report.repairedBody);
});

test("missing merge recommendation checkboxes are inserted with Human approval checked", () => {
  const report = createPrContractDoctorReport(
    validBody({
      mergeRecommendation: "Human approval required",
    }),
  );

  assert.equal(report.validAfter, true);
  assert.match(report.repairedBody, /^- \[ \] Auto-merge candidate$/m);
  assert.match(report.repairedBody, /^- \[x\] Human approval required$/m);
  assert.match(report.repairedBody, /^- \[ \] Blocked$/m);
  assertValidatorPasses(report.repairedBody);
});

test("duplicate checked boxes are repaired to exactly one checked Human approval", () => {
  const report = createPrContractDoctorReport(
    validBody({
      mergeRecommendation: [
        "- [x] Auto-merge candidate",
        "- [x] Human approval required",
        "- [ ] Blocked",
      ].join("\n"),
    }),
  );
  const checkedLines = report.repairedBody.match(/^- \[x\] .+$/gm) ?? [];

  assert.deepEqual(checkedLines, ["- [x] Human approval required"]);
  assertValidatorPasses(report.repairedBody);
});

test("missing issue number remains invalid unless an issue option supplies one", () => {
  const source = validBody({ issue: "Related work only" });
  const missing = createPrContractDoctorReport(source);
  const supplied = createPrContractDoctorReport(source, { issueNumber: 455 });

  assert.equal(missing.validAfter, false);
  assert.ok(missing.remainingWarnings.some((warning) => warning.includes("issue")));
  assert.equal(supplied.validAfter, true);
  assert.match(supplied.repairedBody, /\nCloses #455\n/);
  assertValidatorPasses(supplied.repairedBody);
});

test("sensitive runtime auth db security provider user-data hints force human review", () => {
  const report = createPrContractDoctorReport(
    validBody({
      schema: "Runtime changes touch auth, db, payment, security, provider, and user-data handling.",
      mergeRecommendation: [
        "- [x] Auto-merge candidate",
        "- [ ] Human approval required",
        "- [ ] Blocked",
      ].join("\n"),
    }),
  );

  assert.match(report.repairedBody, /^- \[ \] Auto-merge candidate$/m);
  assert.match(report.repairedBody, /^- \[x\] Human approval required$/m);
  assert.ok(report.remainingWarnings.some((warning) => warning.includes("Sensitive")));
  assertValidatorPasses(report.repairedBody);
});

test("repaired body passes the existing PR contract validator semantics", () => {
  const cases = [
    validBody({ issue: "Fixes #777.", risk: "Risk: medium" }),
    validBody({
      mergeRecommendation: [
        "- [ ] Auto-merge candidate",
        "- [ ] Blocked",
      ].join("\n"),
    }),
    [
      "## Summary",
      "Closes #455.",
      "Source-level repair.",
      "## Validation",
      "[medium]",
      "Human approval required",
    ].join("\n"),
  ];

  for (const body of cases) {
    const report = createPrContractDoctorReport(body);
    assert.equal(report.validAfter, true);
    assertValidatorPasses(report.repairedBody);
  }
});

test("output contains no secret-looking keys or raw-content fields", () => {
  const report = createPrContractDoctorReport(
    [
      "## Summary",
      "Closes #455",
      "secretToken: ghp_should_not_escape",
      "rawAnswer: learner answer must not escape",
      "[low]",
      "Human approval required",
    ].join("\n"),
  );
  const serialized = JSON.stringify(report);

  assert.doesNotThrow(() => assertPrContractDoctorReportSafe(report));
  assert.equal(serialized.includes("secretToken"), false);
  assert.equal(serialized.includes("ghp_should_not_escape"), false);
  assert.equal(serialized.includes("rawAnswer"), false);
  assert.equal(serialized.includes("learner answer must not escape"), false);
});

test("invalid markdown fails safely with actionable warnings", () => {
  const report = createPrContractDoctorReport("not markdown\n```unclosed\u0000", {
    defaultRisk: "medium",
  });

  assert.equal(report.validAfter, false);
  assert.ok(report.repairedBody.includes("## Goal"));
  assert.ok(report.remainingWarnings.some((warning) => warning.includes("control characters")));
  assert.ok(report.remainingWarnings.some((warning) => warning.includes("No level-two Markdown headings")));
  assert.ok(report.remainingWarnings.some((warning) => warning.includes("Unclosed fenced code block")));
  assert.ok(report.remainingWarnings.some((warning) => warning.includes("issue")));
});

test("CLI writes JSON Markdown and repaired body artifacts", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-pr-doctor-"));
  const bodyPath = path.join(directory, "body.md");
  const jsonPath = path.join(directory, "report.json");
  const markdownPath = path.join(directory, "report.md");
  const repairedPath = path.join(directory, "repaired.md");
  fs.writeFileSync(bodyPath, validBody({ issue: "Related only", risk: "[low]" }), "utf8");

  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--loader",
      "./tests/ts-extension-loader.mjs",
      DOCTOR_SCRIPT,
      "--body",
      bodyPath,
      "--issue",
      "455",
      "--json",
      jsonPath,
      "--markdown",
      markdownPath,
      "--repaired",
      repairedPath,
      "--stdout",
      "none",
    ],
    { encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  assert.equal(report.validAfter, true);
  assert.match(fs.readFileSync(markdownPath, "utf8"), /AF003 PR Contract Doctor Report/);
  assertValidatorPasses(fs.readFileSync(repairedPath, "utf8"));
});

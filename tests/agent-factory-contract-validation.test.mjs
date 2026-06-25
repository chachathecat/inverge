import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const SCRIPT = path.resolve("scripts/automation/validate-pr-contract.mjs");

function completeBody(overrides = {}) {
  const issueLine = overrides.issueLine ?? "Closes #123";
  const recommendation = overrides.recommendation ?? [
    "- [ ] Auto-merge candidate",
    "- [x] Human approval required",
    "- [ ] Blocked",
  ].join("\n");

  return `## Goal

Repair CI.

## Linked issue

${issueLine}

## Non-goals

No product changes.

## Risk classification

- Risk: [high]
- Reasons: workflow changes
- Sensitive paths: .github/workflows/**

## Data boundary

Metadata only.

## Schema / API / environment changes

None.

## Tests and evidence

Fixture tests.

## Runtime evidence

- Required: Not required
- Result: N/A
- Artifact: N/A

## Rollout and rollback

Revert the repair commit.

## Remaining risks

CI must be observed.

## Merge recommendation

${recommendation}
`;
}

function run(body) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-pr-contract-"));
  const eventPath = path.join(directory, "event.json");
  fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { body } }), "utf8");

  return spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, GITHUB_EVENT_PATH: eventPath, PR_BODY: "" },
  });
}

test("complete PR contract passes", () => {
  const result = run(completeBody());
  assert.equal(result.status, 0, result.stderr);
});

test("missing required section fails", () => {
  const result = run(completeBody().replace("## Remaining risks", "## Risks left"));
  assert.notEqual(result.status, 0);
});

test("missing linked issue fails", () => {
  const result = run(completeBody({ issueLine: "Related work only" }));
  assert.notEqual(result.status, 0);
});

test("multiple linked issues fail", () => {
  const result = run(completeBody({ issueLine: "Closes #123\nFixes #124" }));
  assert.notEqual(result.status, 0);
});

test("more than one checked merge recommendation fails", () => {
  const result = run(completeBody({
    recommendation: [
      "- [x] Auto-merge candidate",
      "- [x] Human approval required",
      "- [ ] Blocked",
    ].join("\n"),
  }));
  assert.notEqual(result.status, 0);
});

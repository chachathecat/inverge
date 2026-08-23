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

const c3rPReferenceBody = `## Goal

Deliver the default-off Practice durable-learning vertical.

Refs #706
Refs #707
Refs #708
Refs #714
Refs #781

All referenced issues remain open; C3R-P closes none and does not start C3R-T.

## Non-goals

No Theory, Law, remote mutation, activation, Ready transition, or merge.

## Risk classification

- Risk: [high]

## Data boundary

Learner-private forced-RLS data; shared evidence is metadata-only.

## Schema / API / environment changes

One authorized append and default-off Owner-only API/UI.

## Tests and evidence

Focused Practice, migration, security and binding tests.

## Runtime evidence

Two fresh browser-to-Postgres cycles and installed PostgreSQL 15.8 oracle.

## Rollout and rollback

Forward-only schema, independent kill switch, no destructive data rollback.

## Remaining risks

Draft remains unmerged and all issues remain open.

## Merge recommendation

- [ ] Auto-merge candidate
- [ ] Human approval required
- [x] Blocked
`;

function runC3rP(body, overrides = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-c3r-p-contract-"));
  const eventPath = path.join(directory, "event.json");
  fs.writeFileSync(eventPath, JSON.stringify({
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      body,
      draft: true,
      title: "[WCV-C3R-P] Deliver runtime-first Practice durable-learning clean replan",
      base: { ref: "main", sha: "342d3795c8ea51aeb6f94751a5db913a9dbfcffd" },
      head: {
        ref: "codex/wcv-c3r-p-runtime-first-clean-replan-1",
        repo: { full_name: "chachathecat/inverge" },
      },
      ...overrides,
    },
  }), "utf8");
  return spawnSync(process.execPath, [SCRIPT], {
    encoding: "utf8",
    env: { ...process.env, GITHUB_EVENT_PATH: eventPath, PR_BODY: "" },
  });
}

test("C3R-P exact Draft permits only its five reference-only issue links", () => {
  const valid = runC3rP(c3rPReferenceBody);
  assert.equal(valid.status, 0, valid.stderr);
  assert.notEqual(runC3rP(c3rPReferenceBody.replace("Refs #706", "Closes #706")).status, 0);
  assert.notEqual(runC3rP(c3rPReferenceBody, { draft: false }).status, 0);
});

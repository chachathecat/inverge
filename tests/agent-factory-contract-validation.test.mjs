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

const EXACT_SOURCE_AUTHORITY_PR = {
  title: "[WCV-C3R] Install serial structural recovery authority — clean replacement",
  base: {
    ref: "main",
    sha: "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
  },
  head: {
    ref: "codex/wcv-c3r-sql-dependency-clean-replacement",
    repo: { full_name: "chachathecat/inverge" },
  },
};

function run(body, pullRequest = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "inverge-pr-contract-"));
  const eventPath = path.join(directory, "event.json");
  fs.writeFileSync(
    eventPath,
    JSON.stringify({
      repository: { full_name: pullRequest.repository ?? "example/unrelated" },
      pull_request: {
        body,
        title: pullRequest.title ?? "Unrelated PR",
        base: pullRequest.base ?? { ref: "main" },
        head: pullRequest.head ?? { ref: "feature/unrelated" },
      },
    }),
    "utf8",
  );

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

test("exact WCV-C3R source authority may reference its long-lived tracker without closing it", () => {
  const result = run(
    completeBody({
      issueLine: [
        "Refs #781",
        "Refs #706",
        "Refs #707",
        "Refs #708",
        "Refs #714",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    }),
    { ...EXACT_SOURCE_AUTHORITY_PR, repository: "chachathecat/inverge" },
  );
  assert.equal(result.status, 0, result.stderr);
});

test("WCV-C3R source-authority disposition rejects closing keywords", () => {
  const result = run(
    completeBody({
      issueLine: [
        "Refs #781",
        "Closes #781",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    }),
    { ...EXACT_SOURCE_AUTHORITY_PR, repository: "chachathecat/inverge" },
  );
  assert.notEqual(result.status, 0);
});

test("WCV-C3R reference-only exception fails without the exact tracker reference", () => {
  const result = run(
    completeBody({
      issueLine: [
        "Refs #706",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    }),
    { ...EXACT_SOURCE_AUTHORITY_PR, repository: "chachathecat/inverge" },
  );
  assert.notEqual(result.status, 0);
});

test("WCV-C3R source-authority scope blocks the full GitHub closing-keyword family", () => {
  for (const keyword of [
    "Close",
    "Closes",
    "Closed",
    "Fix",
    "Fixes",
    "Fixed",
    "Resolve",
    "Resolves",
    "Resolved",
  ]) {
    const result = run(
      completeBody({
        issueLine: [
          "Refs #781",
          `${keyword} #781`,
          "- Tracker disposition: remains open; closure authority: C3R-L",
        ].join("\n"),
      }),
      { ...EXACT_SOURCE_AUTHORITY_PR, repository: "chachathecat/inverge" },
    );
    assert.notEqual(result.status, 0, keyword);
  }
  for (const closingReference of [
    "Resolves chachathecat/inverge#781",
    "Fixed https://github.com/chachathecat/inverge/issues/781",
    "Closes: #781",
    "FIXES: chachathecat/inverge#781",
    "RESOLVES: https://github.com/chachathecat/inverge/issues/781",
  ]) {
    const result = run(
      completeBody({
        issueLine: [
          "Refs #781",
          closingReference,
          "- Tracker disposition: remains open; closure authority: C3R-L",
        ].join("\n"),
      }),
      { ...EXACT_SOURCE_AUTHORITY_PR, repository: "chachathecat/inverge" },
    );
    assert.notEqual(result.status, 0, closingReference);
  }
});

test("fork branch with the same name cannot claim the WCV-C3R exception", () => {
  const result = run(
    completeBody({
      issueLine: [
        "Refs #781",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    }),
    {
      ...EXACT_SOURCE_AUTHORITY_PR,
      repository: "chachathecat/inverge",
      head: {
        ref: "codex/wcv-c3r-sql-dependency-clean-replacement",
        repo: { full_name: "attacker/inverge" },
      },
    },
  );
  assert.notEqual(result.status, 0);
});

test("exact WCV-C3R PR fails closed when the reference-only pair is missing", () => {
  const result = run(
    completeBody({ issueLine: "Closes #781" }),
    { ...EXACT_SOURCE_AUTHORITY_PR, repository: "chachathecat/inverge" },
  );
  assert.notEqual(result.status, 0);
});

test("a later main SHA cannot replay the WCV-C3R reference-only exception", () => {
  const result = run(
    completeBody({
      issueLine: [
        "Refs #781",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    }),
    {
      ...EXACT_SOURCE_AUTHORITY_PR,
      repository: "chachathecat/inverge",
      base: { ref: "main", sha: "0000000000000000000000000000000000000000" },
    },
  );
  assert.notEqual(result.status, 0);
});

test("unrelated PR cannot claim the WCV-C3R reference-only exception", () => {
  const result = run(
    completeBody({
      issueLine: [
        "Refs #781",
        "- Tracker disposition: remains open; closure authority: C3R-L",
      ].join("\n"),
    }),
  );
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

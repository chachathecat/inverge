import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  validateMinimalAuthority,
  validateMinimalAuthorityContract,
} from "../scripts/automation/wcv-c3-pre-p-migration-mutation-authority.mjs";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const contractPath = path.join(
  repositoryRoot,
  "config",
  "dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
);
const prContractValidatorPath = path.join(
  repositoryRoot,
  "scripts",
  "automation",
  "validate-pr-contract.mjs",
);
const contract = JSON.parse(await readFile(contractPath, "utf8"));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectError(candidate, code) {
  const result = validateMinimalAuthorityContract(candidate, repositoryRoot);
  assert.equal(result.ok, false);
  assert.ok(
    result.errors.some((error) => error === code || error.startsWith(`${code}:`)),
    `expected ${code}, received ${result.errors.join(", ")}`,
  );
}

test("minimal authority validates exact base, seven bindings, one append and closed scope", async () => {
  const result = await validateMinimalAuthority({ repositoryRoot, contractPath });
  assert.deepEqual(result, { ok: true, errors: [] });

  const shallowEvent = {
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      draft: true,
      title:
        "[WCV-C3 PRE-P] Authorize exact C3R-P migration operations — minimal bridge",
      base: {
        ref: "main",
        sha: "5965ddb0202c5f9effb531824d4d95f775abecc1",
      },
      head: {
        ref: "codex/wcv-c3-pre-p-minimal-migration-mutation-authority",
        sha: "f882e26649a4b538b2efed6c575ced3d3580ca9c",
        repo: { full_name: "chachathecat/inverge" },
      },
    },
  };
  const shallow = validateMinimalAuthorityContract(contract, repositoryRoot, {
    forceShallow: true,
    githubEvent: shallowEvent,
  });
  assert.ok(
    shallow.errors.every((error) => error === "SHALLOW_WORKTREE_DIRTY"),
    shallow.errors.join(", "),
  );

  const wrongShallowBase = clone(shallowEvent);
  wrongShallowBase.pull_request.base.sha = "0".repeat(40);
  const rejectedShallow = validateMinimalAuthorityContract(
    contract,
    repositoryRoot,
    { forceShallow: true, githubEvent: wrongShallowBase },
  );
  assert.ok(rejectedShallow.errors.includes("SHALLOW_PR_CONTEXT"));

  const extraEnvelope = clone(contract);
  extraEnvelope.futureRuntimeEnvelope = {};
  expectError(extraEnvelope, "TOP_LEVEL_KEYS");

  const driftedUpstream = clone(contract);
  driftedUpstream.immutableUpstream.c3rA0.artifacts[0].sha256 = "0".repeat(64);
  expectError(driftedUpstream, "UPSTREAM_c3rA0_ARTIFACT_0");

  const changedOperation = clone(contract);
  changedOperation.operations.records[0].futureEvidence.rawSha256 = "0".repeat(64);
  expectError(changedOperation, "OPERATION_0_FUTURE_PIN");

  const widenedRename = clone(contract);
  widenedRename.operations.records[1].futurePath =
    "supabase/migrations/20260615090001_legal_grounding.sql";
  expectError(widenedRename, "OPERATION_1_futurePath");

  const secondAppend = clone(contract);
  secondAppend.append.countExactly = 2;
  expectError(secondAppend, "APPEND_AUTHORITY");

  const remoteMutation = clone(contract);
  remoteMutation.remoteContinuity.supabaseDbPushAuthorized = true;
  expectError(remoteMutation, "REMOTE_BOUNDARY");

  const startedStage = clone(contract);
  startedStage.stageState.c3rP = "started";
  expectError(startedStage, "STAGE_STATE");

  const runtimeReceipt = clone(contract);
  runtimeReceipt.futureC3rPMigrationAuthorityBindingV1.isRuntimeReceipt = true;
  expectError(runtimeReceipt, "FUTURE_BINDING");

  const extraOwnedPath = clone(contract);
  extraOwnedPath.ownedPaths.push("supabase/migrations/not-authorized.sql");
  expectError(extraOwnedPath, "OWNED_PATH_MANIFEST");
});

const validPrBody = `## Goal

Install the minimal source-only migration-operation bridge.

Refs #706
Refs #707
Refs #708
Refs #714
Refs #781

All referenced issues remain open; this minimal source-only Draft closes none.

## Non-goals

No migration, runtime, remote mutation or merge.

## Risk classification

- Risk: [high]

## Data boundary

Repository source only.

## Schema / API / environment changes

None.

## Tests and evidence

Focused authority tests.

## Runtime evidence

Not applicable; source-only authority.

## Rollout and rollback

Draft only; revert the eventual squash merge if authorized later.

## Remaining risks

C3R-P must provide all runtime and database evidence.

## Merge recommendation

- [ ] Auto-merge candidate
- [ ] Human approval required
- [x] Blocked
`;

test("PR exception is pinned to the exact Draft scope and reference-only body", async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "pre-c3r-p-minimal-pr-contract-"),
  );
  const eventPath = path.join(temporaryDirectory, "event.json");
  const baseEvent = {
    repository: { full_name: "chachathecat/inverge" },
    pull_request: {
      body: validPrBody,
      draft: true,
      title:
        "[WCV-C3 PRE-P] Authorize exact C3R-P migration operations — minimal bridge",
      base: {
        ref: "main",
        sha: "5965ddb0202c5f9effb531824d4d95f775abecc1",
      },
      head: {
        ref: "codex/wcv-c3-pre-p-minimal-migration-mutation-authority",
        repo: { full_name: "chachathecat/inverge" },
      },
    },
  };

  try {
    await writeFile(eventPath, `${JSON.stringify(baseEvent)}\n`, "utf8");
    const valid = spawnSync(process.execPath, [prContractValidatorPath], {
      cwd: repositoryRoot,
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
      encoding: "utf8",
    });
    assert.equal(valid.status, 0, valid.stderr);

    const readyEvent = clone(baseEvent);
    readyEvent.pull_request.draft = false;
    await writeFile(eventPath, `${JSON.stringify(readyEvent)}\n`, "utf8");
    const ready = spawnSync(process.execPath, [prContractValidatorPath], {
      cwd: repositoryRoot,
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
      encoding: "utf8",
    });
    assert.notEqual(ready.status, 0);

    const closingEvent = clone(baseEvent);
    closingEvent.pull_request.body = validPrBody.replace("Refs #706", "Closes #706");
    await writeFile(eventPath, `${JSON.stringify(closingEvent)}\n`, "utf8");
    const closing = spawnSync(process.execPath, [prContractValidatorPath], {
      cwd: repositoryRoot,
      env: { ...process.env, GITHUB_EVENT_PATH: eventPath },
      encoding: "utf8",
    });
    assert.notEqual(closing.status, 0);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

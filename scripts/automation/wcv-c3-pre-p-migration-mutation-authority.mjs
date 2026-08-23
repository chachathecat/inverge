#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const BASE_SHA = "5965ddb0202c5f9effb531824d4d95f775abecc1";
const BASE_TREE = "bcb1017b980a5175e45265080ba25bc4b25c51ff";
const BASE_MIGRATION_TREE = "19f2cc2671b07027c000ec90b0e99b34eec5c109";
const APPEND_PATH =
  "supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql";

const EXACT_TOP_LEVEL_KEYS = [
  "schemaVersion",
  "contractId",
  "contractVersion",
  "status",
  "authority",
  "immutableUpstream",
  "operations",
  "append",
  "effectiveInventory",
  "remoteContinuity",
  "stageState",
  "futureC3rPMigrationAuthorityBindingV1",
  "packageIdentity",
  "deliveryControl",
  "ownedPaths",
];

const EXACT_OPERATIONS = [
  {
    operationId: "PERSONAL_LEARNING_STATE_RENAME_AND_RECURSIVE_CTE_REPAIR",
    operationKind: "RENAME_AND_EXACT_CONTENT_REPAIR",
    currentPath:
      "supabase/migrations/20260608_create_personal_learning_states.sql",
    futurePath:
      "supabase/migrations/20260608090000_create_personal_learning_states.sql",
    currentGitBlob: "ca91420e3d2c4ca41a5c0f5683d97b15a7ca8af1",
    futureGitBlob: "bd305ec8c4e55510f9faeded7cf2594513e71055",
    futureSha256:
      "957fb9810283086e75ce34689b3eee2c2d3be4373dc341056630db716457b815",
  },
  {
    operationId: "LEGAL_GROUNDING_RENAME",
    operationKind: "RENAME_ONLY",
    currentPath: "supabase/migrations/20260615_legal_grounding.sql",
    futurePath: "supabase/migrations/20260615090000_legal_grounding.sql",
    currentGitBlob: "160955292b0caf8c4dea01b47b52340ba2242acc",
    futureGitBlob: "160955292b0caf8c4dea01b47b52340ba2242acc",
    futureSha256:
      "fb585b9c2d96edfd696d2f03e0d4fc427597c7759ee6ab96de5a3dddf29d237e",
  },
  {
    operationId: "LEGAL_ARTICLE_IDENTITY_RENAME",
    operationKind: "RENAME_ONLY",
    currentPath:
      "supabase/migrations/20260615_legal_article_chunk_identity.sql",
    futurePath:
      "supabase/migrations/20260615100000_legal_article_chunk_identity.sql",
    currentGitBlob: "0d20d7f175d8f93a2215fcb141f17996395c5597",
    futureGitBlob: "0d20d7f175d8f93a2215fcb141f17996395c5597",
    futureSha256:
      "03dce727ac9bca1ab290556583c33593c3ae6ee544b0c90cc8ff7e05aea6e29d",
  },
  {
    operationId: "LEGAL_RETRIEVAL_RENAME",
    operationKind: "RENAME_ONLY",
    currentPath: "supabase/migrations/20260615_legal_retrieval.sql",
    futurePath: "supabase/migrations/20260615110000_legal_retrieval.sql",
    currentGitBlob: "6821a0a694f9d5b737ac104270826371980eb431",
    futureGitBlob: "6821a0a694f9d5b737ac104270826371980eb431",
    futureSha256:
      "d1ec08d0e3082e224c8da95c412636d83a0d4183df3a1ec4a1432f795b0154cc",
  },
  {
    operationId: "LEGAL_GROUNDING_GUARD_RENAME",
    operationKind: "RENAME_ONLY",
    currentPath: "supabase/migrations/20260615_legal_grounding_guard.sql",
    futurePath:
      "supabase/migrations/20260615120000_legal_grounding_guard.sql",
    currentGitBlob: "5971e1b961a7d096510902fdc40b04310a053ade",
    futureGitBlob: "5971e1b961a7d096510902fdc40b04310a053ade",
    futureSha256:
      "436e741f78efc14fa7decd2c6f8c3eadf31f5acd4590df98c3eaad988493b642",
  },
  {
    operationId: "LEGAL_GUARD_SERVICE_ROLE_GRANT_RENAME",
    operationKind: "RENAME_ONLY",
    currentPath:
      "supabase/migrations/20260616_legal_grounding_guard_service_role_grant.sql",
    futurePath:
      "supabase/migrations/20260616100000_legal_grounding_guard_service_role_grant.sql",
    currentGitBlob: "f960965c3c3d058486b1edf12e8b0639c15d7f7a",
    futureGitBlob: "f960965c3c3d058486b1edf12e8b0639c15d7f7a",
    futureSha256:
      "25e358828f3953b3cf793f7eeb645c816156e8bb89f5b7899d3c075de9594e13",
  },
  {
    operationId: "PERSONAL_CONCEPT_EARLY_BOUNDARY_COMPATIBILITY_REPAIR",
    operationKind: "IN_PLACE_EXACT_CONTENT_REPAIR",
    currentPath:
      "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql",
    futurePath:
      "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql",
    currentGitBlob: "c2f28006e399a9241c9556c14c042e67646be887",
    futureGitBlob: "301b713c16880807e21a11b770f7575e3701e312",
    futureSha256:
      "f5feb973cbc25cd8392158daf4f4c58227a776266f8b4f196c1f253eda39ee92",
  },
];

const EXACT_OWNED_PATHS = [
  "AGENTS.md",
  "config/dabangil-unified-program-contract.json",
  "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/decisions/2026-08-22-owner-wcv-c3-pre-p-migration-mutation-authority.md",
  "docs/inverge-master-roadmap.md",
  "docs/qa/wcv-c3-pre-p-migration-mutation-authority-validation.md",
  "roadmap/active-program.yml",
  "scripts/automation/validate-pr-contract.mjs",
  "scripts/automation/wcv-c3-pre-p-migration-mutation-authority.mjs",
  "scripts/run-node-tests.mjs",
  "tests/wcv-c3-pre-p-migration-mutation-authority.test.mjs",
];

const EXACT_FUTURE_BINDING_FIELDS = [
  "authorityDecisionSha256",
  "authorityContractSha256",
  "validatedAuthorityResultingMainSha",
  "validatedAuthorityResultingMainTree",
  "operationBindings",
  "appendPath",
  "candidateSqlSha256",
  "effectiveInventorySha256",
  "remoteMutationCount",
];

const EXACT_UPSTREAM_RECEIPTS = {
  c3rA0: {
    pullRequest: 785,
    reviewedHead: "f7f959368525f8a5895026f1361f6e13fd6226e0",
    reviewedTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
    resultingMainSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
    resultingMainTree: "543f8dfb5fdd026c1361e1a502376945912e6c5c",
    artifactCount: 4,
  },
  c3rA1: {
    pullRequest: 786,
    reviewedHead: "ff9dfbebea182d647daa84a349fcc50610f0ed1b",
    reviewedTree: "3c48da6fe991d8c02e3991e0a571b3b12139932c",
    resultingMainSha: "54afffcc539981ded65591f1f027171343bfce40",
    resultingMainTree: "3c48da6fe991d8c02e3991e0a571b3b12139932c",
    artifactCount: 4,
  },
  postgresql158Oracle: {
    pullRequest: 794,
    reviewedHead: "10fb2b88746cbdf58b514390023ad3668527c871",
    reviewedTree: "bcb1017b980a5175e45265080ba25bc4b25c51ff",
    resultingMainSha: "5965ddb0202c5f9effb531824d4d95f775abecc1",
    resultingMainTree: "bcb1017b980a5175e45265080ba25bc4b25c51ff",
    artifactCount: 4,
  },
};

function same(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function sorted(values) {
  return [...values].sort();
}

function git(repositoryRoot, args, encoding = "utf8") {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const detail = Buffer.isBuffer(result.stderr)
      ? result.stderr.toString("utf8")
      : result.stderr;
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout;
}

function gitText(repositoryRoot, args) {
  return git(repositoryRoot, args, "utf8").trim();
}

function gitBytes(repositoryRoot, objectSpec) {
  return git(repositoryRoot, ["cat-file", "blob", objectSpec], null);
}

function gitObjectExists(repositoryRoot, objectSpec) {
  return spawnSync("git", ["cat-file", "-e", objectSpec], {
    cwd: repositoryRoot,
  }).status === 0;
}

function readGithubEvent() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return null;
  try {
    return JSON.parse(readFileSync(eventPath, "utf8"));
  } catch {
    return null;
  }
}

function matchesExactShallowPullRequestContext(event, contract) {
  const pullRequest = event?.pull_request;
  const delivery = contract.deliveryControl ?? {};
  return event?.repository?.full_name === delivery.repository &&
    pullRequest?.base?.ref === delivery.baseRef &&
    pullRequest?.base?.sha === BASE_SHA &&
    pullRequest?.head?.ref === delivery.headRef &&
    pullRequest?.head?.repo?.full_name === delivery.headRepository &&
    pullRequest?.title === delivery.pullRequestTitle &&
    pullRequest?.draft === true &&
    /^[0-9a-f]{40}$/u.test(pullRequest?.head?.sha ?? "");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function gitBlob(bytes) {
  return createHash("sha1")
    .update(Buffer.from(`blob ${bytes.length}\0`, "ascii"))
    .update(bytes)
    .digest("hex");
}

function canonicalizeUtf8Lf(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return Buffer.from(text.replace(/\r\n?/gu, "\n"), "utf8");
}

function evidence(bytes) {
  const canonical = canonicalizeUtf8Lf(bytes);
  return {
    gitBlob: gitBlob(bytes),
    rawSha256: sha256(bytes),
    byteCount: bytes.length,
    lineCount: canonical.toString("utf8").split("\n").length - 1,
    canonicalUtf8LfSha256: sha256(canonical),
  };
}

function deriveFutureBytes(record, currentBytes) {
  if (record.operationKind === "RENAME_ONLY") return currentBytes;
  if (record.operationKind === "IN_PLACE_EXACT_CONTENT_REPAIR") {
    return Buffer.from(record.exactFutureCanonicalUtf8LfBase64 ?? "", "base64");
  }
  if (record.operationKind !== "RENAME_AND_EXACT_CONTENT_REPAIR") {
    throw new Error(`unknown operation kind ${record.operationKind}`);
  }

  const current = canonicalizeUtf8Lf(currentBytes).toString("utf8");
  const oldSegment = Buffer.from(
    record.exactRepair?.oldSegmentBase64 ?? "",
    "base64",
  ).toString("utf8");
  const replacement = Buffer.from(
    record.exactRepair?.replacementSegmentBase64 ?? "",
    "base64",
  ).toString("utf8");
  const first = current.indexOf(oldSegment);
  const last = current.lastIndexOf(oldSegment);
  if (first < 0 || first !== last) {
    throw new Error("repair source segment must occur exactly once");
  }
  return Buffer.from(
    `${current.slice(0, first)}${replacement}${current.slice(first + oldSegment.length)}`,
    "utf8",
  );
}

function repositoryChangedPaths(repositoryRoot) {
  const committed = gitText(repositoryRoot, [
    "diff",
    "--name-only",
    `${BASE_SHA}...HEAD`,
  ])
    .split(/\r?\n/u)
    .filter(Boolean);
  const status = git(repositoryRoot, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
  ])
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/\\/gu, "/"));
  return sorted(new Set([...committed, ...status]));
}

export function validateMinimalAuthorityContract(
  contract,
  repositoryRoot,
  { forceShallow = false, githubEvent = readGithubEvent() } = {},
) {
  const errors = [];
  const add = (code) => errors.push(code);
  const baseObjectAvailable = !forceShallow &&
    gitObjectExists(repositoryRoot, `${BASE_SHA}^{commit}`);
  const sourceRef = baseObjectAvailable ? BASE_SHA : "HEAD";

  if (!same(Object.keys(contract), EXACT_TOP_LEVEL_KEYS)) add("TOP_LEVEL_KEYS");

  if (contract.contractId !== "C3RPMigrationMutationAuthorityV1") {
    add("AUTHORITY_ID");
  }
  if (contract.authority?.kind !== "SOURCE_ONLY_CONTROL_PLANE_BRIDGE") {
    add("AUTHORITY_KIND");
  }
  if (
    contract.authority?.reconciledBaseSha !== BASE_SHA ||
    contract.authority?.reconciledBaseTree !== BASE_TREE ||
    contract.authority?.reconciledBaseMigrationTree !== BASE_MIGRATION_TREE
  ) {
    add("BASE_IDENTITY");
  }
  if (
    contract.authority?.migrationFilesChangedByThisWork !== 0 ||
    contract.authority?.runtimeInstalledByThisWork !== false ||
    contract.authority?.parserInstalledByThisWork !== false ||
    contract.authority?.oracleInstalledByThisWork !== false
  ) {
    add("SOURCE_ONLY_BOUNDARY");
  }

  if (baseObjectAvailable) {
    try {
      if (gitText(repositoryRoot, ["rev-parse", `${BASE_SHA}^{tree}`]) !== BASE_TREE) {
        add("BASE_TREE");
      }
      const ancestor = spawnSync(
        "git",
        ["merge-base", "--is-ancestor", BASE_SHA, "HEAD"],
        { cwd: repositoryRoot },
      );
      if (ancestor.status !== 0) add("BASE_ANCESTRY");
    } catch {
      add("BASE_GIT_OBJECT");
    }
  } else if (!matchesExactShallowPullRequestContext(githubEvent, contract)) {
    add("SHALLOW_PR_CONTEXT");
  }

  try {
    if (
      gitText(repositoryRoot, ["rev-parse", `${sourceRef}:supabase/migrations`]) !==
      BASE_MIGRATION_TREE
    ) {
      add("MIGRATION_TREE");
    }
  } catch {
    add("MIGRATION_TREE_GIT_OBJECT");
  }

  const upstream = contract.immutableUpstream ?? {};
  for (const [upstreamId, expected] of Object.entries(EXACT_UPSTREAM_RECEIPTS)) {
    const receipt = upstream[upstreamId] ?? {};
    for (const field of [
      "pullRequest",
      "reviewedHead",
      "reviewedTree",
      "resultingMainSha",
      "resultingMainTree",
    ]) {
      if (receipt[field] !== expected[field]) {
        add(`UPSTREAM_${upstreamId}_${field}`);
      }
    }
    if (
      receipt.requiredChecksPassed !== true ||
      !same(receipt.actionableP0P1P2, [0, 0, 0]) ||
      receipt.unresolvedActionableThreads !== 0 ||
      receipt.artifacts?.length !== expected.artifactCount
    ) {
      add(`UPSTREAM_${upstreamId}_RECEIPT`);
    }
    for (const [artifactIndex, artifact] of (receipt.artifacts ?? []).entries()) {
      try {
        const bytes = gitBytes(repositoryRoot, `${sourceRef}:${artifact.path}`);
        if (
          gitBlob(bytes) !== artifact.gitBlob ||
          sha256(bytes) !== artifact.sha256
        ) {
          add(`UPSTREAM_${upstreamId}_ARTIFACT_${artifactIndex}`);
        }
      } catch {
        add(`UPSTREAM_${upstreamId}_ARTIFACT_${artifactIndex}`);
      }
    }
  }
  if (upstream.artifactsEditableByThisWork !== false) {
    add("UPSTREAM_EDIT_BOUNDARY");
  }

  const records = contract.operations?.records ?? [];
  if (
    contract.operations?.countExactly !== 7 ||
    contract.operations?.renameCountExactly !== 6 ||
    contract.operations?.contentRepairCountExactly !== 2 ||
    contract.operations?.renameOnlyCountExactly !== 5 ||
    contract.operations?.inPlaceRepairCountExactly !== 1 ||
    records.length !== 7
  ) {
    add("OPERATION_COUNTS");
  }

  for (const [index, expected] of EXACT_OPERATIONS.entries()) {
    const record = records[index] ?? {};
    for (const field of [
      "operationId",
      "operationKind",
      "currentPath",
      "futurePath",
    ]) {
      if (record[field] !== expected[field]) add(`OPERATION_${index}_${field}`);
    }
    if (record.currentEvidence?.gitBlob !== expected.currentGitBlob) {
      add(`OPERATION_${index}_CURRENT_BLOB_PIN`);
    }
    if (
      record.futureEvidence?.gitBlob !== expected.futureGitBlob ||
      record.futureEvidence?.rawSha256 !== expected.futureSha256
    ) {
      add(`OPERATION_${index}_FUTURE_PIN`);
    }

    try {
      const currentBytes = gitBytes(
        repositoryRoot,
        `${sourceRef}:${expected.currentPath}`,
      );
      const currentEvidence = evidence(currentBytes);
      const futureBytes = deriveFutureBytes(record, currentBytes);
      const futureEvidence = evidence(futureBytes);
      if (!same(currentEvidence, record.currentEvidence)) {
        add(`OPERATION_${index}_CURRENT_EVIDENCE`);
      }
      if (!same(futureEvidence, record.futureEvidence)) {
        add(`OPERATION_${index}_FUTURE_EVIDENCE`);
      }
      if (
        record.operationKind === "RENAME_ONLY" &&
        !currentBytes.equals(futureBytes)
      ) {
        add(`OPERATION_${index}_RENAME_BYTES`);
      }
    } catch {
      add(`OPERATION_${index}_DERIVATION`);
    }
  }

  const append = contract.append ?? {};
  if (
    append.countExactly !== 1 ||
    append.pathExactly !== APPEND_PATH ||
    append.absentAtAuthorityBase !== true ||
    append.createdByThisWork !== false ||
    append.candidateSqlSha256AtAuthorityTime !== null ||
    append.secondAppendAllowed !== false
  ) {
    add("APPEND_AUTHORITY");
  }
  try {
    const appendAtBase = spawnSync(
      "git",
      ["cat-file", "-e", `${sourceRef}:${APPEND_PATH}`],
      { cwd: repositoryRoot },
    );
    if (appendAtBase.status === 0) add("APPEND_PRESENT_AT_BASE");
  } catch {
    add("APPEND_ABSENCE_CHECK");
  }

  try {
    const baselinePaths = gitText(repositoryRoot, [
      "ls-tree",
      "-r",
      "--name-only",
      sourceRef,
      "supabase/migrations",
    ])
      .split(/\r?\n/u)
      .filter((value) => value.endsWith(".sql"));
    const currentOperationPaths = new Set(
      EXACT_OPERATIONS.map((record) => record.currentPath),
    );
    const unchanged = baselinePaths.filter(
      (migrationPath) => !currentOperationPaths.has(migrationPath),
    );
    const effective = sorted([
      ...unchanged,
      ...EXACT_OPERATIONS.map((record) => record.futurePath),
      APPEND_PATH,
    ]);
    if (baselinePaths.length !== 25) add("BASELINE_COUNT");
    if (!same(unchanged, contract.effectiveInventory?.unchangedPathsExactly)) {
      add("UNCHANGED_PATH_CLOSURE");
    }
    if (!same(effective, contract.effectiveInventory?.effectivePathsExactly)) {
      add("EFFECTIVE_PATH_CLOSURE");
    }
    if (
      contract.effectiveInventory?.expectedCount !== 26 ||
      effective.length !== 26
    ) {
      add("EFFECTIVE_COUNT");
    }
  } catch {
    add("INVENTORY_DERIVATION");
  }

  const remote = contract.remoteContinuity ?? {};
  for (const field of [
    "supabaseLinkAuthorized",
    "supabaseDbPushAuthorized",
    "supabaseMigrationRepairAuthorized",
    "linkedResetAuthorized",
    "remoteSqlAuthorized",
    "remoteHistoryMutationAuthorized",
    "remoteSchemaMutationAuthorized",
    "productionMutationAuthorized",
  ]) {
    if (remote[field] !== false) add(`REMOTE_BOUNDARY:${field}`);
  }
  if (
    remote.remoteOperationAuthorizationCount !== 0 ||
    remote.remoteMutationCount !== 0
  ) {
    add("REMOTE_COUNTS");
  }

  if (
    !same(contract.stageState?.strictOrder, ["C3R-P", "C3R-T", "C3R-L"]) ||
    contract.stageState?.c3rP !== "authorized_unstarted" ||
    contract.stageState?.c3rT !==
      "blocked_pending_validated_c3r_p_merge_receipt" ||
    contract.stageState?.c3rL !==
      "blocked_pending_validated_c3r_p_and_c3r_t_merge_receipts" ||
    contract.stageState?.runtimeStarted !== false ||
    contract.stageState?.wcvC3Complete !== false
  ) {
    add("STAGE_STATE");
  }

  const binding = contract.futureC3rPMigrationAuthorityBindingV1 ?? {};
  if (
    binding.isRuntimeReceipt !== false ||
    binding.maySubstituteForC3RStageMergeReceiptV1 !== false ||
    !same(binding.requiredFieldsExactly, EXACT_FUTURE_BINDING_FIELDS) ||
    !same(
      binding.operationIdsExactly,
      EXACT_OPERATIONS.map((record) => record.operationId),
    ) ||
    binding.c3rPBaseMustDescendFromValidatedAuthoritySquashMerge !== true ||
    binding.remoteMutationCountExactly !== 0
  ) {
    add("FUTURE_BINDING");
  }

  try {
    if (
      gitText(repositoryRoot, ["rev-parse", `${sourceRef}:package.json`]) !==
        contract.packageIdentity?.packageJsonGitBlob ||
      gitText(repositoryRoot, ["rev-parse", `${sourceRef}:package-lock.json`]) !==
        contract.packageIdentity?.packageLockJsonGitBlob ||
      contract.packageIdentity?.packageMutationAuthorized !== false
    ) {
      add("PACKAGE_IDENTITY");
    }
  } catch {
    add("PACKAGE_IDENTITY_GIT");
  }

  if (!same(contract.ownedPaths, EXACT_OWNED_PATHS)) add("OWNED_PATH_MANIFEST");
  try {
    if (baseObjectAvailable) {
      const changedPaths = repositoryChangedPaths(repositoryRoot);
      if (!same(changedPaths, sorted(EXACT_OWNED_PATHS))) {
        add("OWNED_PATH_CLOSURE");
      }
      if (changedPaths.some((value) => value.startsWith("supabase/migrations/"))) {
        add("MIGRATION_DIFF");
      }
      if (
        changedPaths.includes("package.json") ||
        changedPaths.includes("package-lock.json")
      ) {
        add("PACKAGE_DIFF");
      }
    } else {
      const worktreeStatus = gitText(repositoryRoot, [
        "status",
        "--porcelain=v1",
        "--untracked-files=all",
      ]);
      if (worktreeStatus !== "") add("SHALLOW_WORKTREE_DIRTY");
      for (const ownedPath of EXACT_OWNED_PATHS) {
        if (!gitObjectExists(repositoryRoot, `HEAD:${ownedPath}`)) {
          add(`SHALLOW_OWNED_PATH:${ownedPath}`);
        }
      }
    }
  } catch {
    add("DIFF_CLOSURE");
  }

  return { ok: errors.length === 0, errors };
}

export async function validateMinimalAuthority({
  repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  ),
  contractPath = path.join(
    repositoryRoot,
    "config",
    "dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json",
  ),
} = {}) {
  const contract = JSON.parse(await readFile(contractPath, "utf8"));
  return validateMinimalAuthorityContract(contract, repositoryRoot);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await validateMinimalAuthority();
  if (!result.ok) {
    console.error(result.errors.join("\n"));
    process.exitCode = 1;
  } else {
    console.log(
      "PRE-C3R-P minimal migration-mutation authority validated: 7 operations, 1 append, 26 effective paths, 0 migration changes, 0 remote mutations.",
    );
  }
}

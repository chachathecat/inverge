#!/usr/bin/env node

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  deriveMigrationDependencyClosure,
  loadLiveMigrationSql,
  tokenizePostgresSql,
  validateMigrationDependencyClosure,
} from "./wcv-c3r-a0-migration-dependency-closure.mjs";

const CONTRACT_PATH =
  "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json";
const A0_CONTRACT_PATH =
  "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json";
const A1_CONTRACT_PATH =
  "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json";
const MIGRATION_PREFIX = "supabase/migrations/";
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_BLOB = /^[0-9a-f]{40}$/u;
const COMMIT_SHA = /^[0-9a-f]{40}$/u;
const EXPECTED_CONTRACT_CANONICAL_SHA256 =
  "0c0ee3d96d455dff9bb58548c8e3655ad75beb2ade541cb4774bf3fe04467245";
const EXPECTED_RECONCILED_BASE_SHA =
  "5965ddb0202c5f9effb531824d4d95f775abecc1";
const EXPECTED_RECONCILED_BASE_TREE =
  "bcb1017b980a5175e45265080ba25bc4b25c51ff";

const TOP_LEVEL_FIELDS = Object.freeze([
  "schemaVersion",
  "contractId",
  "contractVersion",
  "status",
  "authority",
  "immutableUpstreamAuthority",
  "currentMigrationBaseline",
  "authorizedExistingPathOperations",
  "frozenAppendAuthority",
  "effectiveMigrationInventoryAuthority",
  "remoteContinuityBoundary",
  "c3rPMigrationMutationReceiptV1",
  "stageState",
  "deliveryControl",
  "packageIdentity",
  "localDockerClassification",
  "ownedPaths",
  "forbiddenPathPrefixes",
  "forbiddenExactPaths",
]);

const OWNED_PATHS = Object.freeze([
  "docs/decisions/2026-08-22-owner-wcv-c3-pre-p-migration-mutation-authority.md",
  CONTRACT_PATH,
  "docs/qa/wcv-c3-pre-p-migration-mutation-authority-validation.md",
  "scripts/automation/wcv-c3-pre-p-migration-mutation-authority.mjs",
  "tests/wcv-c3-pre-p-migration-mutation-authority.test.mjs",
  "AGENTS.md",
  "roadmap/active-program.yml",
  "config/dabangil-unified-program-contract.json",
  "docs/dabangil-unified-program-contract.md",
  "docs/inverge-master-roadmap.md",
  "scripts/automation/validate-pr-contract.mjs",
  "scripts/run-node-tests.mjs",
]);

const STAGE_STATE = Object.freeze({
  strictStageOrder: ["C3R-P", "C3R-T", "C3R-L"],
  soleNextC3rStage: "C3R-P",
  c3rP: "authorized_unstarted",
  c3rT: "blocked_pending_validated_c3r_p_merge_receipt",
  c3rL: "blocked_pending_validated_c3r_p_and_c3r_t_merge_receipts",
  c3rRuntimeAutomaticStartAllowed: false,
  c3rSuccessorRuntimeStarted: false,
  wcvC3Complete: false,
  governedIssues: {
    706: "open",
    707: "open",
    708: "open",
    714: "open",
    781: "open",
  },
});

export class C3RPMigrationMutationAuthorityError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = "C3RPMigrationMutationAuthorityError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new C3RPMigrationMutationAuthorityError(code, message);
}

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function gitBlobSha1(bytes) {
  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  return createHash("sha1")
    .update(Buffer.from(`blob ${body.length}\0`, "utf8"))
    .update(body)
    .digest("hex");
}

export function canonicalizeUtf8Lf(bytes) {
  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (body.length >= 3 && body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) {
    fail("UTF8_BOM_FORBIDDEN", "canonical SQL must not contain a UTF-8 BOM");
  }
  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    fail("INVALID_UTF8", "SQL bytes are not valid UTF-8");
  }
  return text.replace(/\r\n?/gu, "\n");
}

function lineCount(canonicalText) {
  if (canonicalText.length === 0) return 0;
  const withoutTrailingLf = canonicalText.endsWith("\n")
    ? canonicalText.slice(0, -1)
    : canonicalText;
  return withoutTrailingLf.length === 0 ? 0 : withoutTrailingLf.split("\n").length;
}

export function evidenceForBytes(bytes) {
  const body = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const canonicalText = canonicalizeUtf8Lf(body);
  const canonicalBytes = Buffer.from(canonicalText, "utf8");
  return {
    gitBlob: gitBlobSha1(body),
    rawSha256: sha256(body),
    byteCount: body.length,
    lineCount: lineCount(canonicalText),
    canonicalUtf8LfSha256: sha256(canonicalBytes),
  };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(stableValue(value));
}

function domainDigest(domain, value) {
  return sha256(Buffer.from(`${domain}\0${canonicalJson(value)}`, "utf8"));
}

function same(actual, expected) {
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function assertExactKeys(value, expected, code, location) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(code, `${location} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!same(actual, wanted)) {
    fail(code, `${location} keys differ: ${actual.join(",")}`);
  }
}

function assertUnique(values, code, location) {
  if (new Set(values).size !== values.length) {
    fail(code, `${location} contains duplicate identities`);
  }
}

function assertSha256(value, code, location) {
  if (!SHA256.test(value ?? "")) fail(code, `${location} must be SHA-256`);
}

function assertGitBlob(value, code, location) {
  if (!GIT_BLOB.test(value ?? "")) fail(code, `${location} must be a Git blob`);
}

function parseStringToken(source, state) {
  const start = state.index;
  state.index += 1;
  while (state.index < source.length) {
    const char = source[state.index];
    if (char === "\\") {
      state.index += 2;
      continue;
    }
    if (char === '"') {
      state.index += 1;
      return JSON.parse(source.slice(start, state.index));
    }
    state.index += 1;
  }
  fail("INVALID_JSON", "unterminated JSON string");
}

function skipWhitespace(source, state) {
  while (/\s/u.test(source[state.index] ?? "")) state.index += 1;
}

function scanJsonValue(source, state, location) {
  skipWhitespace(source, state);
  const char = source[state.index];
  if (char === "{") {
    state.index += 1;
    skipWhitespace(source, state);
    const keys = new Set();
    if (source[state.index] === "}") {
      state.index += 1;
      return;
    }
    while (state.index < source.length) {
      if (source[state.index] !== '"') fail("INVALID_JSON", `${location} key expected`);
      const key = parseStringToken(source, state);
      if (keys.has(key)) fail("DUPLICATE_JSON_KEY", `${location}.${key}`);
      keys.add(key);
      skipWhitespace(source, state);
      if (source[state.index] !== ":") fail("INVALID_JSON", `${location}.${key} missing colon`);
      state.index += 1;
      scanJsonValue(source, state, `${location}.${key}`);
      skipWhitespace(source, state);
      if (source[state.index] === "}") {
        state.index += 1;
        return;
      }
      if (source[state.index] !== ",") fail("INVALID_JSON", `${location} comma expected`);
      state.index += 1;
      skipWhitespace(source, state);
    }
    fail("INVALID_JSON", `${location} object not closed`);
  }
  if (char === "[") {
    state.index += 1;
    skipWhitespace(source, state);
    if (source[state.index] === "]") {
      state.index += 1;
      return;
    }
    let ordinal = 0;
    while (state.index < source.length) {
      scanJsonValue(source, state, `${location}[${ordinal}]`);
      ordinal += 1;
      skipWhitespace(source, state);
      if (source[state.index] === "]") {
        state.index += 1;
        return;
      }
      if (source[state.index] !== ",") fail("INVALID_JSON", `${location} comma expected`);
      state.index += 1;
    }
    fail("INVALID_JSON", `${location} array not closed`);
  }
  if (char === '"') {
    parseStringToken(source, state);
    return;
  }
  const match = source.slice(state.index).match(/^(?:-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/u);
  if (!match) fail("INVALID_JSON", `${location} value is invalid`);
  state.index += match[0].length;
}

export function parseJsonRejectDuplicateKeys(source) {
  const state = { index: 0 };
  scanJsonValue(source, state, "$root");
  skipWhitespace(source, state);
  if (state.index !== source.length) fail("INVALID_JSON", "trailing JSON content");
  try {
    return JSON.parse(source);
  } catch (error) {
    fail("INVALID_JSON", error.message);
  }
}

function git(repositoryRoot, args, { binary = false } = {}) {
  const result = spawnSync("git", args, {
    cwd: repositoryRoot,
    encoding: binary ? null : "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    fail("GIT_READ_FAILED", `${args.join(" ")}: ${String(result.stderr).trim()}`);
  }
  return binary ? result.stdout : result.stdout.trim();
}

function gitLines(repositoryRoot, args) {
  const output = git(repositoryRoot, args);
  return output.length === 0
    ? []
    : output.split(/\r?\n/u).map((entry) => entry.replaceAll("\\", "/"));
}

function gitCommitTree(repositoryRoot, commit) {
  const resolvedCommit = git(repositoryRoot, ["rev-parse", `${commit}^{commit}`]);
  const tree = git(repositoryRoot, ["rev-parse", `${resolvedCommit}^{tree}`]);
  return { commit: resolvedCommit, tree };
}

function gitObjectExists(repositoryRoot, object) {
  const result = spawnSync("git", ["cat-file", "-e", object], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });
  if (result.error) {
    fail("GIT_READ_FAILED", result.error.message);
  }
  return result.status === 0;
}

export function validateGitHubShallowPullRequestEvidence({
  contract,
  eventPayload,
  currentCommit,
  currentCommitObject,
  githubSha,
}) {
  const pullRequest = eventPayload?.pull_request;
  const references = contract.deliveryControl.referenceOnlyIssueLinks;
  const parents = currentCommitObject
    .split(/\r?\n/u)
    .filter((line) => line.startsWith("parent "))
    .map((line) => line.slice("parent ".length));
  if (
    eventPayload?.repository?.full_name !== contract.authority.repository ||
    pullRequest?.base?.repo?.full_name !== contract.authority.repository ||
    pullRequest?.head?.repo?.full_name !== references.headRepository ||
    pullRequest?.base?.ref !== references.baseRef ||
    pullRequest?.base?.sha !== contract.authority.reconciledBaseSha ||
    pullRequest?.head?.ref !== references.headRef ||
    !COMMIT_SHA.test(pullRequest?.head?.sha ?? "") ||
    pullRequest?.changed_files !== contract.ownedPaths.length ||
    currentCommit !== githubSha ||
    parents.length !== 2 ||
    parents[0] !== contract.authority.reconciledBaseSha ||
    parents[1] !== pullRequest.head.sha
  ) {
    fail(
      "AUTHORITY_SHALLOW_BASE_EVIDENCE",
      "GitHub pull-request event, merge parents or changed-file count differs",
    );
  }
  return {
    commit: contract.authority.reconciledBaseSha,
    tree: contract.authority.reconciledBaseTree,
    gitHistoryAvailable: false,
    verificationMode: "github_pull_request_shallow_event",
  };
}

async function resolveAuthorityBaseBinding(repositoryRoot, contract) {
  if (
    contract.authority.reconciledBaseSha !== EXPECTED_RECONCILED_BASE_SHA ||
    contract.authority.reconciledBaseTree !== EXPECTED_RECONCILED_BASE_TREE ||
    contract.deliveryControl.referenceOnlyIssueLinks.baseSha !==
      EXPECTED_RECONCILED_BASE_SHA
  ) {
    fail("AUTHORITY_BASE_BINDING", "reconciled base SHA/tree differs");
  }
  let verificationMode = "local_git_object";
  if (!gitObjectExists(repositoryRoot, `${EXPECTED_RECONCILED_BASE_SHA}^{commit}`)) {
    if (
      git(repositoryRoot, ["rev-parse", "--is-shallow-repository"]) !== "true" ||
      process.env.GITHUB_ACTIONS !== "true" ||
      process.env.GITHUB_EVENT_NAME !== "pull_request" ||
      process.env.GITHUB_HEAD_REF !==
        contract.deliveryControl.referenceOnlyIssueLinks.headRef ||
      !process.env.GITHUB_EVENT_PATH ||
      !process.env.GITHUB_SHA
    ) {
      fail(
        "AUTHORITY_BASE_OBJECT_MISSING",
        "pinned base object is unavailable outside an exact GitHub shallow PR checkout",
      );
    }
    const eventPayload = parseJsonRejectDuplicateKeys(
      await readFile(process.env.GITHUB_EVENT_PATH, "utf8"),
    );
    const currentCommit = git(repositoryRoot, ["rev-parse", "HEAD^{commit}"]);
    const currentCommitObject = git(repositoryRoot, ["cat-file", "commit", currentCommit]);
    validateGitHubShallowPullRequestEvidence({
      contract,
      eventPayload,
      currentCommit,
      currentCommitObject,
      githubSha: process.env.GITHUB_SHA,
    });
    const originUrl = git(repositoryRoot, ["remote", "get-url", "origin"])
      .replace(/\.git\/?$/u, "")
      .replace(/\/$/u, "");
    if (
      originUrl !== `https://github.com/${contract.authority.repository}` &&
      originUrl !== `git@github.com:${contract.authority.repository}` &&
      originUrl !== `ssh://git@github.com/${contract.authority.repository}`
    ) {
      fail("AUTHORITY_SHALLOW_ORIGIN", "origin is not the exact authority repository");
    }
    const fetchResult = spawnSync(
      "git",
      [
        "fetch",
        "--no-tags",
        "--depth=1",
        "origin",
        EXPECTED_RECONCILED_BASE_SHA,
      ],
      { cwd: repositoryRoot, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    if (
      fetchResult.status !== 0 ||
      !gitObjectExists(repositoryRoot, `${EXPECTED_RECONCILED_BASE_SHA}^{commit}`)
    ) {
      fail(
        "AUTHORITY_PINNED_BASE_FETCH_FAILED",
        String(fetchResult.stderr).trim(),
      );
    }
    verificationMode = "github_pull_request_shallow_exact_base_fetch";
  }
  const resolved = gitCommitTree(repositoryRoot, EXPECTED_RECONCILED_BASE_SHA);
  if (resolved.tree !== EXPECTED_RECONCILED_BASE_TREE) {
    fail("AUTHORITY_BASE_BINDING", "reconciled base SHA/tree differs");
  }
  return {
    ...resolved,
    gitHistoryAvailable: true,
    verificationMode,
  };
}

function gitPathBytes(repositoryRoot, commit, relativePath) {
  return git(repositoryRoot, ["show", `${commit}:${relativePath}`], { binary: true });
}

function gitMigrationPaths(repositoryRoot, commit) {
  return gitLines(repositoryRoot, [
    "ls-tree",
    "-r",
    "--name-only",
    commit,
    "--",
    "supabase/migrations",
  ]).filter((entry) => entry.endsWith(".sql"));
}

export function currentAuthorityChangedPaths(repositoryRoot, baseSha) {
  const paths = new Set();
  for (const args of [
    ["diff", "--name-only", baseSha, "HEAD"],
    ["diff", "--name-only"],
    ["diff", "--name-only", "--cached"],
    ["ls-files", "--others", "--exclude-standard"],
  ]) {
    for (const entry of gitLines(repositoryRoot, args)) paths.add(entry);
  }
  return [...paths].sort();
}

export function shouldEnforceExactAuthorityChangedPaths(
  { currentBranch, githubHeadRef, prHeadRef },
  exactHeadRef,
) {
  return (
    currentBranch === exactHeadRef ||
    githubHeadRef === exactHeadRef ||
    prHeadRef === exactHeadRef
  );
}

function isExactAuthorityCandidateContext(repositoryRoot, contract) {
  return shouldEnforceExactAuthorityChangedPaths(
    {
      currentBranch: git(repositoryRoot, ["branch", "--show-current"]),
      githubHeadRef: process.env.GITHUB_HEAD_REF,
      prHeadRef: process.env.PR_HEAD_REF,
    },
    contract.deliveryControl.referenceOnlyIssueLinks.headRef,
  );
}

export function validateExactAuthorityChangedPaths(actualPaths, contract) {
  assertUnique(actualPaths, "ACTUAL_CHANGED_PATH_DUPLICATE", "actual changed paths");
  const normalized = actualPaths.map((entry) => entry.replaceAll("\\", "/")).sort();
  const expected = [...contract.ownedPaths].sort();
  if (!same(normalized, expected)) {
    fail(
      "ACTUAL_CHANGED_PATH_CLOSURE",
      `expected ${expected.join(",")} but received ${normalized.join(",")}`,
    );
  }
}

function gitBlobBytes(repositoryRoot, blob) {
  return git(repositoryRoot, ["cat-file", "blob", blob], { binary: true });
}

function currentPathBlob(repositoryRoot, relativePath) {
  return git(repositoryRoot, ["rev-parse", `HEAD:${relativePath}`]);
}

function assertEvidence(actual, expected, code, location) {
  if (!same(actual, expected)) {
    fail(code, `${location} evidence differs`);
  }
}

function evidenceFromRecord(record) {
  return {
    gitBlob: record.gitBlob,
    rawSha256: record.rawSha256,
    byteCount: record.byteCount,
    lineCount: record.lineCount,
    canonicalUtf8LfSha256: record.canonicalUtf8LfSha256,
  };
}

function deriveFutureBytes(operation, currentBytes) {
  if (operation.operationKind === "RENAME_ONLY") return Buffer.from(currentBytes);
  if (operation.futureDerivation) {
    const currentCanonical = canonicalizeUtf8Lf(currentBytes);
    const oldSegment = Buffer.from(
      operation.futureDerivation.oldSegmentBase64,
      "base64",
    ).toString("utf8");
    const replacement = Buffer.from(
      operation.futureDerivation.replacementSegmentBase64,
      "base64",
    ).toString("utf8");
    if (sha256(Buffer.from(oldSegment)) !== operation.futureDerivation.oldSegmentSha256) {
      fail("REPAIR_SEGMENT_DIGEST_MISMATCH", `${operation.operationId} old segment`);
    }
    if (sha256(Buffer.from(replacement)) !== operation.futureDerivation.replacementSegmentSha256) {
      fail("REPAIR_SEGMENT_DIGEST_MISMATCH", `${operation.operationId} replacement segment`);
    }
    if (currentCanonical.split(oldSegment).length !== 2) {
      fail("REPAIR_SEGMENT_OCCURRENCE_MISMATCH", operation.operationId);
    }
    return Buffer.from(currentCanonical.replace(oldSegment, replacement), "utf8");
  }
  if (operation.futureCanonicalUtf8LfBase64) {
    return Buffer.from(operation.futureCanonicalUtf8LfBase64, "base64");
  }
  fail("REPAIR_BYTES_UNBOUND", operation.operationId);
}

function validatePersonalLearningRepair(operation, currentBytes, futureBytes) {
  const current = canonicalizeUtf8Lf(currentBytes);
  const future = canonicalizeUtf8Lf(futureBytes);
  const oldSegment = Buffer.from(operation.futureDerivation.oldSegmentBase64, "base64").toString("utf8");
  const replacement = Buffer.from(
    operation.futureDerivation.replacementSegmentBase64,
    "base64",
  ).toString("utf8");
  if (current.replace(oldSegment, replacement) !== future) {
    fail("PERSONAL_LEARNING_REPAIR_SCOPE_WIDENED", "bytes outside the recursive CTE changed");
  }
  if ((replacement.match(/\bfrom walk\b/gu) ?? []).length !== 1) {
    fail("PERSONAL_LEARNING_RECURSIVE_TERM_COUNT", "replacement must contain one recursive term");
  }
  const marker = "and key ~* '(raw|ocr|answer|problem|question|copyright|official|model|source|score|instructor|grader|pass|fail|text|content|body|payload)'";
  if (!current.includes(marker) || !future.includes(marker)) {
    fail("FORBIDDEN_KEY_BEHAVIOR_DRIFT", "forbidden-key expression changed");
  }
  for (const invariant of [
    "create extension if not exists \"pgcrypto\";",
    "create or replace function public.personal_learning_state_metadata_has_forbidden_key(value jsonb)",
    "returns boolean\nlanguage sql\nimmutable",
    "alter table public.personal_learning_states enable row level security;",
  ]) {
    if (!future.includes(invariant)) fail("PERSONAL_LEARNING_SEMANTIC_DRIFT", invariant);
  }
  if (/force row level security/iu.test(future)) {
    fail("PERSONAL_LEARNING_HISTORICAL_FORCE_RLS_DRIFT", "repair may not add FORCE RLS");
  }
}

function validateConceptRepair(operation, futureBytes) {
  const source = canonicalizeUtf8Lf(futureBytes);
  if (source.includes("transition_personal_concept_node_v1")) {
    fail("CONCEPT_EARLY_PRODUCER_REFERENCE", "early repair must not reference the later function");
  }
  if (!source.includes("does not install or claim the\n-- final RPC-only function privilege boundary")) {
    fail("CONCEPT_FINAL_BOUNDARY_FALSE_CLAIM", "non-final status must be explicit");
  }
  if (!source.includes("sole later C3R-P append must\n-- reassert that boundary")) {
    fail("CONCEPT_APPEND_REASSERTION_MISSING", "sole append reassertion must be explicit");
  }
  if (/grant\s+(?:insert|update|all)[^;]*\b(?:public|anon|authenticated)\b/iu.test(source)) {
    fail("CONCEPT_UNSAFE_DIRECT_WRITE_GRANT", "direct write grant is forbidden");
  }
  const requiredStatements = [
    "revoke insert, update on table public.personal_concept_nodes from authenticated;",
    "grant select, delete on table public.personal_concept_nodes to authenticated;",
    'drop policy if exists "personal_concept_nodes_insert_own" on public.personal_concept_nodes;',
    'drop policy if exists "personal_concept_nodes_update_own" on public.personal_concept_nodes;',
  ];
  for (const statement of requiredStatements) {
    if (!source.includes(statement)) fail("CONCEPT_COMPATIBILITY_STATEMENT_MISSING", statement);
  }
}

function normalizeSqlIdentity(value) {
  return value.replaceAll('"', "").toLowerCase();
}

function aclGrantees(acl) {
  if (!Array.isArray(acl)) return [];
  return acl.map((entry) => {
    const separator = entry.indexOf("=");
    if (separator < 0) fail("RECEIPT_FINAL_ACL_FORMAT", entry);
    const grantee = entry.slice(0, separator);
    return grantee.length === 0 ? "public" : grantee;
  });
}

const EXECUTABLE_SQL_TOKEN_TYPES = new Set([
  "UNQUOTED_IDENTIFIER",
  "QUOTED_IDENTIFIER",
  "DOT",
  "OPEN_PUNCTUATION",
  "CLOSE_PUNCTUATION",
  "PUNCTUATION",
  "NUMBER",
  "OPERATOR",
]);

function tokenizeAppendSql(sql) {
  try {
    return tokenizePostgresSql(sql);
  } catch (error) {
    if (
      error?.code === "UNSUPPORTED_IDENTIFIER_FORM" &&
      error.message.includes("UNICODE_ESCAPED_IDENTIFIER")
    ) {
      fail(
        "RECEIPT_APPEND_ENCODED_LITERAL",
        `Unicode escape quoted identifiers are forbidden: ${error.message}`,
      );
    }
    throw error;
  }
}

function validateAppendEncodedLiteralBoundary(sql, tokens) {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type === "ESCAPE_STRING") {
      fail(
        "RECEIPT_APPEND_ENCODED_LITERAL",
        `Unicode and C-style escape strings are forbidden at offset ${token.start}`,
      );
    }
    if (
      token.type === "UNQUOTED_IDENTIFIER" &&
      token.value === "uescape"
    ) {
      fail(
        "RECEIPT_APPEND_ENCODED_LITERAL",
        `UESCAPE is forbidden at offset ${token.start}`,
      );
    }
    if (token.type !== "ORDINARY_STRING") continue;
    let nextIndex = index + 1;
    while (
      tokens[nextIndex]?.type === "LINE_COMMENT" ||
      tokens[nextIndex]?.type === "BLOCK_COMMENT"
    ) {
      nextIndex += 1;
    }
    const next = tokens[nextIndex];
    if (
      next?.type === "ORDINARY_STRING" &&
      /\r?\n/u.test(sql.slice(token.end, next.start))
    ) {
      fail(
        "RECEIPT_APPEND_ENCODED_LITERAL",
        `newline-concatenated string literals are forbidden at offsets ${token.start}-${next.end}`,
      );
    }
  }
}

function topLevelExecutableSql(sql) {
  return tokenizeAppendSql(sql)
    .filter((token) => EXECUTABLE_SQL_TOKEN_TYPES.has(token.type))
    .map((token) => token.value)
    .join(" ")
    .replace(/\s*\.\s*/gu, ".")
    .replace(/\s*\(\s*/gu, "(")
    .replace(/\s*\)/gu, ")")
    .replace(/\s*\[\s*\]/gu, "[]")
    .replace(/\s*,\s*/gu, ",")
    .replace(/\s*;\s*/gu, ";")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitRoutineArguments(value) {
  const argumentsExactly = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === "(") depth += 1;
    if (value[index] === ")") depth -= 1;
    if (depth < 0) fail("RECEIPT_APPEND_ROUTINE_ARGUMENTS", value);
    if (value[index] === "," && depth === 0) {
      argumentsExactly.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  if (depth !== 0) fail("RECEIPT_APPEND_ROUTINE_ARGUMENTS", value);
  const trailing = value.slice(start).trim();
  if (trailing.length > 0) argumentsExactly.push(trailing);
  return argumentsExactly;
}

function canonicalRoutineIdentityArguments(declarations) {
  const simpleType = "(?:[a-z_][a-z0-9_$]*\\.)?[a-z_][a-z0-9_$]*(?:\\[\\])*";
  const multiwordType = "(?:double precision|character varying|bit varying|timestamp (?:with|without) time zone|time (?:with|without) time zone)(?:\\[\\])*";
  const typePattern = new RegExp(`^(?:${simpleType}|${multiwordType})$`, "u");
  const aliases = new Map([
    ["bool", "boolean"],
    ["float8", "double precision"],
    ["int", "integer"],
    ["int4", "integer"],
    ["int8", "bigint"],
    ["timestamptz", "timestamp with time zone"],
    ["timestamp", "timestamp without time zone"],
    ["timetz", "time with time zone"],
    ["varchar", "character varying"],
  ]);
  return splitRoutineArguments(declarations).map((declaration) => {
    if (/\b(?:default|out|inout|variadic)\b|=/u.test(declaration)) {
      fail("RECEIPT_APPEND_ROUTINE_ARGUMENT_MODE", declaration);
    }
    let normalized = declaration.replace(/^in /u, "").trim();
    if (!typePattern.test(normalized)) {
      const named = normalized.match(/^[a-z_][a-z0-9_$]* (.+)$/u);
      if (!named || !typePattern.test(named[1])) {
        fail("RECEIPT_APPEND_ROUTINE_ARGUMENT_TYPE", declaration);
      }
      normalized = named[1];
    }
    const arraySuffix = normalized.endsWith("[]") ? "[]" : "";
    const base = arraySuffix ? normalized.slice(0, -2) : normalized;
    return `${aliases.get(base) ?? base}${arraySuffix}`;
  }).join(",");
}

function canonicalRoutineIdentity(identity) {
  const match = normalizeSqlIdentity(identity).match(
    /^([a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*)\((.*)\)$/u,
  );
  if (!match) fail("RECEIPT_APPEND_ROUTINE_IDENTITY", identity);
  return `${match[1]}(${canonicalRoutineIdentityArguments(match[2])})`;
}

const APPEND_ROUTINE_BODY_STATIC_DML_ALLOWED = Object.freeze([
  "INSERT",
  "UPDATE",
  "DELETE",
]);
const APPEND_ROUTINE_BODY_FORBIDDEN_STATEMENTS = new Set([
  "create",
  "alter",
  "drop",
  "truncate",
  "copy",
  "grant",
  "revoke",
  "call",
  "do",
]);

function isSqlIdentifierToken(token) {
  return (
    token?.type === "UNQUOTED_IDENTIFIER" ||
    token?.type === "QUOTED_IDENTIFIER"
  );
}

function appendRoutineBodyDmlTarget(tokens, verbIndex, verb) {
  let cursor = verbIndex + 1;
  const consumeKeyword = (keyword) => {
    if (
      tokens[cursor]?.type === "UNQUOTED_IDENTIFIER" &&
      tokens[cursor].value === keyword
    ) {
      cursor += 1;
      return true;
    }
    return false;
  };
  if (verb === "insert") {
    consumeKeyword("into");
  } else if (verb === "update") {
    consumeKeyword("only");
  } else if (verb === "delete") {
    if (!consumeKeyword("from")) {
      fail(
        "RECEIPT_APPEND_ROUTINE_BODY_DML_TARGET_UNRESOLVED",
        "DELETE must have an exact FROM target",
      );
    }
    consumeKeyword("only");
  } else if (verb === "merge") {
    if (!consumeKeyword("into")) {
      fail(
        "RECEIPT_APPEND_ROUTINE_BODY_DML_TARGET_UNRESOLVED",
        "MERGE must have an exact INTO target",
      );
    }
  }
  const schema = tokens[cursor];
  const separator = tokens[cursor + 1];
  const relation = tokens[cursor + 2];
  if (
    !isSqlIdentifierToken(schema) ||
    separator?.type !== "DOT" ||
    !isSqlIdentifierToken(relation) ||
    tokens[cursor + 3]?.type === "DOT"
  ) {
    fail(
      "RECEIPT_APPEND_ROUTINE_BODY_DML_TARGET_UNRESOLVED",
      `${verb.toUpperCase()} target must be one exact schema-qualified relation`,
    );
  }
  return normalizeSqlIdentity(`${schema.value}.${relation.value}`);
}

function isSqlKeyword(token, keyword) {
  return token?.type === "UNQUOTED_IDENTIFIER" && token.value === keyword;
}

function sqlTokenDepths(tokens) {
  const depths = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.type === "CLOSE_PUNCTUATION") depth -= 1;
    depths.push(depth);
    if (token.type === "OPEN_PUNCTUATION") depth += 1;
  }
  return depths;
}

function appendRoutineOnConflictAction(tokens, doIndex, depths) {
  const action = tokens[doIndex + 1];
  if (!isSqlKeyword(action, "update") && !isSqlKeyword(action, "nothing")) {
    return null;
  }
  const actionDepth = depths[doIndex];
  let conflictIndex = -1;
  for (let index = doIndex - 1; index >= 0; index -= 1) {
    if (depths[index] < actionDepth) break;
    if (depths[index] !== actionDepth) continue;
    if (tokens[index].type === "PUNCTUATION" && tokens[index].value === ";") {
      break;
    }
    if (
      isSqlKeyword(tokens[index], "conflict") &&
      depths[index - 1] === actionDepth &&
      isSqlKeyword(tokens[index - 1], "on")
    ) {
      conflictIndex = index;
      break;
    }
  }
  if (conflictIndex < 0) return null;
  for (let index = conflictIndex - 2; index >= 0; index -= 1) {
    if (depths[index] < actionDepth) break;
    if (depths[index] !== actionDepth) continue;
    if (tokens[index].type === "PUNCTUATION" && tokens[index].value === ";") {
      break;
    }
    if (isSqlKeyword(tokens[index], "insert")) {
      return {
        action: action.value,
        insertIndex: index,
        updateIndex: action.value === "update" ? doIndex + 1 : null,
      };
    }
  }
  return null;
}

function validateAppendRoutineBodyMutationScope(tokens, createdRelationSet) {
  const depths = sqlTokenDepths(tokens);
  const onConflictUpdateIndexes = new Set();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.type !== "UNQUOTED_IDENTIFIER") continue;
    if (token.value === "do") {
      const conflictAction = appendRoutineOnConflictAction(
        tokens,
        index,
        depths,
      );
      if (conflictAction !== null) {
        const target = appendRoutineBodyDmlTarget(
          tokens,
          conflictAction.insertIndex,
          "insert",
        );
        if (!createdRelationSet.has(target)) {
          fail(
            "RECEIPT_APPEND_ROUTINE_BODY_HISTORICAL_DML",
            `ON CONFLICT ${conflictAction.action.toUpperCase()} target is not append-created: ${target}`,
          );
        }
        if (conflictAction.updateIndex !== null) {
          onConflictUpdateIndexes.add(conflictAction.updateIndex);
        }
        continue;
      }
    }
    if (APPEND_ROUTINE_BODY_FORBIDDEN_STATEMENTS.has(token.value)) {
      fail(
        "RECEIPT_APPEND_ROUTINE_BODY_DDL",
        `${token.value.toUpperCase()} is forbidden in append routine bodies`,
      );
    }
    if (!["insert", "update", "delete", "merge"].includes(token.value)) {
      continue;
    }
    if (
      token.value === "update" &&
      onConflictUpdateIndexes.has(index)
    ) {
      continue;
    }
    const target = appendRoutineBodyDmlTarget(tokens, index, token.value);
    if (token.value === "merge") {
      fail(
        "RECEIPT_APPEND_ROUTINE_BODY_MERGE",
        `MERGE is forbidden in append routine bodies: ${target}`,
      );
    }
    if (!createdRelationSet.has(target)) {
      fail(
        "RECEIPT_APPEND_ROUTINE_BODY_HISTORICAL_DML",
        `${token.value.toUpperCase()} target is not append-created: ${target}`,
      );
    }
  }
}

function validateAppendExecutableBodyScope(sql, contract, createdRelations) {
  const expectedMarkers = ["theory", "law", "legal", "이론", "법규", "법령"];
  if (
    contract.frozenAppendAuthority.executableRoutineBodyScopeExactly !==
      "PRACTICE_COMMON_ONLY" ||
    !same(
      contract.frozenAppendAuthority.forbiddenCrossSubjectBodyMarkersExactly,
      expectedMarkers,
    ) ||
    contract.frozenAppendAuthority.dynamicSqlInAppendRoutineBodiesAuthorized !==
      false ||
    contract.frozenAppendAuthority.appendRoutineBodiesMustBeDollarQuotedExactly !==
      true ||
    !same(
      contract.frozenAppendAuthority.appendRoutineBodyLanguagesAllowedExactly,
      ["sql", "plpgsql"],
    ) ||
    !same(
      contract.frozenAppendAuthority.appendRoutineBodyStaticDmlAllowedExactly,
      APPEND_ROUTINE_BODY_STATIC_DML_ALLOWED,
    ) ||
    contract.frozenAppendAuthority.appendRoutineBodyDmlTargetScopeExactly !==
      "APPEND_CREATED_RELATIONS_ONLY" ||
    contract.frozenAppendAuthority.appendRoutineBodyHistoricalRelationDmlAuthorized !==
      false ||
    contract.frozenAppendAuthority.appendRoutineBodyDdlAuthorized !== false ||
    contract.frozenAppendAuthority.appendRoutineBodyMergeAuthorized !== false
  ) {
    fail("RECEIPT_APPEND_BODY_SCOPE_AUTHORITY_DRIFT", "routine-body boundary differs");
  }
  const createdRelationSet = new Set(createdRelations);
  const outerTokens = tokenizeAppendSql(sql);
  validateAppendEncodedLiteralBoundary(sql, outerTokens);
  const statements = [];
  let start = 0;
  for (let index = 0; index <= outerTokens.length; index += 1) {
    const token = outerTokens[index];
    if (
      index === outerTokens.length ||
      (token.type === "PUNCTUATION" && token.value === ";")
    ) {
      if (index > start) statements.push(outerTokens.slice(start, index));
      start = index + 1;
    }
  }
  const pending = [];
  for (const statement of statements) {
    const executable = statement.filter((token) =>
      EXECUTABLE_SQL_TOKEN_TYPES.has(token.type),
    );
    if (
      executable[0]?.type !== "UNQUOTED_IDENTIFIER" ||
      executable[0].value !== "create" ||
      executable[1]?.type !== "UNQUOTED_IDENTIFIER" ||
      executable[1].value !== "function"
    ) {
      continue;
    }
    const languageIndexes = statement
      .map((token, index) => ({ token, index }))
      .filter(
        ({ token }) =>
          token.type === "UNQUOTED_IDENTIFIER" && token.value === "language",
      )
      .map(({ index }) => index);
    const asIndex = statement.findLastIndex(
      (token) => token.type === "UNQUOTED_IDENTIFIER" && token.value === "as",
    );
    const bodyToken = statement[asIndex + 1];
    if (
      languageIndexes.length !== 1 ||
      !["sql", "plpgsql"].includes(statement[languageIndexes[0] + 1]?.value) ||
      asIndex < 0 ||
      bodyToken?.type !== "DOLLAR_QUOTED_BODY" ||
      asIndex + 2 !== statement.length
    ) {
      fail(
        "RECEIPT_APPEND_ROUTINE_BODY_ENCODING",
        "each SQL/PLpgSQL CREATE FUNCTION must end in exactly one dollar-quoted body",
      );
    }
    pending.push(bodyToken.body);
  }
  for (const token of outerTokens) {
    let executableLexeme = null;
    if (
      token.type === "UNQUOTED_IDENTIFIER" ||
      token.type === "QUOTED_IDENTIFIER"
    ) {
      executableLexeme = token.value.toLowerCase();
    } else if (
      token.type === "ORDINARY_STRING" ||
      token.type === "ESCAPE_STRING"
    ) {
      executableLexeme = sql.slice(token.start, token.end).toLowerCase();
    }
    if (
      executableLexeme !== null &&
      expectedMarkers.some((marker) => executableLexeme.includes(marker))
    ) {
      fail(
        "RECEIPT_APPEND_CROSS_SUBJECT_SCOPE",
        `forbidden top-level marker in ${executableLexeme}`,
      );
    }
  }
  while (pending.length > 0) {
    const body = pending.pop();
    const tokens = tokenizeAppendSql(body);
    validateAppendEncodedLiteralBoundary(body, tokens);
    const executableTokens = tokens.filter((token) =>
      EXECUTABLE_SQL_TOKEN_TYPES.has(token.type),
    );
    validateAppendRoutineBodyMutationScope(
      executableTokens,
      createdRelationSet,
    );
    for (const token of tokens) {
      if (token.type === "DOLLAR_QUOTED_BODY") {
        pending.push(token.body);
        continue;
      }
      if (
        token.type === "UNQUOTED_IDENTIFIER" &&
        token.value === "execute"
      ) {
        fail("RECEIPT_APPEND_DYNAMIC_SQL_BODY", "dynamic SQL is unsupported");
      }
      let executableLexeme = null;
      if (
        token.type === "UNQUOTED_IDENTIFIER" ||
        token.type === "QUOTED_IDENTIFIER"
      ) {
        executableLexeme = token.value.toLowerCase();
      } else if (
        token.type === "ORDINARY_STRING" ||
        token.type === "ESCAPE_STRING"
      ) {
        executableLexeme = body.slice(token.start, token.end).toLowerCase();
      }
      if (
        executableLexeme !== null &&
        expectedMarkers.some((marker) => executableLexeme.includes(marker))
      ) {
        fail(
          "RECEIPT_APPEND_CROSS_SUBJECT_BODY",
          `forbidden routine-body marker in ${executableLexeme}`,
        );
      }
    }
  }
}

export function validateAppendSemanticSource(bytes, contract) {
  const canonical = canonicalizeUtf8Lf(bytes);
  const sql = topLevelExecutableSql(canonical);
  const statements = sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
  const createdRelations = [
    ...sql.matchAll(
      /\bcreate table ([a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*)/gu,
    ),
  ].map((match) => normalizeSqlIdentity(match[1]));
  validateAppendExecutableBodyScope(canonical, contract, createdRelations);
  const createdRoutineRecords = statements
    .filter((statement) => statement.startsWith("create function "))
    .map((statement) => {
      const match = statement.match(
        /^create function ([a-z_][a-z0-9_$]*(?:\.[a-z_][a-z0-9_$]*)?)\((.*)\) returns\b/u,
      );
      if (!match) fail("RECEIPT_APPEND_ROUTINE_DECLARATION", statement);
      const baseIdentity = normalizeSqlIdentity(match[1]);
      const identityArguments = canonicalRoutineIdentityArguments(match[2]);
      return {
        baseIdentity,
        identity: `${baseIdentity}(${identityArguments})`,
      };
    });
  const createdRoutineBases = createdRoutineRecords.map(
    (record) => record.baseIdentity,
  );
  const createdRoutines = createdRoutineRecords.map((record) => record.identity);
  if (new Set(createdRelations).size !== createdRelations.length) {
    fail("RECEIPT_APPEND_DUPLICATE_CREATED_RELATION", "duplicate relation identity");
  }
  if (new Set(createdRoutineBases).size !== createdRoutineBases.length) {
    fail("RECEIPT_APPEND_ROUTINE_OVERLOAD_FORBIDDEN", "created routine base names must be unique");
  }
  if (
    [...createdRelations, ...createdRoutineBases].some(
      (identity) => !identity.startsWith("public."),
    )
  ) {
    fail("RECEIPT_APPEND_CREATED_OBJECT_SCHEMA", "created objects must be in public");
  }
  if (
    createdRelations.length === 0 ||
    createdRoutines.length === 0 ||
    !/practice/iu.test(sql)
  ) {
    fail("RECEIPT_APPEND_DURABLE_PRACTICE_SUBSTRATE", "append must create Practice durable schema and RPC source");
  }
  for (const relation of createdRelations) {
    const escaped = relation.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    if (!new RegExp(`\\balter\\s+table\\s+${escaped}\\s+enable\\s+row\\s+level\\s+security\\b`, "iu").test(normalizeSqlIdentity(sql)) ||
        !new RegExp(`\\balter\\s+table\\s+${escaped}\\s+force\\s+row\\s+level\\s+security\\b`, "iu").test(normalizeSqlIdentity(sql))) {
      fail("RECEIPT_APPEND_FORCE_RLS_SOURCE", relation);
    }
  }
  const conceptAuthority =
    contract.authorizedExistingPathOperations.records.find(
      (operation) =>
        operation.operationId ===
        "PERSONAL_CONCEPT_EARLY_BOUNDARY_COMPATIBILITY_REPAIR",
    );
  const transitionIdentity =
    conceptAuthority.finalAppendTransitionFunctionIdentityExactly;
  const transitionCatalogIdentity = canonicalRoutineIdentity(transitionIdentity);
  if (
    transitionCatalogIdentity !==
      conceptAuthority.finalAppendTransitionFunctionCatalogIdentityExactly ||
    !same(conceptAuthority.finalAppendTransitionFunctionAclStatementsExactly, [
      "REVOKE_EXECUTE_FROM_PUBLIC",
      "REVOKE_EXECUTE_FROM_ANON",
      "GRANT_EXECUTE_TO_AUTHENTICATED",
    ]) ||
    !same(
      conceptAuthority.finalAppendTransitionFunctionExplicitGranteesExactly,
      ["authenticated"],
    ) ||
    !same(
      contract.frozenAppendAuthority.newDurableRelationAclGranteesAllowedExactly,
      ["service_role"],
    ) ||
    !same(contract.frozenAppendAuthority.newDurablePolicyRolesExactly, ["service_role"]) ||
    !same(
      contract.frozenAppendAuthority.newDurableRoutineAclGranteesExactly,
      ["service_role"],
    ) ||
    contract.frozenAppendAuthority.multiObjectPrivilegeStatementsAuthorized !== false ||
    contract.frozenAppendAuthority.destructiveDropAuthorized !== false
  ) {
    fail("RECEIPT_APPEND_ACL_AUTHORITY_DRIFT", "machine ACL boundary differs");
  }
  const transitionAclStatements = statements.filter(
    (statement) =>
      statement.includes(transitionIdentity) &&
      /^(?:grant|revoke) /u.test(statement),
  );
  const exactTransitionAclStatements = [
    `revoke execute on function ${transitionIdentity} from public`,
    `revoke execute on function ${transitionIdentity} from anon`,
    `grant execute on function ${transitionIdentity} to authenticated`,
  ];
  if (!same(transitionAclStatements, exactTransitionAclStatements)) {
    fail(
      "RECEIPT_APPEND_FINAL_CONCEPT_BOUNDARY",
      `exact PUBLIC/anon revoke and authenticated-only transition RPC grant differ: ${JSON.stringify(transitionAclStatements)}`,
    );
  }
  for (const statement of statements.filter((entry) => entry.startsWith("grant "))) {
    const granteeMatch = statement.match(/\bto ([a-z_][a-z0-9_$]*(?:,[a-z_][a-z0-9_$]*)*)$/u);
    if (!granteeMatch) fail("RECEIPT_APPEND_GRANT_UNPARSED", statement);
    const grantees = granteeMatch[1].split(",");
    if (statement === exactTransitionAclStatements[2]) continue;
    if (!same(grantees, ["service_role"])) {
      fail("RECEIPT_APPEND_NON_SERVICE_GRANT", statement);
    }
  }
  for (const statement of statements.filter((entry) => entry.startsWith("create policy "))) {
    const roles = statement.match(
      /\bto ([a-z_][a-z0-9_$]*(?:,[a-z_][a-z0-9_$]*)*)(?: using| with check|$)/u,
    )?.[1].split(",");
    if (!same(roles, ["service_role"])) {
      fail("RECEIPT_APPEND_NON_SERVICE_POLICY", statement);
    }
  }
  for (const statement of statements) {
    if (/^(?:drop |truncate |delete |update |insert |merge |copy |call |do )/u.test(statement)) {
      fail("RECEIPT_APPEND_DESTRUCTIVE_OPERATION", statement);
    }
  }
  const createdRelationSet = new Set(createdRelations);
  const createdRoutineSet = new Set(createdRoutines);
  const approvedExistingRlsRelations = new Set([
    "public.personal_learning_states",
    "public.personal_concept_nodes",
  ]);
  const hardenedExistingRelations = new Set();
  for (const statement of statements) {
    if (/^create table [a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*\(/u.test(statement)) continue;
    if (/^create function [a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*\(/u.test(statement)) continue;
    if (statement.startsWith("alter table ")) {
      const match = statement.match(
        /^alter table ([a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*) (enable|force) row level security$/u,
      );
      if (
        !match ||
        (!createdRelationSet.has(match[1]) &&
          !approvedExistingRlsRelations.has(match[1]))
      ) {
        fail("RECEIPT_APPEND_UNAUTHORIZED_ALTER", statement);
      }
      if (approvedExistingRlsRelations.has(match[1])) {
        hardenedExistingRelations.add(match[1]);
      }
      continue;
    }
    if (statement.startsWith("create policy ")) {
      const match = statement.match(
        /^create policy [a-z_][a-z0-9_$]* on ([a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*) /u,
      );
      if (
        !match ||
        (!createdRelationSet.has(match[1]) &&
          !approvedExistingRlsRelations.has(match[1]))
      ) {
        fail("RECEIPT_APPEND_UNAUTHORIZED_POLICY_TARGET", statement);
      }
      continue;
    }
    if (statement.startsWith("create index ") || statement.startsWith("create unique index ")) {
      const match = statement.match(
        /\bon ([a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*)\b/u,
      );
      if (!match || !createdRelationSet.has(match[1])) {
        fail("RECEIPT_APPEND_UNAUTHORIZED_INDEX_TARGET", statement);
      }
      continue;
    }
    if (/^(?:grant|revoke) /u.test(statement)) {
      if (transitionAclStatements.includes(statement)) continue;
      const relationTarget = statement.match(
        /\bon table ([a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*) (?:from|to) /u,
      )?.[1];
      const routineTarget = statement.match(
        /\bon function ([a-z_][a-z0-9_$]*\.[a-z_][a-z0-9_$]*\([^)]*\)) (?:from|to) /u,
      )?.[1];
      if (
        (!relationTarget || !createdRelationSet.has(relationTarget)) &&
        (!routineTarget || !createdRoutineSet.has(routineTarget))
      ) {
        fail("RECEIPT_APPEND_UNAUTHORIZED_PRIVILEGE_TARGET", statement);
      }
      continue;
    }
    fail("RECEIPT_APPEND_UNLISTED_STATEMENT", statement);
  }
  for (const routine of createdRoutines) {
    const aclStatements = statements.filter(
      (statement) =>
        /^(?:grant|revoke) /u.test(statement) &&
        statement.includes(`on function ${routine} `),
    );
    const revokeGrantees = new Set(
      aclStatements
        .filter((statement) => statement.startsWith("revoke "))
        .flatMap((statement) =>
          (statement.match(/\bfrom ([a-z_][a-z0-9_$]*(?:,[a-z_][a-z0-9_$]*)*)$/u)?.[1] ?? "")
            .split(",")
            .filter(Boolean),
        ),
    );
    const grants = aclStatements.filter((statement) => statement.startsWith("grant "));
    if (
      !["public", "anon", "authenticated"].every((role) => revokeGrantees.has(role)) ||
      grants.length !== 1 ||
      !grants[0].endsWith(" to service_role")
    ) {
      fail("RECEIPT_APPEND_ROUTINE_SOURCE_ACL", routine);
    }
  }
  if (/\b(?:disable|no\s+force)\s+row\s+level\s+security\b/iu.test(sql)) {
    fail("RECEIPT_APPEND_RLS_WEAKENING_SOURCE", "append weakens RLS");
  }
  return {
    createdRelations: [...new Set(createdRelations)].sort(),
    createdRoutines: [...new Set(createdRoutines)].sort(),
    hardenedExistingRelations: [...hardenedExistingRelations].sort(),
    transitionIdentity: transitionCatalogIdentity,
  };
}

function operationPathMap(contract) {
  return new Map(
    contract.authorizedExistingPathOperations.records.map((operation) => [
      operation.currentPath,
      operation.futurePath,
    ]),
  );
}

function expectedDependencyRecords(contract, a0Contract) {
  const pathMap = operationPathMap(contract);
  const mapped = (filename) =>
    pathMap.get(`${MIGRATION_PREFIX}${filename}`) ?? `${MIGRATION_PREFIX}${filename}`;
  const conceptPath =
    "supabase/migrations/202606232130_personal_concept_graph_rpc_only_write_boundary.sql";
  const byPath = new Map();
  for (const record of a0Contract.migrationHistoryCompatibilityManifestV1.records) {
    const currentPath = `${MIGRATION_PREFIX}${record.currentFilename}`;
    const futurePath = mapped(record.currentFilename);
    const predecessors = currentPath === conceptPath
      ? [...contract.effectiveMigrationInventoryAuthority.conceptEarlyBoundaryPredecessorsExactly]
      : record.exactDependencyPredecessors.map(mapped);
    byPath.set(futurePath, { path: futurePath, predecessors });
  }
  const appendPath = contract.frozenAppendAuthority.path;
  byPath.set(appendPath, {
    path: appendPath,
    predecessors: [
      ...contract.effectiveMigrationInventoryAuthority.appendRequiredDependencyPredecessorsExactly,
    ],
  });
  return contract.effectiveMigrationInventoryAuthority.effectivePathsExactly.map(
    (migrationPath) => byPath.get(migrationPath),
  );
}

function validateDependencyOrder(records, effectivePaths) {
  const positions = new Map(effectivePaths.map((migrationPath, index) => [migrationPath, index]));
  assertUnique(records.map((record) => record.path), "DUPLICATE_DEPENDENCY_RECORD", "dependency records");
  for (const record of records) {
    if (!positions.has(record.path)) fail("UNKNOWN_DEPENDENCY_RECORD", record.path);
    assertUnique(record.predecessors, "DUPLICATE_PREDECESSOR", record.path);
    for (const predecessor of record.predecessors) {
      if (!positions.has(predecessor)) fail("UNKNOWN_PREDECESSOR", predecessor);
      if (positions.get(predecessor) >= positions.get(record.path)) {
        fail("DEPENDENCY_ORDER_INVALID", `${predecessor} must precede ${record.path}`);
      }
    }
  }
}

export function deriveCandidateDependencyRecords(
  contract,
  a0Contract,
  repositoryRoot,
  candidateHead,
) {
  const effectivePaths =
    contract.effectiveMigrationInventoryAuthority.effectivePathsExactly;
  const currentToFuture = operationPathMap(contract);
  const mappedFilename = (filename) =>
    path.basename(
      currentToFuture.get(`${MIGRATION_PREFIX}${filename}`) ??
        `${MIGRATION_PREFIX}${filename}`,
    );
  const baseRecords =
    a0Contract.migrationHistoryCompatibilityManifestV1.records.map(
      (record, index) => ({
        ...record,
        currentFilename: mappedFilename(record.currentFilename),
        freshHistoryOrder: index + 1,
      }),
    );
  const records = [
    ...baseRecords,
    {
      currentFilename: path.basename(contract.frozenAppendAuthority.path),
      presentOnLiveMain: true,
      freshHistoryOrder: 26,
    },
  ];
  const sqlByFilename = new Map(
    effectivePaths.map((migrationPath) => [
      path.basename(migrationPath),
      canonicalizeUtf8Lf(
        gitPathBytes(repositoryRoot, candidateHead, migrationPath),
      ),
    ]),
  );
  const a0Closure =
    a0Contract.migrationHistoryCompatibilityManifestV1
      .migrationDependencyClosureV1;
  const exactPredecessorOverrides = a0Closure.exactPredecessorOverrides.map(
    (override) => ({
      ...override,
      currentFilename: mappedFilename(override.currentFilename),
    }),
  );
  const derived = deriveMigrationDependencyClosure(records, sqlByFilename, {
    environmentRequiredExtensions: a0Closure.environmentRequiredExtensions,
    externalDatabaseObjects:
      a0Contract.migrationHistoryCompatibilityManifestV1.externalDatabaseObjects,
    closedQualifiedDatabaseSchemas: a0Closure.closedQualifiedDatabaseSchemas,
    exactPredecessorOverrides,
  });
  return derived.map((entry) => ({
    path: `${MIGRATION_PREFIX}${entry.currentFilename}`,
    predecessors: entry.exactDependencyPredecessors.map(
      (filename) => `${MIGRATION_PREFIX}${filename}`,
    ),
  }));
}

async function validateImmutableArtifacts(contract, repositoryRoot) {
  const groups = [
    contract.immutableUpstreamAuthority.c3rA0Artifacts,
    contract.immutableUpstreamAuthority.c3rA1Artifacts,
    contract.immutableUpstreamAuthority.postgresqlOracleArtifacts,
  ];
  for (const artifacts of groups) {
    for (const [name, binding] of Object.entries(artifacts)) {
      assertGitBlob(binding.gitBlob, "UPSTREAM_GIT_BLOB_INVALID", name);
      assertSha256(binding.sha256, "UPSTREAM_SHA256_INVALID", name);
      const currentBlob = currentPathBlob(repositoryRoot, binding.path);
      if (currentBlob !== binding.gitBlob) {
        fail("IMMUTABLE_UPSTREAM_BLOB_DRIFT", binding.path);
      }
      const bytes = gitBlobBytes(repositoryRoot, binding.gitBlob);
      if (sha256(bytes) !== binding.sha256) {
        fail("IMMUTABLE_UPSTREAM_DIGEST_DRIFT", binding.path);
      }
    }
  }
}

export async function validateAuthorityContract(
  contract,
  { repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..") } = {},
) {
  assertExactKeys(contract, TOP_LEVEL_FIELDS, "AUTHORITY_TOP_LEVEL_FIELDS", "contract");
  if (contract.contractId !== "C3RPMigrationMutationAuthorityV1") {
    fail("CONTRACT_ID", "unexpected contract ID");
  }
  if (contract.authority.isC3rStage !== false || contract.authority.canonicalStageInserted !== false) {
    fail("STAGE_INSERTION_FORBIDDEN", "PRE-C3R-P authority is not a stage");
  }
  if (
    contract.authority.migrationFileMutationPerformedByThisWork !== false ||
    contract.authority.exactProspectiveC3rPSourceOperationsAuthorizedAfterValidatedAuthorityReceipt !== true
  ) {
    fail("AUTHORITY_TIME_BOUNDARY", "current and prospective mutation scopes must remain separate");
  }
  if (!same(contract.ownedPaths, OWNED_PATHS)) {
    fail("OWNED_PATH_CLOSURE", "owned path manifest differs");
  }
  const authorityBase = await resolveAuthorityBaseBinding(repositoryRoot, contract);
  if (
    isExactAuthorityCandidateContext(repositoryRoot, contract) &&
    authorityBase.gitHistoryAvailable
  ) {
    validateExactAuthorityChangedPaths(
      currentAuthorityChangedPaths(repositoryRoot, authorityBase.commit),
      contract,
    );
  }
  for (const ownedPath of contract.ownedPaths) {
    if (contract.forbiddenExactPaths.includes(ownedPath)) {
      fail("FORBIDDEN_OWNED_PATH", ownedPath);
    }
    if (contract.forbiddenPathPrefixes.some((prefix) => ownedPath.startsWith(prefix))) {
      fail("FORBIDDEN_OWNED_PREFIX", ownedPath);
    }
  }
  await validateImmutableArtifacts(contract, repositoryRoot);

  const a0Source = await readFile(path.join(repositoryRoot, A0_CONTRACT_PATH), "utf8");
  const a0Contract = parseJsonRejectDuplicateKeys(a0Source);
  const liveSql = await loadLiveMigrationSql(
    path.join(repositoryRoot, "supabase", "migrations"),
  );
  const a0Summary = validateMigrationDependencyClosure(
    a0Contract.migrationHistoryCompatibilityManifestV1,
    liveSql,
  );
  if (a0Summary.liveMigrationCount !== 25) {
    fail("A0_BASELINE_COUNT", "A0 must validate exactly 25 current migrations");
  }

  const baseline = contract.currentMigrationBaseline;
  if (baseline.fileCount !== 25 || baseline.records.length !== 25) {
    fail("BASELINE_COUNT", "current baseline must contain exactly 25 records");
  }
  assertUnique(baseline.records.map((record) => record.path), "BASELINE_DUPLICATE_PATH", "baseline");
  const a0Paths = a0Contract.migrationHistoryCompatibilityManifestV1.records.map(
    (record) => `${MIGRATION_PREFIX}${record.currentFilename}`,
  );
  if (!same(baseline.records.map((record) => record.path), a0Paths)) {
    fail("BASELINE_A0_ORDER", "baseline must preserve the A0 declared record order");
  }
  for (const record of baseline.records) {
    const currentBlob = currentPathBlob(repositoryRoot, record.path);
    if (currentBlob !== record.gitBlob) fail("BASELINE_BLOB_DRIFT", record.path);
    const bytes = gitBlobBytes(repositoryRoot, record.gitBlob);
    assertEvidence(
      evidenceForBytes(bytes),
      evidenceFromRecord(record),
      "BASELINE_EVIDENCE_DRIFT",
      record.path,
    );
    const canonical = canonicalizeUtf8Lf(bytes);
    if (canonical.includes("\r") || !canonical.endsWith("\n")) {
      fail("BASELINE_LINE_ENDING", record.path);
    }
  }

  const operationEnvelope = contract.authorizedExistingPathOperations;
  const operations = operationEnvelope.records;
  if (
    operations.length !== 7 ||
    operationEnvelope.operationCountExactly !== 7 ||
    operationEnvelope.renameCountExactly !== 6 ||
    operationEnvelope.contentRepairCountExactly !== 2 ||
    operationEnvelope.renameOnlyCountExactly !== 5 ||
    operationEnvelope.inPlaceRepairCountExactly !== 1 ||
    operationEnvelope.deleteCountExactly !== 0
  ) {
    fail("OPERATION_CARDINALITY", "seven/six/two/five/one/zero closure differs");
  }
  assertUnique(operations.map((operation) => operation.operationId), "DUPLICATE_OPERATION", "operations");
  assertUnique(operations.map((operation) => operation.currentPath), "DUPLICATE_CURRENT_PATH", "operations");
  const baselineByPath = new Map(baseline.records.map((record) => [record.path, record]));
  const remoteClasses = operations.map((operation) => operation.remoteClassification);
  if (
    remoteClasses.filter((value) => value === "UNKNOWN").length !== 6 ||
    remoteClasses.filter((value) => value === "KNOWN_APPLIED").length !== 1
  ) {
    fail("REMOTE_CLASSIFICATION_CARDINALITY", "expected six UNKNOWN and one KNOWN_APPLIED");
  }
  for (const operation of operations) {
    const baselineRecord = baselineByPath.get(operation.currentPath);
    if (!baselineRecord) fail("OPERATION_PATH_NOT_IN_A0", operation.currentPath);
    assertEvidence(
      operation.currentEvidence,
      evidenceFromRecord(baselineRecord),
      "OPERATION_CURRENT_EVIDENCE",
      operation.operationId,
    );
    const currentBytes = gitBlobBytes(repositoryRoot, baselineRecord.gitBlob);
    const futureBytes = deriveFutureBytes(operation, currentBytes);
    assertEvidence(
      evidenceForBytes(futureBytes),
      operation.futureEvidence,
      "OPERATION_FUTURE_EVIDENCE",
      operation.operationId,
    );
    if (operation.operationKind === "RENAME_ONLY") {
      if (!operation.futureCanonicalBytesMustEqualCurrentExactly || !currentBytes.equals(futureBytes)) {
        fail("RENAME_ONLY_BYTES_CHANGED", operation.operationId);
      }
    }
    if (operation.operationId === "PERSONAL_LEARNING_STATE_RENAME_AND_RECURSIVE_CTE_REPAIR") {
      validatePersonalLearningRepair(operation, currentBytes, futureBytes);
    }
    if (operation.operationId === "PERSONAL_CONCEPT_EARLY_BOUNDARY_COMPATIBILITY_REPAIR") {
      validateConceptRepair(operation, futureBytes);
    }
  }

  const inventory = contract.effectiveMigrationInventoryAuthority;
  const currentSet = new Set(baseline.records.map((record) => record.path));
  for (const operation of operations) {
    if (operation.currentPath !== operation.futurePath) currentSet.delete(operation.currentPath);
    currentSet.add(operation.futurePath);
  }
  currentSet.add(contract.frozenAppendAuthority.path);
  const effectivePaths = [...currentSet].sort();
  if (!same(effectivePaths, inventory.effectivePathsExactly) || effectivePaths.length !== 26) {
    fail("EFFECTIVE_INVENTORY_CLOSURE", "effective path formula must derive exactly 26 paths");
  }
  const operationPaths = new Set(operations.map((operation) => operation.currentPath));
  const unchangedPaths = baseline.records
    .map((record) => record.path)
    .filter((migrationPath) => !operationPaths.has(migrationPath));
  if (!same(unchangedPaths, inventory.unchangedPathsExactly) || unchangedPaths.length !== 18) {
    fail("UNCHANGED_PATH_CLOSURE", "exactly 18 A0 paths must remain unchanged");
  }
  const append = contract.frozenAppendAuthority;
  const appendFilename = path.basename(append.path);
  if (
    !/^\d{14}_c3r_p_practice_common_durable_substrate\.sql$/u.test(appendFilename) ||
    append.version !== appendFilename.slice(0, 14) ||
    append.version <= append.versionMustBeGreaterThan ||
    append.secondAppendAllowed !== false ||
    append.futureSqlSha256AtAuthorityTime !== null
  ) {
    fail("FROZEN_APPEND_IDENTITY", "append identity/version/digest state differs");
  }
  const migrationNames = await readdir(path.join(repositoryRoot, "supabase", "migrations"));
  if (migrationNames.includes(appendFilename)) {
    fail("APPEND_CREATED_BY_AUTHORITY_WORK", append.path);
  }
  const dependencies = expectedDependencyRecords(contract, a0Contract);
  validateDependencyOrder(dependencies, effectivePaths);
  if (!same(contract.stageState, STAGE_STATE)) {
    fail("STAGE_STATE_DRIFT", "C3R-P/T/L state changed");
  }
  const remote = contract.remoteContinuityBoundary;
  for (const [key, value] of Object.entries(remote)) {
    if ((key.endsWith("Authorized") || key.endsWith("Count")) && value !== false && value !== 0) {
      fail("REMOTE_AUTHORIZATION_NONZERO", key);
    }
  }
  if (contract.localDockerClassification !== "LOCAL_DOCKER_NOT_REQUIRED_SOURCE_ONLY_AUTHORITY") {
    fail("LOCAL_DOCKER_CLASSIFICATION", "source authority must not require Docker");
  }
  if (currentPathBlob(repositoryRoot, "package.json") !== contract.packageIdentity.packageJsonGitBlob) {
    fail("PACKAGE_BLOB_DRIFT", "package.json");
  }
  if (currentPathBlob(repositoryRoot, "package-lock.json") !== contract.packageIdentity.packageLockJsonGitBlob) {
    fail("PACKAGE_BLOB_DRIFT", "package-lock.json");
  }
  if (
    sha256(Buffer.from(canonicalJson(contract), "utf8")) !==
    EXPECTED_CONTRACT_CANONICAL_SHA256
  ) {
    fail(
      "AUTHORITY_CONTRACT_CANONICAL_DIGEST",
      "closed authority fields or values differ",
    );
  }
  return {
    contractId: contract.contractId,
    currentMigrationCount: baseline.records.length,
    authorizedExistingPathOperationCount: operations.length,
    renameCount: operationEnvelope.renameCountExactly,
    contentRepairCount: operationEnvelope.contentRepairCountExactly,
    frozenAppendPath: append.path,
    effectiveMigrationCount: effectivePaths.length,
    a0ValidatedMigrationCount: a0Summary.liveMigrationCount,
    remoteOperationAuthorizationCount: remote.remoteOperationAuthorizationCount,
    stageSelectorChangeCount: 0,
  };
}

function assertEvidenceShape(evidence, receiptSchema, location) {
  assertExactKeys(
    evidence,
    receiptSchema.nestedRequiredFieldsExactly.evidence,
    "RECEIPT_EVIDENCE_FIELDS",
    location,
  );
  assertGitBlob(evidence.gitBlob, "RECEIPT_EVIDENCE_BLOB", location);
  assertSha256(evidence.rawSha256, "RECEIPT_EVIDENCE_SHA", location);
  assertSha256(evidence.canonicalUtf8LfSha256, "RECEIPT_EVIDENCE_CANONICAL_SHA", location);
  if (!Number.isInteger(evidence.byteCount) || evidence.byteCount <= 0) {
    fail("RECEIPT_EVIDENCE_BYTES", location);
  }
  if (!Number.isInteger(evidence.lineCount) || evidence.lineCount <= 0) {
    fail("RECEIPT_EVIDENCE_LINES", location);
  }
}

async function validateAuthorityBinding(
  receipt,
  contract,
  repositoryRoot,
  authorityResultingMain,
  candidateHead,
) {
  const binding = receipt.authorityBinding;
  if (
    binding.decisionRef !== contract.authority.decisionRecord ||
    binding.contractRef !== CONTRACT_PATH
  ) {
    fail("RECEIPT_AUTHORITY_REF", "decision or contract ref differs");
  }
  const baseDecisionBytes = gitPathBytes(
    repositoryRoot,
    authorityResultingMain,
    binding.decisionRef,
  );
  const baseContractBytes = gitPathBytes(
    repositoryRoot,
    authorityResultingMain,
    binding.contractRef,
  );
  const candidateDecisionBytes = gitPathBytes(
    repositoryRoot,
    candidateHead,
    binding.decisionRef,
  );
  const candidateContractBytes = gitPathBytes(
    repositoryRoot,
    candidateHead,
    binding.contractRef,
  );
  if (
    binding.decisionSha256 !== sha256(baseDecisionBytes) ||
    !baseDecisionBytes.equals(candidateDecisionBytes)
  ) {
    fail("RECEIPT_DECISION_DIGEST", binding.decisionRef);
  }
  if (
    binding.contractSha256 !== sha256(baseContractBytes) ||
    !baseContractBytes.equals(candidateContractBytes)
  ) {
    fail("RECEIPT_CONTRACT_DIGEST", binding.contractRef);
  }
  const installedContract = parseJsonRejectDuplicateKeys(
    baseContractBytes.toString("utf8"),
  );
  if (!same(installedContract, contract)) {
    fail(
      "RECEIPT_CONTRACT_OBJECT_DRIFT",
      "validated authority resulting-main contract differs",
    );
  }
}

function authorityMergeReceiptDigest(authorityMergeReceipt) {
  const copy = structuredClone(authorityMergeReceipt);
  delete copy.receiptDigest;
  return domainDigest(
    "C3R_P_MIGRATION_MUTATION_AUTHORITY_MERGE_RECEIPT_V1",
    copy,
  );
}

async function validateAuthorityMergeReceipt(
  receipt,
  contract,
  repositoryRoot,
  authorityMergeReceiptVerifier,
) {
  const authorityReceipt = receipt.authorityMergeReceipt;
  const head = receipt.c3rPHeadBinding;
  if (
    authorityReceipt.receiptType !==
      contract.c3rPMigrationMutationReceiptV1.authorityMergeReceiptTypeExactly ||
    authorityReceipt.repository !== "chachathecat/inverge" ||
    authorityReceipt.authorityPullRequest !==
      contract.c3rPMigrationMutationReceiptV1.authorityPullRequestExactly ||
    authorityReceipt.reconciledBaseSha !== contract.authority.reconciledBaseSha ||
    authorityReceipt.reconciledBaseTree !== contract.authority.reconciledBaseTree ||
    !COMMIT_SHA.test(authorityReceipt.reviewedHead) ||
    !COMMIT_SHA.test(authorityReceipt.reviewedTree) ||
    !COMMIT_SHA.test(authorityReceipt.squashMergeCommit) ||
    !COMMIT_SHA.test(authorityReceipt.resultingMainSha) ||
    !COMMIT_SHA.test(authorityReceipt.resultingMainTree) ||
    authorityReceipt.squashMergeCommit !== authorityReceipt.resultingMainSha ||
    authorityReceipt.decisionRef !== contract.authority.decisionRecord ||
    authorityReceipt.contractRef !== CONTRACT_PATH ||
    authorityReceipt.decisionSha256 !== receipt.authorityBinding.decisionSha256 ||
    authorityReceipt.contractSha256 !== receipt.authorityBinding.contractSha256 ||
    authorityReceipt.expectedHeadPinnedSquashMerge !== true ||
    authorityReceipt.requiredNativeChecksPassed !== true ||
    !same(authorityReceipt.formalReviewActionableP0P1P2, [0, 0, 0]) ||
    authorityReceipt.unresolvedActionableThreadCount !== 0 ||
    authorityReceipt.authorityReceiptValidated !== true ||
    authorityReceipt.migrationFileChangeCount !== 0 ||
    authorityReceipt.remoteMutationCount !== 0
  ) {
    fail(
      "RECEIPT_AUTHORITY_MERGE_BINDING",
      "authority merge receipt is not the exact validated PR #796 outcome",
    );
  }
  for (const [value, code, label] of [
    [authorityReceipt.decisionSha256, "RECEIPT_AUTHORITY_MERGE_DECISION_SHA", "decision"],
    [authorityReceipt.contractSha256, "RECEIPT_AUTHORITY_MERGE_CONTRACT_SHA", "contract"],
  ]) {
    assertSha256(value, code, label);
  }
  if (authorityReceipt.receiptDigest !== authorityMergeReceiptDigest(authorityReceipt)) {
    fail(
      "RECEIPT_AUTHORITY_MERGE_DIGEST",
      "authority merge receipt digest differs",
    );
  }
  if (
    head.baseSha !== authorityReceipt.resultingMainSha ||
    head.baseTree !== authorityReceipt.resultingMainTree
  ) {
    fail(
      "RECEIPT_AUTHORITY_MERGE_BASE_BINDING",
      "C3R-P base must equal the validated authority resulting main SHA/tree",
    );
  }
  const resolvedAuthorityMain = gitCommitTree(
    repositoryRoot,
    authorityReceipt.resultingMainSha,
  );
  if (
    resolvedAuthorityMain.commit !== authorityReceipt.resultingMainSha ||
    resolvedAuthorityMain.tree !== authorityReceipt.resultingMainTree
  ) {
    fail(
      "RECEIPT_AUTHORITY_MERGE_GIT_OBJECT",
      "authority resulting-main SHA/tree differs from Git",
    );
  }
  if (typeof authorityMergeReceiptVerifier !== "function") {
    fail(
      "RECEIPT_AUTHORITY_MERGE_VERIFIER_REQUIRED",
      "the prior authority merge requires independent live GitHub verification",
    );
  }
  const independentlyVerified = await authorityMergeReceiptVerifier({
    authorityMergeReceipt: structuredClone(authorityReceipt),
    receipt: structuredClone(receipt),
    contract: structuredClone(contract),
    repositoryRoot,
  });
  if (!same(independentlyVerified, authorityReceipt)) {
    fail(
      "RECEIPT_AUTHORITY_MERGE_VERIFIER_MISMATCH",
      "independent authority merge evidence differs from the closed receipt",
    );
  }
}

function validateReceiptGitState(receipt, contract, repositoryRoot) {
  const head = receipt.c3rPHeadBinding;
  const resolvedBase = gitCommitTree(repositoryRoot, head.baseSha);
  const resolvedHead = gitCommitTree(repositoryRoot, head.candidateHead);
  if (
    resolvedBase.commit !== head.baseSha ||
    resolvedBase.tree !== head.baseTree ||
    resolvedHead.commit !== head.candidateHead ||
    resolvedHead.tree !== head.candidateTree
  ) {
    fail("RECEIPT_GIT_OBJECT_BINDING", "base/head SHA or tree differs from Git");
  }
  const ancestor = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", head.baseSha, head.candidateHead],
    { cwd: repositoryRoot, encoding: "utf8" },
  );
  if (ancestor.status !== 0) {
    fail("RECEIPT_BASE_NOT_ANCESTOR", "C3R-P base is not an ancestor of its head");
  }
  const basePaths = gitMigrationPaths(repositoryRoot, head.baseSha);
  const expectedBasePaths = contract.currentMigrationBaseline.records.map(
    (record) => record.path,
  );
  if (!same([...basePaths].sort(), [...expectedBasePaths].sort())) {
    fail("RECEIPT_BASE_MIGRATION_INVENTORY", "base is not the exact A0 25-file inventory");
  }
  const headPaths = gitMigrationPaths(repositoryRoot, head.candidateHead);
  if (!same(
    [...headPaths].sort(),
    [...contract.effectiveMigrationInventoryAuthority.effectivePathsExactly].sort(),
  )) {
    fail("RECEIPT_HEAD_MIGRATION_INVENTORY", "candidate head is not the exact 26-file inventory");
  }
  for (const baseline of contract.currentMigrationBaseline.records) {
    assertEvidence(
      evidenceForBytes(gitPathBytes(repositoryRoot, head.baseSha, baseline.path)),
      evidenceFromRecord(baseline),
      "RECEIPT_BASE_GIT_EVIDENCE",
      baseline.path,
    );
  }
  const receiptEvidenceByPath = new Map(
    receipt.effectiveInventory.records.map((record) => [record.path, record.evidence]),
  );
  for (const migrationPath of headPaths) {
    assertEvidence(
      evidenceForBytes(gitPathBytes(repositoryRoot, head.candidateHead, migrationPath)),
      receiptEvidenceByPath.get(migrationPath),
      "RECEIPT_HEAD_GIT_EVIDENCE",
      migrationPath,
    );
  }
}

function receiptDigest(receipt) {
  const copy = structuredClone(receipt);
  delete copy.receiptDigest;
  return domainDigest("C3R_P_MIGRATION_MUTATION_RECEIPT_V1", copy);
}

export async function validateC3rPMigrationMutationReceiptSource(
  source,
  contract,
  options,
) {
  return validateC3rPMigrationMutationReceipt(
    parseJsonRejectDuplicateKeys(source),
    contract,
    options,
  );
}

export async function validateC3rPMigrationMutationReceipt(
  receipt,
  contract,
  {
    repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", ".."),
    authorityMergeReceiptVerifier,
    evidenceVerifier,
  } = {},
) {
  const schema = contract.c3rPMigrationMutationReceiptV1;
  assertExactKeys(receipt, schema.requiredFieldsExactly, "RECEIPT_TOP_LEVEL_FIELDS", "receipt");
  if (receipt.receiptType !== "C3RPMigrationMutationReceiptV1") {
    fail("RECEIPT_TYPE", "unexpected receipt type");
  }
  for (const field of ["authorityBinding", "authorityMergeReceipt", "c3rPHeadBinding", "unchangedPathClosure", "append", "effectiveInventory", "dependencyAndOrderingClosure", "postgresOracleBinding", "finalDatabaseState", "practiceRuntimeReceipt", "dataBoundary", "cleanup", "remoteContinuity"]) {
    assertExactKeys(
      receipt[field],
      schema.nestedRequiredFieldsExactly[field],
      "RECEIPT_NESTED_FIELDS",
      field,
    );
  }
  const head = receipt.c3rPHeadBinding;
  if (
    head.repository !== "chachathecat/inverge" ||
    head.stage !== "C3R-P" ||
    !Number.isInteger(head.pullRequest) ||
    head.pullRequest <= 0 ||
    !COMMIT_SHA.test(head.baseSha) ||
    !COMMIT_SHA.test(head.baseTree) ||
    !COMMIT_SHA.test(head.candidateHead) ||
    !COMMIT_SHA.test(head.candidateTree)
  ) {
    fail("RECEIPT_HEAD_BINDING", "invalid C3R-P head identity");
  }
  const expectedHeadTreeBinding = sha256(
    Buffer.from(`${head.candidateHead}\n${head.candidateTree}\n`, "utf8"),
  );
  if (head.headTreeBindingSha256 !== expectedHeadTreeBinding) {
    fail("RECEIPT_HEAD_TREE_BINDING", "head/tree digest differs");
  }
  await validateAuthorityMergeReceipt(
    receipt,
    contract,
    repositoryRoot,
    authorityMergeReceiptVerifier,
  );
  await validateAuthorityBinding(
    receipt,
    contract,
    repositoryRoot,
    receipt.authorityMergeReceipt.resultingMainSha,
    head.candidateHead,
  );

  if (!Array.isArray(receipt.existingPathOperations) || receipt.existingPathOperations.length !== 7) {
    fail("RECEIPT_OPERATION_COUNT", "exactly seven operations required");
  }
  const contractOps = contract.authorizedExistingPathOperations.records;
  for (let index = 0; index < contractOps.length; index += 1) {
    const actual = receipt.existingPathOperations[index];
    const expected = contractOps[index];
    assertExactKeys(actual, schema.nestedRequiredFieldsExactly.operation, "RECEIPT_OPERATION_FIELDS", `operation[${index}]`);
    for (const evidenceField of ["currentEvidence", "futureEvidence"]) {
      assertEvidenceShape(actual[evidenceField], schema, `operation[${index}].${evidenceField}`);
    }
    for (const key of ["operationId", "operationKind", "currentPath", "futurePath", "remoteClassification"]) {
      if (actual[key] !== expected[key]) fail("RECEIPT_OPERATION_MISMATCH", `${index}.${key}`);
    }
    assertEvidence(actual.currentEvidence, expected.currentEvidence, "RECEIPT_CURRENT_EVIDENCE", expected.operationId);
    assertEvidence(actual.futureEvidence, expected.futureEvidence, "RECEIPT_FUTURE_EVIDENCE", expected.operationId);
    const proof = domainDigest("C3R_P_EXISTING_PATH_OPERATION_V1", expected);
    if (actual.transformationProofSha256 !== proof) {
      fail("RECEIPT_TRANSFORMATION_PROOF", expected.operationId);
    }
  }

  const baselineByPath = new Map(
    contract.currentMigrationBaseline.records.map((record) => [record.path, record]),
  );
  const unchanged = receipt.unchangedPathClosure;
  if (unchanged.count !== 18 || unchanged.records.length !== 18) {
    fail("RECEIPT_UNCHANGED_COUNT", "exactly 18 unchanged records required");
  }
  const expectedUnchanged = contract.effectiveMigrationInventoryAuthority.unchangedPathsExactly.map(
    (migrationPath) => ({
      path: migrationPath,
      evidence: evidenceFromRecord(baselineByPath.get(migrationPath)),
    }),
  );
  for (let index = 0; index < unchanged.records.length; index += 1) {
    const record = unchanged.records[index];
    assertExactKeys(record, schema.nestedRequiredFieldsExactly.unchangedRecord, "RECEIPT_UNCHANGED_FIELDS", `unchanged[${index}]`);
    assertEvidenceShape(record.evidence, schema, `unchanged[${index}].evidence`);
  }
  if (!same(unchanged.records, expectedUnchanged)) {
    fail("RECEIPT_UNCHANGED_CLOSURE", "unchanged records differ from A0");
  }
  if (unchanged.closureDigest !== domainDigest("C3R_P_UNCHANGED_PATH_CLOSURE_V1", unchanged.records)) {
    fail("RECEIPT_UNCHANGED_DIGEST", "unchanged closure digest differs");
  }

  const append = receipt.append;
  assertEvidenceShape(append.evidence, schema, "append.evidence");
  if (
    append.path !== contract.frozenAppendAuthority.path ||
    append.version !== contract.frozenAppendAuthority.version ||
    !same(append.purposeExactly, contract.frozenAppendAuthority.purposeExactly) ||
    !same(append.dependencyPredecessors, contract.effectiveMigrationInventoryAuthority.appendRequiredDependencyPredecessorsExactly) ||
    append.remoteApplicationAuthorized !== false ||
    append.migrationHistoryRepairAuthorized !== false
  ) {
    fail("RECEIPT_APPEND_MISMATCH", "append differs from frozen authority");
  }

  const futureByPath = new Map(
    receipt.existingPathOperations.map((operation) => [operation.futurePath, operation.futureEvidence]),
  );
  for (const record of unchanged.records) futureByPath.set(record.path, record.evidence);
  futureByPath.set(append.path, append.evidence);
  const expectedInventoryRecords = contract.effectiveMigrationInventoryAuthority.effectivePathsExactly.map(
    (migrationPath) => ({ path: migrationPath, evidence: futureByPath.get(migrationPath) }),
  );
  const inventory = receipt.effectiveInventory;
  if (inventory.count !== 26 || inventory.records.length !== 26) {
    fail("RECEIPT_EFFECTIVE_COUNT", "effective inventory must contain 26 records");
  }
  for (let index = 0; index < inventory.records.length; index += 1) {
    const record = inventory.records[index];
    assertExactKeys(record, schema.nestedRequiredFieldsExactly.effectiveInventoryRecord, "RECEIPT_INVENTORY_FIELDS", `inventory[${index}]`);
    assertEvidenceShape(record.evidence, schema, `inventory[${index}].evidence`);
  }
  if (!same(inventory.records, expectedInventoryRecords)) {
    fail("RECEIPT_EFFECTIVE_CLOSURE", "effective inventory records differ");
  }
  if (inventory.inventoryDigest !== domainDigest("C3R_P_EFFECTIVE_INVENTORY_V1", inventory.records)) {
    fail("RECEIPT_INVENTORY_DIGEST", "inventory digest differs");
  }
  const renamedOps = contractOps.filter((operation) => operation.currentPath !== operation.futurePath);
  if (
    !same(inventory.renamedOldPathsRemoved, renamedOps.map((operation) => operation.currentPath)) ||
    !same(inventory.renamedNewPathsAdded, renamedOps.map((operation) => operation.futurePath)) ||
    !same(inventory.inPlaceRepairedPaths, [contractOps[6].currentPath]) ||
    !same(inventory.appendPathsAdded, [append.path]) ||
    inventory.unmatchedDeletionCount !== 0 ||
    inventory.secondAppendCount !== 0
  ) {
    fail("RECEIPT_EFFECTIVE_FORMULA", "effective inventory formula differs");
  }
  assertUnique(
    inventory.records.map((record) => path.basename(record.path).split("_")[0]),
    "RECEIPT_DUPLICATE_VERSION",
    "effective inventory versions",
  );
  validateReceiptGitState(receipt, contract, repositoryRoot);
  const appendSourceSemantics = validateAppendSemanticSource(
    gitPathBytes(repositoryRoot, head.candidateHead, append.path),
    contract,
  );

  const a0Contract = parseJsonRejectDuplicateKeys(
    await readFile(path.join(repositoryRoot, A0_CONTRACT_PATH), "utf8"),
  );
  const expectedDependencies = expectedDependencyRecords(contract, a0Contract);
  const sourceDerivedDependencies = deriveCandidateDependencyRecords(
    contract,
    a0Contract,
    repositoryRoot,
    head.candidateHead,
  );
  const closure = receipt.dependencyAndOrderingClosure;
  if (
    closure.a0AnalyzerBinding !== contract.immutableUpstreamAuthority.c3rA0Artifacts.analyzer.sha256 ||
    !same(closure.orderedPaths, contract.effectiveMigrationInventoryAuthority.effectivePathsExactly) ||
    !same(closure.records, expectedDependencies) ||
    !same(closure.sourceDerivedRecords, sourceDerivedDependencies)
  ) {
    fail("RECEIPT_DEPENDENCY_CLOSURE", "dependency records differ");
  }
  for (let index = 0; index < closure.records.length; index += 1) {
    assertExactKeys(closure.records[index], schema.nestedRequiredFieldsExactly.dependencyRecord, "RECEIPT_DEPENDENCY_FIELDS", `dependency[${index}]`);
  }
  validateDependencyOrder(closure.records, closure.orderedPaths);
  if (closure.closureDigest !== domainDigest("C3R_P_DEPENDENCY_ORDERING_CLOSURE_V1", closure.records)) {
    fail("RECEIPT_DEPENDENCY_DIGEST", "dependency closure digest differs");
  }
  if (
    closure.sourceDerivedClosureDigest !==
    domainDigest(
      "C3R_P_SOURCE_DERIVED_DEPENDENCY_CLOSURE_V1",
      closure.sourceDerivedRecords,
    )
  ) {
    fail("RECEIPT_SOURCE_DEPENDENCY_DIGEST", "source-derived closure digest differs");
  }
  validateDependencyOrder(closure.sourceDerivedRecords, closure.orderedPaths);
  for (const count of ["duplicateVersionCount", "missingDependencyCount", "unknownDependencyCount", "cycleCount", "orderingErrorCount", "unsupportedOperationCount"]) {
    if (closure[count] !== 0) fail("RECEIPT_DEPENDENCY_FINDING", count);
  }

  const resets = receipt.isolatedResetReplayReceipts;
  if (!Array.isArray(resets) || resets.length !== 2) {
    fail("RECEIPT_RESET_COUNT", "exactly two reset/replay receipts required");
  }
  assertUnique(resets.map((reset) => reset.receiptId), "RECEIPT_RESET_ID_DUPLICATE", "reset IDs");
  assertUnique(resets.map((reset) => reset.artifactRef), "RECEIPT_RESET_ARTIFACT_DUPLICATE", "reset artifacts");
  for (let index = 0; index < resets.length; index += 1) {
    const reset = resets[index];
    assertExactKeys(reset, schema.nestedRequiredFieldsExactly.resetReplay, "RECEIPT_RESET_FIELDS", `reset[${index}]`);
    if (
      reset.cycle !== index + 1 ||
      reset.candidateHead !== head.candidateHead ||
      reset.candidateTree !== head.candidateTree ||
      reset.inventoryDigest !== inventory.inventoryDigest ||
      reset.dependencyClosureDigest !== closure.closureDigest ||
      reset.executedMigrationCount !== 26 ||
      reset.serverVersionNum !== 150008 ||
      reset.freshDatabase !== true ||
      reset.linkedRemote !== false ||
      reset.success !== true ||
      reset.cleanupComplete !== true ||
      reset.metadataOnly !== true ||
      reset.remoteMutationCount !== 0
    ) {
      fail("RECEIPT_RESET_MISMATCH", `reset[${index}]`);
    }
    const resetCopy = structuredClone(reset);
    delete resetCopy.receiptDigest;
    if (reset.receiptDigest !== domainDigest("C3R_P_ISOLATED_RESET_REPLAY_V1", resetCopy)) {
      fail("RECEIPT_RESET_DIGEST", `reset[${index}]`);
    }
  }

  const oracle = receipt.postgresOracleBinding;
  const upstreamOracle = contract.immutableUpstreamAuthority.postgresqlOracleValidatedReceipt;
  const oracleManifest = contract.immutableUpstreamAuthority.postgresqlOracleArtifacts.manifest;
  const exactOracle = {
    pullRequest: upstreamOracle.pullRequest,
    resultingMainSha: upstreamOracle.resultingMainSha,
    resultingMainTree: upstreamOracle.resultingMainTree,
    manifestGitBlob: oracleManifest.gitBlob,
    manifestSha256: oracleManifest.sha256,
    fixtureCount: upstreamOracle.fixtureCount,
    fixtureSetSha256: upstreamOracle.fixtureSetSha256,
    serverVersionNum: upstreamOracle.serverVersionNum,
    runtimeArtifactSha256: upstreamOracle.runtimeArtifactSha256,
    candidateRuntimeArtifactRef: oracle.candidateRuntimeArtifactRef,
    candidateRuntimeArtifactSha256: oracle.candidateRuntimeArtifactSha256,
  };
  if (!same(oracle, exactOracle)) fail("RECEIPT_ORACLE_BINDING", "oracle binding differs");
  if (
    typeof oracle.candidateRuntimeArtifactRef !== "string" ||
    oracle.candidateRuntimeArtifactRef.length === 0
  ) {
    fail("RECEIPT_ORACLE_CANDIDATE_ARTIFACT_REF", "candidate oracle artifact is required");
  }
  assertSha256(
    oracle.candidateRuntimeArtifactSha256,
    "RECEIPT_ORACLE_CANDIDATE_ARTIFACT_SHA",
    "candidate oracle artifact",
  );

  const finalState = receipt.finalDatabaseState;
  if (
    finalState.catalogScope !== "FULL_FRESH_DATABASE_POST_C3R_P" ||
    finalState.catalogQueryManifestSha256 !==
      contract.immutableUpstreamAuthority.postgresqlOracleArtifacts.manifest.sha256
  ) {
    fail("RECEIPT_FINAL_CATALOG_SCOPE", "full fresh-database oracle scope differs");
  }
  for (const [collection, fields, identityField] of [
    ["schemas", "schemaState", "identity"],
    ["relations", "relationState", "identity"],
    ["routines", "routineState", "identity"],
    ["policies", "policyState", "name"],
  ]) {
    if (!Array.isArray(finalState[collection]) || finalState[collection].length === 0) {
      fail("RECEIPT_FINAL_STATE_EMPTY", collection);
    }
    for (let index = 0; index < finalState[collection].length; index += 1) {
      assertExactKeys(finalState[collection][index], schema.nestedRequiredFieldsExactly[fields], "RECEIPT_FINAL_STATE_FIELDS", `${collection}[${index}]`);
    }
    assertUnique(finalState[collection].map((entry) => `${entry.relationIdentity ?? ""}:${entry[identityField]}`), "RECEIPT_FINAL_STATE_DUPLICATE", collection);
  }
  assertExactKeys(
    finalState.recordCounts,
    ["schemas", "relations", "routines", "policies"],
    "RECEIPT_FINAL_CATALOG_COUNT_FIELDS",
    "finalDatabaseState.recordCounts",
  );
  const exactRecordCounts = {
    schemas: finalState.schemas.length,
    relations: finalState.relations.length,
    routines: finalState.routines.length,
    policies: finalState.policies.length,
  };
  if (!same(finalState.recordCounts, exactRecordCounts)) {
    fail("RECEIPT_FINAL_CATALOG_COUNTS", "full catalog counts differ");
  }
  const identityClosure = {
    schemas: finalState.schemas.map((entry) => entry.identity),
    relations: finalState.relations.map((entry) => entry.identity),
    routines: finalState.routines.map((entry) => entry.identity),
    policies: finalState.policies.map(
      (entry) => `${entry.relationIdentity}::${entry.name}`,
    ),
  };
  if (
    finalState.identityClosureDigest !==
    domainDigest("C3R_P_FULL_CATALOG_IDENTITY_CLOSURE_V1", identityClosure)
  ) {
    fail("RECEIPT_FINAL_CATALOG_IDENTITY_CLOSURE", "catalog identity closure differs");
  }
  for (const relation of finalState.relations) {
    for (const field of [
      "columnClosureSha256",
      "constraintClosureSha256",
      "indexClosureSha256",
      "triggerClosureSha256",
    ]) {
      assertSha256(relation[field], "RECEIPT_FINAL_RELATION_CLOSURE_SHA", `${relation.identity}.${field}`);
    }
  }
  for (const routine of finalState.routines) {
    assertSha256(
      routine.definitionSha256,
      "RECEIPT_FINAL_ROUTINE_DEFINITION_SHA",
      routine.identity,
    );
  }
  const finalRelationIdentities = new Set(
    finalState.relations.map((relation) => normalizeSqlIdentity(relation.identity)),
  );
  for (const identity of appendSourceSemantics.createdRelations) {
    if (!finalRelationIdentities.has(identity)) {
      fail("RECEIPT_FINAL_RELATION_SOURCE_CLOSURE", identity);
    }
    const relation = finalState.relations.find(
      (candidate) => normalizeSqlIdentity(candidate.identity) === identity,
    );
    if (
      relation.owner !== "postgres" ||
      relation.rlsEnabled !== true ||
      relation.rlsForced !== true
    ) {
      fail("RECEIPT_FINAL_FORCE_RLS", `${identity} must be postgres-owned, ENABLED and FORCED`);
    }
    if (aclGrantees(relation.acl).some((grantee) => grantee !== "service_role")) {
      fail("RECEIPT_FINAL_RELATION_NON_SERVICE_ACL", identity);
    }
    const policies = finalState.policies.filter(
      (policy) => normalizeSqlIdentity(policy.relationIdentity) === identity,
    );
    if (
      policies.length === 0 ||
      policies.some((policy) => !same(policy.roles, ["service_role"]))
    ) {
      fail("RECEIPT_FINAL_RELATION_NON_SERVICE_POLICY", identity);
    }
  }
  for (const identity of appendSourceSemantics.hardenedExistingRelations) {
    if (!finalRelationIdentities.has(identity)) {
      fail("RECEIPT_FINAL_HARDENED_RELATION_MISSING", identity);
    }
    const relation = finalState.relations.find(
      (candidate) => normalizeSqlIdentity(candidate.identity) === identity,
    );
    if (relation.rlsEnabled !== true || relation.rlsForced !== true) {
      fail("RECEIPT_FINAL_FORCE_RLS", `${identity} must end ENABLED and FORCED`);
    }
  }
  const finalRoutineIdentities = finalState.routines.map((routine) =>
    normalizeSqlIdentity(routine.identity),
  );
  for (const identity of appendSourceSemantics.createdRoutines) {
    const index = finalRoutineIdentities.indexOf(identity);
    if (index < 0) {
      fail("RECEIPT_FINAL_ROUTINE_SOURCE_CLOSURE", identity);
    }
    if (
      finalState.routines[index].owner !== "postgres" ||
      !same(aclGrantees(finalState.routines[index].acl), ["service_role"])
    ) {
      fail("RECEIPT_FINAL_ROUTINE_NON_SERVICE_ACL", identity);
    }
  }
  const transitionIndex = finalRoutineIdentities.indexOf(
    appendSourceSemantics.transitionIdentity,
  );
  if (transitionIndex < 0) {
    fail(
      "RECEIPT_FINAL_TRANSITION_ROUTINE_MISSING",
      appendSourceSemantics.transitionIdentity,
    );
  }
  if (
    !same(
      aclGrantees(finalState.routines[transitionIndex].acl),
      ["authenticated"],
    )
  ) {
    fail(
      "RECEIPT_FINAL_TRANSITION_ACL",
      "transition RPC must end authenticated-only with PUBLIC and anon revoked",
    );
  }
  if (finalState.laterDisableRlsOperationCount !== 0 || finalState.laterNoForceRlsOperationCount !== 0) {
    fail("RECEIPT_LATER_RLS_WEAKENING", "later DISABLE/NO FORCE operations are forbidden");
  }
  assertExactKeys(finalState.collectionDigests, ["schemas", "relations", "routines", "policies"], "RECEIPT_COLLECTION_DIGEST_FIELDS", "collectionDigests");
  for (const [name, records] of [["schemas", finalState.schemas], ["relations", finalState.relations], ["routines", finalState.routines], ["policies", finalState.policies]]) {
    const digest = domainDigest(`C3R_P_FINAL_${name.toUpperCase()}_V1`, records);
    if (finalState.collectionDigests[name] !== digest) fail("RECEIPT_COLLECTION_DIGEST", name);
  }
  const root = domainDigest("C3R_P_FINAL_DATABASE_STATE_V1", finalState.collectionDigests);
  if (
    finalState.rootDigest !== root ||
    finalState.sourceDerivedExpectedStateDigest !== root ||
    !same(finalState.resetCycleStateDigests, [root, root])
  ) {
    fail("RECEIPT_FINAL_STATE_ROOT", "source/reset final states differ");
  }

  const a1Contract = parseJsonRejectDuplicateKeys(
    await readFile(path.join(repositoryRoot, A1_CONTRACT_PATH), "utf8"),
  );
  const practice = receipt.practiceRuntimeReceipt;
  if (
    practice.receiptType !== "C3RPracticeRuntimeEvidenceReceiptV1" ||
    practice.stage !== "C3R-P" ||
    practice.subject !== "PRACTICE" ||
    practice.candidateHead !== head.candidateHead ||
    practice.candidateTree !== head.candidateTree ||
    !Array.isArray(practice.practiceEvidenceRefs) ||
    practice.practiceEvidenceRefs.length === 0 ||
    typeof practice.browserToPostgresEvidenceRef !== "string" ||
    practice.browserToPostgresEvidenceRef.length === 0 ||
    practice.featureDefaultOff !== true ||
    practice.metadataOnly !== true ||
    practice.remoteMutationCount !== 0
  ) {
    fail("RECEIPT_PRACTICE_RUNTIME", "Practice runtime binding differs");
  }
  const expectedEvidence = [];
  for (const issue of [706, 707, 708]) {
    for (const evidenceKey of a1Contract.issueAllocation.issues[String(issue)].requiredForEachSubjectExactly) {
      expectedEvidence.push({ issue, evidenceKey });
    }
  }
  const projectedEvidence = practice.perSubjectIssueEvidence.map(({ issue, evidenceKey }) => ({ issue, evidenceKey }));
  if (!same(projectedEvidence, expectedEvidence)) {
    fail("RECEIPT_PRACTICE_ISSUE_EVIDENCE", "#706/#707/#708 coverage differs");
  }
  for (const entry of practice.perSubjectIssueEvidence) {
    assertExactKeys(entry, ["issue", "evidenceKey", "runtimeEvidenceRef"], "RECEIPT_PRACTICE_EVIDENCE_FIELDS", "practice evidence");
    if (typeof entry.runtimeEvidenceRef !== "string" || entry.runtimeEvidenceRef.length === 0) {
      fail("RECEIPT_PRACTICE_EVIDENCE_REF", entry.evidenceKey);
    }
  }
  if (practice.evidenceDigest !== domainDigest("C3R_P_PRACTICE_RUNTIME_EVIDENCE_V1", practice.perSubjectIssueEvidence)) {
    fail("RECEIPT_PRACTICE_EVIDENCE_DIGEST", "Practice evidence digest differs");
  }

  const artifacts = receipt.metadataOnlyArtifactRefs;
  if (!Array.isArray(artifacts) || artifacts.length !== 5) {
    fail("RECEIPT_ARTIFACT_COUNT", "exactly five metadata artifacts required");
  }
  for (let index = 0; index < artifacts.length; index += 1) {
    assertExactKeys(artifacts[index], schema.nestedRequiredFieldsExactly.metadataArtifact, "RECEIPT_ARTIFACT_FIELDS", `artifact[${index}]`);
    assertSha256(artifacts[index].sha256, "RECEIPT_ARTIFACT_SHA", `artifact[${index}]`);
  }
  if (!same(artifacts.map((artifact) => artifact.kind), schema.metadataArtifactKindsExactly)) {
    fail("RECEIPT_ARTIFACT_KINDS", "artifact kind closure differs");
  }
  assertUnique(artifacts.map((artifact) => artifact.ref), "RECEIPT_ARTIFACT_REF_DUPLICATE", "artifacts");
  const artifactsByKind = new Map(artifacts.map((artifact) => [artifact.kind, artifact]));
  for (let index = 0; index < resets.length; index += 1) {
    if (artifactsByKind.get(`RESET_REPLAY_${index + 1}`).ref !== resets[index].artifactRef) {
      fail("RECEIPT_RESET_ARTIFACT_CROSS_BINDING", `reset[${index}]`);
    }
  }
  if (
    artifactsByKind.get("POSTGRESQL_ORACLE").ref !==
      oracle.candidateRuntimeArtifactRef ||
    artifactsByKind.get("POSTGRESQL_ORACLE").sha256 !==
      oracle.candidateRuntimeArtifactSha256
  ) {
    fail("RECEIPT_ORACLE_ARTIFACT_CROSS_BINDING", "candidate oracle artifact differs");
  }

  const data = receipt.dataBoundary;
  if (
    data.metadataOnly !== true ||
    Object.entries(data).some(([key, value]) => key !== "metadataOnly" && value !== false)
  ) {
    fail("RECEIPT_DATA_BOUNDARY", "receipt must remain metadata-only");
  }
  if (
    receipt.cleanup.complete !== true ||
    receipt.cleanup.residualIsolatedResourceCount !== 0 ||
    receipt.cleanup.residualCredentialCount !== 0
  ) {
    fail("RECEIPT_CLEANUP", "cleanup must be complete");
  }
  assertSha256(receipt.cleanup.evidenceSha256, "RECEIPT_CLEANUP_SHA", "cleanup");
  if (Object.values(receipt.remoteContinuity).some((value) => value !== 0)) {
    fail("RECEIPT_REMOTE_MUTATION", "every remote count must be zero");
  }
  if (receipt.receiptDigest !== receiptDigest(receipt)) {
    fail("RECEIPT_DIGEST", "receipt root digest differs");
  }
  if (typeof evidenceVerifier !== "function") {
    fail(
      "RECEIPT_INDEPENDENT_EVIDENCE_VERIFIER_REQUIRED",
      "live PR/check/review and artifact contents require an independent verifier",
    );
  }
  const expectedIndependentEvidence = {
    repository: head.repository,
    pullRequest: head.pullRequest,
    baseSha: head.baseSha,
    baseTree: head.baseTree,
    candidateHead: head.candidateHead,
    candidateTree: head.candidateTree,
    currentPullRequestHead: true,
    requiredNativeChecksPassed: true,
    formalReviewActionableP0P1P2: [0, 0, 0],
    unresolvedActionableThreadCount: 0,
    resetReceiptIds: resets.map((reset) => reset.receiptId),
    metadataArtifacts: artifacts.map(({ kind, ref, sha256: artifactSha256 }) => ({
      kind,
      ref,
      sha256: artifactSha256,
    })),
    finalDatabaseStateRootDigest: finalState.rootDigest,
    practiceRuntimeEvidenceDigest: practice.evidenceDigest,
    postgresOracleCandidateArtifactSha256:
      oracle.candidateRuntimeArtifactSha256,
    fullCanonicalCatalogValidated: true,
    catalogScope: finalState.catalogScope,
    catalogQueryManifestSha256: finalState.catalogQueryManifestSha256,
    catalogRecordCounts: finalState.recordCounts,
    catalogIdentityClosureDigest: finalState.identityClosureDigest,
    fullCatalog: {
      artifactRef: artifactsByKind.get("FINAL_DATABASE_STATE").ref,
      artifactSha256: artifactsByKind.get("FINAL_DATABASE_STATE").sha256,
      catalogScope: finalState.catalogScope,
      catalogQueryManifestSha256: finalState.catalogQueryManifestSha256,
      schemas: finalState.schemas,
      relations: finalState.relations,
      routines: finalState.routines,
      policies: finalState.policies,
    },
    remoteMutationCount: 0,
  };
  const independentlyVerified = await evidenceVerifier({
    receipt: structuredClone(receipt),
    contract: structuredClone(contract),
    repositoryRoot,
  });
  if (!same(independentlyVerified, expectedIndependentEvidence)) {
    fail(
      "RECEIPT_INDEPENDENT_EVIDENCE_MISMATCH",
      "live PR/check/review or artifact verification differs",
    );
  }
  return {
    receiptType: receipt.receiptType,
    authorityPullRequest: receipt.authorityMergeReceipt.authorityPullRequest,
    authorityResultingMainSha: receipt.authorityMergeReceipt.resultingMainSha,
    existingPathOperationCount: receipt.existingPathOperations.length,
    unchangedPathCount: unchanged.count,
    effectiveMigrationCount: inventory.count,
    resetReplayCount: resets.length,
    serverVersionNum: oracle.serverVersionNum,
    remoteMutationCount: receipt.remoteContinuity.totalRemoteMutationCount,
  };
}

async function main() {
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
  );
  const source = await readFile(path.join(repositoryRoot, CONTRACT_PATH), "utf8");
  const contract = parseJsonRejectDuplicateKeys(source);
  const summary = await validateAuthorityContract(contract, { repositoryRoot });
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error}\n`);
    process.exitCode = 1;
  });
}

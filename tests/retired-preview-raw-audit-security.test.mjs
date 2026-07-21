import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, relative } from "node:path";
import test from "node:test";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const currentTestPath = fileURLToPath(import.meta.url);
const retiredRouteSlug = ["visual", "source", "audit"].join("-");
const retiredApiPath = ["", "api", "os", retiredRouteSlug].join("/");
const retiredHeader = ["x", "s232h2", "audit", "sha"].join("-");

const retiredPaths = [
  ["app", "api", "os", retiredRouteSlug, "route.ts"],
  [".github", "workflows", "s232h2-runtime.yml"],
  ["lib", "review-os", "read-only-request.ts"],
  ["scripts", "s232h2-ephemeral-accounts.ts"],
  ["scripts", "support", "s232h2-exact-fixture.ts"],
  ["scripts", "support", "s232h2-preview-response.mjs"],
  ["tests", "e2e", "s232h2-production-v3-visual.spec.ts"],
  ["tests", "e2e", "s232h2-production-v3-visual.spec.ts-snapshots"],
  ["tests", "e2e", "support", "historical-synthetic-fixtures.ts"],
  ["tests", "s232h2-historical-synthetic-fixtures.test.mjs"],
  ["tests", "s232h2-production-v3-visual-contract.test.mjs"],
];

const rawLearnerTables = [
  "wrong_answer_items",
  "wrong_answer_notes",
  "wrong_answer_tags",
  "recurrence_features",
  "review_queue_items",
  "study_logs",
  "weekly_learning_summaries",
  "learning_signal_events",
  "usage_events",
  "action_seeds",
  "study_profiles",
  "personal_concept_nodes",
];

function collectFiles(root, predicate) {
  if (!existsSync(root)) return [];
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolutePath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath, predicate));
    } else if (predicate(absolutePath)) {
      files.push(absolutePath);
    }
  }
  return files;
}

function repoPath(absolutePath) {
  return relative(repoRoot, absolutePath).replaceAll("\\", "/");
}

test("the completed Preview raw-audit surface and exclusive harness are absent", () => {
  const remaining = retiredPaths
    .map((segments) => join(repoRoot, ...segments))
    .filter((path) => existsSync(path))
    .map(repoPath);

  assert.deepEqual(remaining, []);
});

test("no executable source retains the retired route or discoverable-SHA request mode", () => {
  const roots = [".github", "app", "components", "lib", "scripts", "tests"];
  const sourceFiles = roots.flatMap((root) =>
    collectFiles(join(repoRoot, root), (path) =>
      /\.(?:js|mjs|ts|tsx|json|ya?ml)$/.test(path),
    ),
  );
  const markers = [
    retiredApiPath,
    retiredHeader,
    "isPreviewExactShaReadOnlyRequest",
    "S232H2_PREVIEW_SOURCE_" + "AUDIT",
    "reviewOsRepository." + "readAccess(",
  ];
  const matches = [];

  for (const sourceFile of sourceFiles) {
    if (sourceFile === currentTestPath) continue;
    const source = readFileSync(sourceFile, "utf8");
    const found = markers.filter((marker) => source.includes(marker));
    if (found.length > 0) matches.push({ file: repoPath(sourceFile), found });
  }

  assert.deepEqual(matches, []);
});

test("no API route exposes wildcard rows from learner-owned raw tables", () => {
  const apiRoutes = collectFiles(
    join(repoRoot, "app", "api"),
    (path) => path.endsWith("route.ts"),
  );
  const broadSelectPattern = /\.select\(\s*["'`]\*["'`]\s*\)/;
  const violations = [];

  for (const route of apiRoutes) {
    const source = readFileSync(route, "utf8");
    if (!broadSelectPattern.test(source)) continue;
    const tables = rawLearnerTables.filter((table) =>
      new RegExp(`\\.from\\(\\s*["'\`]${table}["'\`]\\s*\\)`).test(source),
    );
    if (tables.length > 0) {
      violations.push({ file: repoPath(route), tables });
    }
  }

  assert.deepEqual(violations, []);
});

test("the shared Preview runtime-version route remains metadata-only", () => {
  const runtimeVersionPath = join(
    repoRoot,
    "app",
    "api",
    "runtime",
    "version",
    "route.ts",
  );
  assert.equal(existsSync(runtimeVersionPath), true);

  const source = readFileSync(runtimeVersionPath, "utf8");
  assert.match(source, /process\.env\.VERCEL_ENV\s*!==\s*"preview"/);
  assert.match(source, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(source, /\{\s*ready:\s*true,\s*deploymentSha\s*\}/);
  assert.doesNotMatch(source, /createSupabase|\.from\(|\.select\(|sessionUser/);
  for (const table of rawLearnerTables) assert.equal(source.includes(table), false);
});

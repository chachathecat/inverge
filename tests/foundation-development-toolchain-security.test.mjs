import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { transformSync } from "@babel/core";
import yaml from "js-yaml";

const CONTRACT = "config/foundation-development-toolchain-security-v1.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function findPackageInstallations(packages, packageName) {
  const suffix = `/node_modules/${packageName}`;
  return Object.entries(packages).filter(
    ([path]) => path === `node_modules/${packageName}` || path.endsWith(suffix),
  );
}

test("pins the compatible development-toolchain security releases", async () => {
  const packageJson = await readJson("package.json");
  const packages = (await readJson("package-lock.json")).packages;

  assert.equal(packageJson.devDependencies["@playwright/test"], "^1.62.1");
  assert.equal(packageJson.devDependencies.supabase, "^2.114.0");
  assert.equal(packageJson.devDependencies.eslint, "^9.39.5");
  assert.equal(packageJson.devDependencies["eslint-config-next"], "16.3.3");
  assert.equal(packages["node_modules/@playwright/test"].version, "1.62.1");
  assert.equal(packages["node_modules/playwright"].version, "1.62.1");
  assert.equal(packages["node_modules/supabase"].version, "2.114.0");
  assert.equal(packages["node_modules/eslint"].version, "9.39.5");
  assert.equal(packages["node_modules/eslint-config-next"].version, "16.3.3");
  assert.equal(packages["node_modules/typescript"].version, "5.9.3");
});

test("removes tar and resolves compatible transitive lint advisories", async () => {
  const packages = (await readJson("package-lock.json")).packages;
  const contract = await readJson(CONTRACT);
  assert.deepEqual(findPackageInstallations(packages, "tar"), []);
  assert.equal(packages["node_modules/brace-expansion"].version, "1.1.18");
  assert.equal(
    packages["node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion"].version,
    "5.0.9",
  );
  assert.equal(packages["node_modules/js-yaml"].version, "4.3.2");
  assert.equal(packages["node_modules/typescript-eslint"].version, "8.67.0");
  assert.deepEqual(contract.supabase_tar_requirement, {
    campaign_minimum: ">=7.5.19",
    live_advisory_safe_floor: ">7.5.20",
    selected_resolution: "tar_not_installed",
    rationale:
      "The current stable Supabase CLI removed tar from its dependency graph, which is stricter than retaining any tar version and resolves the newer live advisory through 7.5.20.",
  });
});

test("rejects relocated tar installations anywhere in the lock graph", () => {
  const packages = {
    "node_modules/tool/node_modules/tar": { dev: true },
    "node_modules/not-tar": { dev: true },
  };
  assert.deepEqual(
    findPackageInstallations(packages, "tar").map(([path]) => path),
    ["node_modules/tool/node_modules/tar"],
  );
});

test("patched js-yaml counts empty merge mappings against its work budget", () => {
  const synthetic = "x: &x [{}, {}, {}, {}]\na:\n  <<: *x\n";
  assert.throws(() => yaml.load(synthetic, { maxTotalMergeKeys: 3 }), /maxTotalMergeKeys/);
  assert.deepEqual(yaml.load(synthetic, { maxTotalMergeKeys: 4 }).a, {});
});

test("records every resolved Phase D advisory exactly once", async () => {
  const contract = await readJson(CONTRACT);
  const findings = contract.resolved_findings;
  assert.equal(findings.length, 15);
  assert.equal(new Set(findings.map((finding) => finding.ghsa)).size, 15);

  for (const finding of findings) {
    assert.match(finding.ghsa, /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
    assert.equal(finding.classification, "development");
    assert.ok(finding.dependency_paths.length > 0);
    for (const field of [
      "package",
      "severity",
      "directness",
      "runtime_reachability",
      "attacker_controlled_input_path",
      "patched_version",
      "resolution",
    ]) {
      assert.equal(typeof finding[field], "string", `${finding.ghsa}:${field}`);
      assert.ok(finding[field].length > 0, `${finding.ghsa}:${field}`);
    }
  }
});

test("resolves the expired Babel exception with a compatible patched lock graph", async () => {
  const contract = await readJson(CONTRACT);
  assert.deepEqual(contract.final_audit_counts, {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 0,
    total: 0,
  });
  assert.deepEqual(contract.residual_exceptions, []);
  const installations = findPackageInstallations((await readJson("package-lock.json")).packages, "@babel/core");
  assert.ok(installations.length > 0);
  for (const [path, entry] of installations) {
    assert.equal(entry.version, "7.29.7", path);
    assert.equal(entry.dev, true, path);
  }
  const finding = contract.resolved_findings.find((item) => item.ghsa === "GHSA-4x5r-pxfx-6jf8");
  assert.equal(finding.patched_version, "7.29.6");
  assert.equal(contract.resolved_toolchain.babel_core, "7.29.7");
});

test("forbids runtime, live Supabase, migration, and browser-install side effects", async () => {
  const contract = await readJson(CONTRACT);
  assert.deepEqual(contract.acceptance, {
    development_critical: 0,
    development_high: 0,
    development_moderate: 0,
    development_low: 0,
    production_runtime_behavior_changed: false,
    production_migration_run: false,
    live_supabase_command_run: false,
    browser_installation_run: false,
  });
  assert.deepEqual(contract.required_verification, [
    "npm.cmd ci",
    "npm.cmd audit",
    "npx.cmd supabase --version",
    "npx.cmd playwright test --list",
    "npm.cmd run typecheck",
    "npm.cmd run lint",
    "npm.cmd test",
    "npm.cmd run build",
  ]);
});

test("Babel preserves in-package maps but does not disclose an external source map", async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), "inverge-babel-map-"));
  try {
    const root = path.join(fixture, "package");
    await mkdir(root);
    await writeFile(path.join(root, "package.json"), "{}");
    const marker = "SYNTHETIC_EXTERNAL_MAP_CONTENT";
    const map = JSON.stringify({ version: 3, sources: ["original.js"], sourcesContent: [marker], names: [], mappings: "AAAA" });
    await writeFile(path.join(fixture, "external.map"), map);
    await writeFile(path.join(root, "allowed.map"), map);
    const options = { filename: path.join(root, "input.js"), root, configFile: false, babelrc: false, sourceMaps: true };
    const allowed = transformSync("const value = 1;\n//# sourceMappingURL=allowed.map", options);
    assert.ok(allowed.map.sourcesContent.includes(marker));
    const external = transformSync("const value = 1;\n//# sourceMappingURL=../external.map", options);
    assert.ok(!external.map.sourcesContent.includes(marker));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const CONTRACT = "config/foundation-development-toolchain-security-v1.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

test("pins the compatible development-toolchain security releases", async () => {
  const packageJson = await readJson("package.json");
  const packages = (await readJson("package-lock.json")).packages;

  assert.equal(packageJson.devDependencies["@playwright/test"], "^1.62.1");
  assert.equal(packageJson.devDependencies.supabase, "^2.114.0");
  assert.equal(packageJson.devDependencies.eslint, "^9.39.5");
  assert.equal(packageJson.devDependencies["eslint-config-next"], "16.2.12");
  assert.equal(packages["node_modules/@playwright/test"].version, "1.62.1");
  assert.equal(packages["node_modules/playwright"].version, "1.62.1");
  assert.equal(packages["node_modules/supabase"].version, "2.114.0");
  assert.equal(packages["node_modules/eslint"].version, "9.39.5");
  assert.equal(packages["node_modules/eslint-config-next"].version, "16.2.12");
  assert.equal(packages["node_modules/typescript"].version, "5.9.3");
});

test("removes tar and resolves compatible transitive lint advisories", async () => {
  const packages = (await readJson("package-lock.json")).packages;
  const contract = await readJson(CONTRACT);
  assert.equal(packages["node_modules/tar"], undefined);
  assert.equal(packages["node_modules/brace-expansion"].version, "1.1.18");
  assert.equal(
    packages["node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion"].version,
    "5.0.9",
  );
  assert.equal(packages["node_modules/js-yaml"].version, "4.3.1");
  assert.equal(packages["node_modules/typescript-eslint"].version, "8.67.0");
  assert.deepEqual(contract.supabase_tar_requirement, {
    campaign_minimum: ">=7.5.19",
    live_advisory_safe_floor: ">7.5.20",
    selected_resolution: "tar_not_installed",
    rationale:
      "The current stable Supabase CLI removed tar from its dependency graph, which is stricter than retaining any tar version and resolves the newer live advisory through 7.5.20.",
  });
});

test("records every resolved Phase D advisory exactly once", async () => {
  const contract = await readJson(CONTRACT);
  const findings = contract.resolved_findings;
  assert.equal(findings.length, 14);
  assert.equal(new Set(findings.map((finding) => finding.ghsa)).size, 14);

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

test("bounds the sole low residual and leaves no critical, high, or moderate", async () => {
  const contract = await readJson(CONTRACT);
  assert.deepEqual(contract.final_audit_counts, {
    critical: 0,
    high: 0,
    moderate: 0,
    low: 1,
    total: 1,
  });
  assert.equal(contract.residual_exceptions.length, 1);
  const [exception] = contract.residual_exceptions;
  assert.equal(exception.ghsa, "GHSA-4x5r-pxfx-6jf8");
  assert.equal(exception.severity, "low");
  assert.equal(exception.owner, "repository_owner");
  assert.match(exception.patched_version, /breaking major/);
  assert.ok(exception.rationale.length > 0);
  assert.ok(exception.compensating_control.length > 0);

  const evaluatedAt = Date.parse(contract.evaluated_at);
  const expiresAt = Date.parse(exception.expires_at);
  assert.ok(expiresAt > evaluatedAt);
  assert.ok(expiresAt - evaluatedAt <= 30 * 24 * 60 * 60 * 1000);
  assert.ok(
    expiresAt > Date.now(),
    `${exception.ghsa} exception expired at ${exception.expires_at}`,
  );
});

test("forbids runtime, live Supabase, migration, and browser-install side effects", async () => {
  const contract = await readJson(CONTRACT);
  assert.deepEqual(contract.acceptance, {
    development_critical: 0,
    development_high: 0,
    development_moderate: 0,
    development_low: 1,
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

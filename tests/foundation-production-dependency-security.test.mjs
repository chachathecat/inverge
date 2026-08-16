import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import sharp from "sharp";

const CONTRACT =
  "config/foundation-production-dependency-security-v1.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function versionParts(version) {
  return version.split(".").map((part) => Number.parseInt(part, 10));
}

function assertVersionAtLeast(actual, minimum, label) {
  const actualParts = versionParts(actual);
  const minimumParts = versionParts(minimum);
  for (let index = 0; index < 3; index += 1) {
    if (actualParts[index] > minimumParts[index]) return;
    if (actualParts[index] < minimumParts[index]) {
      assert.fail(`${label} ${actual} must be at least ${minimum}`);
    }
  }
}

function assertFindingShape(finding) {
  for (const field of [
    "ghsa",
    "package",
    "classification",
    "directness",
    "runtime_reachability",
    "attacker_controlled_input_path",
    "patched_version",
    "resolution",
  ]) {
    assert.equal(typeof finding[field], "string", `${finding.ghsa}:${field}`);
    assert.ok(finding[field].length > 0, `${finding.ghsa}:${field}`);
  }
  assert.match(finding.ghsa, /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
  assert.ok(
    finding.cve === null ||
      typeof finding.cve === "string" ||
      (Array.isArray(finding.cve) && finding.cve.length > 0),
    `${finding.ghsa}:cve`,
  );
  assert.ok(Array.isArray(finding.dependency_paths));
  assert.ok(finding.dependency_paths.length > 0);
  assert.ok(finding.dependency_paths.every((path) => typeof path === "string"));
}

test("pins the patched production dependency graph", async () => {
  const packageJson = await readJson("package.json");
  const lock = await readJson("package-lock.json");

  assert.equal(packageJson.dependencies.next, "16.2.12");
  assert.deepEqual(packageJson.overrides, {
    next: {
      postcss: "8.5.26",
      sharp: "0.35.3",
    },
  });

  const packages = lock.packages;
  assert.equal(packages["node_modules/next"].version, "16.2.12");
  assertVersionAtLeast(packages["node_modules/postcss"].version, "8.5.23", "postcss");
  assertVersionAtLeast(packages["node_modules/nanoid"].version, "3.3.18", "nanoid");
  assertVersionAtLeast(packages["node_modules/sharp"].version, "0.35.0", "sharp");
  assertVersionAtLeast(packages["node_modules/ws"].version, "8.21.0", "ws");

  assert.notEqual(packages["node_modules/next"].dev, true);
  assert.notEqual(packages["node_modules/postcss"].dev, true);
  assert.notEqual(packages["node_modules/nanoid"].dev, true);
  assert.notEqual(packages["node_modules/sharp"].dev, true);
  assert.notEqual(packages["node_modules/ws"].dev, true);
});

test("records every production advisory with exact resolution evidence", async () => {
  const contract = await readJson(CONTRACT);
  const findings = contract.resolved_production_findings;

  assert.equal(findings.length, 31);
  findings.forEach(assertFindingShape);
  assert.ok(findings.every((finding) => finding.classification === "production"));
  assert.equal(new Set(findings.map((finding) => finding.ghsa)).size, findings.length);

  const packages = new Set(findings.map((finding) => finding.package));
  assert.deepEqual(
    [...packages].sort(),
    ["nanoid", "next", "postcss", "sharp", "ws"],
  );
  assert.ok(
    findings.some((finding) =>
      finding.runtime_reachability.startsWith("reachable:"),
    ),
  );
  assert.ok(
    findings.some((finding) =>
      finding.runtime_reachability.startsWith("not currently reachable:"),
    ),
  );
});

test("bounds every residual dev-only exception to less than thirty days", async () => {
  const contract = await readJson(CONTRACT);
  const evaluatedAt = Date.parse(contract.evaluated_at);
  const exceptions = contract.residual_dev_exceptions;

  assert.equal(exceptions.length, 15);
  assert.equal(new Set(exceptions.map((finding) => finding.ghsa)).size, 15);

  for (const exception of exceptions) {
    assertFindingShape(exception);
    assert.equal(exception.classification, "development");
    if (exception.package === "playwright") {
      assert.match(exception.runtime_reachability, /^installed only as Next's optional peer/);
    } else {
      assert.match(exception.runtime_reachability, /^not installed in production/);
    }
    assert.equal(exception.owner, "repository_owner");
    assert.ok(exception.rationale.length > 0);
    assert.ok(exception.compensating_control.length > 0);
    const expiresAt = Date.parse(exception.expires_at);
    assert.ok(expiresAt > evaluatedAt);
    assert.ok(expiresAt - evaluatedAt <= 30 * 24 * 60 * 60 * 1000);
  }

  const overlap = exceptions.filter((exception) =>
    contract.resolved_production_findings.some(
      (finding) => finding.ghsa === exception.ghsa,
    ),
  );
  assert.deepEqual(overlap, []);
});

test("keeps every still-installed Phase C residual dev-only or dev-optional", async () => {
  const lock = await readJson("package-lock.json");
  for (const path of [
    "node_modules/@babel/core",
    "node_modules/@playwright/test",
    "node_modules/playwright",
    "node_modules/brace-expansion",
    "node_modules/@typescript-eslint/typescript-estree/node_modules/brace-expansion",
    "node_modules/js-yaml",
    "node_modules/supabase",
    "node_modules/tar",
  ]) {
    const entry = lock.packages[path];
    if (entry === undefined) continue;
    assert.equal(entry.dev === true || entry.devOptional === true, true, path);
  }
});

test("requires full compatibility and rollback proof for both bounded overrides", async () => {
  const contract = await readJson(CONTRACT);
  const packageJson = await readJson("package.json");
  assert.deepEqual(Object.keys(contract.override_proof).sort(), ["postcss", "sharp"]);

  for (const proof of Object.values(contract.override_proof)) {
    assert.ok(proof.requested_by.length > 0);
    assert.ok(proof.selected.length > 0);
    assert.ok(proof.upstream_compatibility.length > 0);
    for (const required of ["clean npm ci", "full tests", "build", "rollback by reverting this PR"]) {
      assert.ok(proof.required_verification.includes(required), required);
    }
  }

  assert.deepEqual(contract.acceptance, {
    reachable_production_critical: 0,
    reachable_production_high: 0,
    applicable_authentication_or_proxy_advisories: 0,
    applicable_untrusted_image_sharp_advisories: 0,
    development_findings_deferred_to_phase_d: true,
  });
  assert.deepEqual(contract.production_install_proof, {
    command: "npm.cmd ci --omit=dev --ignore-scripts",
    resolved_versions: {
      next: "16.2.12",
      postcss: "8.5.26",
      nanoid: "3.3.18",
      sharp: "0.35.3",
      ws: "8.21.3",
    },
    playwright_optional_peer_present: true,
    playwright_app_runtime_imported: false,
    playwright_browser_download_in_build_or_start: false,
  });
  assert.doesNotMatch(packageJson.scripts.build, /playwright/i);
  assert.doesNotMatch(packageJson.scripts.start, /playwright/i);
});

test("loads the patched Sharp/libvips runtime and decodes bounded image metadata", async () => {
  assertVersionAtLeast(sharp.versions.sharp, "0.35.0", "sharp runtime");
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"><rect width="2" height="3"/></svg>',
  );
  const metadata = await sharp(svg, { limitInputPixels: 16 }).metadata();
  assert.equal(metadata.width, 2);
  assert.equal(metadata.height, 3);
  assert.equal(metadata.format, "svg");
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateSecurityAudits,
  validateSecuritySbom,
} from "../scripts/validate-security-audit.mjs";

const POLICY_PATH = "config/foundation-continuous-security-automation-v1.json";
const TEST_NOW = Date.parse("2026-08-16T08:45:00Z");

async function read(path) {
  return readFile(path, "utf8");
}

async function readJson(path) {
  return JSON.parse(await read(path));
}

function emptyCounts() {
  return { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
}

function auditReport(advisories = []) {
  const vulnerabilities = {};
  for (const advisory of advisories) {
    const entry = vulnerabilities[advisory.package] ?? {
      name: advisory.package,
      severity: advisory.severity,
      via: [],
      effects: [],
      range: "*",
      nodes: [`node_modules/${advisory.package}`],
      fixAvailable: false,
    };
    entry.via.push({
      source: advisory.source ?? entry.via.length + 1,
      name: advisory.id,
      dependency: advisory.package,
      title: advisory.title ?? advisory.id,
      url: `https://github.com/advisories/${advisory.id}`,
      severity: advisory.severity,
      range: "*",
    });
    const severityOrder = ["info", "low", "moderate", "high", "critical"];
    if (severityOrder.indexOf(advisory.severity) > severityOrder.indexOf(entry.severity)) {
      entry.severity = advisory.severity;
    }
    vulnerabilities[advisory.package] = entry;
  }

  const counts = emptyCounts();
  for (const vulnerability of Object.values(vulnerabilities)) {
    counts[vulnerability.severity] += 1;
    counts.total += 1;
  }
  return {
    auditReportVersion: 2,
    vulnerabilities,
    metadata: {
      vulnerabilities: counts,
      dependencies: { prod: 1, dev: 1, optional: 0, peer: 0, peerOptional: 0, total: 2 },
    },
  };
}

function advisory(overrides = {}) {
  return {
    id: "GHSA-1111-2222-3333",
    package: "fixture-package",
    severity: "low",
    ...overrides,
  };
}

function activeException(finding, overrides = {}) {
  return {
    advisory_id: finding.id,
    package: finding.package,
    environment: "development",
    severity: finding.severity,
    runtime_reachability: "unreachable",
    attacker_controlled_input_path: "repository-controlled test input only",
    approved_by: "repository_owner",
    approved_at: "2026-08-16T08:00:00Z",
    expires_at: "2026-08-30T08:00:00Z",
    rationale: "bounded compatibility exception",
    compensating_controls: ["run only in isolated CI against reviewed repository source"],
    source_contract: POLICY_PATH,
    ...overrides,
  };
}

test("accepts the current low development advisory through its active bounded exception", async () => {
  const policy = await readJson(POLICY_PATH);
  const finding = advisory({
    id: "GHSA-4X5R-PXFX-6JF8",
    package: "@babel/core",
  });
  const summary = validateSecurityAudits({
    productionReport: auditReport(),
    fullReport: auditReport([finding]),
    policy,
    now: TEST_NOW,
  });
  assert.equal(summary.blocking_finding_count, 0);
  assert.deepEqual(summary.decisions, [
    {
      advisory_id: finding.id,
      package: finding.package,
      severity: "low",
      detected_environment: "development",
      approved_environment: "development",
      runtime_reachability: "unreachable",
      exception_expires_at: "2026-09-14T23:59:59Z",
      outcome: "reported_active_exception",
    },
  ]);
});

test("reports new low and moderate advisories without universally blocking warnings", async () => {
  const policy = structuredClone(await readJson(POLICY_PATH));
  policy.exceptions = [];
  const findings = [
    advisory({ id: "GHSA-AAAA-BBBB-CCCC", severity: "low" }),
    advisory({ id: "GHSA-DDDD-EEEE-FFFF", package: "moderate-fixture", severity: "moderate" }),
  ];
  const summary = validateSecurityAudits({
    productionReport: auditReport(),
    fullReport: auditReport(findings),
    policy,
    now: TEST_NOW,
  });
  assert.equal(summary.decisions.length, 2);
  assert.ok(summary.decisions.every((decision) => decision.outcome === "reported_non_blocking"));
});

test("fails every expired or overlong advisory exception", async () => {
  const policy = structuredClone(await readJson(POLICY_PATH));
  policy.exceptions[0].expires_at = "2026-08-16T08:44:59Z";
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: auditReport(),
        policy,
        now: TEST_NOW,
      }),
    /exception expired/,
  );

  policy.exceptions[0].approved_at = "2026-08-01T00:00:00Z";
  policy.exceptions[0].expires_at = "2026-09-01T00:00:01Z";
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: auditReport(),
        policy,
        now: TEST_NOW,
      }),
    /maximum exception duration/,
  );

  policy.exceptions[0].approved_at = "2026-08-16T08:45:01Z";
  policy.exceptions[0].expires_at = "2026-08-30T08:45:01Z";
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: auditReport(),
        policy,
        now: TEST_NOW,
      }),
    /approval is in the future/,
  );
});

test("rejects duplicated or widened closed exception schema members", async () => {
  const policy = structuredClone(await readJson(POLICY_PATH));
  policy.exception_schema.allowed_environments = ["development", "development"];
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: auditReport(),
        policy,
        now: TEST_NOW,
      }),
    /exception environments are not closed/,
  );
});

test("fails new unapproved production and development high or critical advisories", async () => {
  const policy = structuredClone(await readJson(POLICY_PATH));
  policy.exceptions = [];
  for (const severity of ["high", "critical"]) {
    const finding = advisory({ severity });
    const report = auditReport([finding]);
    assert.throws(
      () =>
        validateSecurityAudits({
          productionReport: report,
          fullReport: report,
          policy,
          now: TEST_NOW,
        }),
      new RegExp(`unapproved production ${severity}`),
    );
    assert.throws(
      () =>
        validateSecurityAudits({
          productionReport: auditReport(),
          fullReport: report,
          policy,
          now: TEST_NOW,
        }),
      new RegExp(`unapproved development ${severity}`),
    );
  }
});

test("accepts an exact active high exception only with explicit environment and reachability", async () => {
  const policy = structuredClone(await readJson(POLICY_PATH));
  const finding = advisory({ severity: "high" });
  policy.exceptions = [
    activeException(finding, {
      environment: "production",
      runtime_reachability: "limited",
    }),
  ];
  const report = auditReport([finding]);
  const summary = validateSecurityAudits({
    productionReport: report,
    fullReport: report,
    policy,
    now: TEST_NOW,
  });
  assert.equal(summary.decisions[0].outcome, "accepted_active_exception");
  assert.equal(summary.decisions[0].approved_environment, "production");

  policy.exceptions[0].runtime_reachability = "unknown";
  assert.throws(
    () =>
      validateSecurityAudits({ productionReport: report, fullReport: report, policy, now: TEST_NOW }),
    /unknown reachability/,
  );
});

test("rejects severity drift, duplicate exceptions, and contradictory production classification", async () => {
  const policy = structuredClone(await readJson(POLICY_PATH));
  const finding = advisory({ severity: "high" });
  const report = auditReport([finding]);
  policy.exceptions = [activeException(finding, { severity: "low" })];
  assert.throws(
    () =>
      validateSecurityAudits({ productionReport: auditReport(), fullReport: report, policy, now: TEST_NOW }),
    /severity changed/,
  );

  policy.exceptions = [activeException(finding), activeException(finding)];
  assert.throws(
    () =>
      validateSecurityAudits({ productionReport: auditReport(), fullReport: report, policy, now: TEST_NOW }),
    /duplicate exception/,
  );

  for (const runtime_reachability of ["reachable", "limited", "unreachable"]) {
    policy.exceptions = [
      activeException(finding, {
        environment: "development",
        runtime_reachability,
      }),
    ];
    assert.throws(
      () =>
        validateSecurityAudits({ productionReport: report, fullReport: report, policy, now: TEST_NOW }),
      /contradictory development classification for a production finding/,
    );
  }

  policy.exceptions = [
    activeException(finding, {
      environment: "production",
      runtime_reachability: "limited",
    }),
  ];
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: report,
        policy,
        now: TEST_NOW,
      }),
    /contradictory production classification for a development-only finding/,
  );

  policy.exceptions = [activeException(finding, { approved_by: "automation" })];
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: report,
        policy,
        now: TEST_NOW,
      }),
    /unauthorized approver/,
  );
});

test("fails closed on malformed or inconsistent npm audit reports", async () => {
  const policy = await readJson(POLICY_PATH);
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: { error: { code: "EAUDITENDPOINT" } },
        fullReport: auditReport(),
        policy,
        now: TEST_NOW,
      }),
    /auditReportVersion/,
  );

  const productionOnly = advisory({ id: "GHSA-AAAA-BBBB-CCCC" });
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport([productionOnly]),
        fullReport: auditReport(),
        policy,
        now: TEST_NOW,
      }),
    /production finding is missing from the full audit/,
  );

  const highProduction = auditReport([advisory({ severity: "high" })]);
  const lowFull = auditReport([advisory({ severity: "low" })]);
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: highProduction,
        fullReport: lowFull,
        policy,
        now: TEST_NOW,
      }),
    /production\/full audit severity mismatch/,
  );

  const mismatchedCounts = auditReport();
  mismatchedCounts.metadata.vulnerabilities.total = 1;
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: mismatchedCounts,
        policy,
        now: TEST_NOW,
      }),
    /metadata count mismatch for total/,
  );

  const dangling = auditReport();
  dangling.vulnerabilities.wrapper = {
    name: "wrapper",
    severity: "high",
    via: ["missing-package"],
    effects: [],
    range: "*",
    nodes: ["node_modules/wrapper"],
    fixAvailable: false,
  };
  dangling.metadata.vulnerabilities.high = 1;
  dangling.metadata.vulnerabilities.total = 1;
  assert.throws(
    () =>
      validateSecurityAudits({
        productionReport: auditReport(),
        fullReport: dangling,
        policy,
        now: TEST_NOW,
      }),
    /dangling via reference/,
  );
});

test("validates CycloneDX package metadata and rejects secret-like artifact content", () => {
  const packageJson = { name: "exam-coach", version: "0.1.0" };
  const sbom = {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    metadata: {
      component: {
        "bom-ref": "exam-coach@0.1.0",
        type: "application",
        name: "inverge",
        version: "0.1.0",
        purl: "pkg:npm/exam-coach@0.1.0",
      },
    },
    components: [{ type: "library", name: "fixture", version: "1.0.0" }],
  };
  assert.deepEqual(validateSecuritySbom({ sbom, packageJson }), {
    format: "CycloneDX",
    spec_version: "1.5",
    component_count: 1,
  });

  const secretBearing = structuredClone(sbom);
  secretBearing.metadata.access_token = "fixture";
  assert.throws(() => validateSecuritySbom({ sbom: secretBearing, packageJson }), /secret-bearing SBOM key/);
});

test("installs weekly grouped Dependabot updates for npm and GitHub Actions", async () => {
  const dependabot = await read(".github/dependabot.yml");
  assert.match(dependabot, /version:\s*2/);
  assert.match(dependabot, /package-ecosystem:\s*npm[\s\S]*interval:\s*weekly/);
  assert.match(dependabot, /npm-production:[\s\S]*dependency-type:\s*production/);
  assert.match(dependabot, /npm-development:[\s\S]*dependency-type:\s*development/);
  assert.match(dependabot, /package-ecosystem:\s*github-actions[\s\S]*github-actions:[\s\S]*patterns:/);
});

test("runs a least-privilege report-only audit and package-lock-only SBOM workflow", async () => {
  const workflow = await read(".github/workflows/security.yml");
  assert.match(workflow, /name:\s*security-audit-sbom/);
  assert.match(workflow, /permissions:\s*\r?\n\s+contents:\s*read/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /push:[\s\S]*branches:\s*\[main\]/);
  assert.match(workflow, /schedule:[\s\S]*cron:/);
  assert.match(workflow, /npm audit --package-lock-only --omit=dev --json/);
  assert.match(workflow, /npm audit --package-lock-only --json/);
  assert.match(workflow, /npm sbom --package-lock-only --sbom-format cyclonedx --sbom-type application/);
  assert.match(workflow, /security-summary-v1\.json/);
  assert.match(workflow, /sbom\.cdx\.json/);
  assert.doesNotMatch(workflow, /audit (?:fix|fix --force)/);
  const uploadStep = workflow.split("- name: Upload metadata-only security evidence")[1];
  assert.ok(uploadStep);
  assert.doesNotMatch(uploadStep, /audit\.json/);
  assert.doesNotMatch(workflow, /\$\{\{\s*secrets\./);
});

test("keeps Phase E metadata-only and preserves the current product authority tuple", async () => {
  const policy = await readJson(POLICY_PATH);
  const roadmap = await read("roadmap/active-program.yml");
  assert.deepEqual(policy.acceptance, {
    new_unapproved_production_high_or_critical_blocks: true,
    new_unapproved_development_high_or_critical_blocks: true,
    expired_exception_blocks: true,
    all_audit_warnings_universally_block: false,
    runtime_or_production_behavior_changed: false,
    live_service_called: false,
    dependency_graph_changed: false,
  });
  assert.match(roadmap, /soleNextImplementationItem:\s*WCV-C2/);
  assert.match(roadmap, /currentReplacementStage:\s*C2R-C-T/);
  assert.match(roadmap, /currentReplacementStageIssue:\s*703/);
  assert.match(roadmap, /c2rCPState:\s*complete_practice_runtime/);
  assert.match(roadmap, /c2rCTState:\s*authorized_unstarted/);
  for (const exception of policy.exceptions) {
    const source = await readJson(exception.source_contract);
    assert.equal(source.contract_id, "foundation-development-toolchain-security-v1");
  }
});

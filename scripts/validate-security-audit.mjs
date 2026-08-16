import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const SEVERITIES = ["info", "low", "moderate", "high", "critical"];
const REQUIRED_EXCEPTION_FIELDS = [
  "advisory_id",
  "package",
  "environment",
  "severity",
  "runtime_reachability",
  "attacker_controlled_input_path",
  "approved_by",
  "approved_at",
  "expires_at",
  "rationale",
  "compensating_controls",
  "source_contract",
];
const SAFE_ENVIRONMENTS = ["production", "development"];
const SAFE_REACHABILITY = ["reachable", "limited", "unreachable"];
const DAY_MS = 24 * 60 * 60 * 1000;

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function assertNonEmptyString(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be a non-empty string`);
}

function sameMembers(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    new Set(left).size === left.length &&
    new Set(right).size === right.length &&
    left.every((value) => right.includes(value))
  );
}

function severityRank(severity) {
  const rank = SEVERITIES.indexOf(severity);
  assert(rank >= 0, `unsupported severity: ${severity}`);
  return rank;
}

function advisoryId(via, packageName) {
  const text = `${via.url ?? ""} ${via.title ?? ""}`;
  const ghsa = text.match(/GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}/i)?.[0];
  if (ghsa) return ghsa.toUpperCase();
  if (Number.isSafeInteger(via.source)) return `NPM-${via.source}`;
  fail(`audit advisory for ${packageName} has no stable GHSA or npm source identity`);
}

function validateAuditReport(report, label) {
  assert(report && typeof report === "object" && !Array.isArray(report), `${label} audit must be an object`);
  assert(report.auditReportVersion === 2, `${label} auditReportVersion must equal 2`);
  assert(
    report.vulnerabilities && typeof report.vulnerabilities === "object" && !Array.isArray(report.vulnerabilities),
    `${label} audit vulnerabilities must be an object`,
  );
  const counts = report.metadata?.vulnerabilities;
  assert(counts && typeof counts === "object", `${label} audit metadata.vulnerabilities is required`);
  for (const severity of [...SEVERITIES, "total"]) {
    assert(Number.isSafeInteger(counts[severity]) && counts[severity] >= 0, `${label} audit count ${severity} is invalid`);
  }

  const derivedCounts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0]));
  derivedCounts.total = 0;
  for (const [packageName, vulnerability] of Object.entries(report.vulnerabilities)) {
    assert(vulnerability && typeof vulnerability === "object" && !Array.isArray(vulnerability), `${label} ${packageName} vulnerability is invalid`);
    assert(vulnerability.name === packageName, `${label} vulnerability key/name mismatch for ${packageName}`);
    severityRank(vulnerability.severity);
    assert(Array.isArray(vulnerability.via) && vulnerability.via.length > 0, `${label} ${packageName}.via must be non-empty`);
    for (const via of vulnerability.via) {
      if (typeof via === "string") {
        assert(report.vulnerabilities[via], `${label} ${packageName} has dangling via reference ${via}`);
      } else {
        assert(via && typeof via === "object" && !Array.isArray(via), `${label} ${packageName} has invalid via evidence`);
      }
    }
    derivedCounts[vulnerability.severity] += 1;
    derivedCounts.total += 1;
  }
  for (const severity of [...SEVERITIES, "total"]) {
    assert(counts[severity] === derivedCounts[severity], `${label} audit metadata count mismatch for ${severity}`);
  }

  function resolvesConcreteAdvisory(packageName, ancestors = new Set()) {
    assert(!ancestors.has(packageName), `${label} audit vulnerability graph contains a cycle at ${packageName}`);
    const nextAncestors = new Set(ancestors);
    nextAncestors.add(packageName);
    return report.vulnerabilities[packageName].via.every((via) =>
      typeof via === "string" ? resolvesConcreteAdvisory(via, nextAncestors) : true,
    );
  }

  for (const packageName of Object.keys(report.vulnerabilities)) {
    assert(resolvesConcreteAdvisory(packageName), `${label} ${packageName} does not resolve to advisory evidence`);
  }
}

function flattenAudit(report, label) {
  validateAuditReport(report, label);
  const findings = new Map();

  for (const vulnerability of Object.values(report.vulnerabilities)) {
    assert(vulnerability && typeof vulnerability === "object", `${label} vulnerability entry is invalid`);
    assertNonEmptyString(vulnerability.name, `${label} vulnerability name`);
    assert(Array.isArray(vulnerability.via), `${label} ${vulnerability.name}.via must be an array`);

    for (const via of vulnerability.via) {
      if (!via || typeof via !== "object" || Array.isArray(via)) continue;
      const packageName = via.dependency ?? vulnerability.name;
      assertNonEmptyString(packageName, `${label} advisory package`);
      const severity = via.severity ?? vulnerability.severity;
      severityRank(severity);
      const id = advisoryId(via, packageName);
      const key = `${id}\u0000${packageName}`;
      const existing = findings.get(key);
      if (!existing || severityRank(severity) > severityRank(existing.severity)) {
        findings.set(key, { advisory_id: id, package: packageName, severity });
      }
    }
  }

  if (report.metadata.vulnerabilities.total > 0) {
    assert(findings.size > 0, `${label} audit reports vulnerable packages without advisory identities`);
  }

  return findings;
}

function validatePolicy(policy, nowMs) {
  assert(policy && typeof policy === "object" && !Array.isArray(policy), "security policy must be an object");
  assert(policy.contract_id === "foundation-continuous-security-automation-v1", "unexpected security policy contract_id");
  assert(policy.phase === "E", "security policy phase must equal E");
  assert(policy.policy_version === 1, "security policy version must equal 1");
  assert(Number.isSafeInteger(policy.issue) && policy.issue > 0, "security policy issue must be a positive integer");

  const rules = policy.blocking_rules;
  assert(rules && typeof rules === "object", "blocking_rules are required");
  assert(
    sameMembers(rules.production_severities_requiring_approved_exception, ["high", "critical"]),
    "production blocking severities must be exactly high and critical",
  );
  assert(
    sameMembers(rules.development_severities_requiring_approved_exception, ["high", "critical"]),
    "development blocking severities must be exactly high and critical",
  );
  assert(
    sameMembers(rules.non_blocking_without_exception, ["info", "low", "moderate"]),
    "non-blocking severities must be exactly info, low, and moderate",
  );
  assert(rules.expired_exception_blocks === true, "expired exceptions must block");
  assert(rules.unknown_environment_blocks === true, "unknown environments must block");
  assert(rules.unknown_reachability_blocks === true, "unknown reachability must block");

  const schema = policy.exception_schema;
  assert(schema && typeof schema === "object", "exception_schema is required");
  assert(schema.version === 1, "exception schema version must equal 1");
  assert(
    sameMembers(schema.required_fields, REQUIRED_EXCEPTION_FIELDS),
    "exception schema required_fields do not match the closed v1 shape",
  );
  assert(sameMembers(schema.allowed_environments, SAFE_ENVIRONMENTS), "exception environments are not closed");
  assert(sameMembers(schema.allowed_reachability, SAFE_REACHABILITY), "exception reachability is not closed");
  assert(sameMembers(schema.allowed_approvers, ["repository_owner"]), "exception approvers are not closed");
  assert(
    Number.isSafeInteger(schema.maximum_duration_days) && schema.maximum_duration_days > 0 && schema.maximum_duration_days <= 30,
    "exception maximum duration must be between 1 and 30 days",
  );

  assert(Array.isArray(policy.exceptions), "exceptions must be an array");
  const exceptionMap = new Map();
  for (const exception of policy.exceptions) {
    assert(exception && typeof exception === "object" && !Array.isArray(exception), "exception must be an object");
    assert(
      sameMembers(Object.keys(exception), REQUIRED_EXCEPTION_FIELDS),
      "exception fields do not match the closed v1 shape",
    );
    assert(/^(GHSA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}|NPM-[0-9]+)$/.test(exception.advisory_id), `invalid advisory_id: ${exception.advisory_id}`);
    for (const field of [
      "package",
      "attacker_controlled_input_path",
      "approved_by",
      "rationale",
      "source_contract",
    ]) {
      assertNonEmptyString(exception[field], `${exception.advisory_id}.${field}`);
    }
    assert(SAFE_ENVIRONMENTS.includes(exception.environment), `${exception.advisory_id} has unknown environment`);
    assert(schema.allowed_approvers.includes(exception.approved_by), `${exception.advisory_id} has an unauthorized approver`);
    severityRank(exception.severity);
    assert(SAFE_REACHABILITY.includes(exception.runtime_reachability), `${exception.advisory_id} has unknown reachability`);
    assert(
      Array.isArray(exception.compensating_controls) &&
        exception.compensating_controls.length > 0 &&
        exception.compensating_controls.every((control) => typeof control === "string" && control.trim().length > 0),
      `${exception.advisory_id} compensating_controls must be non-empty strings`,
    );

    const approvedAt = Date.parse(exception.approved_at);
    const expiresAt = Date.parse(exception.expires_at);
    assert(Number.isFinite(approvedAt), `${exception.advisory_id} approved_at is invalid`);
    assert(Number.isFinite(expiresAt), `${exception.advisory_id} expires_at is invalid`);
    assert(approvedAt <= nowMs, `${exception.advisory_id} approval is in the future`);
    assert(expiresAt > approvedAt, `${exception.advisory_id} must expire after approval`);
    assert(
      expiresAt - approvedAt <= schema.maximum_duration_days * DAY_MS,
      `${exception.advisory_id} exceeds the maximum exception duration`,
    );
    assert(expiresAt > nowMs, `${exception.advisory_id} exception expired at ${exception.expires_at}`);

    const key = `${exception.advisory_id}\u0000${exception.package}`;
    assert(!exceptionMap.has(key), `duplicate exception: ${exception.advisory_id} ${exception.package}`);
    exceptionMap.set(key, exception);
  }

  const artifactPolicy = policy.artifact_policy;
  assert(artifactPolicy?.raw_audit_reports_uploaded === false, "raw audit reports must not be uploaded");
  assert(artifactPolicy?.secrets_or_private_content_allowed === false, "secret or private artifact content must be forbidden");
  assert(artifactPolicy?.sbom_source === "package-lock.json", "SBOM source must be package-lock.json");
  assert(artifactPolicy?.sbom_format === "cyclonedx", "SBOM format must be CycloneDX");
  assert(
    sameMembers(artifactPolicy.allowed_artifacts, ["security-summary-v1.json", "sbom.cdx.json"]),
    "allowed security artifacts must be the exact metadata-only pair",
  );

  return exceptionMap;
}

export function validateSecurityAudits({ productionReport, fullReport, policy, now = Date.now() }) {
  assert(Number.isFinite(now), "verification time must be finite");
  const exceptionMap = validatePolicy(policy, now);
  const production = flattenAudit(productionReport, "production");
  const full = flattenAudit(fullReport, "full");

  for (const [key, productionFinding] of production) {
    const fullFinding = full.get(key);
    assert(fullFinding, `production finding is missing from the full audit: ${key.replace("\u0000", " ")}`);
    assert(
      fullFinding.severity === productionFinding.severity,
      `production/full audit severity mismatch for ${productionFinding.advisory_id} ${productionFinding.package}`,
    );
  }

  const decisions = [];
  const violations = [];
  for (const [key, finding] of [...full.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const detectedEnvironment = production.has(key) ? "production" : "development";
    const exception = exceptionMap.get(key);
    const blockingSeverity = ["high", "critical"].includes(finding.severity);

    if (exception && exception.severity !== finding.severity) {
      violations.push(`${finding.advisory_id} ${finding.package} severity changed from ${exception.severity} to ${finding.severity}`);
    } else if (exception && detectedEnvironment === "development" && exception.environment !== "development") {
      violations.push(`${finding.advisory_id} ${finding.package} has contradictory production classification for a development-only finding`);
    } else if (exception && detectedEnvironment === "production" && exception.environment === "development" && exception.runtime_reachability === "reachable") {
      violations.push(`${finding.advisory_id} ${finding.package} has contradictory development/reachable production classification`);
    } else if (blockingSeverity && !exception) {
      violations.push(`unapproved ${detectedEnvironment} ${finding.severity}: ${finding.advisory_id} ${finding.package}`);
    }

    let outcome = "reported_non_blocking";
    if (exception) outcome = blockingSeverity ? "accepted_active_exception" : "reported_active_exception";
    else if (blockingSeverity) outcome = "blocked_unapproved";

    decisions.push({
      advisory_id: finding.advisory_id,
      package: finding.package,
      severity: finding.severity,
      detected_environment: detectedEnvironment,
      approved_environment: exception?.environment ?? null,
      runtime_reachability: exception?.runtime_reachability ?? "not_required_for_non_blocking_severity",
      exception_expires_at: exception?.expires_at ?? null,
      outcome,
    });
  }

  if (violations.length > 0) fail(violations.join("\n"));

  return {
    schema_version: "security-summary-v1",
    policy_id: policy.contract_id,
    evaluated_at: new Date(now).toISOString(),
    production_counts: productionReport.metadata.vulnerabilities,
    full_counts: fullReport.metadata.vulnerabilities,
    decisions,
    blocking_finding_count: 0,
  };
}

function scanArtifact(value, path = "$") {
  if (typeof value === "string") {
    assert(!/(?:-----BEGIN [A-Z ]*PRIVATE KEY-----|github_pat_|ghp_[A-Za-z0-9]|sk-[A-Za-z0-9]{16}|service[_-]?role[_-]?key)/i.test(value), `secret-like value in SBOM at ${path}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => scanArtifact(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, entry] of Object.entries(value)) {
    assert(!/(?:password|secret|access[_-]?token|refresh[_-]?token|cookie|authorization|learner[_-]?(?:answer|ocr)|raw[_-]?content)/i.test(key), `private or secret-bearing SBOM key at ${path}.${key}`);
    scanArtifact(entry, `${path}.${key}`);
  }
}

export function validateSecuritySbom({ sbom, packageJson }) {
  assert(sbom && typeof sbom === "object" && !Array.isArray(sbom), "SBOM must be an object");
  assert(sbom.bomFormat === "CycloneDX", "SBOM bomFormat must equal CycloneDX");
  assert(typeof sbom.specVersion === "string" && /^1\.[0-9]+$/.test(sbom.specVersion), "SBOM specVersion is invalid");
  const root = sbom.metadata?.component;
  assert(root && typeof root === "object", "SBOM root component is required");
  const purlName = packageJson.name.replace(/^@/, "%40");
  assert(root.version === packageJson.version, "SBOM root version does not match package.json");
  assert(root["bom-ref"] === `${packageJson.name}@${packageJson.version}`, "SBOM root reference does not match package.json");
  assert(root.purl === `pkg:npm/${purlName}@${packageJson.version}`, "SBOM root purl does not match package.json");
  assert(Array.isArray(sbom.components) && sbom.components.length > 0, "SBOM must contain dependency components");
  for (const component of sbom.components) {
    assertNonEmptyString(component.name, "SBOM component name");
    assertNonEmptyString(component.version, `SBOM ${component.name} version`);
  }
  scanArtifact(sbom);
  return { format: sbom.bomFormat, spec_version: sbom.specVersion, component_count: sbom.components.length };
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    assert(key?.startsWith("--") && value, `invalid CLI argument near ${key ?? "<end>"}`);
    assert(!values[key], `duplicate CLI argument: ${key}`);
    values[key] = value;
  }
  const required = ["--production-audit", "--full-audit", "--policy", "--sbom", "--package", "--output"];
  assert(sameMembers(Object.keys(values), required), `CLI arguments must be exactly: ${required.join(" ")}`);
  return values;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const [productionReport, fullReport, policy, sbom, packageJson] = await Promise.all([
    readJson(args["--production-audit"]),
    readJson(args["--full-audit"]),
    readJson(args["--policy"]),
    readJson(args["--sbom"]),
    readJson(args["--package"]),
  ]);
  const summary = validateSecurityAudits({ productionReport, fullReport, policy });
  summary.sbom = validateSecuritySbom({ sbom, packageJson });
  await writeFile(args["--output"], `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(
    `[security-audit] accepted ${summary.decisions.length} advisories; SBOM components=${summary.sbom.component_count}`,
  );
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  runCli().catch((error) => {
    console.error(`[security-audit] ${error.message}`);
    process.exit(1);
  });
}

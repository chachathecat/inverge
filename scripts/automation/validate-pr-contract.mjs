#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";

const REQUIRED_HEADINGS = [
  "## Goal",
  "## Non-goals",
  "## Risk classification",
  "## Data boundary",
  "## Schema / API / environment changes",
  "## Tests and evidence",
  "## Runtime evidence",
  "## Rollout and rollback",
  "## Remaining risks",
  "## Merge recommendation",
];

const MERGE_RECOMMENDATIONS = [
  "Auto-merge candidate",
  "Human approval required",
  "Blocked",
];

const C3R_A0_CONTRACT_PATH =
  "config/dabangil-wcv-c3r-a0-migration-dependency-authority-v1.json";
const C3R_A0_SOURCE_AUTHORITY_SCOPE = Object.freeze({
  repository: "chachathecat/inverge",
  baseRef: "main",
  baseSha: "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
  headRef: "codex/wcv-c3r-a0-migration-dependency-authority",
  headRepository: "chachathecat/inverge",
  pullRequestTitle:
    "[WCV-C3R-A0] Install PostgreSQL migration dependency authority",
});
const C3R_A1_CONTRACT_PATH =
  "config/dabangil-wcv-c3r-a1-serial-program-authority-v1.json";
const C3R_A1_SOURCE_AUTHORITY_SCOPE = Object.freeze({
  repository: "chachathecat/inverge",
  baseRef: "main",
  baseSha: "3a7047cf4c7fc68247137bafbca2434abdadbc7f",
  headRef: "codex/wcv-c3r-a1-serial-program-authority",
  headRepository: "chachathecat/inverge",
  pullRequestTitle:
    "[WCV-C3R-A1] Install serial Practice/Theory/Law program authority",
});
const PRE_C3R_P_ORACLE_CONTRACT_PATH =
  "config/dabangil-wcv-c3-pre-p-postgresql-security-state-oracle-v1.json";
const PRE_C3R_P_ORACLE_SOURCE_SCOPE = Object.freeze({
  repository: "chachathecat/inverge",
  baseRef: "main",
  baseSha: "54afffcc539981ded65591f1f027171343bfce40",
  headRef: "codex/wcv-c3-pre-p-postgresql-oracle-clean-replacement",
  headRepository: "chachathecat/inverge",
  pullRequestTitle:
    "[WCV-C3 PRE-P] Install PostgreSQL 15.8 security-state oracle tooling — clean replacement",
  isDraft: true,
});
const PRE_C3R_P_ORACLE_REFERENCE_LINES = Object.freeze([
  "Refs #706",
  "Refs #707",
  "Refs #708",
  "Refs #714",
  "Refs #781",
]);
const PRE_C3R_P_ORACLE_DISPOSITION =
  "All referenced issues remain open; this support-tooling Draft closes none.";
const PRE_C3R_P_MINIMAL_AUTHORITY_CONTRACT_PATH =
  "config/dabangil-wcv-c3-pre-p-migration-mutation-authority-v1.json";
const PRE_C3R_P_MINIMAL_AUTHORITY_SCOPE = Object.freeze({
  repository: "chachathecat/inverge",
  baseRef: "main",
  baseSha: "5965ddb0202c5f9effb531824d4d95f775abecc1",
  headRef: "codex/wcv-c3-pre-p-minimal-migration-mutation-authority",
  headRepository: "chachathecat/inverge",
  pullRequestTitle:
    "[WCV-C3 PRE-P] Authorize exact C3R-P migration operations — minimal bridge",
  isDraft: true,
});
const PRE_C3R_P_MINIMAL_AUTHORITY_REFERENCE_LINES = Object.freeze([
  "Refs #706",
  "Refs #707",
  "Refs #708",
  "Refs #714",
  "Refs #781",
]);
const PRE_C3R_P_MINIMAL_AUTHORITY_DISPOSITION =
  "All referenced issues remain open; this minimal source-only Draft closes none.";
const GITHUB_CLOSING_KEYWORD_PATTERN = new RegExp(
  String.raw`\b(?:close(?:s|d)?|fix(?:es|ed)?|resolve(?:s|d)?)(?:\s*:\s*|\s+)(?:#\d+|[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#\d+|https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/(?:issues|pull)\/\d+)\b`,
  "gi",
);

function fail(message) {
  console.error(`validate-pr-contract: ${message}`);
  process.exitCode = 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readPullRequestContext() {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
      if (typeof event?.pull_request?.body === "string") {
        return {
          body: event.pull_request.body,
          repository: event?.repository?.full_name ?? null,
          baseRef: event.pull_request?.base?.ref ?? null,
          baseSha: event.pull_request?.base?.sha ?? null,
          headRef: event.pull_request?.head?.ref ?? null,
          headRepository: event.pull_request?.head?.repo?.full_name ?? null,
          pullRequestTitle: event.pull_request?.title ?? null,
          isDraft: event.pull_request?.draft === true,
        };
      }
    } catch {
      fail("GITHUB_EVENT_PATH could not be parsed as a pull-request event.");
      return null;
    }
  }

  if (typeof process.env.PR_BODY === "string") {
    return {
      body: process.env.PR_BODY,
      repository: null,
      baseRef: null,
      baseSha: null,
      headRef: null,
      headRepository: null,
      pullRequestTitle: null,
      isDraft: null,
    };
  }

  return null;
}

function validateHeadings(body, errors) {
  for (const heading of REQUIRED_HEADINGS) {
    const headingPattern = new RegExp(`^${escapeRegExp(heading)}\\s*$`, "im");
    if (!headingPattern.test(body)) {
      errors.push(`missing required section: ${heading}`);
    }
  }
}

function readC3rA0SourceAuthorityIssueLink() {
  if (!fs.existsSync(C3R_A0_CONTRACT_PATH)) return null;
  try {
    const contract = JSON.parse(
      fs.readFileSync(C3R_A0_CONTRACT_PATH, "utf8"),
    );
    return contract?.deliveryControl?.sourceAuthorityIssueLink ?? null;
  } catch {
    return null;
  }
}

function matchesExactC3rA0Scope(context) {
  return Object.entries(C3R_A0_SOURCE_AUTHORITY_SCOPE).every(
    ([key, value]) => context?.[key] === value,
  );
}

function readC3rA1SourceAuthorityIssueLinks() {
  if (!fs.existsSync(C3R_A1_CONTRACT_PATH)) return null;
  try {
    const contract = JSON.parse(
      fs.readFileSync(C3R_A1_CONTRACT_PATH, "utf8"),
    );
    return contract?.deliveryControl?.referenceOnlyIssueLinks ?? null;
  } catch {
    return null;
  }
}

function matchesExactC3rA1Scope(context) {
  return Object.entries(C3R_A1_SOURCE_AUTHORITY_SCOPE).every(
    ([key, value]) => context?.[key] === value,
  );
}

function readPreC3rPOracleReferenceAuthority() {
  if (!fs.existsSync(PRE_C3R_P_ORACLE_CONTRACT_PATH)) return null;
  try {
    const contract = JSON.parse(
      fs.readFileSync(PRE_C3R_P_ORACLE_CONTRACT_PATH, "utf8"),
    );
    return contract?.deliveryControl ?? null;
  } catch {
    return null;
  }
}

function matchesExactPreC3rPOracleScope(context) {
  return Object.entries(PRE_C3R_P_ORACLE_SOURCE_SCOPE).every(
    ([key, value]) => context?.[key] === value,
  );
}

function isPreC3rPOracleCandidate(context) {
  return context?.repository === PRE_C3R_P_ORACLE_SOURCE_SCOPE.repository &&
    context?.headRef === PRE_C3R_P_ORACLE_SOURCE_SCOPE.headRef;
}

function readPreC3rPMinimalAuthorityDeliveryControl() {
  if (!fs.existsSync(PRE_C3R_P_MINIMAL_AUTHORITY_CONTRACT_PATH)) return null;
  try {
    const contract = JSON.parse(
      fs.readFileSync(PRE_C3R_P_MINIMAL_AUTHORITY_CONTRACT_PATH, "utf8"),
    );
    return contract?.deliveryControl ?? null;
  } catch {
    return null;
  }
}

function matchesExactPreC3rPMinimalAuthorityScope(context) {
  return Object.entries(PRE_C3R_P_MINIMAL_AUTHORITY_SCOPE).every(
    ([key, value]) => context?.[key] === value,
  );
}

function isPreC3rPMinimalAuthorityCandidate(context) {
  return context?.repository === PRE_C3R_P_MINIMAL_AUTHORITY_SCOPE.repository &&
    context?.headRef === PRE_C3R_P_MINIMAL_AUTHORITY_SCOPE.headRef;
}

function validateIssueLink(body, errors, context) {
  const issueLinks = [...body.matchAll(/\b(?:Closes|Fixes)\s+#(\d+)\b/gi)];
  const allGithubClosingLinks = [
    ...body.matchAll(GITHUB_CLOSING_KEYWORD_PATTERN),
  ];
  const sourceAuthority = readC3rA0SourceAuthorityIssueLink();

  if (isPreC3rPMinimalAuthorityCandidate(context)) {
    const deliveryControl = readPreC3rPMinimalAuthorityDeliveryControl();
    const referenceAuthority = deliveryControl?.referenceOnlyIssueLinks;
    const bodyLines = body.split(/\r?\n/u).map((line) => line.trim());
    const actualReferenceLines = bodyLines.filter((line) => /^Refs #\d+$/u.test(line));
    const exactDispositionCount = bodyLines.filter(
      (line) => line === PRE_C3R_P_MINIMAL_AUTHORITY_DISPOSITION,
    ).length;
    const contractScopeMatches = Object.entries(
      PRE_C3R_P_MINIMAL_AUTHORITY_SCOPE,
    ).every(([key, value]) => {
      if (key === "isDraft") return deliveryControl?.draftRequired === value;
      return deliveryControl?.[key] === value;
    });

    if (
      !matchesExactPreC3rPMinimalAuthorityScope(context) ||
      !contractScopeMatches ||
      JSON.stringify(referenceAuthority?.requiredReferenceLinesExactly) !==
        JSON.stringify(PRE_C3R_P_MINIMAL_AUTHORITY_REFERENCE_LINES) ||
      referenceAuthority?.requiredDispositionLine !==
        PRE_C3R_P_MINIMAL_AUTHORITY_DISPOSITION ||
      JSON.stringify(actualReferenceLines) !==
        JSON.stringify(PRE_C3R_P_MINIMAL_AUTHORITY_REFERENCE_LINES) ||
      exactDispositionCount !== 1 ||
      referenceAuthority?.closingKeywordsAllowed !== false ||
      allGithubClosingLinks.length !== 0
    ) {
      errors.push(
        "PRE-C3R-P minimal authority reference-only linking requires its five exact issue references, exact open disposition, pinned Draft scope, and zero issue-closing keywords.",
      );
    }
    return;
  }

  if (isPreC3rPOracleCandidate(context)) {
    const deliveryControl = readPreC3rPOracleReferenceAuthority();
    const referenceAuthority = deliveryControl?.referenceOnlyIssueLinks;
    const bodyLines = body.split(/\r?\n/u).map((line) => line.trim());
    const actualReferenceLines = bodyLines.filter((line) => /^Refs #\d+$/u.test(line));
    const exactDispositionCount = bodyLines.filter(
      (line) => line === PRE_C3R_P_ORACLE_DISPOSITION,
    ).length;
    const contextScopeMatches = matchesExactPreC3rPOracleScope(context);
    const contractScopeMatches = Object.entries(
      PRE_C3R_P_ORACLE_SOURCE_SCOPE,
    ).every(([key, value]) => {
      if (key === "isDraft") return deliveryControl?.draftRequired === value;
      return deliveryControl?.[key] === value;
    });

    if (
      !contextScopeMatches ||
      !contractScopeMatches ||
      referenceAuthority?.mode !== "REFERENCE_ONLY" ||
      JSON.stringify(referenceAuthority?.requiredReferenceLinesExactly) !==
        JSON.stringify(PRE_C3R_P_ORACLE_REFERENCE_LINES) ||
      referenceAuthority?.requiredDispositionLine !== PRE_C3R_P_ORACLE_DISPOSITION ||
      JSON.stringify(actualReferenceLines) !== JSON.stringify(PRE_C3R_P_ORACLE_REFERENCE_LINES) ||
      exactDispositionCount !== 1 ||
      referenceAuthority?.closingKeywordsAllowed !== false ||
      referenceAuthority?.exceptionAppliesOnlyWhenExactLinesPresent !== true ||
      referenceAuthority?.fullGithubClosingKeywordFamilyBlocked !== true ||
      allGithubClosingLinks.length !== 0
    ) {
      errors.push(
        "PRE-C3R-P oracle reference-only linking requires its five exact issue references, exact open disposition, exact pinned Draft scope, and zero issue-closing keywords.",
      );
    }
    return;
  }

  if (matchesExactC3rA1Scope(context)) {
    const a1Authority = readC3rA1SourceAuthorityIssueLinks();
    const requiredReferenceLines = a1Authority?.requiredReferenceLinesExactly;
    const requiredDispositionLine = a1Authority?.requiredDispositionLine;
    const bodyLines = body.split(/\r?\n/u).map((line) => line.trim());
    const actualReferenceLines = bodyLines.filter((line) => /^Refs #\d+$/u.test(line));
    const exactDispositionCount = bodyLines.filter(
      (line) => line === requiredDispositionLine,
    ).length;
    const contractScopeMatches = Object.entries(
      C3R_A1_SOURCE_AUTHORITY_SCOPE,
    ).every(([key, value]) => a1Authority?.[key] === value);

    if (
      !contractScopeMatches ||
      a1Authority?.mode !== "REFERENCE_ONLY" ||
      !Array.isArray(requiredReferenceLines) ||
      JSON.stringify(actualReferenceLines) !== JSON.stringify(requiredReferenceLines) ||
      exactDispositionCount !== 1 ||
      a1Authority?.closingKeywordsAllowed !== false ||
      a1Authority?.exceptionAppliesOnlyWhenExactLinesPresent !== true ||
      a1Authority?.fullGithubClosingKeywordFamilyBlocked !== true ||
      allGithubClosingLinks.length !== 0
    ) {
      errors.push(
        "C3R-A1 reference-only linking requires its five exact issue references, exact open disposition, exact pinned PR scope, and zero issue-closing keywords.",
      );
    }
    return;
  }

  if (matchesExactC3rA0Scope(context)) {
    const requiredReferenceLine = sourceAuthority?.requiredReferenceLine;
    const requiredDispositionLine = sourceAuthority?.requiredDispositionLine;
    const bodyLines = body.split(/\r?\n/u).map((line) => line.trim());
    const exactReferenceCount = bodyLines.filter(
      (line) => line === requiredReferenceLine,
    ).length;
    const exactDispositionCount = bodyLines.filter(
      (line) => line === requiredDispositionLine,
    ).length;
    const contractScopeMatches = Object.entries(
      C3R_A0_SOURCE_AUTHORITY_SCOPE,
    ).every(([key, value]) => sourceAuthority?.[key] === value);

    if (
      !contractScopeMatches ||
      sourceAuthority?.mode !== "REFERENCE_ONLY" ||
      sourceAuthority?.trackerIssue !== 781 ||
      sourceAuthority?.closingKeywordsAllowed !== false ||
      sourceAuthority?.exceptionAppliesOnlyWhenExactLinesPresent !== true ||
      sourceAuthority?.fullGithubClosingKeywordFamilyBlocked !== true ||
      exactReferenceCount !== 1 ||
      exactDispositionCount !== 1 ||
      allGithubClosingLinks.length !== 0
    ) {
      errors.push(
        "C3R-A0 reference-only linking requires its exact tracker reference, exact open disposition, exact pinned PR scope, and zero issue-closing keywords.",
      );
    }
    return;
  }

  if (issueLinks.length !== 1) {
    errors.push(
      'PR must contain exactly one issue-closing reference using "Closes #<issue>" or "Fixes #<issue>".',
    );
  }
}

function validateRisk(body, errors) {
  if (!/^\s*-\s*Risk:\s*\[(low|medium|high)\]\s*$/im.test(body)) {
    errors.push("risk classification must contain exactly one `- Risk: [low|medium|high]` line.");
  }
}

function validateMergeRecommendation(body, errors) {
  const recommendationPattern = /^\s*-\s*\[([ xX])\]\s*(Auto-merge candidate|Human approval required|Blocked)\s*$/gim;
  const matches = [...body.matchAll(recommendationPattern)];
  const byLabel = new Map();

  for (const match of matches) {
    const label = match[2];
    if (byLabel.has(label)) {
      errors.push(`duplicate merge recommendation: ${label}`);
      continue;
    }
    byLabel.set(label, match[1].toLowerCase() === "x");
  }

  for (const label of MERGE_RECOMMENDATIONS) {
    if (!byLabel.has(label)) {
      errors.push(`missing merge recommendation checkbox: ${label}`);
    }
  }

  const checkedCount = [...byLabel.values()].filter(Boolean).length;
  if (checkedCount !== 1) {
    errors.push("exactly one merge recommendation checkbox must be checked.");
  }
}

function main() {
  const context = readPullRequestContext();
  const body = context?.body;

  if (process.exitCode) return;

  if (!body?.trim()) {
    fail("PR body is missing.");
    return;
  }

  const errors = [];
  validateIssueLink(body, errors, context);
  validateHeadings(body, errors);
  validateRisk(body, errors);
  validateMergeRecommendation(body, errors);

  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("validate-pr-contract: pass");
}

main();

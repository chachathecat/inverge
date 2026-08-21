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
const C3R_A2_CONTRACT_PATH =
  "config/dabangil-wcv-c3r-a2-migration-history-reconciliation-v1.json";
const C3R_A2_SOURCE_AUTHORITY_SCOPE = Object.freeze({
  repository: "chachathecat/inverge",
  baseRef: "main",
  baseSha: "54afffcc539981ded65591f1f027171343bfce40",
  headRef: "codex/wcv-c3r-a2-semantic-final-state-clean-replan",
  headRepository: "chachathecat/inverge",
  pullRequestTitle:
    "[WCV-C3R-A2] Install semantic-preserving append-aware migration authority — clean replan",
});
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

function readC3rA2SourceAuthorityIssueLinks() {
  if (!fs.existsSync(C3R_A2_CONTRACT_PATH)) return null;
  try {
    const contract = JSON.parse(
      fs.readFileSync(C3R_A2_CONTRACT_PATH, "utf8"),
    );
    return contract?.deliveryControl?.referenceOnlyIssueLinks ?? null;
  } catch {
    return null;
  }
}

function matchesExactC3rA2Scope(context) {
  return Object.entries(C3R_A2_SOURCE_AUTHORITY_SCOPE).every(
    ([key, value]) => context?.[key] === value,
  );
}

function validateIssueLink(body, errors, context) {
  const issueLinks = [...body.matchAll(/\b(?:Closes|Fixes)\s+#(\d+)\b/gi)];
  const allGithubClosingLinks = [
    ...body.matchAll(GITHUB_CLOSING_KEYWORD_PATTERN),
  ];
  const sourceAuthority = readC3rA0SourceAuthorityIssueLink();

  if (matchesExactC3rA2Scope(context)) {
    const a2Authority = readC3rA2SourceAuthorityIssueLinks();
    const requiredReferenceLines = a2Authority?.requiredReferenceLinesExactly;
    const requiredDispositionLine = a2Authority?.requiredDispositionLine;
    const bodyLines = body.split(/\r?\n/u).map((line) => line.trim());
    const actualReferenceLines = bodyLines.filter((line) => /^Refs #\d+$/u.test(line));
    const exactDispositionCount = bodyLines.filter(
      (line) => line === requiredDispositionLine,
    ).length;
    const contractScopeMatches = Object.entries(
      C3R_A2_SOURCE_AUTHORITY_SCOPE,
    ).every(([key, value]) => a2Authority?.[key] === value);

    if (
      !contractScopeMatches ||
      a2Authority?.mode !== "REFERENCE_ONLY" ||
      !Array.isArray(requiredReferenceLines) ||
      JSON.stringify(actualReferenceLines) !== JSON.stringify(requiredReferenceLines) ||
      exactDispositionCount !== 1 ||
      a2Authority?.closingKeywordsAllowed !== false ||
      a2Authority?.exceptionAppliesOnlyWhenExactLinesPresent !== true ||
      a2Authority?.fullGithubClosingKeywordFamilyBlocked !== true ||
      allGithubClosingLinks.length !== 0
    ) {
      errors.push(
        "C3R-A2 reference-only linking requires its five exact issue references, exact open/unstarted disposition, exact pinned PR scope, and zero issue-closing keywords.",
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

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

const WCV_C3R_CONTRACT_PATH =
  "config/dabangil-wcv-c3-structural-recovery-v1.json";
const WCV_C3R_SOURCE_AUTHORITY_SCOPE = Object.freeze({
  repository: "chachathecat/inverge",
  baseRef: "main",
  baseSha: "ffdd3dcc2398dd27b991eee0be34f832da0a65b5",
  headRef: "codex/wcv-c3r-structural-recovery-authority",
  headRepository: "chachathecat/inverge",
  pullRequestTitle: "[WCV-C3R] Install serial structural recovery authority",
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

function readSourceAuthorityIssueLink() {
  if (!fs.existsSync(WCV_C3R_CONTRACT_PATH)) return null;

  try {
    const contract = JSON.parse(fs.readFileSync(WCV_C3R_CONTRACT_PATH, "utf8"));
    return contract?.deliveryControl?.sourceAuthorityIssueLink ?? null;
  } catch {
    return null;
  }
}

function matchesExactSourceAuthorityScope(context) {
  return Object.entries(WCV_C3R_SOURCE_AUTHORITY_SCOPE).every(
    ([key, value]) => context?.[key] === value,
  );
}

function validateIssueLink(body, errors, context) {
  const issueLinks = [...body.matchAll(/\b(?:Closes|Fixes)\s+#(\d+)\b/gi)];
  const allGithubClosingLinks = [...body.matchAll(GITHUB_CLOSING_KEYWORD_PATTERN)];
  const sourceAuthority = readSourceAuthorityIssueLink();
  const dispositionLine = sourceAuthority?.requiredDispositionLine;
  const exactSourceAuthorityScope = matchesExactSourceAuthorityScope(context);

  if (exactSourceAuthorityScope) {
    const requiredReferenceLine = sourceAuthority?.requiredReferenceLine;
    const exactReferenceCount = body
      .split(/\r?\n/)
      .filter((line) => line.trim() === requiredReferenceLine).length;
    const exactDispositionCount = body
      .split(/\r?\n/)
      .filter((line) => line.trim() === dispositionLine).length;
    const contractScopeMatches = Object.entries(
      WCV_C3R_SOURCE_AUTHORITY_SCOPE,
    ).every(([key, value]) => sourceAuthority?.[key] === value);

    if (
      !contractScopeMatches ||
      sourceAuthority?.mode !== "REFERENCE_ONLY" ||
      sourceAuthority?.closingKeywordsAllowed !== false ||
      sourceAuthority?.exceptionAppliesOnlyWhenExactLinesPresent !== true ||
      sourceAuthority?.fullGithubClosingKeywordFamilyBlocked !== true ||
      exactReferenceCount !== 1 ||
      exactDispositionCount !== 1 ||
      allGithubClosingLinks.length !== 0
    ) {
      errors.push(
        "source-authority reference-only linking requires its exact tracker reference, exact disposition, and zero issue-closing keywords.",
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

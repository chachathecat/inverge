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

function fail(message) {
  console.error(`validate-pr-contract: ${message}`);
  process.exitCode = 1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readPullRequestBody() {
  const eventPath = process.env.GITHUB_EVENT_PATH;

  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
      if (typeof event?.pull_request?.body === "string") {
        return event.pull_request.body;
      }
    } catch {
      fail("GITHUB_EVENT_PATH could not be parsed as a pull-request event.");
      return null;
    }
  }

  if (typeof process.env.PR_BODY === "string") {
    return process.env.PR_BODY;
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

function validateIssueLink(body, errors) {
  const issueLinks = [...body.matchAll(/\b(?:Closes|Fixes)\s+#(\d+)\b/gi)];

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
  const body = readPullRequestBody();

  if (process.exitCode) return;

  if (!body?.trim()) {
    fail("PR body is missing.");
    return;
  }

  const errors = [];
  validateIssueLink(body, errors);
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

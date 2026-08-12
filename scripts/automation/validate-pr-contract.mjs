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

const WCV_C2_BRANCH = "agent/wcv-c2-first-trusted-repair-vertical";
const WCV_C2_CLOSING_ISSUES = ["702", "703", "704", "705"];

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
          headRef: typeof event.pull_request?.head?.ref === "string"
            ? event.pull_request.head.ref
            : null,
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
      headRef: typeof process.env.PR_HEAD_REF === "string"
        ? process.env.PR_HEAD_REF
        : null,
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

function validateIssueLink(body, headRef, errors) {
  const issueLinks = [...body.matchAll(/\b(?:Closes|Fixes)\s+#(\d+)\b/gi)];

  if (headRef === WCV_C2_BRANCH) {
    const actual = issueLinks.map((match) => match[1]).sort();
    if (
      actual.length !== WCV_C2_CLOSING_ISSUES.length ||
      actual.some((issue, index) => issue !== WCV_C2_CLOSING_ISSUES[index])
    ) {
      errors.push(
        "WCV-C2 must contain exactly one closing reference for each of #702, #703, #704, and #705.",
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

  if (process.exitCode) return;

  if (!context?.body?.trim()) {
    fail("PR body is missing.");
    return;
  }

  const { body, headRef } = context;
  const errors = [];
  validateIssueLink(body, headRef, errors);
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

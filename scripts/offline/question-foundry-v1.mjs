#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

import {
  buildSimilarityFirewallReview,
  evaluateQuestionRelease,
  validateAnswerSpecification,
  validateCandidateBatch,
  validateQuestionBlueprint,
  validateTrustedSourceRegistryAuthority,
  validateTrustedSourceBindings,
} from "../../lib/question-foundry/index.ts";

const ACTIONS = new Set([
  "validate-blueprint",
  "validate-answer-specification",
  "validate-batch",
  "validate-sources",
  "similarity-review",
  "evaluate-release",
]);

function parseArguments(argv) {
  const options = { action: "", input: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--action" && argv[index + 1]) {
      options.action = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument === "--input" && argv[index + 1]) {
      options.input = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown-argument:${argument}`);
  }
  if (!ACTIONS.has(options.action)) throw new Error("invalid-or-missing-action");
  if (!options.input) throw new Error("missing-input-path");
  return options;
}

async function run(options) {
  const input = JSON.parse(await readFile(options.input, "utf8"));
  if (options.action !== "evaluate-release") {
    const authority = validateTrustedSourceRegistryAuthority(
      input.registry,
      input.sourceRegistryExportBinding,
    );
    if (!authority.valid) return authority;
  }
  if (options.action === "validate-blueprint") {
    return validateQuestionBlueprint(
      input.blueprint,
      input.registry,
      input.sourceRegistryExportBinding,
    );
  }
  if (options.action === "validate-answer-specification") {
    return validateAnswerSpecification(
      input.answerSpecification,
      input.blueprint,
      input.registry,
      input.sourceRegistryExportBinding,
    );
  }
  if (options.action === "validate-batch") {
    return validateCandidateBatch(
      input.batch,
      input.registry,
      input.sourceRegistryExportBinding,
    );
  }
  if (options.action === "validate-sources") {
    return validateTrustedSourceBindings(
      input.bindings,
      input.registry,
      input.purposes,
      input.sourceRegistryExportBinding,
    );
  }
  if (options.action === "similarity-review") {
    return buildSimilarityFirewallReview(
      input.candidate,
      input.references,
      input.registry,
      input.sourceRegistryExportBinding,
      input.threshold,
    );
  }
  return evaluateQuestionRelease(input.bundle, input.requestedTier, input.trustContext);
}

try {
  const options = parseArguments(process.argv.slice(2));
  const result = await run(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if ("valid" in result && result.valid !== true) process.exitCode = 1;
  if ("allowed" in result && result.allowed !== true) process.exitCode = 1;
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      valid: false,
      errors: [error instanceof Error ? error.message : "unknown-error"],
      offline: true,
      providerCalls: 0,
      remoteMutations: 0,
    })}\n`,
  );
  process.exitCode = 1;
}

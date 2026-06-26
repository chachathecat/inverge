#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRegistryPath = "reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_packages.json";
const defaultReportPath = "reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_package_report.json";
const defaultCanonicalQuestionRegistryPath = "reference_corpus/question_archive/second/appraiser_second_round_canonical_questions.json";
const defaultSourceRegistryPath = "reference_corpus/official_materials/appraiser/second_round_source_registry.json";
const defaultRightsRegistryPath = "reference_corpus/official_materials/appraiser/second_round_rights_registry.json";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryModuleUrl = pathToFileURL(
  path.join(repoRoot, "lib", "review-os", "second-round-reference-answer-package-registry.ts"),
).href;

function parseArgs(argv) {
  const args = {
    registryPath: defaultRegistryPath,
    reportPath: defaultReportPath,
    canonicalQuestionRegistryPath: defaultCanonicalQuestionRegistryPath,
    sourceRegistryPath: defaultSourceRegistryPath,
    rightsRegistryPath: defaultRightsRegistryPath,
    json: false,
    writeReport: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry") args.registryPath = argv[++index];
    else if (arg === "--report") args.reportPath = argv[++index];
    else if (arg === "--canonical-question-registry") args.canonicalQuestionRegistryPath = argv[++index];
    else if (arg === "--source-registry") args.sourceRegistryPath = argv[++index];
    else if (arg === "--rights-registry") args.rightsRegistryPath = argv[++index];
    else if (arg === "--write-report") args.writeReport = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  process.stdout.write(`Usage: node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs scripts/validate-second-round-reference-answer-packages.mjs [options]\n\nValidates the S207 appraiser second-round reference answer package schema, no-official-answer guardrails, source/evidence anchors, subject validation sections, and deterministic package report.\n\nOptions:\n  --registry <path>                     Reference answer package registry path\n  --report <path>                       Deterministic package report path\n  --canonical-question-registry <path>  S203 canonical question registry path\n  --source-registry <path>              S202 source registry path\n  --rights-registry <path>              S202 rights registry path\n  --write-report                        Regenerate the deterministic package report\n  --json                                Print the generated package report JSON\n`);
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }

  const registryModule = await import(registryModuleUrl);
  const registry = registryModule.loadSecondRoundReferenceAnswerPackageRegistry(args);
  const report = registryModule.buildSecondRoundReferenceAnswerPackageReport(registry, args);

  if (args.writeReport) {
    await writeJson(args.reportPath, report);
  }

  registryModule.loadSecondRoundReferenceAnswerPackageReport(args);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    "S207 reference answer package registry validation passed.",
    `packages=${report.totals.packageCount}`,
    `released=${report.totals.releasedPackageCount}`,
    `blocked=${report.totals.blockedPackageCount}`,
    `openBlockingReleaseBlockers=${report.totals.openBlockingReleaseBlockerCount}`,
    `unresolvedBlockingUncertainty=${report.totals.unresolvedBlockingUncertaintyCount}`,
  ].join(" "));
  process.stdout.write("\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

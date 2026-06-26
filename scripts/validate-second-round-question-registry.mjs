#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRegistryPath = "reference_corpus/question_archive/second/appraiser_second_round_canonical_questions.json";
const defaultReportPath = "reference_corpus/question_archive/second/appraiser_second_round_ingestion_report.json";
const defaultSourceRegistryPath = "reference_corpus/official_materials/appraiser/second_round_source_registry.json";
const defaultRightsRegistryPath = "reference_corpus/official_materials/appraiser/second_round_rights_registry.json";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryModuleUrl = pathToFileURL(
  path.join(repoRoot, "lib", "review-os", "second-round-question-registry.ts"),
).href;

function parseArgs(argv) {
  const args = {
    registryPath: defaultRegistryPath,
    ingestionReportPath: defaultReportPath,
    sourceRegistryPath: defaultSourceRegistryPath,
    rightsRegistryPath: defaultRightsRegistryPath,
    json: false,
    writeReport: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry") args.registryPath = argv[++index];
    else if (arg === "--report") args.ingestionReportPath = argv[++index];
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
  process.stdout.write(`Usage: node --experimental-strip-types scripts/validate-second-round-question-registry.mjs [options]\n\nValidates the S203 canonical 감정평가사 2차 question schema, source linkage, metadata-only boundary, and deterministic ingestion report.\n\nOptions:\n  --registry <path>          Canonical question registry path\n  --report <path>            Deterministic ingestion report path\n  --source-registry <path>   S202 source registry path\n  --rights-registry <path>   S202 rights registry path\n  --write-report             Regenerate the deterministic ingestion report\n  --json                     Print the generated ingestion report JSON\n`);
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
  const registry = registryModule.loadSecondRoundCanonicalQuestionRegistry(args);
  const report = registryModule.buildSecondRoundQuestionIngestionReport(registry, args);

  if (args.writeReport) {
    await writeJson(args.ingestionReportPath, report);
  }

  registryModule.loadSecondRoundQuestionIngestionReport(args);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    "S203 canonical question registry validation passed.",
    `questions=${report.totals.canonicalQuestionCount}`,
    `sourceSkeletons=${report.totals.sourceSkeletonCount}`,
    `s202MetadataEligible=${report.totals.s202MetadataEligibleSourceCount}`,
    `problemTextEligible=${report.totals.s202ProblemTextEligibleSourceCount}`,
    `learnerPublicationEligible=${report.totals.s202LearnerPublicationEligibleSourceCount}`,
  ].join(" "));
  process.stdout.write("\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

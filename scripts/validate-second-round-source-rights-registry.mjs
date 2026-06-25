#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultSourceRegistryPath = "reference_corpus/official_materials/appraiser/second_round_source_registry.json";
const defaultRightsRegistryPath = "reference_corpus/official_materials/appraiser/second_round_rights_registry.json";
const defaultCoverageReportPath = "reference_corpus/official_materials/appraiser/second_round_coverage_report.json";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryModuleUrl = pathToFileURL(
  path.join(repoRoot, "lib", "review-os", "second-round-source-rights-registry.ts"),
).href;

function parseArgs(argv) {
  const args = {
    sourceRegistryPath: defaultSourceRegistryPath,
    rightsRegistryPath: defaultRightsRegistryPath,
    coverageReportPath: defaultCoverageReportPath,
    json: false,
    writeCoverage: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--source-registry") args.sourceRegistryPath = argv[++index];
    else if (arg === "--rights-registry") args.rightsRegistryPath = argv[++index];
    else if (arg === "--coverage-report") args.coverageReportPath = argv[++index];
    else if (arg === "--json") args.json = true;
    else if (arg === "--write-coverage") args.writeCoverage = true;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  process.stdout.write(`Usage: node --experimental-strip-types scripts/validate-second-round-source-rights-registry.mjs [options]\n\nValidates the S202 appraiser 2차 source registry, rights registry, and deterministic coverage report.\n\nOptions:\n  --source-registry <path>   Source registry path\n  --rights-registry <path>   Rights registry path\n  --coverage-report <path>   Coverage report path\n  --write-coverage           Regenerate the deterministic coverage report\n  --json                     Print the generated coverage report JSON\n`);
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

  const registry = await import(registryModuleUrl);
  const reference = registry.loadSecondRoundSourceRightsRegistry({
    sourceRegistryPath: args.sourceRegistryPath,
    rightsRegistryPath: args.rightsRegistryPath,
  });
  const report = registry.buildSecondRoundCoverageReport(reference, {
    sourceRegistryPath: args.sourceRegistryPath,
    rightsRegistryPath: args.rightsRegistryPath,
  });

  if (args.writeCoverage) {
    await writeJson(args.coverageReportPath, report);
  }

  registry.loadSecondRoundCoverageReport({
    sourceRegistryPath: args.sourceRegistryPath,
    rightsRegistryPath: args.rightsRegistryPath,
    coverageReportPath: args.coverageReportPath,
  });

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    "S202 source/rights registry validation passed.",
    `sources=${reference.sourceRegistry.sourceArtifacts.length}`,
    `rights=${reference.rightsRegistry.rightsDecisions.length}`,
    `expectedSlots=${report.totals.expectedSourceSlots}`,
    `gaps=${report.totals.gapCount}`,
    `learnerPublicationEligible=${report.totals.learnerPublicationEligibleCount}`,
  ].join(" "));
  process.stdout.write("\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

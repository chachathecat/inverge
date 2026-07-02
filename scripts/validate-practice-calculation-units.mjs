#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRegistryPath = "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_units.json";
const defaultReportPath = "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_unit_report.json";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryModuleUrl = pathToFileURL(
  path.join(repoRoot, "lib", "review-os", "practice-calculation-unit-registry.ts"),
).href;

function parseArgs(argv) {
  const args = {
    registryPath: defaultRegistryPath,
    reportPath: defaultReportPath,
    json: false,
    writeReport: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry") args.registryPath = argv[++index];
    else if (arg === "--report") args.reportPath = argv[++index];
    else if (arg === "--write-report") args.writeReport = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function printHelp() {
  process.stdout.write(`Usage: node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs scripts/validate-practice-calculation-units.mjs [options]\n\nValidates the S210 appraiser second-round practice calculation unit registry, OCR confidence gates, supported calculation types, GIII reset-safe metadata, data-boundary guardrails, and deterministic metadata-only report.\n\nOptions:\n  --registry <path>      Practice calculation unit registry path\n  --report <path>        Deterministic validation report path\n  --write-report         Regenerate the deterministic validation report\n  --json                 Print the generated validation report JSON\n`);
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
  const registry = registryModule.loadPracticeCalculationUnitRegistry(args);
  const report = registryModule.buildPracticeCalculationUnitReport(registry, args);

  if (args.writeReport) {
    await writeJson(args.reportPath, report);
  }

  registryModule.loadPracticeCalculationUnitReport(args);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    "S210 practice calculation unit registry validation passed.",
    `units=${report.totals.unitCount}`,
    `supportedMetadata=${report.totals.supportedMetadataUnitCount}`,
    `releaseAllowed=${report.totals.releaseAllowedUnitCount}`,
    `blockedRelease=${report.totals.blockedReleaseUnitCount}`,
    `ocrConfidenceGates=${report.totals.ocrConfidenceGateCount}`,
    `giiiRoutines=${report.totals.giiiRoutineCount}`,
  ].join(" "));
  process.stdout.write("\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

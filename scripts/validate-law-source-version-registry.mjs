#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRegistryPath = "reference_corpus/legal_sources/appraiser_second_round_law_sources.json";
const defaultReportPath = "reference_corpus/legal_sources/appraiser_second_round_law_source_report.json";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryModuleUrl = pathToFileURL(
  path.join(repoRoot, "lib", "review-os", "law-source-version-registry.ts"),
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
  process.stdout.write(`Usage: node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs scripts/validate-law-source-version-registry.mjs [options]\n\nValidates the S208 appraiser second-round law source corpus, source anchors, exam-date version checks, legal-source blockers, and deterministic report.\n\nOptions:\n  --registry <path>      Law source version registry path\n  --report <path>        Deterministic law source report path\n  --write-report         Regenerate the deterministic report\n  --json                 Print the generated report JSON\n`);
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
  const registry = registryModule.loadLawSourceVersionRegistry(args);
  const report = registryModule.buildLawSourceVersionReport(registry, args);

  if (args.writeReport) {
    await writeJson(args.reportPath, report);
  }

  registryModule.loadLawSourceVersionReport(args);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    "S208 law source version registry validation passed.",
    `lawSources=${report.totals.lawSourceCount}`,
    `anchors=${report.totals.sourceAnchorCount}`,
    `examDateChecks=${report.totals.examDateVersionCheckCount}`,
    `needsOfficialVerification=${report.totals.needsOfficialVerificationCount}`,
    `openBlockingBlockers=${report.totals.openBlockingBlockerCount}`,
  ].join(" "));
  process.stdout.write("\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

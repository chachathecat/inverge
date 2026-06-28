#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRegistryPath = "reference_corpus/theory_sources/appraiser_second_round_theory_concepts.json";
const defaultReportPath = "reference_corpus/theory_sources/appraiser_second_round_theory_concept_report.json";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryModuleUrl = pathToFileURL(
  path.join(repoRoot, "lib", "review-os", "theory-concept-corpus-registry.ts"),
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
  process.stdout.write(`Usage: node --experimental-strip-types --loader ./tests/ts-extension-loader.mjs scripts/validate-theory-concept-corpus.mjs [options]\n\nValidates the S209 appraiser second-round theory concept corpus, metadata boundary, concept graph, downstream blockers, and deterministic report.\n\nOptions:\n  --registry <path>      Theory concept corpus registry path\n  --report <path>        Deterministic theory concept report path\n  --write-report         Regenerate the deterministic report\n  --json                 Print the generated report JSON\n`);
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
  const registry = registryModule.loadTheoryConceptCorpusRegistry(args);
  const report = registryModule.buildTheoryConceptCorpusReport(registry, args);

  if (args.writeReport) {
    await writeJson(args.reportPath, report);
  }

  registryModule.loadTheoryConceptCorpusReport(args);

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write([
    "S209 theory concept corpus validation passed.",
    `concepts=${report.totals.conceptCount}`,
    `anchors=${report.totals.conceptAnchorCount}`,
    `relations=${report.totals.conceptRelationCount}`,
    `needsOfficialVerification=${report.totals.needsOfficialVerificationCount}`,
    `openBlockingBlockers=${report.totals.openBlockingBlockerCount}`,
  ].join(" "));
  process.stdout.write("\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});

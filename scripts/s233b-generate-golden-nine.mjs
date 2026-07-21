#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildS233BGoldenNine,
  buildS233BGoldenReport,
  buildS233BS214CompatibilityRegistry,
  buildS233BS215CompatibilityRegistry,
} from "../lib/review-os/s233b-golden-answer-packs.ts";

const DEFAULT_OUTPUT_DIR = "reference_corpus/reference_answers/second";

function parseArguments(argv) {
  const args = { sourceSnapshotPath: null, lawSnapshotPath: null, outputDirectory: DEFAULT_OUTPUT_DIR };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--source-snapshot") args.sourceSnapshotPath = argv[++index];
    else if (argv[index] === "--law-snapshot") args.lawSnapshotPath = argv[++index];
    else if (argv[index] === "--output-dir") args.outputDirectory = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!args.sourceSnapshotPath || !args.lawSnapshotPath) {
    throw new Error("--source-snapshot and --law-snapshot are required");
  }
  return args;
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function generateS233BGoldenNine({ sourceSnapshotPath, lawSnapshotPath, outputDirectory }) {
  const [sourceSnapshot, lawSnapshot] = await Promise.all([
    readFile(sourceSnapshotPath, "utf8").then(JSON.parse),
    readFile(lawSnapshotPath, "utf8").then(JSON.parse),
  ]);
  const registry = buildS233BGoldenNine(sourceSnapshot, lawSnapshot);
  const report = buildS233BGoldenReport(registry, sourceSnapshot);
  const s214 = buildS233BS214CompatibilityRegistry(registry);
  const s215 = buildS233BS215CompatibilityRegistry(registry);
  await mkdir(outputDirectory, { recursive: true });
  const outputs = {
    registry: path.join(outputDirectory, "s233b_golden_answer_packs.json"),
    report: path.join(outputDirectory, "s233b_golden_answer_pack_report.json"),
    s214: path.join(outputDirectory, "s233b_s214_pipeline_records.json"),
    s215: path.join(outputDirectory, "s233b_s215_release_gate_records.json"),
  };
  await Promise.all([
    writeJson(outputs.registry, registry),
    writeJson(outputs.report, report),
    writeJson(outputs.s214, s214),
    writeJson(outputs.s215, s215),
  ]);
  return { outputs, registry, report };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const result = await generateS233BGoldenNine(parseArguments(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify({
      registryVersion: result.registry.registryVersion,
      packCount: result.report.totals.packCount,
      releasedCount: result.report.totals.releasedCount,
      outputs: result.outputs,
    })}\n`);
  } catch {
    process.stderr.write(`${JSON.stringify({
      code: "S233B_GOLDEN_NINE_GENERATION_FAILED_CLOSED",
      message: "Golden 9 generation requires complete verified source and law snapshots",
    })}\n`);
    process.exitCode = 1;
  }
}

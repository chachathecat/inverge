import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildPracticeCalculationUnitReport,
  loadPracticeCalculationUnitRegistry,
  loadPracticeCalculationUnitReport,
} from "../lib/review-os/practice-calculation-unit-registry.ts";

const defaultPaths = {
  registry: "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_units.json",
  report: "reference_corpus/practice_sources/appraiser_second_round_practice_calculation_unit_report.json",
  docs: "docs/s210-practice-calculation-unit-validator.md",
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

async function makeFixtureConfig({ registryMutator = () => {}, validate = true } = {}) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "s210-practice-calculation-units-"));
  const registry = clone(await readJson(defaultPaths.registry));
  registryMutator(registry);

  const registryPath = path.join(fixtureDir, "practice_calculation_units.json");
  const reportPath = path.join(fixtureDir, "practice_calculation_unit_report.json");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");

  const config = { registryPath, reportPath };
  if (validate) {
    const loadedRegistry = loadPracticeCalculationUnitRegistry(config);
    const report = buildPracticeCalculationUnitReport(loadedRegistry, config);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  return config;
}

test("S210 default practice calculation registry loads as metadata-only and keeps issue, roadmap, and PR metadata distinct", () => {
  const registry = loadPracticeCalculationUnitRegistry();
  const report = loadPracticeCalculationUnitReport();

  assert.equal(registry.registryScope, "appraiser_second_round_practice_only");
  assert.equal(registry.storagePolicy.metadataOnly, true);
  assert.equal(registry.storagePolicy.rawLearnerAnswerStored, false);
  assert.equal(registry.storagePolicy.rawOcrTextStored, false);
  assert.equal(registry.storagePolicy.providerPayloadStored, false);
  assert.equal(registry.boundaryPolicy.runtimeOcrCalled, false);
  assert.equal(registry.boundaryPolicy.providerApiCalled, false);
  assert.equal(registry.boundaryPolicy.learnerRuntimeChanged, false);

  assert.equal(registry.coordination.targetIssueNumber, 509);
  assert.equal(registry.coordination.roadmapItemId, "S210");
  assert.equal(registry.coordination.prBodyClosingReference, "Closes #509");
  assert.notEqual(registry.coordination.roadmapItemId, `S${registry.coordination.targetIssueNumber}`);

  assert.equal(report.totals.unitCount, 1);
  assert.equal(report.totals.supportedMetadataUnitCount, 1);
  assert.equal(report.totals.releaseAllowedUnitCount, 0);
  assert.equal(report.totals.blockedReleaseUnitCount, 1);
  assert.equal(report.metadataOnly, true);
  assert.equal(report.safeUse, "s210_practice_calculation_unit_contract_only");
});

test("S210 validator accepts a supported metadata-only practice calculation unit", async () => {
  const config = await makeFixtureConfig();
  const registry = loadPracticeCalculationUnitRegistry(config);
  const report = loadPracticeCalculationUnitReport(config);
  const [unit] = registry.units;

  assert.equal(unit.subject, "practice");
  assert.equal(unit.calculationType, "income_capitalization");
  assert.equal(unit.support.status, "supported_metadata_only");
  assert.equal(unit.ocrPolicy.minimumOverallConfidence, 0.98);
  assert.equal(unit.ocrPolicy.minimumFieldConfidence, 0.95);
  assert.equal(unit.unitCheck.status, "metadata_ready");
  assert.equal(unit.roundingCheck.status, "metadata_ready");
  assert.equal(unit.independentRecalculation.reviewerCountRequired, 2);
  assert.equal(unit.giiiRoutine.calculatorModel, "casio_fx_9860giii");
  assert.equal(unit.giiiRoutine.storedProgramDependencyAllowed, false);
  assert.equal(unit.giiiRoutine.handKeyedSequenceMetadata.sequenceStored, false);
  assert.equal(unit.releaseGate.releaseAllowed, false);
  assert.equal(report.totals.giiiRoutineCount, 1);
});

test("S210 CLI validates the committed deterministic report", () => {
  const cli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "scripts/validate-practice-calculation-units.mjs",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /S210 practice calculation unit registry validation passed/);
});

test("S210 validation fails closed for unsupported calculation types", async () => {
  const config = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      registry.units[0].calculationType = "unsupported_freeform_projection";
    },
  });

  assert.throws(
    () => loadPracticeCalculationUnitRegistry(config),
    /calculationType has unsupported value/,
  );
});

test("S210 validation fails closed when OCR confidence or release metadata is insufficient", async () => {
  const lowConfidence = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      registry.units[0].ocrPolicy.minimumOverallConfidence = 0.75;
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(lowConfidence),
    /minimumOverallConfidence must be >= 0\.98/,
  );

  const releaseAllowed = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      registry.units[0].releaseGate.releaseAllowed = true;
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(releaseAllowed),
    /releaseAllowed must be false/,
  );

  const missingReason = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      registry.units[0].releaseGate.reasonCodes = ["source_level_validator_only"];
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(missingReason),
    /runtime_ocr_not_run/,
  );
});

test("S210 validation requires formula, unit, rounding, and independent recalculation metadata", async () => {
  const missingFormula = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      delete registry.units[0].formulaMetadata;
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(missingFormula),
    /formulaMetadata/,
  );

  const missingUnitDimension = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      registry.units[0].unitCheck.dimensions = [];
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(missingUnitDimension),
    /dimensions must contain at least one unit dimension/,
  );

  const missingRounding = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      delete registry.units[0].roundingCheck;
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(missingRounding),
    /roundingCheck/,
  );

  const weakRecalculation = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      registry.units[0].independentRecalculation.reviewerCountRequired = 1;
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(weakRecalculation),
    /reviewerCountRequired must be >= 2/,
  );
});

test("S210 validation rejects stored-program dependency and missing GIII hand-keyed metadata", async () => {
  const storedProgram = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      registry.units[0].giiiRoutine.storedProgramDependencyAllowed = true;
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(storedProgram),
    /storedProgramDependencyAllowed/,
  );

  const missingHandKeyedMetadata = await makeFixtureConfig({
    validate: false,
    registryMutator(registry) {
      delete registry.units[0].giiiRoutine.handKeyedSequenceMetadata;
    },
  });
  assert.throws(
    () => loadPracticeCalculationUnitRegistry(missingHandKeyedMetadata),
    /handKeyedSequenceMetadata/,
  );
});

test("S210 validation rejects raw learner, OCR, problem, answer, provider, private, and credential content", async () => {
  const mutations = [
    ["rawLearnerAnswer", (unit) => { unit.rawLearnerAnswer = "unsafe learner content"; }],
    ["ocrText", (unit) => { unit.ocrText = "unsafe OCR content"; }],
    ["problemText", (unit) => { unit.problemText = "unsafe problem content"; }],
    ["answerText", (unit) => { unit.answerText = "unsafe answer content"; }],
    ["providerPayload", (unit) => { unit.providerPayload = { body: "unsafe provider payload" }; }],
    ["privateContent", (unit) => { unit.privateContent = "unsafe private content"; }],
    ["token", (unit) => { unit.sourceAnchorIds = ["token: ghp_should_not_escape12345"]; }],
  ];

  for (const [label, mutateUnit] of mutations) {
    const config = await makeFixtureConfig({
      validate: false,
      registryMutator(registry) {
        mutateUnit(registry.units[0]);
      },
    });
    assert.throws(
      () => loadPracticeCalculationUnitRegistry(config),
      /forbidden raw|credential-like|secret-like|stable lowercase metadata id/,
      label,
    );
  }
});

test("S210 generated report is deterministic metadata-only artifact", () => {
  const cli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--loader",
    "./tests/ts-extension-loader.mjs",
    "scripts/validate-practice-calculation-units.mjs",
    "--json",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(cli.status, 0, cli.stderr);
  const report = JSON.parse(cli.stdout);
  assert.equal(report.metadataOnly, true);
  assert.equal(report.storagePolicy.metadataOnly, true);
  assert.equal(report.storagePolicy.rawLearnerAnswerStored, false);
  assert.equal(report.storagePolicy.rawOcrTextStored, false);
  assert.equal(report.storagePolicy.providerPayloadStored, false);
  assert.equal(report.totals.releaseAllowedUnitCount, 0);
  assert.deepEqual(report.unitIds, ["s210_synthetic_income_capitalization_unit"]);
  assert.doesNotMatch(JSON.stringify(report), /unsafe learner content|unsafe OCR content|unsafe provider payload|ghp_should_not_escape/i);
});

test("S210 docs describe source-level scope, validation, and rollback limits", async () => {
  const docs = await readFile(defaultPaths.docs, "utf8");
  for (const token of ["S210", "#509", "metadata-only", "casio_fx_9860giii", "Stored-program dependency is rejected"]) {
    assert.match(docs, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(docs, /No provider calls/);
  assert.match(docs, /No runtime OCR calls/);
  assert.match(docs, /Rollback/);
});

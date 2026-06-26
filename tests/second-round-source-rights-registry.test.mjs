import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildSecondRoundCoverageReport,
  loadSecondRoundCoverageReport,
  loadSecondRoundSourceRightsRegistry,
} from "../lib/review-os/second-round-source-rights-registry.ts";

const defaultPaths = {
  source: "reference_corpus/official_materials/appraiser/second_round_source_registry.json",
  rights: "reference_corpus/official_materials/appraiser/second_round_rights_registry.json",
  coverage: "reference_corpus/official_materials/appraiser/second_round_coverage_report.json",
};

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function makeFixtureConfig(mutator = () => {}) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "s202-source-rights-"));
  const docs = {
    source: await readJson(defaultPaths.source),
    rights: await readJson(defaultPaths.rights),
    coverage: await readJson(defaultPaths.coverage),
  };
  mutator(docs);

  const sourceRegistryPath = path.join(fixtureDir, "second_round_source_registry.json");
  const rightsRegistryPath = path.join(fixtureDir, "second_round_rights_registry.json");
  const coverageReportPath = path.join(fixtureDir, "second_round_coverage_report.json");
  await mkdir(fixtureDir, { recursive: true });
  await writeFile(sourceRegistryPath, `${JSON.stringify(docs.source, null, 2)}\n`, "utf8");
  await writeFile(rightsRegistryPath, `${JSON.stringify(docs.rights, null, 2)}\n`, "utf8");
  await writeFile(coverageReportPath, `${JSON.stringify(docs.coverage, null, 2)}\n`, "utf8");
  return { sourceRegistryPath, rightsRegistryPath, coverageReportPath };
}

test("S202 second-round source and rights registries load as metadata-only fail-closed records", () => {
  const reference = loadSecondRoundSourceRightsRegistry();
  const report = loadSecondRoundCoverageReport();
  const sources = reference.sourceRegistry.sourceArtifacts;
  const rights = reference.rightsRegistry.rightsDecisions;

  assert.equal(reference.sourceRegistry.registryScope, "appraiser_second_round_only");
  assert.equal(reference.rightsRegistry.registryScope, "appraiser_second_round_only");
  assert.equal(sources.length, 16);
  assert.equal(rights.length, 16);
  assert.deepEqual([...new Set(sources.map((source) => source.subject))].sort(), ["law", "practice", "theory"]);
  assert.equal(sources.every((source) => source.officialSourceId === "qnet_appraiser_past_questions"), true);
  assert.equal(sources.every((source) => source.officialUrl.startsWith("https://www.q-net.or.kr/")), true);
  assert.equal(sources.every((source) => source.hashStatus === "not_fetched"), true);
  assert.equal(sources.every((source) => source.fileHashSha256 === undefined), true);
  assert.equal(sources.every((source) => source.extractionStatus === "metadata_only"), true);
  assert.equal(rights.every((decision) => decision.rightsStatus === "needs_legal_review"), true);
  assert.equal(rights.every((decision) => decision.displayMode === "metadata_and_link"), true);

  assert.equal(report.totals.expectedSourceSlots, 18);
  assert.equal(report.totals.registeredSourceCount, 16);
  assert.equal(report.totals.missingSourceCount, 2);
  assert.equal(report.totals.rightsBlockedCount, 16);
  assert.equal(report.totals.gapCount, 18);
  assert.equal(report.totals.metadataEligibleForS203Count, 16);
  assert.equal(report.totals.problemTextEligibleForS203Count, 0);
  assert.equal(report.totals.learnerPublicationEligibleCount, 0);
  assert.deepEqual(report.totals.rightsStatusCounts, { needs_legal_review: 18 });

  const missingSlots = report.matrix
    .filter((entry) => entry.gapStatus === "not_found")
    .map((entry) => `${entry.examYear}:${entry.examRound}:${entry.subject}`)
    .sort();
  assert.deepEqual(missingSlots, ["2021:32:law", "2021:32:theory"]);

  assert.equal(report.matrix.every((entry) => entry.s203Consumption.problemTextEligible === false), true);
  assert.equal(report.matrix.every((entry) => entry.s203Consumption.learnerPublicationEligible === false), true);
});

test("S202 coverage report is deterministic and CLI-checkable", () => {
  const reference = loadSecondRoundSourceRightsRegistry();
  const report = loadSecondRoundCoverageReport();
  assert.deepEqual(report, buildSecondRoundCoverageReport(reference));

  const cli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "scripts/validate-second-round-source-rights-registry.mjs",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /S202 source\/rights registry validation passed/);

  const jsonCli = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "scripts/validate-second-round-source-rights-registry.mjs",
    "--json",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(jsonCli.status, 0, jsonCli.stderr);
  assert.deepEqual(JSON.parse(jsonCli.stdout), report);
});

test("S202 rights validation rejects broad display while legal review is unresolved", async () => {
  const config = await makeFixtureConfig((docs) => {
    docs.rights.rightsDecisions[0].displayMode = "full_text";
  });

  assert.throws(
    () => loadSecondRoundSourceRightsRegistry(config),
    /needs_legal_review must not permit full_text/,
  );
});

test("S202 source validation rejects fabricated or placeholder artifact hashes", async () => {
  const config = await makeFixtureConfig((docs) => {
    docs.source.sourceArtifacts[0].hashStatus = "verified";
    docs.source.sourceArtifacts[0].retrievedAt = "2026-06-25";
    docs.source.sourceArtifacts[0].fileHashSha256 = "0".repeat(64);
  });

  assert.throws(
    () => loadSecondRoundSourceRightsRegistry(config),
    /placeholder hash/,
  );
});

test("S202 validation rejects raw content fields and learner publication when rights are blocked", async () => {
  const rawFieldConfig = await makeFixtureConfig((docs) => {
    docs.source.sourceArtifacts[0].questionText = "raw official question body must never be committed";
  });
  assert.throws(
    () => loadSecondRoundSourceRightsRegistry(rawFieldConfig),
    /questionText/,
  );

  const publicationConfig = await makeFixtureConfig((docs) => {
    docs.rights.rightsDecisions[0].learnerFacingPublicationAllowed = true;
  });
  assert.throws(
    () => loadSecondRoundSourceRightsRegistry(publicationConfig),
    /learner-facing publication is blocked/,
  );
});

test("S202 validation rejects unsupported source identity and first-round subject leakage", async () => {
  const unknownSourceConfig = await makeFixtureConfig((docs) => {
    docs.source.sourceArtifacts[0].officialSourceId = "unknown_official_source";
  });
  assert.throws(
    () => loadSecondRoundSourceRightsRegistry(unknownSourceConfig),
    /officialSourceId must exist/,
  );

  const firstRoundConfig = await makeFixtureConfig((docs) => {
    docs.source.sourceArtifacts[0].subject = "first";
  });
  assert.throws(
    () => loadSecondRoundSourceRightsRegistry(firstRoundConfig),
    /subject has unsupported value first/,
  );
});

test("S202 committed artifacts contain no raw binaries, question bodies, answer bodies, or local filenames", async () => {
  const tracked = spawnSync("git", ["ls-files"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(tracked.status, 0, tracked.stderr);
  const trackedFiles = tracked.stdout.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, "/"));
  assert.equal(
    trackedFiles.some((file) => (
      file.startsWith("reference_corpus/official_materials/appraiser/")
      && /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|webp)$/i.test(file)
    )),
    false,
  );

  const serialized = JSON.stringify({
    source: await readJson(defaultPaths.source),
    rights: await readJson(defaultPaths.rights),
    coverage: await readJson(defaultPaths.coverage),
  });
  const forbiddenFields = [
    "problemText",
    "questionText",
    "answerText",
    "officialAnswer",
    "modelAnswer",
    "sourceText",
    "rawOcrText",
    "learnerAnswer",
    "thirdPartyAcademyContent",
    "localFileName",
    "sourceFileName",
  ];
  for (const field of forbiddenFields) {
    assert.equal(serialized.includes(`"${field}"`), false, `${field} must not be present`);
  }
  assert.doesNotMatch(serialized, /\.(?:pdf|hwp|hwpx|docx?|zip|png|jpe?g|webp)\b/i);
});

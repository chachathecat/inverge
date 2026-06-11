import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildQnetReferenceSignalsForMetadata,
  getQnetMaterialBySourceId,
  getQnetTopicFrequencySignals,
  listQnetMaterialsByExamMode,
  listQnetMaterialsBySubject,
  loadQnetAppraiserMaterialsIndex,
  loadQnetAppraiserOfficialMaterialsReference,
  loadQnetAppraiserSourceMap,
  loadQnetAppraiserTopicFrequency,
} from "../lib/review-os/qnet-official-materials-reference.ts";

const registryUrl = "https://www.q-net.or.kr/cst003.do?gId=31&gSite=L&id=cst00309";
const defaultPaths = {
  index: "reference_corpus/official_materials/appraiser/qnet_appraiser_materials_index.json",
  sourceMap: "reference_corpus/official_materials/appraiser/qnet_appraiser_source_map.json",
  topicFrequency: "reference_corpus/official_materials/appraiser/qnet_appraiser_topic_frequency.json",
  registry: "reference_corpus/curriculum/appraiser/official_sources.json",
};
const forbiddenSerializedFields = [
  "problemText",
  "questionText",
  "answerText",
  "officialAnswer",
  "officialAnswerBody",
  "ocrFullText",
  "sourceExcerpt",
  "score",
  "passFail",
  "instructorComment",
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function makeFixtureConfig(mutator = () => {}) {
  const fixtureDir = await mkdtemp(path.join(tmpdir(), "qnet-reference-loader-"));
  const sourceDir = path.join(fixtureDir, "official_materials");
  const registryPath = path.join(fixtureDir, "official_sources.json");
  await mkdir(sourceDir, { recursive: true });

  const docs = {
    index: await readJson(defaultPaths.index),
    sourceMap: await readJson(defaultPaths.sourceMap),
    topicFrequency: await readJson(defaultPaths.topicFrequency),
    registry: await readJson(defaultPaths.registry),
  };
  mutator(docs);

  await writeFile(path.join(sourceDir, "qnet_appraiser_materials_index.json"), `${JSON.stringify(docs.index, null, 2)}\n`, "utf8");
  await writeFile(path.join(sourceDir, "qnet_appraiser_source_map.json"), `${JSON.stringify(docs.sourceMap, null, 2)}\n`, "utf8");
  await writeFile(path.join(sourceDir, "qnet_appraiser_topic_frequency.json"), `${JSON.stringify(docs.topicFrequency, null, 2)}\n`, "utf8");
  await writeFile(registryPath, `${JSON.stringify(docs.registry, null, 2)}\n`, "utf8");

  return {
    sourceDir,
    officialSourceRegistryPath: registryPath,
  };
}

test("Q-Net appraiser official materials load through typed metadata-only helpers", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  assert.ok(reference.materialsIndex.materials.length >= 5);
  assert.equal(reference.sourceMap.sources.length, 1);
  assert.ok(reference.topicFrequency.topicFrequency.length > 0);
  assert.equal(reference.officialSource.sourceUrl, registryUrl);

  assert.deepEqual(loadQnetAppraiserMaterialsIndex(), reference.materialsIndex);
  assert.deepEqual(loadQnetAppraiserSourceMap(), reference.sourceMap);
  assert.deepEqual(loadQnetAppraiserTopicFrequency(), reference.topicFrequency);

  for (const document of [reference.materialsIndex, reference.sourceMap, reference.topicFrequency]) {
    assert.equal(document.storagePolicy.rawTextStored, false);
    assert.equal(document.storagePolicy.copyrightedTextStored, false);
    assert.equal(document.storagePolicy.metadataOnly, true);
  }
  for (const material of reference.materialsIndex.materials) {
    assert.equal(material.rawTextStored, false);
    assert.equal(material.copyrightedTextStored, false);
    assert.equal(material.sourceUrl, registryUrl);
    assert.equal(material.officialSourceId, "qnet_appraiser_past_questions");
    assert.match(material.localRawFileNameHash, /^[a-f0-9]{64}$/);
    assert.equal(Object.prototype.hasOwnProperty.call(material, "localFileName"), false);
  }

  const materialSourceIds = new Set(reference.materialsIndex.materials.map((material) => material.sourceId));
  for (const source of reference.sourceMap.sources) {
    assert.equal(source.materialCount, reference.materialsIndex.materials.length);
    assert.ok(source.sourceIds.every((sourceId) => materialSourceIds.has(sourceId)));
  }
  for (const topic of reference.topicFrequency.topicFrequency) {
    assert.ok(topic.sourceIds.every((sourceId) => materialSourceIds.has(sourceId)));
  }
});

test("Q-Net material lookup helpers filter by exam mode, subject, and source id", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const firstMaterials = listQnetMaterialsByExamMode("first", reference);
  const secondMaterials = listQnetMaterialsByExamMode("second", reference);
  assert.equal(firstMaterials.length, reference.materialsIndex.materials.filter((material) => material.examMode === "first").length);
  assert.equal(secondMaterials.length, reference.materialsIndex.materials.filter((material) => material.examMode === "second").length);
  assert.ok(firstMaterials.length >= 2);
  assert.ok(secondMaterials.length >= 3);
  assert.ok(firstMaterials.every((material) => material.examMode === "first"));
  assert.ok(secondMaterials.every((material) => material.examMode === "second"));

  const subjectFixture = secondMaterials.find((material) => material.answerSkeletonTags.length > 0);
  assert.ok(subjectFixture);
  const subjectMaterials = listQnetMaterialsBySubject(subjectFixture.subject, reference);
  assert.ok(subjectMaterials.length >= 1);
  assert.ok(subjectMaterials.every((material) => material.subject === subjectFixture.subject));
  assert.deepEqual(getQnetMaterialBySourceId(subjectFixture.sourceId, reference), subjectFixture);
  assert.equal(getQnetMaterialBySourceId("missing-source-id", reference), null);
});

test("Q-Net appraiser 2022 round 33 batch includes five metadata-only source papers", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const materials2022 = reference.materialsIndex.materials.filter((material) => (
    material.examYear === 2022 && material.examRound === 33
  ));
  const materials2023 = reference.materialsIndex.materials.filter((material) => (
    material.examYear === 2023 && material.examRound === 34
  ));
  const expectedSubjects = [...new Set(materials2023.map((material) => material.subject))].sort();
  const batchSubjects = [...new Set(materials2022.map((material) => material.subject))].sort();
  const topicLabels = new Set(materials2022.flatMap((material) => material.topicCandidates));

  assert.equal(materials2022.length, 5);
  assert.deepEqual(batchSubjects, expectedSubjects);
  assert.equal(materials2022.filter((material) => material.examMode === "first").length, 2);
  assert.equal(materials2022.filter((material) => material.examMode === "second").length, 3);
  assert.equal(new Set(materials2022.map((material) => material.localRawFileNameHash)).size, 5);

  for (const material of materials2022) {
    assert.equal(material.itemType, "source_paper");
    assert.equal(material.sourceStatus, "verified");
    assert.equal(material.needsOfficialVerification, false);
    assert.equal(material.rawTextStored, false);
    assert.equal(material.copyrightedTextStored, false);
    assert.match(material.localRawFileNameHash, /^[a-f0-9]{64}$/);
    assert.equal(Object.prototype.hasOwnProperty.call(material, "localFileName"), false);
    assert.equal(Object.prototype.hasOwnProperty.call(material, "sourceFileName"), false);
  }

  for (const label of [
    "compensation appraisal",
    "capitalization rate",
    "standard land price legal nature",
    "appraiser qualification cancellation",
    "first exam paper 1",
    "first exam paper 2",
  ]) {
    assert.equal(topicLabels.has(label), true, `2022 batch should include ${label}`);
  }

  const serialized = JSON.stringify(materials2022);
  assert.doesNotMatch(serialized, /\.pdf\b|\.hwp\b|\.hwpx\b|\.docx\b|\.zip\b|\.png\b|\.jpe?g\b|\.webp\b/i);
  for (const field of forbiddenSerializedFields) {
    assert.equal(serialized.includes(`"${field}"`), false, `${field} must not be emitted`);
  }
});

test("Q-Net reference signals expose only safe metadata for future ranking integrations", () => {
  const reference = loadQnetAppraiserOfficialMaterialsReference();
  const fixture = reference.materialsIndex.materials.find((material) => material.answerSkeletonTags.length > 0);
  assert.ok(fixture);

  const topicSignals = getQnetTopicFrequencySignals({
    examMode: fixture.examMode,
    subject: fixture.subject,
    topicCandidates: [fixture.topicCandidates[0]],
  }, reference);
  assert.ok(topicSignals.length >= 1);
  assert.ok(topicSignals.every((signal) => signal.rawTextStored === false && signal.copyrightedTextStored === false));
  assert.ok(topicSignals.some((signal) => signal.sourceIds.includes(fixture.sourceId)));

  const signals = buildQnetReferenceSignalsForMetadata({
    examMode: fixture.examMode,
    subject: fixture.subject,
    topicCandidates: [fixture.topicCandidates[0]],
    curriculumNodeCandidates: [fixture.curriculumNodeCandidates[0]],
    trapWordCandidates: [fixture.trapWordCandidates[0]],
    answerSkeletonTags: [fixture.answerSkeletonTags[0]],
  }, reference);

  assert.equal(signals.rawTextStored, false);
  assert.equal(signals.copyrightedTextStored, false);
  assert.equal(signals.metadataOnly, true);
  assert.equal(signals.safeUse, "metadata_reference_only");
  assert.ok(signals.sourceIds.includes(fixture.sourceId));
  assert.ok(signals.sourceUrls.every((url) => url === registryUrl));
  assert.ok(signals.topicCandidates.includes(fixture.topicCandidates[0]));
  assert.ok(signals.curriculumNodeCandidates.includes(fixture.curriculumNodeCandidates[0]));
  assert.ok(signals.trapPatternCandidates.includes(fixture.trapWordCandidates[0]));
  assert.ok(signals.answerSkeletonTags.includes(fixture.answerSkeletonTags[0]));
  assert.ok(signals.issueCandidates.length > 0);

  const serialized = JSON.stringify(signals);
  for (const field of forbiddenSerializedFields) {
    assert.equal(serialized.includes(`"${field}"`), false, `${field} must not be emitted`);
  }
});

test("Q-Net reference loader rejects raw, scoring, or copyrighted storage fields", async () => {
  const rawFieldConfig = await makeFixtureConfig((docs) => {
    docs.index.materials[0].problemText = "raw source body must never be accepted";
  });
  assert.throws(
    () => loadQnetAppraiserOfficialMaterialsReference(rawFieldConfig),
    /problemText/,
  );

  const rawPolicyConfig = await makeFixtureConfig((docs) => {
    docs.index.materials[0].rawTextStored = true;
  });
  assert.throws(
    () => loadQnetAppraiserOfficialMaterialsReference(rawPolicyConfig),
    /rawTextStored/,
  );

  const scoringConfig = await makeFixtureConfig((docs) => {
    docs.topicFrequency.topicFrequency[0].score = 100;
  });
  assert.throws(
    () => loadQnetAppraiserOfficialMaterialsReference(scoringConfig),
    /score/,
  );
});

test("Q-Net reference loader rejects source URL mismatches against official source registry", async () => {
  const config = await makeFixtureConfig((docs) => {
    docs.index.materials[0].sourceUrl = "https://example.com/not-qnet";
  });

  assert.throws(
    () => loadQnetAppraiserOfficialMaterialsReference(config),
    /sourceUrl must match official source registry/,
  );
});

test("Q-Net reference loader source avoids raw material readers and learner-facing archive behavior", async () => {
  const source = await readFile("lib/review-os/qnet-official-materials-reference.ts", "utf8");
  const forbiddenImplementationTerms = [
    "local_official_materials",
    "qnet_manifest.json",
    ".pdf",
    ".hwp",
    ".hwpx",
    ".docx",
    ".zip",
    "public archive",
    "official grading",
    "pass/fail",
    "score prediction",
  ];

  for (const term of forbiddenImplementationTerms) {
    assert.equal(source.includes(term), false, `loader must not include ${term}`);
  }
});

test("Q-Net metadata batch does not track local official materials or raw official binaries", () => {
  const result = spawnSync("git", ["ls-files"], { cwd: process.cwd(), encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  const trackedFiles = result.stdout.split(/\r?\n/).filter(Boolean).map((file) => file.replace(/\\/g, "/"));

  assert.equal(trackedFiles.some((file) => file.startsWith("local_official_materials/")), false);
  assert.equal(trackedFiles.some((file) => /(^|\/)qnet_manifest\.json$/i.test(file)), false);
  assert.equal(
    trackedFiles.some((file) => (
      /(?:^|\/)(?:qnet|official|raw[-_]official|official[-_]raw|local[-_]official)[^/]*\.(?:pdf|zip|hwp|hwpx|docx?|png|jpe?g|webp)$/i.test(file)
    )),
    false,
  );
});

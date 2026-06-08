import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = "scripts/ingest-qnet-appraiser-materials.mjs";
const registryUrl = "https://www.q-net.or.kr/cst003.do?gId=31&gSite=L&id=cst00309";
const forbiddenFields = [
  "problemText",
  "questionText",
  "answerText",
  "officialAnswer",
  "modelAnswer",
  "sourceText",
  "rawOcrText",
  "copyrightedText",
  "fullQuestion",
  "fullAnswer",
  "score",
  "passFail",
  "instructorComment",
];

async function makeTempPaths() {
  const dir = await mkdtemp(path.join(tmpdir(), "qnet-appraiser-ingest-"));
  return {
    dir,
    manifest: path.join(dir, "qnet_manifest.json"),
    index: path.join(dir, "qnet_appraiser_materials_index.json"),
    frequency: path.join(dir, "qnet_appraiser_topic_frequency.json"),
    sourceMap: path.join(dir, "qnet_appraiser_source_map.json"),
    registry: path.join(dir, "official_sources.json"),
  };
}

function baseManifestItem(overrides = {}) {
  return {
    localFileName: "2025_36_appraiser_second_past_questions.pdf",
    sourceKind: "past_questions",
    examYear: 2025,
    examRound: 36,
    examMode: "second",
    subject: "감정평가 및 보상법규",
    paper: "2차",
    questionNumber: "1",
    itemType: "essay",
    topicCandidates: ["사업인정", "처분성", "권리구제"],
    curriculumNodeCandidates: ["second_law_admin_litigation"],
    issueCandidates: ["사업인정의 법적 성질", "항고소송 가능성"],
    trapWordCandidates: ["처분성 판단 누락"],
    answerSkeletonTags: ["문제점", "의의", "법적 성질", "권리구제", "사안 해결"],
    calculationTemplateCandidates: [],
    casioRelevant: false,
    estimatedMinutes: 50,
    difficultyBand: "high",
    sourceStatus: "verified",
    needsOfficialVerification: false,
    officialSourceId: "qnet_appraiser_past_questions",
    officialSourceUrl: registryUrl,
    notes: "Manual metadata labels checked.",
    ...overrides,
  };
}

async function writeManifest(paths, itemOrItems) {
  const items = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
  await writeFile(paths.manifest, JSON.stringify({
    manifestName: "local manual Q-Net metadata review",
    items,
  }), "utf8");
}

async function runIngest(paths, options = {}) {
  return execFileAsync(process.execPath, [
    scriptPath,
    "--manifest",
    paths.manifest,
    "--output",
    paths.index,
    "--topic-frequency-output",
    paths.frequency,
    "--source-map-output",
    paths.sourceMap,
  ], options);
}

async function assertIngestRejects(paths, matcher, options) {
  await assert.rejects(
    runIngest(paths, options),
    (error) => {
      matcher(String(error.stderr ?? ""));
      return true;
    },
  );
}

test("Q-Net appraiser ingestion emits metadata only, registry source metadata, and safe notes", async () => {
  const paths = await makeTempPaths();
  await writeManifest(paths, baseManifestItem());

  const { stdout } = await runIngest(paths);
  assert.match(stdout, /Ingested 1 Q-Net appraiser metadata record/);

  const index = JSON.parse(await readFile(paths.index, "utf8"));
  assert.equal(index.storagePolicy.rawTextStored, false);
  assert.equal(index.storagePolicy.copyrightedTextStored, false);
  assert.equal(index.materials.length, 1);
  assert.equal(index.materials[0].rawTextStored, false);
  assert.equal(index.materials[0].copyrightedTextStored, false);
  assert.equal(index.materials[0].sourceName, "Q-Net 기출문제 내려받기");
  assert.equal(index.materials[0].sourceKind, "past_questions");
  assert.equal(index.materials[0].sourceUrl, registryUrl);
  assert.equal(index.materials[0].safeNotes, "Manual metadata labels checked.");
  assert.equal(index.materials[0].notes, undefined);
  assert.equal(index.materials[0].localFileName, undefined);
  assert.match(index.materials[0].localRawFileNameHash, /^[a-f0-9]{64}$/);

  const serialized = JSON.stringify(index);
  assert.equal(serialized.includes("2025_36_appraiser_second_past_questions.pdf"), false);
  for (const field of forbiddenFields) {
    assert.equal(serialized.includes(`"${field}"`), false, `${field} must not be emitted`);
  }

  const frequency = JSON.parse(await readFile(paths.frequency, "utf8"));
  assert.deepEqual(frequency.topicFrequency.map((entry) => entry.topic).sort(), ["권리구제", "사업인정", "처분성"].sort());
  assert.ok(frequency.topicFrequency.every((entry) => entry.rawTextStored === false && entry.copyrightedTextStored === false));

  const sourceMap = JSON.parse(await readFile(paths.sourceMap, "utf8"));
  assert.equal(sourceMap.sources[0].officialSourceId, "qnet_appraiser_past_questions");
  assert.equal(sourceMap.sources[0].sourceUrl, registryUrl);
  assert.equal(sourceMap.sources[0].materialCount, 1);
});

test("Q-Net appraiser ingestion rejects manifest official source URL mismatches", async () => {
  const paths = await makeTempPaths();
  await writeManifest(paths, baseManifestItem({ officialSourceUrl: "https://example.com/stale-qnet-url" }));

  await assertIngestRejects(paths, (stderr) => {
    assert.match(stderr, /officialSourceUrl must match official_sources\.json/);
    assert.match(stderr, /cannot override registry metadata/);
  });
});

test("Q-Net appraiser ingestion rejects manifest sourceUrl overrides and keeps source map canonical", async () => {
  const paths = await makeTempPaths();
  const overrideUrl = "https://example.com/override";
  await writeManifest(paths, baseManifestItem({ sourceUrl: overrideUrl }));

  await assertIngestRejects(paths, (stderr) => {
    assert.match(stderr, /sourceUrl must match official_sources\.json/);
    assert.match(stderr, /cannot override registry metadata/);
  });

  await writeManifest(paths, baseManifestItem({ sourceUrl: registryUrl }));
  await runIngest(paths);

  const index = JSON.parse(await readFile(paths.index, "utf8"));
  const sourceMap = JSON.parse(await readFile(paths.sourceMap, "utf8"));
  assert.equal(index.materials[0].sourceUrl, registryUrl);
  assert.notEqual(index.materials[0].sourceUrl, overrideUrl);
  assert.equal(sourceMap.sources[0].sourceUrl, registryUrl);
  assert.notEqual(sourceMap.sources[0].sourceUrl, overrideUrl);
});

test("Q-Net appraiser ingestion rejects unknown officialSourceId", async () => {
  const paths = await makeTempPaths();
  await writeManifest(paths, baseManifestItem({ officialSourceId: "unknown_qnet_source", officialSourceUrl: undefined }));

  await assertIngestRejects(paths, (stderr) => {
    assert.match(stderr, /officialSourceId must match the official source registry/);
  });
});

test("Q-Net appraiser ingestion rejects non-HTTPS registry URLs", async () => {
  const paths = await makeTempPaths();
  await writeFile(paths.registry, JSON.stringify({
    sources: [
      {
        id: "qnet_appraiser_past_questions",
        sourceName: "Q-Net 기출문제 내려받기",
        sourceUrl: "http://www.q-net.or.kr/insecure",
        sourceKind: "past_questions",
        lastCheckedAt: "2026-06-08",
      },
    ],
  }), "utf8");
  await writeManifest(paths, baseManifestItem({ officialSourceUrl: undefined }));

  await assertIngestRejects(paths, (stderr) => {
    assert.match(stderr, /sourceUrl must be an https URL in official_sources\.json/);
  }, { env: { ...process.env, QNET_APPRAISER_OFFICIAL_SOURCE_REGISTRY_PATH: paths.registry } });
});

test("Q-Net appraiser ingestion rejects forbidden raw or scoring fields", async () => {
  const paths = await makeTempPaths();
  await writeManifest(paths, baseManifestItem({
    localFileName: "bad.pdf",
    subject: "감정평가이론",
    topicCandidates: ["시장가치"],
    issueCandidates: ["기준가치 구분"],
    sourceStatus: "draft",
    needsOfficialVerification: true,
    problemText: "raw source body must never be committed",
    score: 100,
  }));

  await assertIngestRejects(paths, (stderr) => {
    assert.match(stderr, /problemText/);
    assert.match(stderr, /score/);
  });
});

test("Q-Net appraiser ingestion rejects unsafe notes", async () => {
  const cases = [
    ["raw problem-like excerpt", "다음 중 감정평가에 관한 설명으로 옳은 것은?"],
    ["party and currency fact pattern", "갑은 을에게 1억원 지급 의무를 부담한다"],
    ["answer explanation body", "정답은 3번이다. 따라서 처분성이 인정되고 항고소송으로 다투어야 한다."],
    ["long note", "A".repeat(121)],
    ["newline-heavy note", "one\ntwo\nthree"],
  ];

  for (const [label, notes] of cases) {
    const paths = await makeTempPaths();
    await writeManifest(paths, baseManifestItem({ notes }));
    await assertIngestRejects(paths, (stderr) => {
      assert.match(stderr, /items\[0\]\.notes/, label);
    });
  }
});

test("Q-Net appraiser ingestion can emit empty outputs without reading raw files", async () => {
  const paths = await makeTempPaths();
  const { stdout } = await execFileAsync(process.execPath, [
    scriptPath,
    "--manifest",
    paths.manifest,
    "--output",
    paths.index,
    "--topic-frequency-output",
    paths.frequency,
    "--source-map-output",
    paths.sourceMap,
    "--allow-missing-manifest",
  ]);
  assert.match(stdout, /Ingested 0 Q-Net appraiser metadata record/);
  const index = JSON.parse(await readFile(paths.index, "utf8"));
  assert.deepEqual(index.materials, []);
});

test("Q-Net official materials schema declares allowed metadata and forbidden raw fields", async () => {
  const schema = JSON.parse(await readFile("reference_corpus/official_materials/appraiser/qnet_appraiser_ingestion_schema.json", "utf8"));
  for (const field of ["sourceId", "officialSourceId", "localRawFileNameHash", "topicCandidates", "issueCandidates", "rawTextStored", "copyrightedTextStored", "safeNotes"]) {
    assert.ok(schema.allowedFields.includes(field), `schema should allow ${field}`);
  }
  assert.equal(schema.allowedFields.includes("notes"), false);
  for (const field of forbiddenFields) {
    assert.ok(schema.forbiddenFields.includes(field), `schema should forbid ${field}`);
  }
  assert.equal(schema.storagePolicy.rawTextStored, false);
  assert.equal(schema.storagePolicy.copyrightedTextStored, false);
});

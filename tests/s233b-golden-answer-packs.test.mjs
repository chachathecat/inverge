import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  buildS233BGoldenNine,
  buildS233BGoldenReport,
  buildS233BS214CompatibilityRegistry,
  buildS233BS215CompatibilityRegistry,
  canonicalJson,
  validateS233BGoldenRegistry,
} from "../lib/review-os/s233b-golden-answer-packs.ts";
import {
  validateS233AnswerPackIdentity,
  validateS233AnswerPackRegistryContext,
} from "../lib/review-os/s233-parallel-execution-contract.ts";
import { generateS233BGoldenNine } from "../scripts/s233b-generate-golden-nine.mjs";

const SOURCE_PATH = "reference_corpus/question_archive/second/s233b_official_source_snapshot.json";

async function officialSourceSnapshot() {
  return JSON.parse(await readFile(SOURCE_PATH, "utf8"));
}

function fixtureLawSnapshot() {
  const laws = [
    ["law-source-land-compensation-act", "공익사업을 위한 토지 등의 취득 및 보상에 관한 법률", "009295", "300001", "21001"],
    ["law-source-admin-litigation-act", "행정소송법", "001218", "300002", "21002"],
    ["law-source-appraiser-act", "감정평가 및 감정평가사에 관한 법률", "012651", "300003", "21003"],
    ["law-source-real-estate-price-disclosure-act", "부동산 가격공시에 관한 법률", "001827", "300004", "21004"],
  ];
  return {
    schemaVersion: "s233b.exam_date_law_snapshot.v1",
    registryVersion: "s233b.law.exam-date.2026-07-04.fixture00000001",
    acquiredAt: "2026-07-21T12:00:00.000Z",
    examDate: "2026-07-04",
    sourceRegistryVersion: "s233b.qnet.second_round.fixture.v1",
    versions: laws.map(([lawSourceId, officialTitleKo, officialLsId, officialMst, number], index) => ({
      lawVersionId: `${lawSourceId}:2025-01-01:${number}`,
      lawSourceId,
      officialTitleKo,
      officialLsId,
      officialMst,
      officialLsiSeq: officialMst,
      versionStatus: "verified",
      examDateApplicability: "applicable_to_exam_date",
      examDate: "2026-07-04",
      effectiveDate: "2025-01-01",
      contentHashSha256: String(index + 1).repeat(64),
    })),
  };
}

test("builds exactly nine ordered Answer Pack 2.0 identities with truthful blocked release states", async () => {
  const source = await officialSourceSnapshot();
  const registry = buildS233BGoldenNine(source, fixtureLawSnapshot());
  const expectedIds = ["practice", "theory", "law"].flatMap((subject) => [1, 2, 3]
    .map((questionNo) => `s233b-golden-2026-${subject}-q${questionNo}`));

  assert.equal(registry.packs.length, 9);
  assert.deepEqual(registry.packs.map((pack) => pack.packId), expectedIds);
  assert.equal(registry.packs.every((pack) => pack.verificationState === "source_grounded_study_answer"), true);
  assert.equal(registry.packs.every((pack) => pack.releaseState === "blocked_pending_domain_answer_validation"), true);
  assert.equal(registry.s214PipelineRecords.every((record) => record.status === "blocked"), true);
  assert.equal(registry.s215GateRecords.every((record) => record.status === "blocked" && record.unresolvedBlockerCodes.length > 0), true);
  assert.equal(new Set(registry.packs.map((pack) => pack.identity.contentHashSha256)).size, 9);

  for (const pack of registry.packs) {
    assert.equal(validateS233AnswerPackIdentity(pack.identity).valid, true);
    assert.equal(validateS233AnswerPackRegistryContext(pack.identity, pack.registryContext).valid, true);
    assert.equal(pack.identity.releaseProof, null);
    assert.equal(pack.identity.expertReview.approved, false);
    assert.equal(pack.questionSourceBinding.derivedLearningMaterial.answerProseStored, false);
    assert.match(pack.questionSourceBinding.structuralAnchorSha256, /^[a-f0-9]{64}$/u);
  }
});

test("binds each Golden Pack to the exact official question source and only its required law versions", async () => {
  const source = await officialSourceSnapshot();
  const law = fixtureLawSnapshot();
  const registry = buildS233BGoldenNine(source, law);
  const lawQ1 = registry.packs.find((pack) => pack.packId === "s233b-golden-2026-law-q1");
  const lawQ2 = registry.packs.find((pack) => pack.packId === "s233b-golden-2026-law-q2");
  const lawQ3 = registry.packs.find((pack) => pack.packId === "s233b-golden-2026-law-q3");
  assert.deepEqual(lawQ1.questionSourceBinding.lawSourceIds, ["law-source-land-compensation-act"]);
  assert.deepEqual(lawQ2.questionSourceBinding.lawSourceIds, [
    "law-source-admin-litigation-act",
    "law-source-appraiser-act",
    "law-source-real-estate-price-disclosure-act",
  ]);
  assert.deepEqual(lawQ3.questionSourceBinding.lawSourceIds, ["law-source-real-estate-price-disclosure-act"]);
  assert.equal(registry.packs.filter((pack) => pack.identity.subject !== "law")
    .every((pack) => pack.identity.snapshot.lawRegistryVersion === null
      && pack.identity.snapshot.lawVersionIds.length === 0
      && pack.identity.snapshot.lawVersionStatus === "not_applicable"), true);
});

test("Golden 9 generation is byte-deterministic and compatibility reports preserve all blockers", async () => {
  const source = await officialSourceSnapshot();
  const law = fixtureLawSnapshot();
  const first = buildS233BGoldenNine(source, law);
  const second = buildS233BGoldenNine(structuredClone(source), structuredClone(law));
  assert.equal(canonicalJson(first), canonicalJson(second));
  const report = buildS233BGoldenReport(first, source);
  const s214 = buildS233BS214CompatibilityRegistry(first);
  const s215 = buildS233BS215CompatibilityRegistry(first);
  assert.equal(report.totals.packCount, 9);
  assert.equal(report.totals.verifiedLearningReferenceCount, 0);
  assert.equal(report.totals.releasedCount, 0);
  assert.equal(report.rights.licenseId, "KOGL-TYPE-1");
  assert.equal(report.rights.attributionRequired, true);
  assert.equal(s214.records.length, 9);
  assert.equal(s215.records.length, 9);
  assert.equal(s215.records.every((record) => record.unresolvedBlockerCodes.length > 0), true);
});

test("generation fails closed when a required law or KOGL attribution evidence is absent", async () => {
  const source = await officialSourceSnapshot();
  const missingLaw = fixtureLawSnapshot();
  missingLaw.versions.pop();
  assert.throws(() => buildS233BGoldenNine(source, missingLaw), /complete four-law exam-date snapshot/u);

  const missingAttribution = structuredClone(source);
  missingAttribution.rightsEvidence.attributionRequired = false;
  assert.throws(() => buildS233BGoldenNine(missingAttribution, fixtureLawSnapshot()), /KOGL Type 1 attribution/u);
});

test("registry validation rejects any fabricated release or verified-learning-reference state", async () => {
  const registry = buildS233BGoldenNine(await officialSourceSnapshot(), fixtureLawSnapshot());
  const fabricated = structuredClone(registry);
  fabricated.packs[0].verificationState = "verified_learning_reference";
  assert.throws(() => validateS233BGoldenRegistry(fabricated), /overclaims/u);

  const released = structuredClone(registry);
  released.s215GateRecords[0].status = "released";
  released.s215GateRecords[0].unresolvedBlockerCodes = [];
  assert.throws(() => validateS233BGoldenRegistry(released), /S215 compatibility records/u);
});

test("file generator emits the same four deterministic registries on repeated generation", async () => {
  const outputOne = path.join(process.cwd(), "s233b-test-output-one");
  const outputTwo = path.join(process.cwd(), "s233b-test-output-two");
  const lawPath = path.join(process.cwd(), "tests", "s233b-law-snapshot-fixture.generated.json");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(lawPath, `${JSON.stringify(fixtureLawSnapshot(), null, 2)}\n`, "utf8");
  try {
    await generateS233BGoldenNine({ sourceSnapshotPath: SOURCE_PATH, lawSnapshotPath: lawPath, outputDirectory: outputOne });
    await generateS233BGoldenNine({ sourceSnapshotPath: SOURCE_PATH, lawSnapshotPath: lawPath, outputDirectory: outputTwo });
    for (const fileName of [
      "s233b_golden_answer_packs.json",
      "s233b_golden_answer_pack_report.json",
      "s233b_s214_pipeline_records.json",
      "s233b_s215_release_gate_records.json",
    ]) {
      const [left, right] = await Promise.all([
        readFile(path.join(outputOne, fileName), "utf8"),
        readFile(path.join(outputTwo, fileName), "utf8"),
      ]);
      assert.equal(left, right);
    }
  } finally {
    await Promise.all([
      rm(outputOne, { recursive: true, force: true }),
      rm(outputTwo, { recursive: true, force: true }),
      rm(lawPath, { force: true }),
    ]);
  }
});

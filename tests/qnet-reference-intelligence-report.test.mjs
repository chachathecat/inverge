import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";

import {
  assertQnetReferenceIntelligenceReportIsSafe,
  buildQnetReferenceIntelligenceReport,
  loadQnetReferenceForReport,
} from "../scripts/summarize-qnet-reference-intelligence.mjs";

const expectedSubjects = [
  "감정평가사 1차",
  "감정평가실무",
  "감정평가이론",
  "감정평가 및 보상법규",
];

test("Q-Net reference intelligence report summarizes committed metadata only", async () => {
  const reference = await loadQnetReferenceForReport();
  const report = buildQnetReferenceIntelligenceReport(reference, {
    generatedAt: "2026-06-10T00:00:00.000Z",
  });

  assert.equal(report.schemaVersion, "1.0.0");
  assert.equal(report.reportType, "qnet_reference_intelligence_qa");
  assert.equal(report.materialCount, 20);
  assert.equal(report.sourceMapSourceCount, 1);
  assert.equal(report.sourceMapMaterialCount, 20);
  assert.equal(report.topicFrequencyEntryCount, 88);
  assert.deepEqual(report.officialSourceIds, ["qnet_appraiser_past_questions"]);
  assert.deepEqual(report.years, [2022, 2023, 2024, 2025]);
  assert.deepEqual(report.rounds, [33, 34, 35, 36]);
  assert.deepEqual(report.examModeCounts, { first: 8, second: 12 });
  assert.deepEqual(report.subjectCounts, {
    "감정평가사 1차": 8,
    "감정평가실무": 4,
    "감정평가이론": 4,
    "감정평가 및 보상법규": 4,
  });
  assert.deepEqual(report.yearRoundCoverage, [
    {
      examYear: 2022,
      examRound: 33,
      materialCount: 5,
      firstCount: 2,
      secondCount: 3,
      subjects: expectedSubjects,
    },
    {
      examYear: 2023,
      examRound: 34,
      materialCount: 5,
      firstCount: 2,
      secondCount: 3,
      subjects: expectedSubjects,
    },
    {
      examYear: 2024,
      examRound: 35,
      materialCount: 5,
      firstCount: 2,
      secondCount: 3,
      subjects: expectedSubjects,
    },
    {
      examYear: 2025,
      examRound: 36,
      materialCount: 5,
      firstCount: 2,
      secondCount: 3,
      subjects: expectedSubjects,
    },
  ]);
  assert.ok(report.topicFrequencySummary.length > 0);
  assert.ok(report.topicFrequencySummary.length <= 12);
  assert.ok(report.topicFrequencySummary.every((entry) => !Object.hasOwn(entry, "sourceIds")));
  assert.ok(report.topicFrequencySummary.every((entry) => entry.count >= 1));
  assert.equal(report.metadataOnly, true);
  assert.equal(report.safeUse, "qnet_reference_intelligence_qa_only");

  assertQnetReferenceIntelligenceReportIsSafe(report);
});

test("Q-Net reference intelligence report confirms 2024 second integrated logical sections without exposing hashes", async () => {
  const reference = await loadQnetReferenceForReport();
  const report = buildQnetReferenceIntelligenceReport(reference, {
    generatedAt: "2026-06-10T00:00:00.000Z",
  });
  const integrated2024 = report.secondIntegratedSourceChecks.find((entry) => (
    entry.examYear === 2024 && entry.examRound === 35
  ));

  assert.ok(integrated2024);
  assert.equal(integrated2024.logicalSectionCount, 3);
  assert.equal(integrated2024.materialCount, 3);
  assert.deepEqual(integrated2024.subjects, [
    "감정평가실무",
    "감정평가이론",
    "감정평가 및 보상법규",
  ]);
  assert.equal(integrated2024.samePhysicalSourceHash, true);
  assert.equal(integrated2024.metadataOnly, true);

  const serialized = JSON.stringify(integrated2024);
  assert.equal(serialized.includes("localRawFileNameHash"), false);
  assert.equal(/[a-f0-9]{64}/.test(serialized), false);
});

test("Q-Net reference intelligence safety flags stay true and output avoids raw or scoring fields", async () => {
  const reference = await loadQnetReferenceForReport();
  const report = buildQnetReferenceIntelligenceReport(reference, {
    generatedAt: "2026-06-10T00:00:00.000Z",
  });

  assert.deepEqual(Object.values(report.safety), Object.values(report.safety).map(() => true));
  assert.deepEqual(report.warnings, []);

  const serialized = JSON.stringify(report);
  const forbiddenTerms = [
    "problemText",
    "questionText",
    "answerText",
    "officialAnswer",
    "officialAnswerBody",
    "modelAnswer",
    "ocrFullText",
    "sourceExcerpt",
    "localFileName",
    "localRawFileName",
    "officialScore",
    "predictedScore",
    "passFail",
    "passGuarantee",
    "qnet_manifest.json",
    "local_official_materials",
  ];
  for (const term of forbiddenTerms) {
    assert.equal(serialized.includes(term), false, `report must not include ${term}`);
  }
  assert.doesNotMatch(serialized, /\.pdf\b|\.hwp\b|\.hwpx\b|\.docx\b|\.zip\b/i);
  assert.doesNotMatch(serialized, /official grading|score prediction|model answer|pass[-/]fail|pass guarantee/i);
});

test("Q-Net reference intelligence CLI prints the same safe aggregate report", () => {
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "scripts/summarize-qnet-reference-intelligence.mjs",
  ], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);

  const report = JSON.parse(result.stdout);
  assert.equal(report.reportType, "qnet_reference_intelligence_qa");
  assert.equal(report.materialCount, 20);
  assert.equal(report.sourceMapMaterialCount, 20);
  assert.equal(report.topicFrequencyEntryCount, 88);
  assert.deepEqual(report.warnings, []);
  assert.deepEqual(Object.values(report.safety), Object.values(report.safety).map(() => true));
});

test("Q-Net reference intelligence report source avoids raw material readers and learner-facing archive claims", async () => {
  const source = await readFile("scripts/summarize-qnet-reference-intelligence.mjs", "utf8");
  const forbiddenImplementationTerms = [
    "local_official_materials",
    "qnet_manifest.json",
    ".pdf",
    ".hwp",
    ".hwpx",
    ".docx",
    ".zip",
    "public archive",
    "problem bank",
    "official grading",
    "pass/fail",
    "score prediction",
  ];

  for (const term of forbiddenImplementationTerms) {
    assert.equal(source.includes(term), false, `report script must not include ${term}`);
  }
});

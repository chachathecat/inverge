import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadSecondRoundOfficialRegistryReference,
  summarizeSecondRoundOfficialRegistry,
} from "../lib/review-os/official-syllabus-registry.ts";
import { loadSecondExamCurriculum } from "../lib/review-os/curriculum-reference.ts";

const sourceDir = "reference_corpus/curriculum/appraiser";
const annualNoticePath = "reference_corpus/curriculum/appraiser/annual_notices/2026.json";
const annualOnlyFieldNames = [
  "applicationStartDate",
  "applicationEndDate",
  "documentSubmissionStartDate",
  "documentSubmissionEndDate",
  "examDate",
  "examRound",
  "examYear",
  "noticePublishedAt",
  "noticeYear",
  "resultAnnouncementStartDate",
  "resultAnnouncementEndDate",
];
const forbiddenSerializedFields = [
  "rawNoticeText",
  "rawQuestionText",
  "rawAnswerText",
  "rawLearnerText",
  "problemText",
  "questionText",
  "answerText",
  "officialAnswer",
  "modelAnswer",
  "learnerText",
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function makeFixture(mutator = () => {}) {
  const dir = await mkdtemp(path.join(tmpdir(), "s201-official-registry-"));
  const annualDir = path.join(dir, "annual_notices");
  await mkdir(annualDir, { recursive: true });

  const docs = {
    officialSources: await readJson(path.join(sourceDir, "official_sources.json")),
    officialSyllabus: await readJson(path.join(sourceDir, "official_syllabus.json")),
    examRules: await readJson(path.join(sourceDir, "exam_rules.json")),
    annualNotice: await readJson(annualNoticePath),
  };
  await mutator(docs);

  await writeFile(path.join(dir, "official_sources.json"), `${JSON.stringify(docs.officialSources, null, 2)}\n`, "utf8");
  await writeFile(path.join(dir, "official_syllabus.json"), `${JSON.stringify(docs.officialSyllabus, null, 2)}\n`, "utf8");
  await writeFile(path.join(dir, "exam_rules.json"), `${JSON.stringify(docs.examRules, null, 2)}\n`, "utf8");
  await writeFile(path.join(annualDir, "2026.json"), `${JSON.stringify(docs.annualNotice, null, 2)}\n`, "utf8");

  return dir;
}

async function assertFixtureRejected(mutator, matcher) {
  const dir = await makeFixture(mutator);
  assert.throws(
    () => loadSecondRoundOfficialRegistryReference({ sourceDir: dir, asOfDate: "2026-06-25" }),
    matcher,
  );
}

test("S201 official registry loads exact current 감정평가사 2차 subjects and verified metadata", () => {
  const reference = loadSecondRoundOfficialRegistryReference({ asOfDate: "2026-06-25" });

  assert.deepEqual(reference.summary.currentOfficialSubjects, [
    "감정평가실무",
    "감정평가이론",
    "감정평가 및 보상법규",
  ]);
  assert.equal(reference.summary.status, "current");
  assert.equal(reference.summary.officialSubjectCount, 3);
  assert.equal(reference.summary.currentRuleCount, 6);
  assert.deepEqual(reference.summary.annualNoticeYears, [2026]);
  assert.equal(reference.summary.staleVerifiedRecordIds.length, 0);
  assert.equal(reference.summary.unresolvedOfficialSourceConflicts, 0);

  const sourceIds = new Set(reference.officialSources.sources.map((source) => source.id));
  for (const record of [
    ...reference.officialSyllabus.qualificationStageRecords,
    ...reference.officialSyllabus.subjectRecords,
    ...reference.examRules.rules,
    ...reference.annualNotices.flatMap((notice) => notice.annualValues),
  ]) {
    assert.equal(record.status, "verified", `${record.id} should be verified`);
    assert.match(record.effectiveFrom, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(record.lastOfficialVerifiedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(record.needsManualRecheckBy, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(record.sourceIds.length > 0, `${record.id} should have sourceIds`);
    assert.ok(record.sourceIds.every((sourceId) => sourceIds.has(sourceId)), `${record.id} has unknown sourceIds`);
  }
});

test("S201 keeps stable syllabus/rules separate from annual notice values and editorial units", async () => {
  const officialSyllabus = await readJson(path.join(sourceDir, "official_syllabus.json"));
  const examRules = await readJson(path.join(sourceDir, "exam_rules.json"));
  const annualNotice = await readJson(annualNoticePath);
  const stableSerialized = JSON.stringify({ officialSyllabus, examRules });
  const annualSerialized = JSON.stringify(annualNotice);

  for (const fieldName of annualOnlyFieldNames) {
    assert.equal(stableSerialized.includes(`"${fieldName}"`), false, `${fieldName} must stay out of stable registries`);
  }
  assert.ok(annualNotice.annualValues.some((entry) => entry.valueKey === "exam_date"));
  assert.ok(annualNotice.annualValues.some((entry) => entry.valueKey === "application_window"));
  assert.equal(annualSerialized.includes("2026-07-04"), true);

  const secondExamCurriculum = loadSecondExamCurriculum();
  for (const subject of secondExamCurriculum.subjects) {
    assert.equal(subject.sourceStatus, "draft", `${subject.id} remains editorial`);
    assert.equal(subject.needsOfficialVerification, true, `${subject.id} is not an official syllabus record`);
  }
  for (const unit of secondExamCurriculum.subjects.flatMap((subject) => subject.units)) {
    assert.equal(unit.sourceStatus, "draft", `${unit.id} remains internal learning metadata`);
    assert.equal(unit.needsOfficialVerification, true, `${unit.id} must not be treated as official`);
  }
});

test("S201 registries do not contain raw official, answer, question, learner, or model-answer text fields", async () => {
  const serialized = JSON.stringify({
    officialSyllabus: await readJson(path.join(sourceDir, "official_syllabus.json")),
    examRules: await readJson(path.join(sourceDir, "exam_rules.json")),
    annualNotice: await readJson(annualNoticePath),
  });

  for (const field of forbiddenSerializedFields) {
    assert.equal(serialized.includes(`"${field}"`), false, `${field} must not be stored`);
  }
  assert.doesNotMatch(serialized, /공식\s*채점|공식\s*모범\s*답안|합격\s*확률|합격\s*보장|점수\s*예측/);
});

test("S201 loader rejects duplicate, unknown, stale, overlapping, annual-leak, and unsupported records", async () => {
  await assertFixtureRejected((docs) => {
    docs.officialSyllabus.subjectRecords[1].id = docs.officialSyllabus.subjectRecords[0].id;
  }, /duplicate ids/);

  await assertFixtureRejected((docs) => {
    docs.officialSyllabus.subjectRecords[0].sourceIds = ["unknown_source"];
  }, /unknown sourceId unknown_source/);

  await assertFixtureRejected((docs) => {
    docs.examRules.rules[0].needsManualRecheckBy = "2026-01-01";
  }, /stale verified records|verified record is stale/);

  await assertFixtureRejected((docs) => {
    docs.examRules.rules.push({
      ...structuredClone(docs.examRules.rules[0]),
      id: "overlapping_answer_method_fixture",
      effectiveFrom: docs.examRules.rules[0].effectiveFrom,
    });
  }, /overlapping effective ranges/);

  await assertFixtureRejected((docs) => {
    docs.examRules.rules[0].examDate = "2026-07-04";
  }, /annual-only field examDate/);

  await assertFixtureRejected((docs) => {
    docs.officialSyllabus.subjectRecords[0].status = "draft";
    docs.officialSyllabus.subjectRecords[0].productionFacing = true;
  }, /production-facing official facts must not be draft|production-facing official fact .* must be verified/);

  await assertFixtureRejected((docs) => {
    docs.examRules.unresolvedOfficialSourceConflicts.push({ id: "conflict" });
  }, /unresolved official source conflicts/);

  await assertFixtureRejected((docs) => {
    docs.annualNotice.noticeMetadata.rawNoticeText = "notice body must not be committed";
  }, /rawNoticeText/);

  await assertFixtureRejected((docs) => {
    docs.examRules.rules[0].value = { claim: "공식 채점" };
  }, /prohibited official grading/);
});

test("S201 summary reports current, draft, deprecated, stale, and unresolved counts", async () => {
  const reference = loadSecondRoundOfficialRegistryReference({ asOfDate: "2026-06-25" });
  const summary = summarizeSecondRoundOfficialRegistry(
    {
      ...reference.officialSyllabus,
      deprecatedRecords: [
        ...reference.officialSyllabus.deprecatedRecords,
        {
          ...reference.officialSyllabus.qualificationStageRecords[0],
          id: "deprecated_fixture",
          status: "deprecated",
          effectiveTo: "2026-01-01",
        },
      ],
      unresolvedOfficialSourceConflicts: [{ id: "conflict_fixture" }],
    },
    {
      ...reference.examRules,
      rules: [
        ...reference.examRules.rules,
        {
          ...reference.examRules.rules[0],
          id: "draft_fixture",
          status: "draft",
          needsManualRecheckBy: "2026-12-31",
        },
        {
          ...reference.examRules.rules[1],
          id: "needs_update_fixture",
          status: "needs_update",
          needsManualRecheckBy: "2026-12-31",
        },
      ],
    },
    [
      {
        ...reference.annualNotices[0],
        annualValues: [
          ...reference.annualNotices[0].annualValues,
          {
            ...reference.annualNotices[0].annualValues[0],
            id: "stale_fixture",
            needsManualRecheckBy: "2026-01-01",
          },
        ],
      },
    ],
    "2026-06-25",
  );

  assert.equal(summary.status, "needs_update");
  assert.equal(summary.draftRecords, 1);
  assert.equal(summary.needsUpdateRecords, 1);
  assert.equal(summary.deprecatedRecords, 1);
  assert.deepEqual(summary.staleVerifiedRecordIds, ["stale_fixture"]);
  assert.equal(summary.unresolvedOfficialSourceConflicts, 1);
});

test("official-source verification script includes S201 registry gates", () => {
  const output = execFileSync("node", ["scripts/check-official-source-verification.mjs"], { encoding: "utf8" });
  const parsed = JSON.parse(output);

  assert.equal(parsed.status, "passed_official_source_verification");
  assert.ok(parsed.verified.includes("s201_official_syllabus_registry_valid"));
  assert.ok(parsed.verified.includes("s201_exam_rule_registry_valid"));
  assert.ok(parsed.verified.includes("s201_annual_notice_registry_valid"));
  assert.deepEqual(parsed.summary.s201.currentOfficialSubjects, [
    "감정평가실무",
    "감정평가이론",
    "감정평가 및 보상법규",
  ]);
  assert.equal(parsed.summary.s201.ruleCount, 6);
  assert.deepEqual(parsed.summary.s201.annualNoticeYears, [2026]);
});

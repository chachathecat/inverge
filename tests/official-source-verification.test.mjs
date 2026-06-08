import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const registryPath = "reference_corpus/curriculum/appraiser/official_sources.json";
const curriculumPaths = [
  "reference_corpus/curriculum/appraiser/first_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/second_exam_curriculum.json",
  "reference_corpus/curriculum/appraiser/study_tracks.json",
  "reference_corpus/curriculum/appraiser/explanation_ladder.json",
];
const forbiddenFields = new Set([
  "rawOcrText",
  "rawAnswerText",
  "answerText",
  "problemText",
  "questionText",
  "sourceText",
  "copyrightedText",
  "officialAnswer",
  "modelAnswer",
  "score",
  "scorePrediction",
  "instructorComment",
]);
const forbiddenClaimPattern = /(official\s+grading|official\s+score|score\s+prediction|pass\s*\/\s*fail|model\s+answer|합격\s*보장|공식\s*채점|공식\s*점수|점수\s*예측|합격\s*\/\s*불합격|합불|공식\s*모범\s*답안|모범\s*답안)/i;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function collectSourceNodes(value, path = "root", output = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectSourceNodes(child, `${path}[${index}]`, output));
    return output;
  }
  if (!isRecord(value)) return output;
  if ("sourceStatus" in value) output.push({ node: value, path });
  for (const [key, child] of Object.entries(value)) {
    collectSourceNodes(child, `${path}.${key}`, output);
  }
  return output;
}

function assertNoForbiddenBoundary(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoForbiddenBoundary(child, `${path}[${index}]`));
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string") {
      assert.doesNotMatch(value, forbiddenClaimPattern, `${path} contains prohibited official grading/score/pass-fail/model-answer/guarantee claim`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenFields.has(key), false, `${path}.${key} must not be stored`);
    assertNoForbiddenBoundary(child, `${path}.${key}`);
  }
}

test("official source registry includes verified Q-Net appraiser identity metadata", () => {
  assert.equal(existsSync(registryPath), true);
  const registry = readJson(registryPath);
  const qnetIdentity = registry.sources.find((source) => source.id === "qnet_appraiser_qualification_detail");
  assert.ok(qnetIdentity);
  assert.equal(qnetIdentity.verifiedFacts.qualificationNameKo, "감정평가사");
  assert.equal(qnetIdentity.verifiedFacts.qualificationNameEn, "Certified Appraiser");
  assert.equal(qnetIdentity.verifiedFacts.relatedMinistry, "국토교통부");
  assert.equal(qnetIdentity.verifiedFacts.administeringAgency, "한국산업인력공단");
});

test("curriculum and reference nodes include official-source status metadata", () => {
  const registry = readJson(registryPath);
  const sourceIds = new Set(registry.sources.map((source) => source.id));
  const allSourceNodes = curriculumPaths.flatMap((path) => collectSourceNodes(readJson(path), path));
  assert.ok(allSourceNodes.length > 0);

  for (const { node, path } of allSourceNodes) {
    assert.match(node.sourceStatus, /^(draft|verified|needs_update|deprecated)$/, `${path} sourceStatus is invalid`);
    if (node.sourceStatus === "draft") {
      assert.equal(node.needsOfficialVerification, true, `${path} draft node must remain explicitly non-authoritative`);
    }
    if (node.sourceStatus === "verified") {
      for (const field of ["officialSourceId", "officialSourceUrl", "officialSourceName", "officialSourceKind", "lastOfficialVerifiedAt", "verifiedBy"]) {
        assert.ok(node[field], `${path} verified node missing ${field}`);
      }
      assert.equal(node.needsOfficialVerification, false, `${path} verified node must not need verification`);
      assert.equal(sourceIds.has(node.officialSourceId), true, `${path} unknown source id`);
    }
  }
});

test("official-source metadata does not store raw question, answer, source, score, model-answer, or instructor fields", () => {
  assertNoForbiddenBoundary(readJson(registryPath), registryPath);
  for (const path of curriculumPaths) {
    assertNoForbiddenBoundary(readJson(path), path);
  }
});

test("official-source verifier rejects unknown officialSourceId and summarizes statuses", async () => {
  const verifier = await import("../lib/review-os/official-source-verification.ts");
  const unknownSourceResult = verifier.validateVerifiedCurriculumNode({
    id: "bad_verified_node",
    sourceStatus: "verified",
    needsOfficialVerification: false,
    officialSourceId: "unknown_source",
    officialSourceUrl: "https://example.com/source",
    officialSourceName: "Unknown source",
    officialSourceKind: "exam_info",
    lastOfficialVerifiedAt: "2026-06-08",
    verifiedBy: "test",
  });
  assert.equal(unknownSourceResult.valid, false);
  assert.match(unknownSourceResult.errors.join("\n"), /officialSourceId/);

  const sources = readJson(registryPath).sources;
  const summary = verifier.summarizeOfficialVerificationStatus(
    [
      { id: "verified", sourceStatus: "verified", officialSourceId: "qnet_appraiser_qualification_detail" },
      { id: "draft", sourceStatus: "draft" },
      { id: "update", sourceStatus: "needs_update" },
    ],
    sources,
  );
  assert.equal(summary.verifiedNodes, 1);
  assert.equal(summary.draftNodes, 1);
  assert.equal(summary.needsUpdateNodes, 1);
});

test("official-source verification script prints expected JSON contract", () => {
  const output = execFileSync("node", ["scripts/check-official-source-verification.mjs"], { encoding: "utf8" });
  const parsed = JSON.parse(output);
  assert.equal(parsed.status, "passed_official_source_verification");
  assert.deepEqual(parsed.verified, [
    "official_sources_registry_exists",
    "qnet_appraiser_identity_verified",
    "curriculum_nodes_have_source_status",
    "verified_nodes_have_source_metadata",
    "draft_nodes_marked_needs_verification",
    "no_raw_problem_text",
    "no_official_grading_claims",
  ]);
  assert.ok(parsed.summary.verifiedNodes >= 1);
  assert.ok(parsed.summary.draftNodes >= 1);
  assert.equal(typeof parsed.summary.needsUpdateNodes, "number");
});

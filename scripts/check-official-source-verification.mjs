import { existsSync, readFileSync } from "node:fs";

const registryPath = process.env.OFFICIAL_SOURCE_REGISTRY_PATH ?? "reference_corpus/curriculum/appraiser/official_sources.json";
const curriculumPaths = process.env.OFFICIAL_SOURCE_CURRICULUM_PATHS
  ? process.env.OFFICIAL_SOURCE_CURRICULUM_PATHS.split(",").filter(Boolean)
  : [
      "reference_corpus/curriculum/appraiser/first_exam_curriculum.json",
      "reference_corpus/curriculum/appraiser/second_exam_curriculum.json",
      "reference_corpus/curriculum/appraiser/study_tracks.json",
      "reference_corpus/curriculum/appraiser/explanation_ladder.json",
    ];
const statusValues = new Set(["draft", "verified", "needs_update", "deprecated"]);
const sourceKindValues = new Set([
  "qualification_detail",
  "exam_info",
  "public_notice",
  "exam_schedule",
  "past_questions",
  "final_answers",
  "statute_or_regulation",
  "operator",
]);
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

function collectObjectsWithSourceStatus(value, path, output = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectObjectsWithSourceStatus(child, `${path}[${index}]`, output));
    return output;
  }
  if (!isRecord(value)) return output;
  if ("sourceStatus" in value) output.push({ node: value, path });
  for (const [key, child] of Object.entries(value)) {
    collectObjectsWithSourceStatus(child, `${path}.${key}`, output);
  }
  return output;
}

function collectBoundaryErrors(value, path = "root", errors = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectBoundaryErrors(child, `${path}[${index}]`, errors));
    return errors;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && forbiddenClaimPattern.test(value)) {
      errors.push(`${path} contains a prohibited official grading/score/pass-fail/model-answer/guarantee claim`);
    }
    return errors;
  }
  for (const [key, child] of Object.entries(value)) {
    if (forbiddenFields.has(key)) errors.push(`${path}.${key} is forbidden`);
    collectBoundaryErrors(child, `${path}.${key}`, errors);
  }
  return errors;
}

function requireCondition(condition, message, errors) {
  if (!condition) errors.push(message);
}

function isDateString(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isHttpsUrl(value) {
  return typeof value === "string" && /^https:\/\//.test(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateVerifiedSourceMetadata(node, path, sourceIds, errors) {
  for (const field of ["officialSourceId", "officialSourceUrl", "officialSourceName", "officialSourceKind", "lastOfficialVerifiedAt", "verifiedBy"]) {
    requireCondition(field in node, `${path} verified node missing ${field}`, errors);
  }
  requireCondition(node.needsOfficialVerification === false, `${path} verified node must set needsOfficialVerification false`, errors);
  requireCondition(typeof node.officialSourceId === "string" && sourceIds.has(node.officialSourceId), `${path} uses unknown officialSourceId ${node.officialSourceId}`, errors);
  requireCondition(isHttpsUrl(node.officialSourceUrl), `${path} verified node officialSourceUrl must be an https URL`, errors);
  requireCondition(isNonEmptyString(node.officialSourceName), `${path} verified node officialSourceName must be a non-empty string`, errors);
  requireCondition(sourceKindValues.has(node.officialSourceKind), `${path} uses invalid officialSourceKind`, errors);
  requireCondition(isDateString(node.lastOfficialVerifiedAt), `${path} verified node lastOfficialVerifiedAt must be YYYY-MM-DD`, errors);
  requireCondition(isNonEmptyString(node.verifiedBy), `${path} verified node verifiedBy must be a non-empty string`, errors);
}

const errors = [];
requireCondition(existsSync(registryPath), "official_sources.json is missing", errors);
const registry = existsSync(registryPath) ? readJson(registryPath) : { sources: [] };
const sources = Array.isArray(registry.sources) ? registry.sources : [];
const sourceIds = new Set(sources.map((source) => source.id));
const qnetIdentity = sources.find((source) => source.id === "qnet_appraiser_qualification_detail");

for (const source of sources) {
  for (const field of ["id", "sourceName", "sourceUrl", "sourceKind", "authorityLevel", "owner", "verifiedFacts", "lastCheckedAt", "needsManualRecheckBy", "allowedUse", "disallowedUse", "notes"]) {
    requireCondition(field in source, `source ${source.id ?? "unknown"} is missing ${field}`, errors);
  }
  requireCondition(isHttpsUrl(source.sourceUrl), `source ${source.id} sourceUrl must be an https URL`, errors);
  requireCondition(sourceKindValues.has(source.sourceKind), `source ${source.id} has invalid sourceKind`, errors);
  requireCondition(isDateString(source.lastCheckedAt), `source ${source.id} lastCheckedAt must be YYYY-MM-DD`, errors);
  requireCondition(isDateString(source.needsManualRecheckBy), `source ${source.id} needsManualRecheckBy must be YYYY-MM-DD`, errors);
  requireCondition(Array.isArray(source.allowedUse) && source.allowedUse.includes("metadata_only") && source.allowedUse.includes("link_reference"), `source ${source.id} allowedUse is incomplete`, errors);
  requireCondition(Array.isArray(source.disallowedUse) && source.disallowedUse.includes("raw_problem_text_copy") && source.disallowedUse.includes("copyrighted_question_body_storage") && source.disallowedUse.includes("official_score_claim") && source.disallowedUse.includes("pass_fail_claim"), `source ${source.id} disallowedUse is incomplete`, errors);
}

requireCondition(Boolean(qnetIdentity), "qnet_appraiser_qualification_detail is missing", errors);
if (qnetIdentity) {
  requireCondition(qnetIdentity.verifiedFacts?.qualificationNameKo === "감정평가사", "Q-Net qualificationNameKo is not verified", errors);
  requireCondition(qnetIdentity.verifiedFacts?.qualificationNameEn === "Certified Appraiser", "Q-Net qualificationNameEn is not verified", errors);
  requireCondition(qnetIdentity.verifiedFacts?.relatedMinistry === "국토교통부", "Q-Net relatedMinistry is not verified", errors);
  requireCondition(qnetIdentity.verifiedFacts?.administeringAgency === "한국산업인력공단", "Q-Net administeringAgency is not verified", errors);
}

const sourceNodes = [];
for (const path of curriculumPaths) {
  const document = readJson(path);
  sourceNodes.push(...collectObjectsWithSourceStatus(document, path));
  errors.push(...collectBoundaryErrors(document, path));
}

const summary = { verifiedNodes: 0, draftNodes: 0, needsUpdateNodes: 0 };
for (const { node, path } of sourceNodes) {
  requireCondition(statusValues.has(node.sourceStatus), `${path} has invalid sourceStatus`, errors);
  if (node.sourceStatus === "verified") {
    summary.verifiedNodes += 1;
    validateVerifiedSourceMetadata(node, path, sourceIds, errors);
  }
  if (node.sourceStatus === "draft") {
    summary.draftNodes += 1;
    requireCondition(node.needsOfficialVerification === true, `${path} draft node must set needsOfficialVerification true`, errors);
  }
  if (node.sourceStatus === "needs_update") summary.needsUpdateNodes += 1;
}

requireCondition(sourceNodes.length > 0, "no curriculum nodes with sourceStatus found", errors);

const result = errors.length === 0
  ? {
      status: "passed_official_source_verification",
      verified: [
        "official_sources_registry_exists",
        "qnet_appraiser_identity_verified",
        "curriculum_nodes_have_source_status",
        "verified_nodes_have_source_metadata",
        "draft_nodes_marked_needs_verification",
        "no_raw_problem_text",
        "no_official_grading_claims",
      ],
      summary,
    }
  : {
      status: "failed_official_source_verification",
      errors,
      summary,
    };

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length > 0) process.exit(1);

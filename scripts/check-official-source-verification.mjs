import { existsSync, readFileSync } from "node:fs";

const registryPath = process.env.OFFICIAL_SOURCE_REGISTRY_PATH ?? "reference_corpus/curriculum/appraiser/official_sources.json";
const officialSyllabusPath = process.env.OFFICIAL_SYLLABUS_REGISTRY_PATH ?? "reference_corpus/curriculum/appraiser/official_syllabus.json";
const examRulesPath = process.env.OFFICIAL_EXAM_RULES_REGISTRY_PATH ?? "reference_corpus/curriculum/appraiser/exam_rules.json";
const annualNoticePaths = process.env.OFFICIAL_ANNUAL_NOTICE_PATHS
  ? process.env.OFFICIAL_ANNUAL_NOTICE_PATHS.split(",").filter(Boolean)
  : ["reference_corpus/curriculum/appraiser/annual_notices/2026.json"];
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
  "rawNoticeText",
  "rawProblemText",
  "rawLearnerText",
  "rawAnswerText",
  "learnerText",
  "answerText",
  "problemText",
  "questionText",
  "sourceText",
  "copyrightedText",
  "officialAnswer",
  "modelAnswer",
  "score",
  "scorePrediction",
  "passFail",
  "instructorComment",
]);
const forbiddenClaimPattern = /(official\s+grading|official\s+score|score\s+prediction|pass\s*\/\s*fail|model\s+answer|합격\s*보장|공식\s*채점|공식\s*점수|점수\s*예측|합격\s*\/\s*불합격|합불|공식\s*모범\s*답안|모범\s*답안)/i;
const annualOnlyFields = new Set([
  "annualNoticeId",
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
]);
const expectedSecondRoundSubjects = ["감정평가실무", "감정평가이론", "감정평가 및 보상법규"];

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

function collectAnnualFieldErrors(value, path = "root", errors = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectAnnualFieldErrors(child, `${path}[${index}]`, errors));
    return errors;
  }
  if (!isRecord(value)) return errors;
  for (const [key, child] of Object.entries(value)) {
    if (annualOnlyFields.has(key)) errors.push(`${path}.${key} is an annual-only field; use annual_notices/*.json`);
    collectAnnualFieldErrors(child, `${path}.${key}`, errors);
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

function validateMetadataOnlyStoragePolicy(document, path, errors) {
  const policy = document.storagePolicy;
  requireCondition(isRecord(policy), `${path} storagePolicy must be an object`, errors);
  if (!isRecord(policy)) return;
  requireCondition(policy.metadataOnly === true, `${path} storagePolicy.metadataOnly must be true`, errors);
  for (const field of [
    "rawTextStored",
    "copyrightedTextStored",
    "rawNoticeTextStored",
    "rawQuestionTextStored",
    "rawAnswerTextStored",
    "rawLearnerTextStored",
  ]) {
    requireCondition(policy[field] === false, `${path} storagePolicy.${field} must be false`, errors);
  }
}

function validateSourceIdsList(values, path, sourceIds, errors) {
  requireCondition(Array.isArray(values) && values.length > 0, `${path} sourceIds must be a non-empty array`, errors);
  if (!Array.isArray(values)) return;
  for (const sourceId of values) {
    requireCondition(typeof sourceId === "string" && sourceIds.has(sourceId), `${path} uses unknown sourceId ${sourceId}`, errors);
  }
}

function validateOfficialFactRecord(record, path, sourceIds, errors, today) {
  for (const field of ["id", "scope", "sourceIds", "effectiveFrom", "status", "lastOfficialVerifiedAt", "needsManualRecheckBy"]) {
    requireCondition(field in record, `${path} is missing ${field}`, errors);
  }
  requireCondition(record.scope === "second_round", `${path} scope must be second_round`, errors);
  validateSourceIdsList(record.sourceIds, path, sourceIds, errors);
  requireCondition(isDateString(record.effectiveFrom), `${path} effectiveFrom must be YYYY-MM-DD`, errors);
  if ("effectiveTo" in record) requireCondition(isDateString(record.effectiveTo), `${path} effectiveTo must be YYYY-MM-DD`, errors);
  requireCondition(statusValues.has(record.status), `${path} has invalid status`, errors);
  requireCondition(isDateString(record.lastOfficialVerifiedAt), `${path} lastOfficialVerifiedAt must be YYYY-MM-DD`, errors);
  requireCondition(isDateString(record.needsManualRecheckBy), `${path} needsManualRecheckBy must be YYYY-MM-DD`, errors);
  if (record.status === "verified") {
    requireCondition(Array.isArray(record.sourceIds) && record.sourceIds.length > 0, `${path} verified record must include provenance`, errors);
    requireCondition(record.needsManualRecheckBy >= today, `${path} verified record is stale`, errors);
  }
  if (record.productionFacing === true) {
    requireCondition(record.status === "verified", `${path} production-facing official fact must be verified`, errors);
    requireCondition(record.needsManualRecheckBy >= today, `${path} production-facing official fact is stale`, errors);
  }
}

function validateUniqueIds(records, path, errors) {
  const ids = records.map((record) => record.id).filter(Boolean);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  requireCondition(duplicateIds.length === 0, `${path} has duplicate ids: ${[...new Set(duplicateIds)].join(", ")}`, errors);
}

function rangeEnd(record) {
  return record.effectiveTo ?? "9999-12-31";
}

function rangesOverlap(left, right) {
  return left.effectiveFrom <= rangeEnd(right) && right.effectiveFrom <= rangeEnd(left);
}

function validateNoOverlappingCurrentRules(rules, errors) {
  const currentRules = rules.filter((rule) => rule.status !== "deprecated");
  for (let leftIndex = 0; leftIndex < currentRules.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < currentRules.length; rightIndex += 1) {
      const left = currentRules[leftIndex];
      const right = currentRules[rightIndex];
      if (left.scope === right.scope && left.ruleKey === right.ruleKey && rangesOverlap(left, right)) {
        errors.push(`exam_rules.json has overlapping effective ranges for ${left.scope}:${left.ruleKey}`);
      }
    }
  }
}

function validateS201OfficialRegistries(sourceIds, errors) {
  const today = new Date().toISOString().slice(0, 10);
  const s201Paths = [officialSyllabusPath, examRulesPath, ...annualNoticePaths];
  for (const path of s201Paths) {
    requireCondition(existsSync(path), `${path} is missing`, errors);
    if (!existsSync(path)) return;
  }

  const officialSyllabus = readJson(officialSyllabusPath);
  const examRules = readJson(examRulesPath);
  const annualNotices = annualNoticePaths.map((path) => ({ path, document: readJson(path) }));

  errors.push(...collectBoundaryErrors(officialSyllabus, officialSyllabusPath));
  errors.push(...collectBoundaryErrors(examRules, examRulesPath));
  for (const { path, document } of annualNotices) {
    errors.push(...collectBoundaryErrors(document, path));
  }
  errors.push(...collectAnnualFieldErrors(officialSyllabus, officialSyllabusPath));
  errors.push(...collectAnnualFieldErrors(examRules, examRulesPath));

  for (const [path, document] of [
    [officialSyllabusPath, officialSyllabus],
    [examRulesPath, examRules],
    ...annualNotices.map(({ path, document }) => [path, document]),
  ]) {
    validateMetadataOnlyStoragePolicy(document, path, errors);
    validateSourceIdsList(document.sourceIds, path, sourceIds, errors);
    requireCondition(Array.isArray(document.unresolvedOfficialSourceConflicts), `${path} unresolvedOfficialSourceConflicts must be an array`, errors);
    requireCondition((document.unresolvedOfficialSourceConflicts ?? []).length === 0, `${path} has unresolved official source conflicts`, errors);
  }

  const stageRecords = officialSyllabus.qualificationStageRecords ?? [];
  const subjectRecords = officialSyllabus.subjectRecords ?? [];
  const syllabusDeprecatedRecords = officialSyllabus.deprecatedRecords ?? [];
  requireCondition(Array.isArray(stageRecords), `${officialSyllabusPath} qualificationStageRecords must be an array`, errors);
  requireCondition(Array.isArray(subjectRecords), `${officialSyllabusPath} subjectRecords must be an array`, errors);
  requireCondition(Array.isArray(syllabusDeprecatedRecords), `${officialSyllabusPath} deprecatedRecords must be an array`, errors);
  for (const [index, record] of stageRecords.entries()) validateOfficialFactRecord(record, `${officialSyllabusPath}.qualificationStageRecords[${index}]`, sourceIds, errors, today);
  for (const [index, record] of subjectRecords.entries()) validateOfficialFactRecord(record, `${officialSyllabusPath}.subjectRecords[${index}]`, sourceIds, errors, today);
  for (const [index, record] of syllabusDeprecatedRecords.entries()) validateOfficialFactRecord(record, `${officialSyllabusPath}.deprecatedRecords[${index}]`, sourceIds, errors, today);
  validateUniqueIds([...stageRecords, ...subjectRecords, ...syllabusDeprecatedRecords], officialSyllabusPath, errors);

  const currentSubjectLabels = subjectRecords
    .filter((record) => record.status === "verified" && record.scope === "second_round" && !record.effectiveTo)
    .sort((left, right) => left.officialSubjectOrder - right.officialSubjectOrder)
    .map((record) => record.officialSubjectLabelKo);
  requireCondition(
    JSON.stringify(currentSubjectLabels) === JSON.stringify(expectedSecondRoundSubjects),
    `${officialSyllabusPath} must contain exactly the three current official second-round subjects`,
    errors,
  );
  requireCondition(
    subjectRecords.every((record) => typeof record.editorialSubjectId === "string" && record.editorialSubjectId.startsWith("second_")),
    `${officialSyllabusPath} subject records must map to second-round editorial ids only`,
    errors,
  );

  const rules = examRules.rules ?? [];
  const ruleDeprecatedRecords = examRules.deprecatedRecords ?? [];
  requireCondition(Array.isArray(rules), `${examRulesPath} rules must be an array`, errors);
  requireCondition(Array.isArray(ruleDeprecatedRecords), `${examRulesPath} deprecatedRecords must be an array`, errors);
  for (const [index, record] of rules.entries()) {
    validateOfficialFactRecord(record, `${examRulesPath}.rules[${index}]`, sourceIds, errors, today);
    requireCondition(typeof record.ruleKey === "string" && record.ruleKey.length > 0, `${examRulesPath}.rules[${index}] ruleKey must be a non-empty string`, errors);
    requireCondition("value" in record, `${examRulesPath}.rules[${index}] is missing value`, errors);
  }
  for (const [index, record] of ruleDeprecatedRecords.entries()) validateOfficialFactRecord(record, `${examRulesPath}.deprecatedRecords[${index}]`, sourceIds, errors, today);
  validateUniqueIds([...rules, ...ruleDeprecatedRecords], examRulesPath, errors);
  validateNoOverlappingCurrentRules(rules, errors);

  for (const { path, document } of annualNotices) {
    requireCondition(Number.isFinite(document.noticeYear), `${path} noticeYear must be a number`, errors);
    requireCondition(Number.isFinite(document.examRound), `${path} examRound must be a number`, errors);
    requireCondition(isRecord(document.noticeMetadata), `${path} noticeMetadata must be an object`, errors);
    if (isRecord(document.noticeMetadata)) {
      requireCondition(document.noticeMetadata.noticeBodyStored === false, `${path} notice body must not be stored`, errors);
      requireCondition(document.noticeMetadata.attachmentBodyStored === false, `${path} attachment body must not be stored`, errors);
    }
    const annualValues = document.annualValues ?? [];
    const annualOverrides = document.annualOverrides ?? [];
    requireCondition(Array.isArray(annualValues), `${path} annualValues must be an array`, errors);
    requireCondition(Array.isArray(annualOverrides), `${path} annualOverrides must be an array`, errors);
    for (const [index, record] of annualValues.entries()) {
      validateOfficialFactRecord(record, `${path}.annualValues[${index}]`, sourceIds, errors, today);
      requireCondition("value" in record, `${path}.annualValues[${index}] is missing value`, errors);
      requireCondition(typeof record.valueKey === "string" && record.valueKey.length > 0, `${path}.annualValues[${index}] valueKey must be a non-empty string`, errors);
      requireCondition(isDateString(record.effectiveTo), `${path}.annualValues[${index}] annual value must include effectiveTo`, errors);
    }
    for (const [index, record] of annualOverrides.entries()) validateOfficialFactRecord(record, `${path}.annualOverrides[${index}]`, sourceIds, errors, today);
    validateUniqueIds([...annualValues, ...annualOverrides], path, errors);
  }
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

validateS201OfficialRegistries(sourceIds, errors);

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

const s201Summary = existsSync(officialSyllabusPath) && existsSync(examRulesPath) && annualNoticePaths.every((path) => existsSync(path))
  ? {
      currentOfficialSubjects: readJson(officialSyllabusPath).subjectRecords
        ?.filter((record) => record.status === "verified" && record.scope === "second_round" && !record.effectiveTo)
        ?.sort((left, right) => left.officialSubjectOrder - right.officialSubjectOrder)
        ?.map((record) => record.officialSubjectLabelKo) ?? [],
      ruleCount: readJson(examRulesPath).rules?.length ?? 0,
      annualNoticeYears: annualNoticePaths.map((path) => readJson(path).noticeYear),
    }
  : {
      currentOfficialSubjects: [],
      ruleCount: 0,
      annualNoticeYears: [],
    };

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
        "s201_official_syllabus_registry_valid",
        "s201_exam_rule_registry_valid",
        "s201_annual_notice_registry_valid",
      ],
      summary: {
        ...summary,
        s201: s201Summary,
      },
    }
  : {
      status: "failed_official_source_verification",
      errors,
      summary: {
        ...summary,
        s201: s201Summary,
      },
    };

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (errors.length > 0) process.exit(1);

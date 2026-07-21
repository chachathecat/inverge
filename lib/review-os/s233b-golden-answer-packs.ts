import { createHash } from "node:crypto";
import {
  S233_ANSWER_LEVELS,
  S233_ANSWER_PACK_SCHEMA_VERSION,
  S233_AUTHORITY_GUARDRAILS,
  S233_REUSED_CONTRACT_VERSIONS,
  validateS233AnswerPackIdentity,
  validateS233AnswerPackRegistryContext,
  type S233AnswerPackIdentity,
  type S233AnswerPackRegistryContext,
} from "./s233-parallel-execution-contract";

export const S233B_GOLDEN_REGISTRY_SCHEMA_VERSION = "s233b.golden_answer_pack_registry.v1" as const;
export const S233B_GOLDEN_REPORT_SCHEMA_VERSION = "s233b.golden_answer_pack_report.v1" as const;
export const S233B_S214_RECORD_SCHEMA_VERSION = "s233b.s214_compatibility_records.v1" as const;
export const S233B_S215_RECORD_SCHEMA_VERSION = "s233b.s215_compatibility_records.v1" as const;
export const S233B_EXAM_DATE = "2026-07-04" as const;

const SUBJECT_ORDER = ["practice", "theory", "law"] as const;
const QUESTION_ORDER = [1, 2, 3] as const;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

type Subject = typeof SUBJECT_ORDER[number];
type JsonRecord = Record<string, unknown>;

export type S233BQuestionSourceBinding = {
  questionId: string;
  questionNo: number;
  sourceId: string;
  sourceVersion: string;
  sourceContentHashSha256: string;
  structuralAnchorSha256: string;
  rightsDecisionId: string;
  lawSourceIds: string[];
  lawVersionIds: string[];
  verifiedSourceFacts: {
    officialQuestionIdentity: true;
    officialPaperHash: true;
    examDate: typeof S233B_EXAM_DATE;
    lawVersions: "verified" | "not_applicable";
  };
  derivedLearningMaterial: {
    answerProseStored: false;
    claimProseStored: false;
    verificationScope: "metadata_identity_and_source_grounding_only";
  };
};

export type S233BGoldenPackRecord = {
  packId: string;
  verificationState: "source_grounded_study_answer";
  releaseState: "blocked_pending_domain_answer_validation";
  questionSourceBinding: S233BQuestionSourceBinding;
  identity: S233AnswerPackIdentity;
  registryContext: S233AnswerPackRegistryContext;
};

export type S233BGoldenRegistry = {
  schemaVersion: typeof S233B_GOLDEN_REGISTRY_SCHEMA_VERSION;
  registryVersion: string;
  generatedAt: string;
  examDate: typeof S233B_EXAM_DATE;
  sourceRegistryVersion: string;
  lawRegistryVersion: string;
  rightsRegistryVersion: string;
  officialSourceRegistryId: string;
  statusPolicy: {
    verifiedLearningReferenceClaimed: false;
    officialAnswerClaimed: false;
    expertReviewClaimed: false;
    answerProseStored: false;
    sourceFactsSeparatedFromDerivedLearningMaterial: true;
  };
  packs: S233BGoldenPackRecord[];
  s214PipelineRecords: S233AnswerPackRegistryContext["s214PipelineRecords"];
  s215GateRecords: S233AnswerPackRegistryContext["s215GateRecords"];
};

export type S233BGoldenReport = {
  schemaVersion: typeof S233B_GOLDEN_REPORT_SCHEMA_VERSION;
  registryVersion: string;
  generatedAt: string;
  officialSourceRegistryId: string;
  lawRegistryVersion: string;
  totals: {
    packCount: 9;
    practiceCount: 3;
    theoryCount: 3;
    lawCount: 3;
    sourceGroundedCount: 9;
    verifiedLearningReferenceCount: 0;
    releasedCount: 0;
    blockedPendingDomainValidationCount: 9;
  };
  packIds: string[];
  verificationStates: Array<{ packId: string; verificationState: string; releaseState: string }>;
  rights: {
    licenseId: "KOGL-TYPE-1";
    attributionRequired: true;
    rightsStatus: "redistribution_allowed";
    noticeArticleId: string;
    noticeContentHashSha256: string;
  };
  safeUse: "metadata_only_source_grounded_golden_identity_not_released_answer_content";
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertRecord(value: unknown, path: string): asserts value is JsonRecord {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
}

function assertString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${path} must be a non-empty string`);
  return value;
}

function assertSha256(value: unknown, path: string): string {
  const result = assertString(value, path);
  if (!SHA256_PATTERN.test(result)) throw new Error(`${path} must be a lowercase SHA-256 digest`);
  return result;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function sha256(value: unknown): string {
  return createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex");
}

function addMinutes(isoTimestamp: string, minutes: number): string {
  return new Date(Date.parse(isoTimestamp) + minutes * 60_000).toISOString();
}

function sourceUnitFor(sourceSnapshot: JsonRecord, subject: Subject): JsonRecord {
  const coverageUnits = sourceSnapshot.coverageUnits;
  if (!Array.isArray(coverageUnits)) throw new Error("sourceSnapshot.coverageUnits must be an array");
  const unit = coverageUnits.find((entry) => isRecord(entry) && entry.examYear === 2026 && entry.subject === subject);
  if (!isRecord(unit) || unit.coverage !== "complete_subject_paper") {
    throw new Error(`S233B requires a complete official 2026 ${subject} paper`);
  }
  return unit;
}

function sourceRecordFor(sourceSnapshot: JsonRecord, sourceId: string): JsonRecord {
  const sources = sourceSnapshot.sources;
  if (!Array.isArray(sources)) throw new Error("sourceSnapshot.sources must be an array");
  const source = sources.find((entry) => isRecord(entry) && entry.sourceId === sourceId);
  if (!isRecord(source)) throw new Error(`Missing official source ${sourceId}`);
  if (source.authorityStatus !== "official_primary_source" || source.coverage !== "complete_subject_paper") {
    throw new Error(`${sourceId} is not a complete official primary source`);
  }
  return source;
}

function lawVersionMap(lawSnapshot: JsonRecord): Map<string, JsonRecord> {
  if (lawSnapshot.schemaVersion !== "s233b.exam_date_law_snapshot.v1"
    || lawSnapshot.examDate !== S233B_EXAM_DATE
    || !Array.isArray(lawSnapshot.versions)
    || lawSnapshot.versions.length !== 4) {
    throw new Error("S233B requires the complete four-law exam-date snapshot");
  }
  const result = new Map<string, JsonRecord>();
  for (const value of lawSnapshot.versions) {
    assertRecord(value, "lawSnapshot.versions[]");
    const sourceId = assertString(value.lawSourceId, "lawVersion.lawSourceId");
    if (result.has(sourceId)
      || value.versionStatus !== "verified"
      || value.examDate !== S233B_EXAM_DATE
      || value.examDateApplicability !== "applicable_to_exam_date"
      || !/^\d+$/u.test(assertString(value.officialMst, "lawVersion.officialMst"))) {
      throw new Error(`Law source ${sourceId} is duplicated or not exam-date verified`);
    }
    assertSha256(value.contentHashSha256, "lawVersion.contentHashSha256");
    result.set(sourceId, value);
  }
  return result;
}

function validateRightsEvidence(sourceSnapshot: JsonRecord): JsonRecord {
  const rights = sourceSnapshot.rightsEvidence;
  assertRecord(rights, "sourceSnapshot.rightsEvidence");
  if (rights.licenseId !== "KOGL-TYPE-1"
    || rights.rightsStatus !== "redistribution_allowed"
    || rights.attributionRequired !== true
    || rights.commercialUseAllowed !== true
    || rights.modificationAllowed !== true
    || rights.authorityStatus !== "official_rights_notice"
    || rights.ambiguityConvertedToPermission !== false) {
    throw new Error("Q-Net rights evidence must preserve scoped KOGL Type 1 attribution terms");
  }
  assertString(rights.noticeArticleId, "rightsEvidence.noticeArticleId");
  assertSha256(rights.noticeContentHashSha256, "rightsEvidence.noticeContentHashSha256");
  return rights;
}

function expectedPackId(subject: Subject, questionNo: number): string {
  return `s233b-golden-2026-${subject}-q${questionNo}`;
}

function blockerCodes(subject: Subject): string[] {
  if (subject === "practice") return ["answer_prose_not_stored", "independent_recalculation_not_performed"];
  if (subject === "theory") return ["answer_prose_not_stored", "theory_concept_grounding_not_verified"];
  return ["answer_prose_not_stored", "critic_consensus_not_performed"];
}

function buildPack({
  sourceSnapshot,
  lawSnapshot,
  lawBySourceId,
  rightsRegistryVersion,
  subject,
  questionNo,
  ordinal,
}: {
  sourceSnapshot: JsonRecord;
  lawSnapshot: JsonRecord;
  lawBySourceId: Map<string, JsonRecord>;
  rightsRegistryVersion: string;
  subject: Subject;
  questionNo: number;
  ordinal: number;
}): S233BGoldenPackRecord {
  const unit = sourceUnitFor(sourceSnapshot, subject);
  const sourceId = assertString(unit.sourceId, `${subject}.sourceId`);
  const source = sourceRecordFor(sourceSnapshot, sourceId);
  const questionMetadata = unit.canonicalQuestionMetadata;
  if (!Array.isArray(questionMetadata)) throw new Error(`${subject}.canonicalQuestionMetadata must be an array`);
  const question = questionMetadata.find((entry) => isRecord(entry) && entry.questionNo === questionNo);
  if (!isRecord(question)) throw new Error(`Missing official ${subject} question ${questionNo}`);
  const structuralAnchorSha256 = assertSha256(question.structuralAnchorSha256, `${subject}.q${questionNo}.structuralAnchorSha256`);
  const sourceVersion = assertString(source.sourceVersion, `${subject}.sourceVersion`);
  const sourceContentHashSha256 = assertSha256(source.contentHashSha256, `${subject}.contentHashSha256`);
  const lawSourceIds = subject === "law"
    ? [...new Set(Array.isArray(question.lawSourceIds) ? question.lawSourceIds.map(String) : [])].sort()
    : [];
  if (subject === "law" && lawSourceIds.length === 0) throw new Error(`Law question ${questionNo} has no official law bindings`);
  const lawVersions = lawSourceIds.map((lawSourceId) => {
    const value = lawBySourceId.get(lawSourceId);
    if (!value) throw new Error(`Law question ${questionNo} references unverified ${lawSourceId}`);
    return value;
  });
  const lawVersionIds = lawVersions.map((value) => assertString(value.lawVersionId, "lawVersion.lawVersionId")).sort();
  const questionId = `qnet-appraiser-second-2026-${subject}-q${questionNo}`;
  const packId = expectedPackId(subject, questionNo);
  const packVersion = "2.0.0";
  const sourceAnchorId = `${questionId}-anchor-${structuralAnchorSha256.slice(0, 16)}`;
  const claimIds = S233_ANSWER_LEVELS.map((level) => `${packId}-claim-${level.slice(0, 2).toLowerCase()}`);
  const snapshotId = `${packId}-snapshot`;
  const pipelineId = `s233b-s214-${subject}-q${questionNo}`;
  const gateId = `s233b-s215-${subject}-q${questionNo}`;
  const rightsDecisionId = `qnet-kogl-type-1-2014-onward-${subject}`;
  const lawContentHashes = lawVersions.map((value) => assertSha256(value.contentHashSha256, "lawVersion.contentHashSha256")).sort();
  const contentHashSha256 = sha256({
    packId,
    packVersion,
    subject,
    questionId,
    sourceId,
    sourceVersion,
    sourceContentHashSha256,
    structuralAnchorSha256,
    answerLevels: S233_ANSWER_LEVELS,
    claimIds,
    lawSourceIds,
    lawVersionIds,
    lawContentHashes,
    rightsDecisionId,
  });
  const capturedAt = assertString(sourceSnapshot.acquiredAt, "sourceSnapshot.acquiredAt");
  if (!ISO_TIMESTAMP_PATTERN.test(capturedAt)) throw new Error("sourceSnapshot.acquiredAt must be canonical UTC");
  const provenanceId = `${packId}-deterministic-validation`;
  const identity: S233AnswerPackIdentity = {
    schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
    packId,
    packVersion,
    contentHashSha256,
    immutable: true,
    subject,
    verificationStatus: "source_grounded_study_answer",
    answerLevels: [...S233_ANSWER_LEVELS],
    claimSourceGraph: {
      graphId: `${packId}-claim-source-graph`,
      claimIds,
      sourceAnchorIds: [sourceAnchorId],
      edges: claimIds.map((claimId) => ({ claimId, sourceAnchorId, relation: "supports" as const })),
      claimProseStored: false,
      sourceExcerptStored: false,
    },
    snapshot: {
      snapshotId,
      sourceRegistryVersion: assertString(sourceSnapshot.registryVersion, "sourceSnapshot.registryVersion"),
      sourceIds: [sourceId],
      lawRegistryVersion: subject === "law" ? assertString(lawSnapshot.registryVersion, "lawSnapshot.registryVersion") : null,
      lawVersionIds,
      lawVersionStatus: subject === "law" ? "verified" : "not_applicable",
      rightsRegistryVersion,
      rightsDecisionIds: [rightsDecisionId],
      rightsStatuses: ["redistribution_allowed"],
      capturedAt,
    },
    transformationProvenance: [{
      provenanceId,
      kind: "deterministic_validation",
      inputRefIds: [snapshotId, sourceId, ...lawVersionIds],
      outputClaimIds: claimIds,
      modelVersion: null,
      promptVersion: null,
      schemaVersion: S233_ANSWER_PACK_SCHEMA_VERSION,
      transformedAt: addMinutes(capturedAt, ordinal + 1),
      providerPayloadStored: false,
      learnerContentUsed: false,
    }],
    releaseProof: null,
    learnerContentPolicy: { allowed: false, included: false, sourceIds: [] },
    expertReview: { approved: false, approvalEvidenceId: null },
    authorityGuardrails: { ...S233_AUTHORITY_GUARDRAILS },
    containsRawContent: false,
  };
  const s214Record: S233AnswerPackRegistryContext["s214PipelineRecords"][number] = {
    pipelineId,
    packId,
    packVersion,
    contentHashSha256,
    subject,
    status: "blocked",
  };
  const s215Record: S233AnswerPackRegistryContext["s215GateRecords"][number] = {
    gateId,
    pipelineId,
    packId,
    packVersion,
    contentHashSha256,
    subject,
    status: "blocked",
    unresolvedBlockerCodes: blockerCodes(subject),
  };
  const registryContext: S233AnswerPackRegistryContext = {
    sourceRegistryVersion: identity.snapshot.sourceRegistryVersion,
    lawRegistryVersion: identity.snapshot.lawRegistryVersion,
    rightsRegistryVersion,
    sourceRecords: [{
      sourceId,
      subject,
      sourceAnchorIds: [sourceAnchorId],
      lawVersionIds,
      rightsDecisionIds: [rightsDecisionId],
    }],
    lawVersionRecords: lawVersionIds.map((lawVersionId) => ({ lawVersionId, status: "verified" })),
    rightsDecisionRecords: [{ rightsDecisionId, sourceId, status: "redistribution_allowed" }],
    s214PipelineRecords: [s214Record],
    s215GateRecords: [s215Record],
  };
  const identityValidation = validateS233AnswerPackIdentity(identity);
  if (!identityValidation.valid) throw new Error(`${packId} identity invalid: ${identityValidation.errors.join("; ")}`);
  const contextValidation = validateS233AnswerPackRegistryContext(identity, registryContext);
  if (!contextValidation.valid) throw new Error(`${packId} registry context invalid: ${contextValidation.errors.join("; ")}`);

  return {
    packId,
    verificationState: "source_grounded_study_answer",
    releaseState: "blocked_pending_domain_answer_validation",
    questionSourceBinding: {
      questionId,
      questionNo,
      sourceId,
      sourceVersion,
      sourceContentHashSha256,
      structuralAnchorSha256,
      rightsDecisionId,
      lawSourceIds,
      lawVersionIds,
      verifiedSourceFacts: {
        officialQuestionIdentity: true,
        officialPaperHash: true,
        examDate: S233B_EXAM_DATE,
        lawVersions: subject === "law" ? "verified" : "not_applicable",
      },
      derivedLearningMaterial: {
        answerProseStored: false,
        claimProseStored: false,
        verificationScope: "metadata_identity_and_source_grounding_only",
      },
    },
    identity,
    registryContext,
  };
}

export function buildS233BGoldenNine(sourceSnapshotValue: unknown, lawSnapshotValue: unknown): S233BGoldenRegistry {
  assertRecord(sourceSnapshotValue, "sourceSnapshot");
  assertRecord(lawSnapshotValue, "lawSnapshot");
  const sourceSnapshot = sourceSnapshotValue;
  const lawSnapshot = lawSnapshotValue;
  if (sourceSnapshot.schemaVersion !== "s233b.official_second_round_acquisition.v1"
    || !isRecord(sourceSnapshot.examDateEvidence)
    || sourceSnapshot.examDateEvidence.examDate !== S233B_EXAM_DATE) {
    throw new Error("S233B Golden 9 requires the official 2026-07-04 Q-Net snapshot");
  }
  const rights = validateRightsEvidence(sourceSnapshot);
  const lawBySourceId = lawVersionMap(lawSnapshot);
  const rightsRegistryVersion = `s233b.qnet.rights.${assertSha256(rights.noticeContentHashSha256, "rights hash").slice(0, 16)}`;
  const packs: S233BGoldenPackRecord[] = [];
  let ordinal = 0;
  for (const subject of SUBJECT_ORDER) {
    for (const questionNo of QUESTION_ORDER) {
      packs.push(buildPack({
        sourceSnapshot,
        lawSnapshot,
        lawBySourceId,
        rightsRegistryVersion,
        subject,
        questionNo,
        ordinal,
      }));
      ordinal += 1;
    }
  }
  const s214PipelineRecords = packs.map((pack) => pack.registryContext.s214PipelineRecords[0]);
  const s215GateRecords = packs.map((pack) => pack.registryContext.s215GateRecords[0]);
  const registryDigest = sha256({
    sourceRegistryVersion: sourceSnapshot.registryVersion,
    lawRegistryVersion: lawSnapshot.registryVersion,
    rightsRegistryVersion,
    packs: packs.map((pack) => ({ packId: pack.packId, contentHashSha256: pack.identity.contentHashSha256 })),
    s214PipelineRecords,
    s215GateRecords,
  });
  const registry: S233BGoldenRegistry = {
    schemaVersion: S233B_GOLDEN_REGISTRY_SCHEMA_VERSION,
    registryVersion: `s233b.golden9.2026.${registryDigest.slice(0, 16)}`,
    generatedAt: assertString(sourceSnapshot.acquiredAt, "sourceSnapshot.acquiredAt"),
    examDate: S233B_EXAM_DATE,
    sourceRegistryVersion: assertString(sourceSnapshot.registryVersion, "sourceSnapshot.registryVersion"),
    lawRegistryVersion: assertString(lawSnapshot.registryVersion, "lawSnapshot.registryVersion"),
    rightsRegistryVersion,
    officialSourceRegistryId: assertString(sourceSnapshot.registryVersion, "sourceSnapshot.registryVersion"),
    statusPolicy: {
      verifiedLearningReferenceClaimed: false,
      officialAnswerClaimed: false,
      expertReviewClaimed: false,
      answerProseStored: false,
      sourceFactsSeparatedFromDerivedLearningMaterial: true,
    },
    packs,
    s214PipelineRecords,
    s215GateRecords,
  };
  validateS233BGoldenRegistry(registry);
  return registry;
}

export function validateS233BGoldenRegistry(value: unknown): asserts value is S233BGoldenRegistry {
  assertRecord(value, "goldenRegistry");
  if (value.schemaVersion !== S233B_GOLDEN_REGISTRY_SCHEMA_VERSION
    || value.examDate !== S233B_EXAM_DATE
    || !Array.isArray(value.packs)
    || value.packs.length !== 9) {
    throw new Error("S233B Golden registry must contain exactly the ordered Golden 9");
  }
  const expectedIds = SUBJECT_ORDER.flatMap((subject) => QUESTION_ORDER.map((questionNo) => expectedPackId(subject, questionNo)));
  const actualIds = value.packs.map((pack) => isRecord(pack) ? pack.packId : null);
  if (canonicalJson(actualIds) !== canonicalJson(expectedIds)) throw new Error("S233B Golden 9 order or IDs changed");
  const seenHashes = new Set<string>();
  for (const rawPack of value.packs) {
    assertRecord(rawPack, "goldenRegistry.packs[]");
    if (rawPack.verificationState !== "source_grounded_study_answer"
      || rawPack.releaseState !== "blocked_pending_domain_answer_validation") {
      throw new Error(`${String(rawPack.packId)} overclaims its verification or release state`);
    }
    const identityValidation = validateS233AnswerPackIdentity(rawPack.identity);
    if (!identityValidation.valid) throw new Error(`${String(rawPack.packId)} failed Answer Pack 2.0 validation`);
    const contextValidation = validateS233AnswerPackRegistryContext(rawPack.identity, rawPack.registryContext);
    if (!contextValidation.valid) throw new Error(`${String(rawPack.packId)} failed trusted registry validation`);
    assertRecord(rawPack.identity, "pack.identity");
    const digest = assertSha256(rawPack.identity.contentHashSha256, "pack.identity.contentHashSha256");
    if (seenHashes.has(digest)) throw new Error("Golden Pack content hashes must be unique");
    seenHashes.add(digest);
  }
  if (!Array.isArray(value.s214PipelineRecords) || value.s214PipelineRecords.length !== 9
    || value.s214PipelineRecords.some((record) => !isRecord(record) || record.status !== "blocked")) {
    throw new Error("All nine truthful S214 compatibility records must remain blocked");
  }
  if (!Array.isArray(value.s215GateRecords) || value.s215GateRecords.length !== 9
    || value.s215GateRecords.some((record) => !isRecord(record)
      || record.status !== "blocked"
      || !Array.isArray(record.unresolvedBlockerCodes)
      || record.unresolvedBlockerCodes.length === 0)) {
    throw new Error("All nine truthful S215 compatibility records must preserve blockers");
  }
}

export function buildS233BGoldenReport(registryValue: unknown, sourceSnapshotValue: unknown): S233BGoldenReport {
  validateS233BGoldenRegistry(registryValue);
  assertRecord(sourceSnapshotValue, "sourceSnapshot");
  const rights = validateRightsEvidence(sourceSnapshotValue);
  return {
    schemaVersion: S233B_GOLDEN_REPORT_SCHEMA_VERSION,
    registryVersion: registryValue.registryVersion,
    generatedAt: registryValue.generatedAt,
    officialSourceRegistryId: registryValue.officialSourceRegistryId,
    lawRegistryVersion: registryValue.lawRegistryVersion,
    totals: {
      packCount: 9,
      practiceCount: 3,
      theoryCount: 3,
      lawCount: 3,
      sourceGroundedCount: 9,
      verifiedLearningReferenceCount: 0,
      releasedCount: 0,
      blockedPendingDomainValidationCount: 9,
    },
    packIds: registryValue.packs.map((pack) => pack.packId),
    verificationStates: registryValue.packs.map((pack) => ({
      packId: pack.packId,
      verificationState: pack.verificationState,
      releaseState: pack.releaseState,
    })),
    rights: {
      licenseId: "KOGL-TYPE-1",
      attributionRequired: true,
      rightsStatus: "redistribution_allowed",
      noticeArticleId: assertString(rights.noticeArticleId, "rightsEvidence.noticeArticleId"),
      noticeContentHashSha256: assertSha256(rights.noticeContentHashSha256, "rightsEvidence.noticeContentHashSha256"),
    },
    safeUse: "metadata_only_source_grounded_golden_identity_not_released_answer_content",
  };
}

export function buildS233BS214CompatibilityRegistry(registryValue: unknown) {
  validateS233BGoldenRegistry(registryValue);
  return {
    schemaVersion: S233B_S214_RECORD_SCHEMA_VERSION,
    contractVersion: S233_REUSED_CONTRACT_VERSIONS.s214AnswerPipeline,
    generatedAt: registryValue.generatedAt,
    goldenRegistryVersion: registryValue.registryVersion,
    records: registryValue.s214PipelineRecords,
    rawGeneratedReferenceAnswerStored: false,
  };
}

export function buildS233BS215CompatibilityRegistry(registryValue: unknown) {
  validateS233BGoldenRegistry(registryValue);
  return {
    schemaVersion: S233B_S215_RECORD_SCHEMA_VERSION,
    contractVersion: S233_REUSED_CONTRACT_VERSIONS.s215ReleaseGate,
    generatedAt: registryValue.generatedAt,
    goldenRegistryVersion: registryValue.registryVersion,
    records: registryValue.s215GateRecords,
    rawGeneratedReferenceAnswerStored: false,
  };
}

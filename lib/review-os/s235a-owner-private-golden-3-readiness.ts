import { createHash } from "node:crypto";

import { assertNoRawUserDataInDerived } from "./data-boundary";

export const S235A_READINESS_SCHEMA_VERSION =
  "s235a.owner_private_golden_3_readiness.v1" as const;
export const S235A_REPORT_SCHEMA_VERSION =
  "s235a.owner_private_golden_3_readiness_report.v1" as const;
export const S235A_MANIFEST_ID =
  "s235a-appraiser-second-2026-q1-owner-private-golden-3" as const;
export const S235A_GENERATED_AT = "2026-07-23T07:35:00.000Z" as const;
export const S235A_READINESS_STATUS =
  "evidence_complete_pending_o3a_owner_decision" as const;
export const S235A_SUBJECT_ORDER = [
  "practice",
  "theory",
  "law",
] as const;
export const S235A_SELECTION_IDS = [
  "s235a-practice-2026-q1",
  "s235a-theory-2026-q1",
  "s235a-law-2026-q1",
] as const;
export const S235A_FUTURE_PACKAGE_IDS = [
  "s236a-private-practice-2026-q1",
  "s236a-private-theory-2026-q1",
  "s236a-private-law-2026-q1",
] as const;
export const S235A_INDEPENDENT_AUDIT_RECEIPT_ID =
  "s235a-private-fidelity-review-20260723T072849Z-af5282021a88" as const;
export const S235A_INDEPENDENT_AUDIT_RESULT_SHA256 =
  "af5282021a88bac66854215e0c5e20da4752a32303d09f13121a479b70e18ec0" as const;
export const S235A_O3A_PACKET_ID =
  "o3a-s235a-appraiser-second-2026-q1-owner-private-golden-3" as const;

export type S235aValidationResult = {
  valid: boolean;
  errors: string[];
};

type JsonRecord = Record<string, unknown>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const PLACEHOLDER_SHA256_PATTERN = /^(?:0{64}|1{64}|a{64}|f{64})$/u;

const FORBIDDEN_KEY_FRAGMENTS = [
  "questionbody",
  "questiontext",
  "problemtext",
  "answerbody",
  "answertext",
  "referenceanswer",
  "learneranswer",
  "learnername",
  "learnerid",
  "userid",
  "email",
  "phone",
  "rawocr",
  "extractedtext",
  "sourcetext",
  "sourceexcerpt",
  "statutetext",
  "articletext",
  "casetext",
  "lawtext",
  "formulaexpression",
  "extractedvalues",
  "calculationtrace",
  "embedding",
  "vector",
  "prompt",
  "messages",
  "completion",
  "provider",
  "model",
  "payload",
  "requestbody",
  "responsebody",
  "apikey",
  "authorization",
  "cookie",
  "credential",
  "secret",
  "environment",
  "pdfbytes",
  "hwpbytes",
  "imagebytes",
  "assetbytes",
  "localpath",
  "filepath",
  "objectkey",
  "signedurl",
  "vaultlocator",
] as const;

const FORBIDDEN_STRING_PATTERNS = [
  /%PDF-/iu,
  /(?:^|\s)data:/iu,
  /(?:^|\s)(?:file|s3|gs|blob|postgres):\/\//iu,
  /(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/u,
  /\bsk-[A-Za-z0-9_-]{8,}\b/u,
  /\bAIza[A-Za-z0-9_-]{8,}\b/u,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/u,
  /(?:X-Amz-|Signature=|token=)/iu,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/u,
  /(?:^|[/\\])\.env(?:$|[/\\])/u,
  /[A-Z]:\\|\/(?:home|root|workspace|tmp)\//u,
  /(?:official\s+answer|official\s+grading|confirmed\s+score|pass\s+probability|pass\s+guarantee)/iu,
  /(?:공식\s*채점|공식\s*모범답안|확정\s*점수|합격\s*가능성|합격\s*확률|합격\s*보장)/u,
  /(?:【|\[)\s*문제\s*1\s*(?:】|\])/u,
] as const;

const TRUSTED_SOURCE_BY_SUBJECT = {
  practice: {
    selectionId: "s235a-practice-2026-q1",
    source: {
      sourceId: "qnet-appraiser-second-2026-practice",
      sourceVersion: "5268128.2261215.9c6a4fbf1d06f1d8",
      authority: "qnet",
      authorityHost: "www.q-net.or.kr",
      articleId: "5268128",
      fileSequence: "2261215",
      examYear: 2026,
      subject: "practice",
      acquiredAt: "2026-07-21T12:00:00.000Z",
      freshVerifiedAt: "2026-07-23T07:15:00.000Z",
      responseStatus: 200,
      contentType: "application/octet-stream",
      byteLength: 330108,
      pageCount: 17,
      paperSha256:
        "9c6a4fbf1d06f1d827bb8c8ddc6eb7cfb4c9218208540c95e62e772f4bc466c2",
      pdfMagicVerified: true,
      sourceStatus: "official_primary_source_hash_verified",
    },
    fidelity: {
      questionNo: 1,
      canonicalization: "s235a.q1_text_nfc_ws.v1",
      q1TextDigestSha256:
        "c39314d7669a77a4eaa1a07523041191c68200f1a84b5e154236a0b41408f108",
      q1TextCharacterCount: 7354,
      structuralAnchorSha256:
        "c4d56b5d603f3b8c7815e67dd1e79e940202aeaca0def85cac56063813c59c71",
      structuralAnchorRecomputed: true,
      pageRange: {
        startPage: 1,
        endPage: 9,
        q2BoundaryPage: 10,
        boundaryPageSharedWithQ2: false,
      },
      structureCounts: {
        koreanParenthesized: 20,
        circledNumerals: 0,
        numberedLines: 62,
        bracketedConditions: 4,
      },
      renderer: "ghostscript-10.02.1-png16m-144dpi",
      visualPageDigests: [
        {
          page: 1,
          sha256:
            "80c416bc14ca8e2f82ee52f4847c7b6c368fa992805a696d85fc44552a9d351c",
          pngBytes: 52872,
        },
        {
          page: 2,
          sha256:
            "8dfd34122d4461e07db9782d2f0ad92e59c79a784f8ed639aed496c4cd22e6c9",
          pngBytes: 42675,
        },
        {
          page: 3,
          sha256:
            "3395c4c0992b15b612fdbb345aed7b995ea06d04ffb8ab9e661a9384f377c6e3",
          pngBytes: 50701,
        },
        {
          page: 4,
          sha256:
            "d507fcb70e7c69682f443b496e6a73b2293837c6a5b2629029104bbe8f8ba83e",
          pngBytes: 50233,
        },
        {
          page: 5,
          sha256:
            "11ae695b497e680613f89dc03c038af773cd10d965bbe6f45d13e62b8ec40976",
          pngBytes: 44112,
        },
        {
          page: 6,
          sha256:
            "0c4d128d4a9d127deae60dbd85cd6a913819980e183fa024947dc38aee32a1c8",
          pngBytes: 47632,
        },
        {
          page: 7,
          sha256:
            "9e18a22820dbf9ba03a3feb19edab265829222d6f9e57ea387f6a5fb9bf22f47",
          pngBytes: 55570,
        },
        {
          page: 8,
          sha256:
            "b8dc3e11904fd66376585f49025f2e9e63e6edf3b969fe6654f838d296afbd3c",
          pngBytes: 46878,
        },
        {
          page: 9,
          sha256:
            "c0767b97bd4d14baa5de378a749774cfcea506f6d6212ec7e2c90cc5e7a9b62b",
          pngBytes: 60648,
        },
      ],
    },
  },
  theory: {
    selectionId: "s235a-theory-2026-q1",
    source: {
      sourceId: "qnet-appraiser-second-2026-theory",
      sourceVersion: "5268128.2261216.5b10f1ffb2e39b82",
      authority: "qnet",
      authorityHost: "www.q-net.or.kr",
      articleId: "5268128",
      fileSequence: "2261216",
      examYear: 2026,
      subject: "theory",
      acquiredAt: "2026-07-21T12:00:00.000Z",
      freshVerifiedAt: "2026-07-23T07:15:00.000Z",
      responseStatus: 200,
      contentType: "application/octet-stream",
      byteLength: 176169,
      pageCount: 3,
      paperSha256:
        "5b10f1ffb2e39b82260d0d6cad3631ab7429cf80716ad0c1b39b44252d65b32c",
      pdfMagicVerified: true,
      sourceStatus: "official_primary_source_hash_verified",
    },
    fidelity: {
      questionNo: 1,
      canonicalization: "s235a.q1_text_nfc_ws.v1",
      q1TextDigestSha256:
        "a63f98242a1c79f4a6461430f7b18604ae5c0cb9862fba831962c117080d3872",
      q1TextCharacterCount: 889,
      structuralAnchorSha256:
        "bb3bff8a64d7d74a0f9cbdfbdb0e8d88bd9d402fe582c3fc5e0b2bcfe3673764",
      structuralAnchorRecomputed: true,
      pageRange: {
        startPage: 1,
        endPage: 1,
        q2BoundaryPage: 2,
        boundaryPageSharedWithQ2: false,
      },
      structureCounts: {
        koreanParenthesized: 0,
        circledNumerals: 0,
        numberedLines: 17,
        bracketedConditions: 1,
      },
      renderer: "ghostscript-10.02.1-png16m-144dpi",
      visualPageDigests: [
        {
          page: 1,
          sha256:
            "887425901cfd133aa618f46e54d5cd3134700e6c457800df6963440f450defe1",
          pngBytes: 57369,
        },
      ],
    },
  },
  law: {
    selectionId: "s235a-law-2026-q1",
    source: {
      sourceId: "qnet-appraiser-second-2026-law",
      sourceVersion: "5268128.2261217.8e1ae7faa097ea7f",
      authority: "qnet",
      authorityHost: "www.q-net.or.kr",
      articleId: "5268128",
      fileSequence: "2261217",
      examYear: 2026,
      subject: "law",
      acquiredAt: "2026-07-21T12:00:00.000Z",
      freshVerifiedAt: "2026-07-23T07:15:00.000Z",
      responseStatus: 200,
      contentType: "application/octet-stream",
      byteLength: 251109,
      pageCount: 5,
      paperSha256:
        "8e1ae7faa097ea7fb6de300208188992032e44ade9ca767179fedf234f69249a",
      pdfMagicVerified: true,
      sourceStatus: "official_primary_source_hash_verified",
    },
    fidelity: {
      questionNo: 1,
      canonicalization: "s235a.q1_text_nfc_ws.v1",
      q1TextDigestSha256:
        "8092798a574ee3a88d1211cac6a7afb1eb65939dac18a271ef6e2f300bc97a47",
      q1TextCharacterCount: 1405,
      structuralAnchorSha256:
        "dd577a6d54e0eb6d104e67d746d1ef63baaf938cd99ff4cf027337017b26b3d7",
      structuralAnchorRecomputed: true,
      pageRange: {
        startPage: 1,
        endPage: 2,
        q2BoundaryPage: 3,
        boundaryPageSharedWithQ2: false,
      },
      structureCounts: {
        koreanParenthesized: 0,
        circledNumerals: 4,
        numberedLines: 5,
        bracketedConditions: 1,
      },
      renderer: "ghostscript-10.02.1-png16m-144dpi",
      visualPageDigests: [
        {
          page: 1,
          sha256:
            "50df14004a2c3f30aa122e808718ef37301e9c9058b37c3323b1d1af8a4af166",
          pngBytes: 70775,
        },
        {
          page: 2,
          sha256:
            "0ff431d23b85e4ccec65c32890020578cd2a9f312041d090df8db78189daa156",
          pngBytes: 25814,
        },
      ],
    },
  },
} as const;

export const S235A_TRUSTED_SELECTIONS = S235A_SUBJECT_ORDER.map((subject) => ({
  selectionId: TRUSTED_SOURCE_BY_SUBJECT[subject].selectionId,
  subject,
  examYear: 2026,
  questionNo: 1,
  source: TRUSTED_SOURCE_BY_SUBJECT[subject].source,
  fidelity: {
    ...TRUSTED_SOURCE_BY_SUBJECT[subject].fidelity,
    independentAudit: {
      receiptId: S235A_INDEPENDENT_AUDIT_RECEIPT_ID,
      auditedAt: "2026-07-23T07:28:49.000Z",
      privateAuditResultSha256: S235A_INDEPENDENT_AUDIT_RESULT_SHA256,
      status: "passed",
      q1BoundaryConfirmed: true,
      q2BoundaryExcluded: true,
      visualCompletenessConfirmed: true,
      sourceHashesConfirmed: true,
      contentTranscribed: false,
      o3aApproval: false,
    },
  },
  lawVersionEvidenceRequired: subject === "law",
})) as readonly JsonRecord[];

export const S235A_EXPECTED_RIGHTS_EVIDENCE = {
  evidenceId: "s235a-qnet-rights-2026-q1-golden-3",
  authority: "qnet",
  authorityHost: "www.q-net.or.kr",
  noticeArticleId: "5259147",
  noticeSnapshotSha256:
    "7d6b086afb50fe0ca580b0f57ceb8d572af100b21850ca81810ec2171c72ddb2",
  noticeAcquiredAt: "2026-07-21T12:00:00.000Z",
  freshReconciledAt: "2026-07-23T07:30:00.000Z",
  freshDetailResponseSha256:
    "3bba9dd0cbdba41ce384d5f30e8b29341df0aff27155734e0428a82577816069",
  freshNoticeResponseSha256:
    "7c0973ea3997cfd3f5e968b3ad14b202f0327594956975f2527affebed674875",
  exactPostArticleId: "5268128",
  exactPostAttachmentIdentityPassed: true,
  historicalScopedNoticeParsePassed: true,
  freshCompositeMarkerCheckPassed: true,
  licenseId: "KOGL-TYPE-1",
  licensedRightsStatus: "redistribution_allowed",
  scopeMaterialKind: "qnet_past_questions",
  scopeStartYear: 2014,
  attributionRequired: true,
  commercialUseAllowed: true,
  modificationAllowed: true,
  boundSourceIds: S235A_SUBJECT_ORDER.map(
    (subject) => TRUSTED_SOURCE_BY_SUBJECT[subject].source.sourceId,
  ),
  mostRestrictiveDecision: {
    proposedUse: "owner_private_readiness_only_pending_o3a",
    o3aStatus: "pending_owner_decision",
    publicUseAllowed: false,
    sharedCorpusUseAllowed: false,
    learnerUseAllowed: false,
    executionAllowed: false,
    attributionRequired: true,
    ambiguityConvertedToPermission: false,
    blockerCodes: ["o3a_owner_decision_pending"],
  },
} as const;

export const S235A_EXPECTED_LAW_VERSION_EVIDENCE = {
  evidenceId: "s235a-law-2026-q1-exam-date-version",
  selectionId: "s235a-law-2026-q1",
  lawSourceId: "law-source-land-compensation-act",
  authority: "national_law_information_center",
  authorityHost: "www.law.go.kr",
  officialLawId: "009295",
  lsiSeq: "286903",
  jurisdiction: "KR",
  examDate: "2026-07-04",
  effectiveFrom: "2026-06-16",
  promulgationNumber: "21798",
  versionIdentityReceiptSha256:
    "c8039823b548676cbc655ee6a26a1d3c878816b14bef120861de53913ebd4334",
  versionIdentityReceiptBytes: 146174,
  checkedAt: "2026-07-23T07:15:00.000Z",
  versionStatus: "applicable_to_exam_date",
  versionIdentityVerified: true,
  currentAtCheckedAt: true,
  principalStatuteBindingVerified: true,
  fullLegalSupportClosureDeferredToS236A: true,
  legalMaterialBytesCommitted: false,
  currentLawSubstitutedForExamDateLaw: false,
  unresolvedConflictCount: 0,
} as const;

const PACKAGE_CHECKS = {
  practice: [
    "independent_recalculation",
    "unit_consistency",
    "rounding_consistency",
    "giii_reset_safe",
  ],
  theory: [
    "definition_coverage",
    "logic_chain_coverage",
    "source_coverage",
    "unsupported_claim_rejection",
  ],
  law: [
    "exam_date_version",
    "principal_rule_source",
    "article_citation",
    "full_legal_support_closure",
    "unsupported_legal_claim_rejection",
  ],
} as const;

export const S235A_EXPECTED_PRIVATE_PACKAGES = S235A_SUBJECT_ORDER.map(
  (subject, index) => ({
    packageId: S235A_FUTURE_PACKAGE_IDS[index],
    selectionId: S235A_SELECTION_IDS[index],
    subject,
    targetSchemaVersion: "answer_pack.2.0",
    status: "private_schema_ready_not_generated",
    requiredCheckIds: [...PACKAGE_CHECKS[subject]],
    privateVaultRequired: true,
    generated: false,
    bodyCommitted: false,
    s214Started: false,
    s215Started: false,
    released: false,
    learnerUseAllowed: false,
    publicUseAllowed: false,
    sharedCorpusUseAllowed: false,
  }),
) as readonly JsonRecord[];

export const S235A_EXPECTED_O3A_PACKET = {
  packetId: S235A_O3A_PACKET_ID,
  status: "pending_owner_decision",
  ownerApproved: false,
  selectionIds: [...S235A_SELECTION_IDS],
  futurePackageIds: [...S235A_FUTURE_PACKAGE_IDS],
  requestedScope: "approve_s236a_owner_private_golden_3_execution_only",
  allowedOperationIds: [
    "s236a_private_reference_package_authoring",
    "s236a_private_golden_3_execution",
  ],
  excludedOperationIds: [
    "golden_9",
    "d0",
    "d_plus_1",
    "d_plus_7",
    "real_learner",
    "owner_alpha",
    "preview",
    "production",
    "public_or_shared_exposure",
    "environment_secret_flag_allowlist",
    "provider_model_prompt",
    "billing_entitlement",
    "telemetry_navigation",
  ],
  ownerAction: "approve_or_reject_exact_packet",
  evidenceIds: [
    "s235a-qnet-rights-2026-q1-golden-3",
    "s235a-private-fidelity-review-20260723T072849Z-af5282021a88",
    "s235a-law-2026-q1-exam-date-version",
  ],
  unapprovedSafeState: "remain_queued_no_execution",
  packetExpiresAt: "2026-07-30T14:59:59.000Z",
  wildcardScopeAllowed: false,
  automaticStartAllowed: false,
  manualS236AStartRequired: true,
  o3aStarted: false,
  s236aStarted: false,
} as const;

export const S235A_EXPECTED_CONTROL_PLANE_STATE = {
  authority: "roadmap/active-program.yml",
  selectedItemIds: ["S235B", "O3A"],
  s235aStatus: "completed",
  s235bStatus: "queued",
  o3aStatus: "queued",
  o3aOwnerDecision: "pending",
  o3aStarted: false,
  s236aStatus: "queued",
  s236aMissingDependencies: ["O3A"],
  s236aStarted: false,
  golden3Started: false,
  downstreamAutomaticStartAllowed: false,
  s235bMutatedByThisWork: false,
} as const;

export function buildS235aTrustedReadinessManifest() {
  return {
    schemaVersion: S235A_READINESS_SCHEMA_VERSION,
    manifestId: S235A_MANIFEST_ID,
    generatedAt: S235A_GENERATED_AT,
    readinessStatus: S235A_READINESS_STATUS,
    examIdentity: {
      qualificationId: "qnet-gid-60-appraiser",
      examRound: "second",
      examYear: 2026,
      examDate: "2026-07-04",
      questionNo: 1,
      subjects: [...S235A_SUBJECT_ORDER],
    },
    storagePolicy: {
      metadataOnly: true,
      officialMaterialCommitted: false,
      examMaterialBytesCommitted: false,
      referenceMaterialBytesCommitted: false,
      legalMaterialBytesCommitted: false,
      learnerMaterialBytesCommitted: false,
      privateLocatorCommitted: false,
      sharedCorpusWritten: false,
    },
    boundaryPolicy: {
      ownerPrivateReadinessOnly: true,
      publicUseAuthorized: false,
      sharedUseAuthorized: false,
      learnerUseAuthorized: false,
      executionAuthorized: false,
      evaluationConfigurationTouched: false,
      deploymentConfigurationTouched: false,
      billingEntitlementTouched: false,
      runtimeNavigationTelemetryTouched: false,
    },
    examDateEvidence: {
      evidenceId: "s235a-qnet-2026-second-exam-date",
      authority: "qnet",
      authorityHost: "www.q-net.or.kr",
      qualificationId: "qnet-gid-60-appraiser",
      examDate: "2026-07-04",
      acquiredAt: "2026-07-21T12:00:00.000Z",
      responseSha256:
        "78fb4b31723d329cb31d0d19fd37789ec7ad11222bbd4cf34bec2883f410c514",
      authorityStatus: "official_primary_source",
    },
    rightsEvidence: structuredClone(S235A_EXPECTED_RIGHTS_EVIDENCE),
    selections: structuredClone(S235A_TRUSTED_SELECTIONS),
    lawVersionEvidence: structuredClone(
      S235A_EXPECTED_LAW_VERSION_EVIDENCE,
    ),
    privatePackageReadiness: structuredClone(
      S235A_EXPECTED_PRIVATE_PACKAGES,
    ),
    o3aApprovalPacket: structuredClone(S235A_EXPECTED_O3A_PACKET),
    controlPlaneState: structuredClone(
      S235A_EXPECTED_CONTROL_PLANE_STATE,
    ),
  };
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stableCanonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableCanonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, stableCanonicalValue(nested)]),
  );
}

export function stableS235aStringify(value: unknown): string {
  return JSON.stringify(stableCanonicalValue(value));
}

export function s235aCanonicalSha256(value: unknown): string {
  return createHash("sha256").update(stableS235aStringify(value)).digest("hex");
}

function sameCanonicalValue(left: unknown, right: unknown): boolean {
  return stableS235aStringify(left) === stableS235aStringify(right);
}

function addError(errors: string[], code: string, detail: string) {
  errors.push(`${code}:${detail}`);
}

function closedRecord(
  value: unknown,
  path: string,
  keys: readonly string[],
  errors: string[],
): JsonRecord | null {
  if (!isRecord(value)) {
    addError(errors, "s235a_closed_schema", `${path}:record_required`);
    return null;
  }
  const expected = new Set(keys);
  for (const key of Object.keys(value)) {
    if (!expected.has(key)) {
      addError(errors, "s235a_closed_schema", `${path}.${key}:unknown_field`);
    }
  }
  for (const key of keys) {
    if (!(key in value)) {
      addError(errors, "s235a_closed_schema", `${path}.${key}:missing_field`);
    }
  }
  return value;
}

function exactArray(
  value: unknown,
  expectedLength: number,
  path: string,
  errors: string[],
): unknown[] {
  if (!Array.isArray(value)) {
    addError(errors, "s235a_closed_schema", `${path}:array_required`);
    return [];
  }
  if (value.length !== expectedLength) {
    addError(
      errors,
      "s235a_closed_schema",
      `${path}:expected_${expectedLength}_items`,
    );
  }
  return value;
}

function assertSha256(value: unknown, path: string, errors: string[]) {
  if (
    typeof value !== "string" ||
    !SHA256_PATTERN.test(value) ||
    PLACEHOLDER_SHA256_PATTERN.test(value) ||
    new Set(value).size === 1
  ) {
    addError(errors, "s235a_source_provenance_mismatch", `${path}:sha256`);
  }
}

function assertIsoInstant(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "string" || !ISO_INSTANT_PATTERN.test(value)) {
    addError(errors, "s235a_closed_schema", `${path}:iso_instant`);
  }
}

function assertDate(value: unknown, path: string, errors: string[]) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    addError(errors, "s235a_closed_schema", `${path}:date`);
  }
}

function normalizedKey(key: string) {
  return key.normalize("NFKC").replace(/[^a-z0-9]/giu, "").toLowerCase();
}

function addPrivacyErrors(
  value: unknown,
  errors: string[],
  path = "manifest",
) {
  if (typeof value === "string") {
    for (const pattern of FORBIDDEN_STRING_PATTERNS) {
      if (pattern.test(value)) {
        addError(errors, "s235a_privacy_boundary", `${path}:unsafe_string`);
        break;
      }
    }
    const hangulCount = (value.match(/[가-힣]/gu) ?? []).length;
    if (hangulCount > 40) {
      addError(errors, "s235a_privacy_boundary", `${path}:prose_bearing_string`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      addPrivacyErrors(entry, errors, `${path}[${index}]`),
    );
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, nested] of Object.entries(value)) {
    const normalized = normalizedKey(key);
    if (
      FORBIDDEN_KEY_FRAGMENTS.some((fragment) =>
        normalized.includes(fragment),
      )
    ) {
      addError(
        errors,
        "s235a_privacy_boundary",
        `${path}.${key}:forbidden_key`,
      );
    }
    addPrivacyErrors(nested, errors, `${path}.${key}`);
  }
}

function validateExamIdentity(value: unknown, errors: string[]) {
  const record = closedRecord(
    value,
    "manifest.examIdentity",
    [
      "qualificationId",
      "examRound",
      "examYear",
      "examDate",
      "questionNo",
      "subjects",
    ],
    errors,
  );
  if (!record) return;
  const expected = {
    qualificationId: "qnet-gid-60-appraiser",
    examRound: "second",
    examYear: 2026,
    examDate: "2026-07-04",
    questionNo: 1,
    subjects: [...S235A_SUBJECT_ORDER],
  };
  assertDate(record.examDate, "manifest.examIdentity.examDate", errors);
  if (!sameCanonicalValue(record, expected)) {
    addError(
      errors,
      "s235a_selection_mismatch",
      "manifest.examIdentity:exact_scope",
    );
  }
}

function validateStoragePolicy(value: unknown, errors: string[]) {
  const keys = [
    "metadataOnly",
    "officialMaterialCommitted",
    "examMaterialBytesCommitted",
    "referenceMaterialBytesCommitted",
    "legalMaterialBytesCommitted",
    "learnerMaterialBytesCommitted",
    "privateLocatorCommitted",
    "sharedCorpusWritten",
  ];
  const record = closedRecord(value, "manifest.storagePolicy", keys, errors);
  if (!record) return;
  const expected = {
    metadataOnly: true,
    officialMaterialCommitted: false,
    examMaterialBytesCommitted: false,
    referenceMaterialBytesCommitted: false,
    legalMaterialBytesCommitted: false,
    learnerMaterialBytesCommitted: false,
    privateLocatorCommitted: false,
    sharedCorpusWritten: false,
  };
  if (!sameCanonicalValue(record, expected)) {
    addError(
      errors,
      "s235a_privacy_boundary",
      "manifest.storagePolicy:metadata_only",
    );
  }
}

function validateBoundaryPolicy(value: unknown, errors: string[]) {
  const keys = [
    "ownerPrivateReadinessOnly",
    "publicUseAuthorized",
    "sharedUseAuthorized",
    "learnerUseAuthorized",
    "executionAuthorized",
    "evaluationConfigurationTouched",
    "deploymentConfigurationTouched",
    "billingEntitlementTouched",
    "runtimeNavigationTelemetryTouched",
  ];
  const record = closedRecord(value, "manifest.boundaryPolicy", keys, errors);
  if (!record) return;
  const expected = {
    ownerPrivateReadinessOnly: true,
    publicUseAuthorized: false,
    sharedUseAuthorized: false,
    learnerUseAuthorized: false,
    executionAuthorized: false,
    evaluationConfigurationTouched: false,
    deploymentConfigurationTouched: false,
    billingEntitlementTouched: false,
    runtimeNavigationTelemetryTouched: false,
  };
  if (!sameCanonicalValue(record, expected)) {
    addError(
      errors,
      "s235a_privacy_boundary",
      "manifest.boundaryPolicy:no_change_envelope",
    );
  }
}

function validateExamDateEvidence(value: unknown, errors: string[]) {
  const keys = [
    "evidenceId",
    "authority",
    "authorityHost",
    "qualificationId",
    "examDate",
    "acquiredAt",
    "responseSha256",
    "authorityStatus",
  ];
  const record = closedRecord(
    value,
    "manifest.examDateEvidence",
    keys,
    errors,
  );
  if (!record) return;
  assertDate(record.examDate, "manifest.examDateEvidence.examDate", errors);
  assertIsoInstant(
    record.acquiredAt,
    "manifest.examDateEvidence.acquiredAt",
    errors,
  );
  assertSha256(
    record.responseSha256,
    "manifest.examDateEvidence.responseSha256",
    errors,
  );
  const expected = {
    evidenceId: "s235a-qnet-2026-second-exam-date",
    authority: "qnet",
    authorityHost: "www.q-net.or.kr",
    qualificationId: "qnet-gid-60-appraiser",
    examDate: "2026-07-04",
    acquiredAt: "2026-07-21T12:00:00.000Z",
    responseSha256:
      "78fb4b31723d329cb31d0d19fd37789ec7ad11222bbd4cf34bec2883f410c514",
    authorityStatus: "official_primary_source",
  };
  if (!sameCanonicalValue(record, expected)) {
    addError(
      errors,
      "s235a_source_provenance_mismatch",
      "manifest.examDateEvidence:trusted_receipt",
    );
  }
}

function validateRightsEvidence(value: unknown, errors: string[]) {
  const keys = [
    "evidenceId",
    "authority",
    "authorityHost",
    "noticeArticleId",
    "noticeSnapshotSha256",
    "noticeAcquiredAt",
    "freshReconciledAt",
    "freshDetailResponseSha256",
    "freshNoticeResponseSha256",
    "exactPostArticleId",
    "exactPostAttachmentIdentityPassed",
    "historicalScopedNoticeParsePassed",
    "freshCompositeMarkerCheckPassed",
    "licenseId",
    "licensedRightsStatus",
    "scopeMaterialKind",
    "scopeStartYear",
    "attributionRequired",
    "commercialUseAllowed",
    "modificationAllowed",
    "boundSourceIds",
    "mostRestrictiveDecision",
  ];
  const record = closedRecord(
    value,
    "manifest.rightsEvidence",
    keys,
    errors,
  );
  if (!record) return;
  assertSha256(
    record.noticeSnapshotSha256,
    "manifest.rightsEvidence.noticeSnapshotSha256",
    errors,
  );
  assertSha256(
    record.freshDetailResponseSha256,
    "manifest.rightsEvidence.freshDetailResponseSha256",
    errors,
  );
  assertSha256(
    record.freshNoticeResponseSha256,
    "manifest.rightsEvidence.freshNoticeResponseSha256",
    errors,
  );
  assertIsoInstant(
    record.noticeAcquiredAt,
    "manifest.rightsEvidence.noticeAcquiredAt",
    errors,
  );
  assertIsoInstant(
    record.freshReconciledAt,
    "manifest.rightsEvidence.freshReconciledAt",
    errors,
  );
  exactArray(
    record.boundSourceIds,
    S235A_SUBJECT_ORDER.length,
    "manifest.rightsEvidence.boundSourceIds",
    errors,
  );
  closedRecord(
    record.mostRestrictiveDecision,
    "manifest.rightsEvidence.mostRestrictiveDecision",
    [
      "proposedUse",
      "o3aStatus",
      "publicUseAllowed",
      "sharedCorpusUseAllowed",
      "learnerUseAllowed",
      "executionAllowed",
      "attributionRequired",
      "ambiguityConvertedToPermission",
      "blockerCodes",
    ],
    errors,
  );
  if (!sameCanonicalValue(record, S235A_EXPECTED_RIGHTS_EVIDENCE)) {
    addError(
      errors,
      "s235a_rights_scope_mismatch",
      "manifest.rightsEvidence:trusted_exact_scope",
    );
  }
}

function validateSource(
  value: unknown,
  index: number,
  expected: JsonRecord,
  errors: string[],
) {
  const path = `manifest.selections[${index}].source`;
  const record = closedRecord(
    value,
    path,
    [
      "sourceId",
      "sourceVersion",
      "authority",
      "authorityHost",
      "articleId",
      "fileSequence",
      "examYear",
      "subject",
      "acquiredAt",
      "freshVerifiedAt",
      "responseStatus",
      "contentType",
      "byteLength",
      "pageCount",
      "paperSha256",
      "pdfMagicVerified",
      "sourceStatus",
    ],
    errors,
  );
  if (!record) return;
  assertIsoInstant(record.acquiredAt, `${path}.acquiredAt`, errors);
  assertIsoInstant(record.freshVerifiedAt, `${path}.freshVerifiedAt`, errors);
  assertSha256(record.paperSha256, `${path}.paperSha256`, errors);
  if (!sameCanonicalValue(record, expected)) {
    addError(
      errors,
      "s235a_source_provenance_mismatch",
      `${path}:trusted_asset`,
    );
  }
}

function validateFidelity(
  value: unknown,
  index: number,
  expected: JsonRecord,
  errors: string[],
) {
  const path = `manifest.selections[${index}].fidelity`;
  const record = closedRecord(
    value,
    path,
    [
      "questionNo",
      "canonicalization",
      "q1TextDigestSha256",
      "q1TextCharacterCount",
      "structuralAnchorSha256",
      "structuralAnchorRecomputed",
      "pageRange",
      "structureCounts",
      "renderer",
      "visualPageDigests",
      "independentAudit",
    ],
    errors,
  );
  if (!record) return;
  assertSha256(record.q1TextDigestSha256, `${path}.q1TextDigestSha256`, errors);
  assertSha256(
    record.structuralAnchorSha256,
    `${path}.structuralAnchorSha256`,
    errors,
  );
  const pageRange = closedRecord(
    record.pageRange,
    `${path}.pageRange`,
    [
      "startPage",
      "endPage",
      "q2BoundaryPage",
      "boundaryPageSharedWithQ2",
    ],
    errors,
  );
  closedRecord(
    record.structureCounts,
    `${path}.structureCounts`,
    [
      "koreanParenthesized",
      "circledNumerals",
      "numberedLines",
      "bracketedConditions",
    ],
    errors,
  );
  const expectedVisualPages = Array.isArray(expected.visualPageDigests)
    ? expected.visualPageDigests.length
    : 0;
  const visualPages = exactArray(
    record.visualPageDigests,
    expectedVisualPages,
    `${path}.visualPageDigests`,
    errors,
  );
  visualPages.forEach((page, pageIndex) => {
    const pageRecord = closedRecord(
      page,
      `${path}.visualPageDigests[${pageIndex}]`,
      ["page", "sha256", "pngBytes"],
      errors,
    );
    if (pageRecord) {
      assertSha256(
        pageRecord.sha256,
        `${path}.visualPageDigests[${pageIndex}].sha256`,
        errors,
      );
    }
  });
  const audit = closedRecord(
    record.independentAudit,
    `${path}.independentAudit`,
    [
      "receiptId",
      "auditedAt",
      "privateAuditResultSha256",
      "status",
      "q1BoundaryConfirmed",
      "q2BoundaryExcluded",
      "visualCompletenessConfirmed",
      "sourceHashesConfirmed",
      "contentTranscribed",
      "o3aApproval",
    ],
    errors,
  );
  if (audit) {
    assertIsoInstant(audit.auditedAt, `${path}.independentAudit.auditedAt`, errors);
    assertSha256(
      audit.privateAuditResultSha256,
      `${path}.independentAudit.privateAuditResultSha256`,
      errors,
    );
  }
  if (
    typeof record.q1TextDigestSha256 === "string" &&
    (record.q1TextDigestSha256 ===
      (TRUSTED_SOURCE_BY_SUBJECT[S235A_SUBJECT_ORDER[index]]?.source
        .paperSha256 as string) ||
      record.q1TextDigestSha256 === record.structuralAnchorSha256)
  ) {
    addError(
      errors,
      "s235a_q1_fidelity_mismatch",
      `${path}:q1_digest_not_distinct`,
    );
  }
  if (
    pageRange &&
    (pageRange.boundaryPageSharedWithQ2 !== false ||
      pageRange.q2BoundaryPage !== Number(pageRange.endPage) + 1)
  ) {
    addError(
      errors,
      "s235a_q1_fidelity_mismatch",
      `${path}:q2_boundary_not_excluded`,
    );
  }
  if (!audit || audit.status !== "passed" || audit.o3aApproval !== false) {
    addError(
      errors,
      "s235a_independent_audit_missing",
      `${path}:independent_receipt`,
    );
  }
  if (!sameCanonicalValue(record, expected)) {
    addError(
      errors,
      "s235a_q1_fidelity_mismatch",
      `${path}:trusted_q1_fidelity`,
    );
  }
}

function validateSelections(value: unknown, errors: string[]) {
  const selections = exactArray(
    value,
    S235A_SUBJECT_ORDER.length,
    "manifest.selections",
    errors,
  );
  selections.forEach((selection, index) => {
    const path = `manifest.selections[${index}]`;
    const record = closedRecord(
      selection,
      path,
      [
        "selectionId",
        "subject",
        "examYear",
        "questionNo",
        "source",
        "fidelity",
        "lawVersionEvidenceRequired",
      ],
      errors,
    );
    if (!record) return;
    const expected = S235A_TRUSTED_SELECTIONS[index];
    if (!expected) {
      addError(
        errors,
        "s235a_selection_mismatch",
        `${path}:unexpected_selection`,
      );
      return;
    }
    if (
      record.selectionId !== S235A_SELECTION_IDS[index] ||
      record.subject !== S235A_SUBJECT_ORDER[index] ||
      record.examYear !== 2026 ||
      record.questionNo !== 1 ||
      record.lawVersionEvidenceRequired !==
        (S235A_SUBJECT_ORDER[index] === "law")
    ) {
      addError(
        errors,
        "s235a_selection_mismatch",
        `${path}:exact_2026_q1_subject`,
      );
    }
    validateSource(record.source, index, expected.source as JsonRecord, errors);
    validateFidelity(
      record.fidelity,
      index,
      expected.fidelity as JsonRecord,
      errors,
    );
  });
  const selectionIds = selections
    .filter(isRecord)
    .map((selection) => selection.selectionId);
  if (
    new Set(selectionIds).size !== S235A_SELECTION_IDS.length ||
    !sameCanonicalValue(selectionIds, S235A_SELECTION_IDS)
  ) {
    addError(
      errors,
      "s235a_selection_mismatch",
      "manifest.selections:unique_exact_order",
    );
  }
}

function validateLawVersionEvidence(value: unknown, errors: string[]) {
  const keys = [
    "evidenceId",
    "selectionId",
    "lawSourceId",
    "authority",
    "authorityHost",
    "officialLawId",
    "lsiSeq",
    "jurisdiction",
    "examDate",
    "effectiveFrom",
    "promulgationNumber",
    "versionIdentityReceiptSha256",
    "versionIdentityReceiptBytes",
    "checkedAt",
    "versionStatus",
    "versionIdentityVerified",
    "currentAtCheckedAt",
    "principalStatuteBindingVerified",
    "fullLegalSupportClosureDeferredToS236A",
    "legalMaterialBytesCommitted",
    "currentLawSubstitutedForExamDateLaw",
    "unresolvedConflictCount",
  ];
  const record = closedRecord(
    value,
    "manifest.lawVersionEvidence",
    keys,
    errors,
  );
  if (!record) return;
  assertDate(
    record.examDate,
    "manifest.lawVersionEvidence.examDate",
    errors,
  );
  assertDate(
    record.effectiveFrom,
    "manifest.lawVersionEvidence.effectiveFrom",
    errors,
  );
  assertIsoInstant(
    record.checkedAt,
    "manifest.lawVersionEvidence.checkedAt",
    errors,
  );
  assertSha256(
    record.versionIdentityReceiptSha256,
    "manifest.lawVersionEvidence.versionIdentityReceiptSha256",
    errors,
  );
  if (
    typeof record.examDate !== "string" ||
    typeof record.effectiveFrom !== "string" ||
    record.effectiveFrom > record.examDate
  ) {
    addError(
      errors,
      "s235a_law_version_mismatch",
      "manifest.lawVersionEvidence:effective_after_exam",
    );
  }
  if (
    !sameCanonicalValue(record, S235A_EXPECTED_LAW_VERSION_EVIDENCE)
  ) {
    addError(
      errors,
      "s235a_law_version_mismatch",
      "manifest.lawVersionEvidence:trusted_exam_date_version",
    );
  }
}

function validatePrivatePackages(value: unknown, errors: string[]) {
  const packages = exactArray(
    value,
    S235A_SUBJECT_ORDER.length,
    "manifest.privatePackageReadiness",
    errors,
  );
  packages.forEach((candidate, index) => {
    const path = `manifest.privatePackageReadiness[${index}]`;
    const record = closedRecord(
      candidate,
      path,
      [
        "packageId",
        "selectionId",
        "subject",
        "targetSchemaVersion",
        "status",
        "requiredCheckIds",
        "privateVaultRequired",
        "generated",
        "bodyCommitted",
        "s214Started",
        "s215Started",
        "released",
        "learnerUseAllowed",
        "publicUseAllowed",
        "sharedCorpusUseAllowed",
      ],
      errors,
    );
    if (!record) return;
    const expected = S235A_EXPECTED_PRIVATE_PACKAGES[index];
    if (!expected) {
      addError(
        errors,
        "s235a_private_package_state_invalid",
        `${path}:unexpected_package`,
      );
      return;
    }
    const expectedCheckCount = Array.isArray(expected.requiredCheckIds)
      ? expected.requiredCheckIds.length
      : 0;
    exactArray(
      record.requiredCheckIds,
      expectedCheckCount,
      `${path}.requiredCheckIds`,
      errors,
    );
    if (!sameCanonicalValue(record, expected)) {
      addError(
        errors,
        "s235a_private_package_state_invalid",
        `${path}:schema_ready_not_generated`,
      );
    }
  });
}

function validateO3aPacket(value: unknown, errors: string[]) {
  const keys = [
    "packetId",
    "status",
    "ownerApproved",
    "selectionIds",
    "futurePackageIds",
    "requestedScope",
    "allowedOperationIds",
    "excludedOperationIds",
    "ownerAction",
    "evidenceIds",
    "unapprovedSafeState",
    "packetExpiresAt",
    "wildcardScopeAllowed",
    "automaticStartAllowed",
    "manualS236AStartRequired",
    "o3aStarted",
    "s236aStarted",
  ];
  const record = closedRecord(
    value,
    "manifest.o3aApprovalPacket",
    keys,
    errors,
  );
  if (!record) return;
  exactArray(
    record.selectionIds,
    S235A_SELECTION_IDS.length,
    "manifest.o3aApprovalPacket.selectionIds",
    errors,
  );
  exactArray(
    record.futurePackageIds,
    S235A_FUTURE_PACKAGE_IDS.length,
    "manifest.o3aApprovalPacket.futurePackageIds",
    errors,
  );
  exactArray(
    record.allowedOperationIds,
    S235A_EXPECTED_O3A_PACKET.allowedOperationIds.length,
    "manifest.o3aApprovalPacket.allowedOperationIds",
    errors,
  );
  exactArray(
    record.excludedOperationIds,
    S235A_EXPECTED_O3A_PACKET.excludedOperationIds.length,
    "manifest.o3aApprovalPacket.excludedOperationIds",
    errors,
  );
  assertIsoInstant(
    record.packetExpiresAt,
    "manifest.o3aApprovalPacket.packetExpiresAt",
    errors,
  );
  if (
    record.packetExpiresAt !== S235A_EXPECTED_O3A_PACKET.packetExpiresAt ||
    S235A_EXPECTED_O3A_PACKET.packetExpiresAt <= S235A_GENERATED_AT
  ) {
    addError(
      errors,
      "s235a_o3a_packet_invalid",
      "manifest.o3aApprovalPacket:expiry",
    );
  }
  if (
    typeof record.requestedScope === "string" &&
    /[*?]|all_questions|golden_9|current_or_future/iu.test(
      record.requestedScope,
    )
  ) {
    addError(
      errors,
      "s235a_o3a_packet_invalid",
      "manifest.o3aApprovalPacket:wildcard_scope",
    );
  }
  if (!sameCanonicalValue(record, S235A_EXPECTED_O3A_PACKET)) {
    addError(
      errors,
      "s235a_o3a_packet_invalid",
      "manifest.o3aApprovalPacket:exact_pending_packet",
    );
  }
}

function validateControlPlaneState(value: unknown, errors: string[]) {
  const record = closedRecord(
    value,
    "manifest.controlPlaneState",
    [
      "authority",
      "selectedItemIds",
      "s235aStatus",
      "s235bStatus",
      "o3aStatus",
      "o3aOwnerDecision",
      "o3aStarted",
      "s236aStatus",
      "s236aMissingDependencies",
      "s236aStarted",
      "golden3Started",
      "downstreamAutomaticStartAllowed",
      "s235bMutatedByThisWork",
    ],
    errors,
  );
  if (!record) return;
  exactArray(
    record.selectedItemIds,
    2,
    "manifest.controlPlaneState.selectedItemIds",
    errors,
  );
  exactArray(
    record.s236aMissingDependencies,
    1,
    "manifest.controlPlaneState.s236aMissingDependencies",
    errors,
  );
  if (!sameCanonicalValue(record, S235A_EXPECTED_CONTROL_PLANE_STATE)) {
    addError(
      errors,
      "s235a_o3a_packet_invalid",
      "manifest.controlPlaneState:no_automatic_start",
    );
  }
}

export function validateS235aReadinessManifest(
  value: unknown,
): S235aValidationResult {
  const errors: string[] = [];
  addPrivacyErrors(value, errors);
  try {
    assertNoRawUserDataInDerived(value);
  } catch {
    addError(
      errors,
      "s235a_privacy_boundary",
      "manifest:raw_user_data_key",
    );
  }

  const manifest = closedRecord(
    value,
    "manifest",
    [
      "schemaVersion",
      "manifestId",
      "generatedAt",
      "readinessStatus",
      "examIdentity",
      "storagePolicy",
      "boundaryPolicy",
      "examDateEvidence",
      "rightsEvidence",
      "selections",
      "lawVersionEvidence",
      "privatePackageReadiness",
      "o3aApprovalPacket",
      "controlPlaneState",
    ],
    errors,
  );
  if (!manifest) {
    return { valid: false, errors: [...new Set(errors)].sort() };
  }

  if (manifest.schemaVersion !== S235A_READINESS_SCHEMA_VERSION) {
    addError(errors, "s235a_closed_schema", "manifest.schemaVersion");
  }
  if (manifest.manifestId !== S235A_MANIFEST_ID) {
    addError(errors, "s235a_selection_mismatch", "manifest.manifestId");
  }
  assertIsoInstant(manifest.generatedAt, "manifest.generatedAt", errors);
  if (manifest.generatedAt !== S235A_GENERATED_AT) {
    addError(errors, "s235a_closed_schema", "manifest.generatedAt:pinned");
  }
  if (manifest.readinessStatus !== S235A_READINESS_STATUS) {
    addError(
      errors,
      "s235a_o3a_packet_invalid",
      "manifest.readinessStatus",
    );
  }

  validateExamIdentity(manifest.examIdentity, errors);
  validateStoragePolicy(manifest.storagePolicy, errors);
  validateBoundaryPolicy(manifest.boundaryPolicy, errors);
  validateExamDateEvidence(manifest.examDateEvidence, errors);
  validateRightsEvidence(manifest.rightsEvidence, errors);
  validateSelections(manifest.selections, errors);
  validateLawVersionEvidence(manifest.lawVersionEvidence, errors);
  validatePrivatePackages(manifest.privatePackageReadiness, errors);
  validateO3aPacket(manifest.o3aApprovalPacket, errors);
  validateControlPlaneState(manifest.controlPlaneState, errors);

  return { valid: errors.length === 0, errors: [...new Set(errors)].sort() };
}

export function buildS235aReadinessReport(value: unknown) {
  const validation = validateS235aReadinessManifest(value);
  if (!validation.valid) {
    throw new Error(`s235a-readiness-invalid:${validation.errors.join("|")}`);
  }
  const manifest = value as JsonRecord;
  const selections = manifest.selections as JsonRecord[];
  const packages = manifest.privatePackageReadiness as JsonRecord[];
  return {
    schemaVersion: S235A_REPORT_SCHEMA_VERSION,
    manifestId: S235A_MANIFEST_ID,
    generatedAt: S235A_GENERATED_AT,
    readinessStatus: S235A_READINESS_STATUS,
    manifestDigestSha256: s235aCanonicalSha256(manifest),
    o3aPacketDigestSha256: s235aCanonicalSha256(
      manifest.o3aApprovalPacket,
    ),
    counts: {
      selectionCount: selections.length,
      sourceHashVerifiedCount: selections.filter(
        (selection) =>
          (selection.source as JsonRecord).sourceStatus ===
          "official_primary_source_hash_verified",
      ).length,
      independentFidelityAuditPassedCount: selections.filter(
        (selection) =>
          ((selection.fidelity as JsonRecord)
            .independentAudit as JsonRecord).status === "passed",
      ).length,
      lawExamDateVersionEvidenceCount: 1,
      privatePackageSchemaReadyCount: packages.length,
      generatedPackageCount: packages.filter(
        (candidate) => candidate.generated === true,
      ).length,
      releasedPackageCount: packages.filter(
        (candidate) => candidate.released === true,
      ).length,
      actionableValidationBlockerCount: 0,
    },
    subjectOrder: [...S235A_SUBJECT_ORDER],
    selectionIds: [...S235A_SELECTION_IDS],
    futurePackageIds: [...S235A_FUTURE_PACKAGE_IDS],
    rightsUseDecision: "owner_private_readiness_only_pending_o3a",
    lawVersionStatus: "applicable_to_exam_date",
    executionStatus: "blocked_pending_o3a",
    approvalGateCodes: ["o3a_owner_decision_pending"],
    controlPlane: {
      selectedItemIds: ["S235B", "O3A"],
      s235aStatus: "completed",
      o3aStatus: "queued_pending_owner_decision",
      o3aStarted: false,
      s236aStatus: "queued_blocked_by_o3a",
      s236aStarted: false,
      golden3Started: false,
      downstreamAutomaticStartAllowed: false,
    },
    metadataOnly: true,
    safeUse: "s235a_readiness_evidence_only",
  } as const;
}

export function validateS235aReadinessReport(
  manifest: unknown,
  report: unknown,
): S235aValidationResult {
  const errors: string[] = [];
  let expected: unknown;
  try {
    expected = buildS235aReadinessReport(manifest);
  } catch {
    return {
      valid: false,
      errors: ["s235a_report_evidence_digest_mismatch:manifest_invalid"],
    };
  }
  addPrivacyErrors(report, errors, "report");
  if (!sameCanonicalValue(report, expected)) {
    addError(
      errors,
      "s235a_report_evidence_digest_mismatch",
      "report:stale_or_non_deterministic",
    );
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort() };
}

import type {
  OwnerAlphaClaimVerificationState,
} from "./owner-alpha-practice-contract";
import type { OwnerAlphaLawAdapterModel } from "./owner-alpha-subject-adapter-contract";

export const OWNER_ALPHA_LAW_REASONING_PATH_VERSION =
  "owner_alpha_law_reasoning_path.v1" as const;

export const OWNER_ALPHA_LAW_REASONING_DIMENSIONS = [
  "issue",
  "authority_source_binding",
  "effective_date",
  "requirements_and_effect",
  "requirement_fact_mapping",
  "application_subsumption",
  "conclusion",
] as const;

export type OwnerAlphaLawReasoningDimension =
  (typeof OWNER_ALPHA_LAW_REASONING_DIMENSIONS)[number];

export type OwnerAlphaLawReasoningCommitment = {
  issueFraming: string;
  legalBasisPlan: string;
  requirementEffectPlan: string;
  factApplicationDirection: string;
  tentativeConclusion: string;
  confidence: "low" | "medium" | "high";
  committedAt: string;
};

export type OwnerAlphaLawAuthorityBinding = {
  authorityKind: "law" | "article" | "precedent_or_adjudication";
  label: string;
  officialSourceRefId: string;
};

export type OwnerAlphaLawRequirement = {
  requirementId: string;
  requirement: string;
  legalEffect: string;
};

export type OwnerAlphaLawRequirementFactMapping = {
  requirementId: string;
  factApplication: string;
};

export type OwnerAlphaLawRepairSubmission = {
  issue: string;
  authorityBindings: OwnerAlphaLawAuthorityBinding[];
  effectiveDate: string;
  requirements: OwnerAlphaLawRequirement[];
  requirementFactMappings: OwnerAlphaLawRequirementFactMapping[];
  application: string;
  conclusion: string;
  procedure: string | null;
  precedentOrAdjudication: string | null;
  opposingInterpretation: string | null;
};

export type OwnerAlphaLawStructuralCheck = {
  dimension: OwnerAlphaLawReasoningDimension;
  status:
    | "supported"
    | "missing"
    | "duplicate_ref"
    | "unknown_ref"
    | "mismatch"
    | "unresolved"
    | "conflicting"
    | "unbound"
    | "stale"
    | "unlinked";
  reasonCodes: string[];
};

export type OwnerAlphaLawStoredAuthority = OwnerAlphaLawAuthorityBinding & {
  state: OwnerAlphaClaimVerificationState;
};

export type OwnerAlphaLawReasoningPathV1 = {
  contractVersion: typeof OWNER_ALPHA_LAW_REASONING_PATH_VERSION;
  pathId: string;
  problemRevisionChecksum: string;
  adapterBasisChecksum: string;
  postCommitStoredAuthorities: OwnerAlphaLawStoredAuthority[];
  postCommitEffectiveDate: {
    effectiveAt: string | null;
    state: "problem_given" | "official_source_grounded" | "unresolved_needs_review";
    officialSourceRefId: string | null;
  };
  requiredDimensions: OwnerAlphaLawReasoningDimension[];
  procedureRequired: boolean;
  precedentOrAdjudicationRequired: boolean;
  opposingInterpretationRequired: boolean;
  initialCommitment: OwnerAlphaLawReasoningCommitment;
  revisedCommitment: OwnerAlphaLawReasoningCommitment | null;
  repairSubmission: OwnerAlphaLawRepairSubmission | null;
  repairVerification: {
    scope: "source_version_and_structure_only";
    status:
      | "not_started"
      | "blocked"
      | "source_version_structurally_supported";
    checks: OwnerAlphaLawStructuralCheck[];
    blockerCodes: string[];
    supportedAt: string | null;
  };
  basisChecksum: string;
};

const PATH_KEYS = [
  "contractVersion",
  "pathId",
  "problemRevisionChecksum",
  "adapterBasisChecksum",
  "postCommitStoredAuthorities",
  "postCommitEffectiveDate",
  "requiredDimensions",
  "procedureRequired",
  "precedentOrAdjudicationRequired",
  "opposingInterpretationRequired",
  "initialCommitment",
  "revisedCommitment",
  "repairSubmission",
  "repairVerification",
  "basisChecksum",
] as const;
const COMMITMENT_KEYS = [
  "issueFraming",
  "legalBasisPlan",
  "requirementEffectPlan",
  "factApplicationDirection",
  "tentativeConclusion",
  "confidence",
  "committedAt",
] as const;
const AUTHORITY_KEYS = [
  "authorityKind",
  "label",
  "officialSourceRefId",
] as const;
const STORED_AUTHORITY_KEYS = [...AUTHORITY_KEYS, "state"] as const;
const EFFECTIVE_DATE_KEYS = [
  "effectiveAt",
  "state",
  "officialSourceRefId",
] as const;
const REQUIREMENT_KEYS = ["requirementId", "requirement", "legalEffect"] as const;
const MAPPING_KEYS = ["requirementId", "factApplication"] as const;
const CHECK_KEYS = ["dimension", "status", "reasonCodes"] as const;
const VERIFICATION_KEYS = [
  "scope",
  "status",
  "checks",
  "blockerCodes",
  "supportedAt",
] as const;
const REPAIR_KEYS = [
  "issue",
  "authorityBindings",
  "effectiveDate",
  "requirements",
  "requirementFactMappings",
  "application",
  "conclusion",
  "procedure",
  "precedentOrAdjudication",
  "opposingInterpretation",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function nonEmpty(value: unknown, minimum = 1): value is string {
  return typeof value === "string" && value.trim().length >= minimum;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function duplicate(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function exactOrder(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function validIso(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validCommitment(value: unknown): value is OwnerAlphaLawReasoningCommitment {
  return (
    isRecord(value) &&
    hasExactKeys(value, COMMITMENT_KEYS) &&
    nonEmpty(value.issueFraming, 3) &&
    nonEmpty(value.legalBasisPlan, 3) &&
    nonEmpty(value.requirementEffectPlan, 3) &&
    nonEmpty(value.factApplicationDirection, 3) &&
    nonEmpty(value.tentativeConclusion, 3) &&
    ["low", "medium", "high"].includes(String(value.confidence)) &&
    validIso(value.committedAt)
  );
}

function validAuthority(value: unknown): value is OwnerAlphaLawAuthorityBinding {
  return (
    isRecord(value) &&
    hasExactKeys(value, AUTHORITY_KEYS) &&
    ["law", "article", "precedent_or_adjudication"].includes(String(value.authorityKind)) &&
    nonEmpty(value.label) &&
    nonEmpty(value.officialSourceRefId)
  );
}

function validStoredAuthority(value: unknown): value is OwnerAlphaLawStoredAuthority {
  return (
    isRecord(value) &&
    hasExactKeys(value, STORED_AUTHORITY_KEYS) &&
    ["law", "article", "precedent_or_adjudication"].includes(String(value.authorityKind)) &&
    nonEmpty(value.label) &&
    nonEmpty(value.officialSourceRefId) &&
    [
      "problem_given",
      "official_source_grounded",
      "deterministically_validated",
      "cross_checked_ai",
      "ai_inference",
      "unresolved_needs_review",
    ].includes(String(value.state))
  );
}

function validCheck(value: unknown): value is OwnerAlphaLawStructuralCheck {
  if (!isRecord(value) || !hasExactKeys(value, CHECK_KEYS)) return false;
  return (
    OWNER_ALPHA_LAW_REASONING_DIMENSIONS.includes(value.dimension as OwnerAlphaLawReasoningDimension) &&
    [
      "supported",
      "missing",
      "duplicate_ref",
      "unknown_ref",
      "mismatch",
      "unresolved",
      "conflicting",
      "unbound",
      "stale",
      "unlinked",
    ].includes(String(value.status)) &&
    stringArray(value.reasonCodes) &&
    !duplicate(value.reasonCodes)
  );
}

function validRepairSubmission(value: unknown): value is OwnerAlphaLawRepairSubmission {
  if (!isRecord(value) || !hasExactKeys(value, REPAIR_KEYS)) return false;
  return (
    typeof value.issue === "string" &&
    Array.isArray(value.authorityBindings) &&
    value.authorityBindings.every(validAuthority) &&
    typeof value.effectiveDate === "string" &&
    Array.isArray(value.requirements) &&
    value.requirements.every(
      (item) =>
        isRecord(item) &&
        hasExactKeys(item, REQUIREMENT_KEYS) &&
        typeof item.requirementId === "string" &&
        typeof item.requirement === "string" &&
        typeof item.legalEffect === "string",
    ) &&
    Array.isArray(value.requirementFactMappings) &&
    value.requirementFactMappings.every(
      (item) =>
        isRecord(item) &&
        hasExactKeys(item, MAPPING_KEYS) &&
        typeof item.requirementId === "string" &&
        typeof item.factApplication === "string",
    ) &&
    typeof value.application === "string" &&
    typeof value.conclusion === "string" &&
    (value.procedure === null || typeof value.procedure === "string") &&
    (value.precedentOrAdjudication === null ||
      typeof value.precedentOrAdjudication === "string") &&
    (value.opposingInterpretation === null ||
      typeof value.opposingInterpretation === "string")
  );
}

export function isOwnerAlphaLawReasoningPath(
  value: unknown,
): value is OwnerAlphaLawReasoningPathV1 {
  if (!isRecord(value) || !hasExactKeys(value, PATH_KEYS)) return false;
  if (
    value.contractVersion !== OWNER_ALPHA_LAW_REASONING_PATH_VERSION ||
    !nonEmpty(value.pathId) ||
    !nonEmpty(value.problemRevisionChecksum) ||
    !nonEmpty(value.adapterBasisChecksum) ||
    !Array.isArray(value.postCommitStoredAuthorities) ||
    !value.postCommitStoredAuthorities.every(validStoredAuthority) ||
    duplicate(value.postCommitStoredAuthorities.map((item) => item.officialSourceRefId)) ||
    !isRecord(value.postCommitEffectiveDate) ||
    !hasExactKeys(value.postCommitEffectiveDate, EFFECTIVE_DATE_KEYS) ||
    !(value.postCommitEffectiveDate.effectiveAt === null || typeof value.postCommitEffectiveDate.effectiveAt === "string") ||
    !["problem_given", "official_source_grounded", "unresolved_needs_review"].includes(String(value.postCommitEffectiveDate.state)) ||
    !(value.postCommitEffectiveDate.officialSourceRefId === null || typeof value.postCommitEffectiveDate.officialSourceRefId === "string") ||
    !stringArray(value.requiredDimensions) ||
    !exactOrder(value.requiredDimensions, OWNER_ALPHA_LAW_REASONING_DIMENSIONS) ||
    typeof value.procedureRequired !== "boolean" ||
    typeof value.precedentOrAdjudicationRequired !== "boolean" ||
    typeof value.opposingInterpretationRequired !== "boolean" ||
    !validCommitment(value.initialCommitment) ||
    (value.revisedCommitment !== null && !validCommitment(value.revisedCommitment)) ||
    (value.repairSubmission !== null &&
      !validRepairSubmission(value.repairSubmission)) ||
    !isRecord(value.repairVerification) ||
    !hasExactKeys(value.repairVerification, VERIFICATION_KEYS) ||
    !nonEmpty(value.basisChecksum)
  ) {
    return false;
  }
  const verification = value.repairVerification;
  if (
    verification.scope !== "source_version_and_structure_only" ||
    !["not_started", "blocked", "source_version_structurally_supported"].includes(String(verification.status)) ||
    !Array.isArray(verification.checks) ||
    !verification.checks.every(validCheck) ||
    !stringArray(verification.blockerCodes) ||
    duplicate(verification.blockerCodes) ||
    (verification.supportedAt !== null && !validIso(verification.supportedAt))
  ) return false;
  if (verification.status === "not_started") {
    return value.revisedCommitment === null && value.repairSubmission === null && verification.checks.length === 0 && verification.blockerCodes.length === 0 && verification.supportedAt === null;
  }
  if (
    value.revisedCommitment === null ||
    value.repairSubmission === null ||
    verification.checks.length !== OWNER_ALPHA_LAW_REASONING_DIMENSIONS.length ||
    !exactOrder(verification.checks.map((check) => check.dimension), OWNER_ALPHA_LAW_REASONING_DIMENSIONS)
  ) return false;
  if (verification.status === "source_version_structurally_supported") {
    return verification.checks.every((check) => check.status === "supported") && verification.blockerCodes.length === 0 && verification.supportedAt !== null;
  }
  return verification.checks.some((check) => check.status !== "supported") && verification.blockerCodes.length > 0 && verification.supportedAt === null;
}

function storedAuthorities(adapter: OwnerAlphaLawAdapterModel): OwnerAlphaLawStoredAuthority[] {
  return [
    ...adapter.applicableLawCandidates.map((item) => ({
      authorityKind: "law" as const,
      label: item.label,
      state: item.state,
      officialSourceRefId: item.officialSourceRefId,
    })),
    ...adapter.articleAndParagraphReferences.map((item) => ({
      authorityKind: "article" as const,
      label: item.citation,
      state: item.state,
      officialSourceRefId: item.officialSourceRefId,
    })),
    ...adapter.precedentOrAdjudicationReference.map((item) => ({
      authorityKind: "precedent_or_adjudication" as const,
      label: item.citation,
      state: item.state,
      officialSourceRefId: item.officialSourceRefId,
    })),
  ].flatMap((item) =>
    item.state === "official_source_grounded" && item.officialSourceRefId?.trim()
      ? [{ ...item, officialSourceRefId: item.officialSourceRefId.trim() }]
      : [],
  );
}

export function ownerAlphaLawReasoningPathProjection(input: {
  pathId: string;
  problemRevisionChecksum: string;
  adapterBasisChecksum: string;
  adapter: OwnerAlphaLawAdapterModel;
  initialCommitment: OwnerAlphaLawReasoningCommitment;
  basisChecksum: string;
}): OwnerAlphaLawReasoningPathV1 {
  if (input.adapter.adapter !== "LawAdapter" || input.adapter.subject !== "appraisal_compensation_law") {
    throw new Error("owner-alpha-law-reasoning-path:adapter_required");
  }
  if (!validCommitment(input.initialCommitment)) {
    throw new Error("owner-alpha-law-reasoning-path:invalid_initial_commitment");
  }
  return {
    contractVersion: OWNER_ALPHA_LAW_REASONING_PATH_VERSION,
    pathId: input.pathId,
    problemRevisionChecksum: input.problemRevisionChecksum,
    adapterBasisChecksum: input.adapterBasisChecksum,
    postCommitStoredAuthorities: storedAuthorities(input.adapter),
    postCommitEffectiveDate: {
      effectiveAt: input.adapter.effectiveDateRequirement.effectiveAt,
      state: input.adapter.effectiveDateRequirement.state,
      officialSourceRefId:
        input.adapter.effectiveDateRequirement.officialSourceRefId,
    },
    requiredDimensions: [...OWNER_ALPHA_LAW_REASONING_DIMENSIONS],
    procedureRequired: input.adapter.procedure.length > 0,
    precedentOrAdjudicationRequired: input.adapter.precedentOrAdjudicationReference.length > 0,
    opposingInterpretationRequired: input.adapter.opposingInterpretation.length > 0,
    initialCommitment: input.initialCommitment,
    revisedCommitment: null,
    repairSubmission: null,
    repairVerification: {
      scope: "source_version_and_structure_only",
      status: "not_started",
      checks: [],
      blockerCodes: [],
      supportedAt: null,
    },
    basisChecksum: input.basisChecksum,
  };
}

function statusFor(reasons: readonly string[]) {
  if (reasons.length === 0) return "supported" as const;
  for (const status of ["missing", "duplicate_ref", "unknown_ref", "unlinked", "conflicting", "unbound", "stale", "unresolved", "mismatch"] as const) {
    if (reasons.some((reason) => reason.endsWith(`:${status}`))) return status;
  }
  return "mismatch" as const;
}

function check(dimension: OwnerAlphaLawReasoningDimension, reasons: string[]): OwnerAlphaLawStructuralCheck {
  const reasonCodes = [...new Set(reasons)];
  return { dimension, status: statusFor(reasonCodes), reasonCodes };
}

function authorityCheck(path: OwnerAlphaLawReasoningPathV1, submission: OwnerAlphaLawRepairSubmission) {
  const reasons: string[] = [];
  const submitted = Array.isArray(submission.authorityBindings) ? submission.authorityBindings : [];
  if (submitted.length === 0) reasons.push("law_repair:authority_source_binding:missing");
  if (path.postCommitStoredAuthorities.length === 0) reasons.push("law_repair:authority_source_binding:unresolved");
  const submittedRefs = submitted.flatMap((item) => validAuthority(item) ? [item.officialSourceRefId] : []);
  if (submittedRefs.length !== submitted.length) reasons.push("law_repair:authority_source_binding:unknown_ref");
  if (duplicate(submittedRefs)) reasons.push("law_repair:authority_source_binding:duplicate_ref");
  for (const item of submitted) {
    if (!validAuthority(item)) continue;
    const exact = path.postCommitStoredAuthorities.some((stored) =>
      stored.authorityKind === item.authorityKind && stored.label === item.label && stored.officialSourceRefId === item.officialSourceRefId && stored.state === "official_source_grounded",
    );
    if (!exact) reasons.push("law_repair:authority_source_binding:unbound");
  }
  return check("authority_source_binding", reasons);
}

function requirementChecks(submission: OwnerAlphaLawRepairSubmission) {
  const requirements = Array.isArray(submission.requirements) ? submission.requirements : [];
  const mappings = Array.isArray(submission.requirementFactMappings) ? submission.requirementFactMappings : [];
  const requirementReasons: string[] = [];
  const mappingReasons: string[] = [];
  if (requirements.length === 0) requirementReasons.push("law_repair:requirements_and_effect:missing");
  const ids: string[] = [];
  for (const item of requirements) {
    if (!isRecord(item) || !hasExactKeys(item, REQUIREMENT_KEYS) || !nonEmpty(item.requirementId) || !nonEmpty(item.requirement, 3) || !nonEmpty(item.legalEffect, 3)) {
      requirementReasons.push("law_repair:requirements_and_effect:missing");
      continue;
    }
    ids.push(item.requirementId);
  }
  if (duplicate(ids)) requirementReasons.push("law_repair:requirements_and_effect:duplicate_ref");
  if (mappings.length === 0) mappingReasons.push("law_repair:requirement_fact_mapping:missing");
  const mappedIds: string[] = [];
  for (const item of mappings) {
    if (!isRecord(item) || !hasExactKeys(item, MAPPING_KEYS) || !nonEmpty(item.requirementId) || !nonEmpty(item.factApplication, 3)) {
      mappingReasons.push("law_repair:requirement_fact_mapping:missing");
      continue;
    }
    mappedIds.push(item.requirementId);
    if (!ids.includes(item.requirementId)) mappingReasons.push("law_repair:requirement_fact_mapping:unknown_ref");
  }
  if (duplicate(mappedIds)) mappingReasons.push("law_repair:requirement_fact_mapping:duplicate_ref");
  if (ids.some((id) => !mappedIds.includes(id))) mappingReasons.push("law_repair:requirement_fact_mapping:unlinked");
  return [
    check("requirements_and_effect", requirementReasons),
    check("requirement_fact_mapping", mappingReasons),
  ] as const;
}

export function verifyOwnerAlphaLawRepair(input: {
  path: OwnerAlphaLawReasoningPathV1;
  adapter: OwnerAlphaLawAdapterModel;
  revisedCommitment: OwnerAlphaLawReasoningCommitment;
  submission: OwnerAlphaLawRepairSubmission;
  supportedAt: string;
  problemRevisionChecksum: string;
  adapterBasisChecksum: string;
  basisChecksum: string;
}): OwnerAlphaLawReasoningPathV1 {
  const submission = input.submission;
  const issueReasons = nonEmpty(submission?.issue, 3) ? [] : ["law_repair:issue:missing"];
  const authority = authorityCheck(input.path, submission);
  const dateReasons: string[] = [];
  const expectedDate = input.path.postCommitEffectiveDate;
  if (!nonEmpty(submission?.effectiveDate)) dateReasons.push("law_repair:effective_date:missing");
  if (!expectedDate.effectiveAt) dateReasons.push("law_repair:effective_date:unresolved");
  if (expectedDate.state !== "official_source_grounded" || !expectedDate.officialSourceRefId?.trim()) {
    dateReasons.push("law_repair:effective_date:unbound");
  }
  if (expectedDate.effectiveAt && submission?.effectiveDate !== expectedDate.effectiveAt) {
    dateReasons.push("law_repair:effective_date:mismatch");
  }
  const officialArticleDates = input.adapter.articleAndParagraphReferences
    .filter(
      (item) =>
        item.state === "official_source_grounded" &&
        item.officialSourceRefId?.trim() &&
        item.effectiveAt,
    )
    .map((item) => item.effectiveAt as string);
  if (
    new Set(officialArticleDates).size > 1 ||
    (expectedDate.effectiveAt &&
      officialArticleDates.some((date) => date !== expectedDate.effectiveAt))
  ) {
    dateReasons.push("law_repair:effective_date:conflicting");
  }
  if (input.adapter.unresolvedSourceOrVersionIssue.length > 0) dateReasons.push("law_repair:effective_date:stale");
  const [requirements, mappings] = requirementChecks(submission);
  const applicationReasons: string[] = [];
  if (!nonEmpty(submission?.application, 3)) applicationReasons.push("law_repair:application_subsumption:missing");
  if (input.path.procedureRequired && !nonEmpty(submission?.procedure, 3)) applicationReasons.push("law_repair:application_subsumption:missing");
  if (input.path.precedentOrAdjudicationRequired && !nonEmpty(submission?.precedentOrAdjudication, 3)) applicationReasons.push("law_repair:application_subsumption:missing");
  if (input.path.opposingInterpretationRequired && !nonEmpty(submission?.opposingInterpretation, 3)) applicationReasons.push("law_repair:application_subsumption:missing");
  const checks: OwnerAlphaLawStructuralCheck[] = [
    check("issue", issueReasons),
    authority,
    check("effective_date", dateReasons),
    requirements,
    mappings,
    check("application_subsumption", applicationReasons),
    check("conclusion", nonEmpty(submission?.conclusion, 3) ? [] : ["law_repair:conclusion:missing"]),
  ];
  const currentAuthorities = storedAuthorities(input.adapter);
  const pathAuthorities = input.path.postCommitStoredAuthorities;
  const authorityIdentity = (item: OwnerAlphaLawStoredAuthority) => JSON.stringify(item);
  const officialPromotionWithoutRef = [
    ...input.adapter.applicableLawCandidates,
    ...input.adapter.articleAndParagraphReferences,
    ...input.adapter.precedentOrAdjudicationReference,
  ].some((item) => item.state === "official_source_grounded" && !item.officialSourceRefId?.trim());
  const adapterBasisMismatch =
    input.adapter.adapter !== "LawAdapter" ||
    input.adapter.subject !== "appraisal_compensation_law" ||
    input.problemRevisionChecksum !== input.path.problemRevisionChecksum ||
    input.adapterBasisChecksum !== input.path.adapterBasisChecksum ||
    !exactOrder(currentAuthorities.map(authorityIdentity), pathAuthorities.map(authorityIdentity)) ||
    input.adapter.effectiveDateRequirement.effectiveAt !== input.path.postCommitEffectiveDate.effectiveAt ||
    input.adapter.effectiveDateRequirement.state !== input.path.postCommitEffectiveDate.state ||
    input.adapter.effectiveDateRequirement.officialSourceRefId !== input.path.postCommitEffectiveDate.officialSourceRefId ||
    officialPromotionWithoutRef;
  const blockerCodes = [
    ...checks.flatMap((item) => item.reasonCodes),
    ...(adapterBasisMismatch ? ["law_repair:adapter_or_problem_basis_mismatch"] : []),
  ];
  const unique = [...new Set(blockerCodes)];
  const supported = unique.length === 0;
  return {
    ...input.path,
    revisedCommitment: input.revisedCommitment,
    repairSubmission: input.submission,
    repairVerification: {
      scope: "source_version_and_structure_only",
      status: supported ? "source_version_structurally_supported" : "blocked",
      checks,
      blockerCodes: unique,
      supportedAt: supported ? input.supportedAt : null,
    },
    basisChecksum: input.basisChecksum,
  };
}

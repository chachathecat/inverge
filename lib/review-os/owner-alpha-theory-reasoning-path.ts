import type { OwnerAlphaTheoryAdapterModel } from "./owner-alpha-subject-adapter-contract";

export const OWNER_ALPHA_THEORY_REASONING_PATH_VERSION =
  "owner_alpha_theory_reasoning_path.v1" as const;

export const OWNER_ALPHA_THEORY_REASONING_DIMENSIONS = [
  "demand_verb",
  "thesis",
  "ordered_outline_items",
  "selected_concepts",
  "concept_argument_links",
  "comparison_or_evaluation",
  "counter_position",
  "conclusion_and_compression",
] as const;

export type OwnerAlphaTheoryReasoningDimension =
  (typeof OWNER_ALPHA_THEORY_REASONING_DIMENSIONS)[number];

export type OwnerAlphaTheoryOutlineItem = {
  outlineItemId: string;
  label: string;
};

export type OwnerAlphaTheoryConceptSelection = {
  conceptId: string;
  label: string;
};

export type OwnerAlphaTheoryReasoningCommitment = {
  demandVerb: string;
  thesis: string;
  orderedOutlineItems: OwnerAlphaTheoryOutlineItem[];
  selectedConcepts: OwnerAlphaTheoryConceptSelection[];
  confidence: "low" | "medium" | "high";
  committedAt: string;
};

export type OwnerAlphaTheoryConceptArgumentLink = {
  conceptId: string;
  outlineItemId: string;
  argument: string;
};

export type OwnerAlphaTheoryRepairSubmission = {
  demandVerb: string;
  thesis: string;
  orderedOutlineItems: OwnerAlphaTheoryOutlineItem[];
  selectedConcepts: OwnerAlphaTheoryConceptSelection[];
  conceptArgumentLinks: OwnerAlphaTheoryConceptArgumentLink[];
  comparisonOrEvaluation: string | null;
  counterPosition: string | null;
  conclusion: string;
  compression: string;
};

export type OwnerAlphaTheoryStructuralCheck = {
  dimension: OwnerAlphaTheoryReasoningDimension;
  status:
    | "supported"
    | "missing"
    | "unknown_ref"
    | "duplicate_ref"
    | "out_of_order"
    | "mismatch"
    | "unlinked";
  reasonCodes: string[];
};

export type OwnerAlphaTheoryReasoningPathV1 = {
  contractVersion: typeof OWNER_ALPHA_THEORY_REASONING_PATH_VERSION;
  pathId: string;
  problemRevisionChecksum: string;
  adapterBasisChecksum: string;
  postCommitCanonicalOutlineRoleRefs: string[];
  postCommitCanonicalConceptRefs: string[];
  requiredDimensions: OwnerAlphaTheoryReasoningDimension[];
  comparisonOrEvaluationRequired: boolean;
  counterPositionRequired: boolean;
  initialCommitment: OwnerAlphaTheoryReasoningCommitment;
  revisedCommitment: OwnerAlphaTheoryReasoningCommitment | null;
  repairSubmission: OwnerAlphaTheoryRepairSubmission | null;
  repairVerification: {
    scope: "deterministic_structure_only";
    status: "not_started" | "blocked" | "structurally_supported";
    checks: OwnerAlphaTheoryStructuralCheck[];
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
  "postCommitCanonicalOutlineRoleRefs",
  "postCommitCanonicalConceptRefs",
  "requiredDimensions",
  "comparisonOrEvaluationRequired",
  "counterPositionRequired",
  "initialCommitment",
  "revisedCommitment",
  "repairSubmission",
  "repairVerification",
  "basisChecksum",
] as const;
const COMMITMENT_KEYS = [
  "demandVerb",
  "thesis",
  "orderedOutlineItems",
  "selectedConcepts",
  "confidence",
  "committedAt",
] as const;
const OUTLINE_KEYS = ["outlineItemId", "label"] as const;
const CONCEPT_KEYS = ["conceptId", "label"] as const;
const VERIFICATION_KEYS = [
  "scope",
  "status",
  "checks",
  "blockerCodes",
  "supportedAt",
] as const;
const CHECK_KEYS = ["dimension", "status", "reasonCodes"] as const;
const LINK_KEYS = ["conceptId", "outlineItemId", "argument"] as const;
const REPAIR_KEYS = [
  "demandVerb",
  "thesis",
  "orderedOutlineItems",
  "selectedConcepts",
  "conceptArgumentLinks",
  "comparisonOrEvaluation",
  "counterPosition",
  "conclusion",
  "compression",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function isNonEmptyString(value: unknown, minimum = 1): value is string {
  return typeof value === "string" && value.trim().length >= minimum;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasDuplicates(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function exactOrderedMembers(actual: readonly string[], expected: readonly string[]) {
  return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
}

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/\s+/g, " ").trim()
    : "";
}

function validIsoTime(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validOutlineItem(value: unknown): value is OwnerAlphaTheoryOutlineItem {
  return (
    isRecord(value) &&
    hasExactKeys(value, OUTLINE_KEYS) &&
    isNonEmptyString(value.outlineItemId) &&
    isNonEmptyString(value.label, 2)
  );
}

function validConcept(value: unknown): value is OwnerAlphaTheoryConceptSelection {
  return (
    isRecord(value) &&
    hasExactKeys(value, CONCEPT_KEYS) &&
    isNonEmptyString(value.conceptId) &&
    isNonEmptyString(value.label, 2)
  );
}

function isCommitmentShape(value: unknown): value is OwnerAlphaTheoryReasoningCommitment {
  if (!isRecord(value) || !hasExactKeys(value, COMMITMENT_KEYS)) return false;
  if (
    !isNonEmptyString(value.demandVerb) ||
    !isNonEmptyString(value.thesis, 3) ||
    !Array.isArray(value.orderedOutlineItems) ||
    value.orderedOutlineItems.length === 0 ||
    !value.orderedOutlineItems.every(validOutlineItem) ||
    !Array.isArray(value.selectedConcepts) ||
    value.selectedConcepts.length === 0 ||
    !value.selectedConcepts.every(validConcept) ||
    !["low", "medium", "high"].includes(String(value.confidence)) ||
    !validIsoTime(value.committedAt)
  ) {
    return false;
  }
  return (
    !hasDuplicates(value.orderedOutlineItems.map((item) => item.outlineItemId)) &&
    !hasDuplicates(value.selectedConcepts.map((item) => item.conceptId))
  );
}

function isStructuralCheck(value: unknown): value is OwnerAlphaTheoryStructuralCheck {
  if (!isRecord(value) || !hasExactKeys(value, CHECK_KEYS)) return false;
  return (
    OWNER_ALPHA_THEORY_REASONING_DIMENSIONS.includes(
      value.dimension as OwnerAlphaTheoryReasoningDimension,
    ) &&
    [
      "supported",
      "missing",
      "unknown_ref",
      "duplicate_ref",
      "out_of_order",
      "mismatch",
      "unlinked",
    ].includes(String(value.status)) &&
    isStringArray(value.reasonCodes) &&
    !hasDuplicates(value.reasonCodes)
  );
}

function isRepairSubmission(value: unknown): value is OwnerAlphaTheoryRepairSubmission {
  if (!isRecord(value) || !hasExactKeys(value, REPAIR_KEYS)) return false;
  return (
    typeof value.demandVerb === "string" &&
    typeof value.thesis === "string" &&
    Array.isArray(value.orderedOutlineItems) &&
    value.orderedOutlineItems.every(validOutlineItem) &&
    Array.isArray(value.selectedConcepts) &&
    value.selectedConcepts.every(validConcept) &&
    Array.isArray(value.conceptArgumentLinks) &&
    value.conceptArgumentLinks.every(
      (link) =>
        isRecord(link) &&
        hasExactKeys(link, LINK_KEYS) &&
        typeof link.conceptId === "string" &&
        typeof link.outlineItemId === "string" &&
        typeof link.argument === "string",
    ) &&
    (value.comparisonOrEvaluation === null ||
      typeof value.comparisonOrEvaluation === "string") &&
    (value.counterPosition === null ||
      typeof value.counterPosition === "string") &&
    typeof value.conclusion === "string" &&
    typeof value.compression === "string"
  );
}

export function isOwnerAlphaTheoryReasoningPath(
  value: unknown,
): value is OwnerAlphaTheoryReasoningPathV1 {
  if (!isRecord(value) || !hasExactKeys(value, PATH_KEYS)) return false;
  if (
    value.contractVersion !== OWNER_ALPHA_THEORY_REASONING_PATH_VERSION ||
    !isNonEmptyString(value.pathId) ||
    !isNonEmptyString(value.problemRevisionChecksum) ||
    !isNonEmptyString(value.adapterBasisChecksum) ||
    !isStringArray(value.postCommitCanonicalOutlineRoleRefs) ||
    value.postCommitCanonicalOutlineRoleRefs.length === 0 ||
    hasDuplicates(value.postCommitCanonicalOutlineRoleRefs) ||
    !isStringArray(value.postCommitCanonicalConceptRefs) ||
    value.postCommitCanonicalConceptRefs.length === 0 ||
    hasDuplicates(value.postCommitCanonicalConceptRefs) ||
    !isStringArray(value.requiredDimensions) ||
    !exactOrderedMembers(value.requiredDimensions, OWNER_ALPHA_THEORY_REASONING_DIMENSIONS) ||
    typeof value.comparisonOrEvaluationRequired !== "boolean" ||
    typeof value.counterPositionRequired !== "boolean" ||
    !isCommitmentShape(value.initialCommitment) ||
    (value.revisedCommitment !== null && !isCommitmentShape(value.revisedCommitment)) ||
    (value.repairSubmission !== null &&
      !isRepairSubmission(value.repairSubmission)) ||
    !isRecord(value.repairVerification) ||
    !hasExactKeys(value.repairVerification, VERIFICATION_KEYS) ||
    !isNonEmptyString(value.basisChecksum)
  ) {
    return false;
  }
  const verification = value.repairVerification;
  if (
    verification.scope !== "deterministic_structure_only" ||
    !["not_started", "blocked", "structurally_supported"].includes(String(verification.status)) ||
    !Array.isArray(verification.checks) ||
    !verification.checks.every(isStructuralCheck) ||
    !isStringArray(verification.blockerCodes) ||
    hasDuplicates(verification.blockerCodes) ||
    (verification.supportedAt !== null && !validIsoTime(verification.supportedAt))
  ) {
    return false;
  }
  if (verification.status === "not_started") {
    return (
      value.revisedCommitment === null &&
      value.repairSubmission === null &&
      verification.checks.length === 0 &&
      verification.blockerCodes.length === 0 &&
      verification.supportedAt === null
    );
  }
  if (
    value.revisedCommitment === null ||
    value.repairSubmission === null ||
    verification.checks.length !== OWNER_ALPHA_THEORY_REASONING_DIMENSIONS.length ||
    !exactOrderedMembers(
      verification.checks.map((check) => check.dimension),
      OWNER_ALPHA_THEORY_REASONING_DIMENSIONS,
    )
  ) {
    return false;
  }
  if (verification.status === "structurally_supported") {
    return (
      verification.checks.every((check) => check.status === "supported") &&
      verification.blockerCodes.length === 0 &&
      verification.supportedAt !== null
    );
  }
  return (
    verification.checks.some((check) => check.status !== "supported") &&
    verification.blockerCodes.length > 0 &&
    verification.supportedAt === null
  );
}

function validAdapterRefs(adapter: OwnerAlphaTheoryAdapterModel) {
  const outlineRefs = adapter.paragraphRoles;
  const conceptRefs = adapter.keyConceptCoverage.map((item) => item.concept);
  return (
    outlineRefs.length > 0 &&
    conceptRefs.length > 0 &&
    outlineRefs.every((ref) => isNonEmptyString(ref)) &&
    conceptRefs.every((ref) => isNonEmptyString(ref)) &&
    !hasDuplicates(outlineRefs) &&
    !hasDuplicates(conceptRefs)
  );
}

export function ownerAlphaTheoryReasoningPathProjection(input: {
  pathId: string;
  problemRevisionChecksum: string;
  adapterBasisChecksum: string;
  adapter: OwnerAlphaTheoryAdapterModel;
  initialCommitment: OwnerAlphaTheoryReasoningCommitment;
  basisChecksum: string;
}): OwnerAlphaTheoryReasoningPathV1 {
  if (input.adapter.adapter !== "TheoryAdapter" || input.adapter.subject !== "appraisal_theory") {
    throw new Error("owner-alpha-theory-reasoning-path:adapter_required");
  }
  if (!validAdapterRefs(input.adapter)) {
    throw new Error("owner-alpha-theory-reasoning-path:invalid_adapter_refs");
  }
  if (!isCommitmentShape(input.initialCommitment)) {
    throw new Error("owner-alpha-theory-reasoning-path:invalid_initial_commitment");
  }
  return {
    contractVersion: OWNER_ALPHA_THEORY_REASONING_PATH_VERSION,
    pathId: input.pathId,
    problemRevisionChecksum: input.problemRevisionChecksum,
    adapterBasisChecksum: input.adapterBasisChecksum,
    postCommitCanonicalOutlineRoleRefs: [...input.adapter.paragraphRoles],
    postCommitCanonicalConceptRefs: input.adapter.keyConceptCoverage.map((item) => item.concept),
    requiredDimensions: [...OWNER_ALPHA_THEORY_REASONING_DIMENSIONS],
    comparisonOrEvaluationRequired:
      input.adapter.comparisonTargets.length > 0 || input.adapter.evaluation.length > 0,
    counterPositionRequired:
      input.adapter.supportingAndOpposingConsiderations.length > 0 ||
      input.adapter.unresolvedTheoreticalDispute.length > 0,
    initialCommitment: input.initialCommitment,
    revisedCommitment: null,
    repairSubmission: null,
    repairVerification: {
      scope: "deterministic_structure_only",
      status: "not_started",
      checks: [],
      blockerCodes: [],
      supportedAt: null,
    },
    basisChecksum: input.basisChecksum,
  };
}

function checkStatus(reasonCodes: readonly string[]) {
  if (reasonCodes.length === 0) return "supported" as const;
  if (reasonCodes.some((code) => code.endsWith(":missing"))) return "missing" as const;
  if (reasonCodes.some((code) => code.endsWith(":duplicate_ref"))) return "duplicate_ref" as const;
  if (reasonCodes.some((code) => code.endsWith(":unknown_ref"))) return "unknown_ref" as const;
  if (reasonCodes.some((code) => code.endsWith(":out_of_order"))) return "out_of_order" as const;
  if (reasonCodes.some((code) => code.endsWith(":unlinked"))) return "unlinked" as const;
  return "mismatch" as const;
}

function structuralCheck(
  dimension: OwnerAlphaTheoryReasoningDimension,
  reasonCodes: string[],
): OwnerAlphaTheoryStructuralCheck {
  const uniqueReasonCodes = [...new Set(reasonCodes)];
  return { dimension, status: checkStatus(uniqueReasonCodes), reasonCodes: uniqueReasonCodes };
}

function textCheck(
  dimension: "demand_verb" | "thesis",
  revisedValue: unknown,
  submittedValue: unknown,
  minimum: number,
) {
  const reasons: string[] = [];
  if (!isNonEmptyString(revisedValue, minimum) || !isNonEmptyString(submittedValue, minimum)) {
    reasons.push(`theory_repair:${dimension}:missing`);
  } else if (normalizeText(revisedValue) !== normalizeText(submittedValue)) {
    reasons.push(`theory_repair:${dimension}:commitment_mismatch`);
  }
  return structuralCheck(dimension, reasons);
}

function itemListReasons(input: {
  dimension: "ordered_outline_items" | "selected_concepts";
  revised: unknown;
  submitted: unknown;
  idKey: "outlineItemId" | "conceptId";
}) {
  const reasons: string[] = [];
  const revised = Array.isArray(input.revised) ? input.revised : [];
  const submitted = Array.isArray(input.submitted) ? input.submitted : [];
  if (revised.length === 0 || submitted.length === 0) reasons.push(`theory_repair:${input.dimension}:missing`);
  const ids = [...revised, ...submitted].flatMap((item) =>
    isRecord(item) && typeof item[input.idKey] === "string" ? [String(item[input.idKey])] : [],
  );
  if (hasDuplicates(revised.flatMap((item) => isRecord(item) && typeof item[input.idKey] === "string" ? [String(item[input.idKey])] : [])) ||
      hasDuplicates(submitted.flatMap((item) => isRecord(item) && typeof item[input.idKey] === "string" ? [String(item[input.idKey])] : []))) {
    reasons.push(`theory_repair:${input.dimension}:duplicate_ref`);
  }
  if (ids.length !== revised.length + submitted.length) reasons.push(`theory_repair:${input.dimension}:unknown_ref`);
  const revisedIdentity = revised.map((item) => JSON.stringify(item));
  const submittedIdentity = submitted.map((item) => JSON.stringify(item));
  if (!exactOrderedMembers(revisedIdentity, submittedIdentity)) {
    const sameMembers = revisedIdentity.length === submittedIdentity.length && revisedIdentity.every((item) => submittedIdentity.includes(item));
    reasons.push(`theory_repair:${input.dimension}:${sameMembers ? "out_of_order" : "commitment_mismatch"}`);
  }
  return reasons;
}

function conceptArgumentLinkCheck(input: {
  links: unknown;
  selectedConcepts: OwnerAlphaTheoryConceptSelection[];
  orderedOutlineItems: OwnerAlphaTheoryOutlineItem[];
}) {
  const reasons: string[] = [];
  const links = Array.isArray(input.links) ? input.links : [];
  if (links.length === 0) reasons.push("theory_repair:concept_argument_links:missing");
  const conceptIds = new Set(input.selectedConcepts.map((item) => item.conceptId));
  const outlineIds = new Set(input.orderedOutlineItems.map((item) => item.outlineItemId));
  const seen = new Set<string>();
  const linkedConcepts = new Set<string>();
  for (const rawLink of links) {
    if (!isRecord(rawLink) || !hasExactKeys(rawLink, LINK_KEYS)) {
      reasons.push("theory_repair:concept_argument_links:unknown_ref");
      continue;
    }
    const conceptId = rawLink.conceptId;
    const outlineItemId = rawLink.outlineItemId;
    if (typeof conceptId !== "string" || typeof outlineItemId !== "string" || !conceptIds.has(conceptId) || !outlineIds.has(outlineItemId)) {
      reasons.push("theory_repair:concept_argument_links:unknown_ref");
      continue;
    }
    const identity = `${conceptId}\u0000${outlineItemId}`;
    if (seen.has(identity)) reasons.push("theory_repair:concept_argument_links:duplicate_ref");
    seen.add(identity);
    linkedConcepts.add(conceptId);
    if (!isNonEmptyString(rawLink.argument, 3)) reasons.push("theory_repair:concept_argument_links:missing");
  }
  if ([...conceptIds].some((conceptId) => !linkedConcepts.has(conceptId))) {
    reasons.push("theory_repair:concept_argument_links:unlinked");
  }
  return structuralCheck("concept_argument_links", reasons);
}

function optionalRequiredTextCheck(input: {
  dimension: "comparison_or_evaluation" | "counter_position";
  required: boolean;
  value: unknown;
}) {
  const reasons: string[] = [];
  if (input.required && !isNonEmptyString(input.value, 3)) reasons.push(`theory_repair:${input.dimension}:missing`);
  return structuralCheck(input.dimension, reasons);
}

export function verifyOwnerAlphaTheoryRepair(input: {
  path: OwnerAlphaTheoryReasoningPathV1;
  adapter: OwnerAlphaTheoryAdapterModel;
  revisedCommitment: OwnerAlphaTheoryReasoningCommitment;
  submission: OwnerAlphaTheoryRepairSubmission;
  supportedAt: string;
  problemRevisionChecksum: string;
  adapterBasisChecksum: string;
  basisChecksum: string;
}): OwnerAlphaTheoryReasoningPathV1 {
  const submission: Record<string, unknown> = isRecord(input.submission) ? input.submission : {};
  const submittedOutline = Array.isArray(submission.orderedOutlineItems)
    ? submission.orderedOutlineItems.filter(validOutlineItem)
    : [];
  const submittedConcepts = Array.isArray(submission.selectedConcepts)
    ? submission.selectedConcepts.filter(validConcept)
    : [];
  const checks: OwnerAlphaTheoryStructuralCheck[] = [
    textCheck("demand_verb", input.revisedCommitment?.demandVerb, submission.demandVerb, 1),
    textCheck("thesis", input.revisedCommitment?.thesis, submission.thesis, 3),
    structuralCheck("ordered_outline_items", itemListReasons({
      dimension: "ordered_outline_items",
      revised: input.revisedCommitment?.orderedOutlineItems,
      submitted: submission.orderedOutlineItems,
      idKey: "outlineItemId",
    })),
    structuralCheck("selected_concepts", itemListReasons({
      dimension: "selected_concepts",
      revised: input.revisedCommitment?.selectedConcepts,
      submitted: submission.selectedConcepts,
      idKey: "conceptId",
    })),
    conceptArgumentLinkCheck({
      links: submission.conceptArgumentLinks,
      selectedConcepts: submittedConcepts,
      orderedOutlineItems: submittedOutline,
    }),
    optionalRequiredTextCheck({
      dimension: "comparison_or_evaluation",
      required: input.path.comparisonOrEvaluationRequired,
      value: submission.comparisonOrEvaluation,
    }),
    optionalRequiredTextCheck({
      dimension: "counter_position",
      required: input.path.counterPositionRequired,
      value: submission.counterPosition,
    }),
    structuralCheck(
      "conclusion_and_compression",
      !isNonEmptyString(submission.conclusion, 3) || !isNonEmptyString(submission.compression, 3)
        ? ["theory_repair:conclusion_and_compression:missing"]
        : [],
    ),
  ];
  const adapterOutlineRefs = input.adapter.paragraphRoles;
  const adapterConceptRefs = input.adapter.keyConceptCoverage.map((item) => item.concept);
  const adapterBasisMismatch =
    input.adapter.adapter !== "TheoryAdapter" ||
    input.adapter.subject !== "appraisal_theory" ||
    input.problemRevisionChecksum !== input.path.problemRevisionChecksum ||
    input.adapterBasisChecksum !== input.path.adapterBasisChecksum ||
    !exactOrderedMembers(adapterOutlineRefs, input.path.postCommitCanonicalOutlineRoleRefs) ||
    !exactOrderedMembers(adapterConceptRefs, input.path.postCommitCanonicalConceptRefs) ||
    (input.adapter.comparisonTargets.length > 0 || input.adapter.evaluation.length > 0) !== input.path.comparisonOrEvaluationRequired ||
    (input.adapter.supportingAndOpposingConsiderations.length > 0 || input.adapter.unresolvedTheoreticalDispute.length > 0) !== input.path.counterPositionRequired;
  const blockerCodes = [
    ...checks.flatMap((check) => check.reasonCodes),
    ...(adapterBasisMismatch ? ["theory_repair:adapter_or_problem_basis_mismatch"] : []),
  ];
  const uniqueBlockerCodes = [...new Set(blockerCodes)];
  const structurallySupported = uniqueBlockerCodes.length === 0;
  return {
    ...input.path,
    revisedCommitment: input.revisedCommitment,
    repairSubmission: input.submission,
    repairVerification: {
      scope: "deterministic_structure_only",
      status: structurallySupported ? "structurally_supported" : "blocked",
      checks,
      blockerCodes: uniqueBlockerCodes,
      supportedAt: structurallySupported ? input.supportedAt : null,
    },
    basisChecksum: input.basisChecksum,
  };
}

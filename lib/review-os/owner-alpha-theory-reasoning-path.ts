import type { OwnerAlphaTheoryAdapterModel } from "./owner-alpha-subject-adapter-contract";

export const OWNER_ALPHA_THEORY_REASONING_PATH_VERSION =
  "owner_alpha_theory_reasoning_path.v1" as const;

export const OWNER_ALPHA_THEORY_REASONING_DIMENSIONS = [
  "demand_verb",
  "thesis",
  "ordered_outline_roles",
  "selected_concept_refs",
  "concept_argument_links",
  "comparison_or_evaluation",
  "counter_position",
  "conclusion_and_compression",
] as const;

export type OwnerAlphaTheoryReasoningDimension =
  (typeof OWNER_ALPHA_THEORY_REASONING_DIMENSIONS)[number];

export type OwnerAlphaTheoryReasoningCommitment = {
  demandVerb: string;
  thesis: string;
  orderedOutlineRoleRefs: string[];
  selectedConceptRefs: string[];
  confidence: "low" | "medium" | "high";
  committedAt: string;
};

export type OwnerAlphaTheoryConceptArgumentLink = {
  conceptRef: string;
  outlineRoleRef: string;
  argument: string;
};

export type OwnerAlphaTheoryRepairSubmission = {
  demandVerb: string;
  thesis: string;
  orderedOutlineRoleRefs: string[];
  selectedConceptRefs: string[];
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
  availableOutlineRoleRefs: string[];
  availableConceptRefs: string[];
  requiredDimensions: OwnerAlphaTheoryReasoningDimension[];
  comparisonOrEvaluationRequired: boolean;
  counterPositionRequired: boolean;
  initialCommitment: OwnerAlphaTheoryReasoningCommitment;
  revisedCommitment: OwnerAlphaTheoryReasoningCommitment | null;
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
  "availableOutlineRoleRefs",
  "availableConceptRefs",
  "requiredDimensions",
  "comparisonOrEvaluationRequired",
  "counterPositionRequired",
  "initialCommitment",
  "revisedCommitment",
  "repairVerification",
  "basisChecksum",
] as const;

const COMMITMENT_KEYS = [
  "demandVerb",
  "thesis",
  "orderedOutlineRoleRefs",
  "selectedConceptRefs",
  "confidence",
  "committedAt",
] as const;

const VERIFICATION_KEYS = [
  "scope",
  "status",
  "checks",
  "blockerCodes",
  "supportedAt",
] as const;

const CHECK_KEYS = ["dimension", "status", "reasonCodes"] as const;
const LINK_KEYS = ["conceptRef", "outlineRoleRef", "argument"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  );
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

function exactOrderedMembers(
  actual: readonly string[],
  expected: readonly string[],
) {
  return (
    actual.length === expected.length &&
    actual.every((item, index) => item === expected[index])
  );
}

function normalizeText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/\s+/g, " ").trim()
    : "";
}

function validIsoTime(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isCommitmentShape(
  value: unknown,
): value is OwnerAlphaTheoryReasoningCommitment {
  if (!isRecord(value) || !hasExactKeys(value, COMMITMENT_KEYS)) return false;
  return (
    typeof value.demandVerb === "string" &&
    typeof value.thesis === "string" &&
    isStringArray(value.orderedOutlineRoleRefs) &&
    isStringArray(value.selectedConceptRefs) &&
    ["low", "medium", "high"].includes(String(value.confidence)) &&
    validIsoTime(value.committedAt)
  );
}

function commitmentMatchesAvailableRefs(
  commitment: OwnerAlphaTheoryReasoningCommitment,
  outlineRefs: readonly string[],
  conceptRefs: readonly string[],
) {
  return (
    isNonEmptyString(commitment.demandVerb) &&
    isNonEmptyString(commitment.thesis, 3) &&
    !hasDuplicates(commitment.orderedOutlineRoleRefs) &&
    exactOrderedMembers(commitment.orderedOutlineRoleRefs, outlineRefs) &&
    commitment.selectedConceptRefs.length > 0 &&
    !hasDuplicates(commitment.selectedConceptRefs) &&
    commitment.selectedConceptRefs.every((ref) => conceptRefs.includes(ref))
  );
}

function isStructuralCheck(
  value: unknown,
): value is OwnerAlphaTheoryStructuralCheck {
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

export function isOwnerAlphaTheoryReasoningPath(
  value: unknown,
): value is OwnerAlphaTheoryReasoningPathV1 {
  if (!isRecord(value) || !hasExactKeys(value, PATH_KEYS)) return false;
  if (
    value.contractVersion !== OWNER_ALPHA_THEORY_REASONING_PATH_VERSION ||
    !isNonEmptyString(value.pathId) ||
    !isNonEmptyString(value.problemRevisionChecksum) ||
    !isStringArray(value.availableOutlineRoleRefs) ||
    value.availableOutlineRoleRefs.length === 0 ||
    hasDuplicates(value.availableOutlineRoleRefs) ||
    !isStringArray(value.availableConceptRefs) ||
    value.availableConceptRefs.length === 0 ||
    hasDuplicates(value.availableConceptRefs) ||
    !isStringArray(value.requiredDimensions) ||
    !exactOrderedMembers(
      value.requiredDimensions,
      OWNER_ALPHA_THEORY_REASONING_DIMENSIONS,
    ) ||
    typeof value.comparisonOrEvaluationRequired !== "boolean" ||
    typeof value.counterPositionRequired !== "boolean" ||
    !isCommitmentShape(value.initialCommitment) ||
    !commitmentMatchesAvailableRefs(
      value.initialCommitment,
      value.availableOutlineRoleRefs,
      value.availableConceptRefs,
    ) ||
    (value.revisedCommitment !== null &&
      !isCommitmentShape(value.revisedCommitment)) ||
    !isRecord(value.repairVerification) ||
    !hasExactKeys(value.repairVerification, VERIFICATION_KEYS) ||
    !isNonEmptyString(value.basisChecksum)
  ) {
    return false;
  }
  const verification = value.repairVerification;
  if (
    verification.scope !== "deterministic_structure_only" ||
    !["not_started", "blocked", "structurally_supported"].includes(
      String(verification.status),
    ) ||
    !Array.isArray(verification.checks) ||
    !verification.checks.every(isStructuralCheck) ||
    !isStringArray(verification.blockerCodes) ||
    hasDuplicates(verification.blockerCodes) ||
    (verification.supportedAt !== null &&
      !validIsoTime(verification.supportedAt))
  ) {
    return false;
  }
  if (verification.status === "not_started") {
    return (
      value.revisedCommitment === null &&
      verification.checks.length === 0 &&
      verification.blockerCodes.length === 0 &&
      verification.supportedAt === null
    );
  }
  if (
    value.revisedCommitment === null ||
    verification.checks.length !==
      OWNER_ALPHA_THEORY_REASONING_DIMENSIONS.length ||
    !exactOrderedMembers(
      verification.checks.map((check) => check.dimension),
      OWNER_ALPHA_THEORY_REASONING_DIMENSIONS,
    )
  ) {
    return false;
  }
  if (verification.status === "structurally_supported") {
    return (
      commitmentMatchesAvailableRefs(
        value.revisedCommitment,
        value.availableOutlineRoleRefs,
        value.availableConceptRefs,
      ) &&
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
  adapter: OwnerAlphaTheoryAdapterModel;
  initialCommitment: OwnerAlphaTheoryReasoningCommitment;
  basisChecksum: string;
}): OwnerAlphaTheoryReasoningPathV1 {
  if (
    input.adapter.adapter !== "TheoryAdapter" ||
    input.adapter.subject !== "appraisal_theory"
  ) {
    throw new Error("owner-alpha-theory-reasoning-path:adapter_required");
  }
  if (!validAdapterRefs(input.adapter)) {
    throw new Error("owner-alpha-theory-reasoning-path:invalid_adapter_refs");
  }
  const availableOutlineRoleRefs = [...input.adapter.paragraphRoles];
  const availableConceptRefs = input.adapter.keyConceptCoverage.map(
    (item) => item.concept,
  );
  if (
    !isCommitmentShape(input.initialCommitment) ||
    !commitmentMatchesAvailableRefs(
      input.initialCommitment,
      availableOutlineRoleRefs,
      availableConceptRefs,
    )
  ) {
    throw new Error(
      "owner-alpha-theory-reasoning-path:invalid_initial_commitment",
    );
  }
  return {
    contractVersion: OWNER_ALPHA_THEORY_REASONING_PATH_VERSION,
    pathId: input.pathId,
    problemRevisionChecksum: input.problemRevisionChecksum,
    availableOutlineRoleRefs,
    availableConceptRefs,
    requiredDimensions: [...OWNER_ALPHA_THEORY_REASONING_DIMENSIONS],
    comparisonOrEvaluationRequired:
      input.adapter.comparisonTargets.length > 0 ||
      input.adapter.evaluation.length > 0,
    counterPositionRequired:
      input.adapter.supportingAndOpposingConsiderations.length > 0 ||
      input.adapter.unresolvedTheoreticalDispute.length > 0,
    initialCommitment: input.initialCommitment,
    revisedCommitment: null,
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
  if (reasonCodes.some((code) => code.endsWith(":missing"))) {
    return "missing" as const;
  }
  if (reasonCodes.some((code) => code.endsWith(":duplicate_ref"))) {
    return "duplicate_ref" as const;
  }
  if (reasonCodes.some((code) => code.endsWith(":unknown_ref"))) {
    return "unknown_ref" as const;
  }
  if (reasonCodes.some((code) => code.endsWith(":out_of_order"))) {
    return "out_of_order" as const;
  }
  if (reasonCodes.some((code) => code.endsWith(":unlinked"))) {
    return "unlinked" as const;
  }
  return "mismatch" as const;
}

function structuralCheck(
  dimension: OwnerAlphaTheoryReasoningDimension,
  reasonCodes: string[],
): OwnerAlphaTheoryStructuralCheck {
  const uniqueReasonCodes = [...new Set(reasonCodes)];
  return {
    dimension,
    status: checkStatus(uniqueReasonCodes),
    reasonCodes: uniqueReasonCodes,
  };
}

function textCheck(
  dimension: "demand_verb" | "thesis",
  revisedValue: unknown,
  submittedValue: unknown,
  minimum: number,
) {
  const reasons: string[] = [];
  if (!isNonEmptyString(revisedValue, minimum)) {
    reasons.push(`theory_repair:${dimension}:missing`);
  }
  if (!isNonEmptyString(submittedValue, minimum)) {
    reasons.push(`theory_repair:${dimension}:missing`);
  }
  if (
    isNonEmptyString(revisedValue, minimum) &&
    isNonEmptyString(submittedValue, minimum) &&
    normalizeText(revisedValue) !== normalizeText(submittedValue)
  ) {
    reasons.push(`theory_repair:${dimension}:commitment_mismatch`);
  }
  return structuralCheck(dimension, reasons);
}

function referenceListReasons(input: {
  dimension: "ordered_outline_roles" | "selected_concept_refs";
  revisedRefs: unknown;
  submittedRefs: unknown;
  availableRefs: readonly string[];
  requireExactAvailableOrder: boolean;
}) {
  const reasons: string[] = [];
  const revised = isStringArray(input.revisedRefs) ? input.revisedRefs : [];
  const submitted = isStringArray(input.submittedRefs)
    ? input.submittedRefs
    : [];
  if (revised.length === 0 || submitted.length === 0) {
    reasons.push(`theory_repair:${input.dimension}:missing`);
  }
  if (hasDuplicates(revised) || hasDuplicates(submitted)) {
    reasons.push(`theory_repair:${input.dimension}:duplicate_ref`);
  }
  if (
    [...revised, ...submitted].some(
      (ref) => !input.availableRefs.includes(ref),
    )
  ) {
    reasons.push(`theory_repair:${input.dimension}:unknown_ref`);
  }
  if (!exactOrderedMembers(revised, submitted)) {
    reasons.push(`theory_repair:${input.dimension}:commitment_mismatch`);
  }
  if (
    input.requireExactAvailableOrder &&
    (!exactOrderedMembers(revised, input.availableRefs) ||
      !exactOrderedMembers(submitted, input.availableRefs))
  ) {
    const sameMembers =
      revised.length === input.availableRefs.length &&
      submitted.length === input.availableRefs.length &&
      revised.every((ref) => input.availableRefs.includes(ref)) &&
      submitted.every((ref) => input.availableRefs.includes(ref));
    reasons.push(
      `theory_repair:${input.dimension}:${
        sameMembers ? "out_of_order" : "missing"
      }`,
    );
  }
  return reasons;
}

function conceptArgumentLinkCheck(input: {
  links: unknown;
  selectedConceptRefs: readonly string[];
  orderedOutlineRoleRefs: readonly string[];
}) {
  const reasons: string[] = [];
  const links = Array.isArray(input.links) ? input.links : [];
  if (links.length === 0) {
    reasons.push("theory_repair:concept_argument_links:missing");
  }
  const seen = new Set<string>();
  const linkedConcepts = new Set<string>();
  for (const rawLink of links) {
    if (!isRecord(rawLink) || !hasExactKeys(rawLink, LINK_KEYS)) {
      reasons.push("theory_repair:concept_argument_links:unknown_ref");
      continue;
    }
    const conceptRef = rawLink.conceptRef;
    const outlineRoleRef = rawLink.outlineRoleRef;
    if (
      typeof conceptRef !== "string" ||
      typeof outlineRoleRef !== "string" ||
      !input.selectedConceptRefs.includes(conceptRef) ||
      !input.orderedOutlineRoleRefs.includes(outlineRoleRef)
    ) {
      reasons.push("theory_repair:concept_argument_links:unknown_ref");
      continue;
    }
    const identity = `${conceptRef}\u0000${outlineRoleRef}`;
    if (seen.has(identity)) {
      reasons.push("theory_repair:concept_argument_links:duplicate_ref");
    }
    seen.add(identity);
    linkedConcepts.add(conceptRef);
    if (!isNonEmptyString(rawLink.argument, 3)) {
      reasons.push("theory_repair:concept_argument_links:missing");
    }
  }
  if (
    input.selectedConceptRefs.some((conceptRef) => !linkedConcepts.has(conceptRef))
  ) {
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
  if (input.required && !isNonEmptyString(input.value, 3)) {
    reasons.push(`theory_repair:${input.dimension}:missing`);
  }
  return structuralCheck(input.dimension, reasons);
}

function conclusionAndCompressionCheck(submission: unknown) {
  const reasons: string[] = [];
  if (
    !isRecord(submission) ||
    !isNonEmptyString(submission.conclusion, 3) ||
    !isNonEmptyString(submission.compression, 3)
  ) {
    reasons.push("theory_repair:conclusion_and_compression:missing");
  }
  return structuralCheck("conclusion_and_compression", reasons);
}

export function verifyOwnerAlphaTheoryRepair(input: {
  path: OwnerAlphaTheoryReasoningPathV1;
  adapter: OwnerAlphaTheoryAdapterModel;
  revisedCommitment: OwnerAlphaTheoryReasoningCommitment;
  submission: OwnerAlphaTheoryRepairSubmission;
  supportedAt: string;
  basisChecksum: string;
}): OwnerAlphaTheoryReasoningPathV1 {
  const submission: Record<string, unknown> = isRecord(input.submission)
    ? input.submission
    : {};
  const outlineReasons = referenceListReasons({
    dimension: "ordered_outline_roles",
    revisedRefs: input.revisedCommitment?.orderedOutlineRoleRefs,
    submittedRefs: submission.orderedOutlineRoleRefs,
    availableRefs: input.path.availableOutlineRoleRefs,
    requireExactAvailableOrder: true,
  });
  const conceptReasons = referenceListReasons({
    dimension: "selected_concept_refs",
    revisedRefs: input.revisedCommitment?.selectedConceptRefs,
    submittedRefs: submission.selectedConceptRefs,
    availableRefs: input.path.availableConceptRefs,
    requireExactAvailableOrder: false,
  });
  const submittedConceptRefs = isStringArray(submission.selectedConceptRefs)
    ? submission.selectedConceptRefs
    : [];
  const submittedOutlineRefs = isStringArray(submission.orderedOutlineRoleRefs)
    ? submission.orderedOutlineRoleRefs
    : [];
  const checks: OwnerAlphaTheoryStructuralCheck[] = [
    textCheck(
      "demand_verb",
      input.revisedCommitment?.demandVerb,
      submission.demandVerb,
      1,
    ),
    textCheck(
      "thesis",
      input.revisedCommitment?.thesis,
      submission.thesis,
      3,
    ),
    structuralCheck("ordered_outline_roles", outlineReasons),
    structuralCheck("selected_concept_refs", conceptReasons),
    conceptArgumentLinkCheck({
      links: submission.conceptArgumentLinks,
      selectedConceptRefs: submittedConceptRefs,
      orderedOutlineRoleRefs: submittedOutlineRefs,
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
    conclusionAndCompressionCheck(submission),
  ];
  const adapterOutlineRefs = input.adapter.paragraphRoles;
  const adapterConceptRefs = input.adapter.keyConceptCoverage.map(
    (item) => item.concept,
  );
  const adapterBasisMismatch =
    input.adapter.adapter !== "TheoryAdapter" ||
    input.adapter.subject !== "appraisal_theory" ||
    !exactOrderedMembers(
      adapterOutlineRefs,
      input.path.availableOutlineRoleRefs,
    ) ||
    !exactOrderedMembers(adapterConceptRefs, input.path.availableConceptRefs) ||
    (input.adapter.comparisonTargets.length > 0 ||
      input.adapter.evaluation.length > 0) !==
      input.path.comparisonOrEvaluationRequired ||
    (input.adapter.supportingAndOpposingConsiderations.length > 0 ||
      input.adapter.unresolvedTheoreticalDispute.length > 0) !==
      input.path.counterPositionRequired;
  const blockerCodes = [
    ...checks.flatMap((check) => check.reasonCodes),
    ...(adapterBasisMismatch
      ? ["theory_repair:adapter_basis_mismatch"]
      : []),
  ];
  const uniqueBlockerCodes = [...new Set(blockerCodes)];
  const structurallySupported = uniqueBlockerCodes.length === 0;
  return {
    ...input.path,
    revisedCommitment: input.revisedCommitment,
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

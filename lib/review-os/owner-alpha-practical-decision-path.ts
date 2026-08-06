import { validateOwnerAlphaCalculationGraph } from "./owner-alpha-calculation-validator";
import type {
  OwnerAlphaCalculationNode,
  OwnerAlphaMethodFamily,
  OwnerAlphaPracticeProblemModel,
} from "./owner-alpha-practice-contract";

export const OWNER_ALPHA_PRACTICAL_DECISION_PATH_VERSION =
  "owner_alpha_practical_decision_path.v1" as const;

export type OwnerAlphaPracticalMethodCommitment = {
  methodFamily: OwnerAlphaMethodFamily;
  reason: string;
  firstCalculationDirection: string;
  confidence: "low" | "medium" | "high";
  committedAt: string;
};

export type OwnerAlphaPracticalRecalculationSubmission = {
  nodeId: string;
  value: number;
  unit: string | null;
};

export type OwnerAlphaPracticalRecalculationCheck = {
  nodeId: string;
  label: string;
  submittedValue: number | null;
  submittedUnit: string | null;
  deterministicValue: number | null;
  expectedUnit: string | null;
  tolerance: number;
  status:
    | "validated"
    | "missing"
    | "value_mismatch"
    | "unit_mismatch"
    | "deterministic_unavailable";
};

export type OwnerAlphaPracticalDecisionPathV1 = {
  contractVersion: typeof OWNER_ALPHA_PRACTICAL_DECISION_PATH_VERSION;
  pathId: string;
  problemRevisionChecksum: string;
  problemFactNodeIds: string[];
  dataRoleNodeIds: string[];
  dateBasisNodeIds: string[];
  methodCandidateRefs: string[];
  calculationGraphNodeIds: string[];
  initialCommitment: OwnerAlphaPracticalMethodCommitment;
  revisedCommitment: OwnerAlphaPracticalMethodCommitment | null;
  repairVerification: {
    status: "not_started" | "not_available" | "blocked" | "verified";
    checks: OwnerAlphaPracticalRecalculationCheck[];
    blockerCodes: string[];
    verifiedAt: string | null;
  };
  basisChecksum: string;
};

const METHOD_FAMILIES = new Set<OwnerAlphaMethodFamily>([
  "cost_approach",
  "comparison_approach",
  "income_approach",
  "mixed_or_uncertain",
]);

const REPAIR_STATUSES = new Set([
  "not_started",
  "not_available",
  "blocked",
  "verified",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isCommitment(value: unknown): value is OwnerAlphaPracticalMethodCommitment {
  if (!isRecord(value)) return false;
  return (
    METHOD_FAMILIES.has(value.methodFamily as OwnerAlphaMethodFamily) &&
    typeof value.reason === "string" &&
    value.reason.trim().length >= 3 &&
    typeof value.firstCalculationDirection === "string" &&
    value.firstCalculationDirection.trim().length >= 3 &&
    ["low", "medium", "high"].includes(String(value.confidence)) &&
    typeof value.committedAt === "string" &&
    Number.isFinite(Date.parse(value.committedAt))
  );
}

function isRecalculationCheck(
  value: unknown,
): value is OwnerAlphaPracticalRecalculationCheck {
  if (!isRecord(value)) return false;
  return (
    typeof value.nodeId === "string" &&
    value.nodeId.length > 0 &&
    typeof value.label === "string" &&
    (value.submittedValue === null || Number.isFinite(value.submittedValue)) &&
    (value.submittedUnit === null || typeof value.submittedUnit === "string") &&
    (value.deterministicValue === null ||
      Number.isFinite(value.deterministicValue)) &&
    (value.expectedUnit === null || typeof value.expectedUnit === "string") &&
    Number.isFinite(value.tolerance) &&
    [
      "validated",
      "missing",
      "value_mismatch",
      "unit_mismatch",
      "deterministic_unavailable",
    ].includes(String(value.status))
  );
}

export function isOwnerAlphaPracticalDecisionPath(
  value: unknown,
): value is OwnerAlphaPracticalDecisionPathV1 {
  if (!isRecord(value)) return false;
  if (value.contractVersion !== OWNER_ALPHA_PRACTICAL_DECISION_PATH_VERSION) {
    return false;
  }
  if (
    typeof value.pathId !== "string" ||
    !value.pathId ||
    typeof value.problemRevisionChecksum !== "string" ||
    !value.problemRevisionChecksum ||
    typeof value.basisChecksum !== "string" ||
    !value.basisChecksum ||
    !isStringArray(value.problemFactNodeIds) ||
    !isStringArray(value.dataRoleNodeIds) ||
    !isStringArray(value.dateBasisNodeIds) ||
    !isStringArray(value.methodCandidateRefs) ||
    !isStringArray(value.calculationGraphNodeIds) ||
    !isCommitment(value.initialCommitment) ||
    (value.revisedCommitment !== null &&
      !isCommitment(value.revisedCommitment)) ||
    !isRecord(value.repairVerification)
  ) {
    return false;
  }
  const verification = value.repairVerification;
  if (
    !REPAIR_STATUSES.has(String(verification.status)) ||
    !Array.isArray(verification.checks) ||
    !verification.checks.every(isRecalculationCheck) ||
    !isStringArray(verification.blockerCodes) ||
    (verification.verifiedAt !== null &&
      (typeof verification.verifiedAt !== "string" ||
        !Number.isFinite(Date.parse(verification.verifiedAt))))
  ) {
    return false;
  }
  if (
    verification.status === "verified" &&
    (verification.checks.length === 0 ||
      verification.checks.some((check) => check.status !== "validated") ||
      verification.blockerCodes.length > 0 ||
      verification.verifiedAt === null ||
      value.revisedCommitment === null)
  ) {
    return false;
  }
  if (
    verification.status === "blocked" &&
    (verification.blockerCodes.length === 0 ||
      verification.checks.length === 0 ||
      value.revisedCommitment === null)
  ) {
    return false;
  }
  if (
    verification.status === "not_started" &&
    (verification.checks.length > 0 ||
      verification.blockerCodes.length > 0 ||
      verification.verifiedAt !== null ||
      value.revisedCommitment !== null)
  ) {
    return false;
  }
  if (
    verification.status === "not_available" &&
    (verification.checks.length > 0 ||
      verification.blockerCodes.length === 0 ||
      verification.verifiedAt !== null ||
      value.revisedCommitment === null)
  ) {
    return false;
  }
  if (
    verification.status !== "verified" &&
    verification.verifiedAt !== null
  ) {
    return false;
  }
  return true;
}

export function ownerAlphaPracticalDecisionPathProjection(input: {
  pathId: string;
  problemRevisionChecksum: string;
  problemModel: OwnerAlphaPracticeProblemModel;
  initialCommitment: OwnerAlphaPracticalMethodCommitment;
  basisChecksum: string;
}): OwnerAlphaPracticalDecisionPathV1 {
  const adapter = input.problemModel.subjectAdapter;
  if (adapter?.adapter !== "PracticalAdapter") {
    throw new Error("owner-alpha-practical-decision-path:adapter_required");
  }
  return {
    contractVersion: OWNER_ALPHA_PRACTICAL_DECISION_PATH_VERSION,
    pathId: input.pathId,
    problemRevisionChecksum: input.problemRevisionChecksum,
    problemFactNodeIds: [
      ...input.problemModel.givenFacts.map((item) => item.factId),
      ...input.problemModel.givenNumbers.map((item) => item.numberId),
    ],
    dataRoleNodeIds: input.problemModel.entitiesAndRoles.map(
      (item) => item.entityId,
    ),
    dateBasisNodeIds: input.problemModel.datesAndTimePoints.map(
      (item) => item.timePointId,
    ),
    methodCandidateRefs: adapter.methodCandidates.map(
      (item) => item.methodId,
    ),
    calculationGraphNodeIds: input.problemModel.calculationGraph.nodes.map(
      (item) => item.nodeId,
    ),
    initialCommitment: input.initialCommitment,
    revisedCommitment: null,
    repairVerification: {
      status: "not_started",
      checks: [],
      blockerCodes: [],
      verifiedAt: null,
    },
    basisChecksum: input.basisChecksum,
  };
}

export function refreshOwnerAlphaPracticalDecisionPath(
  path: OwnerAlphaPracticalDecisionPathV1,
  problemModel: OwnerAlphaPracticeProblemModel,
  basisChecksum: string,
): OwnerAlphaPracticalDecisionPathV1 {
  return {
    ...path,
    problemFactNodeIds: [
      ...problemModel.givenFacts.map((item) => item.factId),
      ...problemModel.givenNumbers.map((item) => item.numberId),
    ],
    dataRoleNodeIds: problemModel.entitiesAndRoles.map((item) => item.entityId),
    dateBasisNodeIds: problemModel.datesAndTimePoints.map(
      (item) => item.timePointId,
    ),
    methodCandidateRefs:
      problemModel.subjectAdapter?.adapter === "PracticalAdapter"
        ? problemModel.subjectAdapter.methodCandidates.map(
            (item) => item.methodId,
          )
        : path.methodCandidateRefs,
    calculationGraphNodeIds: problemModel.calculationGraph.nodes.map(
      (item) => item.nodeId,
    ),
    basisChecksum,
  };
}

function normalizeUnit(value: string | null) {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .toLocaleLowerCase("en-US");
}

function requiredCalculationNodes(nodes: OwnerAlphaCalculationNode[]) {
  const critical = nodes.filter((node) => node.critical);
  return critical.length > 0 ? critical : nodes;
}

export function verifyOwnerAlphaPracticalRepair(input: {
  path: OwnerAlphaPracticalDecisionPathV1;
  problemModel: OwnerAlphaPracticeProblemModel;
  revisedCommitment: OwnerAlphaPracticalMethodCommitment;
  submissions: OwnerAlphaPracticalRecalculationSubmission[];
  verifiedAt: string;
  basisChecksum: string;
}): OwnerAlphaPracticalDecisionPathV1 {
  const nodes = requiredCalculationNodes(
    input.problemModel.calculationGraph.nodes,
  );
  if (nodes.length === 0) {
    return {
      ...refreshOwnerAlphaPracticalDecisionPath(
        input.path,
        input.problemModel,
        input.basisChecksum,
      ),
      revisedCommitment: input.revisedCommitment,
      repairVerification: {
        status: "not_available",
        checks: [],
        blockerCodes: ["practical_repair:deterministic_check_not_available"],
        verifiedAt: null,
      },
    };
  }

  const duplicateIds = new Set<string>();
  const submissionsByNode = new Map<string, OwnerAlphaPracticalRecalculationSubmission>();
  for (const submission of input.submissions) {
    if (submissionsByNode.has(submission.nodeId)) {
      duplicateIds.add(submission.nodeId);
      continue;
    }
    submissionsByNode.set(submission.nodeId, submission);
  }
  const expectedIds = new Set(nodes.map((node) => node.nodeId));
  const unknownIds = [...submissionsByNode.keys()].filter(
    (nodeId) => !expectedIds.has(nodeId),
  );
  const deterministic = new Map(
    validateOwnerAlphaCalculationGraph({ nodes }).map((check) => [
      check.nodeId,
      check,
    ]),
  );
  const checks: OwnerAlphaPracticalRecalculationCheck[] = nodes.map((node) => {
    const submitted = submissionsByNode.get(node.nodeId);
    const expected = deterministic.get(node.nodeId);
    if (!submitted) {
      return {
        nodeId: node.nodeId,
        label: node.label,
        submittedValue: null,
        submittedUnit: null,
        deterministicValue: expected?.deterministicResult ?? null,
        expectedUnit: node.resultUnit,
        tolerance: expected?.tolerance ?? 0,
        status: "missing" as const,
      };
    }
    if (
      !expected ||
      expected.status !== "validated" ||
      expected.deterministicResult === null
    ) {
      return {
        nodeId: node.nodeId,
        label: node.label,
        submittedValue: submitted.value,
        submittedUnit: submitted.unit,
        deterministicValue: expected?.deterministicResult ?? null,
        expectedUnit: node.resultUnit,
        tolerance: expected?.tolerance ?? 0,
        status: "deterministic_unavailable" as const,
      };
    }
    if (
      Math.abs(submitted.value - expected.deterministicResult) >
      expected.tolerance
    ) {
      return {
        nodeId: node.nodeId,
        label: node.label,
        submittedValue: submitted.value,
        submittedUnit: submitted.unit,
        deterministicValue: expected.deterministicResult,
        expectedUnit: node.resultUnit,
        tolerance: expected.tolerance,
        status: "value_mismatch" as const,
      };
    }
    if (normalizeUnit(submitted.unit) !== normalizeUnit(node.resultUnit)) {
      return {
        nodeId: node.nodeId,
        label: node.label,
        submittedValue: submitted.value,
        submittedUnit: submitted.unit,
        deterministicValue: expected.deterministicResult,
        expectedUnit: node.resultUnit,
        tolerance: expected.tolerance,
        status: "unit_mismatch" as const,
      };
    }
    return {
      nodeId: node.nodeId,
      label: node.label,
      submittedValue: submitted.value,
      submittedUnit: submitted.unit,
      deterministicValue: expected.deterministicResult,
      expectedUnit: node.resultUnit,
      tolerance: expected.tolerance,
      status: "validated" as const,
    };
  });
  const blockerCodes = [
    ...checks
      .filter((check) => check.status !== "validated")
      .map((check) => `practical_repair:${check.nodeId}:${check.status}`),
    ...[...duplicateIds].map(
      (nodeId) => `practical_repair:${nodeId}:duplicate_submission`,
    ),
    ...unknownIds.map(
      (nodeId) => `practical_repair:${nodeId}:unknown_submission`,
    ),
  ];
  return {
    ...refreshOwnerAlphaPracticalDecisionPath(
      input.path,
      input.problemModel,
      input.basisChecksum,
    ),
    revisedCommitment: input.revisedCommitment,
    repairVerification: {
      status: blockerCodes.length === 0 ? "verified" : "blocked",
      checks,
      blockerCodes,
      verifiedAt: blockerCodes.length === 0 ? input.verifiedAt : null,
    },
  };
}

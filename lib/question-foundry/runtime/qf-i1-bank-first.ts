import crypto from "node:crypto";

import {
  QFS3_CONTRACT_VERSION,
  type DependencyRankedTransferChronologyInputV1,
  type DependencyRankedTransferChronologyV1,
} from "../chronology/chronology-contracts";
import { assertDependencyRankedTransferChronologyV1 } from "../chronology/chronology-core";
import {
  CORE_BLITZ_WAVE1_CONTRACT_VERSION,
  admitQuestionToBankV1,
  type CalibrationState,
  type QuestionBankClass,
} from "../../core-blitz/wave1";

export const QF_I1_BANK_FIRST_RUNTIME_VERSION =
  "QFI1BankFirstAssignmentV1" as const;

export const QF_I1_PURPOSES = Object.freeze([
  "LEARNING_PRACTICE",
  "D7_TRANSFER",
  "TIMED_MEASUREMENT",
] as const);
export type QfI1Purpose = (typeof QF_I1_PURPOSES)[number];

export const QF_I1_ERROR_CODES = Object.freeze([
  "INVALID_INPUT",
  "CHRONOLOGY_REQUIRED",
  "CHRONOLOGY_INCOMPLETE",
  "CHRONOLOGY_BINDING_MISMATCH",
  "CHRONOLOGY_AUTHORITY_INVALID",
  "DUPLICATE_CANDIDATE_ID",
  "AUTHORITY_BINDING_MISMATCH",
  "GENERATED_AUTHORITY_ESCALATION",
] as const);
export type QfI1ErrorCode = (typeof QF_I1_ERROR_CODES)[number];

export class QfI1BankFirstError extends Error {
  readonly code: QfI1ErrorCode;

  constructor(code: QfI1ErrorCode) {
    super(`qf-i1-bank-first:${code}`);
    this.name = "QfI1BankFirstError";
    this.code = code;
  }
}

export type QfI1ChronologyAuthorityV1 = Readonly<{
  validationMethod: "assertDependencyRankedTransferChronologyV1";
  chronologyDigest: string;
  candidateId: string;
  candidateDigest: string;
  authorityInput: DependencyRankedTransferChronologyInputV1;
}>;

export type QfI1CandidateV1 = Readonly<{
  candidateId: string;
  candidateDigest: string;
  familyId: string;
  surfaceId: string;
  bankClass: QuestionBankClass;
  origin: "BANK_STOCK" | "GENERATED";
  contentAuthority: "LEARNING_ONLY" | "VERIFIED_TRANSFER" | "MEASUREMENT";
  rightsStatus: "VERIFIED";
  sourceStatus: "CURRENT";
  releaseChainComplete: boolean;
  unseenEligibilitySnapshotSealed: boolean;
  nonSameSurfaceAsSource: boolean;
  familyIsolated: boolean;
  calibrationState: CalibrationState;
  timedProtocolBound: boolean;
  chronology: DependencyRankedTransferChronologyV1 | null;
  chronologyAuthority: QfI1ChronologyAuthorityV1 | null;
  availableAt: string;
  priority: number;
}>;

export type QfI1ExposureV1 = Readonly<{
  candidateId: string;
  familyId: string;
  surfaceId: string;
  occurredAt: string;
  state: "PRESENTED" | "COMPLETED";
}>;

export type QfI1AssignmentRequestV1 = Readonly<{
  purpose: QfI1Purpose;
  learnerScopeId: string;
  sourceCandidateId: string;
  sourceFamilyId: string;
  sourceSurfaceId: string;
  asOf: string;
  candidates: readonly QfI1CandidateV1[];
  exposures: readonly QfI1ExposureV1[];
}>;

function reject(code: QfI1ErrorCode): never {
  throw new QfI1BankFirstError(code);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function canonicalUtc(value: unknown) {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function digest(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function requiredBank(purpose: QfI1Purpose): QuestionBankClass {
  if (purpose === "LEARNING_PRACTICE") return "LEARNING_PRACTICE";
  if (purpose === "D7_TRANSFER") return "VERIFIED_TRANSFER";
  return "MEASUREMENT";
}

function assertChronology(candidate: QfI1CandidateV1) {
  if (candidate.bankClass === "LEARNING_PRACTICE") {
    if (candidate.chronology !== null || candidate.chronologyAuthority !== null) {
      reject("CHRONOLOGY_BINDING_MISMATCH");
    }
    return;
  }
  const chronology = candidate.chronology;
  const authority = candidate.chronologyAuthority;
  if (!chronology || !authority) reject("CHRONOLOGY_REQUIRED");
  if (
    chronology.contractVersion !== QFS3_CONTRACT_VERSION ||
    authority.validationMethod !==
      "assertDependencyRankedTransferChronologyV1" ||
    chronology.chronologyDigest !== authority.chronologyDigest ||
    chronology.candidateId !== authority.candidateId ||
    chronology.candidateDigest !== authority.candidateDigest ||
    chronology.candidateId !== candidate.candidateId ||
    chronology.candidateDigest !== candidate.candidateDigest
  ) {
    reject("CHRONOLOGY_BINDING_MISMATCH");
  }
  try {
    const validated = assertDependencyRankedTransferChronologyV1(
      chronology,
      authority.authorityInput,
    );
    if (stableJson(validated) !== stableJson(chronology)) {
      reject("CHRONOLOGY_AUTHORITY_INVALID");
    }
  } catch (error) {
    if (error instanceof QfI1BankFirstError) throw error;
    reject("CHRONOLOGY_AUTHORITY_INVALID");
  }
  if (
    chronology.completeness !== "COMPLETE" ||
    chronology.blockingReasons.length !== 0 ||
    chronology.actors.length === 0 ||
    chronology.receipts.length === 0
  ) {
    reject("CHRONOLOGY_INCOMPLETE");
  }
}

function assertCandidate(candidate: QfI1CandidateV1) {
  if (
    candidate.origin === "GENERATED" &&
    (candidate.bankClass !== "LEARNING_PRACTICE" ||
      candidate.contentAuthority !== "LEARNING_ONLY")
  ) {
    reject("GENERATED_AUTHORITY_ESCALATION");
  }
  const requiredAuthority =
    candidate.bankClass === "LEARNING_PRACTICE"
      ? "LEARNING_ONLY"
      : candidate.bankClass;
  if (
    !nonEmpty(candidate.candidateId) ||
    !nonEmpty(candidate.candidateDigest) ||
    !nonEmpty(candidate.familyId) ||
    !nonEmpty(candidate.surfaceId) ||
    !canonicalUtc(candidate.availableAt) ||
    !Number.isSafeInteger(candidate.priority) ||
    candidate.priority < 0 ||
    candidate.priority > 100 ||
    !["BANK_STOCK", "GENERATED"].includes(candidate.origin) ||
    candidate.contentAuthority !== requiredAuthority
  ) {
    reject(
      candidate.contentAuthority !== requiredAuthority
        ? "AUTHORITY_BINDING_MISMATCH"
        : "INVALID_INPUT",
    );
  }
  assertChronology(candidate);
  admitQuestionToBankV1({
    schemaVersion: CORE_BLITZ_WAVE1_CONTRACT_VERSION,
    bankClass: candidate.bankClass,
    candidateId: candidate.candidateId,
    familyId: candidate.familyId,
    rightsVerified: candidate.rightsStatus === "VERIFIED",
    sourceCurrent: candidate.sourceStatus === "CURRENT",
    releaseChainComplete: candidate.releaseChainComplete,
    unseenEligibilitySnapshotSealed:
      candidate.unseenEligibilitySnapshotSealed,
    nonSameSurfaceAsSource: candidate.nonSameSurfaceAsSource,
    familyIsolated: candidate.familyIsolated,
    calibrationState: candidate.calibrationState,
    timedProtocolBound: candidate.timedProtocolBound,
  });
}

export function assertQfI1CandidateV1(candidate: QfI1CandidateV1) {
  assertCandidate(candidate);
  return candidate;
}

export function selectQfI1BankFirstAssignmentV1(
  request: QfI1AssignmentRequestV1,
) {
  if (
    !request ||
    typeof request !== "object" ||
    !QF_I1_PURPOSES.includes(request.purpose) ||
    !nonEmpty(request.learnerScopeId) ||
    !nonEmpty(request.sourceCandidateId) ||
    !nonEmpty(request.sourceFamilyId) ||
    !nonEmpty(request.sourceSurfaceId) ||
    !canonicalUtc(request.asOf) ||
    !Array.isArray(request.candidates) ||
    !Array.isArray(request.exposures)
  ) {
    reject("INVALID_INPUT");
  }

  const ids = new Set<string>();
  for (const candidate of request.candidates) {
    assertCandidate(candidate);
    if (ids.has(candidate.candidateId)) reject("DUPLICATE_CANDIDATE_ID");
    ids.add(candidate.candidateId);
  }
  for (const exposure of request.exposures) {
    if (
      !nonEmpty(exposure.candidateId) ||
      !nonEmpty(exposure.familyId) ||
      !nonEmpty(exposure.surfaceId) ||
      !canonicalUtc(exposure.occurredAt) ||
      !["PRESENTED", "COMPLETED"].includes(exposure.state)
    ) {
      reject("INVALID_INPUT");
    }
  }

  const bankClass = requiredBank(request.purpose);
  const priorCandidateIds = new Set(
    request.exposures.map((exposure) => exposure.candidateId),
  );
  const priorFamilyIds = new Set(
    request.exposures.map((exposure) => exposure.familyId),
  );
  const priorSurfaceIds = new Set(
    request.exposures.map((exposure) => exposure.surfaceId),
  );
  const transferLike = request.purpose !== "LEARNING_PRACTICE";

  const eligible = request.candidates
    .filter((candidate) => candidate.bankClass === bankClass)
    .filter(
      (candidate) =>
        Date.parse(candidate.availableAt) <= Date.parse(request.asOf),
    )
    .filter((candidate) => !priorCandidateIds.has(candidate.candidateId))
    .filter((candidate) => {
      if (!transferLike) return true;
      return (
        candidate.candidateId !== request.sourceCandidateId &&
        candidate.familyId !== request.sourceFamilyId &&
        candidate.surfaceId !== request.sourceSurfaceId &&
        !priorFamilyIds.has(candidate.familyId) &&
        !priorSurfaceIds.has(candidate.surfaceId)
      );
    })
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.availableAt.localeCompare(right.availableAt) ||
        left.candidateId.localeCompare(right.candidateId),
    );

  const selected = eligible[0] ?? null;
  if (!selected) {
    const generationAuthorized = request.purpose === "LEARNING_PRACTICE";
    const generationMaterial = {
      contractVersion: QF_I1_BANK_FIRST_RUNTIME_VERSION,
      purpose: request.purpose,
      learnerScopeId: request.learnerScopeId,
      sourceCandidateId: request.sourceCandidateId,
      sourceFamilyId: request.sourceFamilyId,
      sourceSurfaceId: request.sourceSurfaceId,
      asOf: request.asOf,
      requiredBankClass: bankClass,
    };
    const generationRequestDigest = digest({
      domain: "QF_I1_LEARNING_ONLY_GENERATION_REQUEST_V1",
      material: generationMaterial,
    });
    return Object.freeze({
      contractVersion: QF_I1_BANK_FIRST_RUNTIME_VERSION,
      status:
        request.purpose === "LEARNING_PRACTICE"
          ? ("GENERATION_REQUIRED" as const)
          : ("NO_CERTIFIED_CANDIDATE" as const),
      purpose: request.purpose,
      requiredBankClass: bankClass,
      generationAuthorized,
      generatedContentMaximumAuthority:
        generationAuthorized
          ? ("LEARNING_ONLY" as const)
          : ("NONE" as const),
      generationRequestId: generationAuthorized
        ? `qfg_${generationRequestDigest.slice("sha256:".length)}`
        : null,
      generationRequestDigest: generationAuthorized
        ? generationRequestDigest
        : null,
      retryIdentity: generationAuthorized
        ? `qfgr_${digest({
            domain: "QF_I1_GENERATION_RETRY_V1",
            generationRequestDigest,
          }).slice("sha256:".length)}`
        : null,
      conflictIdentity: generationAuthorized
        ? `qfgc_${digest({
            domain: "QF_I1_GENERATION_CONFLICT_V1",
            generationMaterial,
          }).slice("sha256:".length)}`
        : null,
      providerExecutionAllowed: false as const,
      publicLearnerActivationAllowed: false as const,
      rawGeneratedBodyMetadataPersistenceAllowed: false as const,
      verifiedTransferAdmissionAllowed: false as const,
      measurementAdmissionAllowed: false as const,
    });
  }

  const material = {
    contractVersion: QF_I1_BANK_FIRST_RUNTIME_VERSION,
    purpose: request.purpose,
    learnerScopeId: request.learnerScopeId,
    candidateId: selected.candidateId,
    candidateDigest: selected.candidateDigest,
    familyId: selected.familyId,
    surfaceId: selected.surfaceId,
    bankClass: selected.bankClass,
    origin: selected.origin,
    contentAuthority: selected.contentAuthority,
    chronologyDigest: selected.chronology?.chronologyDigest ?? null,
    assignedAt: request.asOf,
  };
  return Object.freeze({
    ...material,
    status: "ASSIGNED" as const,
    assignmentId: `qfa_${digest(material).slice("sha256:".length)}`,
    assignmentDigest: digest({ domain: "QF_I1_ASSIGNMENT_V1", material }),
    learnerUse:
      selected.bankClass === "LEARNING_PRACTICE"
        ? ("LEARNING_ONLY" as const)
        : selected.bankClass,
    transferClaimAllowed: selected.bankClass !== "LEARNING_PRACTICE",
    measurementClaimAllowed: selected.bankClass === "MEASUREMENT",
    generationAuthorized: false as const,
  });
}

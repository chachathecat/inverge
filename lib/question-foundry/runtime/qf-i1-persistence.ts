import crypto from "node:crypto";

import {
  QF_I1_BANK_FIRST_RUNTIME_VERSION,
  selectQfI1BankFirstAssignmentV1,
  type QfI1AssignmentRequestV1,
  type QfI1CandidateV1,
  type QfI1ExposureV1,
} from "./qf-i1-bank-first";

export const QF_I1_PERSISTENCE_VERSION =
  "QFI1DurableAssignmentPersistenceV1" as const;

export const QF_I1_PERSISTENCE_ERROR_CODES = Object.freeze([
  "INVALID_INPUT",
  "NON_DURABLE_ASSIGNMENT",
  "ASSIGNMENT_BINDING_CONFLICT",
  "NON_DURABLE_EXPOSURE",
  "EXPOSURE_BINDING_CONFLICT",
] as const);

export type QfI1PersistenceErrorCode =
  (typeof QF_I1_PERSISTENCE_ERROR_CODES)[number];

export class QfI1PersistenceError extends Error {
  readonly code: QfI1PersistenceErrorCode;

  constructor(code: QfI1PersistenceErrorCode) {
    super(`qf-i1-persistence:${code}`);
    this.name = "QfI1PersistenceError";
    this.code = code;
  }
}

type AssignedDecision = Extract<
  ReturnType<typeof selectQfI1BankFirstAssignmentV1>,
  { status: "ASSIGNED" }
>;

export type QfI1DurableAssignmentV1 = Readonly<
  AssignedDecision & {
    durable: true;
  }
>;

export type QfI1DurableExposureV1 = Readonly<{
  exposureId: string;
  assignmentId: string;
  learnerScopeId: string;
  candidateId: string;
  familyId: string;
  surfaceId: string;
  occurredAt: string;
  state: "PRESENTED";
  durable: true;
}>;

export type QfI1PersistencePortV1 = Readonly<{
  listCandidates: (input: Readonly<{
    learnerScopeId: string;
    purpose: QfI1AssignmentRequestV1["purpose"];
    asOf: string;
  }>) => Promise<readonly QfI1CandidateV1[]>;
  listExposures: (
    learnerScopeId: string,
  ) => Promise<readonly QfI1ExposureV1[]>;
  ensureAssignment: (
    assignment: AssignedDecision,
  ) => Promise<
    Readonly<{
      status: "created" | "existing";
      value: QfI1DurableAssignmentV1;
    }>
  >;
  ensureExposure: (
    exposure: Omit<QfI1DurableExposureV1, "durable">,
  ) => Promise<
    Readonly<{
      status: "created" | "existing";
      value: QfI1DurableExposureV1;
    }>
  >;
}>;

function reject(code: QfI1PersistenceErrorCode): never {
  throw new QfI1PersistenceError(code);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim() === value && value.length > 0;
}

function canonicalUtc(value: unknown): value is string {
  if (!nonEmpty(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJson(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
    .join(",")}}`;
}

function digest(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(stableJson(value)).digest("hex")}`;
}

function sameAssignment(
  actual: QfI1DurableAssignmentV1,
  expected: AssignedDecision,
) {
  const { durable: _durable, ...actualMaterial } = actual;
  return stableJson(actualMaterial) === stableJson(expected);
}

export async function allocateQfI1DurablyV1(input: Readonly<{
  request: Omit<QfI1AssignmentRequestV1, "candidates" | "exposures">;
  port: QfI1PersistencePortV1;
}>) {
  if (!input?.port || !input.request || typeof input.request !== "object") {
    reject("INVALID_INPUT");
  }
  const [candidates, exposures] = await Promise.all([
    input.port.listCandidates({
      learnerScopeId: input.request.learnerScopeId,
      purpose: input.request.purpose,
      asOf: input.request.asOf,
    }),
    input.port.listExposures(input.request.learnerScopeId),
  ]);
  if (!Array.isArray(candidates) || !Array.isArray(exposures)) {
    reject("INVALID_INPUT");
  }

  const decision = selectQfI1BankFirstAssignmentV1({
    ...input.request,
    candidates,
    exposures,
  });
  if (decision.status !== "ASSIGNED") {
    return Object.freeze({
      contractVersion: QF_I1_PERSISTENCE_VERSION,
      outcome: decision.status,
      decision,
    });
  }

  const ensured = await input.port.ensureAssignment(decision);
  if (!ensured?.value || ensured.value.durable !== true) {
    reject("NON_DURABLE_ASSIGNMENT");
  }
  if (!sameAssignment(ensured.value, decision)) {
    reject("ASSIGNMENT_BINDING_CONFLICT");
  }
  return Object.freeze({
    contractVersion: QF_I1_PERSISTENCE_VERSION,
    outcome: "ASSIGNMENT_DURABLE" as const,
    assignmentStatus: ensured.status,
    assignment: ensured.value,
  });
}

export async function recordQfI1PresentationV1(input: Readonly<{
  assignment: QfI1DurableAssignmentV1;
  occurredAt: string;
  port: QfI1PersistencePortV1;
}>) {
  if (
    !input?.port ||
    !input.assignment ||
    input.assignment.durable !== true ||
    input.assignment.contractVersion !== QF_I1_BANK_FIRST_RUNTIME_VERSION ||
    input.assignment.status !== "ASSIGNED" ||
    !canonicalUtc(input.occurredAt)
  ) {
    reject("INVALID_INPUT");
  }
  const material = Object.freeze({
    exposureId: `qfx_${digest({
      domain: "QF_I1_PRESENTATION_V1",
      assignmentId: input.assignment.assignmentId,
      occurredAt: input.occurredAt,
    }).slice("sha256:".length)}`,
    assignmentId: input.assignment.assignmentId,
    learnerScopeId: input.assignment.learnerScopeId,
    candidateId: input.assignment.candidateId,
    familyId: input.assignment.familyId,
    surfaceId: input.assignment.surfaceId,
    occurredAt: input.occurredAt,
    state: "PRESENTED" as const,
  });
  const ensured = await input.port.ensureExposure(material);
  const exposure = ensured?.value;
  if (!exposure || exposure.durable !== true) {
    reject("NON_DURABLE_EXPOSURE");
  }
  const { durable: _durable, ...actual } = exposure;
  if (stableJson(actual) !== stableJson(material)) {
    reject("EXPOSURE_BINDING_CONFLICT");
  }
  return Object.freeze({
    contractVersion: QF_I1_PERSISTENCE_VERSION,
    outcome: "PRESENTATION_DURABLE" as const,
    exposureStatus: ensured.status,
    exposure,
  });
}

import "server-only";

import type { AnswerReviewStructureDraft } from "@/lib/evaluate/answer-review-structure";
import {
  APP1_LIMITS,
  buildApp1PrimaryGap,
  buildApp1RepairPersistenceInput,
  canonicalizeApp1RepairBody,
  evaluateApp1SameSessionRepair,
  isClientAuthoredApp1PersistenceCandidate,
  isApp1SubjectAuthorized,
  type App1PrimaryGap,
  type App1RepairVerification,
} from "@/lib/owner-study/app1-capture-repair-view-model";
import type { CaptureSaveOperationBinding } from "@/lib/review-os/capture-persistence-controller";
import { reviewOsRepository } from "@/lib/review-os/repository";
import { requireTrustedRepairAccess } from "@/lib/review-os/trusted-repair-access";
import type { WrongAnswerDetail, WrongAnswerItemInput } from "@/lib/review-os/types";

import {
  APP1_VERIFICATION_POLICY_VERSION,
  App1ReceiptError,
  assertApp1AnalysisBinding,
  assertExpiredApp1VerificationReceiptForReplay,
  assertApp1ReplayPlanSeal,
  assertApp1VerificationReceipt,
  issueApp1AnalysisBinding,
  issueApp1ReplayPlanSeal,
  issueApp1VerificationReceipt,
} from "./app1-verification-receipt-core";

export const APP1_PERSISTENCE_COMMAND_VERSION =
  "App1VerifiedRepairPersistenceCommandV1" as const;

const SIGNING_SECRET_PATTERN = /^[A-Za-z0-9_-]{43}$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;

type App1PersistenceCommand = Readonly<{
  commandVersion: typeof APP1_PERSISTENCE_COMMAND_VERSION;
  sourceItemId: string;
  primaryGap: App1PrimaryGap;
  analysisBinding: string;
  verificationReceipt: string;
  repairText: string;
  persistenceOperationId: string;
  persistenceWorkRevisionId: string;
}>;

export class App1ServerAuthorityError extends Error {
  readonly code:
    | "APP1_AUTHORITY_REQUIRED"
    | "APP1_SIGNING_SECRET_UNAVAILABLE"
    | "APP1_ANALYSIS_BINDING_INVALID"
    | "APP1_VERIFICATION_RECEIPT_INVALID"
    | "APP1_VERIFICATION_EXPIRED"
    | "APP1_PERSISTENCE_COMMAND_INVALID";

  constructor(code: App1ServerAuthorityError["code"]) {
    super(`app1-server-authority:${code}`);
    this.code = code;
  }
}

export function isApp1ServerAuthorityError(
  error: unknown,
): error is App1ServerAuthorityError {
  return error instanceof App1ServerAuthorityError;
}

function reject(code: App1ServerAuthorityError["code"]): never {
  throw new App1ServerAuthorityError(code);
}

function signingKey() {
  const encoded = process.env.APP1_VERIFICATION_SIGNING_SECRET;
  if (!encoded || !SIGNING_SECRET_PATTERN.test(encoded)) {
    reject("APP1_SIGNING_SECRET_UNAVAILABLE");
  }
  const decoded = Buffer.from(encoded, "base64url");
  if (decoded.byteLength !== 32 || decoded.toString("base64url") !== encoded) {
    reject("APP1_SIGNING_SECRET_UNAVAILABLE");
  }
  return decoded;
}

export function assertApp1SigningAuthorityReady() {
  signingKey();
}

export function sealApp1PostInsertReplayPlan(planDigest: string) {
  try {
    return issueApp1ReplayPlanSeal({ key: signingKey(), planDigest });
  } catch (error) {
    if (error instanceof App1ReceiptError) {
      reject("APP1_PERSISTENCE_COMMAND_INVALID");
    }
    throw error;
  }
}

export function assertApp1PostInsertReplayPlanSeal(input: Readonly<{
  planDigest: string;
  planSeal: string;
}>) {
  try {
    assertApp1ReplayPlanSeal({
      key: signingKey(),
      token: input.planSeal,
      planDigest: input.planDigest,
    });
  } catch (error) {
    if (error instanceof App1ReceiptError) {
      reject("APP1_PERSISTENCE_COMMAND_INVALID");
    }
    throw error;
  }
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? (value as Record<string, unknown>)
    : null;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

export function parseApp1PrimaryGap(value: unknown): App1PrimaryGap {
  const gap = plainRecord(value);
  if (
    !gap ||
    !exactKeys(gap, [
      "subject",
      "anchor",
      "anchorKind",
      "alreadySuccessful",
      "gap",
      "whyItMatters",
      "repairAction",
      "expectedMinutes",
    ]) ||
    typeof gap.subject !== "string" ||
    gap.subject.length > 80 ||
    typeof gap.anchor !== "string" ||
    gap.anchor.length > APP1_LIMITS.maximumGapCharacters ||
    !["exact", "bounded_section", "unavailable"].includes(
      String(gap.anchorKind),
    ) ||
    typeof gap.alreadySuccessful !== "string" ||
    gap.alreadySuccessful.length > APP1_LIMITS.maximumGapCharacters ||
    typeof gap.gap !== "string" ||
    gap.gap.length > APP1_LIMITS.maximumGapCharacters ||
    typeof gap.whyItMatters !== "string" ||
    gap.whyItMatters.length > APP1_LIMITS.maximumGapCharacters ||
    typeof gap.repairAction !== "string" ||
    gap.repairAction.length > APP1_LIMITS.maximumGapCharacters ||
    !Number.isSafeInteger(gap.expectedMinutes) ||
    Number(gap.expectedMinutes) <= 0 ||
    Number(gap.expectedMinutes) > 60
  ) {
    reject("APP1_PERSISTENCE_COMMAND_INVALID");
  }
  return Object.freeze({
    subject: gap.subject,
    anchor: gap.anchor,
    anchorKind: gap.anchorKind as App1PrimaryGap["anchorKind"],
    alreadySuccessful: gap.alreadySuccessful,
    gap: gap.gap,
    whyItMatters: gap.whyItMatters,
    repairAction: gap.repairAction,
    expectedMinutes: Number(gap.expectedMinutes),
  });
}

export function parseApp1PersistenceCommand(
  value: unknown,
): App1PersistenceCommand {
  const input = plainRecord(value);
  if (
    !input ||
    !exactKeys(input, [
      "commandVersion",
      "sourceItemId",
      "primaryGap",
      "analysisBinding",
      "verificationReceipt",
      "repairText",
      "persistenceOperationId",
      "persistenceWorkRevisionId",
    ]) ||
    input.commandVersion !== APP1_PERSISTENCE_COMMAND_VERSION ||
    typeof input.sourceItemId !== "string" ||
    !UUID_PATTERN.test(input.sourceItemId) ||
    typeof input.analysisBinding !== "string" ||
    typeof input.verificationReceipt !== "string" ||
    typeof input.repairText !== "string" ||
    typeof input.persistenceOperationId !== "string" ||
    typeof input.persistenceWorkRevisionId !== "string"
  ) {
    reject("APP1_PERSISTENCE_COMMAND_INVALID");
  }
  return Object.freeze({
    commandVersion: APP1_PERSISTENCE_COMMAND_VERSION,
    sourceItemId: input.sourceItemId,
    primaryGap: parseApp1PrimaryGap(input.primaryGap),
    analysisBinding: input.analysisBinding,
    verificationReceipt: input.verificationReceipt,
    repairText: canonicalizeApp1RepairBody(input.repairText),
    persistenceOperationId: input.persistenceOperationId,
    persistenceWorkRevisionId: input.persistenceWorkRevisionId,
  });
}

export function isClientAuthoredApp1Persistence(
  input: WrongAnswerItemInput,
) {
  return isClientAuthoredApp1PersistenceCandidate(input);
}

export async function requireApp1AuthorizedSourceDetail(input: Readonly<{
  userId: string;
  sourceItemId: string;
  expectedSubject?: string;
}>): Promise<WrongAnswerDetail> {
  const access = await requireTrustedRepairAccess();
  if (access.userId !== input.userId) reject("APP1_AUTHORITY_REQUIRED");
  const detail = await reviewOsRepository.getWrongAnswerDetail(
    input.userId,
    input.sourceItemId,
  );
  if (
    !detail ||
    detail.item.id !== input.sourceItemId ||
    detail.item.userId !== input.userId ||
    detail.item.examName !== "감정평가사 2차" ||
    (input.expectedSubject !== undefined &&
      detail.item.subjectLabel !== input.expectedSubject) ||
    !isApp1SubjectAuthorized(
      detail.item.subjectLabel,
      access.trustedRepairSubjects,
    )
  ) {
    reject("APP1_AUTHORITY_REQUIRED");
  }
  return detail;
}

function mapReceiptError(
  error: unknown,
  invalidCode:
    | "APP1_ANALYSIS_BINDING_INVALID"
    | "APP1_VERIFICATION_RECEIPT_INVALID",
): never {
  if (error instanceof App1ReceiptError && error.code === "receipt_expired") {
    reject("APP1_VERIFICATION_EXPIRED");
  }
  reject(invalidCode);
}

export function createApp1AnalysisAuthority(input: Readonly<{
  userId: string;
  detail: WrongAnswerDetail;
  draft: AnswerReviewStructureDraft;
}>) {
  const primaryGap = buildApp1PrimaryGap(input.detail, input.draft);
  return Object.freeze({
    primaryGap,
    analysisBinding: issueApp1AnalysisBinding({
      key: signingKey(),
      userId: input.userId,
      detail: input.detail,
      gap: primaryGap,
    }),
  });
}

export function createApp1RepairVerificationAuthority(input: Readonly<{
  userId: string;
  detail: WrongAnswerDetail;
  primaryGap: App1PrimaryGap;
  analysisBinding: string;
  repairText: string;
  repairDraft: AnswerReviewStructureDraft;
  persistenceOperationId: string;
  persistenceWorkRevisionId: string;
}>) {
  const repairText = canonicalizeApp1RepairBody(input.repairText);
  if (
    repairText.length < APP1_LIMITS.minimumRepairCharacters ||
    repairText.length > APP1_LIMITS.maximumRepairCharacters
  ) {
    reject("APP1_PERSISTENCE_COMMAND_INVALID");
  }
  assertApp1RepairVerificationRequestAuthority(input);
  const verification = evaluateApp1SameSessionRepair({
    detail: input.detail,
    requestedGap: input.primaryGap,
    repairText,
    repairDraft: input.repairDraft,
  });
  const verificationReceipt =
    verification.state === "repair_confirmed_for_this_session"
      ? issueApp1VerificationReceipt({
          key: signingKey(),
          userId: input.userId,
          detail: input.detail,
          gap: input.primaryGap,
          analysisBinding: input.analysisBinding,
          repairText,
          verification,
          persistenceOperationId: input.persistenceOperationId,
          persistenceWorkRevisionId: input.persistenceWorkRevisionId,
        })
      : null;
  return Object.freeze({ verification, verificationReceipt });
}

export function assertApp1RepairVerificationRequestAuthority(
  input: Readonly<{
    userId: string;
    detail: WrongAnswerDetail;
    primaryGap: App1PrimaryGap;
    analysisBinding: string;
    persistenceOperationId: string;
    persistenceWorkRevisionId: string;
  }>,
) {
  if (
    !UUID_V4_PATTERN.test(input.persistenceOperationId) ||
    !UUID_V4_PATTERN.test(input.persistenceWorkRevisionId)
  ) {
    reject("APP1_ANALYSIS_BINDING_INVALID");
  }
  try {
    assertApp1AnalysisBinding({
      key: signingKey(),
      token: input.analysisBinding,
      userId: input.userId,
      detail: input.detail,
      gap: input.primaryGap,
    });
  } catch (error) {
    mapReceiptError(error, "APP1_ANALYSIS_BINDING_INVALID");
  }
}

export function authorizeApp1PersistenceCommand(input: Readonly<{
  userId: string;
  detail: WrongAnswerDetail;
  command: App1PersistenceCommand;
}>): WrongAnswerItemInput {
  const repairText = canonicalizeApp1RepairBody(input.command.repairText);
  if (
    repairText.length < APP1_LIMITS.minimumRepairCharacters ||
    repairText.length > APP1_LIMITS.maximumRepairCharacters
  ) {
    reject("APP1_PERSISTENCE_COMMAND_INVALID");
  }
  try {
    assertApp1VerificationReceipt({
      key: signingKey(),
      token: input.command.verificationReceipt,
      userId: input.userId,
      detail: input.detail,
      gap: input.command.primaryGap,
      analysisBinding: input.command.analysisBinding,
      repairText,
      persistenceOperationId: input.command.persistenceOperationId,
      persistenceWorkRevisionId: input.command.persistenceWorkRevisionId,
    });
  } catch (error) {
    mapReceiptError(error, "APP1_VERIFICATION_RECEIPT_INVALID");
  }
  return buildAuthorizedApp1PersistenceInput(input);
}

function buildAuthorizedApp1PersistenceInput(input: Readonly<{
  userId: string;
  detail: WrongAnswerDetail;
  command: App1PersistenceCommand;
}>): WrongAnswerItemInput {
  const repairText = canonicalizeApp1RepairBody(input.command.repairText);
  const verification: App1RepairVerification = Object.freeze({
    state: "repair_confirmed_for_this_session",
    requestedGap: input.command.primaryGap.gap,
    observedGap: null,
    reason: `서버 검증 정책 ${APP1_VERIFICATION_POLICY_VERSION}에 따라 같은 세션의 요청한 연결을 확인했습니다.`,
    sameSessionOnly: true,
    masteryCreated: false,
    transferCreated: false,
  });
  const operation: CaptureSaveOperationBinding = Object.freeze({
    operationId: input.command.persistenceOperationId,
    workRevisionId: input.command.persistenceWorkRevisionId,
  });
  return buildApp1RepairPersistenceInput({
    detail: input.detail,
    gap: input.command.primaryGap,
    repairText,
    verification,
    operation,
  });
}

export function authorizeExpiredApp1PersistenceReplayCommand(input: Readonly<{
  userId: string;
  detail: WrongAnswerDetail;
  command: App1PersistenceCommand;
}>): WrongAnswerItemInput {
  const repairText = canonicalizeApp1RepairBody(input.command.repairText);
  if (
    repairText.length < APP1_LIMITS.minimumRepairCharacters ||
    repairText.length > APP1_LIMITS.maximumRepairCharacters
  ) {
    reject("APP1_PERSISTENCE_COMMAND_INVALID");
  }
  try {
    assertExpiredApp1VerificationReceiptForReplay({
      key: signingKey(),
      token: input.command.verificationReceipt,
      userId: input.userId,
      detail: input.detail,
      gap: input.command.primaryGap,
      analysisBinding: input.command.analysisBinding,
      repairText,
      persistenceOperationId: input.command.persistenceOperationId,
      persistenceWorkRevisionId: input.command.persistenceWorkRevisionId,
    });
  } catch (error) {
    if (error instanceof App1ReceiptError) {
      reject("APP1_VERIFICATION_RECEIPT_INVALID");
    }
    throw error;
  }
  return buildAuthorizedApp1PersistenceInput(input);
}

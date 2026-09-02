import "server-only";

import crypto from "node:crypto";

import type {
  App1PrimaryGap,
  App1RepairVerification,
} from "./app1-capture-repair-view-model";
import { canonicalizeApp1RepairBody } from "./app1-capture-repair-view-model";
import type { WrongAnswerDetail } from "../review-os/types";

export const APP1_ANALYSIS_RECEIPT_VERSION =
  "App1AnalysisBindingReceiptV1" as const;
export const APP1_VERIFICATION_RECEIPT_VERSION =
  "App1RepairVerificationReceiptV1" as const;
export const APP1_VERIFICATION_POLICY_VERSION =
  "App1SameSessionRepairPolicyV1" as const;
export const APP1_REPLAY_PLAN_SEAL_VERSION =
  "App1PostInsertReplayPlanSealV1" as const;
export const APP1_ANALYSIS_BINDING_TTL_MS = 15 * 60 * 1_000;
export const APP1_RECEIPT_TTL_MS = 5 * 60 * 1_000;

const APP1_CONTRACT_VERSION = "OwnerCaptureToRepairVerticalV1" as const;
const ANALYSIS_PREFIX = "app1a1";
const VERIFICATION_PREFIX = "app1v1";
const REPLAY_PLAN_PREFIX = "app1r1";
const SHA256_PATTERN = /^sha256:[a-f0-9]{64}$/u;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const SUBJECTS = new Set([
  "감정평가실무",
  "감정평가이론",
  "감정평가 및 보상법규",
]);

type AnalysisPayload = Readonly<{
  contractVersion: typeof APP1_CONTRACT_VERSION;
  receiptVersion: typeof APP1_ANALYSIS_RECEIPT_VERSION;
  receiptKind: "analysis_binding";
  userId: string;
  sourceItemId: string;
  subject: string;
  mode: "second";
  sourceRevision: string;
  gapDigest: string;
  issuedAt: string;
  expiresAt: string;
}>;

type VerificationPayload = Readonly<{
  contractVersion: typeof APP1_CONTRACT_VERSION;
  receiptVersion: typeof APP1_VERIFICATION_RECEIPT_VERSION;
  receiptKind: "repair_verification";
  userId: string;
  sourceItemId: string;
  subject: string;
  mode: "second";
  sourceRevision: string;
  analysisBindingDigest: string;
  gapDigest: string;
  repairTextDigest: string;
  verificationState: "repair_confirmed_for_this_session";
  verificationPolicyVersion: typeof APP1_VERIFICATION_POLICY_VERSION;
  persistenceOperationId: string;
  persistenceWorkRevisionId: string;
  issuedAt: string;
  expiresAt: string;
}>;

type ReplayPlanSealPayload = Readonly<{
  contractVersion: typeof APP1_CONTRACT_VERSION;
  receiptVersion: typeof APP1_REPLAY_PLAN_SEAL_VERSION;
  receiptKind: "post_insert_replay_plan";
  planDigest: string;
}>;

export class App1ReceiptError extends Error {
  readonly code:
    | "invalid_key"
    | "invalid_receipt"
    | "receipt_expired"
    | "binding_mismatch";

  constructor(code: App1ReceiptError["code"]) {
    super(`app1-receipt:${code}`);
    this.code = code;
  }
}

export async function executeApp1AuthorityBoundaryV1<TAuthorized, TResult>(
  input: Readonly<{
    authorize: () => TAuthorized | Promise<TAuthorized>;
    execute: (authorized: TAuthorized) => TResult | Promise<TResult>;
  }>,
) {
  const authorized = await input.authorize();
  return input.execute(authorized);
}

function reject(code: App1ReceiptError["code"]): never {
  throw new App1ReceiptError(code);
}

function sha256(value: string) {
  return `sha256:${crypto.createHash("sha256").update(value, "utf8").digest("hex")}`;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return (
    actual.length === sortedExpected.length &&
    actual.every((key, index) => key === sortedExpected[index])
  );
}

function plainRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null
    ? (value as Record<string, unknown>)
    : null;
}

function canonicalTimestamp(value: unknown) {
  if (typeof value !== "string") return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function requireSigningKey(key: Uint8Array) {
  if (!(key instanceof Uint8Array) || key.byteLength < 32) {
    reject("invalid_key");
  }
  return Buffer.from(key);
}

function encodePayload(prefix: string, payload: object, key: Uint8Array) {
  const signingKey = requireSigningKey(key);
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signedMaterial = `${prefix}.${encoded}`;
  const signature = crypto
    .createHmac("sha256", signingKey)
    .update(signedMaterial, "utf8")
    .digest("base64url");
  return `${signedMaterial}.${signature}`;
}

function decodePayload(
  token: string,
  prefix: string,
  key: Uint8Array,
): Record<string, unknown> {
  const signingKey = requireSigningKey(key);
  if (typeof token !== "string" || token.length > 4_096) {
    reject("invalid_receipt");
  }
  const parts = token.split(".");
  if (
    parts.length !== 3 ||
    parts[0] !== prefix ||
    !/^[A-Za-z0-9_-]+$/u.test(parts[1] ?? "") ||
    !/^[A-Za-z0-9_-]{43}$/u.test(parts[2] ?? "")
  ) {
    reject("invalid_receipt");
  }
  const signedMaterial = `${prefix}.${parts[1]}`;
  const expected = crypto
    .createHmac("sha256", signingKey)
    .update(signedMaterial, "utf8")
    .digest();
  let received: Buffer;
  try {
    received = Buffer.from(parts[2], "base64url");
  } catch {
    reject("invalid_receipt");
  }
  const comparable =
    received.length === expected.length ? received : Buffer.alloc(expected.length);
  const signatureMatches = crypto.timingSafeEqual(expected, comparable);
  if (
    !signatureMatches ||
    received.length !== expected.length ||
    received.toString("base64url") !== parts[2]
  ) {
    reject("invalid_receipt");
  }
  let parsed: unknown;
  try {
    const decoded = Buffer.from(parts[1], "base64url");
    if (decoded.toString("base64url") !== parts[1]) reject("invalid_receipt");
    parsed = JSON.parse(decoded.toString("utf8"));
  } catch (error) {
    if (error instanceof App1ReceiptError) throw error;
    reject("invalid_receipt");
  }
  const record = plainRecord(parsed);
  if (!record) reject("invalid_receipt");
  return record;
}

function assertReceiptWindow(
  issuedAt: unknown,
  expiresAt: unknown,
  now: Date,
  expectedTtlMs: number,
) {
  if (!canonicalTimestamp(issuedAt) || !canonicalTimestamp(expiresAt)) {
    reject("invalid_receipt");
  }
  const issued = Date.parse(String(issuedAt));
  const expires = Date.parse(String(expiresAt));
  if (expires - issued !== expectedTtlMs || now.getTime() < issued) {
    reject("invalid_receipt");
  }
  if (now.getTime() >= expires) reject("receipt_expired");
}

function bindingTimestamp(now: Date, ttlMs: number) {
  const issuedAt = now.toISOString();
  return {
    issuedAt,
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
}

function exactConfirmedSourceFields(detail: WrongAnswerDetail) {
  const rawPayload = plainRecord(detail.item.rawPayload);
  const confirmed = plainRecord(rawPayload?.user_confirmed_fields);
  return {
    ocrConfirmedByLearner: confirmed?.ocrConfirmedByLearner ?? null,
    lowConfidenceFlag: confirmed?.lowConfidenceFlag ?? null,
    pageCount: confirmed?.pageCount ?? null,
    exactAnchor:
      confirmed?.exact_anchor ??
      confirmed?.answer_anchor ??
      confirmed?.calculation_step_anchor ??
      null,
  };
}

export function app1SourceRevision(detail: WrongAnswerDetail) {
  const item = detail.item;
  return sha256(
    JSON.stringify({
      id: item.id,
      userId: item.userId,
      updatedAt: item.updatedAt,
      examName: item.examName,
      subjectLabel: item.subjectLabel,
      sourceType: item.sourceType,
      sourceLabel: item.sourceLabel ?? null,
      problemTitle: item.problemTitle ?? null,
      problemIdentifier: item.problemIdentifier ?? null,
      rawQuestionText: item.rawQuestionText ?? null,
      rawAnswerText: item.rawAnswerText ?? null,
      rewriteParagraph: item.rewriteParagraph ?? null,
      correctAnswer: item.correctAnswer,
      userAnswer: item.userAnswer,
      confidence: item.confidence,
      timeSpentSeconds: item.timeSpentSeconds ?? null,
      keyConcepts: item.keyConcepts ?? [],
      coreFormula: item.coreFormula ?? null,
      referenceStructure: item.referenceStructure ?? null,
      sourceConfirmation: exactConfirmedSourceFields(detail),
    }),
  );
}

export function app1PrimaryGapDigest(gap: App1PrimaryGap) {
  return sha256(
    JSON.stringify({
      subject: gap.subject,
      anchor: gap.anchor,
      anchorKind: gap.anchorKind,
      alreadySuccessful: gap.alreadySuccessful,
      gap: gap.gap,
      whyItMatters: gap.whyItMatters,
      repairAction: gap.repairAction,
      expectedMinutes: gap.expectedMinutes,
    }),
  );
}

export function app1RepairTextDigest(repairText: string) {
  return sha256(canonicalizeApp1RepairBody(repairText));
}

export function app1AnalysisBindingDigest(token: string) {
  return sha256(token);
}

export function issueApp1ReplayPlanSeal(input: Readonly<{
  key: Uint8Array;
  planDigest: string;
}>) {
  if (!SHA256_PATTERN.test(input.planDigest)) reject("invalid_receipt");
  const payload: ReplayPlanSealPayload = {
    contractVersion: APP1_CONTRACT_VERSION,
    receiptVersion: APP1_REPLAY_PLAN_SEAL_VERSION,
    receiptKind: "post_insert_replay_plan",
    planDigest: input.planDigest,
  };
  return encodePayload(REPLAY_PLAN_PREFIX, payload, input.key);
}

export function assertApp1ReplayPlanSeal(input: Readonly<{
  key: Uint8Array;
  token: string;
  planDigest: string;
}>): ReplayPlanSealPayload {
  const payload = decodePayload(input.token, REPLAY_PLAN_PREFIX, input.key);
  if (
    !exactKeys(payload, [
      "contractVersion",
      "receiptVersion",
      "receiptKind",
      "planDigest",
    ]) ||
    payload.contractVersion !== APP1_CONTRACT_VERSION ||
    payload.receiptVersion !== APP1_REPLAY_PLAN_SEAL_VERSION ||
    payload.receiptKind !== "post_insert_replay_plan" ||
    typeof payload.planDigest !== "string" ||
    !SHA256_PATTERN.test(payload.planDigest)
  ) {
    reject("invalid_receipt");
  }
  if (payload.planDigest !== input.planDigest) reject("binding_mismatch");
  return payload as ReplayPlanSealPayload;
}

export function issueApp1AnalysisBinding(input: Readonly<{
  key: Uint8Array;
  userId: string;
  detail: WrongAnswerDetail;
  gap: App1PrimaryGap;
  now?: Date;
}>) {
  const now = input.now ?? new Date();
  const payload: AnalysisPayload = {
    contractVersion: APP1_CONTRACT_VERSION,
    receiptVersion: APP1_ANALYSIS_RECEIPT_VERSION,
    receiptKind: "analysis_binding",
    userId: input.userId,
    sourceItemId: input.detail.item.id,
    subject: input.detail.item.subjectLabel,
    mode: "second",
    sourceRevision: app1SourceRevision(input.detail),
    gapDigest: app1PrimaryGapDigest(input.gap),
    ...bindingTimestamp(now, APP1_ANALYSIS_BINDING_TTL_MS),
  };
  return encodePayload(ANALYSIS_PREFIX, payload, input.key);
}

export function assertApp1AnalysisBinding(input: Readonly<{
  key: Uint8Array;
  token: string;
  userId: string;
  detail: WrongAnswerDetail;
  gap: App1PrimaryGap;
  now?: Date;
}>): AnalysisPayload {
  const payload = decodePayload(input.token, ANALYSIS_PREFIX, input.key);
  if (
    !exactKeys(payload, [
      "contractVersion",
      "receiptVersion",
      "receiptKind",
      "userId",
      "sourceItemId",
      "subject",
      "mode",
      "sourceRevision",
      "gapDigest",
      "issuedAt",
      "expiresAt",
    ]) ||
    payload.contractVersion !== APP1_CONTRACT_VERSION ||
    payload.receiptVersion !== APP1_ANALYSIS_RECEIPT_VERSION ||
    payload.receiptKind !== "analysis_binding" ||
    payload.mode !== "second" ||
    typeof payload.userId !== "string" ||
    typeof payload.sourceItemId !== "string" ||
    !UUID_PATTERN.test(payload.sourceItemId) ||
    typeof payload.subject !== "string" ||
    !SUBJECTS.has(payload.subject) ||
    typeof payload.sourceRevision !== "string" ||
    !SHA256_PATTERN.test(payload.sourceRevision) ||
    typeof payload.gapDigest !== "string" ||
    !SHA256_PATTERN.test(payload.gapDigest)
  ) {
    reject("invalid_receipt");
  }
  assertReceiptWindow(
    payload.issuedAt,
    payload.expiresAt,
    input.now ?? new Date(),
    APP1_ANALYSIS_BINDING_TTL_MS,
  );
  if (
    payload.userId !== input.userId ||
    payload.sourceItemId !== input.detail.item.id ||
    payload.subject !== input.detail.item.subjectLabel ||
    payload.sourceRevision !== app1SourceRevision(input.detail) ||
    payload.gapDigest !== app1PrimaryGapDigest(input.gap)
  ) {
    reject("binding_mismatch");
  }
  return Object.freeze(payload as unknown as AnalysisPayload);
}

export function issueApp1VerificationReceipt(input: Readonly<{
  key: Uint8Array;
  userId: string;
  detail: WrongAnswerDetail;
  gap: App1PrimaryGap;
  analysisBinding: string;
  repairText: string;
  verification: App1RepairVerification;
  persistenceOperationId: string;
  persistenceWorkRevisionId: string;
  now?: Date;
}>) {
  const now = input.now ?? new Date();
  assertApp1AnalysisBinding({
    key: input.key,
    token: input.analysisBinding,
    userId: input.userId,
    detail: input.detail,
    gap: input.gap,
    now,
  });
  if (
    input.verification.state !== "repair_confirmed_for_this_session" ||
    input.verification.requestedGap !== input.gap.gap ||
    input.verification.sameSessionOnly !== true ||
    input.verification.masteryCreated !== false ||
    input.verification.transferCreated !== false ||
    !UUID_V4_PATTERN.test(input.persistenceOperationId) ||
    !UUID_V4_PATTERN.test(input.persistenceWorkRevisionId)
  ) {
    reject("binding_mismatch");
  }
  const payload: VerificationPayload = {
    contractVersion: APP1_CONTRACT_VERSION,
    receiptVersion: APP1_VERIFICATION_RECEIPT_VERSION,
    receiptKind: "repair_verification",
    userId: input.userId,
    sourceItemId: input.detail.item.id,
    subject: input.detail.item.subjectLabel,
    mode: "second",
    sourceRevision: app1SourceRevision(input.detail),
    analysisBindingDigest: app1AnalysisBindingDigest(input.analysisBinding),
    gapDigest: app1PrimaryGapDigest(input.gap),
    repairTextDigest: app1RepairTextDigest(input.repairText),
    verificationState: "repair_confirmed_for_this_session",
    verificationPolicyVersion: APP1_VERIFICATION_POLICY_VERSION,
    persistenceOperationId: input.persistenceOperationId,
    persistenceWorkRevisionId: input.persistenceWorkRevisionId,
    ...bindingTimestamp(now, APP1_RECEIPT_TTL_MS),
  };
  return encodePayload(VERIFICATION_PREFIX, payload, input.key);
}

type App1VerificationReceiptAssertion = Readonly<{
  key: Uint8Array;
  token: string;
  userId: string;
  detail: WrongAnswerDetail;
  gap: App1PrimaryGap;
  analysisBinding: string;
  repairText: string;
  persistenceOperationId: string;
  persistenceWorkRevisionId: string;
  now?: Date;
}>;

function assertApp1VerificationReceiptPayload(
  input: App1VerificationReceiptAssertion,
  requiredWindow: "fresh" | "expired",
): VerificationPayload {
  const now = input.now ?? new Date();
  const payload = decodePayload(input.token, VERIFICATION_PREFIX, input.key);
  if (
    !exactKeys(payload, [
      "contractVersion",
      "receiptVersion",
      "receiptKind",
      "userId",
      "sourceItemId",
      "subject",
      "mode",
      "sourceRevision",
      "analysisBindingDigest",
      "gapDigest",
      "repairTextDigest",
      "verificationState",
      "verificationPolicyVersion",
      "persistenceOperationId",
      "persistenceWorkRevisionId",
      "issuedAt",
      "expiresAt",
    ]) ||
    payload.contractVersion !== APP1_CONTRACT_VERSION ||
    payload.receiptVersion !== APP1_VERIFICATION_RECEIPT_VERSION ||
    payload.receiptKind !== "repair_verification" ||
    payload.mode !== "second" ||
    payload.verificationState !== "repair_confirmed_for_this_session" ||
    payload.verificationPolicyVersion !== APP1_VERIFICATION_POLICY_VERSION ||
    typeof payload.userId !== "string" ||
    typeof payload.sourceItemId !== "string" ||
    !UUID_PATTERN.test(payload.sourceItemId) ||
    typeof payload.subject !== "string" ||
    !SUBJECTS.has(payload.subject) ||
    typeof payload.sourceRevision !== "string" ||
    !SHA256_PATTERN.test(payload.sourceRevision) ||
    typeof payload.analysisBindingDigest !== "string" ||
    !SHA256_PATTERN.test(payload.analysisBindingDigest) ||
    typeof payload.gapDigest !== "string" ||
    !SHA256_PATTERN.test(payload.gapDigest) ||
    typeof payload.repairTextDigest !== "string" ||
    !SHA256_PATTERN.test(payload.repairTextDigest) ||
    typeof payload.persistenceOperationId !== "string" ||
    !UUID_V4_PATTERN.test(payload.persistenceOperationId) ||
    typeof payload.persistenceWorkRevisionId !== "string" ||
    !UUID_V4_PATTERN.test(payload.persistenceWorkRevisionId)
  ) {
    reject("invalid_receipt");
  }
  if (requiredWindow === "fresh") {
    assertReceiptWindow(
      payload.issuedAt,
      payload.expiresAt,
      now,
      APP1_RECEIPT_TTL_MS,
    );
  } else {
    if (
      !canonicalTimestamp(payload.issuedAt) ||
      !canonicalTimestamp(payload.expiresAt)
    ) {
      reject("invalid_receipt");
    }
    const issued = Date.parse(String(payload.issuedAt));
    const expires = Date.parse(String(payload.expiresAt));
    if (
      expires - issued !== APP1_RECEIPT_TTL_MS ||
      now.getTime() < issued ||
      now.getTime() < expires
    ) {
      reject("invalid_receipt");
    }
  }
  // Issuance already validated the older analysis binding. The newer signed
  // receipt binds its exact digest below and keeps its full five-minute window.
  if (
    payload.userId !== input.userId ||
    payload.sourceItemId !== input.detail.item.id ||
    payload.subject !== input.detail.item.subjectLabel ||
    payload.sourceRevision !== app1SourceRevision(input.detail) ||
    payload.analysisBindingDigest !==
      app1AnalysisBindingDigest(input.analysisBinding) ||
    payload.gapDigest !== app1PrimaryGapDigest(input.gap) ||
    payload.repairTextDigest !== app1RepairTextDigest(input.repairText) ||
    payload.persistenceOperationId !== input.persistenceOperationId ||
    payload.persistenceWorkRevisionId !== input.persistenceWorkRevisionId
  ) {
    reject("binding_mismatch");
  }
  return Object.freeze(payload as unknown as VerificationPayload);
}

export function assertApp1VerificationReceipt(
  input: App1VerificationReceiptAssertion,
): VerificationPayload {
  return assertApp1VerificationReceiptPayload(input, "fresh");
}

export function assertExpiredApp1VerificationReceiptForReplay(
  input: App1VerificationReceiptAssertion,
): VerificationPayload {
  return assertApp1VerificationReceiptPayload(input, "expired");
}

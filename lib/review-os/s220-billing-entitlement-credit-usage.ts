import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  S219_LEARNER_CATALOG,
  S219_LEARNER_CATALOG_VERSION,
  S219_LEDGER_CONTRACT_VERSION,
  S219_PRICE_VERSION,
  resolveS219CatalogEntry,
  validateS219LearnerCatalog,
  type S219CatalogEntry,
  type S219CatalogEntryId,
  type S219LearnerCatalog,
  type S219UsageGrant,
  type S219UsageLedgerUnitType,
} from "./s219-learner-catalog-usage-ledger";

export const S220_BILLING_ENTITLEMENT_VERSION = "s220.billing_entitlement_credit_usage.v1" as const;
export const S220_IDEMPOTENT_USAGE_VERSION = "s220.idempotent_usage.v1" as const;

export type S220GrantType =
  | "subscription"
  | "credit_pack";

export type S220GrantStatus =
  | "active"
  | "expired"
  | "reversed";

export type S220EntitlementEvidenceSource =
  | "server_side_catalog_contract"
  | "operator_approved_future_record"
  | "client_asserted";

export type S220UsageReservationStatus =
  | "reserved_pending_commit"
  | "committed"
  | "released_without_consumption";

export type S220UsageReasonCode =
  | "free_full_value_review"
  | "deep_review_unit";

export type S220UsageReleaseReason =
  | "failed_generation_no_consume"
  | "abandoned_no_consume"
  | "operator_release_no_consume"
  | "grant_reversed_no_consume";

export type S220ReversalReason =
  | "refund"
  | "chargeback"
  | "operator_reversal";

export type S220LedgerEventKind =
  | "grant_provisioned"
  | "usage_reserved"
  | "usage_committed"
  | "usage_released"
  | "grant_reversed";

export type S220IdempotencyOperation =
  | "grant"
  | "reserve"
  | "commit"
  | "release"
  | "reverse";

export type S220FailClosedReason =
  | "unknown_sku"
  | "disabled_sku"
  | "expired_grant"
  | "duplicate_commit"
  | "stale_reservation"
  | "insufficient_credits"
  | "client_asserted_entitlement"
  | "ambiguous_catalog_entry"
  | "unsupported_usage_unit"
  | "ambiguous_usage_grant"
  | "invalid_usage_quantity"
  | "learner_instructor_boundary_violation"
  | "academy_tenant_boundary_violation"
  | "idempotency_key_required"
  | "idempotency_key_conflict"
  | "reservation_not_found"
  | "reservation_not_pending"
  | "grant_not_found"
  | "grant_not_active"
  | "usable_result_required"
  | "data_boundary_violation"
  | "runtime_boundary_violation";

export type S220CatalogResolution =
  | {
      ok: true;
      entry: S219CatalogEntry;
    }
  | {
      ok: false;
      reason: S220FailClosedReason;
      entryId: string;
    };

export type S220ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type S220UnitBalance = {
  unitType: S219UsageLedgerUnitType;
  upstreamUsageGrantId: string;
  unitsGranted: number;
  unitsReserved: number;
  unitsConsumed: number;
  unitsReleased: number;
  unitsReversed: number;
  unitsAvailable: number;
  unlimitedSecondExamPrecisionReview: false;
};

export type S220EntitlementGrant = {
  contractVersion: typeof S220_BILLING_ENTITLEMENT_VERSION;
  upstreamCatalogVersion: typeof S219_LEARNER_CATALOG_VERSION;
  upstreamPriceVersion: typeof S219_PRICE_VERSION;
  upstreamLedgerContractVersion: typeof S219_LEDGER_CONTRACT_VERSION;
  grantId: string;
  learnerId: string;
  ownerBinding: "authenticated_request_user";
  actorRole: "learner";
  academyTenantId: null;
  catalogEntryId: S219CatalogEntryId;
  catalogEntryKind: S219CatalogEntry["kind"];
  grantType: S220GrantType;
  grantStatus: S220GrantStatus;
  entitlementEvidenceSource: Exclude<S220EntitlementEvidenceSource, "client_asserted">;
  sourceEventId: string;
  effectiveFrom: string;
  expiresAt: string | null;
  featureKeys: S219CatalogEntry["featureKeys"];
  unitBalances: S220UnitBalance[];
  billingProviderCalled: false;
  checkoutAdded: false;
  paymentWebhookAdded: false;
  entitlementEnforcementActivated: false;
  productionPricingUiAdded: false;
  learnerUiAdded: false;
  productionRouteAdded: false;
  authChanged: false;
  supabaseMigrationAdded: false;
  workflowChanged: false;
  providerRuntimeCalled: false;
  ocrRuntimeCalled: false;
  metadataOnly: true;
  containsRawContent: false;
};

export type S220UsageReservation = {
  contractVersion: typeof S220_IDEMPOTENT_USAGE_VERSION;
  upstreamLedgerContractVersion: typeof S219_LEDGER_CONTRACT_VERSION;
  reservationId: string;
  idempotencyKey: string;
  learnerId: string;
  ownerBinding: "authenticated_request_user";
  actorRole: "learner";
  academyTenantId: null;
  grantId: string;
  catalogEntryId: S219CatalogEntryId;
  unitType: S219UsageLedgerUnitType;
  usageReasonCode: S220UsageReasonCode;
  unitsReserved: number;
  unitsConsumed: number;
  status: S220UsageReservationStatus;
  reservedAt: string;
  expiresAt: string;
  committedAt: string | null;
  releasedAt: string | null;
  commitReason: "usable_result_available" | null;
  releaseReason: S220UsageReleaseReason | null;
  failedGenerationConsumesUnits: false;
  reservationRequiredBeforeExpensiveWork: true;
  commitOnlyAfterUsableResult: true;
  billingProviderCalled: false;
  entitlementEnforcementActivated: false;
  providerRuntimeCalled: false;
  ocrRuntimeCalled: false;
  academyTenantDataAccessed: false;
  containsRawContent: false;
};

export type S220LedgerEvent = {
  contractVersion: typeof S220_IDEMPOTENT_USAGE_VERSION;
  eventId: string;
  eventKind: S220LedgerEventKind;
  idempotencyKey: string;
  learnerId: string;
  grantId: string | null;
  reservationId: string | null;
  unitType: S219UsageLedgerUnitType | null;
  units: number;
  occurredAt: string;
  reason:
    | "grant_active"
    | "reserved_before_expensive_work"
    | "usable_result_available"
    | S220UsageReleaseReason
    | S220ReversalReason;
  billingProviderCalled: false;
  checkoutAdded: false;
  paymentWebhookAdded: false;
  entitlementEnforcementActivated: false;
  containsRawContent: false;
};

export type S220IdempotencyRecord = {
  contractVersion: typeof S220_IDEMPOTENT_USAGE_VERSION;
  operation: S220IdempotencyOperation;
  idempotencyKey: string;
  requestFingerprint: string;
  targetId: string;
  createdAt: string;
  completed: true;
};

export type S220EntitlementState = {
  contractVersion: typeof S220_BILLING_ENTITLEMENT_VERSION;
  idempotentUsageVersion: typeof S220_IDEMPOTENT_USAGE_VERSION;
  upstreamCatalogVersion: typeof S219_LEARNER_CATALOG_VERSION;
  upstreamPriceVersion: typeof S219_PRICE_VERSION;
  upstreamLedgerContractVersion: typeof S219_LEDGER_CONTRACT_VERSION;
  learnerId: string;
  ownerBinding: "authenticated_request_user";
  actorRole: "learner";
  academyTenantId: null;
  grants: S220EntitlementGrant[];
  reservations: S220UsageReservation[];
  ledgerEvents: S220LedgerEvent[];
  idempotencyRecords: S220IdempotencyRecord[];
  billingProviderCalled: false;
  checkoutAdded: false;
  paymentWebhookAdded: false;
  entitlementEnforcementActivated: false;
  productionPricingUiAdded: false;
  learnerUiAdded: false;
  productionRouteAdded: false;
  authChanged: false;
  supabaseMigrationAdded: false;
  workflowChanged: false;
  providerRuntimeCalled: false;
  ocrRuntimeCalled: false;
  academyTenantDataAccessed: false;
  learnerInstructorDataMerged: false;
  metadataOnly: true;
  containsRawContent: false;
};

export type S220CreateStateInput = {
  learnerId: string;
  ownerBinding: "authenticated_request_user";
  actorRole: "learner";
};

export type S220ProvisionGrantInput = {
  grantId: string;
  idempotencyKey: string;
  learnerId: string;
  ownerBinding: "authenticated_request_user";
  actorRole: "learner";
  catalogEntryId: string;
  entitlementEvidenceSource: S220EntitlementEvidenceSource;
  sourceEventId: string;
  effectiveFrom: string;
  expiresAt: string | null;
  catalog?: S219LearnerCatalog;
};

export type S220ReserveUsageInput = {
  reservationId: string;
  idempotencyKey: string;
  learnerId: string;
  ownerBinding: "authenticated_request_user";
  actorRole: "learner";
  grantId: string;
  unitType: S219UsageLedgerUnitType | string;
  quantity: number;
  usageReasonCode: S220UsageReasonCode;
  reservedAt: string;
  expiresAt: string;
};

export type S220CommitUsageInput = {
  reservationId: string;
  idempotencyKey: string;
  learnerId: string;
  committedAt: string;
  resultStatus: "usable_result" | "failed_generation" | "abandoned";
  usableResultAvailable: boolean;
};

export type S220ReleaseUsageInput = {
  reservationId: string;
  idempotencyKey: string;
  learnerId: string;
  releasedAt: string;
  releaseReason: S220UsageReleaseReason;
};

export type S220ReverseGrantInput = {
  grantId: string;
  idempotencyKey: string;
  learnerId: string;
  reversedAt: string;
  reversalReason: S220ReversalReason;
  entitlementEvidenceSource: S220EntitlementEvidenceSource;
};

export type S220OperationResult = {
  state: S220EntitlementState;
  idempotencyKeyStatus: "created" | "idempotent_replay";
  reservation?: S220UsageReservation;
  grant?: S220EntitlementGrant;
  ledgerEvent?: S220LedgerEvent;
};

const SUPPORTED_USAGE_UNITS = new Set<S219UsageLedgerUnitType>([
  "full_value_review_experience",
  "deep_review_unit",
]);

function failClosed(reason: S220FailClosedReason): never {
  throw new Error(`s220-fail-closed:${reason}`);
}

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFinitePositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isIsoBeforeOrEqual(left: string, right: string) {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime <= rightTime;
}

function isIsoBefore(left: string, right: string) {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime < rightTime;
}

function assertLearnerOwned(input: { learnerId: string; ownerBinding: string; actorRole: string }) {
  if (!input.learnerId || input.ownerBinding !== "authenticated_request_user" || input.actorRole !== "learner") {
    failClosed("learner_instructor_boundary_violation");
  }
}

function assertStateLearner(state: S220EntitlementState, learnerId: string) {
  if (state.learnerId !== learnerId || state.ownerBinding !== "authenticated_request_user" || state.actorRole !== "learner") {
    failClosed("learner_instructor_boundary_violation");
  }
  if (state.academyTenantId !== null || state.academyTenantDataAccessed !== false || state.learnerInstructorDataMerged !== false) {
    failClosed("academy_tenant_boundary_violation");
  }
}

function assertServerSideEvidence(source: S220EntitlementEvidenceSource) {
  if (source === "client_asserted") failClosed("client_asserted_entitlement");
}

function assertIdempotencyKey(key: string) {
  if (!key || key.trim().length < 8) failClosed("idempotency_key_required");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(",")}}`;
}

function requestFingerprint(operation: S220IdempotencyOperation, value: Record<string, unknown>) {
  return `${operation}:${stableStringify(value)}`;
}

function findIdempotencyRecord(
  state: S220EntitlementState,
  operation: S220IdempotencyOperation,
  idempotencyKey: string,
  fingerprint: string,
): S220IdempotencyRecord | null {
  assertIdempotencyKey(idempotencyKey);
  const matches = state.idempotencyRecords.filter((record) => (
    record.operation === operation
    && record.idempotencyKey === idempotencyKey
  ));
  if (matches.length === 0) return null;
  if (matches.length > 1 || matches[0].requestFingerprint !== fingerprint) {
    failClosed("idempotency_key_conflict");
  }
  return matches[0];
}

function appendIdempotencyRecord(
  state: S220EntitlementState,
  operation: S220IdempotencyOperation,
  idempotencyKey: string,
  requestFingerprint: string,
  targetId: string,
  createdAt: string,
): S220IdempotencyRecord[] {
  return [
    ...state.idempotencyRecords,
    {
      contractVersion: S220_IDEMPOTENT_USAGE_VERSION,
      operation,
      idempotencyKey,
      requestFingerprint,
      targetId,
      createdAt,
      completed: true,
    },
  ];
}

function mapCatalogFailReason(reason: string): S220FailClosedReason {
  if (reason === "unknown_catalog_entry") return "unknown_sku";
  if (reason === "ambiguous_catalog_entry") return "ambiguous_catalog_entry";
  if (reason === "disabled_catalog_entry") return "disabled_sku";
  if (reason === "catalog_entry_expired" || reason === "catalog_entry_not_effective") return "expired_grant";
  if (reason === "unknown_usage_ledger_unit") return "unsupported_usage_unit";
  if (reason === "ambiguous_usage_grant") return "ambiguous_usage_grant";
  if (reason === "insufficient_usage_grant") return "insufficient_credits";
  if (reason === "learner_instructor_boundary_violation") return "learner_instructor_boundary_violation";
  if (reason === "academy_tenant_boundary_violation") return "academy_tenant_boundary_violation";
  return "data_boundary_violation";
}

export function resolveS220CatalogEntry(
  entryId: string,
  options: {
    catalog?: S219LearnerCatalog;
    asOfDate?: string;
  } = {},
): S220CatalogResolution {
  const catalog = options.catalog ?? S219_LEARNER_CATALOG;
  const validation = validateS219LearnerCatalog(catalog);
  if (!validation.valid && validation.errors.some((error) => /ambiguous catalog entries/i.test(error))) {
    return { ok: false, reason: "ambiguous_catalog_entry", entryId };
  }

  const resolved = resolveS219CatalogEntry(entryId, {
    catalog,
    asOfDate: options.asOfDate,
    requireSaleAvailable: false,
  });

  if (!resolved.ok) {
    return { ok: false, reason: mapCatalogFailReason(resolved.reason), entryId };
  }

  if (resolved.entry.kind === "later_disabled_sku") {
    return { ok: false, reason: "disabled_sku", entryId };
  }

  return { ok: true, entry: resolved.entry };
}

function grantTypeForEntry(entry: S219CatalogEntry): S220GrantType {
  return entry.kind === "deep_review_sku" ? "credit_pack" : "subscription";
}

function usageBalancesForEntry(entry: S219CatalogEntry): S220UnitBalance[] {
  const grants = entry.usageGrants.filter((usageGrant) => usageGrant.grantKind !== "feature_access_marker");

  if (entry.kind === "deep_review_sku" && grants.length !== 1) failClosed("ambiguous_usage_grant");

  return grants.map((usageGrant) => {
    if (!SUPPORTED_USAGE_UNITS.has(usageGrant.unitType)) failClosed("unsupported_usage_unit");
    if (!isFiniteNonNegativeInteger(usageGrant.quantity)) failClosed("invalid_usage_quantity");
    if (usageGrant.quantity > 100000 || usageGrant.unlimitedSecondExamPrecisionReview !== false) {
      failClosed("ambiguous_usage_grant");
    }
    return {
      unitType: usageGrant.unitType,
      upstreamUsageGrantId: usageGrant.grantId,
      unitsGranted: usageGrant.quantity,
      unitsReserved: 0,
      unitsConsumed: 0,
      unitsReleased: 0,
      unitsReversed: 0,
      unitsAvailable: usageGrant.quantity,
      unlimitedSecondExamPrecisionReview: false,
    };
  });
}

function validateUsageGrantForUnit(usageGrant: S219UsageGrant, unitType: S219UsageLedgerUnitType) {
  if (usageGrant.unitType !== unitType) failClosed("unsupported_usage_unit");
  if (usageGrant.ledgerRequiredBeforeConsumption !== true) failClosed("ambiguous_usage_grant");
  if (usageGrant.reservationRequiredBeforeExpensiveWork !== true) failClosed("ambiguous_usage_grant");
  if (usageGrant.commitOnlyAfterUsableResult !== true) failClosed("ambiguous_usage_grant");
  if (usageGrant.failedGenerationConsumesUnits !== false) failClosed("ambiguous_usage_grant");
  if (usageGrant.unlimitedSecondExamPrecisionReview !== false) failClosed("ambiguous_usage_grant");
}

function recalculateBalance(balance: Omit<S220UnitBalance, "unitsAvailable">): S220UnitBalance {
  const unitsAvailable = balance.unitsGranted - balance.unitsReserved - balance.unitsConsumed - balance.unitsReversed;
  return {
    ...balance,
    unitsAvailable,
  };
}

function updateGrantBalance(
  grant: S220EntitlementGrant,
  unitType: S219UsageLedgerUnitType,
  update: (balance: S220UnitBalance) => S220UnitBalance,
): S220EntitlementGrant {
  const matchingBalances = grant.unitBalances.filter((balance) => balance.unitType === unitType);
  if (matchingBalances.length !== 1) failClosed("unsupported_usage_unit");

  return {
    ...grant,
    unitBalances: grant.unitBalances.map((balance) => (
      balance.unitType === unitType ? update(balance) : balance
    )),
  };
}

function findGrant(state: S220EntitlementState, grantId: string) {
  const grant = state.grants.find((candidate) => candidate.grantId === grantId);
  if (!grant) failClosed("grant_not_found");
  return grant;
}

function findReservation(state: S220EntitlementState, reservationId: string) {
  const reservation = state.reservations.find((candidate) => candidate.reservationId === reservationId);
  if (!reservation) failClosed("reservation_not_found");
  return reservation;
}

function assertGrantActive(grant: S220EntitlementGrant, asOf: string) {
  if (grant.grantStatus !== "active") failClosed("grant_not_active");
  if (!isIsoBeforeOrEqual(grant.effectiveFrom, asOf)) failClosed("expired_grant");
  if (grant.expiresAt && !isIsoBefore(asOf, grant.expiresAt)) failClosed("expired_grant");
}

function assertReservationFresh(reservation: S220UsageReservation, asOf: string) {
  if (!isIsoBeforeOrEqual(asOf, reservation.expiresAt)) failClosed("stale_reservation");
}

function eventId(kind: S220LedgerEventKind, idempotencyKey: string) {
  return `s220_${kind}_${idempotencyKey.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function ledgerEvent(input: {
  eventKind: S220LedgerEventKind;
  idempotencyKey: string;
  learnerId: string;
  grantId: string | null;
  reservationId: string | null;
  unitType: S219UsageLedgerUnitType | null;
  units: number;
  occurredAt: string;
  reason: S220LedgerEvent["reason"];
}): S220LedgerEvent {
  return sanitizeDerivedMetadata({
    contractVersion: S220_IDEMPOTENT_USAGE_VERSION,
    eventId: eventId(input.eventKind, input.idempotencyKey),
    eventKind: input.eventKind,
    idempotencyKey: input.idempotencyKey,
    learnerId: input.learnerId,
    grantId: input.grantId,
    reservationId: input.reservationId,
    unitType: input.unitType,
    units: input.units,
    occurredAt: input.occurredAt,
    reason: input.reason,
    billingProviderCalled: false,
    checkoutAdded: false,
    paymentWebhookAdded: false,
    entitlementEnforcementActivated: false,
    containsRawContent: false,
  }) as S220LedgerEvent;
}

function validateOrFail(state: S220EntitlementState) {
  const validation = validateS220EntitlementState(state);
  if (!validation.valid) failClosed("data_boundary_violation");
}

export function createS220EntitlementState(input: S220CreateStateInput): S220EntitlementState {
  assertLearnerOwned(input);
  const state = sanitizeDerivedMetadata({
    contractVersion: S220_BILLING_ENTITLEMENT_VERSION,
    idempotentUsageVersion: S220_IDEMPOTENT_USAGE_VERSION,
    upstreamCatalogVersion: S219_LEARNER_CATALOG_VERSION,
    upstreamPriceVersion: S219_PRICE_VERSION,
    upstreamLedgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
    learnerId: input.learnerId,
    ownerBinding: "authenticated_request_user",
    actorRole: "learner",
    academyTenantId: null,
    grants: [],
    reservations: [],
    ledgerEvents: [],
    idempotencyRecords: [],
    billingProviderCalled: false,
    checkoutAdded: false,
    paymentWebhookAdded: false,
    entitlementEnforcementActivated: false,
    productionPricingUiAdded: false,
    learnerUiAdded: false,
    productionRouteAdded: false,
    authChanged: false,
    supabaseMigrationAdded: false,
    workflowChanged: false,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    academyTenantDataAccessed: false,
    learnerInstructorDataMerged: false,
    metadataOnly: true,
    containsRawContent: false,
  }) as S220EntitlementState;
  validateOrFail(state);
  return state;
}

export function provisionS220EntitlementGrant(input: S220ProvisionGrantInput): S220EntitlementGrant {
  assertLearnerOwned(input);
  assertServerSideEvidence(input.entitlementEvidenceSource);
  assertIdempotencyKey(input.idempotencyKey);

  if (input.expiresAt && !isIsoBefore(input.effectiveFrom, input.expiresAt)) failClosed("expired_grant");

  const resolved = resolveS220CatalogEntry(input.catalogEntryId, {
    catalog: input.catalog,
    asOfDate: input.effectiveFrom,
  });
  if (!resolved.ok) failClosed(resolved.reason);

  const unitBalances = usageBalancesForEntry(resolved.entry);
  for (const usageGrant of resolved.entry.usageGrants) {
    if (usageGrant.grantKind !== "feature_access_marker") {
      validateUsageGrantForUnit(usageGrant, usageGrant.unitType);
    }
  }

  const grant = sanitizeDerivedMetadata({
    contractVersion: S220_BILLING_ENTITLEMENT_VERSION,
    upstreamCatalogVersion: S219_LEARNER_CATALOG_VERSION,
    upstreamPriceVersion: S219_PRICE_VERSION,
    upstreamLedgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
    grantId: input.grantId,
    learnerId: input.learnerId,
    ownerBinding: "authenticated_request_user",
    actorRole: "learner",
    academyTenantId: null,
    catalogEntryId: resolved.entry.id,
    catalogEntryKind: resolved.entry.kind,
    grantType: grantTypeForEntry(resolved.entry),
    grantStatus: "active",
    entitlementEvidenceSource: input.entitlementEvidenceSource,
    sourceEventId: input.sourceEventId,
    effectiveFrom: input.effectiveFrom,
    expiresAt: input.expiresAt,
    featureKeys: resolved.entry.featureKeys,
    unitBalances,
    billingProviderCalled: false,
    checkoutAdded: false,
    paymentWebhookAdded: false,
    entitlementEnforcementActivated: false,
    productionPricingUiAdded: false,
    learnerUiAdded: false,
    productionRouteAdded: false,
    authChanged: false,
    supabaseMigrationAdded: false,
    workflowChanged: false,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    metadataOnly: true,
    containsRawContent: false,
  }) as S220EntitlementGrant;

  assertNoRawUserDataInDerived(grant);
  return grant;
}

export function addS220EntitlementGrant(
  state: S220EntitlementState,
  input: S220ProvisionGrantInput,
): S220OperationResult {
  assertStateLearner(state, input.learnerId);
  const fingerprint = requestFingerprint("grant", {
    learnerId: input.learnerId,
    catalogEntryId: input.catalogEntryId,
    sourceEventId: input.sourceEventId,
    effectiveFrom: input.effectiveFrom,
    expiresAt: input.expiresAt,
  });
  const existingRecord = findIdempotencyRecord(state, "grant", input.idempotencyKey, fingerprint);
  if (existingRecord) {
    const existingGrant = state.grants.find((grant) => grant.grantId === existingRecord.targetId);
    if (!existingGrant) failClosed("grant_not_found");
    return { state, grant: existingGrant, idempotencyKeyStatus: "idempotent_replay" };
  }
  if (state.grants.some((grant) => grant.grantId === input.grantId)) failClosed("idempotency_key_conflict");

  const grant = provisionS220EntitlementGrant(input);
  const event = ledgerEvent({
    eventKind: "grant_provisioned",
    idempotencyKey: input.idempotencyKey,
    learnerId: input.learnerId,
    grantId: grant.grantId,
    reservationId: null,
    unitType: grant.unitBalances[0]?.unitType ?? null,
    units: grant.unitBalances.reduce((total, balance) => total + balance.unitsGranted, 0),
    occurredAt: input.effectiveFrom,
    reason: "grant_active",
  });
  const nextState = {
    ...state,
    grants: [...state.grants, grant],
    ledgerEvents: [...state.ledgerEvents, event],
    idempotencyRecords: appendIdempotencyRecord(state, "grant", input.idempotencyKey, fingerprint, grant.grantId, input.effectiveFrom),
  };
  validateOrFail(nextState);
  return { state: nextState, grant, ledgerEvent: event, idempotencyKeyStatus: "created" };
}

export function reserveS220Usage(
  state: S220EntitlementState,
  input: S220ReserveUsageInput,
): S220OperationResult {
  assertLearnerOwned(input);
  assertStateLearner(state, input.learnerId);
  if (!SUPPORTED_USAGE_UNITS.has(input.unitType as S219UsageLedgerUnitType)) failClosed("unsupported_usage_unit");
  if (!isFinitePositiveInteger(input.quantity)) failClosed("invalid_usage_quantity");
  if (!isIsoBefore(input.reservedAt, input.expiresAt)) failClosed("stale_reservation");

  const unitType = input.unitType as S219UsageLedgerUnitType;
  const fingerprint = requestFingerprint("reserve", {
    learnerId: input.learnerId,
    grantId: input.grantId,
    unitType,
    quantity: input.quantity,
    usageReasonCode: input.usageReasonCode,
    reservedAt: input.reservedAt,
    expiresAt: input.expiresAt,
  });
  const existingRecord = findIdempotencyRecord(state, "reserve", input.idempotencyKey, fingerprint);
  if (existingRecord) {
    const existingReservation = state.reservations.find((reservation) => reservation.reservationId === existingRecord.targetId);
    if (!existingReservation) failClosed("reservation_not_found");
    return { state, reservation: existingReservation, idempotencyKeyStatus: "idempotent_replay" };
  }
  if (state.reservations.some((reservation) => reservation.reservationId === input.reservationId)) {
    failClosed("idempotency_key_conflict");
  }

  const grant = findGrant(state, input.grantId);
  assertGrantActive(grant, input.reservedAt);
  const balance = grant.unitBalances.find((candidate) => candidate.unitType === unitType);
  if (!balance) failClosed("unsupported_usage_unit");
  if (balance.unitsAvailable < input.quantity) failClosed("insufficient_credits");

  const updatedGrant = updateGrantBalance(grant, unitType, (current) => (
    recalculateBalance({
      ...current,
      unitsReserved: current.unitsReserved + input.quantity,
    })
  ));

  const reservation = sanitizeDerivedMetadata({
    contractVersion: S220_IDEMPOTENT_USAGE_VERSION,
    upstreamLedgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
    reservationId: input.reservationId,
    idempotencyKey: input.idempotencyKey,
    learnerId: input.learnerId,
    ownerBinding: "authenticated_request_user",
    actorRole: "learner",
    academyTenantId: null,
    grantId: grant.grantId,
    catalogEntryId: grant.catalogEntryId,
    unitType,
    usageReasonCode: input.usageReasonCode,
    unitsReserved: input.quantity,
    unitsConsumed: 0,
    status: "reserved_pending_commit",
    reservedAt: input.reservedAt,
    expiresAt: input.expiresAt,
    committedAt: null,
    releasedAt: null,
    commitReason: null,
    releaseReason: null,
    failedGenerationConsumesUnits: false,
    reservationRequiredBeforeExpensiveWork: true,
    commitOnlyAfterUsableResult: true,
    billingProviderCalled: false,
    entitlementEnforcementActivated: false,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    academyTenantDataAccessed: false,
    containsRawContent: false,
  }) as S220UsageReservation;

  const event = ledgerEvent({
    eventKind: "usage_reserved",
    idempotencyKey: input.idempotencyKey,
    learnerId: input.learnerId,
    grantId: grant.grantId,
    reservationId: reservation.reservationId,
    unitType,
    units: input.quantity,
    occurredAt: input.reservedAt,
    reason: "reserved_before_expensive_work",
  });

  const nextState = {
    ...state,
    grants: state.grants.map((candidate) => candidate.grantId === grant.grantId ? updatedGrant : candidate),
    reservations: [...state.reservations, reservation],
    ledgerEvents: [...state.ledgerEvents, event],
    idempotencyRecords: appendIdempotencyRecord(state, "reserve", input.idempotencyKey, fingerprint, reservation.reservationId, input.reservedAt),
  };
  validateOrFail(nextState);
  return { state: nextState, reservation, ledgerEvent: event, idempotencyKeyStatus: "created" };
}

export function commitS220UsageReservation(
  state: S220EntitlementState,
  input: S220CommitUsageInput,
): S220OperationResult {
  assertStateLearner(state, input.learnerId);
  const fingerprint = requestFingerprint("commit", {
    learnerId: input.learnerId,
    reservationId: input.reservationId,
    committedAt: input.committedAt,
    resultStatus: input.resultStatus,
    usableResultAvailable: input.usableResultAvailable,
  });
  const existingRecord = findIdempotencyRecord(state, "commit", input.idempotencyKey, fingerprint);
  if (existingRecord) {
    const existingReservation = state.reservations.find((reservation) => reservation.reservationId === existingRecord.targetId);
    if (!existingReservation) failClosed("reservation_not_found");
    return { state, reservation: existingReservation, idempotencyKeyStatus: "idempotent_replay" };
  }
  if (input.resultStatus !== "usable_result" || input.usableResultAvailable !== true) {
    failClosed("usable_result_required");
  }

  const reservation = findReservation(state, input.reservationId);
  if (reservation.status === "committed") failClosed("duplicate_commit");
  if (reservation.status !== "reserved_pending_commit") failClosed("reservation_not_pending");
  assertReservationFresh(reservation, input.committedAt);

  const grant = findGrant(state, reservation.grantId);
  assertGrantActive(grant, input.committedAt);

  const updatedGrant = updateGrantBalance(grant, reservation.unitType, (current) => (
    recalculateBalance({
      ...current,
      unitsReserved: current.unitsReserved - reservation.unitsReserved,
      unitsConsumed: current.unitsConsumed + reservation.unitsReserved,
    })
  ));

  const committedReservation: S220UsageReservation = {
    ...reservation,
    status: "committed",
    unitsConsumed: reservation.unitsReserved,
    committedAt: input.committedAt,
    commitReason: "usable_result_available",
  };
  const event = ledgerEvent({
    eventKind: "usage_committed",
    idempotencyKey: input.idempotencyKey,
    learnerId: input.learnerId,
    grantId: grant.grantId,
    reservationId: reservation.reservationId,
    unitType: reservation.unitType,
    units: reservation.unitsReserved,
    occurredAt: input.committedAt,
    reason: "usable_result_available",
  });

  const nextState = {
    ...state,
    grants: state.grants.map((candidate) => candidate.grantId === grant.grantId ? updatedGrant : candidate),
    reservations: state.reservations.map((candidate) => (
      candidate.reservationId === reservation.reservationId ? committedReservation : candidate
    )),
    ledgerEvents: [...state.ledgerEvents, event],
    idempotencyRecords: appendIdempotencyRecord(state, "commit", input.idempotencyKey, fingerprint, reservation.reservationId, input.committedAt),
  };
  validateOrFail(nextState);
  return { state: nextState, reservation: committedReservation, ledgerEvent: event, idempotencyKeyStatus: "created" };
}

export function releaseS220UsageReservation(
  state: S220EntitlementState,
  input: S220ReleaseUsageInput,
): S220OperationResult {
  assertStateLearner(state, input.learnerId);
  const fingerprint = requestFingerprint("release", {
    learnerId: input.learnerId,
    reservationId: input.reservationId,
    releasedAt: input.releasedAt,
    releaseReason: input.releaseReason,
  });
  const existingRecord = findIdempotencyRecord(state, "release", input.idempotencyKey, fingerprint);
  if (existingRecord) {
    const existingReservation = state.reservations.find((reservation) => reservation.reservationId === existingRecord.targetId);
    if (!existingReservation) failClosed("reservation_not_found");
    return { state, reservation: existingReservation, idempotencyKeyStatus: "idempotent_replay" };
  }

  const reservation = findReservation(state, input.reservationId);
  if (reservation.status !== "reserved_pending_commit") failClosed("reservation_not_pending");
  assertReservationFresh(reservation, input.releasedAt);

  const grant = findGrant(state, reservation.grantId);
  const updatedGrant = updateGrantBalance(grant, reservation.unitType, (current) => (
    recalculateBalance({
      ...current,
      unitsReserved: current.unitsReserved - reservation.unitsReserved,
      unitsReleased: current.unitsReleased + reservation.unitsReserved,
    })
  ));

  const releasedReservation: S220UsageReservation = {
    ...reservation,
    status: "released_without_consumption",
    unitsConsumed: 0,
    releasedAt: input.releasedAt,
    releaseReason: input.releaseReason,
  };
  const event = ledgerEvent({
    eventKind: "usage_released",
    idempotencyKey: input.idempotencyKey,
    learnerId: input.learnerId,
    grantId: grant.grantId,
    reservationId: reservation.reservationId,
    unitType: reservation.unitType,
    units: 0,
    occurredAt: input.releasedAt,
    reason: input.releaseReason,
  });

  const nextState = {
    ...state,
    grants: state.grants.map((candidate) => candidate.grantId === grant.grantId ? updatedGrant : candidate),
    reservations: state.reservations.map((candidate) => (
      candidate.reservationId === reservation.reservationId ? releasedReservation : candidate
    )),
    ledgerEvents: [...state.ledgerEvents, event],
    idempotencyRecords: appendIdempotencyRecord(state, "release", input.idempotencyKey, fingerprint, reservation.reservationId, input.releasedAt),
  };
  validateOrFail(nextState);
  return { state: nextState, reservation: releasedReservation, ledgerEvent: event, idempotencyKeyStatus: "created" };
}

export function reverseS220EntitlementGrant(
  state: S220EntitlementState,
  input: S220ReverseGrantInput,
): S220OperationResult {
  assertStateLearner(state, input.learnerId);
  assertServerSideEvidence(input.entitlementEvidenceSource);
  const fingerprint = requestFingerprint("reverse", {
    learnerId: input.learnerId,
    grantId: input.grantId,
    reversedAt: input.reversedAt,
    reversalReason: input.reversalReason,
  });
  const existingRecord = findIdempotencyRecord(state, "reverse", input.idempotencyKey, fingerprint);
  if (existingRecord) {
    const existingGrant = state.grants.find((grant) => grant.grantId === existingRecord.targetId);
    if (!existingGrant) failClosed("grant_not_found");
    return { state, grant: existingGrant, idempotencyKeyStatus: "idempotent_replay" };
  }

  const grant = findGrant(state, input.grantId);
  if (grant.grantStatus !== "active") failClosed("grant_not_active");

  const reversedGrant: S220EntitlementGrant = {
    ...grant,
    grantStatus: "reversed",
    unitBalances: grant.unitBalances.map((balance) => (
      recalculateBalance({
        ...balance,
        unitsReleased: balance.unitsReleased + balance.unitsReserved,
        unitsReserved: 0,
        unitsReversed: balance.unitsGranted - balance.unitsConsumed,
      })
    )),
  };

  const releasedReservations = state.reservations.map((reservation) => {
    if (reservation.grantId !== grant.grantId || reservation.status !== "reserved_pending_commit") return reservation;
    return {
      ...reservation,
      status: "released_without_consumption" as const,
      unitsConsumed: 0,
      releasedAt: input.reversedAt,
      releaseReason: "grant_reversed_no_consume" as const,
    };
  });

  const reversedUnits = reversedGrant.unitBalances.reduce((total, balance) => total + balance.unitsReversed, 0);
  const event = ledgerEvent({
    eventKind: "grant_reversed",
    idempotencyKey: input.idempotencyKey,
    learnerId: input.learnerId,
    grantId: grant.grantId,
    reservationId: null,
    unitType: reversedGrant.unitBalances[0]?.unitType ?? null,
    units: reversedUnits,
    occurredAt: input.reversedAt,
    reason: input.reversalReason,
  });

  const nextState = {
    ...state,
    grants: state.grants.map((candidate) => candidate.grantId === grant.grantId ? reversedGrant : candidate),
    reservations: releasedReservations,
    ledgerEvents: [...state.ledgerEvents, event],
    idempotencyRecords: appendIdempotencyRecord(state, "reverse", input.idempotencyKey, fingerprint, grant.grantId, input.reversedAt),
  };
  validateOrFail(nextState);
  return { state: nextState, grant: reversedGrant, ledgerEvent: event, idempotencyKeyStatus: "created" };
}

export function validateS220EntitlementState(state: S220EntitlementState): S220ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertNoRawUserDataInDerived(state);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s220-data-boundary-error");
  }

  if (state.contractVersion !== S220_BILLING_ENTITLEMENT_VERSION) errors.push("contractVersion mismatch");
  if (state.idempotentUsageVersion !== S220_IDEMPOTENT_USAGE_VERSION) errors.push("idempotentUsageVersion mismatch");
  if (state.upstreamCatalogVersion !== S219_LEARNER_CATALOG_VERSION) errors.push("upstreamCatalogVersion mismatch");
  if (state.upstreamPriceVersion !== S219_PRICE_VERSION) errors.push("upstreamPriceVersion mismatch");
  if (state.upstreamLedgerContractVersion !== S219_LEDGER_CONTRACT_VERSION) errors.push("upstreamLedgerContractVersion mismatch");
  if (!state.learnerId) errors.push("learnerId is required");
  if (state.ownerBinding !== "authenticated_request_user" || state.actorRole !== "learner") {
    errors.push("state must remain learner-owned");
  }
  if (state.academyTenantId !== null || state.academyTenantDataAccessed !== false || state.learnerInstructorDataMerged !== false) {
    errors.push("state must not access or merge academy tenant data");
  }
  for (const [key, value] of Object.entries({
    billingProviderCalled: state.billingProviderCalled,
    checkoutAdded: state.checkoutAdded,
    paymentWebhookAdded: state.paymentWebhookAdded,
    entitlementEnforcementActivated: state.entitlementEnforcementActivated,
    productionPricingUiAdded: state.productionPricingUiAdded,
    learnerUiAdded: state.learnerUiAdded,
    productionRouteAdded: state.productionRouteAdded,
    authChanged: state.authChanged,
    supabaseMigrationAdded: state.supabaseMigrationAdded,
    workflowChanged: state.workflowChanged,
    providerRuntimeCalled: state.providerRuntimeCalled,
    ocrRuntimeCalled: state.ocrRuntimeCalled,
    containsRawContent: state.containsRawContent,
  })) {
    if (value !== false) errors.push(`${key} must remain false`);
  }
  if (state.metadataOnly !== true) errors.push("state must be metadata-only");

  const grantIds = state.grants.map((grant) => grant.grantId);
  const duplicateGrantIds = unique(grantIds.filter((id, index) => grantIds.indexOf(id) !== index));
  if (duplicateGrantIds.length > 0) errors.push(`duplicate grants: ${duplicateGrantIds.join(", ")}`);

  for (const grant of state.grants) {
    if (grant.contractVersion !== S220_BILLING_ENTITLEMENT_VERSION) errors.push(`${grant.grantId}.contractVersion mismatch`);
    if (grant.learnerId !== state.learnerId) errors.push(`${grant.grantId}.learnerId mismatch`);
    if (grant.academyTenantId !== null) errors.push(`${grant.grantId}.academyTenantId must be null`);
    if ((grant.entitlementEvidenceSource as S220EntitlementEvidenceSource) === "client_asserted") {
      errors.push(`${grant.grantId}.client assertion is forbidden`);
    }
    if (grant.grantType === "credit_pack" && grant.catalogEntryKind !== "deep_review_sku") {
      errors.push(`${grant.grantId}.credit pack must come from a deep review SKU`);
    }
    if (grant.catalogEntryKind === "later_disabled_sku") errors.push(`${grant.grantId}.disabled SKU must not be granted`);
    if (Object.values({
      billingProviderCalled: grant.billingProviderCalled,
      checkoutAdded: grant.checkoutAdded,
      paymentWebhookAdded: grant.paymentWebhookAdded,
      entitlementEnforcementActivated: grant.entitlementEnforcementActivated,
      productionPricingUiAdded: grant.productionPricingUiAdded,
      learnerUiAdded: grant.learnerUiAdded,
      productionRouteAdded: grant.productionRouteAdded,
      authChanged: grant.authChanged,
      supabaseMigrationAdded: grant.supabaseMigrationAdded,
      workflowChanged: grant.workflowChanged,
      providerRuntimeCalled: grant.providerRuntimeCalled,
      ocrRuntimeCalled: grant.ocrRuntimeCalled,
      containsRawContent: grant.containsRawContent,
    }).some((value) => value !== false)) {
      errors.push(`${grant.grantId}.runtime boundary must remain false`);
    }
    if (grant.metadataOnly !== true) errors.push(`${grant.grantId}.metadataOnly must be true`);
    for (const balance of grant.unitBalances) {
      if (!SUPPORTED_USAGE_UNITS.has(balance.unitType)) errors.push(`${grant.grantId}.unitType is unsupported`);
      for (const field of ["unitsGranted", "unitsReserved", "unitsConsumed", "unitsReleased", "unitsReversed", "unitsAvailable"] as const) {
        if (!isFiniteNonNegativeInteger(balance[field])) errors.push(`${grant.grantId}.${field} must be finite non-negative integer`);
      }
      if (balance.unitsAvailable !== balance.unitsGranted - balance.unitsReserved - balance.unitsConsumed - balance.unitsReversed) {
        errors.push(`${grant.grantId}.unitsAvailable is inconsistent`);
      }
      if (balance.unitsAvailable < 0) errors.push(`${grant.grantId}.unitsAvailable cannot be negative`);
      if (balance.unlimitedSecondExamPrecisionReview !== false) errors.push(`${grant.grantId}.unlimited review is forbidden`);
    }
  }

  const reservationIds = state.reservations.map((reservation) => reservation.reservationId);
  const duplicateReservationIds = unique(reservationIds.filter((id, index) => reservationIds.indexOf(id) !== index));
  if (duplicateReservationIds.length > 0) errors.push(`duplicate reservations: ${duplicateReservationIds.join(", ")}`);

  for (const reservation of state.reservations) {
    if (reservation.contractVersion !== S220_IDEMPOTENT_USAGE_VERSION) errors.push(`${reservation.reservationId}.contractVersion mismatch`);
    if (reservation.learnerId !== state.learnerId) errors.push(`${reservation.reservationId}.learnerId mismatch`);
    if (reservation.ownerBinding !== "authenticated_request_user" || reservation.actorRole !== "learner") {
      errors.push(`${reservation.reservationId}.reservation must remain learner-owned`);
    }
    if (reservation.academyTenantId !== null || reservation.academyTenantDataAccessed !== false) {
      errors.push(`${reservation.reservationId}.academy boundary violation`);
    }
    if (!SUPPORTED_USAGE_UNITS.has(reservation.unitType)) errors.push(`${reservation.reservationId}.unitType is unsupported`);
    if (!isFinitePositiveInteger(reservation.unitsReserved)) errors.push(`${reservation.reservationId}.unitsReserved must be positive`);
    if (!isFiniteNonNegativeInteger(reservation.unitsConsumed)) errors.push(`${reservation.reservationId}.unitsConsumed must be non-negative`);
    if (reservation.status === "committed" && reservation.unitsConsumed !== reservation.unitsReserved) {
      errors.push(`${reservation.reservationId}.committed reservation must consume reserved units`);
    }
    if (reservation.status === "released_without_consumption" && reservation.unitsConsumed !== 0) {
      errors.push(`${reservation.reservationId}.released reservation must not consume units`);
    }
    if (reservation.status === "reserved_pending_commit" && (reservation.committedAt !== null || reservation.releasedAt !== null)) {
      errors.push(`${reservation.reservationId}.pending reservation must not have terminal timestamps`);
    }
    if (!isIsoBefore(reservation.reservedAt, reservation.expiresAt)) {
      errors.push(`${reservation.reservationId}.reservation window is stale`);
    }
    if (reservation.failedGenerationConsumesUnits !== false) errors.push(`${reservation.reservationId}.failed generation must not consume`);
    if (reservation.reservationRequiredBeforeExpensiveWork !== true) errors.push(`${reservation.reservationId}.reservation required flag missing`);
    if (reservation.commitOnlyAfterUsableResult !== true) errors.push(`${reservation.reservationId}.commit-only-after-usable-result flag missing`);
    if (reservation.billingProviderCalled !== false || reservation.entitlementEnforcementActivated !== false) {
      errors.push(`${reservation.reservationId}.runtime boundary violation`);
    }
    if (reservation.providerRuntimeCalled !== false || reservation.ocrRuntimeCalled !== false || reservation.containsRawContent !== false) {
      errors.push(`${reservation.reservationId}.data boundary violation`);
    }
  }

  const idempotencyKeys = state.idempotencyRecords.map((record) => `${record.operation}:${record.idempotencyKey}`);
  const duplicateIdempotencyKeys = unique(idempotencyKeys.filter((key, index) => idempotencyKeys.indexOf(key) !== index));
  if (duplicateIdempotencyKeys.length > 0) errors.push(`duplicate idempotency keys: ${duplicateIdempotencyKeys.join(", ")}`);

  for (const event of state.ledgerEvents) {
    if (event.contractVersion !== S220_IDEMPOTENT_USAGE_VERSION) errors.push(`${event.eventId}.contractVersion mismatch`);
    if (event.learnerId !== state.learnerId) errors.push(`${event.eventId}.learnerId mismatch`);
    if (event.billingProviderCalled !== false || event.checkoutAdded !== false || event.paymentWebhookAdded !== false) {
      errors.push(`${event.eventId}.must not call billing or payment runtime`);
    }
    if (event.entitlementEnforcementActivated !== false) errors.push(`${event.eventId}.must not activate enforcement`);
    if (event.containsRawContent !== false) errors.push(`${event.eventId}.must not contain raw content`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function buildS220BillingEntitlementContractReport(
  state: S220EntitlementState = createS220EntitlementState({
    learnerId: "learner_s220_metadata_report",
    ownerBinding: "authenticated_request_user",
    actorRole: "learner",
  }),
  catalog: S219LearnerCatalog = S219_LEARNER_CATALOG,
) {
  const catalogValidation = validateS219LearnerCatalog(catalog);
  const stateValidation = validateS220EntitlementState(state);
  const deepReviewCreditPacks = catalog.entries.filter((entry) => entry.kind === "deep_review_sku");
  const totalCreditPackUnits = deepReviewCreditPacks.reduce((total, entry) => (
    total + entry.usageGrants
      .filter((usageGrant) => usageGrant.unitType === "deep_review_unit")
      .reduce((innerTotal, usageGrant) => innerTotal + usageGrant.quantity, 0)
  ), 0);

  return sanitizeDerivedMetadata({
    version: S220_BILLING_ENTITLEMENT_VERSION,
    idempotentUsageVersion: S220_IDEMPOTENT_USAGE_VERSION,
    upstreamCatalogVersion: S219_LEARNER_CATALOG_VERSION,
    upstreamPriceVersion: S219_PRICE_VERSION,
    upstreamLedgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
    catalogValid: catalogValidation.valid,
    stateValid: stateValidation.valid,
    subscriptionGrantCount: state.grants.filter((grant) => grant.grantType === "subscription").length,
    creditPackGrantCount: state.grants.filter((grant) => grant.grantType === "credit_pack").length,
    activeGrantCount: state.grants.filter((grant) => grant.grantStatus === "active").length,
    reservationCount: state.reservations.length,
    committedReservationCount: state.reservations.filter((reservation) => reservation.status === "committed").length,
    releasedReservationCount: state.reservations.filter((reservation) => reservation.status === "released_without_consumption").length,
    totalCreditPackUnits,
    billingProviderCalled: false,
    checkoutAdded: false,
    paymentWebhookAdded: false,
    entitlementEnforcementActivated: false,
    productionPricingUiAdded: false,
    learnerUiAdded: false,
    productionRouteAdded: false,
    authChanged: false,
    supabaseMigrationAdded: false,
    workflowChanged: false,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    academyTenantDataAccessed: false,
    metadataOnly: true,
    containsRawContent: false,
  });
}

export function assertS220FixtureMetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  const serialized = JSON.stringify(value);
  if (/"(?:questionText|answerText|referenceText|providerPayload|sourceExcerpt|ocrText|rawAnswerText|rawOcrText|credential|paymentSecret|providerSecret)"\s*:/i.test(serialized)) {
    throw new Error("s220-fixture-raw-content-field");
  }
  if (/official\s+grading|confirmed\s+score|pass\s+probability|pass\s+guarantee|official\s+model\s+answer/i.test(serialized)) {
    throw new Error("s220-fixture-prohibited-authority-claim");
  }
}

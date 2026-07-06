import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";
import {
  S219_LEARNER_CATALOG,
  S219_LEARNER_CATALOG_VERSION,
  S219_LEDGER_CONTRACT_VERSION,
  S219_PRICE_VERSION,
  type S219CatalogEntryId,
  type S219UsageLedgerUnitType,
} from "./s219-learner-catalog-usage-ledger";
import {
  S220_BILLING_ENTITLEMENT_VERSION,
  S220_IDEMPOTENT_USAGE_VERSION,
  validateS220EntitlementState,
  type S220EntitlementState,
} from "./s220-billing-entitlement-credit-usage";

export const S221_PAID_TRUST_VERSION = "s221.paid_trust_privacy_cost_guardrails.v1" as const;
export const S221_COST_GUARDRAIL_VERSION = "s221.cost_guardrails.v1" as const;

export type S221TrustSurfaceId =
  | "data_export"
  | "account_data_deletion_request"
  | "support_contact"
  | "refund_cancel_policy"
  | "subscription_pack_history"
  | "remaining_usage_credit"
  | "ai_official_source_labels";

export type S221ImplementationMode = "source_contract_only";
export type S221WarningState =
  | "normal"
  | "approaching_budget"
  | "blocked_by_guardrail"
  | "feature_killed"
  | "provider_killed"
  | "anomaly_review_required";

export type S221RuntimeBoundary = {
  checkoutAdded: false;
  paymentWebhookAdded: false;
  billingProviderCalled: false;
  productionBillingActivated: false;
  entitlementEnforcementActivated: false;
  productionPricingUiAdded: false;
  authChanged: false;
  workflowChanged: false;
  academyRouteAdded: false;
  instructorRouteAdded: false;
  providerRuntimeExpanded: false;
  ocrRuntimeExpanded: false;
  publicArchiveUiAdded: false;
  corpusExpansionAdded: false;
  supabaseMigrationAdded: false;
};

export type S221DataBoundary = {
  metadataOnly: true;
  learnerMaterialIncluded: false;
  ocrMaterialIncluded: false;
  problemMaterialIncluded: false;
  generatedAnswerProseIncluded: false;
  sourceExcerptIncluded: false;
  providerPayloadIncluded: false;
  credentialIncluded: false;
  paymentSecretIncluded: false;
  billingSecretIncluded: false;
  assetBytesIncluded: false;
  containsRawContent: false;
};

export type S221TrustSurface = {
  id: S221TrustSurfaceId;
  contractVersion: typeof S221_PAID_TRUST_VERSION;
  implementationMode: S221ImplementationMode;
  requiredBeforePaidLaunch: true;
  learnerVisibleBeforePaidLaunch: true;
  copyKo: string;
  owner: "learner_product";
  requestChannel:
    | "settings_and_support_request"
    | "support_contact"
    | "usage_surface"
    | "result_trust_label";
  sourceOfTruth:
    | "data_boundary_policy"
    | "support_policy_contract"
    | "s220_entitlement_state"
    | "reference_source_status";
  dataScope: {
    includesUserOwnedRawServiceRecords: boolean;
    includesDerivedLearningSignals: boolean;
    includesSubscriptionOrPackMetadata: boolean;
    excludesReferenceCorpus: true;
    excludesAggregateMetrics: true;
    excludesAcademyTenantData: true;
  };
  runtimeBoundary: S221RuntimeBoundary;
  dataBoundary: S221DataBoundary;
};

export type S221BudgetLimit = {
  unit: "pages" | "tokens" | "milliseconds" | "attempts";
  perRequestMax: number;
  warningThreshold: number;
  hardStopThreshold: number;
};

export type S221KillSwitch = {
  id: string;
  kind: "feature" | "provider";
  defaultState:
    | "disabled_until_explicit_launch_gate"
    | "existing_runtime_unchanged"
    | "source_contract_only_not_wired";
  blocks: string;
  runtimeWiredInThisPr: false;
};

export type S221CostGuardrailConfig = {
  version: typeof S221_COST_GUARDRAIL_VERSION;
  implementationMode: S221ImplementationMode;
  budgets: {
    ocrPages: S221BudgetLimit;
    modelInputTokens: S221BudgetLimit;
    modelOutputTokens: S221BudgetLimit;
    modelTotalTokens: S221BudgetLimit;
    timeoutBudget: S221BudgetLimit;
    retryBudget: S221BudgetLimit;
  };
  featureKillSwitches: S221KillSwitch[];
  providerKillSwitches: S221KillSwitch[];
  warningStates: S221WarningState[];
  telemetryPolicy: {
    metadataOnly: true;
    allowedFields: string[];
    disallowedContentClasses: string[];
    commercialMetricsMayIncludeAmounts: false;
    commercialMetricsMayIncludeUsageCounts: true;
  };
  runtimeBoundary: S221RuntimeBoundary;
  dataBoundary: S221DataBoundary;
};

export type S221PaidTrustPrivacyCostContract = {
  version: typeof S221_PAID_TRUST_VERSION;
  costGuardrailVersion: typeof S221_COST_GUARDRAIL_VERSION;
  upstreamCatalogVersion: typeof S219_LEARNER_CATALOG_VERSION;
  upstreamPriceVersion: typeof S219_PRICE_VERSION;
  upstreamLedgerContractVersion: typeof S219_LEDGER_CONTRACT_VERSION;
  upstreamEntitlementVersion: typeof S220_BILLING_ENTITLEMENT_VERSION;
  upstreamIdempotentUsageVersion: typeof S220_IDEMPOTENT_USAGE_VERSION;
  implementationMode: S221ImplementationMode;
  trustSurfaces: S221TrustSurface[];
  costGuardrails: S221CostGuardrailConfig;
  runtimeBoundary: S221RuntimeBoundary;
  dataBoundary: S221DataBoundary;
};

export type S221UsageCreditVisibility = {
  contractVersion: typeof S221_PAID_TRUST_VERSION;
  source:
    | "s219_catalog_contract"
    | "s220_entitlement_state";
  upstreamCatalogVersion: typeof S219_LEARNER_CATALOG_VERSION;
  upstreamEntitlementVersion: typeof S220_BILLING_ENTITLEMENT_VERSION;
  subscriptionHistoryVisible: true;
  packHistoryVisible: true;
  remainingUsageCreditVisible: true;
  enforcementActivated: false;
  billingProviderCalled: false;
  metadataOnly: true;
  containsRawContent: false;
  catalogEntries: Array<{
    catalogEntryId: S219CatalogEntryId;
    kind: string;
    saleStatus: string;
    rolloutState: string;
    finiteUsageGrantCount: number;
  }>;
  historyEntries: Array<{
    grantId: string;
    catalogEntryId: S219CatalogEntryId;
    grantType: string;
    grantStatus: string;
    effectiveFrom: string;
    expiresAt: string | null;
    unitBalances: Array<{
      unitType: S219UsageLedgerUnitType;
      unitsGranted: number;
      unitsReserved: number;
      unitsConsumed: number;
      unitsReleased: number;
      unitsReversed: number;
      unitsAvailable: number;
    }>;
  }>;
  reservations: Array<{
    reservationId: string;
    catalogEntryId: S219CatalogEntryId;
    unitType: S219UsageLedgerUnitType;
    usageReasonCode: string;
    unitsReserved: number;
    unitsConsumed: number;
    status: string;
    expiresAt: string;
    terminalReason: string | null;
  }>;
  remainingCredits: Array<{
    catalogEntryId: S219CatalogEntryId;
    unitType: S219UsageLedgerUnitType;
    unitsAvailable: number;
  }>;
};

export type S221CommercialTelemetryEventKind =
  | "cost_request_summary"
  | "commercial_visibility_view"
  | "usage_credit_visibility_view"
  | "cost_warning_state";

export type S221CommercialTelemetryInput = {
  eventId: string;
  eventKind: S221CommercialTelemetryEventKind;
  routeId: string;
  learnerIdHash: string;
  catalogEntryId?: S219CatalogEntryId | null;
  unitType?: S219UsageLedgerUnitType | null;
  unitsReserved?: number;
  unitsConsumed?: number;
  ocrPageCount?: number;
  modelInputTokenCount?: number;
  modelOutputTokenCount?: number;
  durationMs?: number;
  timeoutBudgetMs?: number;
  retryCount?: number;
  featureKillSwitchState?: S221WarningState;
  providerKillSwitchState?: S221WarningState;
  costWarningState?: S221WarningState;
  anomalyWarningState?: S221WarningState;
};

export type S221CommercialTelemetryEvent = Required<
  Pick<
    S221CommercialTelemetryInput,
    | "eventId"
    | "eventKind"
    | "routeId"
    | "learnerIdHash"
    | "ocrPageCount"
    | "modelInputTokenCount"
    | "modelOutputTokenCount"
    | "durationMs"
    | "timeoutBudgetMs"
    | "retryCount"
    | "featureKillSwitchState"
    | "providerKillSwitchState"
    | "costWarningState"
    | "anomalyWarningState"
  >
> & {
  contractVersion: typeof S221_PAID_TRUST_VERSION;
  costGuardrailVersion: typeof S221_COST_GUARDRAIL_VERSION;
  catalogEntryId: S219CatalogEntryId | null;
  unitType: S219UsageLedgerUnitType | null;
  unitsReserved: number;
  unitsConsumed: number;
  metadataOnly: true;
  containsRawContent: false;
  learnerContentIncluded: false;
  providerPayloadIncluded: false;
  paymentSecretIncluded: false;
};

export type S221ValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const RUNTIME_BOUNDARY: S221RuntimeBoundary = {
  checkoutAdded: false,
  paymentWebhookAdded: false,
  billingProviderCalled: false,
  productionBillingActivated: false,
  entitlementEnforcementActivated: false,
  productionPricingUiAdded: false,
  authChanged: false,
  workflowChanged: false,
  academyRouteAdded: false,
  instructorRouteAdded: false,
  providerRuntimeExpanded: false,
  ocrRuntimeExpanded: false,
  publicArchiveUiAdded: false,
  corpusExpansionAdded: false,
  supabaseMigrationAdded: false,
};

const DATA_BOUNDARY: S221DataBoundary = {
  metadataOnly: true,
  learnerMaterialIncluded: false,
  ocrMaterialIncluded: false,
  problemMaterialIncluded: false,
  generatedAnswerProseIncluded: false,
  sourceExcerptIncluded: false,
  providerPayloadIncluded: false,
  credentialIncluded: false,
  paymentSecretIncluded: false,
  billingSecretIncluded: false,
  assetBytesIncluded: false,
  containsRawContent: false,
};

const REQUIRED_TRUST_SURFACES = new Set<S221TrustSurfaceId>([
  "data_export",
  "account_data_deletion_request",
  "support_contact",
  "refund_cancel_policy",
  "subscription_pack_history",
  "remaining_usage_credit",
  "ai_official_source_labels",
]);

const REQUIRED_FEATURE_SWITCHES = new Set([
  "paid_checkout",
  "deep_review_generation",
  "answer_review_ai",
  "structured_ocr_ai",
]);

const REQUIRED_PROVIDER_SWITCHES = new Set([
  "gemini",
  "openai",
  "ocr_import",
]);

const FORBIDDEN_TELEMETRY_FIELD_PATTERN =
  /"(?:answerText|rawAnswerText|userAnswerText|ocrText|rawOcrText|problemText|questionText|referenceText|generatedAnswerProse|sourceExcerpt|providerPayload|paymentSecret|billingSecret|credential|pdfBytes|imageBytes)"\s*:/i;

const FORBIDDEN_AUTHORITY_COPY_PATTERNS = [
  /공식\s*채점/i,
  /공식\s*모범답안/i,
  /확정\s*점수/i,
  /합격\s*(가능성|확률|보장)/i,
  /AI\s*최종\s*판정/i,
  /정답\s*보장/i,
  /official\s+grading/i,
  /official\s+model[- ]?answer/i,
  /confirmed\s+score/i,
  /pass\s+probability/i,
  /pass\/fail\s+prediction/i,
  /pass\s+guarantee/i,
];

function runtimeBoundary(): S221RuntimeBoundary {
  return { ...RUNTIME_BOUNDARY };
}

function dataBoundary(): S221DataBoundary {
  return { ...DATA_BOUNDARY };
}

function trustSurface(input: Omit<S221TrustSurface, "contractVersion" | "implementationMode" | "owner" | "runtimeBoundary" | "dataBoundary">): S221TrustSurface {
  return {
    ...input,
    contractVersion: S221_PAID_TRUST_VERSION,
    implementationMode: "source_contract_only",
    owner: "learner_product",
    runtimeBoundary: runtimeBoundary(),
    dataBoundary: dataBoundary(),
  };
}

export const S221_TRUST_SURFACES: S221TrustSurface[] = [
  trustSurface({
    id: "data_export",
    requiredBeforePaidLaunch: true,
    learnerVisibleBeforePaidLaunch: true,
    requestChannel: "settings_and_support_request",
    sourceOfTruth: "data_boundary_policy",
    copyKo: "내 답안, OCR, 노트, 재작성 기록과 안전한 학습 신호를 내보내기 요청할 수 있습니다.",
    dataScope: {
      includesUserOwnedRawServiceRecords: true,
      includesDerivedLearningSignals: true,
      includesSubscriptionOrPackMetadata: false,
      excludesReferenceCorpus: true,
      excludesAggregateMetrics: true,
      excludesAcademyTenantData: true,
    },
  }),
  trustSurface({
    id: "account_data_deletion_request",
    requiredBeforePaidLaunch: true,
    learnerVisibleBeforePaidLaunch: true,
    requestChannel: "settings_and_support_request",
    sourceOfTruth: "data_boundary_policy",
    copyKo: "계정 및 데이터 삭제는 본인 확인과 보존 의무 확인 후 처리되는 요청으로 안내합니다.",
    dataScope: {
      includesUserOwnedRawServiceRecords: true,
      includesDerivedLearningSignals: true,
      includesSubscriptionOrPackMetadata: true,
      excludesReferenceCorpus: true,
      excludesAggregateMetrics: true,
      excludesAcademyTenantData: true,
    },
  }),
  trustSurface({
    id: "support_contact",
    requiredBeforePaidLaunch: true,
    learnerVisibleBeforePaidLaunch: true,
    requestChannel: "support_contact",
    sourceOfTruth: "support_policy_contract",
    copyKo: "지원 문의는 설정의 지원 채널에서 접수하며, 원문 자료는 사용자가 필요한 경우에만 첨부합니다.",
    dataScope: {
      includesUserOwnedRawServiceRecords: false,
      includesDerivedLearningSignals: true,
      includesSubscriptionOrPackMetadata: true,
      excludesReferenceCorpus: true,
      excludesAggregateMetrics: true,
      excludesAcademyTenantData: true,
    },
  }),
  trustSurface({
    id: "refund_cancel_policy",
    requiredBeforePaidLaunch: true,
    learnerVisibleBeforePaidLaunch: true,
    requestChannel: "settings_and_support_request",
    sourceOfTruth: "support_policy_contract",
    copyKo: "유료 결제는 아직 활성화하지 않으며, 향후 결제 전 취소와 환불 기준을 먼저 표시해야 합니다.",
    dataScope: {
      includesUserOwnedRawServiceRecords: false,
      includesDerivedLearningSignals: false,
      includesSubscriptionOrPackMetadata: true,
      excludesReferenceCorpus: true,
      excludesAggregateMetrics: true,
      excludesAcademyTenantData: true,
    },
  }),
  trustSurface({
    id: "subscription_pack_history",
    requiredBeforePaidLaunch: true,
    learnerVisibleBeforePaidLaunch: true,
    requestChannel: "usage_surface",
    sourceOfTruth: "s220_entitlement_state",
    copyKo: "구독과 팩 이력은 상품 ID, 상태, 남은 수량, 사용 사유 메타데이터로 표시합니다.",
    dataScope: {
      includesUserOwnedRawServiceRecords: false,
      includesDerivedLearningSignals: false,
      includesSubscriptionOrPackMetadata: true,
      excludesReferenceCorpus: true,
      excludesAggregateMetrics: true,
      excludesAcademyTenantData: true,
    },
  }),
  trustSurface({
    id: "remaining_usage_credit",
    requiredBeforePaidLaunch: true,
    learnerVisibleBeforePaidLaunch: true,
    requestChannel: "usage_surface",
    sourceOfTruth: "s220_entitlement_state",
    copyKo: "남은 무료 리뷰와 Deep Review Unit은 표시하되 실제 차감과 결제는 별도 런타임 게이트 후에만 켭니다.",
    dataScope: {
      includesUserOwnedRawServiceRecords: false,
      includesDerivedLearningSignals: false,
      includesSubscriptionOrPackMetadata: true,
      excludesReferenceCorpus: true,
      excludesAggregateMetrics: true,
      excludesAcademyTenantData: true,
    },
  }),
  trustSurface({
    id: "ai_official_source_labels",
    requiredBeforePaidLaunch: true,
    learnerVisibleBeforePaidLaunch: true,
    requestChannel: "result_trust_label",
    sourceOfTruth: "reference_source_status",
    copyKo: "AI와 OCR 결과는 학습 보조 초안이며, 검증 출처 상태와 불확실성을 함께 표시합니다.",
    dataScope: {
      includesUserOwnedRawServiceRecords: false,
      includesDerivedLearningSignals: true,
      includesSubscriptionOrPackMetadata: false,
      excludesReferenceCorpus: true,
      excludesAggregateMetrics: true,
      excludesAcademyTenantData: true,
    },
  }),
];

export const S221_COST_GUARDRAIL_CONFIG: S221CostGuardrailConfig = {
  version: S221_COST_GUARDRAIL_VERSION,
  implementationMode: "source_contract_only",
  budgets: {
    ocrPages: {
      unit: "pages",
      perRequestMax: 5,
      warningThreshold: 4,
      hardStopThreshold: 5,
    },
    modelInputTokens: {
      unit: "tokens",
      perRequestMax: 60000,
      warningThreshold: 48000,
      hardStopThreshold: 60000,
    },
    modelOutputTokens: {
      unit: "tokens",
      perRequestMax: 8000,
      warningThreshold: 6400,
      hardStopThreshold: 8000,
    },
    modelTotalTokens: {
      unit: "tokens",
      perRequestMax: 68000,
      warningThreshold: 54400,
      hardStopThreshold: 68000,
    },
    timeoutBudget: {
      unit: "milliseconds",
      perRequestMax: 45000,
      warningThreshold: 35000,
      hardStopThreshold: 45000,
    },
    retryBudget: {
      unit: "attempts",
      perRequestMax: 1,
      warningThreshold: 1,
      hardStopThreshold: 1,
    },
  },
  featureKillSwitches: [
    {
      id: "paid_checkout",
      kind: "feature",
      defaultState: "disabled_until_explicit_launch_gate",
      blocks: "payment_flow",
      runtimeWiredInThisPr: false,
    },
    {
      id: "deep_review_generation",
      kind: "feature",
      defaultState: "disabled_until_explicit_launch_gate",
      blocks: "high_cost_deep_review_work",
      runtimeWiredInThisPr: false,
    },
    {
      id: "answer_review_ai",
      kind: "feature",
      defaultState: "existing_runtime_unchanged",
      blocks: "answer_review_model_work",
      runtimeWiredInThisPr: false,
    },
    {
      id: "structured_ocr_ai",
      kind: "feature",
      defaultState: "existing_runtime_unchanged",
      blocks: "structured_ocr_model_work",
      runtimeWiredInThisPr: false,
    },
  ],
  providerKillSwitches: [
    {
      id: "gemini",
      kind: "provider",
      defaultState: "source_contract_only_not_wired",
      blocks: "gemini_model_requests",
      runtimeWiredInThisPr: false,
    },
    {
      id: "openai",
      kind: "provider",
      defaultState: "source_contract_only_not_wired",
      blocks: "openai_model_requests",
      runtimeWiredInThisPr: false,
    },
    {
      id: "ocr_import",
      kind: "provider",
      defaultState: "source_contract_only_not_wired",
      blocks: "ocr_import_requests",
      runtimeWiredInThisPr: false,
    },
  ],
  warningStates: [
    "normal",
    "approaching_budget",
    "blocked_by_guardrail",
    "feature_killed",
    "provider_killed",
    "anomaly_review_required",
  ],
  telemetryPolicy: {
    metadataOnly: true,
    allowedFields: [
      "eventId",
      "eventKind",
      "routeId",
      "learnerIdHash",
      "catalogEntryId",
      "unitType",
      "unitsReserved",
      "unitsConsumed",
      "ocrPageCount",
      "modelInputTokenCount",
      "modelOutputTokenCount",
      "durationMs",
      "timeoutBudgetMs",
      "retryCount",
      "featureKillSwitchState",
      "providerKillSwitchState",
      "costWarningState",
      "anomalyWarningState",
    ],
    disallowedContentClasses: [
      "raw learner answer text",
      "OCR text",
      "problem text",
      "generated answer prose",
      "official source excerpts",
      "PDF/HWP/image bytes",
      "provider payloads",
      "credentials",
      "payment secrets",
      "billing secrets",
    ],
    commercialMetricsMayIncludeAmounts: false,
    commercialMetricsMayIncludeUsageCounts: true,
  },
  runtimeBoundary: runtimeBoundary(),
  dataBoundary: dataBoundary(),
};

export const S221_PAID_TRUST_PRIVACY_COST_CONTRACT: S221PaidTrustPrivacyCostContract = sanitizeDerivedMetadata({
  version: S221_PAID_TRUST_VERSION,
  costGuardrailVersion: S221_COST_GUARDRAIL_VERSION,
  upstreamCatalogVersion: S219_LEARNER_CATALOG_VERSION,
  upstreamPriceVersion: S219_PRICE_VERSION,
  upstreamLedgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
  upstreamEntitlementVersion: S220_BILLING_ENTITLEMENT_VERSION,
  upstreamIdempotentUsageVersion: S220_IDEMPOTENT_USAGE_VERSION,
  implementationMode: "source_contract_only",
  trustSurfaces: S221_TRUST_SURFACES,
  costGuardrails: S221_COST_GUARDRAIL_CONFIG,
  runtimeBoundary: runtimeBoundary(),
  dataBoundary: dataBoundary(),
}) as S221PaidTrustPrivacyCostContract;

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isFinitePositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function boundaryHasOnlyFalseValues(boundary: S221RuntimeBoundary) {
  return Object.values(boundary).every((value) => value === false);
}

function dataBoundaryIsMetadataOnly(boundary: S221DataBoundary) {
  return (
    boundary.metadataOnly === true
    && boundary.learnerMaterialIncluded === false
    && boundary.ocrMaterialIncluded === false
    && boundary.problemMaterialIncluded === false
    && boundary.generatedAnswerProseIncluded === false
    && boundary.sourceExcerptIncluded === false
    && boundary.providerPayloadIncluded === false
    && boundary.credentialIncluded === false
    && boundary.paymentSecretIncluded === false
    && boundary.billingSecretIncluded === false
    && boundary.assetBytesIncluded === false
    && boundary.containsRawContent === false
  );
}

function validateBudget(label: string, limit: S221BudgetLimit, errors: string[]) {
  if (!isFinitePositiveInteger(limit.perRequestMax)) errors.push(`${label}.perRequestMax must be positive`);
  if (!isFiniteNonNegativeInteger(limit.warningThreshold)) errors.push(`${label}.warningThreshold must be non-negative`);
  if (!isFinitePositiveInteger(limit.hardStopThreshold)) errors.push(`${label}.hardStopThreshold must be positive`);
  if (limit.warningThreshold > limit.hardStopThreshold) errors.push(`${label}.warningThreshold cannot exceed hardStopThreshold`);
  if (limit.hardStopThreshold !== limit.perRequestMax) errors.push(`${label}.hardStopThreshold must equal perRequestMax`);
}

export function assertS221NoForbiddenAuthorityCopy(text: string): void {
  for (const pattern of FORBIDDEN_AUTHORITY_COPY_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`s221-forbidden-authority-copy:${pattern}`);
    }
  }
}

export function validateS221PaidTrustPrivacyCostContract(
  contract = S221_PAID_TRUST_PRIVACY_COST_CONTRACT,
): S221ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertNoRawUserDataInDerived(contract);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s221-data-boundary-error");
  }

  if (contract.version !== S221_PAID_TRUST_VERSION) errors.push("contract.version mismatch");
  if (contract.costGuardrailVersion !== S221_COST_GUARDRAIL_VERSION) errors.push("contract.costGuardrailVersion mismatch");
  if (contract.upstreamCatalogVersion !== S219_LEARNER_CATALOG_VERSION) errors.push("upstreamCatalogVersion mismatch");
  if (contract.upstreamEntitlementVersion !== S220_BILLING_ENTITLEMENT_VERSION) errors.push("upstreamEntitlementVersion mismatch");
  if (contract.implementationMode !== "source_contract_only") errors.push("S221 must remain source-contract-only");
  if (!boundaryHasOnlyFalseValues(contract.runtimeBoundary)) errors.push("contract.runtimeBoundary must remain false");
  if (!dataBoundaryIsMetadataOnly(contract.dataBoundary)) errors.push("contract.dataBoundary must remain metadata-only");

  const surfaceIds = contract.trustSurfaces.map((surface) => surface.id);
  for (const requiredId of REQUIRED_TRUST_SURFACES) {
    if (!surfaceIds.includes(requiredId)) errors.push(`missing trust surface ${requiredId}`);
  }
  if (new Set(surfaceIds).size !== surfaceIds.length) errors.push("duplicate trust surface id");

  for (const surface of contract.trustSurfaces) {
    if (surface.contractVersion !== S221_PAID_TRUST_VERSION) errors.push(`${surface.id}.contractVersion mismatch`);
    if (surface.implementationMode !== "source_contract_only") errors.push(`${surface.id}.implementationMode must remain source-only`);
    if (surface.requiredBeforePaidLaunch !== true) errors.push(`${surface.id}.requiredBeforePaidLaunch missing`);
    if (surface.learnerVisibleBeforePaidLaunch !== true) errors.push(`${surface.id}.learnerVisibleBeforePaidLaunch missing`);
    if (!surface.copyKo.trim()) errors.push(`${surface.id}.copyKo is required`);
    if (!boundaryHasOnlyFalseValues(surface.runtimeBoundary)) errors.push(`${surface.id}.runtimeBoundary must remain false`);
    if (!dataBoundaryIsMetadataOnly(surface.dataBoundary)) errors.push(`${surface.id}.dataBoundary must remain metadata-only`);
  }

  try {
    assertS221NoForbiddenAuthorityCopy(contract.trustSurfaces.map((surface) => surface.copyKo).join("\n"));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s221-forbidden-copy");
  }

  const { costGuardrails } = contract;
  if (costGuardrails.version !== S221_COST_GUARDRAIL_VERSION) errors.push("costGuardrails.version mismatch");
  if (costGuardrails.implementationMode !== "source_contract_only") errors.push("costGuardrails must remain source-only");
  if (!boundaryHasOnlyFalseValues(costGuardrails.runtimeBoundary)) errors.push("costGuardrails.runtimeBoundary must remain false");
  if (!dataBoundaryIsMetadataOnly(costGuardrails.dataBoundary)) errors.push("costGuardrails.dataBoundary must remain metadata-only");
  for (const [label, limit] of Object.entries(costGuardrails.budgets)) validateBudget(label, limit, errors);

  const featureSwitchIds = new Set(costGuardrails.featureKillSwitches.map((switchSpec) => switchSpec.id));
  const providerSwitchIds = new Set(costGuardrails.providerKillSwitches.map((switchSpec) => switchSpec.id));
  for (const id of REQUIRED_FEATURE_SWITCHES) if (!featureSwitchIds.has(id)) errors.push(`missing feature kill switch ${id}`);
  for (const id of REQUIRED_PROVIDER_SWITCHES) if (!providerSwitchIds.has(id)) errors.push(`missing provider kill switch ${id}`);
  for (const switchSpec of [...costGuardrails.featureKillSwitches, ...costGuardrails.providerKillSwitches]) {
    if (switchSpec.runtimeWiredInThisPr !== false) errors.push(`${switchSpec.id}.runtimeWiredInThisPr must be false`);
  }
  for (const state of ["normal", "approaching_budget", "blocked_by_guardrail", "feature_killed", "provider_killed", "anomaly_review_required"] as const) {
    if (!costGuardrails.warningStates.includes(state)) errors.push(`missing warning state ${state}`);
  }
  if (costGuardrails.telemetryPolicy.metadataOnly !== true) errors.push("telemetryPolicy.metadataOnly must be true");
  if (costGuardrails.telemetryPolicy.commercialMetricsMayIncludeAmounts !== false) {
    errors.push("commercial metrics must not include amount data in S221");
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function assertS221TelemetryMetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  const serialized = JSON.stringify(value);
  if (FORBIDDEN_TELEMETRY_FIELD_PATTERN.test(serialized)) {
    throw new Error("s221-telemetry-forbidden-content-field");
  }
  if (/"(?:officialGrading|officialModelAnswer|confirmedScore|passProbability|passFailPrediction|passGuarantee)"\s*:/i.test(serialized)) {
    throw new Error("s221-telemetry-forbidden-authority-field");
  }
}

export function buildS221CommercialCostTelemetryEvent(
  input: S221CommercialTelemetryInput & Record<string, unknown>,
): S221CommercialTelemetryEvent {
  assertS221TelemetryMetadataOnly(input);
  const event = sanitizeDerivedMetadata({
    contractVersion: S221_PAID_TRUST_VERSION,
    costGuardrailVersion: S221_COST_GUARDRAIL_VERSION,
    eventId: input.eventId,
    eventKind: input.eventKind,
    routeId: input.routeId,
    learnerIdHash: input.learnerIdHash,
    catalogEntryId: input.catalogEntryId ?? null,
    unitType: input.unitType ?? null,
    unitsReserved: input.unitsReserved ?? 0,
    unitsConsumed: input.unitsConsumed ?? 0,
    ocrPageCount: input.ocrPageCount ?? 0,
    modelInputTokenCount: input.modelInputTokenCount ?? 0,
    modelOutputTokenCount: input.modelOutputTokenCount ?? 0,
    durationMs: input.durationMs ?? 0,
    timeoutBudgetMs: input.timeoutBudgetMs ?? S221_COST_GUARDRAIL_CONFIG.budgets.timeoutBudget.perRequestMax,
    retryCount: input.retryCount ?? 0,
    featureKillSwitchState: input.featureKillSwitchState ?? "normal",
    providerKillSwitchState: input.providerKillSwitchState ?? "normal",
    costWarningState: input.costWarningState ?? "normal",
    anomalyWarningState: input.anomalyWarningState ?? "normal",
    metadataOnly: true,
    containsRawContent: false,
    learnerContentIncluded: false,
    providerPayloadIncluded: false,
    paymentSecretIncluded: false,
  }) as S221CommercialTelemetryEvent;
  assertS221TelemetryMetadataOnly(event);
  return event;
}

export function buildS221UsageCreditVisibility(state?: S220EntitlementState): S221UsageCreditVisibility {
  if (state) {
    const validation = validateS220EntitlementState(state);
    if (!validation.valid) {
      throw new Error(`s221-invalid-upstream-entitlement-state:${validation.errors.join("; ")}`);
    }
  }

  const catalogEntries = S219_LEARNER_CATALOG.entries
    .filter((entry) => entry.kind === "learner_plan" || entry.kind === "deep_review_sku")
    .map((entry) => ({
      catalogEntryId: entry.id,
      kind: entry.kind,
      saleStatus: entry.saleStatus,
      rolloutState: entry.rolloutState,
      finiteUsageGrantCount: entry.usageGrants.filter((grant) => grant.quantity > 0 && Number.isFinite(grant.quantity)).length,
    }));

  const historyEntries = (state?.grants ?? []).map((grant) => ({
    grantId: grant.grantId,
    catalogEntryId: grant.catalogEntryId,
    grantType: grant.grantType,
    grantStatus: grant.grantStatus,
    effectiveFrom: grant.effectiveFrom,
    expiresAt: grant.expiresAt,
    unitBalances: grant.unitBalances.map((balance) => ({
      unitType: balance.unitType,
      unitsGranted: balance.unitsGranted,
      unitsReserved: balance.unitsReserved,
      unitsConsumed: balance.unitsConsumed,
      unitsReleased: balance.unitsReleased,
      unitsReversed: balance.unitsReversed,
      unitsAvailable: balance.unitsAvailable,
    })),
  }));

  const reservations = (state?.reservations ?? []).map((reservation) => ({
    reservationId: reservation.reservationId,
    catalogEntryId: reservation.catalogEntryId,
    unitType: reservation.unitType,
    usageReasonCode: reservation.usageReasonCode,
    unitsReserved: reservation.unitsReserved,
    unitsConsumed: reservation.unitsConsumed,
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    terminalReason: reservation.commitReason ?? reservation.releaseReason,
  }));

  const remainingCredits = historyEntries.flatMap((entry) =>
    entry.unitBalances
      .filter((balance) => balance.unitsAvailable > 0)
      .map((balance) => ({
        catalogEntryId: entry.catalogEntryId,
        unitType: balance.unitType,
        unitsAvailable: balance.unitsAvailable,
      })),
  );

  const visibility = sanitizeDerivedMetadata({
    contractVersion: S221_PAID_TRUST_VERSION,
    source: state ? "s220_entitlement_state" : "s219_catalog_contract",
    upstreamCatalogVersion: S219_LEARNER_CATALOG_VERSION,
    upstreamEntitlementVersion: S220_BILLING_ENTITLEMENT_VERSION,
    subscriptionHistoryVisible: true,
    packHistoryVisible: true,
    remainingUsageCreditVisible: true,
    enforcementActivated: false,
    billingProviderCalled: false,
    metadataOnly: true,
    containsRawContent: false,
    catalogEntries,
    historyEntries,
    reservations,
    remainingCredits,
  }) as S221UsageCreditVisibility;

  assertNoRawUserDataInDerived(visibility);
  return visibility;
}

export function buildS221ReadinessReport(contract = S221_PAID_TRUST_PRIVACY_COST_CONTRACT) {
  const validation = validateS221PaidTrustPrivacyCostContract(contract);
  const visibility = buildS221UsageCreditVisibility();
  return sanitizeDerivedMetadata({
    version: S221_PAID_TRUST_VERSION,
    costGuardrailVersion: S221_COST_GUARDRAIL_VERSION,
    valid: validation.valid,
    trustSurfaceCount: contract.trustSurfaces.length,
    trustSurfaceIds: contract.trustSurfaces.map((surface) => surface.id),
    costBudgetKeys: Object.keys(contract.costGuardrails.budgets),
    featureKillSwitchCount: contract.costGuardrails.featureKillSwitches.length,
    providerKillSwitchCount: contract.costGuardrails.providerKillSwitches.length,
    warningStates: contract.costGuardrails.warningStates,
    remainingUsageCreditVisible: visibility.remainingUsageCreditVisible,
    subscriptionHistoryVisible: visibility.subscriptionHistoryVisible,
    packHistoryVisible: visibility.packHistoryVisible,
    implementationMode: contract.implementationMode,
    checkoutAdded: false,
    paymentWebhookAdded: false,
    billingProviderCalled: false,
    productionBillingActivated: false,
    entitlementEnforcementActivated: false,
    productionPricingUiAdded: false,
    authChanged: false,
    workflowChanged: false,
    academyRouteAdded: false,
    instructorRouteAdded: false,
    providerRuntimeExpanded: false,
    ocrRuntimeExpanded: false,
    metadataOnly: true,
    containsRawContent: false,
  });
}

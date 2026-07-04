import { assertNoRawUserDataInDerived, sanitizeDerivedMetadata } from "./data-boundary";

export const S219_LEARNER_CATALOG_VERSION = "s219.dabangil_learner_catalog.v1" as const;
export const S219_PRICE_VERSION = "s200r.price_hypothesis.2026-06-25" as const;
export const S219_LEDGER_CONTRACT_VERSION = "s219.future_usage_ledger.v1" as const;

export type S219LearnerPlanId =
  | "free"
  | "second_os_basic"
  | "second_os_pro"
  | "second_control_premium";

export type S219DeepReviewSkuId =
  | "deep_review_5"
  | "deep_review_15"
  | "deep_review_40";

export type S219LaterDisabledSkuId =
  | "managed_cohort"
  | "season_pass";

export type S219CatalogEntryId =
  | S219LearnerPlanId
  | S219DeepReviewSkuId
  | S219LaterDisabledSkuId;

export type S219FeatureKey =
  | "learner.second_round_only"
  | "learner.full_value_review.lifetime_one"
  | "learner.evidence_review"
  | "learner.one_biggest_gap"
  | "learner.one_next_action"
  | "learner.rewrite_or_recalculate"
  | "learner.error_notebook"
  | "learner.core_concept_tracking"
  | "learner.review_queue"
  | "learner.today_plan.max_three"
  | "learner.giii_practical_routine"
  | "learner.weekly_weakness_report"
  | "learner.premium_control_report"
  | "learner.deep_review_unit_eligible"
  | "ledger.deep_review_unit"
  | "ledger.reserve_before_expensive_work"
  | "ledger.commit_after_usable_result"
  | "ledger.failed_generation_no_consume";

export type S219UsageLedgerUnitType =
  | "full_value_review_experience"
  | "deep_review_unit";

export type S219CatalogEntryKind =
  | "learner_plan"
  | "deep_review_sku"
  | "later_disabled_sku";

export type S219SaleStatus =
  | "free_available"
  | "paid_hypothesis_not_for_sale"
  | "disabled_later_only";

export type S219RolloutState =
  | "source_contract_only"
  | "future_paid_beta_candidate"
  | "disabled_later_only";

export type S219PricingInterval =
  | "none"
  | "month"
  | "one_off"
  | "eight_week_cohort"
  | "season";

export type S219UsageGrantKind =
  | "lifetime_included"
  | "one_off_purchase"
  | "feature_access_marker";

export type S219FailClosedReason =
  | "unknown_catalog_entry"
  | "ambiguous_catalog_entry"
  | "disabled_catalog_entry"
  | "catalog_entry_expired"
  | "catalog_entry_not_effective"
  | "catalog_entry_not_for_sale"
  | "unlimited_second_exam_precision_review_forbidden"
  | "ambiguous_usage_grant"
  | "unknown_usage_ledger_unit"
  | "invalid_usage_quantity"
  | "insufficient_usage_grant"
  | "learner_instructor_boundary_violation"
  | "academy_tenant_boundary_violation"
  | "ledger_reservation_expired"
  | "ledger_entry_not_reserved"
  | "runtime_boundary_violation"
  | "data_boundary_violation";

export type S219PricingMetadata = {
  priceVersion: typeof S219_PRICE_VERSION;
  currency: "KRW";
  interval: S219PricingInterval;
  amountMinKrw: number;
  amountMaxKrw: number;
  hypothesis: true;
  configuredForBilling: false;
  providerPriceRef: null;
};

export type S219UsageGrant = {
  grantId: string;
  unitType: S219UsageLedgerUnitType;
  grantKind: S219UsageGrantKind;
  quantity: number;
  quantityPeriod: "lifetime" | "one_off" | "none";
  grantScope: "learner_second_round_only";
  ledgerRequiredBeforeConsumption: boolean;
  reservationRequiredBeforeExpensiveWork: boolean;
  commitOnlyAfterUsableResult: boolean;
  failedGenerationConsumesUnits: false;
  unlimitedSecondExamPrecisionReview: false;
  activeForEntitlementEnforcement: false;
};

export type S219CatalogEntry = {
  id: S219CatalogEntryId;
  kind: S219CatalogEntryKind;
  catalogVersion: typeof S219_LEARNER_CATALOG_VERSION;
  price: S219PricingMetadata;
  featureKeys: S219FeatureKey[];
  usageGrants: S219UsageGrant[];
  saleStatus: S219SaleStatus;
  rolloutState: S219RolloutState;
  effectiveFrom: string;
  effectiveUntil: string | null;
  learnerScope: {
    examMode: "second";
    subjectCoverage: ["practice", "theory", "law"];
    firstRoundFrozen: true;
    unsupportedExamTracksExposed: false;
  };
  guardrails: {
    noUnlimitedSecondExamPrecisionReview: true;
    noOfficialAuthorityClaims: true;
    noB2CHumanExpertReview: true;
    noPassProbability: true;
    noPassGuarantee: true;
  };
  runtimeBoundary: {
    billingProviderCallsAdded: false;
    paymentFlowAdded: false;
    entitlementEnforcementActivated: false;
    productionPricingUiAdded: false;
    learnerUiAdded: false;
    publicArchiveUiAdded: false;
    providerRuntimeCalled: false;
    ocrRuntimeCalled: false;
    productionRouteAdded: false;
    authChanged: false;
    supabaseMigrationAdded: false;
    workflowChanged: false;
  };
  learnerInstructorBoundary: {
    learnerCatalogOnly: true;
    instructorRouteAdded: false;
    academyTenantScoped: false;
    academyTenantDataAccessed: false;
    learnerInstructorDataMerged: false;
  };
  dataBoundary: {
    metadataOnly: true;
    fixtureSafe: true;
    learnerMaterialIncluded: false;
    ocrMaterialIncluded: false;
    officialQuestionMaterialIncluded: false;
    officialAnswerMaterialIncluded: false;
    generatedAnswerProseIncluded: false;
    sourceExcerptIncluded: false;
    providerPayloadIncluded: false;
    billingRecordIncluded: false;
    credentialIncluded: false;
    assetBytesIncluded: false;
    containsRawContent: false;
  };
};

export type S219LearnerCatalog = {
  version: typeof S219_LEARNER_CATALOG_VERSION;
  priceVersion: typeof S219_PRICE_VERSION;
  ledgerContractVersion: typeof S219_LEDGER_CONTRACT_VERSION;
  generatedFrom: "S200R_final_product_spec";
  entries: S219CatalogEntry[];
  guardrails: {
    noUnlimitedSecondExamPrecisionReview: true;
    sourceLevelOnly: true;
    billingProviderCallsAdded: false;
    paymentFlowAdded: false;
    entitlementEnforcementActivated: false;
    productionPricingUiAdded: false;
    learnerUiAdded: false;
  };
};

export type S219CatalogValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type S219CatalogResolution =
  | {
      ok: true;
      entry: S219CatalogEntry;
    }
  | {
      ok: false;
      reason: S219FailClosedReason;
      entryId: string;
    };

export type S219UsageReservationInput = {
  reservationId: string;
  catalogEntryId: S219CatalogEntryId | string;
  learnerId: string;
  actorRole: "learner";
  ownerBinding: "authenticated_request_user";
  unitType: S219UsageLedgerUnitType | string;
  quantity: number;
  reservedAt: string;
  expiresAt: string;
  reasonCode: "free_full_value_review" | "deep_review_unit";
  catalog?: S219LearnerCatalog;
};

export type S219UsageLedgerEntry = {
  ledgerContractVersion: typeof S219_LEDGER_CONTRACT_VERSION;
  ledgerMode: "future_source_contract_only";
  reservationId: string;
  catalogEntryId: S219CatalogEntryId;
  learnerId: string;
  ownerBinding: "authenticated_request_user";
  actorRole: "learner";
  unitType: S219UsageLedgerUnitType;
  unitsReserved: number;
  unitsConsumed: number;
  status:
    | "reserved_pending_commit"
    | "committed"
    | "released_without_consumption";
  reservedAt: string;
  expiresAt: string;
  committedAt: string | null;
  commitReason:
    | "usable_result_available"
    | "failed_generation_no_consume"
    | "abandoned_no_consume"
    | null;
  failedGenerationConsumesUnits: false;
  reservationRequiredBeforeExpensiveWork: true;
  commitOnlyAfterUsableResult: true;
  providerRuntimeCalled: false;
  ocrRuntimeCalled: false;
  billingProviderCalled: false;
  entitlementEnforcementActivated: false;
  academyTenantDataAccessed: false;
  containsRawContent: false;
};

export type S219UsageCommitInput = {
  committedAt: string;
  resultStatus: "usable_result" | "failed_generation" | "abandoned";
};

const SUBJECT_COVERAGE = ["practice", "theory", "law"] as const;

const COMMON_LOOP_FEATURES: S219FeatureKey[] = [
  "learner.second_round_only",
  "learner.evidence_review",
  "learner.one_biggest_gap",
  "learner.one_next_action",
  "learner.rewrite_or_recalculate",
  "learner.error_notebook",
  "learner.core_concept_tracking",
  "learner.review_queue",
  "learner.today_plan.max_three",
  "learner.giii_practical_routine",
];

function price(
  interval: S219PricingInterval,
  amountMinKrw: number,
  amountMaxKrw = amountMinKrw,
): S219PricingMetadata {
  return {
    priceVersion: S219_PRICE_VERSION,
    currency: "KRW",
    interval,
    amountMinKrw,
    amountMaxKrw,
    hypothesis: true,
    configuredForBilling: false,
    providerPriceRef: null,
  };
}

function grant(
  grantId: string,
  unitType: S219UsageLedgerUnitType,
  grantKind: S219UsageGrantKind,
  quantity: number,
  quantityPeriod: S219UsageGrant["quantityPeriod"],
  ledgerRequiredBeforeConsumption: boolean,
): S219UsageGrant {
  return {
    grantId,
    unitType,
    grantKind,
    quantity,
    quantityPeriod,
    grantScope: "learner_second_round_only",
    ledgerRequiredBeforeConsumption,
    reservationRequiredBeforeExpensiveWork: ledgerRequiredBeforeConsumption,
    commitOnlyAfterUsableResult: ledgerRequiredBeforeConsumption,
    failedGenerationConsumesUnits: false,
    unlimitedSecondExamPrecisionReview: false,
    activeForEntitlementEnforcement: false,
  };
}

function baseEntry(
  entry: Pick<S219CatalogEntry, "id" | "kind" | "price" | "featureKeys" | "usageGrants" | "saleStatus" | "rolloutState">,
): S219CatalogEntry {
  return {
    ...entry,
    catalogVersion: S219_LEARNER_CATALOG_VERSION,
    effectiveFrom: "2026-06-25",
    effectiveUntil: null,
    learnerScope: {
      examMode: "second",
      subjectCoverage: [...SUBJECT_COVERAGE],
      firstRoundFrozen: true,
      unsupportedExamTracksExposed: false,
    },
    guardrails: {
      noUnlimitedSecondExamPrecisionReview: true,
      noOfficialAuthorityClaims: true,
      noB2CHumanExpertReview: true,
      noPassProbability: true,
      noPassGuarantee: true,
    },
    runtimeBoundary: {
      billingProviderCallsAdded: false,
      paymentFlowAdded: false,
      entitlementEnforcementActivated: false,
      productionPricingUiAdded: false,
      learnerUiAdded: false,
      publicArchiveUiAdded: false,
      providerRuntimeCalled: false,
      ocrRuntimeCalled: false,
      productionRouteAdded: false,
      authChanged: false,
      supabaseMigrationAdded: false,
      workflowChanged: false,
    },
    learnerInstructorBoundary: {
      learnerCatalogOnly: true,
      instructorRouteAdded: false,
      academyTenantScoped: false,
      academyTenantDataAccessed: false,
      learnerInstructorDataMerged: false,
    },
    dataBoundary: {
      metadataOnly: true,
      fixtureSafe: true,
      learnerMaterialIncluded: false,
      ocrMaterialIncluded: false,
      officialQuestionMaterialIncluded: false,
      officialAnswerMaterialIncluded: false,
      generatedAnswerProseIncluded: false,
      sourceExcerptIncluded: false,
      providerPayloadIncluded: false,
      billingRecordIncluded: false,
      credentialIncluded: false,
      assetBytesIncluded: false,
      containsRawContent: false,
    },
  };
}

export const S219_LEARNER_CATALOG: S219LearnerCatalog = sanitizeDerivedMetadata({
  version: S219_LEARNER_CATALOG_VERSION,
  priceVersion: S219_PRICE_VERSION,
  ledgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
  generatedFrom: "S200R_final_product_spec",
  entries: [
    baseEntry({
      id: "free",
      kind: "learner_plan",
      price: price("none", 0),
      featureKeys: [
        "learner.second_round_only",
        "learner.full_value_review.lifetime_one",
        "learner.evidence_review",
        "learner.one_biggest_gap",
        "learner.one_next_action",
        "learner.rewrite_or_recalculate",
        "learner.error_notebook",
        "learner.core_concept_tracking",
        "learner.today_plan.max_three",
        "learner.giii_practical_routine",
      ],
      usageGrants: [
        grant("free_lifetime_full_value_review", "full_value_review_experience", "lifetime_included", 1, "lifetime", true),
      ],
      saleStatus: "free_available",
      rolloutState: "source_contract_only",
    }),
    baseEntry({
      id: "second_os_basic",
      kind: "learner_plan",
      price: price("month", 59000, 69000),
      featureKeys: COMMON_LOOP_FEATURES,
      usageGrants: [
        grant("basic_operating_loop_access_marker", "full_value_review_experience", "feature_access_marker", 0, "none", false),
      ],
      saleStatus: "paid_hypothesis_not_for_sale",
      rolloutState: "future_paid_beta_candidate",
    }),
    baseEntry({
      id: "second_os_pro",
      kind: "learner_plan",
      price: price("month", 119000, 149000),
      featureKeys: [
        ...COMMON_LOOP_FEATURES,
        "learner.weekly_weakness_report",
      ],
      usageGrants: [
        grant("pro_operating_loop_access_marker", "full_value_review_experience", "feature_access_marker", 0, "none", false),
      ],
      saleStatus: "paid_hypothesis_not_for_sale",
      rolloutState: "future_paid_beta_candidate",
    }),
    baseEntry({
      id: "second_control_premium",
      kind: "learner_plan",
      price: price("month", 249000, 299000),
      featureKeys: [
        ...COMMON_LOOP_FEATURES,
        "learner.weekly_weakness_report",
        "learner.premium_control_report",
        "learner.deep_review_unit_eligible",
      ],
      usageGrants: [
        grant("premium_deep_review_eligibility_marker", "deep_review_unit", "feature_access_marker", 0, "none", true),
      ],
      saleStatus: "paid_hypothesis_not_for_sale",
      rolloutState: "future_paid_beta_candidate",
    }),
    baseEntry({
      id: "deep_review_5",
      kind: "deep_review_sku",
      price: price("one_off", 49000),
      featureKeys: [
        "learner.second_round_only",
        "ledger.deep_review_unit",
        "ledger.reserve_before_expensive_work",
        "ledger.commit_after_usable_result",
        "ledger.failed_generation_no_consume",
      ],
      usageGrants: [
        grant("deep_review_5_units", "deep_review_unit", "one_off_purchase", 5, "one_off", true),
      ],
      saleStatus: "paid_hypothesis_not_for_sale",
      rolloutState: "future_paid_beta_candidate",
    }),
    baseEntry({
      id: "deep_review_15",
      kind: "deep_review_sku",
      price: price("one_off", 129000),
      featureKeys: [
        "learner.second_round_only",
        "ledger.deep_review_unit",
        "ledger.reserve_before_expensive_work",
        "ledger.commit_after_usable_result",
        "ledger.failed_generation_no_consume",
      ],
      usageGrants: [
        grant("deep_review_15_units", "deep_review_unit", "one_off_purchase", 15, "one_off", true),
      ],
      saleStatus: "paid_hypothesis_not_for_sale",
      rolloutState: "future_paid_beta_candidate",
    }),
    baseEntry({
      id: "deep_review_40",
      kind: "deep_review_sku",
      price: price("one_off", 299000),
      featureKeys: [
        "learner.second_round_only",
        "ledger.deep_review_unit",
        "ledger.reserve_before_expensive_work",
        "ledger.commit_after_usable_result",
        "ledger.failed_generation_no_consume",
      ],
      usageGrants: [
        grant("deep_review_40_units", "deep_review_unit", "one_off_purchase", 40, "one_off", true),
      ],
      saleStatus: "paid_hypothesis_not_for_sale",
      rolloutState: "future_paid_beta_candidate",
    }),
    baseEntry({
      id: "managed_cohort",
      kind: "later_disabled_sku",
      price: price("eight_week_cohort", 690000, 990000),
      featureKeys: ["learner.second_round_only"],
      usageGrants: [],
      saleStatus: "disabled_later_only",
      rolloutState: "disabled_later_only",
    }),
    baseEntry({
      id: "season_pass",
      kind: "later_disabled_sku",
      price: price("season", 0),
      featureKeys: ["learner.second_round_only"],
      usageGrants: [],
      saleStatus: "disabled_later_only",
      rolloutState: "disabled_later_only",
    }),
  ],
  guardrails: {
    noUnlimitedSecondExamPrecisionReview: true,
    sourceLevelOnly: true,
    billingProviderCallsAdded: false,
    paymentFlowAdded: false,
    entitlementEnforcementActivated: false,
    productionPricingUiAdded: false,
    learnerUiAdded: false,
  },
}) as S219LearnerCatalog;

const CATALOG_IDS = new Set<S219CatalogEntryId>([
  "free",
  "second_os_basic",
  "second_os_pro",
  "second_control_premium",
  "deep_review_5",
  "deep_review_15",
  "deep_review_40",
  "managed_cohort",
  "season_pass",
]);

const UNIT_TYPES = new Set<S219UsageLedgerUnitType>([
  "full_value_review_experience",
  "deep_review_unit",
]);

const SALE_STATUSES = new Set<S219SaleStatus>([
  "free_available",
  "paid_hypothesis_not_for_sale",
  "disabled_later_only",
]);

const ROLLOUT_STATES = new Set<S219RolloutState>([
  "source_contract_only",
  "future_paid_beta_candidate",
  "disabled_later_only",
]);

function unique<T>(values: Iterable<T>): T[] {
  return [...new Set(values)];
}

function isFiniteNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isFinitePositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isIsoBeforeOrEqual(left: string, right: string) {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  return Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime <= rightTime;
}

function hasUnlimitedGrant(entry: S219CatalogEntry) {
  return entry.usageGrants.some((usageGrant) => (
    usageGrant.unlimitedSecondExamPrecisionReview !== false
    || !Number.isFinite(usageGrant.quantity)
    || usageGrant.quantity > 100000
  ));
}

function entryEffectiveReason(entry: S219CatalogEntry, asOfDate: string): S219FailClosedReason | null {
  if (!isIsoBeforeOrEqual(entry.effectiveFrom, asOfDate)) return "catalog_entry_not_effective";
  if (entry.effectiveUntil && isIsoBeforeOrEqual(entry.effectiveUntil, asOfDate)) return "catalog_entry_expired";
  return null;
}

function validateEntry(entry: S219CatalogEntry, index: number): string[] {
  const errors: string[] = [];
  if (!CATALOG_IDS.has(entry.id)) errors.push(`entries[${index}].id is not an allowed S219 id`);
  if (entry.catalogVersion !== S219_LEARNER_CATALOG_VERSION) errors.push(`${entry.id}.catalogVersion mismatch`);
  if (entry.price.priceVersion !== S219_PRICE_VERSION) errors.push(`${entry.id}.priceVersion mismatch`);
  if (entry.price.currency !== "KRW") errors.push(`${entry.id}.price.currency must be KRW`);
  if (entry.price.configuredForBilling !== false || entry.price.providerPriceRef !== null) {
    errors.push(`${entry.id}.price must remain provider-unconfigured`);
  }
  if (!SALE_STATUSES.has(entry.saleStatus)) errors.push(`${entry.id}.saleStatus is invalid`);
  if (!ROLLOUT_STATES.has(entry.rolloutState)) errors.push(`${entry.id}.rolloutState is invalid`);
  if (entry.featureKeys.length === 0) errors.push(`${entry.id}.featureKeys must not be empty`);
  if (entry.featureKeys.some((key) => !key.startsWith("learner.") && !key.startsWith("ledger."))) {
    errors.push(`${entry.id}.featureKeys must stay learner or ledger scoped`);
  }
  if (hasUnlimitedGrant(entry)) errors.push(`${entry.id} has an unlimited or non-finite usage grant`);
  for (const usageGrant of entry.usageGrants) {
    if (!usageGrant.grantId) errors.push(`${entry.id}.usageGrants contains a missing grantId`);
    if (!UNIT_TYPES.has(usageGrant.unitType)) errors.push(`${entry.id}.${usageGrant.grantId}.unitType is unknown`);
    if (!isFiniteNonNegativeInteger(usageGrant.quantity)) errors.push(`${entry.id}.${usageGrant.grantId}.quantity must be finite`);
    if (usageGrant.grantKind !== "feature_access_marker" && usageGrant.quantity <= 0) {
      errors.push(`${entry.id}.${usageGrant.grantId}.quantity must be positive`);
    }
    if (usageGrant.failedGenerationConsumesUnits !== false) errors.push(`${entry.id}.${usageGrant.grantId} must not consume failed generation`);
    if (usageGrant.activeForEntitlementEnforcement !== false) errors.push(`${entry.id}.${usageGrant.grantId} must not activate entitlement enforcement`);
  }
  if (entry.learnerScope.examMode !== "second") errors.push(`${entry.id}.learnerScope.examMode must be second`);
  if (entry.learnerScope.unsupportedExamTracksExposed !== false) errors.push(`${entry.id} must not expose unsupported exam tracks`);
  if (entry.guardrails.noUnlimitedSecondExamPrecisionReview !== true) errors.push(`${entry.id} must forbid unlimited precision review`);
  if (Object.values(entry.runtimeBoundary).some((value) => value !== false)) errors.push(`${entry.id}.runtimeBoundary must remain false`);
  if (entry.learnerInstructorBoundary.learnerCatalogOnly !== true) errors.push(`${entry.id} must remain learner catalog only`);
  if (entry.learnerInstructorBoundary.instructorRouteAdded !== false) errors.push(`${entry.id} must not add instructor routes`);
  if (entry.learnerInstructorBoundary.academyTenantDataAccessed !== false) errors.push(`${entry.id} must not access academy tenant data`);
  if (entry.learnerInstructorBoundary.learnerInstructorDataMerged !== false) errors.push(`${entry.id} must not merge learner and instructor data`);
  if (Object.values(entry.dataBoundary).some((value) => value !== true && value !== false)) errors.push(`${entry.id}.dataBoundary must be boolean-only`);
  if (
    entry.dataBoundary.metadataOnly !== true
    || entry.dataBoundary.learnerMaterialIncluded !== false
    || entry.dataBoundary.ocrMaterialIncluded !== false
    || entry.dataBoundary.officialQuestionMaterialIncluded !== false
    || entry.dataBoundary.officialAnswerMaterialIncluded !== false
    || entry.dataBoundary.generatedAnswerProseIncluded !== false
    || entry.dataBoundary.sourceExcerptIncluded !== false
    || entry.dataBoundary.providerPayloadIncluded !== false
    || entry.dataBoundary.billingRecordIncluded !== false
    || entry.dataBoundary.credentialIncluded !== false
    || entry.dataBoundary.assetBytesIncluded !== false
    || entry.dataBoundary.containsRawContent !== false
  ) {
    errors.push(`${entry.id}.dataBoundary violates metadata-only policy`);
  }
  return errors;
}

export function validateS219LearnerCatalog(catalog = S219_LEARNER_CATALOG): S219CatalogValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertNoRawUserDataInDerived(catalog);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s219-data-boundary-error");
  }

  if (catalog.version !== S219_LEARNER_CATALOG_VERSION) errors.push("catalog.version mismatch");
  if (catalog.priceVersion !== S219_PRICE_VERSION) errors.push("catalog.priceVersion mismatch");
  if (catalog.ledgerContractVersion !== S219_LEDGER_CONTRACT_VERSION) errors.push("catalog.ledgerContractVersion mismatch");
  if (catalog.guardrails.sourceLevelOnly !== true) errors.push("catalog must remain source-level only");
  if (catalog.guardrails.billingProviderCallsAdded !== false) errors.push("catalog must not add billing provider calls");
  if (catalog.guardrails.paymentFlowAdded !== false) errors.push("catalog must not add payment flows");
  if (catalog.guardrails.entitlementEnforcementActivated !== false) errors.push("catalog must not activate entitlement enforcement");
  if (catalog.guardrails.productionPricingUiAdded !== false) errors.push("catalog must not add production pricing UI");
  if (catalog.guardrails.learnerUiAdded !== false) errors.push("catalog must not add learner UI");

  const ids = catalog.entries.map((entry) => entry.id);
  const duplicateIds = unique(ids.filter((id, index) => ids.indexOf(id) !== index));
  if (duplicateIds.length > 0) errors.push(`ambiguous catalog entries: ${duplicateIds.join(", ")}`);

  for (const expectedId of CATALOG_IDS) {
    if (!ids.includes(expectedId)) errors.push(`missing catalog entry ${expectedId}`);
  }

  catalog.entries.forEach((entry, index) => errors.push(...validateEntry(entry, index)));

  const laterOnly = catalog.entries.filter((entry) => entry.kind === "later_disabled_sku");
  for (const entry of laterOnly) {
    if (entry.saleStatus !== "disabled_later_only" || entry.rolloutState !== "disabled_later_only") {
      errors.push(`${entry.id} must remain later-only disabled`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function resolveS219CatalogEntry(
  entryId: string,
  options: {
    catalog?: S219LearnerCatalog;
    asOfDate?: string;
    requireSaleAvailable?: boolean;
  } = {},
): S219CatalogResolution {
  const catalog = options.catalog ?? S219_LEARNER_CATALOG;
  const asOfDate = options.asOfDate ?? "2026-07-04";
  const matches = catalog.entries.filter((entry) => entry.id === entryId);

  if (matches.length === 0) return { ok: false, reason: "unknown_catalog_entry", entryId };
  if (matches.length > 1) return { ok: false, reason: "ambiguous_catalog_entry", entryId };

  const entry = matches[0];
  if (hasUnlimitedGrant(entry)) return { ok: false, reason: "unlimited_second_exam_precision_review_forbidden", entryId };
  if (entry.saleStatus === "disabled_later_only" || entry.rolloutState === "disabled_later_only") {
    return { ok: false, reason: "disabled_catalog_entry", entryId };
  }
  const effectiveReason = entryEffectiveReason(entry, asOfDate);
  if (effectiveReason) return { ok: false, reason: effectiveReason, entryId };
  if (options.requireSaleAvailable && entry.saleStatus === "paid_hypothesis_not_for_sale") {
    return { ok: false, reason: "catalog_entry_not_for_sale", entryId };
  }

  return { ok: true, entry };
}

function failClosed(reason: S219FailClosedReason): never {
  throw new Error(`s219-fail-closed:${reason}`);
}

function assertLearnerLedgerInput(input: Pick<S219UsageReservationInput, "actorRole" | "ownerBinding">) {
  if (input.actorRole !== "learner" || input.ownerBinding !== "authenticated_request_user") {
    failClosed("learner_instructor_boundary_violation");
  }
}

function findUsableGrant(entry: S219CatalogEntry, unitType: string, quantity: number): S219UsageGrant {
  if (!UNIT_TYPES.has(unitType as S219UsageLedgerUnitType)) failClosed("unknown_usage_ledger_unit");
  if (!isFinitePositiveInteger(quantity)) failClosed("invalid_usage_quantity");

  const grants = entry.usageGrants.filter((usageGrant) => (
    usageGrant.unitType === unitType
    && usageGrant.grantKind !== "feature_access_marker"
  ));

  if (grants.length !== 1) failClosed("ambiguous_usage_grant");

  const usageGrant = grants[0];
  if (quantity > usageGrant.quantity) failClosed("insufficient_usage_grant");
  if (
    usageGrant.unlimitedSecondExamPrecisionReview !== false
    || usageGrant.failedGenerationConsumesUnits !== false
    || usageGrant.ledgerRequiredBeforeConsumption !== true
    || usageGrant.reservationRequiredBeforeExpensiveWork !== true
    || usageGrant.commitOnlyAfterUsableResult !== true
  ) {
    failClosed("unlimited_second_exam_precision_review_forbidden");
  }
  return usageGrant;
}

export function reserveS219Usage(input: S219UsageReservationInput): S219UsageLedgerEntry {
  assertLearnerLedgerInput(input);
  if (!isIsoBeforeOrEqual(input.reservedAt, input.expiresAt)) failClosed("ledger_reservation_expired");

  const resolved = resolveS219CatalogEntry(input.catalogEntryId, {
    catalog: input.catalog,
    asOfDate: input.reservedAt,
    requireSaleAvailable: false,
  });
  if (!resolved.ok) failClosed(resolved.reason);

  const usageGrant = findUsableGrant(resolved.entry, input.unitType, input.quantity);
  if (usageGrant.unitType !== input.reasonCode.replace("free_full_value_review", "full_value_review_experience")) {
    if (!(input.reasonCode === "deep_review_unit" && usageGrant.unitType === "deep_review_unit")) {
      failClosed("ambiguous_usage_grant");
    }
  }

  const entry = sanitizeDerivedMetadata({
    ledgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
    ledgerMode: "future_source_contract_only",
    reservationId: input.reservationId,
    catalogEntryId: resolved.entry.id,
    learnerId: input.learnerId,
    ownerBinding: "authenticated_request_user",
    actorRole: "learner",
    unitType: usageGrant.unitType,
    unitsReserved: input.quantity,
    unitsConsumed: 0,
    status: "reserved_pending_commit",
    reservedAt: input.reservedAt,
    expiresAt: input.expiresAt,
    committedAt: null,
    commitReason: null,
    failedGenerationConsumesUnits: false,
    reservationRequiredBeforeExpensiveWork: true,
    commitOnlyAfterUsableResult: true,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    billingProviderCalled: false,
    entitlementEnforcementActivated: false,
    academyTenantDataAccessed: false,
    containsRawContent: false,
  }) as S219UsageLedgerEntry;

  const validation = validateS219UsageLedgerEntry(entry);
  if (!validation.valid) failClosed("data_boundary_violation");
  return entry;
}

export function commitS219UsageReservation(
  reservation: S219UsageLedgerEntry,
  input: S219UsageCommitInput,
): S219UsageLedgerEntry {
  const validation = validateS219UsageLedgerEntry(reservation);
  if (!validation.valid) failClosed("data_boundary_violation");
  if (reservation.status !== "reserved_pending_commit") failClosed("ledger_entry_not_reserved");

  if (input.resultStatus !== "usable_result") {
    return {
      ...reservation,
      status: "released_without_consumption",
      unitsConsumed: 0,
      committedAt: input.committedAt,
      commitReason: input.resultStatus === "failed_generation"
        ? "failed_generation_no_consume"
        : "abandoned_no_consume",
    };
  }

  if (!isIsoBeforeOrEqual(input.committedAt, reservation.expiresAt)) {
    failClosed("ledger_reservation_expired");
  }

  return {
    ...reservation,
    status: "committed",
    unitsConsumed: reservation.unitsReserved,
    committedAt: input.committedAt,
    commitReason: "usable_result_available",
  };
}

export function validateS219UsageLedgerEntry(entry: S219UsageLedgerEntry): S219CatalogValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    assertNoRawUserDataInDerived(entry);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "s219-ledger-data-boundary-error");
  }

  if (entry.ledgerContractVersion !== S219_LEDGER_CONTRACT_VERSION) errors.push("ledgerContractVersion mismatch");
  if (entry.ledgerMode !== "future_source_contract_only") errors.push("ledgerMode must remain source-only");
  if (!entry.reservationId) errors.push("reservationId is required");
  if (!CATALOG_IDS.has(entry.catalogEntryId)) errors.push("catalogEntryId is unknown");
  if (!entry.learnerId) errors.push("learnerId is required");
  if (entry.actorRole !== "learner" || entry.ownerBinding !== "authenticated_request_user") {
    errors.push("ledger entry must remain learner-owned");
  }
  if (!UNIT_TYPES.has(entry.unitType)) errors.push("unitType is unknown");
  if (!isFinitePositiveInteger(entry.unitsReserved)) errors.push("unitsReserved must be positive finite integer");
  if (!isFiniteNonNegativeInteger(entry.unitsConsumed)) errors.push("unitsConsumed must be finite non-negative integer");
  if (entry.unitsConsumed > entry.unitsReserved) errors.push("unitsConsumed cannot exceed unitsReserved");
  if (entry.status === "committed" && entry.unitsConsumed !== entry.unitsReserved) {
    errors.push("committed entries must consume reserved units");
  }
  if (entry.status === "released_without_consumption" && entry.unitsConsumed !== 0) {
    errors.push("released entries must not consume units");
  }
  if (entry.failedGenerationConsumesUnits !== false) errors.push("failed generation must not consume units");
  if (entry.reservationRequiredBeforeExpensiveWork !== true) errors.push("reservation is required before expensive work");
  if (entry.commitOnlyAfterUsableResult !== true) errors.push("commit must wait for usable result");
  if (entry.providerRuntimeCalled !== false) errors.push("ledger contract must not call providers");
  if (entry.ocrRuntimeCalled !== false) errors.push("ledger contract must not call OCR");
  if (entry.billingProviderCalled !== false) errors.push("ledger contract must not call billing providers");
  if (entry.entitlementEnforcementActivated !== false) errors.push("ledger contract must not activate entitlement enforcement");
  if (entry.academyTenantDataAccessed !== false) errors.push("ledger contract must not access academy tenant data");
  if (entry.containsRawContent !== false) errors.push("ledger contract must not include raw content");

  return { valid: errors.length === 0, errors, warnings };
}

export function buildS219LearnerCatalogContractReport(catalog = S219_LEARNER_CATALOG) {
  const validation = validateS219LearnerCatalog(catalog);
  const planIds = catalog.entries
    .filter((entry) => entry.kind === "learner_plan")
    .map((entry) => entry.id);
  const deepReviewSkuIds = catalog.entries
    .filter((entry) => entry.kind === "deep_review_sku")
    .map((entry) => entry.id);
  const laterDisabledSkuIds = catalog.entries
    .filter((entry) => entry.kind === "later_disabled_sku")
    .map((entry) => entry.id);

  return sanitizeDerivedMetadata({
    version: S219_LEARNER_CATALOG_VERSION,
    priceVersion: S219_PRICE_VERSION,
    ledgerContractVersion: S219_LEDGER_CONTRACT_VERSION,
    valid: validation.valid,
    learnerPlans: planIds,
    deepReviewSkus: deepReviewSkuIds,
    laterDisabledSkus: laterDisabledSkuIds,
    featureKeyCount: unique(catalog.entries.flatMap((entry) => entry.featureKeys)).length,
    usageGrantCount: catalog.entries.reduce((count, entry) => count + entry.usageGrants.length, 0),
    noUnlimitedSecondExamPrecisionReview: catalog.guardrails.noUnlimitedSecondExamPrecisionReview,
    sourceLevelOnly: catalog.guardrails.sourceLevelOnly,
    billingProviderCallsAdded: false,
    paymentFlowAdded: false,
    entitlementEnforcementActivated: false,
    productionPricingUiAdded: false,
    learnerUiAdded: false,
    academyTenantDataAccessed: false,
    providerRuntimeCalled: false,
    ocrRuntimeCalled: false,
    metadataOnly: true,
    containsRawContent: false,
  });
}

export function assertS219FixtureMetadataOnly(value: unknown): void {
  assertNoRawUserDataInDerived(value);
  const serialized = JSON.stringify(value);
  if (/"(?:questionText|answerText|referenceText|providerPayload|sourceExcerpt|ocrText|rawAnswerText|rawOcrText|billingRecord|credential)"\s*:/i.test(serialized)) {
    throw new Error("s219-fixture-raw-content-field");
  }
  if (/official\s+grading|confirmed\s+score|pass\s+probability|pass\s+guarantee/i.test(serialized)) {
    throw new Error("s219-fixture-prohibited-authority-claim");
  }
}

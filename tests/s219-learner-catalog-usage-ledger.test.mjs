import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S219_LEARNER_CATALOG,
  S219_LEARNER_CATALOG_VERSION,
  S219_LEDGER_CONTRACT_VERSION,
  S219_PRICE_VERSION,
  assertS219FixtureMetadataOnly,
  buildS219LearnerCatalogContractReport,
  commitS219UsageReservation,
  reserveS219Usage,
  resolveS219CatalogEntry,
  validateS219LearnerCatalog,
  validateS219UsageLedgerEntry,
} from "../lib/review-os/s219-learner-catalog-usage-ledger.ts";
import { assertNoRawUserDataInDerived, SAFE_DERIVED_SIGNAL_KEYS } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const fixturePath = "tests/fixtures/s219-learner-catalog-ledger/metadata-only-s219-catalog.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

async function loadFixture() {
  const parsed = await readJson(fixturePath);
  assertS219FixtureMetadataOnly(parsed);
  return parsed;
}

function entryById(catalog, id) {
  const entry = catalog.entries.find((candidate) => candidate.id === id);
  assert.ok(entry, `missing catalog entry ${id}`);
  return entry;
}

test("S219 catalog report and fixture cover learner plans, SKUs, versions, and metadata boundaries", async () => {
  const fixture = await loadFixture();
  const report = buildS219LearnerCatalogContractReport();
  const validation = validateS219LearnerCatalog();

  assert.equal(fixture.schemaVersion, S219_LEARNER_CATALOG_VERSION);
  assert.equal(fixture.priceVersion, S219_PRICE_VERSION);
  assert.equal(fixture.ledgerContractVersion, S219_LEDGER_CONTRACT_VERSION);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(report.valid, true);
  assert.equal(report.version, S219_LEARNER_CATALOG_VERSION);
  assert.equal(report.priceVersion, S219_PRICE_VERSION);
  assert.equal(report.ledgerContractVersion, S219_LEDGER_CONTRACT_VERSION);
  assert.deepEqual(report.learnerPlans, fixture.expectedLearnerPlanIds);
  assert.deepEqual(report.deepReviewSkus, fixture.expectedDeepReviewSkuIds);
  assert.deepEqual(report.laterDisabledSkus, fixture.expectedLaterDisabledSkuIds);
  assert.equal(report.noUnlimitedSecondExamPrecisionReview, true);
  assert.equal(report.sourceLevelOnly, true);
  assert.equal(report.billingProviderCallsAdded, false);
  assert.equal(report.paymentFlowAdded, false);
  assert.equal(report.entitlementEnforcementActivated, false);
  assert.equal(report.productionPricingUiAdded, false);
  assert.equal(report.learnerUiAdded, false);
  assert.equal(report.academyTenantDataAccessed, false);
  assert.equal(report.providerRuntimeCalled, false);
  assert.equal(report.ocrRuntimeCalled, false);
  assert.equal(report.metadataOnly, true);
  assertNoRawUserDataInDerived(S219_LEARNER_CATALOG);
  assertNoRawUserDataInDerived(fixture);
});

test("S219 models plan and SKU metadata without activating paid runtime behavior", async () => {
  const fixture = await loadFixture();
  const catalog = S219_LEARNER_CATALOG;

  for (const planId of fixture.expectedLearnerPlanIds) {
    const entry = entryById(catalog, planId);
    assert.equal(entry.kind, "learner_plan");
    assert.equal(entry.catalogVersion, S219_LEARNER_CATALOG_VERSION);
    assert.equal(entry.price.priceVersion, S219_PRICE_VERSION);
    assert.equal(entry.price.currency, "KRW");
    assert.equal(entry.price.configuredForBilling, false);
    assert.equal(entry.price.providerPriceRef, null);
    assert.equal(entry.learnerScope.examMode, "second");
    assert.deepEqual(entry.learnerScope.subjectCoverage, ["practice", "theory", "law"]);
    assert.equal(entry.learnerScope.firstRoundFrozen, true);
    assert.equal(entry.learnerScope.unsupportedExamTracksExposed, false);
    assert.equal(entry.guardrails.noUnlimitedSecondExamPrecisionReview, true);
    assert.equal(entry.guardrails.noOfficialAuthorityClaims, true);
    assert.equal(entry.guardrails.noB2CHumanExpertReview, true);
    assert.equal(entry.guardrails.noPassProbability, true);
    assert.equal(entry.guardrails.noPassGuarantee, true);
    assert.ok(entry.featureKeys.includes("learner.second_round_only"));
    assert.ok(entry.usageGrants.length >= 1);
    assert.ok(entry.usageGrants.every((grant) => grant.quantity >= 0 && Number.isFinite(grant.quantity)));
    assert.ok(entry.usageGrants.every((grant) => grant.unlimitedSecondExamPrecisionReview === false));
    assert.ok(entry.usageGrants.every((grant) => grant.failedGenerationConsumesUnits === false));
    assert.deepEqual(Object.values(entry.runtimeBoundary), Object.values(fixture.runtimeBoundary));
    assert.equal(entry.learnerInstructorBoundary.learnerCatalogOnly, true);
    assert.equal(entry.learnerInstructorBoundary.instructorRouteAdded, false);
    assert.equal(entry.learnerInstructorBoundary.academyTenantDataAccessed, false);
    assert.equal(entry.learnerInstructorBoundary.learnerInstructorDataMerged, false);
    assert.equal(entry.dataBoundary.metadataOnly, true);
    assert.equal(entry.dataBoundary.containsRawContent, false);
  }

  assert.equal(entryById(catalog, "free").price.amountMinKrw, 0);
  assert.equal(entryById(catalog, "free").usageGrants[0].quantity, 1);
  assert.equal(entryById(catalog, "second_os_basic").price.amountMinKrw, 59000);
  assert.equal(entryById(catalog, "second_os_basic").price.amountMaxKrw, 69000);
  assert.equal(entryById(catalog, "second_os_pro").price.amountMinKrw, 119000);
  assert.equal(entryById(catalog, "second_os_pro").price.amountMaxKrw, 149000);
  assert.equal(entryById(catalog, "second_control_premium").price.amountMinKrw, 249000);
  assert.equal(entryById(catalog, "second_control_premium").price.amountMaxKrw, 299000);
  assert.ok(entryById(catalog, "second_control_premium").featureKeys.includes("learner.deep_review_unit_eligible"));

  for (const skuId of fixture.expectedDeepReviewSkuIds) {
    const entry = entryById(catalog, skuId);
    assert.equal(entry.kind, "deep_review_sku");
    assert.equal(entry.saleStatus, "paid_hypothesis_not_for_sale");
    assert.equal(entry.rolloutState, "future_paid_beta_candidate");
    assert.ok(entry.featureKeys.includes("ledger.deep_review_unit"));
    assert.ok(entry.featureKeys.includes("ledger.reserve_before_expensive_work"));
    assert.ok(entry.featureKeys.includes("ledger.commit_after_usable_result"));
    assert.ok(entry.featureKeys.includes("ledger.failed_generation_no_consume"));
    assert.equal(entry.usageGrants.length, 1);
    assert.equal(entry.usageGrants[0].unitType, "deep_review_unit");
    assert.equal(entry.usageGrants[0].ledgerRequiredBeforeConsumption, true);
    assert.equal(entry.usageGrants[0].reservationRequiredBeforeExpensiveWork, true);
    assert.equal(entry.usageGrants[0].commitOnlyAfterUsableResult, true);
  }

  assert.equal(entryById(catalog, "deep_review_5").usageGrants[0].quantity, 5);
  assert.equal(entryById(catalog, "deep_review_15").usageGrants[0].quantity, 15);
  assert.equal(entryById(catalog, "deep_review_40").usageGrants[0].quantity, 40);
  assert.equal(entryById(catalog, "managed_cohort").saleStatus, "disabled_later_only");
  assert.equal(entryById(catalog, "managed_cohort").rolloutState, "disabled_later_only");
  assert.equal(entryById(catalog, "season_pass").saleStatus, "disabled_later_only");
  assert.equal(entryById(catalog, "season_pass").rolloutState, "disabled_later_only");
});

test("S219 catalog resolution fails closed for unknown, disabled, expired, unlimited, ambiguous, or sale-required entries", async () => {
  const fixture = await loadFixture();
  const catalog = clone(S219_LEARNER_CATALOG);

  assert.deepEqual(resolveS219CatalogEntry(fixture.failClosedExamples.unknownCatalogEntryId), {
    ok: false,
    reason: "unknown_catalog_entry",
    entryId: fixture.failClosedExamples.unknownCatalogEntryId,
  });

  assert.equal(resolveS219CatalogEntry(fixture.failClosedExamples.disabledCatalogEntryId).ok, false);
  assert.equal(resolveS219CatalogEntry("deep_review_5", { requireSaleAvailable: true }).ok, false);

  const expiredCatalog = clone(catalog);
  entryById(expiredCatalog, "deep_review_5").effectiveUntil = "2026-07-03T00:00:00.000Z";
  const expired = resolveS219CatalogEntry("deep_review_5", {
    catalog: expiredCatalog,
    asOfDate: "2026-07-04T00:00:00.000Z",
  });
  assert.equal(expired.ok, false);
  assert.equal(expired.reason, "catalog_entry_expired");

  const unlimitedCatalog = clone(catalog);
  entryById(unlimitedCatalog, "deep_review_5").usageGrants[0].quantity = Number.POSITIVE_INFINITY;
  const unlimited = resolveS219CatalogEntry("deep_review_5", { catalog: unlimitedCatalog });
  assert.equal(unlimited.ok, false);
  assert.equal(unlimited.reason, "unlimited_second_exam_precision_review_forbidden");
  assert.equal(validateS219LearnerCatalog(unlimitedCatalog).valid, false);

  const ambiguousCatalog = clone(catalog);
  ambiguousCatalog.entries.push(clone(entryById(catalog, "deep_review_5")));
  const ambiguous = resolveS219CatalogEntry("deep_review_5", { catalog: ambiguousCatalog });
  assert.equal(ambiguous.ok, false);
  assert.equal(ambiguous.reason, "ambiguous_catalog_entry");
  assert.equal(validateS219LearnerCatalog(ambiguousCatalog).valid, false);
});

test("S219 future usage ledger reserves before work, commits only usable results, and releases failed generation", async () => {
  const fixture = await loadFixture();
  const reservation = reserveS219Usage(fixture.sampleReservationInput);
  assert.equal(reservation.ledgerContractVersion, S219_LEDGER_CONTRACT_VERSION);
  assert.equal(reservation.ledgerMode, "future_source_contract_only");
  assert.equal(reservation.catalogEntryId, "deep_review_5");
  assert.equal(reservation.unitType, "deep_review_unit");
  assert.equal(reservation.unitsReserved, 2);
  assert.equal(reservation.unitsConsumed, 0);
  assert.equal(reservation.status, "reserved_pending_commit");
  assert.equal(reservation.failedGenerationConsumesUnits, false);
  assert.equal(reservation.reservationRequiredBeforeExpensiveWork, true);
  assert.equal(reservation.commitOnlyAfterUsableResult, true);
  assert.equal(reservation.providerRuntimeCalled, false);
  assert.equal(reservation.ocrRuntimeCalled, false);
  assert.equal(reservation.billingProviderCalled, false);
  assert.equal(reservation.entitlementEnforcementActivated, false);
  assert.equal(reservation.academyTenantDataAccessed, false);
  assert.equal(validateS219UsageLedgerEntry(reservation).valid, true);

  const committed = commitS219UsageReservation(reservation, {
    committedAt: "2026-07-04T00:10:00.000Z",
    resultStatus: "usable_result",
  });
  assert.equal(committed.status, "committed");
  assert.equal(committed.unitsConsumed, 2);
  assert.equal(committed.commitReason, "usable_result_available");
  assert.equal(validateS219UsageLedgerEntry(committed).valid, true);

  const failedReservation = reserveS219Usage({
    ...fixture.sampleReservationInput,
    reservationId: "s219_reservation_deep_review_5_failed",
  });
  const released = commitS219UsageReservation(failedReservation, {
    committedAt: "2026-07-04T00:10:00.000Z",
    resultStatus: "failed_generation",
  });
  assert.equal(released.status, "released_without_consumption");
  assert.equal(released.unitsConsumed, 0);
  assert.equal(released.commitReason, "failed_generation_no_consume");
  assert.equal(validateS219UsageLedgerEntry(released).valid, true);

  const freeReservation = reserveS219Usage(fixture.freeReservationInput);
  assert.equal(freeReservation.catalogEntryId, "free");
  assert.equal(freeReservation.unitType, "full_value_review_experience");
  assert.equal(freeReservation.unitsReserved, 1);
});

test("S219 ledger fails closed for invalid actor, quantity, grant, disabled catalog, and expired reservation", async () => {
  const fixture = await loadFixture();

  assert.throws(
    () => reserveS219Usage({
      ...fixture.sampleReservationInput,
      actorRole: fixture.failClosedExamples.instructorActorRole,
    }),
    /s219-fail-closed:learner_instructor_boundary_violation/,
  );

  assert.throws(
    () => reserveS219Usage({
      ...fixture.sampleReservationInput,
      quantity: 0,
    }),
    /s219-fail-closed:invalid_usage_quantity/,
  );

  assert.throws(
    () => reserveS219Usage({
      ...fixture.sampleReservationInput,
      quantity: 6,
    }),
    /s219-fail-closed:insufficient_usage_grant/,
  );

  assert.throws(
    () => reserveS219Usage({
      ...fixture.sampleReservationInput,
      catalogEntryId: fixture.failClosedExamples.disabledCatalogEntryId,
    }),
    /s219-fail-closed:disabled_catalog_entry/,
  );

  const expiredReservation = reserveS219Usage({
    ...fixture.sampleReservationInput,
    reservationId: "s219_reservation_deep_review_5_expired",
    expiresAt: "2026-07-04T00:05:00.000Z",
  });
  assert.throws(
    () => commitS219UsageReservation(expiredReservation, {
      committedAt: "2026-07-04T00:06:00.000Z",
      resultStatus: "usable_result",
    }),
    /s219-fail-closed:ledger_reservation_expired/,
  );
});

test("S219 docs, runner, safe keys, roadmap, and Agent Factory example target are wired", async () => {
  const docs = await readFile("docs/s219-dabangil-learner-catalog-usage-ledger.md", "utf8");
  const source = await readFile("lib/review-os/s219-learner-catalog-usage-ledger.ts", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const agentFactoryDocs = await readFile("docs/agent-factory-github-actions-button.md", "utf8");
  const agentFactoryButtonTest = await readFile("tests/agent-factory-github-actions-button.test.mjs", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s219 = plan.analyses.find((item) => item.itemId === "S219");
  const s220 = plan.analyses.find((item) => item.itemId === "S220");
  const s221 = plan.analyses.find((item) => item.itemId === "S221");
  const s223 = plan.analyses.find((item) => item.itemId === "S223");

  for (const token of [
    "S219",
    "Dabangil Learner Catalog",
    "Future Usage Ledger",
    "metadata-only",
    "fail closed",
    "Deep Review Units",
    "Reserve units before expensive work",
    "Commit units only after a usable result",
    "Failed generation releases the reservation without consumption",
    "learner/instructor separation",
    "academy tenant boundary",
  ]) {
    assert.match(docs, new RegExp(token));
  }

  for (const key of [
    "catalogEntryId",
    "catalogVersion",
    "priceVersion",
    "usageLedgerUnitType",
    "usageReservationId",
    "usageCommitStatus",
    "unitsReserved",
    "unitsConsumed",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S219 safe key ${key}`);
  }

  assert.doesNotMatch(source, /fetch\(|\/api\/|OPENAI_API_KEY|GEMINI|createClient|from\(["']@supabase|new OpenAI|GoogleGenerativeAI|STRIPE_SECRET_KEY/i);
  assert.match(runner, /tests\/s219-learner-catalog-usage-ledger\.test\.mjs/);
  assert.match(agentFactoryDocs, /roadmap item id such as `S224`/);
  assert.match(agentFactoryButtonTest, /--target[\s\S]{0,80}S224/);
  assert.equal(s219?.statusCategory, "completed");
  assert.equal(s220?.statusCategory, "completed");
  assert.equal(s221?.statusCategory, "completed");
  assert.equal(s223?.statusCategory, "completed");
  assert.deepEqual(plan.selectedItemIds, ["S224"]);
});

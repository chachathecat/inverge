import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S220_BILLING_ENTITLEMENT_VERSION,
  S220_IDEMPOTENT_USAGE_VERSION,
  addS220EntitlementGrant,
  assertS220FixtureMetadataOnly,
  buildS220BillingEntitlementContractReport,
  commitS220UsageReservation,
  createS220EntitlementState,
  provisionS220EntitlementGrant,
  releaseS220UsageReservation,
  reserveS220Usage,
  resolveS220CatalogEntry,
  reverseS220EntitlementGrant,
  validateS220EntitlementState,
} from "../lib/review-os/s220-billing-entitlement-credit-usage.ts";
import {
  S219_LEARNER_CATALOG,
  S219_LEARNER_CATALOG_VERSION,
  S219_LEDGER_CONTRACT_VERSION,
  S219_PRICE_VERSION,
} from "../lib/review-os/s219-learner-catalog-usage-ledger.ts";
import { assertNoRawUserDataInDerived, SAFE_DERIVED_SIGNAL_KEYS } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const fixturePath = "tests/fixtures/s220-billing-entitlement/metadata-only-s220-entitlement.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function clone(value) {
  return structuredClone(value);
}

async function loadFixture() {
  const parsed = await readJson(fixturePath);
  assertS220FixtureMetadataOnly(parsed);
  return parsed;
}

function grantById(state, grantId) {
  const grant = state.grants.find((candidate) => candidate.grantId === grantId);
  assert.ok(grant, `missing grant ${grantId}`);
  return grant;
}

function reservationById(state, reservationId) {
  const reservation = state.reservations.find((candidate) => candidate.reservationId === reservationId);
  assert.ok(reservation, `missing reservation ${reservationId}`);
  return reservation;
}

async function stateWithCreditPack() {
  const fixture = await loadFixture();
  let state = createS220EntitlementState(fixture.sampleStateInput);
  state = addS220EntitlementGrant(state, fixture.sampleCreditPackGrantInput).state;
  return { fixture, state };
}

test("S220 report and metadata-only fixture consume S219 catalog and ledger versions", async () => {
  const fixture = await loadFixture();
  const state = createS220EntitlementState(fixture.sampleStateInput);
  const report = buildS220BillingEntitlementContractReport(state);

  assert.equal(fixture.schemaVersion, S220_BILLING_ENTITLEMENT_VERSION);
  assert.equal(fixture.idempotentUsageVersion, S220_IDEMPOTENT_USAGE_VERSION);
  assert.equal(fixture.upstreamCatalogVersion, S219_LEARNER_CATALOG_VERSION);
  assert.equal(fixture.upstreamPriceVersion, S219_PRICE_VERSION);
  assert.equal(fixture.upstreamLedgerContractVersion, S219_LEDGER_CONTRACT_VERSION);
  assert.equal(report.version, S220_BILLING_ENTITLEMENT_VERSION);
  assert.equal(report.idempotentUsageVersion, S220_IDEMPOTENT_USAGE_VERSION);
  assert.equal(report.upstreamCatalogVersion, S219_LEARNER_CATALOG_VERSION);
  assert.equal(report.upstreamLedgerContractVersion, S219_LEDGER_CONTRACT_VERSION);
  assert.equal(report.catalogValid, true);
  assert.equal(report.stateValid, true);
  assert.equal(report.totalCreditPackUnits, 60);
  assert.equal(report.billingProviderCalled, false);
  assert.equal(report.checkoutAdded, false);
  assert.equal(report.paymentWebhookAdded, false);
  assert.equal(report.entitlementEnforcementActivated, false);
  assert.equal(report.productionPricingUiAdded, false);
  assert.equal(report.learnerUiAdded, false);
  assert.equal(report.productionRouteAdded, false);
  assert.equal(report.authChanged, false);
  assert.equal(report.supabaseMigrationAdded, false);
  assert.equal(report.workflowChanged, false);
  assert.equal(report.providerRuntimeCalled, false);
  assert.equal(report.ocrRuntimeCalled, false);
  assert.equal(report.academyTenantDataAccessed, false);
  assert.equal(report.metadataOnly, true);
  assert.equal(report.containsRawContent, false);
  assertNoRawUserDataInDerived(fixture);
  assertNoRawUserDataInDerived(report);
});

test("S220 models subscription and credit-pack entitlement grants without activating paid runtime behavior", async () => {
  const fixture = await loadFixture();
  let state = createS220EntitlementState(fixture.sampleStateInput);
  const subscriptionResult = addS220EntitlementGrant(state, fixture.sampleSubscriptionGrantInput);
  state = subscriptionResult.state;
  const creditResult = addS220EntitlementGrant(state, fixture.sampleCreditPackGrantInput);
  state = creditResult.state;

  const subscriptionGrant = grantById(state, fixture.sampleSubscriptionGrantInput.grantId);
  const creditGrant = grantById(state, fixture.sampleCreditPackGrantInput.grantId);

  assert.equal(subscriptionGrant.grantType, "subscription");
  assert.equal(subscriptionGrant.catalogEntryId, "second_control_premium");
  assert.equal(subscriptionGrant.grantStatus, "active");
  assert.equal(subscriptionGrant.entitlementEvidenceSource, "server_side_catalog_contract");
  assert.deepEqual(subscriptionGrant.unitBalances, []);
  assert.equal(creditGrant.grantType, "credit_pack");
  assert.equal(creditGrant.catalogEntryId, "deep_review_5");
  assert.equal(creditGrant.unitBalances[0].unitType, "deep_review_unit");
  assert.equal(creditGrant.unitBalances[0].unitsGranted, 5);
  assert.equal(creditGrant.unitBalances[0].unitsAvailable, 5);
  assert.equal(creditGrant.billingProviderCalled, false);
  assert.equal(creditGrant.checkoutAdded, false);
  assert.equal(creditGrant.paymentWebhookAdded, false);
  assert.equal(creditGrant.entitlementEnforcementActivated, false);
  assert.equal(creditGrant.providerRuntimeCalled, false);
  assert.equal(creditGrant.ocrRuntimeCalled, false);
  assert.equal(validateS220EntitlementState(state).valid, true);

  const replay = addS220EntitlementGrant(state, fixture.sampleCreditPackGrantInput);
  assert.equal(replay.idempotencyKeyStatus, "idempotent_replay");
  assert.equal(replay.state.grants.length, 2);
});

test("S220 catalog and grant provisioning fail closed for unsafe or unsupported entitlement states", async () => {
  const fixture = await loadFixture();
  const catalog = clone(S219_LEARNER_CATALOG);

  assert.deepEqual(resolveS220CatalogEntry(fixture.failClosedExamples.unknownSku), {
    ok: false,
    reason: "unknown_sku",
    entryId: fixture.failClosedExamples.unknownSku,
  });

  assert.equal(resolveS220CatalogEntry(fixture.failClosedExamples.disabledSku).ok, false);
  assert.equal(resolveS220CatalogEntry(fixture.failClosedExamples.disabledSku).reason, "disabled_sku");

  const ambiguousCatalog = clone(catalog);
  ambiguousCatalog.entries.push(clone(catalog.entries.find((entry) => entry.id === "deep_review_5")));
  assert.equal(resolveS220CatalogEntry("deep_review_5", { catalog: ambiguousCatalog }).reason, "ambiguous_catalog_entry");

  assert.throws(
    () => provisionS220EntitlementGrant({
      ...fixture.sampleCreditPackGrantInput,
      entitlementEvidenceSource: fixture.failClosedExamples.clientAssertedSource,
    }),
    /s220-fail-closed:client_asserted_entitlement/,
  );
  assert.throws(
    () => provisionS220EntitlementGrant({
      ...fixture.sampleCreditPackGrantInput,
      catalogEntryId: fixture.failClosedExamples.unknownSku,
    }),
    /s220-fail-closed:unknown_sku/,
  );
  assert.throws(
    () => provisionS220EntitlementGrant({
      ...fixture.sampleCreditPackGrantInput,
      catalogEntryId: fixture.failClosedExamples.disabledSku,
    }),
    /s220-fail-closed:disabled_sku/,
  );
  assert.throws(
    () => provisionS220EntitlementGrant({
      ...fixture.sampleCreditPackGrantInput,
      actorRole: fixture.failClosedExamples.instructorActorRole,
    }),
    /s220-fail-closed:learner_instructor_boundary_violation/,
  );
  assert.throws(
    () => provisionS220EntitlementGrant({
      ...fixture.sampleCreditPackGrantInput,
      expiresAt: "2026-07-03T00:00:00.000Z",
    }),
    /s220-fail-closed:expired_grant/,
  );
});

test("S220 reserves with idempotency, commits only usable results, and releases failed work without consumption", async () => {
  const { fixture, state: initialState } = await stateWithCreditPack();

  const reserved = reserveS220Usage(initialState, fixture.sampleReservationInput);
  let state = reserved.state;
  assert.equal(reserved.idempotencyKeyStatus, "created");
  assert.equal(reserved.reservation.status, "reserved_pending_commit");
  assert.equal(reserved.reservation.unitsConsumed, 0);
  assert.equal(grantById(state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsReserved, 2);
  assert.equal(grantById(state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsAvailable, 3);

  const replay = reserveS220Usage(state, fixture.sampleReservationInput);
  assert.equal(replay.idempotencyKeyStatus, "idempotent_replay");
  assert.equal(replay.state.reservations.length, 1);
  assert.equal(grantById(replay.state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsReserved, 2);

  assert.throws(
    () => reserveS220Usage(state, {
      ...fixture.sampleReservationInput,
      quantity: 1,
    }),
    /s220-fail-closed:idempotency_key_conflict/,
  );

  const committed = commitS220UsageReservation(state, fixture.sampleCommitInput);
  state = committed.state;
  assert.equal(committed.reservation.status, "committed");
  assert.equal(committed.reservation.unitsConsumed, 2);
  assert.equal(committed.reservation.commitReason, "usable_result_available");
  assert.equal(grantById(state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsReserved, 0);
  assert.equal(grantById(state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsConsumed, 2);
  assert.equal(grantById(state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsAvailable, 3);

  const commitReplay = commitS220UsageReservation(state, fixture.sampleCommitInput);
  assert.equal(commitReplay.idempotencyKeyStatus, "idempotent_replay");
  assert.equal(grantById(commitReplay.state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsConsumed, 2);

  assert.throws(
    () => commitS220UsageReservation(state, {
      ...fixture.sampleCommitInput,
      idempotencyKey: "s220_idem_commit_duplicate_new_key",
    }),
    /s220-fail-closed:duplicate_commit/,
  );

  const failedReservation = reserveS220Usage(state, {
    ...fixture.sampleReservationInput,
    reservationId: fixture.sampleReleaseInput.reservationId,
    idempotencyKey: "s220_idem_reserve_failed_001",
    quantity: 1,
  });
  const released = releaseS220UsageReservation(failedReservation.state, fixture.sampleReleaseInput);
  state = released.state;
  assert.equal(released.reservation.status, "released_without_consumption");
  assert.equal(released.reservation.unitsConsumed, 0);
  assert.equal(released.reservation.releaseReason, "failed_generation_no_consume");
  assert.equal(grantById(state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsConsumed, 2);
  assert.equal(grantById(state, fixture.sampleCreditPackGrantInput.grantId).unitBalances[0].unitsAvailable, 3);
  assert.equal(validateS220EntitlementState(state).valid, true);
});

test("S220 usage fails closed for insufficient credits, unsupported unit, stale reservation, and unusable result", async () => {
  const { fixture, state } = await stateWithCreditPack();

  assert.throws(
    () => reserveS220Usage(state, {
      ...fixture.sampleReservationInput,
      quantity: fixture.failClosedExamples.insufficientCreditQuantity,
    }),
    /s220-fail-closed:insufficient_credits/,
  );
  assert.throws(
    () => reserveS220Usage(state, {
      ...fixture.sampleReservationInput,
      idempotencyKey: "s220_idem_reserve_bad_unit",
      unitType: fixture.failClosedExamples.unsupportedUsageUnit,
    }),
    /s220-fail-closed:unsupported_usage_unit/,
  );

  const staleReserved = reserveS220Usage(state, {
    ...fixture.sampleReservationInput,
    reservationId: fixture.failClosedExamples.staleReservationId,
    idempotencyKey: "s220_idem_reserve_stale_001",
    expiresAt: "2026-07-04T00:08:00.000Z",
  });
  assert.throws(
    () => commitS220UsageReservation(staleReserved.state, {
      ...fixture.sampleCommitInput,
      reservationId: fixture.failClosedExamples.staleReservationId,
      idempotencyKey: "s220_idem_commit_stale_001",
      committedAt: "2026-07-04T00:09:00.000Z",
    }),
    /s220-fail-closed:stale_reservation/,
  );

  const unusableReserved = reserveS220Usage(state, {
    ...fixture.sampleReservationInput,
    reservationId: "s220_reservation_deep_review_unusable_001",
    idempotencyKey: "s220_idem_reserve_unusable_001",
    quantity: 1,
  });
  assert.throws(
    () => commitS220UsageReservation(unusableReserved.state, {
      reservationId: "s220_reservation_deep_review_unusable_001",
      idempotencyKey: "s220_idem_commit_unusable_001",
      learnerId: fixture.sampleStateInput.learnerId,
      committedAt: "2026-07-04T00:20:00.000Z",
      resultStatus: "failed_generation",
      usableResultAvailable: false,
    }),
    /s220-fail-closed:usable_result_required/,
  );
});

test("S220 refund and reversal semantics block further use and release pending reservations", async () => {
  const { fixture, state: initialState } = await stateWithCreditPack();
  const reserved = reserveS220Usage(initialState, fixture.sampleReservationInput);
  const reversed = reverseS220EntitlementGrant(reserved.state, fixture.sampleReversalInput);
  const state = reversed.state;
  const grant = grantById(state, fixture.sampleCreditPackGrantInput.grantId);
  const reservation = reservationById(state, fixture.sampleReservationInput.reservationId);

  assert.equal(reversed.idempotencyKeyStatus, "created");
  assert.equal(grant.grantStatus, "reversed");
  assert.equal(grant.unitBalances[0].unitsAvailable, 0);
  assert.equal(grant.unitBalances[0].unitsConsumed, 0);
  assert.equal(grant.unitBalances[0].unitsReversed, 5);
  assert.equal(reservation.status, "released_without_consumption");
  assert.equal(reservation.releaseReason, "grant_reversed_no_consume");
  assert.equal(reservation.unitsConsumed, 0);
  assert.equal(reversed.ledgerEvent.eventKind, "grant_reversed");
  assert.equal(reversed.ledgerEvent.billingProviderCalled, false);
  assert.equal(reversed.ledgerEvent.paymentWebhookAdded, false);
  assert.equal(reversed.ledgerEvent.entitlementEnforcementActivated, false);

  const replay = reverseS220EntitlementGrant(state, fixture.sampleReversalInput);
  assert.equal(replay.idempotencyKeyStatus, "idempotent_replay");

  assert.throws(
    () => reverseS220EntitlementGrant(state, {
      ...fixture.sampleReversalInput,
      idempotencyKey: "s220_idem_reverse_second_key",
    }),
    /s220-fail-closed:grant_not_active/,
  );
  assert.throws(
    () => reverseS220EntitlementGrant(initialState, {
      ...fixture.sampleReversalInput,
      entitlementEvidenceSource: fixture.failClosedExamples.clientAssertedSource,
    }),
    /s220-fail-closed:client_asserted_entitlement/,
  );
});

test("S220 docs, runner, safe keys, roadmap, and Agent Factory example target are wired", async () => {
  const fixture = await loadFixture();
  const docs = await readFile("docs/s220-billing-entitlement-credit-packs-idempotent-usage.md", "utf8");
  const source = await readFile("lib/review-os/s220-billing-entitlement-credit-usage.ts", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const agentFactoryDocs = await readFile("docs/agent-factory-github-actions-button.md", "utf8");
  const agentFactoryButtonTest = await readFile("tests/agent-factory-github-actions-button.test.mjs", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s220 = plan.analyses.find((item) => item.itemId === "S220");
  const s221 = plan.analyses.find((item) => item.itemId === "S221");
  const s223 = plan.analyses.find((item) => item.itemId === "S223");
  const s224 = plan.analyses.find((item) => item.itemId === "S224");
  const s225 = plan.analyses.find((item) => item.itemId === "S225");

  for (const token of [
    "S220",
    "Billing Entitlement Credit Packs",
    "idempotent usage",
    "server-side entitlement states",
    "subscription grants",
    "credit-pack grants",
    "Reserve units before expensive work",
    "Commit units only after a usable result",
    "Release failed generation",
    "refund/reversal",
    "duplicate commit",
    "client-asserted entitlement",
    "learner/instructor",
    "academy tenant",
    "metadata only",
  ]) {
    assert.match(docs, new RegExp(token, "i"));
  }

  for (const key of fixture.requiredSafeDerivedKeys) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S220 safe key ${key}`);
  }

  assert.doesNotMatch(source, /fetch\(|\/api\/|OPENAI_API_KEY|GEMINI|createClient|from\(["']@supabase|new OpenAI|GoogleGenerativeAI|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE/i);
  assert.match(runner, /tests\/s220-billing-entitlement-credit-usage\.test\.mjs/);
  assert.match(agentFactoryDocs, /roadmap item id such as `S225`/);
  assert.match(agentFactoryButtonTest, /--target[\s\S]{0,80}S225/);
  assert.equal(s220?.statusCategory, "completed");
  assert.equal(s221?.statusCategory, "completed");
  assert.equal(s223?.statusCategory, "completed");
  assert.equal(s224?.statusCategory, "completed");
  assert.equal(s225?.readinessStatus, "blocked");
  assert.deepEqual(s225?.missingDependencies, ["O4D"]);
  assert.deepEqual(plan.selectedItemIds, ["S235B", "O3A"]);
});

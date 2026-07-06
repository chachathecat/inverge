import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  S221_COST_GUARDRAIL_CONFIG,
  S221_COST_GUARDRAIL_VERSION,
  S221_PAID_TRUST_PRIVACY_COST_CONTRACT,
  S221_PAID_TRUST_VERSION,
  assertS221NoForbiddenAuthorityCopy,
  assertS221TelemetryMetadataOnly,
  buildS221CommercialCostTelemetryEvent,
  buildS221ReadinessReport,
  buildS221UsageCreditVisibility,
  validateS221PaidTrustPrivacyCostContract,
} from "../lib/review-os/s221-paid-trust-privacy-cost-guardrails.ts";
import {
  addS220EntitlementGrant,
  createS220EntitlementState,
  reserveS220Usage,
} from "../lib/review-os/s220-billing-entitlement-credit-usage.ts";
import { assertNoRawUserDataInDerived, SAFE_DERIVED_SIGNAL_KEYS } from "../lib/review-os/data-boundary.ts";
import { createRoadmapRunnerPlanFromYaml } from "../lib/agent-factory/roadmap-runner.ts";

const s220FixturePath = "tests/fixtures/s220-billing-entitlement/metadata-only-s220-entitlement.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function requiredSurfaceIds() {
  return [
    "data_export",
    "account_data_deletion_request",
    "support_contact",
    "refund_cancel_policy",
    "subscription_pack_history",
    "remaining_usage_credit",
    "ai_official_source_labels",
  ];
}

function unsafeObjectWithKey(left, right) {
  return Object.fromEntries([[`${left}${right}`, "blocked"]]);
}

test("S221 trust and privacy surfaces exist and remain source-level only", () => {
  const contract = S221_PAID_TRUST_PRIVACY_COST_CONTRACT;
  const validation = validateS221PaidTrustPrivacyCostContract();
  const report = buildS221ReadinessReport();

  assert.equal(contract.version, S221_PAID_TRUST_VERSION);
  assert.equal(contract.costGuardrailVersion, S221_COST_GUARDRAIL_VERSION);
  assert.equal(contract.implementationMode, "source_contract_only");
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(report.valid, true);
  assert.deepEqual(
    contract.trustSurfaces.map((surface) => surface.id),
    requiredSurfaceIds(),
  );
  for (const surface of contract.trustSurfaces) {
    assert.equal(surface.requiredBeforePaidLaunch, true);
    assert.equal(surface.learnerVisibleBeforePaidLaunch, true);
    assert.equal(surface.copyKo.trim().length > 0, true);
    assert.deepEqual(Object.values(surface.runtimeBoundary), Object.values(contract.runtimeBoundary));
    assert.equal(surface.dataBoundary.metadataOnly, true);
    assert.equal(surface.dataBoundary.containsRawContent, false);
  }

  const exportSurface = contract.trustSurfaces.find((surface) => surface.id === "data_export");
  const deleteSurface = contract.trustSurfaces.find((surface) => surface.id === "account_data_deletion_request");
  const supportSurface = contract.trustSurfaces.find((surface) => surface.id === "support_contact");
  const refundCancelSurface = contract.trustSurfaces.find((surface) => surface.id === "refund_cancel_policy");
  assert.equal(exportSurface?.dataScope.includesUserOwnedRawServiceRecords, true);
  assert.equal(deleteSurface?.dataScope.includesUserOwnedRawServiceRecords, true);
  assert.equal(supportSurface?.requestChannel, "support_contact");
  assert.equal(refundCancelSurface?.dataScope.includesSubscriptionOrPackMetadata, true);
  assert.doesNotThrow(() => assertS221NoForbiddenAuthorityCopy(contract.trustSurfaces.map((surface) => surface.copyKo).join("\n")));
  assertNoRawUserDataInDerived(contract);
});

test("S221 remaining usage and credit visibility derives from existing S220 state without enforcement", async () => {
  const fixture = await readJson(s220FixturePath);
  let state = createS220EntitlementState(fixture.sampleStateInput);
  state = addS220EntitlementGrant(state, fixture.sampleCreditPackGrantInput).state;
  state = reserveS220Usage(state, fixture.sampleReservationInput).state;

  const visibility = buildS221UsageCreditVisibility(state);

  assert.equal(visibility.contractVersion, S221_PAID_TRUST_VERSION);
  assert.equal(visibility.source, "s220_entitlement_state");
  assert.equal(visibility.subscriptionHistoryVisible, true);
  assert.equal(visibility.packHistoryVisible, true);
  assert.equal(visibility.remainingUsageCreditVisible, true);
  assert.equal(visibility.enforcementActivated, false);
  assert.equal(visibility.billingProviderCalled, false);
  assert.equal(visibility.metadataOnly, true);
  assert.equal(visibility.historyEntries.length, 1);
  assert.equal(visibility.reservations.length, 1);
  assert.deepEqual(visibility.remainingCredits, [{
    catalogEntryId: "deep_review_5",
    unitType: "deep_review_unit",
    unitsAvailable: 3,
  }]);
  assertNoRawUserDataInDerived(visibility);

  const catalogOnly = buildS221UsageCreditVisibility();
  assert.equal(catalogOnly.source, "s219_catalog_contract");
  assert.equal(catalogOnly.catalogEntries.some((entry) => entry.catalogEntryId === "deep_review_5"), true);
});

test("S221 cost guardrail config covers OCR, tokens, budgets, kill switches, and warning states", () => {
  const config = S221_COST_GUARDRAIL_CONFIG;
  const budgets = config.budgets;

  assert.equal(config.version, S221_COST_GUARDRAIL_VERSION);
  assert.equal(config.implementationMode, "source_contract_only");
  assert.equal(budgets.ocrPages.perRequestMax, 5);
  assert.equal(budgets.modelInputTokens.perRequestMax > 0, true);
  assert.equal(budgets.modelOutputTokens.perRequestMax > 0, true);
  assert.equal(budgets.modelTotalTokens.perRequestMax, budgets.modelInputTokens.perRequestMax + budgets.modelOutputTokens.perRequestMax);
  assert.equal(budgets.timeoutBudget.unit, "milliseconds");
  assert.equal(budgets.retryBudget.unit, "attempts");
  assert.deepEqual(
    config.featureKillSwitches.map((switchSpec) => switchSpec.id),
    ["paid_checkout", "deep_review_generation", "answer_review_ai", "structured_ocr_ai"],
  );
  assert.deepEqual(
    config.providerKillSwitches.map((switchSpec) => switchSpec.id),
    ["gemini", "openai", "ocr_import"],
  );
  assert.ok(config.warningStates.includes("anomaly_review_required"));
  assert.ok(config.warningStates.includes("blocked_by_guardrail"));
  assert.equal(config.telemetryPolicy.metadataOnly, true);
  assert.equal(config.telemetryPolicy.commercialMetricsMayIncludeAmounts, false);
  assert.equal(config.telemetryPolicy.commercialMetricsMayIncludeUsageCounts, true);
  assert.equal(config.featureKillSwitches.every((switchSpec) => switchSpec.runtimeWiredInThisPr === false), true);
  assert.equal(config.providerKillSwitches.every((switchSpec) => switchSpec.runtimeWiredInThisPr === false), true);
});

test("S221 commercial and cost telemetry is metadata-only and rejects unsafe fields", () => {
  const event = buildS221CommercialCostTelemetryEvent({
    eventId: "s221_cost_event_001",
    eventKind: "cost_request_summary",
    routeId: "answer_review_structure",
    learnerIdHash: "learner_hash_001",
    catalogEntryId: "deep_review_5",
    unitType: "deep_review_unit",
    unitsReserved: 1,
    unitsConsumed: 0,
    ocrPageCount: 2,
    modelInputTokenCount: 32000,
    modelOutputTokenCount: 3000,
    durationMs: 12000,
    timeoutBudgetMs: 45000,
    retryCount: 0,
    costWarningState: "normal",
  });

  assert.equal(event.contractVersion, S221_PAID_TRUST_VERSION);
  assert.equal(event.metadataOnly, true);
  assert.equal(event.containsRawContent, false);
  assert.equal(event.learnerContentIncluded, false);
  assert.equal(event.providerPayloadIncluded, false);
  assert.equal(event.paymentSecretIncluded, false);
  assert.equal(event.modelInputTokenCount, 32000);
  assert.equal(event.modelOutputTokenCount, 3000);
  assertNoRawUserDataInDerived(event);

  for (const unsafe of [
    unsafeObjectWithKey("answer", "Text"),
    unsafeObjectWithKey("ocr", "Text"),
    unsafeObjectWithKey("problem", "Text"),
    unsafeObjectWithKey("question", "Text"),
    unsafeObjectWithKey("reference", "Text"),
    unsafeObjectWithKey("generatedAnswer", "Prose"),
    unsafeObjectWithKey("source", "Excerpt"),
    unsafeObjectWithKey("provider", "Payload"),
    unsafeObjectWithKey("payment", "Secret"),
    unsafeObjectWithKey("billing", "Secret"),
  ]) {
    assert.throws(
      () => assertS221TelemetryMetadataOnly(unsafe),
      /raw-user-data-in-derived-metadata|s221-telemetry-forbidden-content-field/,
    );
  }
});

test("S221 files do not add checkout, webhook, provider, payment, auth, workflow, academy, or OCR runtime activation", async () => {
  const source = await readFile("lib/review-os/s221-paid-trust-privacy-cost-guardrails.ts", "utf8");
  const docs = await readFile("docs/s221-paid-trust-privacy-cost-guardrails.md", "utf8");
  const combined = `${source}\n${docs}`;

  assert.doesNotMatch(source, /fetch\(|\/api\/|new OpenAI|GoogleGenerativeAI|createClient|from\(["']@supabase|STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE/i);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
  assert.match(source, /checkoutAdded:\s*false/);
  assert.match(source, /paymentWebhookAdded:\s*false/);
  assert.match(source, /billingProviderCalled:\s*false/);
  assert.match(source, /entitlementEnforcementActivated:\s*false/);
  assert.match(source, /authChanged:\s*false/);
  assert.match(source, /workflowChanged:\s*false/);
  assert.match(source, /academyRouteAdded:\s*false/);
  assert.match(source, /instructorRouteAdded:\s*false/);
  assert.match(source, /providerRuntimeExpanded:\s*false/);
  assert.match(source, /ocrRuntimeExpanded:\s*false/);
  assert.match(combined, /source contract only/i);
});

test("S221 safe keys, docs, runner, roadmap, and Agent Factory example target are wired", async () => {
  const docs = await readFile("docs/s221-paid-trust-privacy-cost-guardrails.md", "utf8");
  const runner = await readFile("scripts/run-node-tests.mjs", "utf8");
  const agentFactoryDocs = await readFile("docs/agent-factory-github-actions-button.md", "utf8");
  const agentFactoryButtonTest = await readFile("tests/agent-factory-github-actions-button.test.mjs", "utf8");
  const roadmapSource = await readFile("roadmap/active-program.yml", "utf8");
  const plan = createRoadmapRunnerPlanFromYaml(roadmapSource);
  const s221 = plan.analyses.find((item) => item.itemId === "S221");
  const s222 = plan.analyses.find((item) => item.itemId === "S222");
  const s223 = plan.analyses.find((item) => item.itemId === "S223");

  for (const token of [
    "S221",
    "Paid Trust Privacy Export Delete and Cost Guardrails",
    "data_export",
    "account_data_deletion_request",
    "support_contact",
    "refund_cancel_policy",
    "remaining_usage_credit",
    "metadata-only",
    "feature kill switches",
    "provider kill switches",
    "paid launch remains blocked",
  ]) {
    assert.match(docs, new RegExp(token, "i"));
  }

  for (const key of [
    "trustSurfaceId",
    "privacyRequestType",
    "supportContactChannel",
    "remainingUsageCreditVisible",
    "commercialTelemetryKind",
    "costGuardrailVersion",
    "ocrPageCount",
    "modelInputTokenCount",
    "modelOutputTokenCount",
    "requestTimeoutBudgetMs",
    "retryBudgetCount",
    "featureKillSwitchState",
    "providerKillSwitchState",
    "costWarningState",
    "anomalyWarningState",
  ]) {
    assert.ok(SAFE_DERIVED_SIGNAL_KEYS.includes(key), `Missing S221 safe key ${key}`);
  }

  assert.match(runner, /tests\/s221-paid-trust-privacy-cost-guardrails\.test\.mjs/);
  assert.match(agentFactoryDocs, /roadmap item id such as `S224`/);
  assert.match(agentFactoryButtonTest, /--target[\s\S]{0,80}S224/);
  assert.equal(s221?.statusCategory, "completed");
  assert.equal(s222?.statusCategory, "completed");
  assert.equal(s223?.statusCategory, "completed");
  assert.deepEqual(plan.selectedItemIds, ["S224"]);
});

test("S221 commercial fixtures and docs stay metadata-only without raw content fields or authority claims", async () => {
  const paths = [
    "docs/s219-dabangil-learner-catalog-usage-ledger.md",
    "docs/s220-billing-entitlement-credit-packs-idempotent-usage.md",
    "docs/s221-paid-trust-privacy-cost-guardrails.md",
    "tests/fixtures/s219-learner-catalog-ledger/metadata-only-s219-catalog.json",
    "tests/fixtures/s220-billing-entitlement/metadata-only-s220-entitlement.json",
    "lib/review-os/s219-learner-catalog-usage-ledger.ts",
    "lib/review-os/s220-billing-entitlement-credit-usage.ts",
    "lib/review-os/s221-paid-trust-privacy-cost-guardrails.ts",
    "lib/review-os/observability.ts",
  ];
  const rawFieldAssignmentPattern =
    /["'](?:answerText|rawAnswerText|userAnswerText|ocrText|rawOcrText|problemText|questionText|referenceText|sourceExcerpt|providerPayload|paymentSecret|billingSecret|pdfBytes|imageBytes)["']\s*[:=]/i;
  const forbiddenClaimPattern =
    /\b(?:official grading|official model answer|confirmed score|pass probability|pass guarantee|pass\/fail prediction)\b/i;

  for (const path of paths) {
    const text = await readFile(path, "utf8");
    assert.doesNotMatch(text, rawFieldAssignmentPattern, `${path} must not assign raw/commercial unsafe fields`);
    if (path.includes("s221")) {
      assert.doesNotMatch(text, forbiddenClaimPattern, `${path} must not include forbidden authority claims`);
    }
  }
});

import test from "node:test";
import assert from "node:assert/strict";

import { evaluateReadiness } from "../scripts/check-paid-launch-readiness.mjs";
import defaultConfig from "../config/paid-launch-readiness.json" with { type: "json" };

const allTrueConfig = {
  billingConfigured: true,
  entitlementEnforced: true,
  privacyExportImplemented: true,
  privacyDeleteImplemented: true,
  supportContactVisible: true,
  refundPolicyVisible: true,
  aiQualityEvalPassing: true,
  learnerLoopHealthPassing: true,
  stagingSmokeConfigured: true,
  costGuardrailsConfigured: true,
};

test("default config fails paid launch readiness", () => {
  const result = evaluateReadiness(defaultConfig);
  assert.equal(result.passed, false);
  assert.ok(result.missing.length > 0);
});

test("enabling all gates passes paid launch readiness", () => {
  const result = evaluateReadiness(allTrueConfig);
  assert.equal(result.passed, true);
  assert.deepEqual(result.missing, []);
});

test("missing billing fails", () => {
  const config = { ...allTrueConfig, billingConfigured: false };
  const result = evaluateReadiness(config);
  assert.equal(result.passed, false);
  assert.ok(result.missing.includes("billingConfigured"));
});

test("missing privacy delete/export fails", () => {
  const config = {
    ...allTrueConfig,
    privacyDeleteImplemented: false,
    privacyExportImplemented: false,
  };
  const result = evaluateReadiness(config);
  assert.equal(result.passed, false);
  assert.ok(result.missing.includes("privacyDeleteImplemented"));
  assert.ok(result.missing.includes("privacyExportImplemented"));
});

test("missing support/refund copy fails", () => {
  const config = {
    ...allTrueConfig,
    supportContactVisible: false,
    refundPolicyVisible: false,
  };
  const result = evaluateReadiness(config);
  assert.equal(result.passed, false);
  assert.ok(result.missing.includes("supportContactVisible"));
  assert.ok(result.missing.includes("refundPolicyVisible"));
});

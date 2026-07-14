import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  TRUST_AUTHORITY_BOUNDARY,
  TRUST_PROVENANCE_FIXTURES,
  TRUST_PROVENANCE_STATES,
  adaptLegacyTrustSignals,
  buildTrustProvenanceModel,
  parseTrustProvenanceEvidence,
  parseTrustProvenanceSources,
} from "../lib/review-os/trust-provenance.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("S231B renders every evidence-backed state exhaustively with a fixed authority boundary", () => {
  const models = TRUST_PROVENANCE_FIXTURES.map((evidence) =>
    buildTrustProvenanceModel(evidence, [evidence.kind === "unavailable" ? "none" : "persisted_record"]),
  );

  assert.deepEqual(models.map((model) => model.state), TRUST_PROVENANCE_STATES);
  assert.deepEqual(
    models.filter((model) => model.actionableChange).map((model) => model.state),
    ["conflict", "offline"],
  );
  for (const model of models) {
    assert.deepEqual(model.authorityBoundary, TRUST_AUTHORITY_BOUNDARY);
    assert.equal(model.authorityBoundary.learningSupportOnly, true);
    assert.equal(model.authorityBoundary.officialGradingAllowed, false);
    assert.equal(model.authorityBoundary.confirmedScoreAllowed, false);
    assert.equal(model.authorityBoundary.passProbabilityAllowed, false);
    assert.equal(model.authorityBoundary.modelAnswerAuthorityAllowed, false);
    assert.equal(model.authorityBoundary.deviceVerificationAllowed, false);
  }
});

test("S231B accepts only exact typed evidence and never infers authority or conflict from prose", () => {
  const invalidEvidence = [
    { message: "conflict" },
    { kind: "conflict_record", conflictRecorded: false },
    { kind: "conflict_record", note: "conflict appears in prose" },
    { kind: "review_requirement", reviewRequired: false },
    { kind: "learner_confirmation", learnerConfirmed: false },
    { kind: "verified_record", recordVerified: true, officialGrading: true },
    { kind: "verified_record", recordVerified: true, confirmedScore: 100 },
    { kind: "verified_record", recordVerified: true, passProbability: 0.95 },
    { kind: "verified_record", recordVerified: true, modelAnswerAuthority: true },
    { kind: "verified_record", recordVerified: true, deviceVerified: true },
  ];

  for (const evidence of invalidEvidence) {
    assert.throws(
      () => parseTrustProvenanceEvidence(evidence),
      /s231b-trust-provenance/,
      `unsupported evidence was accepted: ${JSON.stringify(evidence)}`,
    );
  }

  const inheritedConflict = Object.create({
    kind: "conflict_record",
    conflictRecorded: true,
  });
  assert.throws(
    () => parseTrustProvenanceEvidence(inheritedConflict),
    /s231b-trust-provenance/,
    "prototype-inherited metadata must never create a conflict state",
  );
});

test("S231B provenance sources are typed, canonical, and fail closed", () => {
  assert.deepEqual(parseTrustProvenanceSources(["learner_text", "reference", "reference"]), [
    "learner_text",
    "reference",
  ]);
  assert.throws(() => parseTrustProvenanceSources([]), /non-empty-array/);
  assert.throws(() => parseTrustProvenanceSources(["conflict in prose"]), /unsupported-source-kind/);
  assert.throws(() => parseTrustProvenanceSources(["none", "ai_draft"]), /none-source-cannot-be-combined/);
});

test("S231B legacy adapters use strict priority and missing data becomes unavailable", () => {
  assert.equal(adaptLegacyTrustSignals({}).kind, "unavailable");
  assert.equal(adaptLegacyTrustSignals({ learnerConfirmed: false }).kind, "unavailable");
  assert.equal(adaptLegacyTrustSignals({ learnerConfirmed: true }).kind, "learner_confirmation");
  assert.equal(
    adaptLegacyTrustSignals({ learnerConfirmed: true, reviewRequired: true }).kind,
    "review_requirement",
  );
  assert.equal(
    adaptLegacyTrustSignals({ learnerConfirmed: true, reviewRequired: true, evidenceAvailable: false }).kind,
    "unavailable",
  );
  assert.equal(
    adaptLegacyTrustSignals({ offline: true, conflictRecorded: true, reviewRequired: true }).kind,
    "offline_state",
  );
  assert.equal(
    adaptLegacyTrustSignals({ conflictRecorded: true, reviewRequired: true }).kind,
    "conflict_record",
  );
});

test("S231B uses one semantic renderer while preserving narrow public adapters", async () => {
  const [renderer, legacy, capture, ledger, preview, answerReview, itemDetail] = await Promise.all([
    read("components/review-os/trust-provenance-layer.tsx"),
    read("components/review-os/trust-status-card.tsx"),
    read("components/review-os/capture-form.tsx"),
    read("components/learner/study-ledger-ui.tsx"),
    read("components/review-os/s220c-first-five-minute-magic.tsx"),
    read("app/answer-review/answer-review-client.tsx"),
    read("app/app/items/[itemId]/page.tsx"),
  ]);

  assert.match(renderer, /data-trust-provenance-layer/);
  assert.match(renderer, /data-trust-state=\{model\.state\}/);
  assert.match(renderer, /announceChange && model\.actionableChange/);
  assert.equal((renderer.match(/role="status"/g) ?? []).length, 1);
  assert.equal((renderer.match(/aria-live="polite"/g) ?? []).length, 1);
  assert.doesNotMatch(renderer, /role="alert"/);

  assert.match(legacy, /export function TrustEvidenceBar/);
  assert.match(legacy, /export function TrustStatusCard/);
  assert.match(legacy, /sources=\{evidenceUnavailable \? \["none"\]/);
  assert.match(capture, /<TrustEvidenceBar/);
  assert.match(capture, /CAPTURE_TRUST_SOURCE_LABELS/);
  assert.match(capture, /manual: "수동 입력"/);
  assert.equal((capture.match(/data-trust-layer="capture-intake"/g) ?? []).length, 1);
  assert.match(ledger, /<TrustProvenanceLayer/);
  assert.match(preview, /<TrustStatusCard/);
  assert.match(answerReview, /<TrustProvenanceLayer/);
  assert.doesNotMatch(answerReview, /<section[^>]+data-trust-layer="answer-review-shell"/);
  assert.equal((answerReview.match(/trustLayerMarker="answer-review-shell"/g) ?? []).length, 1);
  assert.match(itemDetail, /confirmedFields\?\.ocrConfirmedByLearner === true/);
  assert.match(itemDetail, /confirmedFields\?\.hasManualCorrection === true/);
  assert.doesNotMatch(itemDetail, /Object\.keys\(confirmedFields\)\.length > 0/);
});

test("S231B runtime fixtures and deployment proof are preview-only and metadata-only", async () => {
  const [fixture, endpoint, runtimeSpec, runtimeSupport, appLayout] = await Promise.all([
    read("app/app/acceptance/trust-provenance/[state]/page.tsx"),
    read("app/api/runtime/version/route.ts"),
    read("tests/e2e/s231b-trust-provenance.spec.ts"),
    read("tests/e2e/support/authenticated-runtime.ts"),
    read("app/app/layout.tsx"),
  ]);

  assert.match(fixture, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(fixture, /data-private-learner-data="absent"/);
  assert.match(fixture, /data-s231b-trust-acceptance=\{state\}/);
  assert.doesNotMatch(fixture, /rawQuestionText|rawAnswerText|rawOcrText|problemText|referenceText/);
  assert.match(endpoint, /process\.env\.VERCEL_ENV !== "preview"/);
  assert.match(endpoint, /process\.env\.VERCEL_GIT_COMMIT_SHA/);
  assert.match(endpoint, /private, no-store, max-age=0/);
  assert.match(endpoint, /status: 503/);
  assert.match(runtimeSpec, /establishProtectedPreviewSession\(page, "S231B"\)/);
  assert.doesNotMatch(runtimeSpec, /extraHTTPHeaders/);
  assert.ok(
    runtimeSpec.indexOf("monitorRuntimeErrors(page)") <
      runtimeSpec.indexOf("loginWithDedicatedTestAccount(page"),
    "runtime error monitoring must begin before the login flow",
  );
  assert.match(runtimeSupport, /page\.context\(\)\.request\.get/);
  assert.match(runtimeSupport, /responseUrl\.origin !== previewUrl\.origin/);
  assert.match(runtimeSupport, /maxRedirects: 0/);
  assert.match(appLayout, /isMetadataOnlyTrustAcceptance/);
  assert.match(appLayout, /data-private-account-usage/);
  assert.match(runtimeSpec, /privateAccountTelemetryAbsent: true/);
  assert.match(runtimeSpec, /\[data-private-account-usage\]/);
});

test("S231B keeps repeated visual authority caveats out of Answer Review child cards", async () => {
  const answerReview = await read("app/answer-review/answer-review-client.tsx");
  assert.equal(
    (answerReview.match(/공식 채점이나 합격 판정이 아닙니다/g) ?? []).length,
    2,
    "one visible trust layer and one copied-output boundary should own the caveat",
  );
  assert.doesNotMatch(answerReview, /<p[^>]*>학습 보조 초안입니다\. 저장 전 직접 수정할 수 있습니다\.<\/p>/);
});

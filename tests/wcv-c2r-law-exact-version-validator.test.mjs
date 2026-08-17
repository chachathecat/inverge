import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  parseLawApplicabilityClaimV1,
  parseLawApplicabilityClaimV1Input,
} from "../lib/review-os/trusted-repair-contract.ts";
import {
  trustedRepairSourceVersion,
  validateLawApplicabilityClaim,
} from "../lib/review-os/trusted-repair-engine.ts";
import { trustedRepairCanonicalFixture } from "../lib/review-os/trusted-repair-fixtures.ts";
import {
  trustedRepairLawOpenBlockingReferenceIds,
  validateTrustedRepairLawApplicabilitySnapshot,
} from "../lib/review-os/law-source-version-registry.ts";

const fixture = trustedRepairCanonicalFixture("appraisal_law");
const anchor = fixture.anchors.find((entry) => "lawApplicability" in entry)
  .lawApplicability;
const revision = "11111111-1111-4111-8111-111111111111";
const confirmedAt = "2026-08-17T00:00:00.000Z";
const config = JSON.parse(
  readFileSync(
    path.join(
      process.cwd(),
      "config/dabangil-c2r-c-l-exact-law-applicability-v1.json",
    ),
    "utf8",
  ),
);
const snapshot = validateTrustedRepairLawApplicabilitySnapshot(config);

function binding(overrides = {}) {
  const openBlockingReferenceIds = trustedRepairLawOpenBlockingReferenceIds(
    snapshot,
  );
  return {
    bindingVersion: snapshot.contractVersion,
    sourceStatus: snapshot.sourceStatus,
    versionStatus: snapshot.sourceStatus,
    currentLawStatus: snapshot.currentLawApplicability,
    sourceAnchorId: snapshot.lawAnchorId,
    blockerCount: openBlockingReferenceIds.length,
    openBlockingReferenceIds,
    lawSourceBindingId: snapshot.lawSourceBindingId,
    sourceId: snapshot.sourceId,
    sourceVersionId: snapshot.sourceVersionId,
    lawAnchorVersionId: snapshot.lawAnchorVersionId,
    anchorStatus: snapshot.anchorStatus,
    exactLocator: snapshot.exactLocator,
    exactVersionIdentity: snapshot.exactVersionIdentity,
    effectiveFrom: snapshot.effectiveFrom,
    effectiveTo: snapshot.effectiveTo,
    applicableAsOf: snapshot.applicableAsOf,
    ...overrides,
  };
}

function claim(overrides = {}) {
  return {
    sourceRevisionId: revision,
    anchorId: anchor.anchorId,
    anchorVersionId: anchor.anchorVersionId,
    lawSourceBindingId: anchor.lawSourceBindingId,
    sourceId: anchor.sourceId,
    sourceVersionId: anchor.sourceVersionId,
    lawAnchorId: anchor.lawAnchorId,
    lawAnchorVersionId: anchor.lawAnchorVersionId,
    exactLocator: anchor.exactLocator,
    exactVersionIdentity: anchor.exactVersionIdentity,
    effectiveFrom: anchor.effectiveFrom,
    effectiveTo: anchor.effectiveTo,
    applicableAsOf: anchor.applicableAsOf,
    currentLawApplicability: anchor.currentLawApplicability,
    blockerState: { openBlockingReferenceIds: [], blockerCount: 0 },
    confirmationMode: "MANUAL_STRUCTURED",
    learnerConfirmedAt: confirmedAt,
    ...overrides,
  };
}

test("[C2R-C-L-R21] Law verifies only one exact current zero-blocker applicability binding", () => {
  const result = validateLawApplicabilityClaim({
    claim: claim(),
    anchor,
    expectedSourceRevisionId: revision,
    sourceBinding: binding(),
  });
  assert.equal(result.state, "PASS");
  assert.equal(result.verified, true);
  assert.deepEqual(result.reasonCodes, []);
  assert.equal(result.validatorId, "validator:law-exact-applicability@1");
});

test("[C2R-C-L-R03] a source revision change stales Law proof instead of carrying verification", () => {
  const result = validateLawApplicabilityClaim({
    claim: claim({
      sourceRevisionId: "22222222-2222-4222-8222-222222222222",
    }),
    anchor,
    expectedSourceRevisionId: revision,
    sourceBinding: binding(),
  });
  assert.equal(result.state, "STALE");
  assert.equal(result.verified, false);
  assert.ok(result.reasonCodes.includes("source_revision_mismatch"));
});

for (const [field, value, reason] of [
  ["sourceVersionId", "law-source:synthetic-official-act@2025-01-01", "source_version_mismatch"],
  ["lawAnchorVersionId", "law-anchor:synthetic-official-act:article-10@old", "law_anchor_version_mismatch"],
  ["exactLocator", "Article 11", "exact_locator_mismatch"],
  ["exactVersionIdentity", "2025-01-01", "exact_version_identity_mismatch"],
  ["effectiveFrom", "2026-08-16", "effective_from_mismatch"],
  ["applicableAsOf", "2025-12-31", "applicable_date_mismatch"],
  ["currentLawApplicability", "NOT_CURRENT", "current_law_applicability_mismatch"],
]) {
  test(`Law fails closed when ${field} drifts`, () => {
    const result = validateLawApplicabilityClaim({
      claim: claim({ [field]: value }),
      anchor,
      expectedSourceRevisionId: revision,
      sourceBinding: binding(),
    });
    assert.equal(result.verified, false);
    assert.ok(result.reasonCodes.includes(reason));
  });
}

test("[C2R-C-L-R17] source-level current state cannot release an unverified selected anchor", () => {
  const result = validateLawApplicabilityClaim({
    claim: claim(),
    anchor,
    expectedSourceRevisionId: revision,
    sourceBinding: binding({ anchorStatus: "UNVERIFIED" }),
  });
  assert.equal(result.state, "BLOCKED");
  assert.equal(result.verified, false);
  assert.ok(result.reasonCodes.includes("live_anchor_not_current"));
});

test("[C2R-C-L-R15] only unique referenced open and blocking blockers count", () => {
  const candidate = structuredClone(config);
  candidate.blockerCatalog.push(
    { blockerId: "law-blocker:open-blocking", status: "open", severity: "blocking" },
    { blockerId: "law-blocker:resolved-warning", status: "resolved", severity: "warning" },
  );
  candidate.referencedBlockerIds.push(
    "law-blocker:open-blocking",
    "law-blocker:resolved-warning",
  );
  const checked = validateTrustedRepairLawApplicabilitySnapshot(candidate);
  assert.deepEqual(trustedRepairLawOpenBlockingReferenceIds(checked), [
    "law-blocker:open-blocking",
  ]);
});

test("unknown and duplicate blocker references fail closed", () => {
  const unknown = structuredClone(config);
  unknown.referencedBlockerIds.push("law-blocker:unknown");
  assert.throws(
    () => validateTrustedRepairLawApplicabilitySnapshot(unknown),
    /unknown/,
  );
  const duplicate = structuredClone(config);
  duplicate.referencedBlockerIds.push(duplicate.referencedBlockerIds[0]);
  assert.throws(
    () => validateTrustedRepairLawApplicabilitySnapshot(duplicate),
    /unique/,
  );
});

test("strict Law claim parsing rejects unknown fields and blocker count drift", () => {
  assert.deepEqual(parseLawApplicabilityClaimV1(claim()), claim());
  const input = claim();
  delete input.learnerConfirmedAt;
  assert.deepEqual(parseLawApplicabilityClaimV1Input(input), input);
  assert.throws(
    () => parseLawApplicabilityClaimV1({ ...claim(), body: "not metadata" }),
    /trusted-repair:invalid_input/,
  );
  assert.throws(
    () =>
      parseLawApplicabilityClaimV1({
        ...claim(),
        blockerState: { openBlockingReferenceIds: [], blockerCount: 1 },
      }),
    /trusted-repair:invalid_input/,
  );
});

test("source fingerprint changes across exact Law metadata drift", () => {
  const current = trustedRepairSourceVersion(fixture, binding());
  for (const changed of [
    binding({ exactLocator: "Article 11" }),
    binding({ applicableAsOf: "2026-08-16" }),
    binding({ sourceVersionId: "law-source:synthetic-official-act@other" }),
  ]) {
    assert.notEqual(trustedRepairSourceVersion(fixture, changed), current);
  }
});
